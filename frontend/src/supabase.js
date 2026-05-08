import { createClient } from '@supabase/supabase-js';

// Используем переменные из .env (с префиксом VITE_)
// Если их нет, используем твои текущие значения как фолбэк
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gptwjxibdxovggkfmfpl.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bs9DvnkU75l3SPWLdvfFVQ_2wPTNRvj';

if (!supabaseKey) {
    console.error("🚨 ОШИБКА: Supabase Anon Key не найден в переменных окружения!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);