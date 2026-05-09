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
const https = require('https');
const querystring = require('querystring');

// 1. Настройка DNS
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// 2. Инициализация Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseKey || !supabaseKey.startsWith('eyJ')) {
    console.error("🚨 ОШИБКА: SUPABASE_KEY не загружен или это не service_role ключ!");
} else {
    console.log("✅ Supabase ключ загружен, начинается на:", supabaseKey.substring(0, 20));
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 3. Настройка приложения
const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 3000;
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'my_super_secret_admin_123';
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({
    origin: [
        'https://diplomfinal.onrender.com', 
        'http://localhost:3000', 
        'http://localhost:5173'
    ], 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-key', 'x-user-id', 'x-user-name', 'x-user-role']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_AVATARS = [
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
];

// --- Почта и шаблоны ---
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 587, secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
});

const getEmailTemplate = (templateName, variables = {}) => {
    const templatePath = path.join(__dirname, 'email_templates', templateName);
    let html = '';
    if (fs.existsSync(templatePath)) {
        html = fs.readFileSync(templatePath, 'utf8');
        for (const [key, value] of Object.entries(variables)) {
            html = html.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
    } else {
        html = `<h2>ApexDrive Уведомление</h2><p>${variables.message || 'Системное сообщение'}</p><br><small>${variables.link || ''}</small>`;
    }
    return html;
};

// --- Логирование ---
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

const notifyAndEmail = async ({ userId, type, title, message, email, templateName, templateVars = {} }) => {
    writeLog(NOTIFICATIONS_LOG, { userId, type, title, message, emailSentTo: email });
    try {
        if (userId) await supabase.from('notifications').insert([{ user_id: userId, type, title, message }]);
    } catch (e) { console.error('Ошибка записи уведомления в БД:', e.message); }

    if (email && templateName) {
        try {
            const html = getEmailTemplate(templateName, { title, message, ...templateVars });
            await transporter.sendMail({
                from: `"ApexDrive" <${process.env.EMAIL_USER}>`, 
                to: email,
                subject: title,
                html: html
            });
        } catch (e) { 
            console.error("❌ ОШИБКА ПОЧТЫ (SMTP):", e.message); 
        }
    }
};

const logError = (err, req = null) => {
    writeLog(ERROR_LOG, {
        type: 'ERROR', message: err.message,
        url: req ? req.url : 'SYSTEM',
        user: req ? (req.headers['x-user-id'] || 'guest') : 'system'
    });
};

// --- Утилиты ---
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

const verifyYandexCaptcha = (token, ip) => {
    return new Promise((resolve) => {
        const secret = process.env.YANDEX_API_KEY;
        let userIp = ip;
        if (ip === '::1' || ip === '::ffff:127.0.0.1') userIp = '127.0.0.1';
        const options = {
            hostname: 'smartcaptcha.yandexcloud.net', port: 443, method: 'GET',
            path: '/validate?' + querystring.stringify({ secret, token, ip: userIp }),
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                if (res.statusCode !== 200) return resolve(false);
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.status === 'ok');
                } catch (e) { resolve(false); }
            });
        });
        req.on('error', () => resolve(false));
        req.end();
    });
};

// =====================================================================
// API: КАТАЛОГ И МАРКЕТИНГ
// =====================================================================

