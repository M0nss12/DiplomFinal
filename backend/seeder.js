// seeder.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ОШИБКА: SUPABASE_URL и SUPABASE_KEY должны быть в .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
});

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randEl = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Надежный генератор slug
const slugify = (text) => text.toLowerCase().replace(/[^a-zа-яё0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

async function insertInBatches(table, records, chunkSize = 5, delayMs = 500, retries = 3, selectCols = 'id') {
  const results = [];
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    let lastError;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase.from(table).insert(chunk).select(selectCols);
        if (error) throw error;
        results.push(...(data || []));
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (err?.code === '23505') {
          console.warn(`⚠️ Конфликт уникальности в ${table}, пропускаем.`);
          lastError = null; break;
        }
        const wait = delayMs * attempt;
        await new Promise(res => setTimeout(res, wait));
      }
    }
    if (lastError) throw lastError;
  }
  return results;
}

async function clearDatabase() {
  const tables = [
    'return_requests', 'reviews', 'wishlists', 'order_status_history', 'order_items', 'orders',
    'product_stocks', 'products', 'category_attributes', 'brands', 'categories', 'notifications',
    'password_reset_tokens', 'user_vehicles', 'warehouses', 'cities'
  ];
  for (const table of tables) {
    console.log(`🧹 Очистка таблицы: ${table}...`);
    await supabase.from(table).delete().not('id', 'is', null);
  }
  console.log('✅ База данных очищена.\n');
}

const BASE_URL = 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public';
const PRODUCTS_BUCKET = `${BASE_URL}/products`;
const CATEGORIES_BUCKET = `${BASE_URL}/categories`;
const BRANDS_BUCKET = `${BASE_URL}/brands`;
const PLACEHOLDER_IMG = 'https://placehold.co/600x600/2c3e50/ffffff?text=ApexDrive+AutoPart';

