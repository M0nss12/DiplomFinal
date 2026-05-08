require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// 1. Настройка DNS
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// 2. Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
    console.error("🚨 ОШИБКА: SUPABASE_KEY не загружен или это не service_role ключ!");
} else {
    console.log("✅ Ключ загружен, начинается на:", supabaseKey.substring(0, 20));
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Настройка приложения
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'my_super_secret_admin_123';
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: ['https://diplomv2-0.onrender.com', 'http://localhost:3000', 'http://localhost:5173'], 
    credentials: true
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Дефолтные аватарки из новой БД
const DEFAULT_AVATARS = [
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
];

// =====================================================================
// 📧 БЛОК: ПОЧТА И ШАБЛОНЫ УВЕДОМЛЕНИЙ
// =====================================================================
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
});

// Функция для загрузки HTML шаблонов (если файла нет - возвращает fallback string)
const getEmailTemplate = (templateName, variables = {}) => {
    const templatePath = path.join(__dirname, 'email_templates', templateName);
    let html = '';
    if (fs.existsSync(templatePath)) {
        html = fs.readFileSync(templatePath, 'utf8');
        // Заменяем переменные вида {{varName}} в шаблоне
        for (const [key, value] of Object.entries(variables)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
    } else {
        // Fallback, пока файлы не созданы
        html = `<h2>ApexDrive Уведомление</h2><p>${variables.message || 'Системное сообщение'}</p><br><small>${variables.link || ''}</small>`;
    }
    return html;
};

// =====================================================================
// 📝 БЛОК: СИСТЕМНОЕ ЛОГИРОВАНИЕ
// =====================================================================
const LOGS_DIR = path.join(__dirname, 'logs');
const ERROR_LOG = path.join(LOGS_DIR, 'errors.log');
const ACTIONS_LOG = path.join(LOGS_DIR, 'actions.log');
const NOTIFICATIONS_LOG = path.join(LOGS_DIR, 'notifications.log');

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);
[ERROR_LOG, ACTIONS_LOG, NOTIFICATIONS_LOG].forEach(f => { if (!fs.existsSync(f)) fs.writeFileSync(f, ''); });

const writeLog = (filePath, data) => {
    const entry = JSON.stringify({
        id: crypto.randomBytes(4).toString('hex'),
        timestamp: new Date().toLocaleString('ru-RU'),
        ...data
    }) + '\n';
    fs.appendFile(filePath, entry, (err) => { if (err) console.error('Ошибка записи лога:', err); });
};

// ЕДИНАЯ СИСТЕМА УВЕДОМЛЕНИЙ (БД + Email + Логи)
const notifyAndEmail = async ({ userId, type, title, message, email, templateName, templateVars = {} }) => {
    // 1. Пишем в лог
    writeLog(NOTIFICATIONS_LOG, { userId, type, title, message, emailSentTo: email });
    
    // 2. Пишем в БД в таблицу notifications
    try {
        if (userId) {
            await supabase.from('notifications').insert([{ user_id: userId, type, title, message }]);
        }
    } catch (e) { console.error('Ошибка записи уведомления в БД:', e.message); }

    // 3. Отправляем email (если передан адрес)
    if (email && templateName) {
        try {
            const html = getEmailTemplate(templateName, { title, message, ...templateVars });
            await transporter.sendMail({
                from: '"ApexDrive" <monsswhat@gmail.com>', 
                to: email,
                subject: title,
                html: html
            });
        } catch (e) { console.error('Ошибка отправки email:', e.message); }
    }
};

const logError = (err, req = null) => {
    writeLog(ERROR_LOG, {
        type: 'ERROR', message: err.message,
        url: req ? req.url : 'SYSTEM',
        user: req ? (req.headers['x-user-id'] || 'guest') : 'system'
    });
};

// =====================================================================
// 🛡️ БЛОК: УТИЛИТЫ
// =====================================================================
async function getOrCreateCity(cityName) {
    if (!cityName) return null;
    const name = cityName.trim();
    try {
        const { data: existing } = await supabase.from('cities').select('id').ilike('name', name).maybeSingle();
        if (existing) return existing.id;

        const { data: created, error } = await supabase.from('cities').insert([{ name }]).select('id').single();
        if (error) return null;
        return created.id;
    } catch (e) { return null; }
}

