// backend/db-check.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Ошибка: Переменные SUPABASE_URL или SUPABASE_KEY не найдены в .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log("📡 Проверка соединения с Supabase...");
    console.log("URL:", supabaseUrl);
    
    // Пробуем вставить тестовую запись в таблицу cities
    const testCityName = "Тест-Сити-" + Math.floor(Math.random() * 1000);
    
    const { data, error } = await supabase
        .from('cities')
        .insert([{ name: testCityName, region: "Тестовый регион" }])
        .select();

    if (error) {
        console.error("❌ Ошибка при вставке в БД:", error.message);
        console.error("Детали:", error.details);
        console.error("Код ошибки:", error.code);
    } else {
        console.log("✅ Успех! Запись создана:", data);
        
        // Сразу удалим её, чтобы не мусорить
        await supabase.from('cities').delete().eq('id', data[0].id);
        console.log("🗑️ Тестовая запись удалена.");
    }
}

testConnection();