// seeder.js (pg direct connection, Supabase Storage URLs)
// Usage: node seeder.js
require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------------------------------------------------------------------
// Универсальная пакетная вставка через параметризованный SQL
// ---------------------------------------------------------------------------
async function insertRows(table, rows, returningCol = 'id', onConflict = '') {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  const values = [];
  const placeholders = rows.map((row, i) => {
    const vals = keys.map((k, j) => `$${i * keys.length + j + 1}`);
    values.push(...keys.map(k => {
      const v = row[k];
      // Преобразуем объекты/массивы в JSON-строку
      return (typeof v === 'object' && v !== null && !(v instanceof Date))
        ? JSON.stringify(v)
        : v;
    }));
    return `(${vals.join(', ')})`;
  });

  let query = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES ${placeholders.join(', ')}
    ${onConflict ? `ON CONFLICT ${onConflict} DO NOTHING` : ''}
    RETURNING ${returningCol};
  `;

  try {
    const res = await pool.query(query, values);
    // Преобразуем результат в массив объектов (каждый объект содержит запрошенные колонки)
    if (returningCol.includes(',')) {
      const cols = returningCol.split(',').map(c => c.trim());
      return res.rows.map(r => {
        const obj = {};
        cols.forEach(c => obj[c] = r[c]);
        return obj;
      });
    } else {
      return res.rows.map(r => r[returningCol]);
    }
  } catch (err) {
    // Для конфликтов ON CONFLICT DO NOTHING ошибки не будет,
    // но если конфликт без обработки – оборачиваем
    if (err.code === '23505') {
      console.warn(`⚠️  Конфликт уникальности в ${table}, пропускаем дубликат.`);
      return []; // возвращаем пустой массив, если обрабатываем
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Очистка всех таблиц
// ---------------------------------------------------------------------------
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
    await pool.query(`DELETE FROM ${table}`);
  }
  console.log('All tables cleared.\n');
}

// ---------------------------------------------------------------------------
// Основной seed
// ---------------------------------------------------------------------------
const BASE_URL = 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public';
const PRODUCTS_BUCKET = `${BASE_URL}/products`;
const CATEGORIES_BUCKET = `${BASE_URL}/categories`;
const BRANDS_BUCKET = `${BASE_URL}/brands`;

async function seed() {
  console.log('🌱 Starting seed...\n');
  await clearDatabase();

  // =========================== 1. CITIES (50) ===============================
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
  const cityIds = await insertRows('cities', citiesData);
  console.log('✅ Cities seeded.');

  // =========================== 2. WAREHOUSES (35) ===========================
  const warehousesData = Array.from({ length: 35 }, (_, i) => ({
    city_id: cityIds[i % cityIds.length],
    address: `ул. Складская, д. ${i + 1}`,
    phone: `+7-999-${String(100 + i).padStart(3, '0')}-${String(10 + i).padStart(2, '0')}-${String((10 + i * 3) % 100).padStart(2, '0')}`,
    working_hours: '09:00-21:00',
    is_pickup_point: true,
  }));
  const warehouseIds = await insertRows('warehouses', warehousesData);
  console.log('✅ Warehouses seeded.');

  // =========================== 3. USERS (35 + admin) ========================
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
      avatar_url: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/avatars/1.png',
      is_email_verified: true,
      saved_city_id: cityIds[rand(0, cityIds.length - 1)],
      allows_data_saving: false,
      cart: [],
      compare_list: [],
    };
  });
  // admin
  usersData.push({
    id: crypto.randomUUID(),
    role: 'admin',
    email: 'admin@apexdrive.ru',
    phone_number: '+7-900-999-99-99',
    password_hash: 'Admin123!',
    first_name: 'Админ',
    last_name: 'Главный',
    otchestvo: 'Админович',
    avatar_url: 'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/avatars/1.png',
    is_email_verified: true,
    saved_city_id: cityIds[0],
    allows_data_saving: false,
    cart: [],
    compare_list: [],
  });
  const userIds = await insertRows('users', usersData);
  console.log('✅ Users seeded.');

  // =========================== 4. USER VEHICLES (35) ========================
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
  await insertRows('user_vehicles', vehiclesData);
  console.log('✅ User vehicles seeded.');

  // =========================== 5. PASSWORD RESET TOKENS (5) =================
  const tokenData = Array.from({ length: 5 }, () => ({
    user_id: userIds[rand(0, userIds.length - 1)],
    token: crypto.randomUUID(),
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    used: false,
  }));
  await insertRows('password_reset_tokens', tokenData);
  console.log('✅ Password reset tokens seeded.');

  // =========================== 6. NOTIFICATIONS (30) ========================
  const notifTypes = ['order','system','promo','stock'];
  const notifData = Array.from({ length: 30 }, (_, i) => ({
    user_id: userIds[rand(0, userIds.length - 1)],
    type: notifTypes[i % 4],
    title: `Уведомление ${i+1}`,
    message: `Сообщение уведомления ${i+1}`,
    is_read: i % 3 === 0,
  }));
  await insertRows('notifications', notifData);
  console.log('✅ Notifications seeded.');

  // =========================== 7. CATEGORIES (20 родительских + 40 подкатегорий)
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
  const parentInserts = parentCategories.map(c => ({
    parent_id: null,
    name: c.name,
    slug: c.slug,
    image_url: c.image,
  }));
  const parentRows = await insertRows('categories', parentInserts, 'id, slug');
  const parentIdBySlug = {};
  parentRows.forEach(row => { parentIdBySlug[row.slug] = row.id; });

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
  const subcatRows = await insertRows('categories', subCatInserts, 'id, slug');
  const subcategorySlugToId = {};
  subcatRows.forEach(row => { subcategorySlugToId[row.slug] = row.id; });
  console.log('✅ Categories and subcategories seeded.');

  // =========================== 8. CATEGORY ATTRIBUTES =======================
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
        code: attr.code,
        label: attr.label,
        type: attr.type,
        unit: attr.unit,
        sort_order: attr.sort_order,
        is_filterable: true,
        is_required: false,
        options_json: attr.options_json || '[]',
      });
    });
  });
  await insertRows('category_attributes', attrInserts);
  console.log('✅ Category attributes seeded.');

  // =========================== 9. BRANDS (24) ===============================
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
  const brandInserts = brandsData.map(b => ({
    name: b.name,
    logo_url: `${BRANDS_BUCKET}/${b.logo}`,
    country: b.country,
    is_popular: b.popular,
  }));
  const brandRows = await insertRows('brands', brandInserts, 'id, name');
  const brandNameToId = {};
  brandRows.forEach(b => { brandNameToId[b.name] = b.id; });
  console.log('✅ Brands seeded.');

  // =========================== 10. PRODUCTS (40) ============================
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
  // Словарь характеристик (сокращён для примера – возьми тот же, что и раньше)
  const productDataBySubSlug = { /* ... такой же, как в предыдущей версии ... */ };

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
      characteristics: data.chars,         // объект, insertRows преобразует в JSON
      price: data.price,
      discount_price: data.discount,
      weight_kg: parseFloat((Math.random() * 10).toFixed(2)),
      warranty_months: rand(6, 36),
      images: [imageUrl],                  // массив
      tags,                                // массив строк
      vehicle_compatibility: { brands: [], models: [], years: [] },
      is_active: true,
    });
  });
  const productIds = await insertRows('products', productInserts);
  console.log('✅ Products seeded.');

  // =========================== 11. PRODUCT STOCKS (40) ======================
  // Гарантируем уникальную пару product_id + warehouse_id
  const stockInserts = productIds.map((prodId, i) => ({
    product_id: prodId,
    warehouse_id: warehouseIds[i % warehouseIds.length],
    quantity: rand(1, 50),
    shelf_location: `R${rand(1,20)}-S${rand(1,10)}`,
  }));
  // Используем ON CONFLICT DO NOTHING на случай случайных совпадений (хотя у нас уникально)
  await pool.query(`
    INSERT INTO product_stocks (product_id, warehouse_id, quantity, shelf_location)
    VALUES ${stockInserts.map((_, i) => `($${i*4+1}, $${i*4+2}, $${i*4+3}, $${i*4+4})`).join(', ')}
    ON CONFLICT (product_id, warehouse_id) DO NOTHING
  `, stockInserts.flatMap(s => [s.product_id, s.warehouse_id, s.quantity, s.shelf_location]));
  console.log('✅ Product stocks seeded.');

  // =========================== 12-17: остальные таблицы =====================
  // ... аналогично вставляем orders, order_items, order_status_history,
  // reviews, wishlists (с ON CONFLICT), return_requests

  console.log('\n🎉 Seed completed successfully!');
  await pool.end();
}

seed().catch(e => {
  console.error('❌ Seed failed:', e);
  pool.end();
  process.exit(1);
});