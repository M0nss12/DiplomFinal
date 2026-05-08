const request = require('supertest');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');

// --- 1. МОКИРОВАНИЕ ---

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    appendFile: jest.fn((path, data, cb) => cb(new Error('Disk Write Error'))), // Имитируем поломку диска
    writeFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(false), // Притворяемся, что папок для логов нет
    mkdirSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue('NOT_A_JSON_FORMAT') // Ломаем парсинг логов
}));

jest.mock('axios');

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        verify: jest.fn((cb) => cb(new Error('SMTP connection failed'))), // Почта всегда "лежит"
        sendMail: jest.fn().mockRejectedValue(new Error('Internal Mail Error'))
    })
}));

// Универсальный "хитрый" мок для Supabase (настроен на провал)
const mockSupabaseQuery = () => {
    const chain = {
        select: jest.fn(() => chain),
        insert: jest.fn(() => chain),
        update: jest.fn(() => chain),
        delete: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        or: jest.fn(() => chain),
        in: jest.fn(() => chain),
        ilike: jest.fn(() => chain),
        not: jest.fn(() => chain),
        order: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        // Возвращаем ошибки вместо данных
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Database is down' } }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: { message: 'NotFound' } }),
        then: jest.fn(function (resolve) { resolve({ data: null, error: 'Fatal error' }); })
    };
    return chain;
};

const mockSupabase = {
    from: jest.fn(() => mockSupabaseQuery()),
    rpc: jest.fn().mockResolvedValue({ data: false, error: 'Auth failed' }), // Пароли никогда не подходят
    storage: {
        from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ data: null, error: 'Storage full' }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: '' } }),
            remove: jest.fn().mockResolvedValue({ data: null, error: 'Delete failed' })
        }))
    }
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

const app = require('./server'); 

// --- 2. ТЕСТЫ (ПОЛНОСТЬЮ ПРОВАЛЬНЫЕ) ---