const verifyAdmin = (req, res, next) => {
    if (req.headers['x-admin-key'] === ADMIN_SECRET) next();
    else res.status(403).json({ error: 'Доступ запрещен.' });
};

// Проверка Яндекс Капчи
const verifyYandexCaptcha = async (token, ip) => {
    if (!token) return false;
    try {
        const url = `https://smartcaptcha.yandexcloud.net/validate?secret=${process.env.YANDEX_API_KEY}&token=${token}&ip=${ip}`;
        const res = await axios.get(url);
        return res.data.status === 'ok';
    } catch (e) {
        console.error("Ошибка капчи:", e.message);
        return false;
    }
};

// =====================================================================
// 🏠 API: КАТАЛОГ И МАРКЕТИНГ
// =====================================================================
app.get('/api/marketing/currency', async (req, res) => {
    try {
        const cbrRes = await axios.get('https://www.cbr-xml-daily.ru/daily_json.js');
        const v = cbrRes.data.Valute;
        res.json({ usd: v.USD.Value.toFixed(2), eur: v.EUR.Value.toFixed(2), cny: v.CNY.Value.toFixed(2) });
    } catch (e) { res.json({ usd: '91.50', eur: '99.20', cny: '12.60' }); }
});


app.get('/api/marketing/about-info', async (req, res) => {
    try {
        // Получаем общее количество товаров
        const { count: productsCount } = await supabase.from('products')
            .select('*', { count: 'exact', head: true });
        
        // Получаем общее количество брендов
        const { count: brandsCount } = await supabase.from('brands')
            .select('*', { count: 'exact', head: true });
            
        // Получаем список популярных брендов (или просто первые 10 с логотипами)
        const { data: brandsList } = await supabase.from('brands')
            .select('name, logo_url')
            .not('logo_url', 'is', null)
            .limit(10);

        res.json({
            totalProducts: productsCount || 0,
            totalBrands: brandsCount || 0,
            brandsList: brandsList || []
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});


app.delete('/api/storage/:bucket/:filename', verifyAdmin, async (req, res) => {
    try {
        const { bucket, filename } = req.params;
        const { data, error } = await supabase.storage.from(bucket).remove([filename]);
        
        if (error) throw error;
        res.json({ success: true, message: 'Файл удален' });
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/products', async (req, res) => {
    const { category_id } = req.query;
    let query = supabase.from('products').select(`*, brands (*), product_stocks (quantity, warehouses (address, cities (name)))`);
    if (category_id && category_id !== 'undefined') query = query.eq('category_id', parseInt(category_id));
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.get('/api/products/:id', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*, brands(*), categories(name), product_stocks(*, warehouses(*, cities(name)))').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Товар не найден' });
    res.json(data);
});

// Получение недавно просмотренных товаров по массиву ID из localStorage
app.post('/api/products/recent', async (req, res) => {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.json([]);
    const { data } = await supabase.from('products').select(`id, name, price, discount_price, images, sku, is_active`).in('id', ids);
    res.json(data || []);
});

app.get('/api/global-search', async (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ products: [], categories: [] });
    const { data: products } = await supabase.from('products').select('id, name, price, images, sku, discount_price').or(`name.ilike.%${q}%,sku.ilike.%${q}%`).limit(5);
    const { data: categories } = await supabase.from('categories').select('id, name, slug').ilike('name', `%${q}%`).limit(3);
    res.json({ products: products || [], categories: categories || [] });
});

// =====================================================================
// 👤 API: ПОЛЬЗОВАТЕЛИ И АВТОРИЗАЦИЯ
// =====================================================================
app.post('/api/users/register', async (req, res) => {
    try {
        const { email, phone, password, first_name, last_name, otchestvo, city, captchaToken } = req.body;
        
        // Проверка Яндекс Капчи
        const isHuman = await verifyYandexCaptcha(captchaToken, req.ip);
        if (!isHuman) return res.status(400).json({ error: 'Проверка на робота не пройдена' });

        const newUserId = crypto.randomUUID(); 
        const cityId = await getOrCreateCity(city);

        let filter = email ? `email.eq.${email}` : `phone_number.eq.${phone}`;
        const { data: existing } = await supabase.from('users').select('*').or(filter).maybeSingle();

        if (existing) {
            if (existing.password_hash) return res.status(400).json({ error: 'Пользователь уже существует' });
            // Обновляем гостя до юзера
            const { data } = await supabase.from('users').update({ 
                password_hash: password, role: 'user', first_name, last_name, otchestvo, saved_city_id: cityId, is_email_verified: false 
            }).eq('id', existing.id).select();
            return res.json(data[0]);
        }

        const { data, error } = await supabase.from('users').insert([{ 
            id: newUserId, role: 'user', email: email || null, phone_number: phone || null, 
            password_hash: password, first_name, last_name, otchestvo, saved_city_id: cityId, 
            avatar_url: DEFAULT_AVATARS[0], is_email_verified: false
        }]).select();

        if (error) throw error;

        // Отправка письма подтверждения
        if (email) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 час
            await supabase.from('password_reset_tokens').insert([{ user_id: newUserId, token, expires_at: expiresAt }]);
            
            const verifyLink = `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/users/verify-email?token=${token}`;
            await notifyAndEmail({
                userId: newUserId, type: 'system', email: email,
                title: 'Подтверждение регистрации',
                message: 'Добро пожаловать в ApexDrive! Подтвердите вашу почту.',
                templateName: 'email_verify.html',
                templateVars: { link: verifyLink, first_name }
            });
        }

        res.json({ message: 'Регистрация успешна. Проверьте почту для подтверждения!', user: data[0] });
    } catch (e) { logError(e, req); res.status(500).json({ error: e.message }); }
});

