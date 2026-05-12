require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

// 1. Настройка DNS (IPv4 first)
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

// --- 4. Системное Логирование ---
const LOGS_DIR = path.join(__dirname, 'logs');
const ERROR_LOG = path.join(LOGS_DIR, 'errors.log');
const ACTIONS_LOG = path.join(LOGS_DIR, 'actions.log');
const NOTIFICATIONS_LOG = path.join(LOGS_DIR, 'notifications.log');

if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR);
[ERROR_LOG, ACTIONS_LOG, NOTIFICATIONS_LOG].forEach(f => { 
    if (!fs.existsSync(f)) fs.writeFileSync(f, ''); 
});

const writeLog = (filePath, data) => {
    const entry = JSON.stringify({
        id: crypto.randomBytes(4).toString('hex'),
        timestamp: new Date().toLocaleString('ru-RU'),
        ...data
    }) + '\n';
    fs.appendFile(filePath, entry, (err) => { 
        if (err) console.error('Ошибка записи лога:', err); 
    });
};

const logError = (err, req = null) => {
    writeLog(ERROR_LOG, {
        type: 'ERROR', 
        message: err.message,
        stack: err.stack, 
        url: req ? req.originalUrl : 'SYSTEM',
        method: req ? req.method : 'N/A',
        user: req ? (req.headers['x-user-id'] || 'guest') : 'system',
        ip: req ? req.ip : '127.0.0.1'
    });
};

// --- Middleware для логирования действий (Actions) ---
app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        res.on('finish', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                writeLog(ACTIONS_LOG, {
                    action: req.method,
                    url: req.originalUrl,
                    message: `Успешный запрос: ${req.method} ${req.originalUrl}`,
                    user: {
                        id: req.headers['x-user-id'] || 'guest',
                        name: req.headers['x-user-name'] || 'Anonymous'
                    },
                    ip: req.ip,
                    status: res.statusCode
                });
            }
        });
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

const DEFAULT_AVATARS = [
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
];

// --- Шаблоны писем ---
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

