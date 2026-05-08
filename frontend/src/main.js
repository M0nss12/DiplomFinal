import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from 'axios'

// Подключаем глобальные стили
import './assets/main.css';

import App from './App.vue'
import router from './router'

/**
 * 1. НАСТРОЙКА AXIOS
 * В твоей архитектуре (фронтенд внутри папки public бэкенда) 
 * baseURL ОБЯЗАТЕЛЬНО должен быть пустой строкой.
 * Это делает все запросы относительными.
 */
axios.defaults.baseURL = ''; 

/**
 * 2. НАСТРОЙКА ПЕРЕХВАТЧИКОВ (INTERCEPTORS)
 * Добавляем заголовки к каждому запросу автоматически для системы логирования
 */
axios.interceptors.request.use(config => {
  const userId = localStorage.getItem('user_id');
  const userName = localStorage.getItem('user_first_name') || localStorage.getItem('user_name');
  const role = localStorage.getItem('role');

  // Добавляем метаданные пользователя в заголовки для server.js
  if (userId) config.headers['x-user-id'] = userId;
  if (userName) config.headers['x-user-name'] = encodeURIComponent(userName);
  if (role) config.headers['x-user-role'] = role;

  // Передаем секретный ключ админа для доступа к защищенным маршрутам API
  // Vite подставит его из твоего .env при сборке (build)
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

// Динамический вывод информации в консоль
const isDev = window.location.hostname === 'localhost';
console.log(`🚀 ApexDrive Frontend запущен в режиме: ${isDev ? 'Разработка' : 'Продакшн'}`);
console.log(`📡 Запросы отправляются на: ${window.location.origin}`);