app.get('/api/users/verify-email', async (req, res) => {
    const { token } = req.query;
    try {
        const { data: tData } = await supabase.from('password_reset_tokens')
            .select('*').eq('token', token).eq('used', false).gt('expires_at', new Date().toISOString()).maybeSingle();
        if (!tData) return res.status(400).send('Ссылка недействительна или устарела');
        
        await supabase.from('users').update({ is_email_verified: true }).eq('id', tData.user_id);
        await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tData.id);
        
        res.redirect('/login?verified=true'); // Редирект на фронт
    } catch (e) { res.status(500).send('Ошибка подтверждения'); }
});

app.post('/api/users/login', async (req, res) => {
    const { login, password } = req.body;
    const { data: user } = await supabase.from('users').select('*').or(`email.eq.${login},phone_number.eq.${login}`).maybeSingle();
    if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
    const { data: isValid } = await supabase.rpc('verify_user_password', { user_id_param: user.id, pass_param: password });
    if (!isValid) return res.status(401).json({ error: 'Неверный пароль' });
    res.json(user);
});

app.get('/api/users/profile/:id', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*, cities(name)').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Профиль не найден' });
    res.json(data);
});

// =====================================================================
// 🔔 API: УВЕДОМЛЕНИЯ И СБРОС ПАРОЛЯ
// =====================================================================
app.get('/api/notifications/:userId', async (req, res) => {
    const { data } = await supabase.from('notifications').select('*').eq('user_id', req.params.userId).order('created_at', { ascending: false });
    res.json(data || []);
});

app.patch('/api/notifications/:id', async (req, res) => {
    await supabase.from('notifications').update(req.body).eq('id', req.params.id);
    res.json({ success: true });
});

app.post('/api/users/request-password-reset', async (req, res) => {
    const { email } = req.body;
    try {
        const { data: user } = await supabase.from('users').select('id, first_name').eq('email', email).maybeSingle();
        if (!user) return res.status(404).json({ error: 'Пользователь с такой почтой не найден' });
        
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000).toISOString();
        await supabase.from('password_reset_tokens').insert([{ user_id: user.id, token, expires_at: expiresAt }]);
        
        // Ссылка на отдельную страницу сброса на фронтенде
        const resetLink = `${process.env.VITE_API_URL || 'http://localhost:3000'}/reset-password-confirm?token=${token}`;
        
        await notifyAndEmail({
            userId: user.id, type: 'system', email: email,
            title: 'Сброс пароля',
            message: 'Вы запросили сброс пароля.',
            templateName: 'password_reset.html',
            templateVars: { link: resetLink, first_name: user.first_name }
        });
        
        res.json({ success: true });
    } catch (e) { logError(e, req); res.status(500).json({ error: 'Ошибка сервера' }); }
});

