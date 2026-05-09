// seeder.js (полный, без пропусков, CommonJS)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL and SUPABASE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
});

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function insertInBatches(table, records, chunkSize = 2, delayMs = 1200, retries = 5, selectCols = 'id') {
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
        // Игнорируем нарушение уникальности
        if (err?.code === '23505') {
          console.warn(`⚠️  Конфликт уникальности в ${table}, пропускаем дубликат.`);
          lastError = null;
          break; // выходим из повторов, просто пропускаем этот чанк
        }
        if (err?.message?.includes('fetch') || err?.message?.includes('ECONNRESET')) {
          const wait = delayMs * Math.pow(2, attempt - 1);
          console.warn(`⚠️  ${table} – сетевая ошибка (попытка ${attempt}/${retries}), жду ${wait}ms: ${err.message}`);
          await new Promise(res => setTimeout(res, wait));
        } else {
          throw err;
        }
      }
    }
    if (lastError) throw lastError;
    if (i + chunkSize < records.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

async function clearDatabase() {
  const tables = [
    'return_requests', 'reviews', 'wishlists',
    'order_status_history', 'order_items', 'orders',
    'product_stocks', 'products', 'category_attributes',
    'brands', 'categories', 'notifications',
    'password_reset_tokens', 'user_vehicles', 'users',
    'warehouses', 'cities',
  ];
  for (const table of tables) {
    console.log(`Clearing ${table}...`);
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) console.warn(`⚠️  Could not clear ${table}: ${error.message}`);
  }
  console.log('All tables cleared.\n');
}

const BASE_URL = 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public';
const PRODUCTS_BUCKET = `${BASE_URL}/products`;
const CATEGORIES_BUCKET = `${BASE_URL}/categories`;
const BRANDS_BUCKET = `${BASE_URL}/brands`;