// --- Уведомления и email (Через API Brevo по HTTPS) ---
const notifyAndEmail = async ({ userId, type, title, message, email, templateName, templateVars = {} }) => {
    writeLog(NOTIFICATIONS_LOG, { userId, type, title, message, emailSentTo: email });

    try {
        if (userId) await supabase.from('notifications').insert([{ user_id: userId, type, title, message }]);
    } catch (e) { console.error('Ошибка записи уведомления в БД:', e.message); }

    if (email) {
        try {
            const html = getEmailTemplate(
                templateName || 'notification_general.html',
                { title, message, ...templateVars }
            );

            // Отправляем HTTP запрос к API Brevo (Render не блокирует это соединение)
            await axios.post('https://api.brevo.com/v3/smtp/email', {
                sender: { name: "ApexDrive", email: process.env.EMAIL_USER },
                to: [{ email: email }],
                subject: title,
                htmlContent: html
            }, {
                headers: {
                    'api-key': process.env.BREVO_API_KEY,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log(`✅ Письмо успешно отправлено через Brevo API на ${email}`);
        } catch (e) {
            console.error(`❌ Ошибка отправки письма Brevo на ${email}:`, e.response?.data || e.message);
            logError(e);
        }
    }
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

app.get('/api/cities', async (req, res) => {
    try {
        const { data, error } = await supabase.from('cities').select('*').order('name', { ascending: true });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/warehouses', async (req, res) => {
    const { city_id } = req.query;
    let query = supabase.from('warehouses').select('id, address, phone, working_hours, city_id, cities(name)');
    if (city_id) query = query.eq('city_id', city_id);
    const { data, error } = await query.order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
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
    const { data } = await supabase
        .from('products')
        .select(`id, name, price, discount_price, images, sku, is_active, product_stocks (quantity, warehouses (cities (name)))`)
        .in('id', ids);
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
// API: КАЛЬКУЛЯТОР ДОСТАВКИ (публичный)
// =====================================================================
app.post('/api/shipping-calculator', async (req, res) => {
    const { warehouse_id, weight_kg, items_cost } = req.body;
    if (!warehouse_id || !weight_kg) {
        return res.status(400).json({ error: 'warehouse_id и weight_kg обязательны' });
    }
    try {
        const sourceWarehouseId = 1;

        const { data: sourceWh } = await supabase
            .from('warehouses')
            .select('cities!inner(lat, lon)')
            .eq('id', sourceWarehouseId)
            .maybeSingle();
        if (!sourceWh || !sourceWh.cities) {
            return res.status(500).json({ error: 'Не удалось получить координаты склада-отправителя' });
        }

        const { data: targetWarehouse, error: whError } = await supabase
            .from('warehouses')
            .select('id, address, cities!inner(lat, lon, name)')
            .eq('id', warehouse_id)
            .maybeSingle();
        if (whError || !targetWarehouse) {
            return res.status(404).json({ error: 'Склад не найден' });
        }

        const lat1 = sourceWh.cities?.lat;
        const lon1 = sourceWh.cities?.lon;
        const lat2 = targetWarehouse.cities?.lat;
        const lon2 = targetWarehouse.cities?.lon;

        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            return res.status(500).json({ error: 'Некорректные координаты складов' });
        }

        const { data: distanceData } = await supabase.rpc('haversine_distance', { lat1, lon1, lat2, lon2 });
        const distanceKm = distanceData || 0;

        const base = 200;
        let rate;
        if (weight_kg <= 5) rate = 0.35;
        else if (weight_kg <= 20) rate = 0.22;
        else if (weight_kg <= 50) rate = 0.16;
        else if (weight_kg <= 100) rate = 0.10;
        else rate = 0.07;

        let shipping = distanceKm * weight_kg * rate + base;

        let maxShipping = null;
        if (items_cost > 0) {
            maxShipping = parseFloat((items_cost * 0.22).toFixed(2));
            if (shipping > maxShipping) shipping = maxShipping;
        }

        res.json({
            city: targetWarehouse.cities?.name || 'Неизвестно',
            address: targetWarehouse.address,
            distance_km: Math.round(distanceKm),
            formula_details: {
                base,
                rate,
                weight_kg: +weight_kg,
                distance_km: Math.round(distanceKm),
                raw_shipping: Math.round(distanceKm * weight_kg * rate + base)
            },
            max_shipping: maxShipping ? parseFloat(maxShipping.toFixed(0)) : null,
            total_shipping: parseFloat(shipping.toFixed(0))
        });
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
});

// =====================================================================
// API: ИЗБРАННОЕ И ОТЗЫВЫ
// =====================================================================
app.get('/api/wishlist/:userId', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('wishlists')
            .select(`
                id, user_id, product_id,
                products (*, brands (name, logo_url), product_stocks (quantity, warehouses (cities (name))))
            `)
            .eq('user_id', req.params.userId);
        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
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

app.post('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const { email, phone_number, password, first_name, last_name, otchestvo, city, role } = req.body;

        if (!first_name) return res.status(400).json({ error: 'Имя обязательно' });
        if (!password || password.length < 6) return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });

        const newUserId = crypto.randomUUID();
        const cityId = await getOrCreateCity(city);

        let filter = email ? `email.eq.${email}` : `phone_number.eq.${phone_number}`;
        const { data: existing } = await supabase.from('users').select('*').or(filter).maybeSingle();

        if (existing) {
            if (existing.password_hash) return res.status(400).json({ error: 'Пользователь уже существует' });

            const { data: updatedUser, error: updateErr } = await supabase.from('users').update({
                password_hash: password,
                role: role || 'user',
                first_name,
                last_name,
                otchestvo,
                saved_city_id: cityId,
                is_email_verified: false
            }).eq('id', existing.id).select().single();

            if (updateErr) throw updateErr;

            if (email) {
                const token = crypto.randomBytes(32).toString('hex');
                const expiresAt = new Date(Date.now() + 3600000).toISOString();
                await supabase.from('password_reset_tokens').insert([{ user_id: existing.id, token, expires_at: expiresAt }]);
                const verifyLink = `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/users/verify-email?token=${token}`;
                await notifyAndEmail({
                    userId: existing.id,
                    type: 'system',
                    email: email,
                    title: 'Подтверждение регистрации',
                    message: 'Добро пожаловать в ApexDrive! Подтвердите вашу почту.',
                    templateName: 'email_verify.html',
                    templateVars: { link: verifyLink, first_name }
                });
            }

            return res.json(updatedUser);
        }

        const { data: newUser, error: createErr } = await supabase.from('users').insert([{
            id: newUserId,
            role: role || 'user',
            email: email || null,
            phone_number: phone_number || null,
            password_hash: password,
            first_name,
            last_name,
            otchestvo,
            saved_city_id: cityId,
            avatar_url: DEFAULT_AVATARS[0],
            is_email_verified: false
        }]).select().single();

        if (createErr) throw createErr;

        if (email) {
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 3600000).toISOString();
            await supabase.from('password_reset_tokens').insert([{ user_id: newUser.id, token, expires_at: expiresAt }]);
            const verifyLink = `${process.env.VITE_API_URL || 'http://localhost:3000'}/api/users/verify-email?token=${token}`;
            await notifyAndEmail({
                userId: newUser.id,
                type: 'system',
                email: email,
                title: 'Подтверждение регистрации',
                message: 'Добро пожаловать в ApexDrive! Подтвердите вашу почту.',
                templateName: 'email_verify.html',
                templateVars: { link: verifyLink, first_name }
            });
        }

        res.json(newUser);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message || 'Внутренняя ошибка сервера' });
    }
});

app.get('/api/users/verify-email', async (req, res) => {
    const { token } = req.query;
    try {
        const { data: tData } = await supabase.from('password_reset_tokens').select('*').eq('token', token).eq('used', false).gt('expires_at', new Date().toISOString()).maybeSingle();
        if (!tData) return res.status(400).send('Ссылка недействительна или устарела');
        await supabase.from('users').update({ is_email_verified: true }).eq('id', tData.user_id);
        await supabase.from('password_reset_tokens').update({ used: true }).eq('id', tData.id);
        res.redirect('/login?verified=true'); 
    } catch (e) { 
        logError(e, req);
        res.status(500).send('Ошибка подтверждения'); 
    }
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
    const { city, city_id, role, password_hash, ...updateData } = req.body;
    const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_SECRET;

    try {
        if (city_id) {
            updateData.saved_city_id = city_id;
        } else if (city) {
            updateData.saved_city_id = await getOrCreateCity(city);
        }

        if (role) {
            if (isAdmin) {
                updateData.role = role;
            } else {
                console.warn(`Попытка несанкционированной смены роли для ID: ${req.params.id}`);
            }
        }
        
        if (password_hash) {
            updateData.password_hash = password_hash;
        }

        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', req.params.id)
            .select('*, cities(name)')
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Пользователь не найден' });

        res.json(data);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: 'Ошибка сервера при обновлении профиля' });
    }
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
    } catch (e) { 
        logError(e, req);
        res.status(500).json({ error: 'Ошибка сброса' }); 
    }
});

