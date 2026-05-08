const request = require('supertest');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');

// --- 1. МОКИРОВАНИЕ ---

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    appendFile: jest.fn((path, data, cb) => cb(null)),
    writeFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue('{"type":"ACTION"}\n{"type":"ERROR"}')
}));

jest.mock('axios');

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        verify: jest.fn((cb) => cb(null, true)),
        sendMail: jest.fn().mockResolvedValue(true)
    })
}));

// Универсальный "хитрый" мок для Supabase
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
        // По умолчанию возвращаем успешные данные
        single: jest.fn().mockResolvedValue({ data: { id: 1, name: 'Mocked', price: 100 }, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
        then: jest.fn(function (resolve) { resolve({ data: [], error: null }); })
    };
    return chain;
};

const mockSupabase = {
    from: jest.fn(() => mockSupabaseQuery()),
    rpc: jest.fn().mockResolvedValue({ data: true, error: null }),
    storage: {
        from: jest.fn(() => ({
            upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
            getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://mock-url.com/img.jpg' } }),
            remove: jest.fn().mockResolvedValue({ data: {}, error: null })
        }))
    }
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

const app = require('./server'); 

// --- 2. ТЕСТЫ ---

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
            expect(res.statusCode).toBe(200);
            expect(res.body.url).toBe('http://mock-url.com/img.jpg');
        });

        test('DELETE /api/storage/:folder/:filename - Should remove file (Admin)', async () => {
            const res = await request(app)
                .delete('/api/storage/avatars/test.jpg')
                .set('x-admin-key', 'my_super_secret_admin_123');
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
                data: { Valute: { USD: { Value: 92.5 }, EUR: { Value: 100.1 }, CNY: { Value: 12.8 } } }
            });
            const res = await request(app).get('/api/marketing/currency');
            expect(res.statusCode).toBe(200);
            expect(res.body.usd).toBe('92.50');
        });

        test('GET /api/marketing/news - Should return empty array if no API key', async () => {
            // Так как у нас в тестах нет реального NEWS_API_KEY, сервер вернет []
            const res = await request(app).get('/api/marketing/news');
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        test('POST /api/feedback/send - Should send email via Nodemailer', async () => {
            const res = await request(app).post('/api/feedback/send').send({
                name: 'Test', contact: '12345', message: 'Hello'
            });
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // =================================================================
    // 🛒 БЛОК: КАТАЛОГ И ПОИСК
    // =================================================================
    describe('Catalog API', () => {
        test('GET /api/categories - Should return list', async () => {
            const res = await request(app).get('/api/categories');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('GET /api/global-search - Should return empty if query < 2 chars', async () => {
            const res = await request(app).get('/api/global-search?q=a');
            expect(res.body.products).toEqual([]);
        });

        test('POST /api/products/recent - Should return products by IDs', async () => {
            const res = await request(app).post('/api/products/recent').send({ ids: [1, 2, 3] });
            expect(res.statusCode).toBe(200);
        });
    });

    // =================================================================
    // 👤 БЛОК: ПОЛЬЗОВАТЕЛИ
    // =================================================================
    describe('Users API', () => {
        test('POST /api/users/login - Success login', async () => {
            // Настраиваем мок именно для этого теста
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: '123' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);
            mockSupabase.rpc.mockResolvedValueOnce({ data: true });

            const res = await request(app).post('/api/users/login').send({ login: 'test', password: '123' });
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe('123');
        });

        test('POST /api/users/login - Wrong password', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: '123' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);
            mockSupabase.rpc.mockResolvedValueOnce({ data: false }); // Пароль неверный

            const res = await request(app).post('/api/users/login').send({ login: 'test', password: 'wrong' });
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Неверный пароль');
        });

        test('PUT /api/users/profile/:id - Update profile', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ data: [{ id: '123', first_name: 'Ivan' }] });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).put('/api/users/profile/123').send({ first_name: 'Ivan' });
            expect(res.statusCode).toBe(200);
        });
    });

    // =================================================================
    // 💳 БЛОК: КАРТЫ ПОЛЬЗОВАТЕЛЕЙ
    // =================================================================
    describe('User Cards API', () => {
        test('POST /api/cards - Should mask card number and detect brand', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ 
                data: [{ card_number_masked: '**** **** **** 1234', brand: 'visa' }] 
            });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/cards').send({
                user_id: '123', number: '4276000000001234', holder: 'IVAN', expiry: '12/25'
            });

            expect(res.statusCode).toBe(200);
            expect(res.body.brand).toBe('visa');
        });
    });

    // =================================================================
    // 🛍️ БЛОК: ЗАКАЗЫ И ОПЛАТА
    // =================================================================
    describe('Orders & Payment API', () => {
        test('POST /api/orders - Reject if warehouse not found', async () => {
            // Если мы не передаем правильный warehouse_id, сервер должен вернуть 400
            const queryMock = mockSupabaseQuery();
            queryMock.select.mockResolvedValueOnce({ data: [] }); // Нет складов
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/orders').send({
                customer_name: 'Test', warehouse_id: 999, payment_method: 'card', items: []
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Пункт выдачи не найден');
        });

        test('POST /api/payment/tinkoff-init - Generate Token and get URL', async () => {
            axios.post.mockResolvedValueOnce({ data: { Success: true, PaymentURL: 'https://pay.tinkoff.ru/123' } });

            const res = await request(app).post('/api/payment/tinkoff-init').send({
                amount: 1000, orderId: 5, customerEmail: 'test@test.ru'
            });

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
            queryMock.select.mockResolvedValueOnce({ data: [{ id: 1, rating: 5 }] });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/reviews').send({ product_id: 1, rating: 5 });
            expect(res.statusCode).toBe(200);
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
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });

        test('DELETE /api/admin/products/1 - Delete generic record', async () => {
            const res = await request(app)
                .delete('/api/admin/products/1')
                .set('x-admin-key', 'my_super_secret_admin_123');
            expect(res.text).toBe('Удалено');
        });
    });

    // =================================================================
    // 🚨 БЛОК: ОБРАБОТКА ОШИБОК И FALLBACK
    // =================================================================
    describe('Global Handlers', () => {
        test('GET /unknown/route - Should return index.html (SPA Fallback)', async () => {
            const res = await request(app).get('/some/vue/route');
            expect(res.statusCode).toBe(200);
        });

        test('POST /api/orders - DB Error Catch 500', async () => {
            // Ломаем БД
            mockSupabase.from.mockImplementationOnce(() => {
                throw new Error('Fatal DB Error');
            });
            
            const res = await request(app).post('/api/orders').send({});
            expect(res.statusCode).toBe(500);
        });
    });
});