async function seed() {
  console.log('🌱 Starting seed...\n');
  await clearDatabase();

  // 50 городов
  const citiesData = [
    { name: 'Москва', region: 'Московская область', lat: 55.7558, lon: 37.6173 },
    { name: 'Санкт-Петербург', region: 'Ленинградская область', lat: 59.9343, lon: 30.3351 },
    { name: 'Новосибирск', region: 'Новосибирская область', lat: 55.0084, lon: 82.9357 },
    { name: 'Екатеринбург', region: 'Свердловская область', lat: 56.8389, lon: 60.6057 },
    { name: 'Казань', region: 'Республика Татарстан', lat: 55.7961, lon: 49.1064 },
    { name: 'Нижний Новгород', region: 'Нижегородская область', lat: 56.2965, lon: 43.9361 },
    { name: 'Челябинск', region: 'Челябинская область', lat: 55.1644, lon: 61.4368 },
    { name: 'Омск', region: 'Омская область', lat: 54.9833, lon: 73.3667 },
    { name: 'Самара', region: 'Самарская область', lat: 53.1959, lon: 50.1002 },
    { name: 'Ростов-на-Дону', region: 'Ростовская область', lat: 47.2357, lon: 39.7015 },
    { name: 'Уфа', region: 'Республика Башкортостан', lat: 54.7348, lon: 55.9578 },
    { name: 'Красноярск', region: 'Красноярский край', lat: 56.0153, lon: 92.8932 },
    { name: 'Пермь', region: 'Пермский край', lat: 58.0103, lon: 56.2294 },
    { name: 'Воронеж', region: 'Воронежская область', lat: 51.6606, lon: 39.2003 },
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
    { name: 'Кемерово', region: 'Кемеровская область', lat: 55.3549, lon: 86.0896 },
    { name: 'Новокузнецк', region: 'Кемеровская область', lat: 53.7557, lon: 87.1099 },
    { name: 'Рязань', region: 'Рязанская область', lat: 54.6292, lon: 39.7378 },
    { name: 'Астрахань', region: 'Астраханская область', lat: 46.3476, lon: 48.0398 },
    { name: 'Набережные Челны', region: 'Республика Татарстан', lat: 55.7432, lon: 52.3958 },
    { name: 'Пенза', region: 'Пензенская область', lat: 53.1959, lon: 45.0184 },
    { name: 'Липецк', region: 'Липецкая область', lat: 52.6032, lon: 39.5999 },
    { name: 'Киров', region: 'Кировская область', lat: 58.5966, lon: 49.6601 },
    { name: 'Чебоксары', region: 'Чувашская Республика', lat: 56.1322, lon: 47.2519 },
    { name: 'Калининград', region: 'Калининградская область', lat: 54.7104, lon: 20.5002 },
    { name: 'Брянск', region: 'Брянская область', lat: 53.2435, lon: 34.3634 },
    { name: 'Тула', region: 'Тульская область', lat: 54.1930, lon: 37.6175 },
    { name: 'Ставрополь', region: 'Ставропольский край', lat: 45.0448, lon: 41.9692 },
    { name: 'Курск', region: 'Курская область', lat: 51.7373, lon: 36.1874 },
    { name: 'Тверь', region: 'Тверская область', lat: 56.8587, lon: 35.9176 },
    { name: 'Магнитогорск', region: 'Челябинская область', lat: 53.4071, lon: 58.9767 },
    { name: 'Сочи', region: 'Краснодарский край', lat: 43.5855, lon: 39.7231 },
    { name: 'Белгород', region: 'Белгородская область', lat: 50.5997, lon: 36.5986 },
    { name: 'Нижний Тагил', region: 'Свердловская область', lat: 57.9196, lon: 59.9650 },
    { name: 'Владимир', region: 'Владимирская область', lat: 56.1365, lon: 40.3966 },
    { name: 'Архангельск', region: 'Архангельская область', lat: 64.5399, lon: 40.5155 },
  ];
  const cityIds = (await insertInBatches('cities', citiesData, 3, 1200, 5)).map(c => c.id);
  console.log('✅ Cities seeded.');

  // 35 складов
  const warehousesData = Array.from({ length: 35 }, (_, i) => ({
    city_id: cityIds[i % cityIds.length],
    address: `ул. Складская, д. ${i + 1}`,
    phone: `+7-999-${String(100 + i).padStart(3, '0')}-${String(10 + i).padStart(2, '0')}-${String((10 + i * 3) % 100).padStart(2, '0')}`,
    working_hours: '09:00-21:00',
    is_pickup_point: true,
  }));
  const warehouseIds = (await insertInBatches('warehouses', warehousesData, 3, 1200, 5)).map(w => w.id);
  console.log('✅ Warehouses seeded.');

  // пользователи
  const firstNames = ['Алексей','Иван','Сергей','Дмитрий','Андрей','Максим','Артём','Роман','Павел','Николай','Владимир','Евгений','Олег','Юрий','Антон','Константин','Виталий','Станислав','Геннадий','Борис','Тимур','Арсений','Игорь','Денис','Глеб','Лев','Марк','Семен','Петр','Федор','Эдуард','Руслан','Альберт','Василий','Кирилл'];
  const lastNames = ['Иванов','Петров','Сидоров','Кузнецов','Смирнов','Попов','Васильев','Соколов','Михайлов','Федоров','Морозов','Волков','Алексеев','Лебедев','Семенов','Егоров','Павлов','Козлов','Степанов','Николаев','Орлов','Андреев','Макаров','Борисов','Захаров'];

  const usersData = firstNames.map((fn, i) => {
    const block1 = String(100 + i).padStart(3, '0');
    const block2 = String(10 + i).padStart(2, '0');
    const block3 = String((10 + i * 3) % 100).padStart(2, '0');
    return {
      id: crypto.randomUUID(),
      role: 'user',
      email: `user${i+1}@example.com`,
      phone_number: `+7-900-${block1}-${block2}-${block3}`,
      password_hash: 'Password123!',
      first_name: fn,
      last_name: lastNames[i % lastNames.length],
      otchestvo: 'Отчество',
      avatar_url: 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png',
      is_email_verified: true,
      saved_city_id: cityIds[rand(0, cityIds.length-1)],
      allows_data_saving: false,
      cart: [],
      compare_list: [],
    };
  });
  usersData.push({
    id: crypto.randomUUID(),
    role: 'admin',
    email: 'admin@apexdrive.ru',
    phone_number: '+7-900-999-99-99',
    password_hash: 'Admin123!',
    first_name: 'Админ', last_name: 'Главный', otchestvo: 'Админович',
    avatar_url: 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png',
    is_email_verified: true,
    saved_city_id: cityIds[0],
    allows_data_saving: false,
    cart: [], compare_list: [],
  });

  const userIds = (await insertInBatches('users', usersData, 1, 2000, 5, 'id')).map(u => u.id);
  console.log('✅ Users seeded.');

  // транспорт
  const brandsVehicle = ['Toyota','BMW','Lada','Kia','Hyundai','Renault','Volkswagen','Nissan','Skoda'];
  const modelsVehicle = ['Camry','3 Series','Vesta','Rio','Solaris','Logan','Polo','Qashqai','Octavia'];
  const vehiclesData = userIds.slice(0, 35).map((userId, i) => ({
    user_id: userId,
    brand: brandsVehicle[i % brandsVehicle.length],
    model: modelsVehicle[i % modelsVehicle.length],
    year: rand(2010, 2023),
    vin: `XTA${String(210000 + i)}`,
    engine_volume: (1.4 + (i % 10) * 0.1).toFixed(1),
    is_primary: i === 0,
  }));
  await insertInBatches('user_vehicles', vehiclesData, 3, 1200, 5);
  console.log('✅ User vehicles seeded.');

  // токены
  const tokenData = Array.from({ length: 5 }, () => ({
    user_id: userIds[rand(0, userIds.length-1)],
    token: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    used: false,
  }));
  await insertInBatches('password_reset_tokens', tokenData, 3, 1000, 5);
  console.log('✅ Password reset tokens seeded.');

  // уведомления
  const notifTypes = ['order','system','promo','stock'];
  const notifData = Array.from({ length: 30 }, (_, i) => ({
    user_id: userIds[rand(0, userIds.length-1)],
    type: notifTypes[i % 4],
    title: `Уведомление ${i+1}`,
    message: `Сообщение уведомления ${i+1}`,
    is_read: i % 3 === 0,
  }));
  await insertInBatches('notifications', notifData, 5, 1000, 5);
  console.log('✅ Notifications seeded.');

  // категории
  const parentCategories = [
    { name: 'Автоэлектроника', slug: 'autoelectronics', image: `${CATEGORIES_BUCKET}/Autoelectronics.jpg` },
    { name: 'Автомобильные химия и уход', slug: 'automotivechemicalsandcare', image: `${CATEGORIES_BUCKET}/Automotivechemicalsandcare.jpg` },
    { name: 'Батареи (АКБ)', slug: 'batteries', image: `${CATEGORIES_BUCKET}/Batteries(battery).jpg` },
    { name: 'Кузовные части', slug: 'bodyparts', image: `${CATEGORIES_BUCKET}/Bodyparts.jpg` },
    { name: 'Тормозная система', slug: 'brakesystem', image: `${CATEGORIES_BUCKET}/Brakesystem.jpg` },
    { name: 'Система охлаждения', slug: 'coolingsystem', image: `${CATEGORIES_BUCKET}/Coolingsystem.jpg` },
    { name: 'Двигатель и ГРМ', slug: 'engineandtiming', image: `${CATEGORIES_BUCKET}/Engineandtiming.jpg` },
    { name: 'Выхлопная система', slug: 'exhaustsystem', image: `${CATEGORIES_BUCKET}/Exhaustsystem.jpg` },
    { name: 'Фильтры', slug: 'filters', image: `${CATEGORIES_BUCKET}/Filters.jpg` },
    { name: 'Топливная система', slug: 'fuelsystem', image: `${CATEGORIES_BUCKET}/Fuelsystem.jpg` },
    { name: 'Система зажигания', slug: 'ignitionsystem', image: `${CATEGORIES_BUCKET}/Ignitionsystem.jpg` },
    { name: 'Интерьер и комфорт', slug: 'interiorandcomfort', image: `${CATEGORIES_BUCKET}/Interiorandcomfort.jpg` },
    { name: 'Освещение', slug: 'lighting', image: `${CATEGORIES_BUCKET}/Lighting.jpg` },
    { name: 'Масла и жидкости', slug: 'oilsandliquids', image: `${CATEGORIES_BUCKET}/Oilsandliquids.jpg` },
    { name: 'Системы безопасности', slug: 'securitysystems', image: `${CATEGORIES_BUCKET}/Securitysystems.jpg` },
    { name: 'Рулевое управление', slug: 'steering', image: `${CATEGORIES_BUCKET}/Steering.jpg` },
    { name: 'Подвеска', slug: 'suspension', image: `${CATEGORIES_BUCKET}/Suspension.jpg` },
    { name: 'Шины и диски', slug: 'tiresandwheels', image: `${CATEGORIES_BUCKET}/Tiresandwheels.jpg` },
    { name: 'Инструменты', slug: 'tools', image: `${CATEGORIES_BUCKET}/Tools.jpg` },
    { name: 'Трансмиссия', slug: 'transmission', image: `${CATEGORIES_BUCKET}/Transmission.jpg` },
  ];
  const subcategoriesMap = {
    autoelectronics: [
      { name: 'Автосигнализации', slug: 'autoelectronics-alarms' },
      { name: 'Мультимедиа', slug: 'autoelectronics-multimedia' },
    ],
    automotivechemicalsandcare: [
      { name: 'Автошампуни', slug: 'car-shampoos' },
      { name: 'Полироли', slug: 'car-polishes' },
    ],
    batteries: [
      { name: 'Аккумуляторы легковые', slug: 'batteries-car' },
      { name: 'Аккумуляторы грузовые', slug: 'batteries-truck' },
    ],
    bodyparts: [
      { name: 'Зеркала', slug: 'bodyparts-mirrors' },
      { name: 'Кузовные панели', slug: 'bodyparts-panels' },
    ],
    brakesystem: [
      { name: 'Тормозные диски', slug: 'brakes-discs' },
      { name: 'Тормозные колодки', slug: 'brakes-pads' },
    ],
    coolingsystem: [
      { name: 'Радиаторы', slug: 'cooling-radiators' },
      { name: 'Термостаты', slug: 'cooling-thermostats' },
    ],
    engineandtiming: [
      { name: 'Поршневые кольца', slug: 'engine-piston-rings' },
      { name: 'Комплекты ГРМ', slug: 'engine-timing-kits' },
    ],
    exhaustsystem: [
      { name: 'Глушители', slug: 'exhaust-mufflers' },
      { name: 'Каталитические нейтрализаторы', slug: 'exhaust-catalytic' },
    ],
    filters: [
      { name: 'Масляные фильтры', slug: 'filters-oil' },
      { name: 'Воздушные фильтры', slug: 'filters-air' },
    ],
    fuelsystem: [
      { name: 'Топливные насосы', slug: 'fuel-pumps' },
      { name: 'Форсунки', slug: 'fuel-injectors' },
    ],
    ignitionsystem: [
      { name: 'Свечи зажигания', slug: 'ignition-plugs' },
      { name: 'Катушки зажигания', slug: 'ignition-coils' },
    ],
    interiorandcomfort: [
      { name: 'Чехлы на сидения', slug: 'interior-seat-covers' },
      { name: 'Коврики салона', slug: 'interior-floor-mats' },
    ],
    lighting: [
      { name: 'Фары', slug: 'lighting-headlights' },
      { name: 'Лампы ксенон', slug: 'lighting-xenon' },
    ],
    oilsandliquids: [
      { name: 'Моторные масла', slug: 'oils-engine' },
      { name: 'Антифриз', slug: 'oils-antifreeze' },
    ],
    securitysystems: [
      { name: 'Иммобилайзеры', slug: 'security-immobilizers' },
      { name: 'Сигнализации', slug: 'security-alarms' },
    ],
    steering: [
      { name: 'Рулевые рейки', slug: 'steering-racks' },
      { name: 'Тяги рулевые', slug: 'steering-tie-rods' },
    ],
    suspension: [
      { name: 'Амортизаторы', slug: 'suspension-shocks' },
      { name: 'Рычаги подвески', slug: 'suspension-arms' },
    ],
    tiresandwheels: [
      { name: 'Шины', slug: 'tires' },
      { name: 'Диски колес', slug: 'wheels' },
    ],
    tools: [
      { name: 'Домкраты', slug: 'tools-jacks' },
      { name: 'Наборы инструментов', slug: 'tools-sets' },
    ],
    transmission: [
      { name: 'Сцепление', slug: 'transmission-clutch' },
      { name: 'ШРУСы', slug: 'transmission-cvjoints' },
    ],
  };
  const parentInserts = parentCategories.map(c => ({
    parent_id: null, name: c.name, slug: c.slug, image_url: c.image,
  }));
  const parentIdsData = await insertInBatches('categories', parentInserts, 3, 1200, 5, 'id, slug');
  const parentIdBySlug = {};
  parentIdsData.forEach(row => { parentIdBySlug[row.slug] = row.id; });

  const subCatInserts = [];
  for (const { slug } of parentCategories) {
    const subs = subcategoriesMap[slug] || [];
    subs.forEach(sub => {
      subCatInserts.push({
        parent_id: parentIdBySlug[slug],
        name: sub.name,
        slug: sub.slug,
        image_url: 'https://placehold.co/400',
      });
    });
  }
  const insertedSubcats = await insertInBatches('categories', subCatInserts, 3, 1200, 5, 'id, slug');
  const subcategorySlugToId = {};
  insertedSubcats.forEach(row => { subcategorySlugToId[row.slug] = row.id; });
  console.log('✅ Categories and subcategories seeded.');

  // атрибуты категорий
  const attrInserts = [];
  Object.values(parentIdBySlug).forEach(parentId => {
    const attrs = [
      { code: 'type', label: 'Тип', type: 'text', unit: '', sort_order: 1 },
      { code: 'material', label: 'Материал', type: 'text', unit: '', sort_order: 2 },
      { code: 'compatibility', label: 'Совместимость', type: 'checkbox', options_json: JSON.stringify(['Toyota','BMW','Lada']) },
      { code: 'warranty', label: 'Гарантия', type: 'range', unit: 'мес', sort_order: 3 },
    ];
    attrs.forEach(attr => {
      attrInserts.push({
        category_id: parentId,
        code: attr.code, label: attr.label, type: attr.type,
        unit: attr.unit, sort_order: attr.sort_order,
        is_filterable: true, is_required: false, options_json: attr.options_json || '[]',
      });
    });
  });
  await insertInBatches('category_attributes', attrInserts, 5, 1000, 5);
  console.log('✅ Category attributes seeded.');

  // бренды
  const brandsData = [
    { name: '70mai', logo: '70mai.png', country: 'Китай', popular: false },
    { name: 'Bosch', logo: 'Bosch.jpg', country: 'Германия', popular: true },
    { name: 'Brembo', logo: 'Brembo.png', country: 'Италия', popular: true },
    { name: 'CarAlarmStarLine', logo: 'CarAlarmStarLine.jpg', country: 'Россия', popular: false },
    { name: 'Castrol', logo: 'Castrol.png', country: 'Великобритания', popular: true },
    { name: 'Continental', logo: 'Continental.png', country: 'Германия', popular: true },
    { name: 'Denso', logo: 'Denso.png', country: 'Япония', popular: true },
    { name: 'EVA', logo: 'EVA.png', country: 'Россия', popular: false },
    { name: 'Exide', logo: 'Exide.jpg', country: 'США', popular: true },
    { name: 'IGLA', logo: 'IGLA.png', country: 'Россия', popular: false },
    { name: 'KYB', logo: 'KYB.png', country: 'Япония', popular: true },
    { name: 'Leatherette', logo: 'Leatherette.jpg', country: 'Китай', popular: false },
    { name: 'LiquiMoly', logo: 'LiquiMoly.png', country: 'Германия', popular: true },
    { name: 'Mahle', logo: 'Mahle.png', country: 'Германия', popular: true },
    { name: 'Michelin', logo: 'Michelin.png', country: 'Франция', popular: true },
    { name: 'Mobil1', logo: 'Mobil1.png', country: 'США', popular: true },
    { name: 'Motul', logo: 'Motul.png', country: 'Франция', popular: false },
    { name: 'NGK', logo: 'NGK.png', country: 'Япония', popular: true },
    { name: 'Pioneer', logo: 'Pioneer.png', country: 'Япония', popular: true },
    { name: 'Pirelli', logo: 'Pirelli.png', country: 'Италия', popular: true },
    { name: 'Shell', logo: 'Shell.png', country: 'Нидерланды', popular: true },
    { name: 'StarLine', logo: 'StarLine.png', country: 'Россия', popular: true },
    { name: 'TRW', logo: 'TRW.png', country: 'США', popular: true },
    { name: 'Varta', logo: 'Varta.png', country: 'Германия', popular: true },
  ];
  const insertedBrands = await insertInBatches('brands',
    brandsData.map(b => ({
      name: b.name,
      logo_url: `${BRANDS_BUCKET}/${b.logo}`,
      country: b.country,
      is_popular: b.popular,
    })),
    3, 1200, 5, 'id, name'
  );
  const brandNameToId = {};
  insertedBrands.forEach(b => { brandNameToId[b.name] = b.id; });
  console.log('✅ Brands seeded.');

  // продукты
  const productImages = [
    `${PRODUCTS_BUCKET}/AirFilterBosch.jpg`,
    `${PRODUCTS_BUCKET}/AntifreezeLiquiMoly.jpg`,
    `${PRODUCTS_BUCKET}/BrakeDiscTRW.jpg`,
    `${PRODUCTS_BUCKET}/BrakePadsBrembo.jpg`,
    `${PRODUCTS_BUCKET}/CarBatteryVarta.jpg`,
    `${PRODUCTS_BUCKET}/CarPolishLiquiMoly.jpg`,
    `${PRODUCTS_BUCKET}/CarShampooLiqui Moly.jpg`,
    `${PRODUCTS_BUCKET}/CatalyticConverterWalker.jpg`,
    `${PRODUCTS_BUCKET}/ClutchKitSachs.jpg`,
    `${PRODUCTS_BUCKET}/ControlArmLemforder.jpg`,
    `${PRODUCTS_BUCKET}/CVJointGKNLoebro.jpg`,
    `${PRODUCTS_BUCKET}/DashCam70mai.jpg`,
    `${PRODUCTS_BUCKET}/EngineOilMobil1.jpg`,
    `${PRODUCTS_BUCKET}/FloorMatsEVA.jpg`,
    `${PRODUCTS_BUCKET}/FuelPumpBosch.jpg`,
    `${PRODUCTS_BUCKET}/HeadlightBosch.jpg`,
    `${PRODUCTS_BUCKET}/HeadUnitPioneer.jpg`,
    `${PRODUCTS_BUCKET}/IgnitionCoilBosch.jpg`,
    `${PRODUCTS_BUCKET}/ImmobilizerGLA.jpg`,
    `${PRODUCTS_BUCKET}/InjectorDensoDiesel.jpg`,
    `${PRODUCTS_BUCKET}/MirrorwithheatingAlkar.jpg`,
    `${PRODUCTS_BUCKET}/MufflermainBosal.jpg`,
    `${PRODUCTS_BUCKET}/OilFilterMannFilter.jpg`,
    `${PRODUCTS_BUCKET}/PistonRingsMahle.jpg`,
    `${PRODUCTS_BUCKET}/RadiatorDenso.jpg`,
    `${PRODUCTS_BUCKET}/SeatCoversLeatherette.jpg`,
    `${PRODUCTS_BUCKET}/ShockAbsorberKYB.jpg`,
    `${PRODUCTS_BUCKET}/SocketSetToolKitBosch.jpg`,
    `${PRODUCTS_BUCKET}/SparkPlugNGK.jpg`,
    `${PRODUCTS_BUCKET}/SteeringRackBosch.jpg`,
    `${PRODUCTS_BUCKET}/ThermostatMahle.jpg`,
    `${PRODUCTS_BUCKET}/TieRodEndTRW.jpg`,
    `${PRODUCTS_BUCKET}/TimingBeltKitBosch.jpg`,
    `${PRODUCTS_BUCKET}/TiresMichelin.jpg`,
    `${PRODUCTS_BUCKET}/TrolleyJackTRW.jpg`,
    `${PRODUCTS_BUCKET}/TruckBatteryExide.jpg`,
    `${PRODUCTS_BUCKET}/WheelContinental.jpg`,
    `${PRODUCTS_BUCKET}/XenonBulbPhilips.jpg`,
    `${PRODUCTS_BUCKET}/placeholder1.jpg`,
    `${PRODUCTS_BUCKET}/placeholder2.jpg`,
  ];
  const productDataBySubSlug = {
    'autoelectronics-alarms': { name: 'Автосигнализация StarLine A93', brand: 'StarLine', price: 12990, discount: 10990, chars: { 'Тип': 'Двусторонняя', 'Дальность': '2000 м', 'Способ управления': 'Брелок', 'Датчик удара': 'Есть', 'Автозапуск': 'Да', 'CAN-модуль': 'Интегрирован', 'Напряжение питания': '12В', 'Гарантия': '12 мес' } },
    'autoelectronics-multimedia': { name: 'Головное устройство Pioneer MVH-S120UB', brand: 'Pioneer', price: 5490, discount: null, chars: { 'Тип': '1DIN', 'Мощность': '4x50 Вт', 'Поддержка USB': 'Да', 'Bluetooth': 'Нет', 'Форматы': 'MP3/WMA', 'Экран': 'LED', 'Подсветка кнопок': 'Красная', 'Гарантия': '6 мес' } },
    'car-shampoos': { name: 'Автошампунь Liqui Moly 1л', brand: 'LiquiMoly', price: 590, discount: 490, chars: { 'Объём': '1 л', 'Тип': 'Концентрат', 'pH': 'Нейтральный', 'Запах': 'Лимон', 'Назначение': 'Ручная мойка', 'Безопасно для ЛКП': 'Да', 'Разбавление': '1:100', 'Страна': 'Германия' } },
    'car-polishes': { name: 'Полироль кузова Liqui Moly', brand: 'LiquiMoly', price: 1200, discount: 990, chars: { 'Тип': 'Воск', 'Объём': '250 мл', 'Эффект': 'Глубокий блеск', 'Защита': 'До 3 месяцев', 'Применение': 'После мойки', 'Ручное нанесение': 'Да', 'Подходит для тёмных авто': 'Да', 'Страна': 'Германия' } },
    'batteries-car': { name: 'Аккумулятор Varta Blue Dynamic', brand: 'Varta', price: 6400, discount: 5800, chars: { 'Ёмкость': '60 Ач', 'Пусковой ток': '540 А', 'Полярность': 'Обратная', 'Тип клемм': 'Европейские', 'Габариты': '242x175x190 мм', 'Вес': '14.5 кг', 'Напряжение': '12В', 'Гарантия': '24 мес' } },
    'batteries-truck': { name: 'Аккумулятор грузовой Exide Premium', brand: 'Exide', price: 12500, discount: 11000, chars: { 'Ёмкость': '180 Ач', 'Пусковой ток': '1000 А', 'Полярность': 'Прямая', 'Тип': 'Свинцово-кислотный', 'Обслуживание': 'Необслуживаемый', 'Вес': '45 кг', 'Напряжение': '24В', 'Гарантия': '18 мес' } },
    'bodyparts-mirrors': { name: 'Зеркало с подогревом Alkar', brand: 'Leatherette', price: 3200, discount: null, chars: { 'Сторона': 'Левое', 'Тип крепления': 'Ручное', 'Подогрев': 'Да', 'Цвет': 'Чёрный', 'Материал корпуса': 'Пластик', 'Совместимость': 'Lada Vesta', 'Регулировка': 'Ручная', 'Гарантия': '12 мес' } },
    'bodyparts-panels': { name: 'Кузовная панель порога', brand: 'EVA', price: 4500, discount: 3900, chars: { 'Материал': 'Сталь', 'Обработка': 'Катафорез', 'Толщина металла': '0.8 мм', 'Сторона': 'Левая', 'Совместимость': 'Renault Logan', 'Комплектация': '1 шт', 'Вес': '2.3 кг', 'Гарантия': '6 мес' } },
    'brakes-discs': { name: 'Тормозной диск TRW', brand: 'TRW', price: 3400, discount: 2990, chars: { 'Диаметр': '280 мм', 'Толщина': '22 мм', 'Минимальная толщина': '20 мм', 'Материал': 'Чугун', 'Вентилируемый': 'Да', 'Число отверстий': '5', 'Ось': 'Передняя', 'Гарантия': '24 мес' } },
    'brakes-pads': { name: 'Тормозные колодки Brembo', brand: 'Brembo', price: 2800, discount: 2400, chars: { 'Материал': 'Керамика', 'Коэффициент трения': '0.42', 'Толщина': '17 мм', 'Датчик износа': 'Есть', 'Ось': 'Передняя', 'Комплект': '4 шт', 'Шумоподавление': 'Есть', 'Гарантия': '12 мес' } },
    'cooling-radiators': { name: 'Радиатор Denso', brand: 'Denso', price: 8500, discount: 7900, chars: { 'Тип': 'Алюминиевый', 'Количество рядов': '2', 'Размеры': '650x350x24 мм', 'Применение': 'Охлаждение двигателя', 'Конструкция': 'Сборный', 'Вес': '4.5 кг', 'Совместимость': 'Toyota Camry', 'Гарантия': '18 мес' } },
    'cooling-thermostats': { name: 'Термостат Mahle', brand: 'Mahle', price: 1200, discount: null, chars: { 'Температура открытия': '87°C', 'Диаметр': '54 мм', 'Материал корпуса': 'Латунь', 'Тип': 'С пружинным механизмом', 'Высота': '80 мм', 'Уплотнительное кольцо': 'В комплекте', 'Применение': 'VW/Audi', 'Гарантия': '12 мес' } },
    'engine-piston-rings': { name: 'Поршневые кольца Mahle', brand: 'Mahle', price: 3900, discount: 3500, chars: { 'Комплект на': '4 цилиндра', 'Диаметр': '82.5 мм', 'Материал': 'Сталь/чугун', 'Тип': 'Компрессионные + маслосъёмные', 'Высота': '1.5/1.5/2.8 мм', 'Зазор': '0.2-0.4 мм', 'Применение': 'BMW N46', 'Гарантия': '6 мес' } },
    'engine-timing-kits': { name: 'Комплект ГРМ Bosch', brand: 'Bosch', price: 6700, discount: 6200, chars: { 'Содержит': 'Ремень, ролики', 'Ширина ремня': '25 мм', 'Число зубьев': '143', 'Материал ремня': 'Резина/стекловолокно', 'Ролик натяжной': 'В комплекте', 'Применение': 'Opel Astra J', 'Интервал замены': '60 000 км', 'Гарантия': '12 мес' } },
    'exhaust-mufflers': { name: 'Глушитель основной Bosal', brand: 'Bosch', price: 5600, discount: null, chars: { 'Тип': 'Основной', 'Диаметр трубы': '55 мм', 'Материал': 'Алюминизированная сталь', 'Длина': '1200 мм', 'Ширина корпуса': '300 мм', 'Вес': '9 кг', 'Применение': 'Ford Focus II', 'Гарантия': '24 мес' } },
    'exhaust-catalytic': { name: 'Катализатор Walker', brand: 'Bosch', price: 24300, discount: 22000, chars: { 'Тип': 'Катализатор', 'Евростандарт': 'Euro 5', 'Диаметр трубы': '60 мм', 'Материал корпуса': 'Нержавейка', 'Количество сот': '400 cpsi', 'Датчик кислорода': 'Совместим', 'Применение': 'Renault Duster', 'Гарантия': '12 мес' } },
    'filters-oil': { name: 'Масляный фильтр Mann', brand: 'Mahle', price: 650, discount: null, chars: { 'Тип': 'Масляный', 'Резьба': 'M20x1.5', 'Высота': '90 мм', 'Диаметр корпуса': '65 мм', 'Материал фильтроэлемента': 'Целлюлоза', 'Пропускная способность': '18 л/мин', 'Перепускной клапан': 'Да', 'Гарантия': '6 мес' } },
    'filters-air': { name: 'Воздушный фильтр Bosch', brand: 'Bosch', price: 850, discount: 750, chars: { 'Тип': 'Панельный', 'Длина': '300 мм', 'Ширина': '180 мм', 'Высота': '45 мм', 'Материал': 'Синтетика', 'Класс фильтрации': '99.5%', 'Применение': 'Hyundai Solaris', 'Гарантия': '6 мес' } },
    'fuel-pumps': { name: 'Топливный насос Bosch', brand: 'Bosch', price: 4300, discount: 3800, chars: { 'Производительность': '120 л/ч', 'Давление': '3.5 бар', 'Тип': 'Погружной', 'Материал': 'Алюминий/пластик', 'Сетчатый фильтр': 'В комплекте', 'Напряжение': '12В', 'Применение': 'Lada Granta', 'Гарантия': '18 мес' } },
    'fuel-injectors': { name: 'Форсунка дизельная Denso', brand: 'Denso', price: 8500, discount: 7900, chars: { 'Тип': 'Электромагнитная', 'Сопротивление': '0.5 Ом', 'Давление открытия': '1600 бар', 'Количество отверстий': '7', 'Распылитель': 'Sac', 'Кодировка': 'С2', 'Применение': 'Common Rail', 'Гарантия': '12 мес' } },
    'ignition-plugs': { name: 'Свеча зажигания NGK', brand: 'NGK', price: 450, discount: 390, chars: { 'Резьба': 'M14x1.25', 'Зазор': '1.1 мм', 'Количество электродов': '3', 'Калильное число': '6', 'Материал центрального электрода': 'Иридий', 'Момент затяжки': '25 Нм', 'Применение': 'Бензиновые ДВС', 'Гарантия': '12 мес' } },
    'ignition-coils': { name: 'Катушка зажигания Bosch', brand: 'Bosch', price: 2200, discount: 1900, chars: { 'Тип': 'Индивидуальная', 'Сопротивление первичной обмотки': '0.7 Ом', 'Вторичной обмотки': '8 кОм', 'Выходное напряжение': '40 кВ', 'Материал корпуса': 'Эпоксидный компаунд', 'Совместимость': 'VAG', 'Длина кабеля': '120 мм', 'Гарантия': '24 мес' } },
    'interior-seat-covers': { name: 'Чехлы на сидения Leatherette', brand: 'Leatherette', price: 6500, discount: 5700, chars: { 'Материал': 'Экокожа', 'Цвет': 'Чёрный', 'Количество мест': '5', 'Крепление': 'Липучки/крючки', 'Водонепроницаемость': 'Да', 'Совместимость': 'Универсальные', 'Подогрев': 'Совместимы', 'Гарантия': '12 мес' } },
    'interior-floor-mats': { name: 'Коврики салона EVA', brand: 'EVA', price: 2100, discount: 1800, chars: { 'Материал': 'EVA', 'Цвет': 'Серый', 'Количество': '4 шт', 'Бортик': 'Высокий', 'Защита от грязи': 'Да', 'Водонепроницаемые': 'Да', 'Запах': 'Нет', 'Гарантия': '6 мес' } },
    'lighting-headlights': { name: 'Фара Bosch', brand: 'Bosch', price: 12400, discount: 11500, chars: { 'Тип лампы': 'H7', 'Регулировка': 'Электрическая', 'Материал стекла': 'Поликарбонат', 'Сторона': 'Левая', 'Габариты': '500x300x250 мм', 'Применение': 'Skoda Octavia A7', 'Омыватель': 'Совместима', 'Гарантия': '24 мес' } },
    'lighting-xenon': { name: 'Ксеноновая лампа Philips', brand: 'Pioneer', price: 2800, discount: null, chars: { 'Цоколь': 'D2S', 'Цветовая температура': '4300K', 'Световой поток': '3200 люмен', 'Мощность': '35 Вт', 'Срок службы': '2500 ч', 'Тип': 'Газоразрядная', 'Блок розжига': 'Не входит', 'Гарантия': '12 мес' } },
    'oils-engine': { name: 'Моторное масло Mobil 1 5W-30', brand: 'Mobil1', price: 3800, discount: 3400, chars: { 'Объём': '4 л', 'Вязкость': '5W-30', 'Тип': 'Синтетическое', 'Спецификации': 'API SN, ACEA A3/B4', 'Температура застывания': '-42°C', 'Назначение': 'Бензиновые/дизельные', 'Страна': 'США', 'Гарантия': 'Нет' } },
    'oils-antifreeze': { name: 'Антифриз Liqui Moly G11', brand: 'LiquiMoly', price: 1100, discount: 950, chars: { 'Объём': '5 л', 'Цвет': 'Зелёный', 'Тип': 'G11', 'Температура кипения': '108°C', 'Защита от коррозии': 'Да', 'Срок службы': '3 года', 'Концентрат': 'Готовый к применению', 'Страна': 'Германия' } },
    'security-immobilizers': { name: 'Иммобилайзер IGLA', brand: 'IGLA', price: 8900, discount: 7900, chars: { 'Тип': 'Цифровой', 'Защита': 'От угона', 'Способ активации': 'Метка', 'Дистанция считывания': '2 м', 'Режим охраны': 'Автоматический', 'Блокировка двигателя': 'Цифровая', 'Напряжение': '12В', 'Гарантия': '12 мес' } },
    'security-alarms': { name: 'Автосигнализация StarLine A93', brand: 'StarLine', price: 12990, discount: 10990, chars: { 'Тип': 'Двусторонняя', 'Дальность': '2000 м', 'Датчик удара': 'Есть', 'CAN-модуль': 'Да', 'Автозапуск': 'Да', 'Напряжение': '12В', 'Гарантия': '12 мес', 'Доп. функции': 'Bluetooth' } },
    'steering-racks': { name: 'Рулевая рейка Bosch', brand: 'Bosch', price: 18900, discount: 17500, chars: { 'Тип': 'Реечная', 'Передаточное число': '3.2', 'Рабочий ход': '140 мм', 'Обслуживание': 'Необслуживаемая', 'Материал': 'Сталь/алюминий', 'Применение': 'Toyota Corolla', 'Вес': '8 кг', 'Гарантия': '24 мес' } },
    'steering-tie-rods': { name: 'Рулевая тяга TRW', brand: 'TRW', price: 1900, discount: 1700, chars: { 'Длина': '280 мм', 'Резьба': 'M14x1.5', 'Материал': 'Сталь', 'Пыльник': 'В комплекте', 'Шарнир': 'Сферический', 'Сторона': 'Правая', 'Применение': 'Kia Rio', 'Гарантия': '12 мес' } },
    'suspension-shocks': { name: 'Амортизатор KYB', brand: 'KYB', price: 4700, discount: 4200, chars: { 'Тип': 'Масляный', 'Диаметр штока': '22 мм', 'Длина': '520 мм', 'Регулировка жёсткости': 'Нет', 'Применение': 'Передний', 'Кузов': 'Седан', 'Совместимость': 'Ford Focus', 'Гарантия': '24 мес' } },
    'suspension-arms': { name: 'Рычаг подвески Lemforder', brand: 'Bosch', price: 5600, discount: null, chars: { 'Материал': 'Кованая сталь', 'Длина': '350 мм', 'Сайлентблоки': 'В комплекте', 'Шаровая опора': 'Входит', 'Сторона': 'Левая', 'Применение': 'BMW E46', 'Вес': '5.2 кг', 'Гарантия': '18 мес' } },
    'tires': { name: 'Шина летняя Michelin Primacy 4', brand: 'Michelin', price: 8500, discount: 7800, chars: { 'Размер': '205/55 R16', 'Сезон': 'Лето', 'Индекс скорости': 'V', 'Индекс нагрузки': '91', 'Рисунок протектора': 'Асимметричный', 'Топливная экономичность': 'B', 'Сцепление на мокрой дороге': 'A', 'Шум': '69 дБ' } },
    'wheels': { name: 'Диск колесный Continental 6.5x16', brand: 'Continental', price: 7400, discount: null, chars: { 'Диаметр': '16 дюймов', 'Ширина': '6.5J', 'PCD': '5x112', 'Вылет ET': '45', 'Материал': 'Легкосплавный', 'Цвет': 'Серебристый', 'Вес': '8.9 кг', 'Гарантия': '12 мес' } },
    'tools-jacks': { name: 'Домкрат подкатной TRW', brand: 'TRW', price: 3200, discount: 2900, chars: { 'Грузоподъёмность': '2.5 т', 'Высота подхвата': '85-375 мм', 'Тип': 'Гидравлический подкатной', 'Материал': 'Сталь', 'Вес': '12 кг', 'Ручка': '2 секции', 'Колёса': 'Поворотные', 'Гарантия': '12 мес' } },
    'tools-sets': { name: 'Набор инструментов Bosch 108 предметов', brand: 'Bosch', price: 5900, discount: 5400, chars: { 'Количество предметов': '108', 'Привод': '1/4", 1/2"', 'Трещотки': '2 шт', 'Головки': 'Торцевые, свечные', 'Биты': '20 шт', 'Материал': 'Cr-V', 'Кейс': 'Пластиковый', 'Гарантия': '12 мес' } },
    'transmission-clutch': { name: 'Комплект сцепления Sachs', brand: 'Bosch', price: 8700, discount: 7900, chars: { 'Тип': 'Сухое, однодисковое', 'Диаметр диска': '228 мм', 'Ступица': '23 шлица', 'Ведомый диск': 'С пружинами', 'Корзина': 'Диафрагменная', 'Применение': 'VW Golf VI', 'Вес комплекта': '7.2 кг', 'Гарантия': '12 мес' } },
    'transmission-cvjoints': { name: 'ШРУС наружный GKN Loebro', brand: 'TRW', price: 3900, discount: 3500, chars: { 'Тип': 'Наружный', 'Количество шлицов': '27', 'Диаметр': '88 мм', 'Материал': 'Сталь', 'Пыльник': 'В комплекте', 'Смазка': 'Литиевая', 'Применение': 'Renault Logan', 'Гарантия': '12 мес' } },
  };
  const subSlugsOrder = [];
  for (const parent of parentCategories) {
    const subs = subcategoriesMap[parent.slug] || [];
    subs.forEach(sub => subSlugsOrder.push(sub.slug));
  }
  const productInserts = [];
  subSlugsOrder.forEach((slug, i) => {
    const data = productDataBySubSlug[slug];
    if (!data) return;
    const brandId = brandNameToId[data.brand] || brandNameToId['Bosch'];
    const imageUrl = productImages[i] || `${PRODUCTS_BUCKET}/placeholder.jpg`;
    let tags = [];
    if (data.discount) tags.push('Акция');
    if (i % 5 === 0) tags.push('Хит');
    if (i % 7 === 0) tags.push('Новинка');
    productInserts.push({
      category_id: subcategorySlugToId[slug],
      brand_id: brandId,
      sku: `SKU-${slug}-${i+1}`,
      name: data.name,
      description: `Качественный ${data.name.toLowerCase()} для вашего автомобиля.`,
      characteristics: data.chars,
      price: data.price,
      discount_price: data.discount,
      weight_kg: parseFloat((Math.random() * 10).toFixed(2)),
      warranty_months: rand(6, 36),
      images: [imageUrl],
      tags,
      vehicle_compatibility: { brands: [], models: [], years: [] },
      is_active: true,
    });
  });

  const insertedProducts = await insertInBatches('products', productInserts, 2, 1500, 5);
  const productIds = insertedProducts.map(p => p.id);
  console.log('✅ Products seeded.');

  // stocks
  const stockInserts = productIds.map((prodId, i) => ({
    product_id: prodId,
    warehouse_id: warehouseIds[i % warehouseIds.length],
    quantity: rand(1, 50),
    shelf_location: `R${rand(1,20)}-S${rand(1,10)}`,
  }));
  await insertInBatches('product_stocks', stockInserts, 5, 1000, 5);
  console.log('✅ Product stocks seeded.');

  // orders
  const orderInserts = Array.from({ length: 35 }, (_, i) => ({
    user_id: userIds[rand(0, userIds.length-1)],
    warehouse_id: warehouseIds[rand(0, warehouseIds.length-1)],
    payment_method: i % 3 === 0 ? 'card' : 'cash',
    payment_status: 'unpaid',
    delivery_type: i % 2 === 0 ? 'pickup' : 'courier',
    delivery_status: 'processing',
    shipping_cost: i % 3 === 0 ? 350 : 0,
    total_price: parseFloat((rand(500, 8000) + Math.random()).toFixed(2)),
    delivery_address: i % 2 !== 0 ? 'ул. Победы, д. 10, кв. 5' : null,
    customer_name: 'Иван Иванов',
    customer_phone: '+7-900-000-00-00',
    customer_email: 'customer@mail.com',
  }));
  const orderIds = (await insertInBatches('orders', orderInserts, 3, 1200, 5)).map(o => o.id);
  console.log('✅ Orders seeded.');

  // order items
  const itemInserts = orderIds.map((orderId, i) => ({
    order_id: orderId,
    product_id: productIds[i % productIds.length],
    quantity: rand(1, 3),
    unit_price: parseFloat((rand(500, 5000) + Math.random()).toFixed(2)),
  }));
  await insertInBatches('order_items', itemInserts, 5, 1000, 5);
  console.log('✅ Order items seeded.');

  // order status history
  const statusInserts = orderIds.slice(0, 5).map(oid => ({
    order_id: oid,
    delivery_status: 'shipping',
    payment_status: 'paid',
    comment: 'Товар отправлен',
    created_at: new Date(Date.now() - 2*86400000).toISOString(),
  }));
  await insertInBatches('order_status_history', statusInserts, 3, 1000, 5);
  console.log('✅ Order status history seeded.');

  // reviews
  const reviewInserts = Array.from({ length: 35 }, () => ({
    product_id: productIds[rand(0, productIds.length-1)],
    user_id: userIds[rand(0, userIds.length-1)],
    order_id: null,
    rating: rand(3, 5),
    comment: 'Отличный товар!',
    pros: 'Качество',
    cons: 'Дороговато',
    images: [],
    is_approved: true,
    is_verified_purchase: false,
    helpful_count: 0,
    voted_users: [],
  }));
  await insertInBatches('reviews', reviewInserts, 5, 1000, 5);
  console.log('✅ Reviews seeded.');

  // wishlists
  const wishInserts = [];
  for (let i = 0; i < 35; i++) {
    wishInserts.push({
      user_id: userIds[rand(0, userIds.length-1)],
      product_id: productIds[rand(0, productIds.length-1)],
    });
  }
 await insertInBatches('wishlists', wishInserts, 5, 1000, 5, 'id');
  console.log('✅ Wishlists seeded.');

  // return requests
  const returnInserts = Array.from({ length: 5 }, () => ({
    order_id: orderIds[rand(0, orderIds.length-1)],
    user_id: userIds[rand(0, userIds.length-1)],
    reason: 'Не подошёл размер',
    images: [],
    status: 'pending',
  }));
  await insertInBatches('return_requests', returnInserts, 3, 1000, 5);
  console.log('✅ Return requests seeded.');

  console.log('\n🎉 Seed completed successfully!');
}

seed().catch(e => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});