describe('🚀 ApexDrive FULL API Test Suite', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // =================================================================
    // 📁 БЛОК: ФАЙЛОВАЯ СИСТЕМА И STORAGE
    // =================================================================
    describe('Storage API', () => {
        test('POST /api/upload/:folder - Should upload file and return URL', async () => {
            const res = await request(app)
                .post('/api/upload/avatars')
                .attach('file', Buffer.from('fake_image_data'), 'test.jpg'); 
            
            // ПРОВАЛ: Ждем 200, но сервер вернет 500 из-за ошибки в моке upload
            expect(res.statusCode).toBe(200);
            expect(res.body.url).toBe('http://mock-url.com/img.jpg');
        });

        test('DELETE /api/storage/:folder/:filename - Should remove file (Admin)', async () => {
            const res = await request(app)
                .delete('/api/storage/avatars/test.jpg')
                .set('x-admin-key', 'my_super_secret_admin_123');
            
            // ПРОВАЛ: Ждем true, но сервер вернет 500 из-за ошибки в моке remove
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =================================================================
    // 🏠 БЛОК: МАРКЕТИНГ И ВНЕШНИЕ API
    // =================================================================
    describe('Marketing API', () => {
        test('GET /api/marketing/currency - Should parse CBR data', async () => {
            axios.get.mockResolvedValueOnce({
                data: { Valute: { } } // Ломаем структуру
            });
            const res = await request(app).get('/api/marketing/currency');
            
            // ПРОВАЛ: Ждем конкретное число, но придут дефолтные значения из catch блока сервера
            expect(res.statusCode).toBe(200);
            expect(res.body.usd).toBe('92.50');
        });

        test('GET /api/marketing/news - Should return empty array if no API key', async () => {
            // ПРОВАЛ: Ждем, что в массиве будет новость, но сервер вернет [] т.к. в тестах нет ключа
            const res = await request(app).get('/api/marketing/news');
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([{ title: 'Fake News' }]);
        });

        test('POST /api/feedback/send - Should send email via Nodemailer', async () => {
            const res = await request(app).post('/api/feedback/send').send({
                name: 'Test', contact: '12345', message: 'Hello'
            });
            
            // ПРОВАЛ: Ждем успех, но Nodemailer мок настроен на rejected (вернет 500)
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =================================================================
    // 🛒 БЛОК: КАТАЛОГ И ПОИСК
    // =================================================================
    describe('Catalog API', () => {
        test('GET /api/categories - Should return list', async () => {
            // ПРОВАЛ: Ждем успех, но Supabase в .then вернет error -> сервер выдаст 500
            const res = await request(app).get('/api/categories');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('GET /api/global-search - Should return empty if query < 2 chars', async () => {
            const res = await request(app).get('/api/global-search?q=a');
            
            // ПРОВАЛ: Ждем, что товаров будет > 0 (хотя по логике сервера их будет 0)
            expect(res.body.products.length).toBeGreaterThan(0);
        });

        test('POST /api/products/recent - Should return products by IDs', async () => {
            const res = await request(app).post('/api/products/recent').send({ ids: [1, 2, 3] });
            
            // ПРОВАЛ: Ждем статус 404, хотя роут существует и вернет либо 200, либо 500
            expect(res.statusCode).toBe(404);
        });
    });

    // =================================================================
    // 👤 БЛОК: ПОЛЬЗОВАТЕЛИ
    // =================================================================
    describe('Users API', () => {
        test('POST /api/users/login - Success login', async () => {
            // Настраиваем мок на ошибку
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: null, error: 'Database error' });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/users/login').send({ login: 'test', password: '123' });
            
            // ПРОВАЛ: Ждем успех, но получим 401 "Пользователь не найден"
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe('123');
        });

        test('POST /api/users/login - Wrong password', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: '123' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);
            mockSupabase.rpc.mockResolvedValueOnce({ data: true }); // Имитируем ПРАВИЛЬНЫЙ пароль

            const res = await request(app).post('/api/users/login').send({ login: 'test', password: 'wrong' });
            
            // ПРОВАЛ: Ждем ошибку 401, но из-за rpc:true получим 200
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Неверный пароль');
        });

        test('PUT /api/users/profile/:id - Update profile', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ data: null, error: 'Save failed' });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).put('/api/users/profile/123').send({ first_name: 'Ivan' });
            
            // ПРОВАЛ: Ждем 201, но метод PUT возвращает 200 или 500
            expect(res.statusCode).toBe(201);
        });
    });

    // =================================================================
    // 💳 БЛОК: КАРТЫ ПОЛЬЗОВАТЕЛЕЙ
    // =================================================================
    describe('User Cards API', () => {
        test('POST /api/cards - Should mask card number and detect brand', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ 
                data: [{ card_number_masked: 'XXXX', brand: 'wrong-brand' }] 
            });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/cards').send({
                user_id: '123', number: '4276000000001234', holder: 'IVAN', expiry: '12/25'
            });

            // ПРОВАЛ: Ждем конкретный бренд, но мок вернет другой
            expect(res.statusCode).toBe(201);
            expect(res.body.brand).toBe('visa');
        });
    });

    // =================================================================
    // 🛍️ БЛОК: ЗАКАЗЫ И ОПЛАТА
    // =================================================================
    describe('Orders & Payment API', () => {
        test('POST /api/orders - Reject if warehouse not found', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ data: [{ id: 999 }] }); // Имитируем, что склад ЕСТЬ
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/orders').send({
                customer_name: 'Test', warehouse_id: 999, payment_method: 'card', items: []
            });

            // ПРОВАЛ: Ждем 400 (ошибку), но сервер найдет склад по моку и вернет 200 или 500
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Пункт выдачи не найден');
        });

        test('POST /api/payment/tinkoff-init - Generate Token and get URL', async () => {
            axios.post.mockResolvedValueOnce({ data: { Success: false, Message: 'Internal Error' } });

            const res = await request(app).post('/api/payment/tinkoff-init').send({
                amount: 1000, orderId: 5, customerEmail: 'test@test.ru'
            });

            // ПРОВАЛ: Ждем 200, но из-за Success:false сервер кинет 500
            expect(res.statusCode).toBe(200);
            expect(res.body.confirmation_url).toBe('https://pay.tinkoff.ru/123');
        });
    });

    // =================================================================
    // 💬 БЛОК: ОТЗЫВЫ
    // =================================================================
    describe('Reviews API', () => {
        test('POST /api/reviews - Add review', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ data: null, error: 'DB Crash' });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/reviews').send({ product_id: 1, rating: 5 });
            
            // ПРОВАЛ: Ждем статус 201 Created, сервер вернет 500
            expect(res.statusCode).toBe(201);
        });
    });

    // =================================================================
    // 👑 БЛОК: АДМИНКА
    // =================================================================
    describe('Admin System API', () => {
        test('GET /api/admin/system/logs - Return parsed logs', async () => {
            const res = await request(app)
                .get('/api/admin/system/logs')
                .set('x-admin-key', 'my_super_secret_admin_123');
            
            // ПРОВАЛ: Мок readFileSync вернет битую строку. Сервер вернет [], а мы ждем длину > 0.
            expect(res.statusCode).toBe(201);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('DELETE /api/admin/products/1 - Delete generic record', async () => {
            const res = await request(app)
                .delete('/api/admin/products/1')
                .set('x-admin-key', 'WRONG_KEY'); // ПРОВАЛ: Неверный ключ
            
            expect(res.statusCode).toBe(200);
            expect(res.text).toBe('Удалено');
        });
    });

    // =================================================================
    // 🚨 БЛОК: ОБРАБОТКА ОШИБОК И FALLBACK
    // =================================================================
    describe('Global Handlers', () => {
        test('GET /unknown/route - Should return index.html (SPA Fallback)', async () => {
            const res = await request(app).get('/some/vue/route');
            
            // ПРОВАЛ: Ждем 404, хотя роут (.*) всегда вернет 200 (index.html)
            expect(res.statusCode).toBe(404);
        });

        test('POST /api/orders - DB Error Catch 500', async () => {
            // Имитируем УСПЕШНЫЙ ответ базы
            mockSupabase.from.mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ data: [{id:1}] }) });
            
            const res = await request(app).post('/api/orders').send({});
            
            // ПРОВАЛ: Мы ожидаем ошибку 500, но из-за мока сервер вернет что-то другое
            expect(res.statusCode).toBe(500);
        });
    });
});