app.post('/api/users/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const { data: tData } = await supabase.from('password_reset_tokens').select('*').eq('token', token).eq('used', false).gt('expires_at', new Date().toISOString()).maybeSingle();
        if (!tData) return res.status(400).json({ error: 'Ссылка недействительна или устарела' });
        
        await supabase.from('users').update({ password_hash: newPassword }).eq('id', tData.user_id);
        await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tData.id);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Ошибка сброса' }); }
});

// =====================================================================
// 🛍️ API: ЗАКАЗЫ И ОПЛАТА
// =====================================================================
app.post('/api/orders', async (req, res) => {
    const { customer_name, customer_email, customer_phone, customer_city, items, warehouse_id, payment_method, shipping_cost, delivery_type } = req.body;
    try {
        const { data: wh } = await supabase.from('warehouses').select('*, cities(name)').eq('id', warehouse_id).single();
        const cityId = await getOrCreateCity(customer_city);
        let { data: user } = await supabase.from('users').select('id').or(`email.eq.${customer_email},phone_number.eq.${customer_phone}`).maybeSingle();
        
        let userId = user ? user.id : crypto.randomUUID();
        if (!user) {
            await supabase.from('users').insert([{ 
                id: userId, role: 'guest', first_name: customer_name, email: customer_email, 
                phone_number: customer_phone, saved_city_id: cityId 
            }]);
        }

        let totalPrice = 0; let itemsData = [];
        for (let item of items) {
            const { data: p } = await supabase.from('products').select('price, discount_price').eq('id', item.product_id).single();
            const price = p.discount_price || p.price;
            totalPrice += price * item.quantity;
            itemsData.push({ product_id: item.product_id, quantity: item.quantity, unit_price: price });
            await supabase.rpc('decrement_stock', { p_product_id: item.product_id, p_warehouse_id: warehouse_id, p_quantity: item.quantity });
        }
        
        const finalTotal = Math.round(totalPrice + (Number(shipping_cost) || 0));
        const { data: order, error: oErr } = await supabase.from('orders').insert([{ 
            user_id: userId, warehouse_id, payment_method, delivery_type: delivery_type || 'pickup',
            payment_status: 'unpaid', delivery_status: 'processing',
            shipping_cost: shipping_cost || 0, total_price: finalTotal, delivery_address: `${wh.cities.name}, ${wh.address}`,
            customer_name, customer_phone, customer_email
        }]).select();

        if (oErr) throw oErr;
        await supabase.from('order_items').insert(itemsData.map(i => ({ ...i, order_id: order[0].id })));
        
        // УВЕДОМЛЕНИЕ О СОЗДАНИИ ЗАКАЗА
        await notifyAndEmail({
            userId: userId, type: 'order', email: customer_email,
            title: `Заказ №${order[0].id} успешно оформлен!`,
            message: `Сумма к оплате: ${finalTotal} руб. Ожидайте дальнейших инструкций.`,
            templateName: 'order_created.html',
            templateVars: { order_id: order[0].id, total: finalTotal, name: customer_name }
        });

        res.json({ orderId: order[0].id, total: finalTotal });
    } catch (err) { logError(err, req); res.status(500).json({ error: err.message }); }
});

app.get('/api/orders/:userId', async (req, res) => {
    const { data } = await supabase.from('orders').select(`*, order_items (*, products (*))`).eq('user_id', req.params.userId).order('created_at', { ascending: false });
    res.json(data || []);
});

// ТЕСТОВАЯ ИНИЦИАЛИЗАЦИЯ ОПЛАТЫ
app.post('/api/payment/tinkoff-init', async (req, res) => {
    const { orderId } = req.body;
    // Возвращаем ссылку-заглушку, которая сразу же перенаправит на вебхук для имитации успешной оплаты
    const mockPaymentUrl = `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/test-webhook?orderId=${orderId}&status=paid`;
    res.json({ confirmation_url: mockPaymentUrl });
});

