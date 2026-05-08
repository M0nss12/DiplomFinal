require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const STORAGE_URL = `${process.env.SUPABASE_URL}/storage/v1/object/public`;

// 1. БРЕНДЫ (Фото 1)
const brandFiles = [
    { name: '70mai', img: '70mai.png', country: 'Китай' },
    { name: 'Bosch', img: 'Bosch.jpg', country: 'Германия' },
    { name: 'Brembo', img: 'Brembo.png', country: 'Италия' },
    { name: 'StarLine Alarm', img: 'CarAlarmStarLine.jpg', country: 'Россия' },
    { name: 'Castrol', img: 'Castrol.png', country: 'Великобритания' },
    { name: 'Continental', img: 'Continental.png', country: 'Германия' },
    { name: 'Denso', img: 'Denso.png', country: 'Япония' },
    { name: 'EVA', img: 'EVA.png', country: 'Россия' },
    { name: 'Exide', img: 'Exide.jpg', country: 'США' },
    { name: 'IGLA', img: 'IGLA.png', country: 'Россия' },
    { name: 'KYB', img: 'KYB.png', country: 'Япония' },
    { name: 'Leatherette', img: 'Leatherette.jpg', country: 'КНР' },
    { name: 'Liqui Moly', img: 'LiquiMoly.png', country: 'Германия' },
    { name: 'Mahle', img: 'Mahle.png', country: 'Германия' },
    { name: 'Michelin', img: 'Michelin.png', country: 'Франция' },
    { name: 'Mobil 1', img: 'Mobil1.png', country: 'США' },
    { name: 'Motul', img: 'Motul.png', country: 'Франция' },
    { name: 'NGK', img: 'NGK.png', country: 'Япония' },
    { name: 'Pioneer', img: 'Pioneer.png', country: 'Япония' },
    { name: 'Pirelli', img: 'Pirelli.png', country: 'Италия' },
    { name: 'Shell', img: 'Shell.png', country: 'Нидерланды' },
    { name: 'StarLine', img: 'StarLine.png', country: 'Россия' },
    { name: 'TRW', img: 'TRW.png', country: 'США' },
    { name: 'Varta', img: 'Varta.png', country: 'Германия' }
];

// 2. КАТЕГОРИИ (Фото 2)
const categoryFiles = [
    { name: 'Автоэлектроника', img: 'Autoelectronics.jpg', slug: 'autoelectronics' },
    { name: 'Автохимия и косметика', img: 'Automotivechemicalsandcare.jpg', slug: 'chemicals' },
    { name: 'Аккумуляторы', img: 'Batteries(battery).jpg', slug: 'batteries' },
    { name: 'Кузовные детали', img: 'Bodyparts.jpg', slug: 'bodyparts' },
    { name: 'Тормозная система', img: 'Brakesystem.jpg', slug: 'brakes' },
    { name: 'Система охлаждения', img: 'Coolingsystem.jpg', slug: 'cooling' },
    { name: 'Двигатель и ГРМ', img: 'Engineandtiming.jpg', slug: 'engine' },
    { name: 'Выхлопная система', img: 'Exhaustsystem.jpg', slug: 'exhaust' },
    { name: 'Фильтры', img: 'Filters.jpg', slug: 'filters' },
    { name: 'Топливная система', img: 'Fuelsystem.jpg', slug: 'fuel' },
    { name: 'Система зажигания', img: 'Ignitionsystem.jpg', slug: 'ignition' },
    { name: 'Салон и комфорт', img: 'Interiorandcomfort.jpg', slug: 'interior' },
    { name: 'Освещение', img: 'Lighting.jpg', slug: 'lighting' },
    { name: 'Масла и жидкости', img: 'Oilsandliquids.jpg', slug: 'oils' },
    { name: 'Системы безопасности', img: 'Securitysystems.jpg', slug: 'security' },
    { name: 'Рулевое управление', img: 'Steering.jpg', slug: 'steering' },
    { name: 'Подвеска', img: 'Suspension.jpg', slug: 'suspension' },
    { name: 'Шины и диски', img: 'Tiresandwheels.jpg', slug: 'tires' },
    { name: 'Инструменты', img: 'Tools.jpg', slug: 'tools' },
    { name: 'Трансмиссия', img: 'Transmission.jpg', slug: 'transmission' }
];

