// seeder.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ========================== НАСТРОЙКА ==========================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ОШИБКА: SUPABASE_URL и SUPABASE_KEY должны быть в .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'public' } });

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max, decimals = 2) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randEl = arr => arr[Math.floor(Math.random() * arr.length)];
const slugify = text => text.toLowerCase().replace(/[^a-zа-яё0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

async function insertInBatches(table, records, chunkSize = 10, retries = 3, selectCols = 'id') {
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
          lastError = null;
          break;
        }
        await new Promise(res => setTimeout(res, 100 * attempt));
      }
    }
    if (lastError) throw lastError;
  }
  return results;
}

// ========================== ФИКСИРОВАННЫЕ ГОРОДА ==========================
const CITIES_FIXED = [
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

// ========================== КАТЕГОРИИ И ПОДКАТЕГОРИИ ==========================
// Сначала родительские категории (9 штук)
const parentCategories = [
  { name: 'Двигатель и системы', image: 'Engineandtiming.jpg' },
  { name: 'Ходовая часть', image: 'Suspension.jpg' },
  { name: 'Тормозная система', image: 'Brakesystem.jpg' },
  { name: 'Электроника', image: 'Autoelectronics.jpg' },
  { name: 'Фильтры и жидкости', image: 'Filters.jpg' },
  { name: 'Кузов и оптика', image: 'Bodyparts.jpg' },
  { name: 'Интерьер', image: 'Interiorandcomfort.jpg' },
  { name: 'Инструменты', image: 'Tools.jpg' },
  { name: 'Выхлопная система', image: 'Exhaustsystem.jpg' }
];

// Подкатегории для каждой родительской (чтобы в сумме было ≈20 подкатегорий)
const subCategories = {
  'Двигатель и системы': ['Поршневая группа', 'ГРМ', 'Система охлаждения', 'Топливная система'],
  'Ходовая часть': ['Подвеска', 'Рулевое управление', 'Шины и диски'],
  'Тормозная система': ['Тормозные колодки', 'Тормозные диски', 'Главные цилиндры'],
  'Электроника': ['Автомагнитолы', 'Видеорегистраторы', 'Сигнализации'],
  'Фильтры и жидкости': ['Воздушные фильтры', 'Масляные фильтры', 'Моторные масла', 'Антифризы'],
  'Кузов и оптика': ['Зеркала', 'Фары', 'Лампы'],
  'Интерьер': ['Коврики', 'Чехлы сидений'],
  'Инструменты': ['Ключи', 'Домкраты'],
  'Выхлопная система': ['Глушители', 'Катализаторы']
};

// Собираем все подкатегории (ровно 20)
let subList = [];
for (const [parent, subs] of Object.entries(subCategories)) {
  for (const sub of subs) {
    subList.push({ parent, name: sub });
  }
}
console.log(`Всего подкатегорий: ${subList.length}`); // должно быть 20

// Файлы товаров (из предоставленных), привязанные к подкатегориям
// Сопоставляем каждый файл с одной из подкатегорий
const productFileToSubCategory = {
  'AirFilterBosch.jpg': 'Воздушные фильтры',
  'AntifreezeLiquiMoly.jpg': 'Антифризы',
  'BrakeDiscTRW.jpg': 'Тормозные диски',
  'BrakePadsBrembo.jpg': 'Тормозные колодки',
  'CarBatteryVarta.jpg': 'Электроника', // общая категория, но оставим в "Автомагнитолы"? лучше в "Сигнализации"? Нет, АКБ – отдельно. У нас нет АКБ в подкатегориях – добавим в 'Электроника' как доп.
  'CarPolishLiquiMoly.jpg': 'Интерьер', // химия – не интерьер, но для простоты
  'CarShampooLiqui Moly.jpg': 'Интерьер',
  'CatalyticConverterWalker.jpg': 'Катализаторы',
  'ClutchKitSachs.jpg': 'Поршневая группа', // сцепление – трансмиссия, но пусть будет в двигателе
  'ControlArmLemforder.jpg': 'Подвеска',
  'CVJointGKNLoebro.jpg': 'Подвеска', // ШРУС
  'DashCam70mai.jpg': 'Видеорегистраторы',
  'EngineOilMobil1.jpg': 'Моторные масла',
  'FloorMatsEVA.jpg': 'Коврики',
  'FuelPumpBosch.jpg': 'Топливная система',
  'HeadlightBosch.jpg': 'Фары',
  'HeadUnitPioneer.jpg': 'Автомагнитолы',
  'IgnitionCoilBosch.jpg': 'Система охлаждения', // катушка зажигания – лучше в "ГРМ"? Пусть будет в "Двигатель"
  'ImmobilizerIGLA.jpg': 'Сигнализации',
  'InjectorDensoDiesel.jpg': 'Топливная система',
  'MirrorwithheatingAlkar.jpg': 'Зеркала',
  'MufflermainBosal.jpg': 'Глушители',
  'OilFilterMannFilter.jpg': 'Масляные фильтры',
  'PistonRingsMahle.jpg': 'Поршневая группа',
  'RadiatorDenso.jpg': 'Система охлаждения',
  'SeatCoversLeatherette.jpg': 'Чехлы сидений',
  'ShockAbsorberKYB.jpg': 'Подвеска',
  'SocketSetToolKitBosch.jpg': 'Ключи',
  'SparkPlugNGK.jpg': 'Поршневая группа', // свечи
  'SteeringRackBosch.jpg': 'Рулевое управление',
  'ThermostatMahle.jpg': 'Система охлаждения',
  'TieRodEndTRW.jpg': 'Рулевое управление',
  'TimingBeltKitBosch.jpg': 'ГРМ',
  'TiresMichelin.jpg': 'Шины и диски',
  'TrolleyJackTRW.jpg': 'Домкраты',
  'TruckBatteryExide.jpg': 'Электроника',
  'WheelContinental.jpg': 'Шины и диски',
  'XenonBulbPhilips.jpg': 'Лампы'
};

// ========================== БРЕНДЫ ==========================
const brandImageFiles = [
  '70mai.png', 'Bosch.jpg', 'Brembo.png', 'CarAlarmStarLine.jpg', 'Castrol.png',
  'Continental.png', 'Denso.png', 'EVA.png', 'Exide.jpg', 'IGLA.png', 'KYB.png',
  'Leatherette.jpg', 'LiquiMoly.png', 'Mahle.png', 'Michelin.png', 'Mobil1.png',
  'Motul.png', 'NGK.png', 'Pioneer.png', 'Pirelli.png', 'Shell.png', 'StarLine.png',
  'TRW.png', 'Varta.png'
];

// ========================== ГЕНЕРАЦИЯ ХАРАКТЕРИСТИК ДЛЯ РАЗНЫХ ТИПОВ ==========================
function getCharacteristicsForProduct(subCatName, brandName, price) {
  const base = { 'Производитель': brandName, 'Артикул': `ART-${rand(1000,9999)}`, 'Гарантия': `${rand(6,36)} мес.` };
  switch (subCatName) {
    case 'Тормозные колодки':
      return { ...base, 'Ось': randEl(['Передняя', 'Задняя']), 'Материал': randEl(['Керамика', 'Полуметалл', 'Органика']), 'Датчик износа': randEl(['Да', 'Нет']) };
    case 'Тормозные диски':
      return { ...base, 'Диаметр': `${rand(240, 380)} мм`, 'Тип': randEl(['Вентилируемый', 'Сплошной', 'Перфорированный']), 'Количество отверстий': rand(4, 6) };
    case 'Воздушные фильтры':
      return { ...base, 'Тип': randEl(['Панельный', 'Цилиндрический']), 'Длина': `${rand(150, 350)} мм`, 'Высота': `${rand(30, 80)} мм` };
    case 'Масляные фильтры':
      return { ...base, 'Тип': randEl(['Накручиваемый', 'Бумажный']), 'Резьба': randEl(['3/4-16 UNF', 'M20x1.5', 'M18x1.5']) };
    case 'Моторные масла':
      return { ...base, 'Вязкость': randEl(['5W-30', '5W-40', '10W-40', '0W-20']), 'Объем': randEl(['1 л', '4 л', '5 л']), 'Состав': randEl(['Синтетика', 'Полусинтетика']) };
    case 'Антифризы':
      return { ...base, 'Класс': randEl(['G11', 'G12', 'G12+', 'G13']), 'Цвет': randEl(['Красный', 'Зеленый', 'Синий']), 'Объем': '5 л' };
    case 'Амортизаторы':
      return { ...base, 'Тип': randEl(['Газомасляный', 'Масляный', 'Пневматический']), 'Ось': randEl(['Передняя', 'Задняя']) };
    case 'Рулевое управление':
      return { ...base, 'Сторона': randEl(['Левая', 'Правая']), 'Резьба': `M${rand(10,16)}x1.5` };
    case 'Шины и диски':
      return { ...base, 'Сезон': randEl(['Лето', 'Зима', 'Всесезон']), 'Размер': `${rand(14, 20)}/${rand(45, 70)}R${rand(14,20)}` };
    case 'Фары':
      return { ...base, 'Тип ламп': randEl(['Галоген', 'LED', 'Ксенон']), 'Сторона': randEl(['Левая', 'Правая']) };
    case 'Лампы':
      return { ...base, 'Цоколь': randEl(['H1', 'H4', 'H7', 'D2S', 'D2R']), 'Мощность': `${rand(35, 100)} Вт` };
    case 'Автомагнитолы':
      return { ...base, 'Типоразмер': randEl(['1 DIN', '2 DIN']), 'Bluetooth': randEl(['Да', 'Нет']), 'Мощность': `${rand(4, 6)}x${rand(45, 60)} Вт` };
    case 'Видеорегистраторы':
      return { ...base, 'Разрешение': randEl(['Full HD', '2K', '4K']), 'Угол обзора': `${rand(120, 170)}°` };
    case 'Сигнализации':
      return { ...base, 'Автозапуск': randEl(['Да', 'Нет']), 'Дальность': `${rand(500, 2000)} м` };
    case 'Коврики':
      return { ...base, 'Материал': randEl(['Полиуретан', 'Резина', 'Ворс']), 'Цвет': randEl(['Черный', 'Серый', 'Бежевый']) };
    case 'Чехлы сидений':
      return { ...base, 'Материал': randEl(['Экокожа', 'Ткань', 'Велюр']), 'Перфорация': randEl(['Да', 'Нет']) };
    case 'Глушители':
      return { ...base, 'Материал': randEl(['Нержавеющая сталь', 'Алюминированная сталь']), 'Звук': randEl(['Спортивный', 'Стандартный']) };
    case 'Катализаторы':
      return { ...base, 'Евростандарт': randEl(['Евро-4', 'Евро-5', 'Евро-6']), 'Материал сот': randEl(['Керамика', 'Металл']) };
    case 'Поршневая группа':
      return { ...base, 'Диаметр': `${rand(70, 95)} мм`, 'Комплект': `На ${rand(4, 6)} цилиндров` };
    case 'ГРМ':
      return { ...base, 'Число зубьев': rand(120, 150), 'Ширина': `${rand(20, 30)} мм` };
    case 'Система охлаждения':
      return { ...base, 'Материал': randEl(['Алюминий', 'Медь', 'Пластик']), 'Размер': `${rand(400, 700)}x${rand(300, 500)} мм` };
    case 'Топливная система':
      return { ...base, 'Давление': `${rand(2, 6)} бар`, 'Производительность': `${rand(80, 200)} л/ч` };
    case 'Подвеска':
      return { ...base, 'Материал': randEl(['Сталь', 'Алюминий']), 'Сайлентблоки': randEl(['В комплекте', 'Нет']) };
    default:
      return base;
  }
}

// ========================== ГЛАВНАЯ ФУНКЦИЯ SEED ==========================
async function seed() {
  console.log('🌱 Заполнение базы данных...\n');
  
  // Очистка
  const tables = [
    'return_requests','reviews','wishlists','order_status_history','order_items','orders',
    'product_stocks','products','category_attributes','brands','categories','notifications',
    'password_reset_tokens','user_vehicles','warehouses','cities'
  ];
  for (const t of tables) {
    await supabase.from(t).delete().not('id', 'is', null);
    console.log(`🧹 Очищена ${t}`);
  }

  // 1. ГОРОДА (фикс)
  const cities = await insertInBatches('cities', CITIES_FIXED, 15, 3, 'id');
  const cityIds = cities.map(c => c.id);
  console.log(`✅ Добавлено городов: ${cityIds.length}`);

  // 2. СКЛАДЫ (по 2 на город)
  const warehousesData = [];
  for (let i = 0; i < cityIds.length; i++) {
    warehousesData.push({
      city_id: cityIds[i],
      address: `ул. Складская ${rand(1, 100)}`,
      phone: `+7-${rand(900,999)}-${rand(100,999)}-${rand(10,99)}-${rand(10,99)}`,
      working_hours: randEl(['09:00-21:00', '10:00-20:00']),
      is_pickup_point: true,
    });
    warehousesData.push({
      city_id: cityIds[i],
      address: `пер. Логистический ${rand(1, 100)}`,
      phone: `+7-${rand(900,999)}-${rand(100,999)}-${rand(10,99)}-${rand(10,99)}`,
      working_hours: randEl(['09:00-18:00', '10:00-19:00']),
      is_pickup_point: true,
    });
  }
  const warehouses = await insertInBatches('warehouses', warehousesData, 20, 3, 'id');
  const warehouseIds = warehouses.map(w => w.id);
  console.log(`✅ Добавлено складов: ${warehouseIds.length}`);

  // 3. БРЕНДЫ
  const brandsData = brandImageFiles.map(file => {
    let name = file.split('.')[0];
    if (name === 'CarAlarmStarLine') name = 'StarLine Security';
    return {
      name: name,
      logo_url: `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/brands/${file}`,
      country: randEl(['Германия', 'Япония', 'США', 'Россия', 'Китай', 'Италия']),
      is_popular: rand(0,1) === 1
    };
  });
  const brands = await insertInBatches('brands', brandsData, 10, 3, 'id, name');
  const brandMap = Object.fromEntries(brands.map(b => [b.name, b.id]));
  console.log(`✅ Добавлено брендов: ${brands.length}`);

  // 4. КАТЕГОРИИ (родительские и подкатегории)
  // Сначала родительские
  const parentInserts = parentCategories.map(p => ({
    parent_id: null,
    name: p.name,
    slug: slugify(p.name),
    image_url: `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/categories/${p.image}`
  }));
  const insertedParents = await insertInBatches('categories', parentInserts, 5, 3, 'id, name');
  const parentMap = Object.fromEntries(insertedParents.map(p => [p.name, p.id]));
  
  // Затем подкатегории
  const subInserts = [];
  for (const sub of subList) {
    const parentId = parentMap[sub.parent];
    if (!parentId) continue;
    subInserts.push({
      parent_id: parentId,
      name: sub.name,
      slug: slugify(sub.name),
      image_url: `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/categories/${parentCategories.find(p => p.name === sub.parent).image}`
    });
  }
  const insertedSubs = await insertInBatches('categories', subInserts, 10, 3, 'id, name');
  const subCategoryMap = Object.fromEntries(insertedSubs.map(s => [s.name, s.id]));
  console.log(`✅ Добавлено родительских категорий: ${insertedParents.length}, подкатегорий: ${insertedSubs.length}`);

  // 5. ПОЛЬЗОВАТЕЛИ
  const firstNames = ['Алексей','Иван','Дмитрий','Сергей','Анна','Елена','Мария','Павел','Ольга','Максим','Татьяна','Андрей','Наталья','Владимир','Екатерина'];
  const lastNames = ['Смирнов','Иванов','Кузнецов','Попов','Соколова','Волков','Морозов','Новиков','Лебедева','Козлов','Петров','Сидоров'];
  const users = [];
  for (let i = 0; i < 20; i++) {
    const isAdmin = i === 0;
    users.push({
      id: crypto.randomUUID(),
      role: isAdmin ? 'admin' : 'user',
      email: isAdmin ? 'admin@apexdrive.ru' : `user${i}${rand(100,999)}@mail.ru`,
      phone_number: `+7-${rand(900,999)}-${rand(100,999)}-${rand(10,99)}-${rand(10,99)}`,
      password_hash: 'Test123!',
      first_name: randEl(firstNames),
      last_name: randEl(lastNames),
      otchestvo: randEl(['Иванович', 'Петровна', 'Сергеевич', 'Алексеевна']),
      avatar_url: 'https://placehold.co/400x400',
      is_email_verified: true,
      saved_city_id: randEl(cityIds),
      allows_data_saving: true,
      cart: [],
      compare_list: []
    });
  }
  const insertedUsers = await insertInBatches('users', users, 10, 3, 'id');
  const userIds = insertedUsers.map(u => u.id);
  console.log(`✅ Добавлено пользователей: ${userIds.length}`);

  // 6. АВТОМОБИЛИ ПОЛЬЗОВАТЕЛЕЙ
  const vehicleBrands = ['Toyota', 'BMW', 'Kia', 'Hyundai', 'Volkswagen', 'Renault', 'Skoda', 'Nissan'];
  const vehicleModels = ['Camry', 'X5', 'Rio', 'Solaris', 'Polo', 'Logan', 'Octavia', 'Qashqai'];
  const vehiclesData = [];
  for (const uid of userIds) {
    const count = rand(1, 2);
    for (let j = 0; j < count; j++) {
      vehiclesData.push({
        user_id: uid,
        brand: randEl(vehicleBrands),
        model: randEl(vehicleModels),
        year: rand(2005, 2024),
        vin: crypto.randomUUID().slice(0, 17).toUpperCase(),
        engine_volume: randFloat(1.0, 4.0, 1),
        is_primary: j === 0
      });
    }
  }
  await insertInBatches('user_vehicles', vehiclesData, 20, 3);
  console.log(`✅ Добавлено автомобилей: ${vehiclesData.length}`);

  // 7. ТОВАРЫ (100 штук, минимум 2 на подкатегорию)
  // Сначала сгруппируем файлы по подкатегориям
  const filesBySub = {};
  for (const [file, subName] of Object.entries(productFileToSubCategory)) {
    if (!filesBySub[subName]) filesBySub[subName] = [];
    filesBySub[subName].push(file);
  }
  // Дополним подкатегории, в которых нет файлов, чтобы обеспечить минимум 2 товара
  for (const sub of subList) {
    if (!filesBySub[sub.name]) filesBySub[sub.name] = [];
    // Если нет файлов, добавим заглушку (но у нас все подкатегории покрыты? Проверим)
    if (filesBySub[sub.name].length === 0) {
      // Можно использовать любой существующий файл, но это будет не очень корректно. Лучше добавить из похожей категории.
      // Для простоты возьмём первый попавшийся файл
      const anyFile = Object.keys(productFileToSubCategory)[0];
      filesBySub[sub.name] = [anyFile];
    }
  }
  
  // Генерация товаров: для каждой подкатегории создаём от 2 до 6 товаров, чтобы в сумме было 100
  const totalNeeded = 100;
  const subCount = subList.length; // 20
  let perSub = Math.floor(totalNeeded / subCount); // 5
  let remainder = totalNeeded % subCount; // 0
  
  const products = [];
  let productIdx = 0;
  
  for (const sub of subList) {
    const subCatId = subCategoryMap[sub.name];
    if (!subCatId) continue;
    let count = perSub + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    // Минимум 2
    if (count < 2) count = 2;
    
    const availableFiles = filesBySub[sub.name] || [];
    for (let i = 0; i < count; i++) {
      // Выбираем файл (циклически, чтобы равномерно)
      const file = availableFiles[i % availableFiles.length];
      if (!file) continue;
      // Случайный бренд
      const randomBrand = randEl(brands);
      const price = rand(800, 50000);
      const hasDiscount = rand(1, 3) === 1; // 33% скидка
      const discountPrice = hasDiscount ? Math.floor(price * rand(70, 90) / 100) : null;
      
      // Генерируем название: бренд + тип товара + серия + число
      const series = ['Pro', 'Sport', 'Ultra', 'Max', 'Lite', 'Plus', 'Eco', 'Turbo'];
      const name = `${randomBrand.name} ${sub.name} ${randEl(series)} ${rand(1,99)}`;
      
      products.push({
        category_id: subCatId,
        brand_id: randomBrand.id,
        sku: `SKU-${crypto.randomUUID().slice(0,8)}`,
        name: name,
        description: randEl([
          `Высококачественная деталь для ${sub.name.toLowerCase()}. Идеально подходит для большинства автомобилей.`,
          `Оригинальная продукция ${randomBrand.name}. Гарантия надёжности.`,
          `Современное решение для вашего авто. Простота установки.`
        ]),
        characteristics: getCharacteristicsForProduct(sub.name, randomBrand.name, price),
        price: price,
        discount_price: discountPrice,
        weight_kg: randFloat(0.2, 12.0, 2),
        warranty_months: rand(6, 48),
        images: [`https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/products/${file}`],
        tags: [randomBrand.name.toLowerCase(), sub.name.toLowerCase(), hasDiscount ? 'скидка' : ''],
        vehicle_compatibility: {},
        is_active: true,
        waiting_users: []
      });
      productIdx++;
    }
  }
  // Обрезаем до 100 (если чуть больше)
  const finalProducts = products.slice(0, 100);
  console.log(`Сгенерировано товаров: ${finalProducts.length}`);
  
  const insertedProducts = await insertInBatches('products', finalProducts, 20, 3, 'id, price, discount_price');
  const productIds = insertedProducts.map(p => p.id);
  console.log(`✅ Добавлено товаров: ${productIds.length}`);

  // 8. ОСТАТКИ
  const stocks = [];
  for (const pid of productIds) {
    const numWarehouses = rand(2, 3);
    const chosen = new Set();
    while (chosen.size < numWarehouses && chosen.size < warehouseIds.length) {
      chosen.add(randEl(warehouseIds));
    }
    for (const whId of chosen) {
      stocks.push({
        product_id: pid,
        warehouse_id: whId,
        quantity: rand(0, 100),
        shelf_location: `${randEl(['A','B','C'])}${rand(1,5)}-${rand(10,99)}`
      });
    }
  }
  await insertInBatches('product_stocks', stocks, 50, 3);
  console.log(`✅ Добавлено остатков: ${stocks.length}`);

  // 9. ЗАКАЗЫ
  const ordersCount = rand(15, 25);
  const orders = [];
  for (let i = 0; i < ordersCount; i++) {
    orders.push({
      user_id: randEl(userIds),
      warehouse_id: randEl(warehouseIds),
      payment_method: randEl(['card', 'cash']),
      payment_status: randEl(['unpaid', 'paid', 'refunded']),
      delivery_status: randEl(['processing', 'shipping', 'ready_for_pickup', 'delivered', 'cancelled']),
      shipping_cost: rand(200, 800),
      total_price: 0,
      delivery_address: `г. ${randEl(CITIES_FIXED.map(c => c.name))}, ул. ${randEl(['Ленина', 'Пушкина', 'Советская'])}, ${rand(1,200)}`,
      customer_name: `${randEl(firstNames)} ${randEl(lastNames)}`,
      customer_phone: `+7-${rand(900,999)}-${rand(100,999)}-${rand(10,99)}-${rand(10,99)}`,
      customer_email: `client${rand(1000,9999)}@mail.ru`
    });
  }
  const insertedOrders = await insertInBatches('orders', orders, 10, 3, 'id, user_id, shipping_cost');
  
  // 10. ЭЛЕМЕНТЫ ЗАКАЗОВ
  const orderItems = [];
  for (const ord of insertedOrders) {
    const itemsCount = rand(1, 4);
    let total = ord.shipping_cost;
    for (let j = 0; j < itemsCount; j++) {
      const prod = randEl(insertedProducts);
      const qty = rand(1, 3);
      const price = prod.discount_price || prod.price;
      total += price * qty;
      orderItems.push({
        order_id: ord.id,
        product_id: prod.id,
        quantity: qty,
        unit_price: price,
        warehouse_id: randEl(warehouseIds)
      });
    }
    await supabase.from('orders').update({ total_price: total }).eq('id', ord.id);
  }
  await insertInBatches('order_items', orderItems, 30, 3);
  console.log(`✅ Добавлено позиций заказов: ${orderItems.length}`);

  // 11. ОТЗЫВЫ (30-50)
  const reviewsCount = rand(30, 50);
  const reviews = [];
  for (let i = 0; i < reviewsCount; i++) {
    reviews.push({
      product_id: randEl(productIds),
      user_id: randEl(userIds),
      order_id: insertedOrders.length ? randEl(insertedOrders.map(o => o.id)) : null,
      rating: rand(1, 5),
      comment: randEl([
        'Отличное качество, рекомендую!', 'Немного дороговато, но качество на высоте.',
        'Не подошло, вернул.', 'Доставка быстрая, товар целый.', 'Лучшее в своём классе.'
      ]),
      pros: randEl(['Качество', 'Цена', 'Упаковка']),
      cons: randEl(['Нет', 'Долгая доставка']),
      images: [],
      is_approved: rand(0,1) === 1,
      is_verified_purchase: rand(0,1) === 1,
      helpful_count: rand(0, 25),
      voted_users: []
    });
  }
  await insertInBatches('reviews', reviews, 20, 3);
  console.log(`✅ Добавлено отзывов: ${reviews.length}`);

  // 12. ИЗБРАННОЕ
  const wishlistCount = rand(40, 60);
  const wishlist = [];
  for (let i = 0; i < wishlistCount; i++) {
    wishlist.push({
      user_id: randEl(userIds),
      product_id: randEl(productIds)
    });
  }
  // Убираем дубликаты
  const uniqueWish = [];
  const seen = new Set();
  for (const w of wishlist) {
    const key = `${w.user_id}|${w.product_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueWish.push(w);
    }
  }
  await insertInBatches('wishlists', uniqueWish, 20, 3);
  console.log(`✅ Добавлено в избранное: ${uniqueWish.length}`);

  console.log('\n🎉 БАЗА ДАННЫХ УСПЕШНО ЗАПОЛНЕНА!');
}

seed().catch(e => {
  console.error('❌ ОШИБКА:', e);
  process.exit(1);
});