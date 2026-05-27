// app.test.js

// 1. УСТАНОВКА ОКРУЖЕНИЯ ДЛЯ ТЕСТОВ (ДО загрузки сервера)
process.env.SUPABASE_URL = 'https://mocked.supabase.co';
process.env.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocked_key';
process.env.ADMIN_SECRET = 'my_super_secret_admin_123';
process.env.EMAIL_USER = 'test@apexdrive.ru';
process.env.BREVO_API_KEY = 'mock_brevo_key';

const request = require('supertest');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs');

// =================================================================
// 2. МОКИРОВАНИЕ ВНЕШНИХ МОДУЛЕЙ
// =================================================================

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    appendFile: jest.fn((path, data, cb) => cb(null)),
    writeFileSync: jest.fn(),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue('{"id":"1", "timestamp":"2026", "action":"POST", "message":"Test log"}\n')
}));

jest.mock('axios');

// Универсальный "хитрый" мок для Supabase
const mockSupabaseQuery = () => {
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        // Возврат одного объекта (для .single())
        single: jest.fn().mockImplementation(() => Promise.resolve({ 
            data: { 
                id: 1, 
                name: 'Mocked Product', 
                price: 1000, 
                quantity: 50, 
                cities: { id: 1, name: 'Москва', lat: 55, lon: 37 },
                customer_email: 'test@mail.ru',
                delivery_address: 'Москва, ул. Тестовая'
            }, 
            error: null 
        })),
        // Возврат объекта или null (для .maybeSingle())
        maybeSingle: jest.fn().mockImplementation(() => Promise.resolve({ 
            data: { id: 1, warehouse_id: 1, quantity: 50, status: 'pending' }, 
            error: null 
        })),
        // Имитация Promise-цепочки для обычных запросов (await supabase.from()...)
        then: jest.fn().mockImplementation((onFulfilled) => {
            return Promise.resolve({
                data: [{ id: 1, name: 'MockItem', shipping_cost: 350, product_id: 1, quantity: 1, warehouse_id: 1 }],
                error: null
            }).then(onFulfilled);
        })
    };
    return chain;
};