// 3. ТОВАРЫ (Фото 3 и 4)
const productData = [
    { img: 'AirFilterBosch.jpg', name: 'Фильтр воздушный', cat: 'filters', brand: 'Bosch' },
    { img: 'AntifreezeLiquiMoly.jpg', name: 'Антифриз концентрат', cat: 'oils', brand: 'Liqui Moly' },
    { img: 'BrakeDiscTRW.jpg', name: 'Диск тормозной вентилируемый', cat: 'brakes', brand: 'TRW' },
    { img: 'BrakePadsBrembo.jpg', name: 'Колодки тормозные к-кт', cat: 'brakes', brand: 'Brembo' },
    { img: 'CarBatteryVarta.jpg', name: 'Аккумулятор 60Ah', cat: 'batteries', brand: 'Varta' },
    { img: 'CarPolishLiquiMoly.jpg', name: 'Полироль кузова', cat: 'chemicals', brand: 'Liqui Moly' },
    { img: 'CarShampooLiquiMoly.jpg', name: 'Автошампунь с воском', cat: 'chemicals', brand: 'Liqui Moly' },
    { img: 'CatalyticConverterWalker.jpg', name: 'Катализатор Евро-4', cat: 'exhaust', brand: 'Bosch' },
    { img: 'ClutchKitSachs.jpg', name: 'Сцепление комплект', cat: 'transmission', brand: 'Bosch' },
    { img: 'ControlArmLemforder.jpg', name: 'Рычаг подвески', cat: 'suspension', brand: 'TRW' },
    { img: 'CVJointGKNLoebro.jpg', name: 'ШРУС наружный', cat: 'transmission', brand: 'TRW' },
    { img: 'DashCam70mai.jpg', name: 'Видеорегистратор Pro', cat: 'autoelectronics', brand: '70mai' },
    { img: 'EngineOilMobil1.jpg', name: 'Масло Mobil 1 5W-40', cat: 'oils', brand: 'Mobil 1' },
    { img: 'FloorMatsEVA.jpg', name: 'Коврики EVA 3D', cat: 'interior', brand: 'EVA' },
    { img: 'FuelPumpBosch.jpg', name: 'Насос топливный', cat: 'fuel', brand: 'Bosch' },
    { img: 'HeadlightBosch.jpg', name: 'Фара основная левая', cat: 'lighting', brand: 'Bosch' },
    { img: 'HeadUnitPioneer.jpg', name: 'Автомагнитола 2-DIN', cat: 'autoelectronics', brand: 'Pioneer' },
    { img: 'IgnitionCoilBosch.jpg', name: 'Катушка зажигания', cat: 'ignition', brand: 'Bosch' },
    { img: 'ImmobilizerIGLA.jpg', name: 'Иммобилайзер CAN', cat: 'security', brand: 'IGLA' },
    { img: 'InjectorDensoDiesel.jpg', name: 'Форсунка дизельная', cat: 'fuel', brand: 'Denso' },
    { img: 'MirrorwithheatingAlkar.jpg', name: 'Зеркало с подогревом', cat: 'bodyparts', brand: 'Bosch' },
    { img: 'MufflermainBosal.jpg', name: 'Глушитель основной', cat: 'exhaust', brand: 'Bosch' },
    { img: 'OilFilterMannFilter.jpg', name: 'Фильтр масляный', cat: 'filters', brand: 'Bosch' },
    { img: 'PistonRingsMahle.jpg', name: 'Кольца комплект', cat: 'engine', brand: 'Mahle' },
    { img: 'RadiatorDenso.jpg', name: 'Радиатор основной', cat: 'cooling', brand: 'Denso' },
    { img: 'SeatCoversLeatherette.jpg', name: 'Чехлы экокожа', cat: 'interior', brand: 'Leatherette' },
    { img: 'ShockAbsorberKYB.jpg', name: 'Стойка амортизатора', cat: 'suspension', brand: 'KYB' },
    { img: 'SocketSetToolKitBosch.jpg', name: 'Набор головок', cat: 'tools', brand: 'Bosch' },
    { img: 'SparkPlugNGK.jpg', name: 'Свеча зажигания', cat: 'ignition', brand: 'NGK' },
    { img: 'SteeringRackBosch.jpg', name: 'Рулевая рейка', cat: 'steering', brand: 'Bosch' },
    { img: 'ThermostatMahle.jpg', name: 'Термостат в сборе', cat: 'cooling', brand: 'Mahle' },
    { img: 'TieRodEndTRW.jpg', name: 'Рулевой наконечник', cat: 'steering', brand: 'TRW' },
    { img: 'TimingBeltKitBosch.jpg', name: 'Комплект ГРМ ролики', cat: 'engine', brand: 'Bosch' },
    { img: 'TiresMichelin.jpg', name: 'Шины Michelin 17"', cat: 'tires', brand: 'Michelin' },
    { img: 'TrolleyJackTRW.jpg', name: 'Домкрат 2т', cat: 'tools', brand: 'TRW' },
    { img: 'TruckBatteryExide.jpg', name: 'АКБ 190Ah', cat: 'batteries', brand: 'Exide' },
    { img: 'WheelContinental.jpg', name: 'Диск литой R16', cat: 'tires', brand: 'Continental' },
    { img: 'XenonBulbPhilips.jpg', name: 'Лампа ксенон D2S', cat: 'lighting', brand: 'Bosch' }
];