async function seed() {
  console.log('🌱 Начинаем посев данных (Seeding)...\n');
  await clearDatabase();

  // ==========================================
  // 1. ГОРОДА И СКЛАДЫ (30 городов, по 2 ПВЗ в каждом)
  // ==========================================
  const citiesData = [
    { name: 'Москва', region: 'Московская область', lat: 55.7558, lon: 37.6173 },
    { name: 'Санкт-Петербург', region: 'Ленинградская область', lat: 59.9343, lon: 30.3351 },
    { name: 'Новосибирск', region: 'Новосибирская область', lat: 55.0084, lon: 82.9357 },
    { name: 'Екатеринбург', region: 'Свердловская область', lat: 56.8389, lon: 60.6057 },
    { name: 'Казань', region: 'Республика Татарстан', lat: 55.7961, lon: 49.1064 },
    { name: 'Нижний Новгород', region: 'Нижегородская область', lat: 56.2965, lon: 43.9361 },
    { name: 'Челябинск', region: 'Челябинская область', lat: 55.1644, lon: 61.4368 },
    { name: 'Самара', region: 'Самарская область', lat: 53.1959, lon: 50.1002 },
    { name: 'Омск', region: 'Омская область', lat: 54.9833, lon: 73.3667 },
    { name: 'Ростов-на-Дону', region: 'Ростовская область', lat: 47.2357, lon: 39.7015 },
    { name: 'Уфа', region: 'Республика Башкортостан', lat: 54.7348, lon: 55.9578 },
    { name: 'Красноярск', region: 'Красноярский край', lat: 56.0153, lon: 92.8932 },
    { name: 'Воронеж', region: 'Воронежская область', lat: 51.6606, lon: 39.2003 },
    { name: 'Пермь', region: 'Пермский край', lat: 58.0103, lon: 56.2294 },
    { name: 'Волгоград', region: 'Волгоградская область', lat: 48.7080, lon: 44.5133 },
    { name: 'Краснодар', region: 'Краснодарский край', lat: 45.0355, lon: 38.9753 },
    { name: 'Саратов', region: 'Саратовская область', lat: 51.5336, lon: 46.0343 },
    { name: 'Тюмень', region: 'Тюменская область', lat: 57.1522, lon: 65.5272 },
    { name: 'Тольятти', region: 'Самарская область', lat: 53.5303, lon: 49.3461 },
    { name: 'Ижевск', region: 'Удмуртская Республика', lat: 56.8498, lon: 53.2045 },
    { name: 'Барнаул', region: 'Алтайский край', lat: 53.3476, lon: 83.7795 },
    { name: 'Ульяновск', region: 'Ульяновская область', lat: 54.3142, lon: 48.4031 },
    { name: 'Иркутск', region: 'Иркутская область', lat: 52.2869, lon: 104.2804 },
    { name: 'Хабаровск', region: 'Хабаровский край', lat: 48.4802, lon: 135.0776 },
    { name: 'Ярославль', region: 'Ярославская область', lat: 57.6261, lon: 39.8845 },
    { name: 'Владивосток', region: 'Приморский край', lat: 43.1155, lon: 131.8855 },
    { name: 'Махачкала', region: 'Республика Дагестан', lat: 42.9849, lon: 47.5046 },
    { name: 'Томск', region: 'Томская область', lat: 56.4977, lon: 84.9744 },
    { name: 'Оренбург', region: 'Оренбургская область', lat: 51.7677, lon: 55.0979 },
    { name: 'Кемерово', region: 'Кемеровская область', lat: 55.3549, lon: 86.0896 }
  ];
  const cityIds = (await insertInBatches('cities', citiesData, 5, 0, 3)).map(c => c.id);
  console.log(`✅ Добавлено городов: ${cityIds.length}`);

  const warehousesData = [];
  cityIds.forEach((cid, index) => {
    // Первый склад/ПВЗ в городе
    warehousesData.push({
      city_id: cid,
      address: `ул. Центральная, д. ${10 + index}`,
      phone: `+7-900-100-${String(index).padStart(2, '0')}-01`,
      working_hours: '09:00 - 21:00 Без выходных',
      is_pickup_point: true,
    });
    // Второй склад/ПВЗ в городе
    warehousesData.push({
      city_id: cid,
      address: `проспект Мира, д. ${50 + index}`,
      phone: `+7-900-200-${String(index).padStart(2, '0')}-02`,
      working_hours: '10:00 - 20:00',
      is_pickup_point: true,
    });
  });
  
  const warehouseIds = (await insertInBatches('warehouses', warehousesData, 10, 0, 3)).map(w => w.id);
  console.log(`✅ Добавлено складов и ПВЗ: ${warehouseIds.length}`);

  // ==========================================
  // 2. ПОЛЬЗОВАТЕЛИ И ТРАНСПОРТ
  // ==========================================
  const { data: currentUsers } = await supabase.from('users').select('id, email, phone_number');
  const existingEmails = new Set((currentUsers || []).map(u => u.email));
  const existingPhones = new Set((currentUsers || []).map(u => u.phone_number));

  const firstNames = ['Алексей','Иван','Елена','Дмитрий','Ольга','Сергей','Анна','Михаил','Екатерина','Павел','Мария','Андрей','Наталья','Максим','Дарья','Роман'];
  const lastNames = ['Смирнов','Иванов','Попова','Соколов','Кузнецова','Новиков','Морозова','Волков','Лебедева','Козлов','Новикова','Степанов','Ильина','Макаров','Орлова','Захаров'];
  const patronymics = ['Иванович','Алексеевна','Сергеевич','Павлович','Дмитриевна','Александрович','Николаевна','Михайлович','Владимировна','Андреевич','Петровна','Максимович','Игоревна','Романович','Васильевна','Викторович'];

  const usersToInsert = [];
  for (let i = 0; i < 16; i++) {
    const isAd = (i === 0);
    const email = isAd ? 'admin@apexdrive.ru' : `user${i}@mail.ru`;
    const phone = `+7-999-111-22-${String(i).padStart(2, '0')}`;

    if (!existingEmails.has(email) && !existingPhones.has(phone)) {
      usersToInsert.push({
        id: crypto.randomUUID(),
        role: isAd ? 'admin' : 'user',
        email: email,
        phone_number: phone,
        password_hash: isAd ? 'Admin123!' : 'User123!', 
        first_name: firstNames[i],
        last_name: lastNames[i],
        otchestvo: patronymics[i],
        avatar_url: `${BASE_URL}/avatars/${(i % 3) + 1}.png`,
        is_email_verified: true,
        saved_city_id: cityIds[i % cityIds.length],
        allows_data_saving: true,
        cart: [], compare_list: []
      });
    }
  }

  if (usersToInsert.length > 0) {
    await insertInBatches('users', usersToInsert, 5, 0, 3, 'id');
  }

  const { data: allUsers } = await supabase.from('users').select('id').limit(50);
  const userIds = allUsers.map(u => u.id);
  console.log(`✅ Пользователи готовы (Всего в базе: ${userIds.length}).`);

  const vehiclesData = userIds.map((uid, i) => ({
    user_id: uid,
    brand: ['Toyota', 'BMW', 'Kia', 'Hyundai', 'Volkswagen', 'Renault', 'Skoda', 'Nissan'][i % 8],
    model: ['Camry', 'X5', 'Rio', 'Solaris', 'Polo', 'Logan', 'Octavia', 'Qashqai'][i % 8],
    year: rand(2010, 2023),
    vin: `XTA21000000${String(i).padStart(5, '0')}`,
    engine_volume: [1.4, 1.6, 2.0, 2.5, 3.0][i % 5],
    is_primary: true
  }));
  await insertInBatches('user_vehicles', vehiclesData, 5, 0, 3);
  console.log('✅ Автомобили пользователей добавлены.');

  // ==========================================
  // 3. БРЕНДЫ
  // ==========================================
  const brandImages = [
    '70mai.png', 'Bosch.jpg', 'Brembo.png', 'CarAlarmStarLine.jpg', 'Castrol.png', 'Continental.png', 
    'Denso.png', 'EVA.png', 'Exide.jpg', 'IGLA.png', 'KYB.png', 'Leatherette.jpg', 'LiquiMoly.png', 
    'Mahle.png', 'Michelin.png', 'Mobil1.png', 'Motul.png', 'NGK.png', 'Pioneer.png', 'Pirelli.png', 
    'Shell.png', 'StarLine.png', 'TRW.png', 'Varta.png'
  ];
  
  const brandsData = brandImages.map(img => {
    let name = img.split('.')[0];
    if (name === 'CarAlarmStarLine') name = 'StarLine Security';
    return {
      name: name,
      logo_url: `${BRANDS_BUCKET}/${img}`,
      country: randEl(['Германия', 'Япония', 'США', 'Россия', 'Китай', 'Италия']),
      is_popular: rand(0, 1) === 1
    };
  });
  const insertedBrands = await insertInBatches('brands', brandsData, 5, 0, 3, 'id, name');
  const bMap = {}; insertedBrands.forEach(b => bMap[b.name] = b.id);
  console.log('✅ Бренды добавлены.');

  // ==========================================
  // 4. КАТЕГОРИИ
  // ==========================================
  const rootCats = [
    { name: 'Автоэлектроника', file: 'Autoelectronics.jpg', subs: ['Видеорегистраторы', 'Магнитолы'] },
    { name: 'Автомобильные химия и уход', file: 'Automotivechemicalsandcare.jpg', subs: ['Шампуни', 'Полироли'] },
    { name: 'Батареи (АКБ)', file: 'Batteries(battery).jpg', subs: ['Легковые АКБ', 'Грузовые АКБ'] },
    { name: 'Кузовные части', file: 'Bodyparts.jpg', subs: ['Зеркала', 'Пороги'] },
    { name: 'Тормозная система', file: 'Brakesystem.jpg', subs: ['Колодки', 'Тормозные диски'] },
    { name: 'Система охлаждения', file: 'Coolingsystem.jpg', subs: ['Радиаторы', 'Термостаты'] },
    { name: 'Двигатель и ГРМ', file: 'Engineandtiming.jpg', subs: ['Кольца поршневые', 'Комплекты ГРМ'] },
    { name: 'Выхлопная система', file: 'Exhaustsystem.jpg', subs: ['Глушители', 'Катализаторы'] },
    { name: 'Фильтры', file: 'Filters.jpg', subs: ['Воздушные', 'Масляные'] },
    { name: 'Топливная система', file: 'Fuelsystem.jpg', subs: ['Насосы', 'Форсунки'] },
    { name: 'Система зажигания', file: 'Ignitionsystem.jpg', subs: ['Свечи', 'Катушки'] },
    { name: 'Интерьер и комфорт', file: 'Interiorandcomfort.jpg', subs: ['Коврики', 'Чехлы'] },
    { name: 'Освещение', file: 'Lighting.jpg', subs: ['Фары', 'Лампы'] },
    { name: 'Масла и жидкости', file: 'Oilsandliquids.jpg', subs: ['Моторные масла', 'Антифризы'] },
    { name: 'Системы безопасности', file: 'Securitysystems.jpg', subs: ['Иммобилайзеры', 'Сигнализации'] },
    { name: 'Рулевое управление', file: 'Steering.jpg', subs: ['Рейки', 'Тяги'] },
    { name: 'Подвеска', file: 'Suspension.jpg', subs: ['Амортизаторы', 'Рычаги'] },
    { name: 'Шины и диски', file: 'Tiresandwheels.jpg', subs: ['Шины', 'Колесные диски'] },
    { name: 'Инструменты', file: 'Tools.jpg', subs: ['Домкраты', 'Наборы ключей'] },
    { name: 'Трансмиссия', file: 'Transmission.jpg', subs: ['Сцепление', 'ШРУСы'] }
  ];

  const parentInserts = rootCats.map(c => ({
    parent_id: null, name: c.name, slug: slugify(c.name), image_url: `${CATEGORIES_BUCKET}/${c.file}`
  }));
  const parentIds = await insertInBatches('categories', parentInserts, 5, 0, 3, 'id, name, image_url');
  
  const subInserts = [];
  rootCats.forEach((root) => {
    const parent = parentIds.find(p => p.name === root.name);
    root.subs.forEach(sub => {
      subInserts.push({
        parent_id: parent.id, name: sub, slug: slugify(sub), image_url: parent.image_url
      });
    });
  });
  const subcats = await insertInBatches('categories', subInserts, 5, 0, 3, 'id, name');
  const sMap = {}; subcats.forEach(s => sMap[s.name] = s.id);
  console.log('✅ Категории и подкатегории добавлены.');

  const attrInserts = parentIds.map(p => [
    { category_id: p.id, code: 'brand_type', label: 'Тип детали', type: 'checkbox', is_filterable: true, options_json: JSON.stringify(['Оригинал', 'Аналог']), unit: '' },
    { category_id: p.id, code: 'warranty_m', label: 'Гарантия (мес)', type: 'range', is_filterable: true, options_json: '[]', unit: 'мес.' }
  ]).flat();
  await insertInBatches('category_attributes', attrInserts, 10, 0, 3);

  // ==========================================
  // 5. ТОВАРЫ (Ровно 80 штук)
  // ==========================================
  const primaryProducts = [
    { sub: 'Видеорегистраторы', name: 'Видеорегистратор 70mai Dash Cam', brand: '70mai', img: 'DashCam70mai.jpg', price: 5490, chars: { 'Разрешение': '4K UHD', 'Угол обзора': '140°', 'Матрица': 'Sony IMX415' } },
    { sub: 'Магнитолы', name: 'Магнитола Pioneer MVH', brand: 'Pioneer', img: 'HeadUnitPioneer.jpg', price: 4200, chars: { 'Типоразмер': '1 DIN', 'Мощность': '4x50 Вт', 'Bluetooth': 'Есть' } },
    { sub: 'Шампуни', name: 'Автошампунь Liqui Moly', brand: 'LiquiMoly', img: 'CarShampooLiqui Moly.jpg', price: 850, chars: { 'Объем': '1 л', 'Свойства': 'С воском', 'Концентрат': 'Да' } },
    { sub: 'Полироли', name: 'Полироль Liqui Moly', brand: 'LiquiMoly', img: 'CarPolishLiquiMoly.jpg', price: 1100, chars: { 'Объем': '250 мл', 'Тип': 'Абразивная', 'Назначение': 'Удаление царапин' } },
    { sub: 'Легковые АКБ', name: 'АКБ Varta Blue Dynamic', brand: 'Varta', img: 'CarBatteryVarta.jpg', price: 7500, chars: { 'Емкость': '60 Ач', 'Пусковой ток': '540 А', 'Полярность': 'Обратная' } },
    { sub: 'Грузовые АКБ', name: 'АКБ Exide Heavy', brand: 'Exide', img: 'TruckBatteryExide.jpg', price: 14200, chars: { 'Емкость': '190 Ач', 'Пусковой ток': '1150 А', 'Полярность': 'Прямая' } },
    { sub: 'Зеркала', name: 'Зеркало Alkar с подогревом', brand: 'Leatherette', img: 'MirrorwithheatingAlkar.jpg', price: 2100, chars: { 'Сторона': 'Левая', 'Подогрев': 'Да', 'Регулировка': 'Электро' } },
    { sub: 'Пороги', name: 'Накладка порога EVA', brand: 'EVA', img: 'CAT:Bodyparts.jpg', price: 1500, chars: { 'Материал': 'Пластик', 'Цвет': 'Черный', 'Установка': 'Клейкая лента' } }, 
    { sub: 'Колодки', name: 'Тормозные колодки Brembo', brand: 'Brembo', img: 'BrakePadsBrembo.jpg', price: 3400, chars: { 'Ось': 'Передняя', 'Датчик износа': 'Есть', 'Материал': 'Керамика' } },
    { sub: 'Тормозные диски', name: 'Тормозной диск TRW', brand: 'TRW', img: 'BrakeDiscTRW.jpg', price: 4100, chars: { 'Ось': 'Передняя', 'Тип': 'Вентилируемый', 'Диаметр': '280 мм' } },
    { sub: 'Радиаторы', name: 'Радиатор охлаждения Denso', brand: 'Denso', img: 'RadiatorDenso.jpg', price: 9600, chars: { 'Материал': 'Алюминий', 'Трансмиссия': 'МКПП/АКПП', 'Размер': '600x400 мм' } },
    { sub: 'Термостаты', name: 'Термостат Mahle', brand: 'Mahle', img: 'ThermostatMahle.jpg', price: 1800, chars: { 'Температура открытия': '87 °C', 'Прокладка': 'В комплекте', 'Корпус': 'Металл' } },
    { sub: 'Кольца поршневые', name: 'Поршневые кольца Mahle', brand: 'Mahle', img: 'PistonRingsMahle.jpg', price: 4500, chars: { 'Диаметр': '82.5 мм', 'Ремонтный размер': 'STD', 'Комплект': 'На 4 цилиндра' } },
    { sub: 'Комплекты ГРМ', name: 'Комплект ГРМ Bosch', brand: 'Bosch', img: 'TimingBeltKitBosch.jpg', price: 6800, chars: { 'Число зубьев': '137', 'Ширина': '25 мм', 'Ролики в комплекте': '2 шт' } },
    { sub: 'Глушители', name: 'Глушитель Bosal', brand: 'Bosch', img: 'MufflermainBosal.jpg', price: 5300, chars: { 'Материал': 'Алюминизированная сталь', 'Форма': 'Овальная', 'Звук': 'Стандартный' } },
    { sub: 'Катализаторы', name: 'Катализатор Walker', brand: 'Bosch', img: 'CatalyticConverterWalker.jpg', price: 18500, chars: { 'Евростандарт': 'Евро-4', 'Материал сот': 'Керамика', 'Универсальный': 'Нет' } },
    { sub: 'Воздушные', name: 'Воздушный фильтр Bosch', brand: 'Bosch', img: 'AirFilterBosch.jpg', price: 950, chars: { 'Тип': 'Панельный', 'Длина': '250 мм', 'Ширина': '150 мм' } },
    { sub: 'Масляные', name: 'Масляный фильтр Mann', brand: 'Mahle', img: 'OilFilterMannFilter.jpg', price: 700, chars: { 'Тип': 'Накручиваемый', 'Резьба': '3/4-16 UNF', 'Давление клапана': '1.2 бар' } },
    { sub: 'Насосы', name: 'Топливный насос Bosch', brand: 'Bosch', img: 'FuelPumpBosch.jpg', price: 3200, chars: { 'Давление': '3.5 бар', 'Производительность': '110 л/ч', 'Вид топлива': 'Бензин' } },
    { sub: 'Форсунки', name: 'Форсунка Denso', brand: 'Denso', img: 'InjectorDensoDiesel.jpg', price: 12500, chars: { 'Тип топлива': 'Дизель', 'Система': 'Common Rail', 'Управление': 'Электромагнитная' } },
    { sub: 'Свечи', name: 'Свеча зажигания NGK', brand: 'NGK', img: 'SparkPlugNGK.jpg', price: 850, chars: { 'Материал электрода': 'Иридий', 'Количество контактов': '1', 'Зазор': '1.1 мм' } },
    { sub: 'Катушки', name: 'Катушка зажигания Bosch', brand: 'Bosch', img: 'IgnitionCoilBosch.jpg', price: 2400, chars: { 'Тип': 'Индивидуальная', 'Напряжение': '12 В', 'Кол-во полюсов': '3' } },
    { sub: 'Коврики', name: 'Коврики салона EVA', brand: 'EVA', img: 'FloorMatsEVA.jpg', price: 2600, chars: { 'Цвет': 'Черный с красным кантом', 'Материал': 'Сэвилен (EVA)', 'Форма ячеек': 'Соты' } },
    { sub: 'Чехлы', name: 'Чехлы из экокожи', brand: 'Leatherette', img: 'SeatCoversLeatherette.jpg', price: 7500, chars: { 'Цвет': 'Черный', 'Материал': 'Экокожа', 'Перфорация': 'По центру' } },
    { sub: 'Фары', name: 'Фара основная Bosch', brand: 'Bosch', img: 'HeadlightBosch.jpg', price: 15400, chars: { 'Сторона': 'Левая', 'Тип ламп': 'Галоген H7', 'Корректор': 'Электрический' } },
    { sub: 'Лампы', name: 'Ксеноновая лампа Philips', brand: 'Bosch', img: 'XenonBulbPhilips.jpg', price: 3100, chars: { 'Цоколь': 'D2S', 'Цветовая температура': '4300 K', 'Мощность': '35 Вт' } },
    { sub: 'Моторные масла', name: 'Масло Mobil 1 5W-30', brand: 'Mobil1', img: 'EngineOilMobil1.jpg', price: 4500, chars: { 'Вязкость': '5W-30', 'Состав': 'Синтетика', 'Объем': '4 л', 'Спецификация': 'API SN' } },
    { sub: 'Антифризы', name: 'Антифриз Liqui Moly G12+', brand: 'LiquiMoly', img: 'AntifreezeLiquiMoly.jpg', price: 1600, chars: { 'Цвет': 'Красный', 'Класс': 'G12+', 'Объем': '5 л' } },
    { sub: 'Иммобилайзеры', name: 'Иммобилайзер IGLA', brand: 'IGLA', img: 'ImmobilizerIGLA.jpg', price: 11000, chars: { 'Блокировка': 'По CAN шине', 'Авторизация': 'ПИН-код / Метка', 'Габариты': 'Микро' } },
    { sub: 'Сигнализации', name: 'Сигнализация StarLine', brand: 'StarLine Security', img: 'BRND:CarAlarmStarLine.jpg', price: 16500, chars: { 'Автозапуск': 'Есть', 'Дальность связи': '2000 м', 'GSM/GPS': 'Опционально' } },
    { sub: 'Рейки', name: 'Рулевая рейка Bosch', brand: 'Bosch', img: 'SteeringRackBosch.jpg', price: 28000, chars: { 'Тип усилителя': 'ГУР', 'Датчик': 'С сервотроником', 'Состояние': 'Восстановленная' } },
    { sub: 'Тяги', name: 'Рулевой наконечник TRW', brand: 'TRW', img: 'TieRodEndTRW.jpg', price: 1400, chars: { 'Ось': 'Передняя', 'Сторона': 'Правая', 'Резьба': 'M14x1.5' } },
    { sub: 'Амортизаторы', name: 'Амортизатор KYB Excel-G', brand: 'KYB', img: 'ShockAbsorberKYB.jpg', price: 4200, chars: { 'Тип': 'Газомасляный', 'Ось': 'Задняя', 'Система': 'Двухтрубная' } },
    { sub: 'Рычаги', name: 'Рычаг подвески Lemforder', brand: 'TRW', img: 'ControlArmLemforder.jpg', price: 6100, chars: { 'Ось': 'Передняя', 'Материал': 'Алюминий', 'В сборе': 'С сайлентблоками' } },
    { sub: 'Шины', name: 'Шина Michelin Pilot Sport', brand: 'Michelin', img: 'TiresMichelin.jpg', price: 12500, chars: { 'Сезон': 'Лето', 'Размер': '225/45 R17', 'Индекс скорости': 'Y (240 км/ч)' } },
    { sub: 'Колесные диски', name: 'Литой диск Continental', brand: 'Continental', img: 'WheelContinental.jpg', price: 8900, chars: { 'Диаметр': '17', 'Сверловка': '5x114.3', 'Вылет (ET)': '45' } },
    { sub: 'Домкраты', name: 'Домкрат подкатной TRW', brand: 'TRW', img: 'TrolleyJackTRW.jpg', price: 4800, chars: { 'Тип': 'Гидравлический', 'Грузоподъемность': '2 т', 'Высота подъема': '350 мм' } },
    { sub: 'Наборы ключей', name: 'Набор инструментов Bosch', brand: 'Bosch', img: 'SocketSetToolKitBosch.jpg', price: 7900, chars: { 'Количество предметов': '108', 'Материал': 'Cr-V сталь', 'Кейс': 'Противоударный' } },
    { sub: 'Сцепление', name: 'Комплект сцепления Sachs', brand: 'Bosch', img: 'ClutchKitSachs.jpg', price: 11500, chars: { 'В комплекте': 'Диск, корзина, выжимной', 'Диаметр': '240 мм', 'Число шлицов': '21' } },
    { sub: 'ШРУСы', name: 'ШРУС наружный GKN', brand: 'TRW', img: 'CVJointGKNLoebro.jpg', price: 3800, chars: { 'Установка': 'Со стороны колеса', 'АБС': 'Кольцо 44 зуба', 'Пыльник': 'Неопрен' } },
  ];

  const productInserts = [];
  
  primaryProducts.forEach((prod, i) => {
    const catId = sMap[prod.sub];
    if (!catId) return;

    const bIdPrimary = bMap[prod.brand] || bMap['Bosch'];
    const bIdAlt = bMap['Denso'] || bMap['TRW']; 

    let finalImageUrl;
    if (prod.img.startsWith('CAT:')) {
      finalImageUrl = `${CATEGORIES_BUCKET}/${prod.img.split(':')[1]}`;
    } else if (prod.img.startsWith('BRND:')) {
      finalImageUrl = `${BRANDS_BUCKET}/${prod.img.split(':')[1]}`;
    } else {
      finalImageUrl = `${PRODUCTS_BUCKET}/${prod.img}`;
    }

    productInserts.push({
      category_id: catId,
      brand_id: bIdPrimary,
      sku: `PRD-ORG-${i+1000}`,
      name: prod.name,
      description: `Оригинальная запчасть высочайшего качества. ${prod.name} гарантирует долгий срок службы и идеальную совместимость с вашим автомобилем. Изготовлено по строгим стандартам.`,
      characteristics: prod.chars,
      price: prod.price,
      discount_price: i % 4 === 0 ? Math.floor(prod.price * 0.85) : null,
      weight_kg: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
      warranty_months: 12,
      images: [finalImageUrl],
      tags: ['Оригинал', 'Хит продаж'],
      vehicle_compatibility: { brands: ['Toyota', 'BMW'], models: ['Camry', 'X5'], years: [2018, 2019, 2020] },
      is_active: true
    });

    const altPrice = Math.floor(prod.price * 0.7); 
    const altChars = { ...prod.chars, 'Материал': 'Аналог (Стандарт)', 'Гарантия производителя': '6 месяцев' };
    delete altChars['Оригинал'];

    productInserts.push({
      category_id: catId,
      brand_id: bIdAlt,
      sku: `PRD-ALT-${i+2000}`,
      name: `${prod.name.split(' ')[0]} (Аналог Q-Part)`,
      description: `Бюджетный аналог отличного качества. Проверенное решение для экономичного ремонта. Полностью соответствует заводским спецификациям.`,
      characteristics: altChars,
      price: altPrice,
      discount_price: null,
      weight_kg: parseFloat((Math.random() * 5 + 0.5).toFixed(2)),
      warranty_months: 6,
      images: [finalImageUrl],
      tags: ['Выгодная цена', 'Аналог'],
      vehicle_compatibility: { brands: ['Kia', 'Hyundai'], models: ['Rio', 'Solaris'], years: [2015, 2016, 2017] },
      is_active: true
    });
  });

  const insertedProducts = await insertInBatches('products', productInserts, 10, 0, 3, 'id, price, discount_price');
  console.log(`✅ Товары добавлены (Всего: ${insertedProducts.length}).`);

  // ==========================================
  // 6. ОСТАТКИ НА СКЛАДАХ
  // ==========================================
  const stockInserts = [];
  insertedProducts.forEach(prod => {
    // Раскидываем каждый товар на случайные склады из наших 60 складов
    const wh1 = warehouseIds[rand(0, warehouseIds.length - 1)];
    let wh2 = warehouseIds[rand(0, warehouseIds.length - 1)];
    while (wh1 === wh2) wh2 = warehouseIds[rand(0, warehouseIds.length - 1)];
    
    stockInserts.push({ product_id: prod.id, warehouse_id: wh1, quantity: rand(5, 50), shelf_location: `A${rand(1,9)}-${rand(10,99)}` });
    stockInserts.push({ product_id: prod.id, warehouse_id: wh2, quantity: rand(2, 20), shelf_location: `B${rand(1,9)}-${rand(10,99)}` });
  });
  await insertInBatches('product_stocks', stockInserts, 20, 0, 3);
  console.log('✅ Остатки на складах распределены.');

  // ==========================================
  // 7. ЗАКАЗЫ И ПОЗИЦИИ
  // ==========================================
  const ordersData = Array.from({ length: 15 }, (_, i) => ({
    user_id: userIds[i % userIds.length],
    warehouse_id: warehouseIds[i % warehouseIds.length],
    payment_method: i % 2 === 0 ? 'card' : 'cash',
    payment_status: i % 2 === 0 ? 'paid' : 'unpaid',
    delivery_status: ['processing', 'shipping', 'delivered', 'ready_for_pickup'][i % 4],
    shipping_cost: 350.00,
    total_price: 0, 
    delivery_address: `г. Город, ул. Тестовая, д. ${i+1}, кв. ${i+10}`,
    customer_name: `Клиент ${i+1}`,
    customer_phone: `+7-900-555-44-33`,
    customer_email: `client${i}@mail.ru`
  }));
  
  const insertedOrders = await insertInBatches('orders', ordersData, 5, 0, 3, 'id, user_id, shipping_cost');
  
  const orderItemsData = [];
  const statusHistoryData = [];
  
  for (const ord of insertedOrders) {
    let orderTotal = ord.shipping_cost;
    const itemsCount = rand(1, 3);
    
    for (let k = 0; k < itemsCount; k++) {
      const prod = insertedProducts[rand(0, insertedProducts.length - 1)];
      const qty = rand(1, 2);
      const price = prod.discount_price || prod.price || 1000; 
      orderTotal += price * qty;
      
      orderItemsData.push({
        order_id: ord.id, product_id: prod.id, quantity: qty, unit_price: price, warehouse_id: warehouseIds[0]
      });
    }
    
    await supabase.from('orders').update({ total_price: orderTotal }).eq('id', ord.id);
    statusHistoryData.push({ order_id: ord.id, delivery_status: 'processing', payment_status: 'unpaid', comment: 'Заказ создан системой', changed_by: 'System' });
  }
  await insertInBatches('order_items', orderItemsData, 10, 0, 3);
  await insertInBatches('order_status_history', statusHistoryData, 10, 0, 3);
  console.log('✅ Заказы, позиции и история добавлены.');

  // ==========================================
  // 8. ОТЗЫВЫ, ВОЗВРАТЫ, ИЗБРАННОЕ, УВЕДОМЛЕНИЯ
  // ==========================================
  const reviewsData = Array.from({ length: 20 }, (_, i) => ({
    product_id: insertedProducts[i % insertedProducts.length].id,
    user_id: userIds[i % userIds.length],
    order_id: insertedOrders[i % insertedOrders.length].id,
    rating: rand(3, 5),
    comment: ['Отличное качество, рекомендую!', 'Нормально за свои деньги.', 'Встало как родное, супер!', 'Доставка быстрая, товар целый.'][i % 4],
    pros: 'Качественный материал, цена.',
    cons: 'Пока не выявил.',
    images: [],
    is_approved: true,
    is_verified_purchase: true,
    helpful_count: rand(0, 15)
  }));
  await insertInBatches('reviews', reviewsData, 10, 0, 3);

  const returnsData = insertedOrders.slice(0, 3).map((ord, i) => ({
    order_id: ord.id, user_id: ord.user_id, reason: 'Товар не подошел по размеру, хочу вернуть.', status: ['pending', 'approved', 'rejected'][i % 3], images: []
  }));
  await insertInBatches('return_requests', returnsData, 3, 0, 3);

  const wishlistData = Array.from({ length: 15 }, (_, i) => ({
    user_id: userIds[i % userIds.length], product_id: insertedProducts[(i + 5) % insertedProducts.length].id
  }));
  await insertInBatches('wishlists', wishlistData, 10, 0, 3);

  const tokensData = [
    { user_id: userIds[0], token: crypto.randomUUID(), expires_at: new Date(Date.now() + 86400000).toISOString(), used: false }
  ];
  await insertInBatches('password_reset_tokens', tokensData, 1, 0, 3);

  console.log('✅ Отзывы, возвраты, избранное и токены добавлены.');
  console.log('\n🎉 БАЗА УСПЕШНО ЗАПОЛНЕНА И ГОТОВА К РАБОТЕ!');
}

seed().catch(e => {
  console.error('❌ ОШИБКА ПРИ ПОСЕВЕ:', e);
  process.exit(1);
});