import { defineStore } from 'pinia';
import axios from 'axios';

// Базовый URL из .env (если есть), иначе пустая строка для относительных запросов
const API_URL = import.meta.env.VITE_API_URL || '';

export const useAppStore = defineStore('app', {
  state: () => ({
    city: localStorage.getItem('user_city') || 'Москва',
    isCityConfirmed: !!localStorage.getItem('user_city'),
    
    // Новое: Глобальное состояние темы (светлая/темная)
    theme: localStorage.getItem('app_theme') || 'light' 
  }),

  actions: {
    // ==========================================
    // БЛОК: УПРАВЛЕНИЕ ТЕМАМИ (Dark/Light Mode)
    // ==========================================

    // 1. Инициализация темы при загрузке приложения
    initTheme() {
      // Если в localStorage пусто - проверяем системные настройки ОС пользователя
      if (!localStorage.getItem('app_theme')) {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.theme = prefersDark ? 'dark' : 'light';
      }
      this.applyTheme(this.theme);
    },

    // 2. Применение класса к HTML документу (для Tailwind CSS)
    applyTheme(themeName) {
      if (themeName === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },

    // 3. Переключение темы (будет вызываться из навбара)
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('app_theme', this.theme);
      this.applyTheme(this.theme);
    },

    // ==========================================
    // БЛОК: УПРАВЛЕНИЕ ГОРОДОМ
    // ==========================================

    // 4. Установка города вручную
    async setCity(newCity) {
      this.city = newCity;
      this.isCityConfirmed = true;
      localStorage.setItem('user_city', newCity);

      const userId = localStorage.getItem('user_id');
      
      // По новой структуре БД, если пользователь вошел, 
      // мы сохраняем город напрямую в профиль (связь saved_city_id)
      if (userId) {
        try {
          await axios.put(`/api/users/profile/${userId}`, { 
            city: newCity 
          });
        } catch (e) {
          console.error('Ошибка сохранения города в профиль БД:', e.message);
        }
      }
    },

    // 5. Синхронизация при входе (Умное извлечение из новой БД)
async syncCity() {
  const userId = localStorage.getItem('user_id');
  if (userId) {
    try {
      const res = await axios.get(`/api/users/profile/${userId}`);
      if (res.data.cities?.name) {
        this.city = res.data.cities.name;
        this.isCityConfirmed = true;
        localStorage.setItem('user_city', this.city);
        return;
      }
    } catch (e) { console.error('Профиль пока недоступен'); }
  }

  // Если не авторизован или ошибка профиля - ставим дефолт
  if (!this.isCityConfirmed) {
    try {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if (data && data.success) {
        this.city = data.city || 'Москва';
      } else {
        this.city = 'Москва'; // Фолбэк если лимит исчерпан
      }
    } catch (e) {
      this.city = 'Москва'; // Фолбэк при 403 или ошибке сети
    }
  }
}
  }
});