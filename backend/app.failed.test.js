// server.negative.test.js

// Устанавливаем фиктивные переменные окружения
process.env.SUPABASE_URL = 'https://mocked.supabase.co';
process.env.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mocked_service_key';
process.env.ADMIN_SECRET = 'my_super_secret_admin_123';
process.env.EMAIL_USER = 'test@yandex.ru';
process.env.BREVO_API_KEY = 'mock_brevo_key';
process.env.YANDEX_API_KEY = 'mock_captcha_key';

const request = require('supertest');
const axios = require('axios');
const fs = require('fs');
const https = require('https');

// =================================================================
// 1. НАСТРОЙКА МОКОВ (Имитация сломанных систем)
// =================================================================

// Мокаем файловую систему
jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
    appendFile: jest.fn((path, data, cb) => cb(null)),
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn().mockImplementation(() => {
        throw new Error('File read error'); // Имитируем ошибку чтения логов
    })
}));

// Мокаем Axios (Brevo и прочее всегда "падают")
jest.mock('axios');

// Гибкий мок Supabase (по умолчанию настроен на возврат пустых данных или ошибок)
const mockSupabaseQuery = () => {
    const chain = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        // По умолчанию имитируем, что запись не найдена
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: jest.fn(function (resolve) { resolve({ data: null, error: { message: 'DB Error' } }); })
    };
    return chain;
};

const mockSupabase = {
    from: jest.fn(() => mockSupabaseQuery()),
    rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'RPC Error' } }),
    storage: {
        from: jest.fn(() => ({
            // Имитируем падение хранилища
            upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'Storage is full' } }),
            remove: jest.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } })
        }))
    }
};

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => mockSupabase)
}));

// Имитируем провал проверки Яндекс.Капчи
jest.mock('https', () => ({
    request: jest.fn((options, cb) => {
        const res = {
            on: jest.fn((event, handler) => {
                if (event === 'data') handler('{"status":"failed"}'); // Капча не пройдена
                if (event === 'end') handler();
            }),
            statusCode: 200
        };
        cb(res);
        return { on: jest.fn(), end: jest.fn() };
    })
}));

const app = require('./server');

// =================================================================
// 2. НАБОР ТЕСТОВ (NEGATIVE TESTING)
// =================================================================