const mockSupabase = {
    from: jest.fn((table) => {
        const query = mockSupabaseQuery();
        // Специальная настройка для таблицы заказов в PATCH
        if (table === 'order_items') {
            query.then = jest.fn().mockImplementation((onFulfilled) => {
                return Promise.resolve({
                    data: [{ product_id: 1, quantity: 1, warehouse_id: 1 }],
                    error: null
                }).then(onFulfilled);
            });
        }
        return query;
    }),
    rpc: jest.fn().mockResolvedValue({ data: { total: 350 }, error: null }),
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

// Загружаем приложение
const app = require('./server');

// =================================================================
// 3. ТЕСТЫ (TEST SUITE)
// =================================================================

describe('🚀 ApexDrive FULL API Test Suite (Positive Testing)', () => {
    let server;

    beforeAll((done) => {
        // Запускаем сервер на свободном порту
        server = app.listen(0, () => done());
    });

    afterAll((done) => {
        // Закрываем сервер, чтобы тесты не висели
        server.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Успешные ответы по умолчанию для внешних API
        axios.post.mockResolvedValue({ data: { success: true } });
        axios.get.mockResolvedValue({ data: { success: true } });
    });

    // -----------------------------------------------------------------
    // 📁 БЛОК: УПРАВЛЕНИЕ ФАЙЛАМИ (STORAGE)
    // -----------------------------------------------------------------
    describe('Storage API', () => {
        test('POST /api/upload/:folder - Should upload file and return public URL', async () => {
            const res = await request(app)
                .post('/api/upload/avatars')
                .attach('file', Buffer.from('fake_image_data'), 'test.jpg'); 
            
            expect(res.statusCode).toBe(200);
            expect(res.body.url).toBe('http://mock-url.com/img.jpg');
            expect(mockSupabase.storage.from).toHaveBeenCalledWith('avatars');
        });

        test('DELETE /api/storage/:bucket/:filename - Should remove file (Admin)', async () => {
            const res = await request(app)
                .delete('/api/storage/avatars/test.jpg')
                .set('x-admin-key', process.env.ADMIN_SECRET);
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });

    // -----------------------------------------------------------------
    // 📢 БЛОК: ВНЕШНИЕ ИНТЕГРАЦИИ И МАРКЕТИНГ
    // -----------------------------------------------------------------
    describe('Marketing & Brevo API', () => {
        test('GET /api/marketing/currency - Should fetch and parse CBR data', async () => {
            axios.get.mockResolvedValueOnce({
                data: { Valute: { USD: { Value: 92.5 }, EUR: { Value: 100.1 }, CNY: { Value: 12.8 } } }
            });
            const res = await request(app).get('/api/marketing/currency');
            
            expect(res.statusCode).toBe(200);
            expect(res.body.usd).toBe('92.50');
            expect(res.body.eur).toBe('100.10');
        });

        test('GET /api/marketing/about-info - Should return store stats', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.then = jest.fn().mockImplementation((onFulfilled) => {
                return Promise.resolve({ data: [], count: 150, error: null }).then(onFulfilled);
            });
            mockSupabase.from.mockReturnValue(queryMock);

            const res = await request(app).get('/api/marketing/about-info');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('totalProducts');
            expect(res.body).toHaveProperty('totalBrands');
        });

        test('POST /api/feedback/send - Should send email via Brevo API', async () => {
            const res = await request(app).post('/api/feedback/send').send({
                name: 'Иван', contact: 'ivan@test.ru', message: 'Хороший магазин!'
            });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(axios.post).toHaveBeenCalledWith(
                'https://api.brevo.com/v3/smtp/email',
                expect.any(Object),
                expect.any(Object)
            );
        });
    });

    // -----------------------------------------------------------------
    // 🛒 БЛОК: КАТАЛОГ И ПОИСК
    // -----------------------------------------------------------------
    describe('Catalog API', () => {
        test('GET /api/categories - Should return categories list', async () => {
            const res = await request(app).get('/api/categories');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // ПРОВЕРКА ИСПРАВЛЕНА: Теперь res.body[0] определен
            expect(res.body[0].id).toBe(1); 
        });

        test('GET /api/global-search - Should return search results for valid query', async () => {
            const res = await request(app).get('/api/global-search?q=Bosch');
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('products');
            expect(res.body).toHaveProperty('categories');
        });

        test('POST /api/public/shipping-estimate - Should calculate shipping via RPC', async () => {
            mockSupabase.rpc.mockResolvedValueOnce({ data: { total: 450, details: [] }, error: null });
            
            const res = await request(app).post('/api/public/shipping-estimate').send({
                warehouse_id: 2, items: [{ product_id: 1, quantity: 2 }]
            });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.total).toBe(450);
        });
    });

    // -----------------------------------------------------------------
    // 👤 БЛОК: ПОЛЬЗОВАТЕЛИ И ПРОФИЛЬ
    // -----------------------------------------------------------------
    describe('Users API', () => {
        test('POST /api/users/login - Success login with correct password', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: 'user_123', first_name: 'Ivan' }, error: null });
            mockSupabase.from.mockReturnValueOnce(queryMock);
            mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null }); 

            const res = await request(app).post('/api/users/login').send({ 
                login: 'ivan@mail.ru', password: 'Password123!' 
            });
            
            expect(res.statusCode).toBe(200);
            expect(res.body.id).toBe('user_123');
        });

        test('PUT /api/users/profile/:id - Update profile successfully', async () => {
            const res = await request(app).put('/api/users/profile/user_123').send({ 
                first_name: 'Alexey' 
            });
            expect(res.statusCode).toBe(200);
            expect(mockSupabase.from).toHaveBeenCalledWith('users');
        });
    });

    // -----------------------------------------------------------------
    // 📦 БЛОК: ЗАКАЗЫ (СЛОЖНАЯ ЛОГИКА)
    // -----------------------------------------------------------------
    describe('Orders API', () => {
        test('POST /api/orders - Should create order, deduct stock and send email', async () => {
            const insertMock = mockSupabaseQuery();
            insertMock.select.mockResolvedValueOnce({ data: [{ id: 999 }], error: null });
            
            mockSupabase.from.mockImplementation((table) => {
                if (table === 'orders') return insertMock;
                return mockSupabaseQuery();
            });

            const res = await request(app).post('/api/orders').send({
                customer_name: 'Test Client',
                customer_email: 'test@mail.ru',
                customer_phone: '+79991234567',
                warehouse_id: 1,
                payment_method: 'card',
                items: [{ product_id: 100, quantity: 2 }]
            });

            expect(res.statusCode).toBe(200);
            expect(res.body.orderId).toBe(999);
        });

        test('PATCH /api/orders/:id - User can cancel order and restock items', async () => {
            const res = await request(app)
                .patch('/api/orders/999')
                .set('x-user-id', 'user_123') 
                .send({ delivery_status: 'cancelled' });

            expect(res.statusCode).toBe(200);
            expect(mockSupabase.from).toHaveBeenCalledWith('product_stocks'); 
        });
    });

    // -----------------------------------------------------------------
    // ↩️ БЛОК: ВОЗВРАТЫ
    // -----------------------------------------------------------------
    describe('Returns API', () => {
        test('POST /api/admin/return_requests - Admin can create a return request', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
            mockSupabase.from.mockReturnValue(queryMock);

            const res = await request(app)
                .post('/api/admin/return_requests')
                .set('x-admin-key', process.env.ADMIN_SECRET)
                .send({ order_id: 999, user_id: 'user_123', reason: 'Дефект' });

            expect(res.statusCode).toBe(200);
        });
    });

    // -----------------------------------------------------------------
    // 👑 БЛОК: АДМИНКА
    // -----------------------------------------------------------------
    describe('Admin System API', () => {
        test('GET /api/admin/system/logs - Return parsed logs from file', async () => {
            const res = await request(app)
                .get('/api/admin/system/logs?type=actions')
                .set('x-admin-key', process.env.ADMIN_SECRET);
            
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0); 
        });

        test('GET /api/admin/:table - Return formatted table data (users)', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('x-admin-key', process.env.ADMIN_SECRET);
            
            expect(res.statusCode).toBe(200);
            expect(mockSupabase.from).toHaveBeenCalledWith('users');
        });
    });

    // -----------------------------------------------------------------
    // 🚨 БЛОК: GLOBAL FALLBACK
    // -----------------------------------------------------------------
    describe('Global Fallback', () => {
        test('GET /unknown-vue-route - Should return 200 (SPA Fallback index.html)', async () => {
            const res = await request(app).get('/profile/orders/list');
            expect(res.statusCode).toBe(200);
            expect(res.headers['content-type']).toMatch(/html/);
        });
    });
});