app.get('/api/categories', async (req, res) => {
    try {
        const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/brands', async (req, res) => {
    try {
        const { data, error } = await supabase.from('brands').select('*').order('name', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/marketing/currency', async (req, res) => {
    try {
        const cbrRes = await axios.get('https://www.cbr-xml-daily.ru/daily_json.js');
        const v = cbrRes.data.Valute;
        res.json({ usd: v.USD.Value.toFixed(2), eur: v.EUR.Value.toFixed(2), cny: v.CNY.Value.toFixed(2) });
    } catch (e) { res.json({ usd: '91.50', eur: '99.20', cny: '12.60' }); }
});

app.get('/api/marketing/about-info', async (req, res) => {
    try {
        const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: bCount } = await supabase.from('brands').select('*', { count: 'exact', head: true });
        const { data: bList } = await supabase.from('brands').select('name, logo_url').not('logo_url', 'is', null).limit(10);
        res.json({ totalProducts: pCount || 0, totalBrands: bCount || 0, brandsList: bList || [] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/marketing/brands', async (req, res) => {
    try {
        const { data, error } = await supabase.from('brands').select('*').eq('is_popular', true).limit(12);
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/marketing/hot-deals', async (req, res) => {
    try {
        const { data, error } = await supabase.from('products').select('*, brands(*)').not('discount_price', 'is', null).limit(10);
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
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
// API: ИЗБРАННОЕ И ОТЗЫВЫ
// =====================================================================
app.get('/api/wishlist/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase.from('wishlists').select('*, products(*)').eq('user_id', req.params.userId);
        if (error) throw error; res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wishlist', async (req, res) => {
    try {
        const { user_id, product_id } = req.body;
        const { data, error } = await supabase.from('wishlists').insert([{ user_id, product_id }]).select().single();
        if (error) throw error; res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/wishlist/:userId/:productId', async (req, res) => {
    try {
        const { error } = await supabase.from('wishlists').delete().eq('user_id', req.params.userId).eq('product_id', req.params.productId);
        if (error) throw error; res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { data } = await supabase.from('reviews').insert([{ ...req.body, is_approved: true }]).select();
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/reviews', verifyAdmin, async (req, res) => {
  try {
    const { data } = await supabase.from('reviews').insert([req.body]).select();
    res.json(data[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reviews/:productId', async (req, res) => {
    const { data } = await supabase.from('reviews').select(`*, users (first_name, avatar_url)`).eq('product_id', req.params.productId).eq('is_approved', true).order('created_at', { ascending: false });
    res.json(data || []);
});

// =====================================================================
// API: ПОЛЬЗОВАТЕЛИ И АВТОРИЗАЦИЯ
// =====================================================================
app.post('/api/users/change-password/:id', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.params.id;
    try {
        const { data: isValid } = await supabase.rpc('verify_user_password', { 
            user_id_param: userId, 
            pass_param: oldPassword 
        });
        if (!isValid) return res.status(401).json({ error: 'Текущий пароль введен неверно' });
        const { error } = await supabase.from('users').update({ password_hash: newPassword }).eq('id', userId);
        if (error) throw error;
        res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (e) { res.status(500).json({ error: 'Ошибка сервера при смене пароля' }); }
});

app.post('/api/users/register', async (req, res) => {
    try {
        const { email, phone, password, first_name, last_name, otchestvo, city, captchaToken } = req.body;
        const isHuman = await verifyYandexCaptcha(captchaToken, req.ip);
        if (!isHuman) return res.status(400).json({ error: 'Проверка на робота не пройдена' });

        const newUserId = crypto.randomUUID(); 
        const cityId = await getOrCreateCity(city);

        let filter = email ? `email.eq.${email}` : `phone_number.eq.${phone}`;
        const { data: existing } = await supabase.from('users').select('*').or(filter).maybeSingle();

        if (existing) {
            if (existing.password_hash) return res.status(400).json({ error: 'Пользователь уже существует' });
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

        if (email) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000).toISOString();
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
        res.json({ message: 'Регистрация успешна.', user: data[0] });
    } catch (e) { logError(e, req); res.status(500).json({ error: e.message }); }
});

app.get('/api/users/verify-email', async (req, res) => {
    const { token } = req.query;
    try {
        const { data: tData } = await supabase.from('password_reset_tokens').select('*').eq('token', token).eq('used', false).gt('expires_at', new Date().toISOString()).maybeSingle();
        if (!tData) return res.status(400).send('Ссылка недействительна или устарела');
        await supabase.from('users').update({ is_email_verified: true }).eq('id', tData.user_id);
        await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tData.id);
        res.redirect('/login?verified=true'); 
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

app.put('/api/users/profile/:id', async (req, res) => {
    const { city, ...updateData } = req.body;
    if (city) updateData.saved_city_id = await getOrCreateCity(city);
    const { data } = await supabase.from('users').update(updateData).eq('id', req.params.id).select();
    res.json(data[0]);
});

// =====================================================================
// API: УВЕДОМЛЕНИЯ И СБРОС ПАРОЛЯ
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
// ⚡️ API: ЗАКАЗЫ (ИСПРАВЛЕННЫЙ)
// =====================================================================
app.post('/api/orders', async (req, res) => {
    const { customer_name, customer_email, customer_phone, items, warehouse_id, payment_method } = req.body;
    
    try {
        // 1. Данные о ПВЗ
        const { data: targetWh } = await supabase
            .from('warehouses')
            .select('*, cities(lat, lon, name, id)')
            .eq('id', warehouse_id)
            .single();

        const targetCityId = targetWh.cities.id;

        // 2. Расчёт доставки через RPC
        const { data: shippingData, error: shipErr } = await supabase.rpc('calculate_order_shipping', {
            target_warehouse_id: warehouse_id,
            items_json: items
        });
        if (shipErr) throw shipErr;
        const totalShipping = shippingData.total;

        // 3. Список складов-отправителей, списание и подсчёт стоимости
        let totalPrice = 0;
        let itemsData = [];

        for (let item of items) {
            // Цена товара
            const { data: product } = await supabase
                .from('products')
                .select('price, discount_price')
                .eq('id', item.product_id)
                .single();
            const price = product.discount_price || product.price;
            totalPrice += price * item.quantity;

            // Определение склада-отправителя
            let sourceWarehouseId = null;

            // а) Ищем локальный склад (в городе ПВЗ) с достаточным количеством
            const { data: localStock } = await supabase
                .from('product_stocks')
                .select('warehouse_id')
                .eq('product_id', item.product_id)
                .gte('quantity', item.quantity)
                .in('warehouse_id', 
                    (await supabase
                        .from('warehouses')
                        .select('id')
                        .eq('city_id', targetCityId)
                    ).data.map(w => w.id)
                )
                .limit(1)
                .maybeSingle();

            if (localStock) {
                sourceWarehouseId = localStock.warehouse_id;
            } else {
                // б) Ищем межгородской склад (в другом городе) с достаточным количеством
                const { data: intercityStock } = await supabase
                    .from('product_stocks')
                    .select('warehouse_id, warehouses!inner(city_id)')
                    .eq('product_id', item.product_id)
                    .gte('quantity', item.quantity)
                    .neq('warehouses.city_id', targetCityId)
                    .limit(1)
                    .maybeSingle();

                if (intercityStock) {
                    sourceWarehouseId = intercityStock.warehouse_id;
                } else {
                    // Частичное наличие – берём любой склад (можно просто отказать)
                    return res.status(400).json({
                        error: `Товар "${item.product_id}" недоступен в нужном количестве`
                    });
                }
            }

            // Списание остатка (уменьшаем quantity)
            const { error: updateErr } = await supabase
                .from('product_stocks')
                .update({ quantity: supabase.raw(`quantity - ${item.quantity}`) })
                .eq('product_id', item.product_id)
                .eq('warehouse_id', sourceWarehouseId)
                .gte('quantity', item.quantity);

            if (updateErr) throw updateErr;

            itemsData.push({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: price,
                warehouse_id: sourceWarehouseId
            });
        }

        const finalTotal = totalPrice + totalShipping;

        // 4. Создание заказа
        const { data: order, error: oErr } = await supabase.from('orders').insert([{
            user_id: req.headers['x-user-id'] || crypto.randomUUID(),
            warehouse_id,
            payment_method,
            payment_status: 'unpaid',
            delivery_status: 'processing',
            shipping_cost: totalShipping,
            total_price: finalTotal,
            delivery_address: `${targetWh.cities.name}, ${targetWh.address}`,
            customer_name, customer_phone, customer_email
        }]).select();

        if (oErr) throw oErr;

        // Вставка позиций с указанием склада-отправителя
        await supabase.from('order_items').insert(
            itemsData.map(i => ({ ...i, order_id: order[0].id }))
        );

        // Уведомление о новом заказе
        if (order && order[0]) {
            const newOrder = order[0];
            await notifyAndEmail({
                userId: req.headers['x-user-id'] || null,
                type: 'order',
                email: customer_email,
                title: `Заказ №${newOrder.id} оформлен`,
                message: `Ваш заказ на сумму ${finalTotal} ₽ принят в обработку.`,
                templateName: 'order_created.html',
                templateVars: {
                    order_id: newOrder.id,
                    total: finalTotal,
                    name: customer_name,
                    address: newOrder.delivery_address
                }
            });
        }

        res.json({ orderId: order[0].id, total: finalTotal, distance_based_shipping: totalShipping });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/orders/:userId', async (req, res) => {
    const { data } = await supabase
        .from('orders')
        .select(`*, order_items (id, product_id, quantity, unit_price, warehouse_id, products (*))`)
        .eq('user_id', req.params.userId)
        .order('created_at', { ascending: false });
    res.json(data || []);
});


app.post('/api/calculate-shipping', verifyAdmin, async (req, res) => {
    const { warehouse_id, items } = req.body;
    try {
        const { data, error } = await supabase.rpc('calculate_order_shipping', {
            target_warehouse_id: warehouse_id,
            items_json: items
        });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payment/tinkoff-init', async (req, res) => {
    const { orderId } = req.body;
    const mockPaymentUrl = `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/payment/test-webhook?orderId=${orderId}&status=paid`;
    res.json({ confirmation_url: mockPaymentUrl });
});

app.get('/api/payment/test-webhook', async (req, res) => {
    const { orderId, status } = req.query;
    if (status === 'paid') {
        await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
        res.redirect(`/order-success?orderId=${orderId}`);
    }
});

// =====================================================================
// API: УПРАВЛЕНИЕ ФАЙЛАМИ
// =====================================================================
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

app.delete('/api/storage/:bucket/:filename', verifyAdmin, async (req, res) => {
    try {
        const { bucket, filename } = req.params;
        const { error } = await supabase.storage.from(bucket).remove([filename]);
        if (error) throw error;
        res.json({ success: true, message: 'Файл удален' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// =====================================================================
// API: АДМИНКА
// =====================================================================
app.get('/api/admin/system/logs', verifyAdmin, (req, res) => {
    const { type } = req.query;
    const file = type === 'errors' ? 'errors.log' : type === 'notifications' ? 'notifications.log' : 'actions.log';
    if (!fs.existsSync(path.join(LOGS_DIR, file))) return res.json([]);
    const lines = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8').trim().split('\n').filter(Boolean);
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

app.post('/api/admin/:table', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from(req.params.table).insert([req.body]).select();
        if (error) throw error;
        res.json(data[0] || data);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/:table/:id', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from(req.params.table).update(req.body).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/:table/:id', verifyAdmin, async (req, res) => {
    try {
        const { error } = await supabase.from(req.params.table).delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    const { delivery_status, payment_status } = req.body;
    const orderId = req.params.id;

    try {
        // Получаем текущий заказ
        const { data: oldOrder } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();

        if (!oldOrder) return res.status(404).json({ error: 'Заказ не найден' });

        // Проверяем, нужно ли возвращать остатки
        const needReturn = 
            (delivery_status === 'cancelled' || delivery_status === 'returned') &&
            oldOrder.delivery_status !== delivery_status;

        // Обновляем статус
        const { data: updatedOrder, error: updateErr } = await supabase
            .from('orders')
            .update({ delivery_status, payment_status })
            .eq('id', orderId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        // Возврат остатков на склады
        if (needReturn) {
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('product_id, quantity, warehouse_id')
                .eq('order_id', orderId);

            for (const item of orderItems) {
                if (item.warehouse_id) {
                    await supabase
                        .from('product_stocks')
                        .update({ quantity: supabase.raw(`quantity + ${item.quantity}`) })
                        .eq('product_id', item.product_id)
                        .eq('warehouse_id', item.warehouse_id);
                }
            }
        }

        // Уведомления
        if (delivery_status === 'ready_for_pickup') {
            await notifyAndEmail({
                userId: updatedOrder.user_id,
                type: 'order',
                email: updatedOrder.customer_email,
                title: `Заказ №${orderId} готов к выдаче!`,
                message: `Ваш заказ ожидает вас по адресу: ${updatedOrder.delivery_address}.`,
                templateName: 'order_ready_for_pickup.html',
                templateVars: {
                    order_id: orderId,
                    address: updatedOrder.delivery_address,
                    name: updatedOrder.customer_name
                }
            });
        } else if (delivery_status === 'delivered') {
            await notifyAndEmail({
                userId: updatedOrder.user_id,
                type: 'order',
                email: updatedOrder.customer_email,
                title: `Заказ №${orderId} выдан`,
                message: `Ваш заказ был выдан.`,
                templateName: 'order_delivered.html',
                templateVars: {
                    order_id: orderId,
                    name: updatedOrder.customer_name
                }
            });
        } else if (delivery_status) {
            await notifyAndEmail({
                userId: updatedOrder.user_id,
                type: 'order',
                email: updatedOrder.customer_email,
                title: `Статус заказа №${orderId} изменён`,
                message: `Новый статус: ${delivery_status}.`,
                templateName: 'order_status.html',
                templateVars: {
                    order_id: orderId,
                    status: delivery_status,
                    name: updatedOrder.customer_name
                }
            });
        }

        res.json(updatedOrder);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Catch-all для Vue Router
app.get(/^(?!\/api).+/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`🚀 ApexDrive Server Active: http://localhost:${PORT}`));

module.exports = app;