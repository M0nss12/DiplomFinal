import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'

// Подключаем глобальные стили (переменные тем и базу)
import './assets/main.css';

import App from './App.vue'
import router from './router'

// 1. ОПРЕДЕЛЕНИЕ URL БЭКЕНДА
// Используем переменную из .env (Vite) или автоматический фолбэк
const API_URL = import.meta.env.VITE_API_URL || (
  window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : 'https://diplomv2-0.onrender.com'
);

axios.defaults.baseURL = API_URL;

// 2. НАСТРОЙКА ПЕРЕХВАТЧИКОВ (INTERCEPTORS)
// Чтобы наш сервер всегда получал ID пользователя для логов действий
axios.interceptors.request.use(config => {
  const userId = localStorage.getItem('user_id');
  const userName = localStorage.getItem('user_first_name') || localStorage.getItem('user_name');
  const role = localStorage.getItem('role');

  if (userId) config.headers['x-user-id'] = userId;
  if (userName) config.headers['x-user-name'] = encodeURIComponent(userName);
  if (role) config.headers['x-user-role'] = role;
  
  // Добавляем секретный ключ для админ-запросов, если он есть в .env
  if (import.meta.env.VITE_ADMIN_SECRET) {
    config.headers['x-admin-key'] = import.meta.env.VITE_ADMIN_SECRET;
  }

  return config;
}, error => {
  return Promise.reject(error);
});

// 3. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

console.log(`🚀 ApexDrive Frontend запущен. API: ${API_URL}`);