async function seed() {
    try {
        console.log('🧹 Очистка таблиц...');
        const tables = ['user_cards', 'wishlists', 'reviews', 'order_items', 'orders', 'product_stocks', 'products', 'categories', 'brands', 'users', 'warehouses'];
        for (const t of tables) {
            await supabase.from(t).delete().filter('id', 'not.eq', 'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz');
        }

        console.log('🛠️ Вставка базовых данных...');

        const { data: dbBrands } = await supabase.from('brands').insert(
            brandFiles.map(b => ({ name: b.name, logo_url: `${STORAGE_URL}/brands/${b.img}`, country: b.country, is_popular: true }))
        ).select();

        const { data: dbCats } = await supabase.from('categories').insert(
            categoryFiles.map(c => ({ name: c.name, slug: c.slug, image_url: `${STORAGE_URL}/categories/${c.img}` }))
        ).select();

        const { data: dbWarehouses } = await supabase.from('warehouses').insert(
            Array.from({ length: 30 }).map((_, i) => ({
                city_name: ['Москва', 'СПб', 'Краснодар'][i % 3],
                address: `пр-т Машиностроителей, д. ${i + 1}`,
                phone: `+7800000${String(i).padStart(4, '0')}`,
                is_pickup_point: true
            }))
        ).select();

        const { data: dbUsers } = await supabase.from('users').insert(
            Array.from({ length: 40 }).map((_, i) => ({
                id: `user_id_${i}`,
                role: i === 0 ? 'admin' : 'user',
                email: `auto_user_${i}@example.com`,
                phone_number: `+7900${1000000 + i}`,
                password_hash: 'admin123',
                first_name: `Имя_${i}`,
                last_name: `Фамилия_${i}`,
                otchestvo: `Отчество_${i}`,
                avatar_url: '/assets/images/avatars/1.png',
                saved_address: 'Домашний адрес пользователя',
                allows_data_saving: true
            }))
        ).select();

        // Проверка на случай если БД вернула пустые массивы
        if (!dbCats || !dbBrands) throw new Error("БД не вернула созданные категории или бренды");

        console.log('📦 Вставка товаров...');
        const productsToInsert = productData.map((p, i) => {
            const cat = dbCats.find(c => c.slug === p.cat);
            const brand = dbBrands.find(b => b.name === p.brand) || dbBrands[0];
            const price = 5000 + (i * 200);
            return {
                category_id: cat.id,
                brand_id: brand.id,
                sku: `SKU-${i + 2024}`,
                name: `${brand.name} ${p.name}`,
                description: `Оригинальный товар ${p.name}. Обеспечивает надежную работу вашего автомобиля.`,
                price: price,
                discount_price: price * 0.9,
                weight_kg: 2.3,
                warranty_months: 12,
                image_url: `${STORAGE_URL}/products/${p.img}`
            };
        });
        const { data: dbProducts } = await supabase.from('products').insert(productsToInsert).select();

        console.log('📊 Заполнение остатков и операций...');
        const stocks = dbProducts.map(p => ({
            product_id: p.id,
            warehouse_id: dbWarehouses[0].id,
            quantity: 25,
            shelf_location: 'Rack-10'
        }));
        await supabase.from('product_stocks').insert(stocks);

        for (let i = 0; i < 40; i++) {
            const user = dbUsers[i];
            const pr = dbProducts[i % dbProducts.length];
            const { data: ord } = await supabase.from('orders').insert({
                user_id: user.id, payment_method: 'card', payment_status: 'paid', delivery_type: 'pickup',
                delivery_status: 'delivered', total_price: pr.price, delivery_address: 'Адрес ПВЗ'
            }).select().single();
            await supabase.from('order_items').insert({ order_id: ord.id, product_id: pr.id, quantity: 1, unit_price: pr.price });
        }

        await supabase.from('reviews').insert(dbProducts.map((p, i) => ({
            product_id: p.id, user_id: dbUsers[i % 40].id, rating: 5, comment: 'Супер запчасть!', pros: 'Качество', cons: 'Нет', is_approved: true, images: [p.image_url]
        })));

        await supabase.from('user_cards').insert(dbUsers.slice(0, 30).map(u => ({
            user_id: u.id, card_number_masked: '**** **** **** 0000', card_holder: 'CUSTOMER', expiry_date: '01/28', brand: 'Mir', is_default: true
        })));

        console.log('✅ СИДИРОВАНИЕ ЗАВЕРШЕНО УСПЕШНО!');
    } catch (e) {
        console.error('💥 Ошибка:', e.message);
    }
}

seed();