// =====================================================================
// API: ЗАКАЗЫ
// =====================================================================
app.post('/api/orders', async (req, res) => {
    const { customer_name, customer_email, customer_phone, items, warehouse_id, payment_method } = req.body;
    
    try {
        const { data: targetWh, error: whError } = await supabase
            .from('warehouses')
            .select('*, cities(id, name, lat, lon)')
            .eq('id', warehouse_id)
            .single();
        if (whError || !targetWh) {
            return res.status(400).json({ error: 'Склад не найден' });
        }
        const targetCityId = targetWh.cities.id;

        const { data: shippingData, error: shipErr } = await supabase.rpc('calculate_order_shipping', {
            target_warehouse_id: warehouse_id,
            items_json: items
        });
        if (shipErr) {
            return res.status(500).json({ error: 'Ошибка расчёта доставки' });
        }
        const totalShipping = shippingData.total;

        let totalPrice = 0;
        const itemsData = [];

        for (let item of items) {
            const { data: product, error: productErr } = await supabase
                .from('products')
                .select('price, discount_price')
                .eq('id', item.product_id)
                .single();
            if (productErr || !product) {
                return res.status(400).json({ error: `Товар ID ${item.product_id} не найден` });
            }
            const price = product.discount_price || product.price;
            totalPrice += price * item.quantity;

            let sourceWarehouseId = null;

            const { data: warehousesInCity } = await supabase
                .from('warehouses')
                .select('id')
                .eq('city_id', targetCityId);
            const cityWarehouseIds = warehousesInCity.map(w => w.id);

            if (cityWarehouseIds.length > 0) {
                const { data: localStock } = await supabase
                    .from('product_stocks')
                    .select('warehouse_id')
                    .eq('product_id', item.product_id)
                    .gte('quantity', item.quantity)
                    .in('warehouse_id', cityWarehouseIds)
                    .limit(1)
                    .maybeSingle();
                if (localStock) {
                    sourceWarehouseId = localStock.warehouse_id;
                }
            }

            if (!sourceWarehouseId) {
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
                    return res.status(400).json({ error: `Товар "${item.product_id}" недоступен в нужном количестве` });
                }
            }

            const { data: currentStock } = await supabase
                .from('product_stocks')
                .select('quantity')
                .eq('product_id', item.product_id)
                .eq('warehouse_id', sourceWarehouseId)
                .single();
            if (!currentStock || currentStock.quantity < item.quantity) {
                return res.status(409).json({ error: `Недостаточно остатков для товара на складе ${sourceWarehouseId}` });
            }

            const { error: updateErr } = await supabase
                .from('product_stocks')
                .update({ quantity: currentStock.quantity - item.quantity })
                .eq('product_id', item.product_id)
                .eq('warehouse_id', sourceWarehouseId);
            if (updateErr) {
                return res.status(500).json({ error: 'Ошибка при списании остатков' });
            }

            itemsData.push({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: price,
                warehouse_id: sourceWarehouseId
            });
        }

        const finalTotal = totalPrice + totalShipping;

        const { data: order, error: oErr } = await supabase.from('orders').insert([{ 
            user_id: req.headers['x-user-id'] || crypto.randomUUID(),
            warehouse_id, 
            payment_method,
            payment_status: payment_method === 'card' ? 'paid' : 'unpaid',
            delivery_status: 'processing',
            shipping_cost: totalShipping, 
            total_price: finalTotal,
            delivery_address: `${targetWh.cities.name}, ${targetWh.address}`,
            customer_name, customer_phone, customer_email
        }]).select();

        if (oErr) {
            return res.status(500).json({ error: 'Не удалось создать заказ' });
        }

        const { error: itemsErr } = await supabase.from('order_items').insert(
            itemsData.map(i => ({ ...i, order_id: order[0].id }))
        );
        if (itemsErr) {
            return res.status(500).json({ error: 'Не удалось сохранить позиции заказа' });
        }

        if (order && order[0]) {
            const newOrder = order[0];
            notifyAndEmail({
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
            }).catch(err => console.error('❌ Ошибка отправки уведомления:', err));
        }

        res.json({ orderId: order[0].id, total: finalTotal, distance_based_shipping: totalShipping });
    } catch (err) {
        logError(err, req);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

app.get('/api/orders/:userId', async (req, res) => {
    try {
        const { data } = await supabase
            .from('orders')
            .select(`*, order_items (id, product_id, quantity, unit_price, warehouse_id, products (*))`)
            .eq('user_id', req.params.userId)
            .order('created_at', { ascending: false });
        res.json(data || []);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/payment/confirm', async (req, res) => {
    const { orderId } = req.body;
    try {
        const { data: order, error: fetchErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();
        if (fetchErr || !order) return res.status(404).json({ error: 'Заказ не найден' });
        if (order.payment_status === 'paid') return res.status(400).json({ error: 'Заказ уже оплачен' });

        await supabase.from('orders').update({
            payment_method: 'card',
            payment_status: 'paid'
        }).eq('id', orderId);

        res.json({ success: true });
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
});

// =====================================================================
// API: ОТМЕНА ЗАКАЗА ПОЛЬЗОВАТЕЛЕМ
// =====================================================================
app.patch('/api/orders/:id', async (req, res) => {
    const orderId = req.params.id;
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

    try {
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', userId)
            .maybeSingle();
        if (orderErr || !order) {
            return res.status(404).json({ error: 'Заказ не найден или доступ запрещён' });
        }

        const { delivery_status } = req.body;
        if (delivery_status !== 'cancelled' || ['delivered', 'cancelled', 'returned'].includes(order.delivery_status)) {
            return res.status(400).json({ error: 'Невозможно отменить данный заказ' });
        }

        const { data: items } = await supabase
            .from('order_items')
            .select('product_id, quantity, warehouse_id')
            .eq('order_id', orderId);

        if (items) {
            for (const item of items) {
                if (item.warehouse_id) {
                    const { data: stock } = await supabase
                        .from('product_stocks')
                        .select('quantity')
                        .eq('product_id', item.product_id)
                        .eq('warehouse_id', item.warehouse_id)
                        .maybeSingle();
                    if (stock) {
                        await supabase
                            .from('product_stocks')
                            .update({ quantity: stock.quantity + item.quantity })
                            .eq('product_id', item.product_id)
                            .eq('warehouse_id', item.warehouse_id);
                    }
                }
            }
        }

        const { data: updated, error: updateErr } = await supabase
            .from('orders')
            .update({ delivery_status: 'cancelled' })
            .eq('id', orderId)
            .select()
            .single();
        if (updateErr) throw updateErr;

        res.json(updated);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
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
        logError(e, req);
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
// API: ВОЗВРАТЫ (Пользователь и Админ)
// =====================================================================
app.post('/api/admin/return_requests', verifyAdmin, async (req, res) => {
    const { order_id, user_id, reason } = req.body;
    try {
        const { data: existing } = await supabase
            .from('return_requests')
            .select('id, status')
            .eq('order_id', order_id)
            .in('status', ['pending', 'approved'])
            .maybeSingle();

        if (existing) {
            return res.status(400).json({ error: `Для заказа #${order_id} уже существует активная заявка в статусе: ${existing.status}` });
        }

        const { data, error } = await supabase
            .from('return_requests')
            .insert([{ order_id, user_id, reason, status: 'pending' }])
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/admin/return_requests/:id', verifyAdmin, async (req, res) => {
    const { status } = req.body;
    const requestId = req.params.id;

    try {
        const { data: request, error: fetchErr } = await supabase
            .from('return_requests')
            .select('*, users(email, first_name)')
            .eq('id', requestId)
            .single();

        if (fetchErr || !request) return res.status(404).json({ error: 'Заявка не найдена' });

        if (status === 'approved' && request.status !== 'approved') {
            const { data: items } = await supabase
                .from('order_items')
                .select('product_id, quantity, warehouse_id')
                .eq('order_id', request.order_id);

            if (items) {
                for (const item of items) {
                    if (item.warehouse_id) {
                        const { data: stock } = await supabase
                            .from('product_stocks')
                            .select('quantity')
                            .eq('product_id', item.product_id)
                            .eq('warehouse_id', item.warehouse_id)
                            .maybeSingle();
                        if (stock) {
                            await supabase.from('product_stocks').update({ 
                                quantity: stock.quantity + item.quantity 
                            }).eq('product_id', item.product_id).eq('warehouse_id', item.warehouse_id);
                        }
                    }
                }
            }
            await supabase.from('orders').update({ delivery_status: 'returned' }).eq('id', request.order_id);
        }

        const { data: updated, error: updateErr } = await supabase
            .from('return_requests')
            .update({ status })
            .eq('id', requestId)
            .select()
            .single();

        if (updateErr) throw updateErr;

        const isApproved = status === 'approved';
        await notifyAndEmail({
            userId: request.user_id,
            type: 'system',
            email: request.users?.email,
            title: isApproved ? '✅ Возврат одобрен' : '❌ Возврат отклонен',
            message: isApproved 
                ? `Ваша заявка на возврат по заказу №${request.order_id} одобрена. Товар принят обратно.`
                : `Ваша заявка на возврат по заказу №${request.order_id} была отклонена менеджером.`,
            templateName: 'notification_general.html',
            templateVars: { first_name: request.users?.first_name || 'Клиент' }
        });

        res.json(updated);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/orders/:id/return', async (req, res) => {
    const orderId = req.params.id;
    const userId = req.headers['x-user-id'];
    const { reason } = req.body;

    if (!userId) return res.status(401).json({ error: 'Авторизуйтесь' });
    if (!reason || reason.length < 5) return res.status(400).json({ error: 'Укажите причину возврата (минимум 5 символов)' });

    try {
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .eq('user_id', userId)
            .single();

        if (orderErr || !order) return res.status(404).json({ error: 'Заказ не найден' });
        
        if (order.delivery_status !== 'delivered' || order.payment_status !== 'paid') {
            return res.status(400).json({ error: 'Возврат возможен только для оплаченных и полученных заказов' });
        }

        const { data: existing } = await supabase
            .from('return_requests')
            .select('id')
            .eq('order_id', orderId)
            .in('status', ['pending', 'approved'])
            .maybeSingle();

        if (existing) return res.status(400).json({ error: 'Заявка на возврат уже подана' });

        const { error: returnErr } = await supabase
            .from('return_requests')
            .insert([{ order_id: orderId, user_id: userId, reason, status: 'pending' }]);

        if (returnErr) throw returnErr;

        await supabase.from('notifications').insert([{
            user_id: userId,
            type: 'system',
            title: 'Заявка на возврат создана',
            message: `Ваша заявка по заказу №${orderId} принята на рассмотрение.`
        }]);

        res.json({ success: true, message: 'Заявка создана' });
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
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
    } catch (err) { 
        logError(err, req);
        res.status(500).json({ error: err.message }); 
    }
});

app.delete('/api/storage/:bucket/:filename', verifyAdmin, async (req, res) => {
    try {
        const { bucket, filename } = req.params;
        const { error } = await supabase.storage.from(bucket).remove([filename]);
        if (error) throw error;
        res.json({ success: true, message: 'Файл удален' });
    } catch (err) { 
        logError(err, req);
        res.status(500).json({ error: err.message }); 
    }
});

// Форма обратной связи (Через API Brevo)
app.post('/api/feedback/send', async (req, res) => {
    const { name, contact, message } = req.body;
    if (!name || !contact || !message) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    try {
        await axios.post('https://api.brevo.com/v3/smtp/email', {
            sender: { name: "ApexDrive", email: process.env.EMAIL_USER },
            to: [{ email: process.env.EMAIL_USER }], // Отправляем себе (админу)
            subject: `🔥 Новое сообщение с сайта от ${name}`,
            htmlContent: `
                <h3>Новое обращение через форму контактов</h3>
                <p><b>Имя клиента:</b> ${name}</p>
                <p><b>Контактные данные:</b> ${contact}</p>
                <hr>
                <p><b>Сообщение:</b></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `
        }, {
            headers: {
                'api-key': process.env.BREVO_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ success: true, message: 'Сообщение отправлено' });
    } catch (e) {
        logError(e, req);
        console.error('Ошибка формы контактов Brevo:', e.response?.data || e.message);
        res.status(500).json({ error: 'Не удалось отправить сообщение. Попробуйте позже.' });
    }
});

app.post('/api/public/shipping-estimate', async (req, res) => {
    const { warehouse_id, items } = req.body;
    if (!warehouse_id || !items || !items.length) {
        return res.status(400).json({ error: 'warehouse_id и items обязательны' });
    }
    try {
        const { data, error } = await supabase.rpc('calculate_order_shipping', {
            target_warehouse_id: warehouse_id,
            items_json: items
        });
        if (error) throw error;
        res.json(data);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
});

// =====================================================================
// API: АДМИНКА
// =====================================================================
app.get('/api/admin/system/logs', verifyAdmin, (req, res) => {
    const { type } = req.query;
    const file = type === 'errors' ? 'errors.log' : type === 'notifications' ? 'notifications.log' : 'actions.log';
    if (!fs.existsSync(path.join(LOGS_DIR, file))) return res.json([]);
    try {
        const lines = fs.readFileSync(path.join(LOGS_DIR, file), 'utf8').trim().split('\n').filter(Boolean);
        res.json(lines.map(l => JSON.parse(l)).reverse());
    } catch (e) {
        res.json([]);
    }
});

app.get('/api/admin/wishlists', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('wishlists')
            .select(`
                id, user_id, product_id, added_at,
                users!inner(first_name, last_name, email, phone_number, avatar_url),
                products!inner(name, sku, images)
            `)
            .order('id', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/admin/:table', verifyAdmin, async (req, res) => {
    try {
        let query;
        if (req.params.table === 'users') {
            query = supabase.from('users').select('*, cities(name)');
        } else if (req.params.table === 'warehouses') {
            query = supabase.from('warehouses').select('*, cities(name)');
        } else if (req.params.table === 'notifications') {
            query = supabase.from('notifications').select('*, users(first_name, last_name)');
        } else if (req.params.table === 'product_stocks') {
            query = supabase.from('product_stocks').select('*, products(name, sku), warehouses(*, cities(name))');
        } else if (req.params.table === 'user_vehicles') {
            query = supabase.from('user_vehicles').select('*, users(first_name, last_name)');
        } else if (req.params.table === 'return_requests') {
            query = supabase.from('return_requests').select('*, users(first_name, last_name)');
        } else if (req.params.table === 'order_items') {
            query = supabase.from('order_items').select('*, products(name, sku, images)');
        } else {
            query = supabase.from(req.params.table).select('*');
        }
        
        const { data, error } = await query.order('id', { ascending: false });
        if (error) throw error;
        res.json(data || []);
    } catch (e) { 
        logError(e, req);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/admin/:table', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from(req.params.table).insert([req.body]).select();
        if (error) throw error;
        res.json(data[0] || data);
    } catch (e) { 
        logError(e, req);
        res.status(500).json({ error: e.message }); 
    }
});

app.put('/api/admin/:table/:id', verifyAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase.from(req.params.table).update(req.body).eq('id', req.params.id).select();
        if (error) throw error;
        res.json(data[0]);
    } catch (e) { 
        logError(e, req);
        res.status(500).json({ error: e.message }); 
    }
});

app.delete('/api/admin/orders/:id', verifyAdmin, async (req, res) => {
    const orderId = req.params.id;

    try {
        const { data: items, error: itemsErr } = await supabase
            .from('order_items')
            .select('product_id, quantity, warehouse_id')
            .eq('order_id', orderId);

        if (itemsErr) throw itemsErr;

        if (items && items.length > 0) {
            for (const item of items) {
                if (item.warehouse_id) {
                    const { data: stockData, error: stockErr } = await supabase
                        .from('product_stocks')
                        .select('quantity')
                        .eq('product_id', item.product_id)
                        .eq('warehouse_id', item.warehouse_id)
                        .maybeSingle();

                    if (stockErr) {
                        console.error('Ошибка получения остатка при возврате:', stockErr);
                        continue;
                    }
                    const newQty = (stockData?.quantity || 0) + item.quantity;
                    const { error: updateErr } = await supabase
                        .from('product_stocks')
                        .update({ quantity: newQty })
                        .eq('product_id', item.product_id)
                        .eq('warehouse_id', item.warehouse_id);
                    if (updateErr) {
                        console.error('Ошибка возврата остатков при удалении заказа:', updateErr);
                    }
                }
            }
        }

        const { error: deleteErr } = await supabase.from('orders').delete().eq('id', orderId);
        if (deleteErr) throw deleteErr;

        res.json({ success: true, message: 'Заказ удалён, остатки возвращены' });
    } catch (e) {
        logError(e, req);
        res.status(500).json({ error: 'Ошибка при удалении заказа' });
    }
});

app.delete('/api/admin/:table/:id', verifyAdmin, async (req, res) => {
    try {
        const { error } = await supabase.from(req.params.table).delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { 
        logError(e, req);
        res.status(500).json({ error: e.message }); 
    }
});

app.patch('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    const { delivery_status, payment_status } = req.body;
    const orderId = req.params.id;

    try {
        const { data: oldOrder, error: fetchErr } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
        if (fetchErr) return res.status(404).json({ error: 'Заказ не найден' });

        const needReturn = 
            (delivery_status === 'cancelled' || delivery_status === 'returned') &&
            oldOrder.delivery_status !== delivery_status;

        const { data: updatedOrder, error: updateErr } = await supabase
            .from('orders')
            .update({ delivery_status, payment_status })
            .eq('id', orderId)
            .select()
            .single();
        if (updateErr) throw updateErr;

        if (needReturn) {
            const { data: orderItems } = await supabase
                .from('order_items')
                .select('product_id, quantity, warehouse_id')
                .eq('order_id', orderId);

            for (const item of orderItems) {
                if (item.warehouse_id) {
                    const { data: stockData } = await supabase
                        .from('product_stocks')
                        .select('quantity')
                        .eq('product_id', item.product_id)
                        .eq('warehouse_id', item.warehouse_id)
                        .maybeSingle();
                    if (stockData) {
                        const newQty = stockData.quantity + item.quantity;
                        await supabase
                            .from('product_stocks')
                            .update({ quantity: newQty })
                            .eq('product_id', item.product_id)
                            .eq('warehouse_id', item.warehouse_id);
                    }
                }
            }
        }

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
        logError(e, req);
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

// Глобальный обработчик ошибок (ОБЯЗАТЕЛЬНО в самом конце)
app.use((err, req, res, next) => {
    logError(err, req);
    console.error('🔴 System Error:', err.message);
    res.status(500).json({ error: 'Внутренняя ошибка сервера. Информация сохранена в журнале.' });
});

app.listen(PORT, () => console.log(`🚀 ApexDrive Server Active: http://localhost:${PORT}`));

module.exports = app;