// ТЕСТОВЫЙ ВЕБХУК ОПЛАТЫ
app.get('/api/payment/test-webhook', async (req, res) => {
    const { orderId, status } = req.query;
    if (status === 'paid') {
        await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
        // Редирект юзера на страницу успеха на клиенте
        res.redirect(`${process.env.VITE_API_URL || 'http://localhost:3000'}/order-success?orderId=${orderId}`);
    }
});

// =====================================================================
// 💬 API: ОТЗЫВЫ И ФАЙЛЫ
// =====================================================================
app.post('/api/reviews', async (req, res) => {
    try {
        const { data } = await supabase.from('reviews').insert([{ ...req.body, is_approved: true }]).select();
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reviews/:productId', async (req, res) => {
    const { data } = await supabase.from('reviews').select(`*, users (first_name, avatar_url)`).eq('product_id', req.params.productId).eq('is_approved', true).order('created_at', { ascending: false });
    res.json(data || []);
});

app.post('/api/upload/:folder', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const fileExt = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}${fileExt}`;
        const { error } = await supabase.storage.from(req.params.folder).upload(safeName, file.buffer, { contentType: file.mimetype });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from(req.params.folder).getPublicUrl(safeName);
        res.json({ url: urlData.publicUrl });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================================
// 👑 API: АДМИНКА И ОБНОВЛЕНИЕ СТАТУСОВ
// =====================================================================
// Эндпоинт для обновления статуса заказа админом (С отправкой уведомлений!)
app.patch('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    const { delivery_status, payment_status } = req.body;
    const orderId = req.params.id;

    try {
        const { data: order } = await supabase.from('orders').update({ delivery_status, payment_status }).eq('id', orderId).select().single();
        
        // Логика отправки уведомлений
        if (delivery_status === 'delivered') {
            await notifyAndEmail({
                userId: order.user_id, type: 'order', email: order.customer_email,
                title: `Заказ №${orderId} готов к выдаче!`,
                message: `Ваш заказ ожидает вас по адресу: ${order.delivery_address}.`,
                templateName: 'order_ready.html',
                templateVars: { order_id: orderId, address: order.delivery_address, name: order.customer_name }
            });
        } else if (delivery_status) {
            await notifyAndEmail({
                userId: order.user_id, type: 'order', email: order.customer_email,
                title: `Статус заказа №${orderId} обновлен`,
                message: `Новый статус: ${delivery_status}.`,
                templateName: 'order_status.html',
                templateVars: { order_id: orderId, status: delivery_status, name: order.customer_name }
            });
        }

        res.json(order);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/system/logs', verifyAdmin, (req, res) => {
    const { type } = req.query;
    const file = type === 'errors' ? 'errors.log' : type === 'notifications' ? 'notifications.log' : 'actions.log';
    if (!fs.existsSync(path.join(LOGS_DIR, file))) return res.json([]);
    const lines = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8').trim().split('\n');
    res.json(lines.map(l => JSON.parse(l)).reverse().slice(0, 100));
});

app.get('/api/admin/:table', verifyAdmin, async (req, res) => {
    try {
        let query = supabase.from(req.params.table).select('*');
        if (req.params.table === 'warehouses') query = supabase.from('warehouses').select('*, cities(name)');
        if (req.params.table === 'notifications') query = supabase.from('notifications').select('*, users(first_name, last_name)');
        if (req.params.table === 'product_stocks') query = supabase.from('product_stocks').select('*, products(name, sku), warehouses(*, cities(name))');
        if (req.params.table === 'user_vehicles') query = supabase.from('user_vehicles').select('*, users(first_name, last_name)');
        if (req.params.table === 'return_requests') query = supabase.from('return_requests').select('*, users(first_name, last_name)');
        if (req.params.table === 'order_items') query = supabase.from('order_items').select('*, products(name, sku)');

        const { data, error } = await query.order('id', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/:table/:id', verifyAdmin, async (req, res) => {
    const { data, error } = await supabase.from(req.params.table).update(req.body).eq('id', req.params.id).select();
    res.json(data[0]);
});

app.delete('/api/admin/:table/:id', verifyAdmin, async (req, res) => {
    await supabase.from(req.params.table).delete().eq('id', req.params.id);
    res.send('Удалено');
});

// catch-all для SPA
app.get(/(.*)/, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 ApexDrive Server Active: http://localhost:${PORT}`));

module.exports = app;