describe('🛑 ApexDrive FULL API Test Suite (Negative Testing)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // -----------------------------------------------------------------
    // 🔐 БЛОК: БЕЗОПАСНОСТЬ И АВТОРИЗАЦИЯ
    // -----------------------------------------------------------------
    describe('Security & Admin Access', () => {
        test('GET /api/admin/users - Should return 403 (Forbidden) without Admin Key', async () => {
            const res = await request(app).get('/api/admin/users');
            // Сервер должен заблокировать доступ
            expect(res.statusCode).toBe(403);
            expect(res.body.error).toBe('Доступ запрещен.');
        });

        test('GET /api/admin/users - Should return 403 with wrong Admin Key', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('x-admin-key', 'hacker_key_123');
            
            expect(res.statusCode).toBe(403);
        });

        test('PATCH /api/orders/:id - Should return 401 without x-user-id header', async () => {
            const res = await request(app).patch('/api/orders/1').send({ delivery_status: 'cancelled' });
            // Без заголовка авторизации пользователь не может отменить заказ
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Требуется авторизация');
        });
    });

    // -----------------------------------------------------------------
    // 👤 БЛОК: ПОЛЬЗОВАТЕЛИ (ОШИБКИ ВВОДА)
    // -----------------------------------------------------------------
    describe('Users API', () => {
        test('POST /api/users/login - Should return 401 if user not found', async () => {
            // База вернет null (пользователь не найден)
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: null });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/users/login').send({ login: 'ghost@mail.ru', password: '123' });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Пользователь не найден');
        });

        test('POST /api/users/login - Should return 401 for wrong password', async () => {
            // Пользователь найден, но функция verify_user_password возвращает false
            const queryMock = mockSupabaseQuery();
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: 'user_1' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);
            mockSupabase.rpc.mockResolvedValueOnce({ data: false }); // Пароль не совпал

            const res = await request(app).post('/api/users/login').send({ login: 'admin@mail.ru', password: 'wrong' });
            
            expect(res.statusCode).toBe(401);
            expect(res.body.error).toBe('Неверный пароль');
        });

        test('POST /api/users/register - Should return 400 if Captcha fails', async () => {
            const res = await request(app).post('/api/users/register').send({ 
                email: 'bot@mail.ru', password: '123', captchaToken: 'bad_token' 
            });
            // Https мок настроен на возврат status: "failed"
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Проверка на робота не пройдена');
        });
    });

    // -----------------------------------------------------------------
    // 📦 БЛОК: ЗАКАЗЫ И ОСТАТКИ (БИЗНЕС-ЛОГИКА)
    // -----------------------------------------------------------------
    describe('Orders API', () => {
        test('POST /api/orders - Should return 400 if Warehouse not found', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).post('/api/orders').send({
                warehouse_id: 9999, items: []
            });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Склад не найден');
        });

        test('POST /api/orders - Should return 409 if insufficient stock', async () => {
            // 1. Склад найден
            // 2. Доставка посчитана
            // 3. Товар найден
            // 4. Склады в городе найдены
            // 5. Остаток найден, но quantity меньше, чем просит клиент!
            
            mockSupabase.rpc.mockResolvedValueOnce({ data: { total: 0 }, error: null });
            
            const insertMock = mockSupabaseQuery();
            mockSupabase.from.mockImplementation((table) => {
                const chain = mockSupabaseQuery();
                if (table === 'warehouses') chain.single.mockResolvedValue({ data: { cities: { id: 1 } } });
                if (table === 'products') chain.single.mockResolvedValue({ data: { price: 1000 } });
                if (table === 'product_stocks') {
                    // Имитируем, что на складе 0 штук
                    chain.maybeSingle.mockResolvedValue({ data: { warehouse_id: 1 } });
                    chain.single.mockResolvedValue({ data: { quantity: 0 } }); 
                }
                return chain;
            });

            const res = await request(app).post('/api/orders').send({
                warehouse_id: 1, items: [{ product_id: 5, quantity: 2 }]
            });

            // Ожидаем конфликт (Conflict), так как товара не хватает
            expect(res.statusCode).toBe(409);
            expect(res.body.error).toMatch(/Недостаточно остатков/);
        });

        test('PATCH /api/orders/:id - Should return 400 if trying to cancel delivered order', async () => {
            const queryMock = mockSupabaseQuery();
            // Имитируем, что заказ УЖЕ доставлен
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: 1, delivery_status: 'delivered' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app)
                .patch('/api/orders/1')
                .set('x-user-id', 'user_123')
                .send({ delivery_status: 'cancelled' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Невозможно отменить данный заказ');
        });
    });

    // -----------------------------------------------------------------
    // ↩️ БЛОК: ВОЗВРАТЫ
    // -----------------------------------------------------------------
    describe('Returns API', () => {
        test('POST /api/orders/:id/return - Should return 400 if order is NOT delivered', async () => {
            const queryMock = mockSupabaseQuery();
            // Заказ еще в пути (shipping)
            queryMock.single.mockResolvedValueOnce({ data: { id: 1, delivery_status: 'shipping', payment_status: 'paid' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app)
                .post('/api/orders/1/return')
                .set('x-user-id', 'user_123')
                .send({ reason: 'Брак детали' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Возврат возможен только для оплаченных и полученных заказов');
        });

        test('POST /api/orders/:id/return - Should return 400 if return request already exists', async () => {
            const queryMock = mockSupabaseQuery();
            // Заказ выдан
            queryMock.single.mockResolvedValueOnce({ data: { id: 1, delivery_status: 'delivered', payment_status: 'paid' } });
            // Но заявка на возврат УЖЕ ЕСТЬ
            queryMock.maybeSingle.mockResolvedValueOnce({ data: { id: 10 } });
            mockSupabase.from.mockReturnValue(queryMock);

            const res = await request(app)
                .post('/api/orders/1/return')
                .set('x-user-id', 'user_123')
                .send({ reason: 'Не подошло' });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Заявка на возврат уже подана');
        });
    });

    // -----------------------------------------------------------------
    // 📁 БЛОК: УПРАВЛЕНИЕ ФАЙЛАМИ И ВНЕШНИЕ API
    // -----------------------------------------------------------------
    describe('Storage & External API', () => {
        test('POST /api/upload/:folder - Should return 500 if Supabase storage fails', async () => {
            const res = await request(app)
                .post('/api/upload/avatars')
                .attach('file', Buffer.from('fake'), 'test.jpg'); 
            
            // Наш мок storage возвращает ошибку
            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Storage is full');
        });

        test('POST /api/feedback/send - Should return 500 if Brevo API is down', async () => {
            // Имитируем падение сервиса Brevo
            axios.post.mockRejectedValueOnce(new Error('Brevo Network Error'));

            const res = await request(app).post('/api/feedback/send').send({
                name: 'Test', contact: '123', message: 'Hello'
            });

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Не удалось отправить сообщение. Попробуйте позже.');
        });
    });

    // -----------------------------------------------------------------
    // 💥 БЛОК: КРАШ-ТЕСТЫ БАЗЫ ДАННЫХ
    // -----------------------------------------------------------------
    describe('Database Crash Handling', () => {
        test('GET /api/categories - Should catch DB error and return 500', async () => {
            // Насильно заставляем Supabase выкинуть ошибку при вызове .then()
            const queryMock = mockSupabaseQuery();
            queryMock.then = jest.fn((resolve) => resolve({ data: null, error: { message: 'Database disconnected' } }));
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).get('/api/categories');
            
            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Database disconnected');
        });

        test('GET /api/products/:id - Should return 404 if product not found', async () => {
            const queryMock = mockSupabaseQuery();
            queryMock.single.mockResolvedValueOnce({ data: null, error: { message: 'Row not found' } });
            mockSupabase.from.mockReturnValueOnce(queryMock);

            const res = await request(app).get('/api/products/999');
            
            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Товар не найден');
        });
    });
});