<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAppStore } from '@/stores/appStore';
import { useCartStore } from '@/stores/cartStore';

const appStore = useAppStore();
const cartStore = useCartStore();

onMounted(() => {
  // 1. Применяем тему (светлая/темная) из настроек
  appStore.initTheme();

  // 2. Определяем город пользователя (из профиля или по IP)
  appStore.syncCity();

  // 3. Если пользователь авторизован — подтягиваем его корзину из новой БД
  if (localStorage.getItem('user_id')) {
    cartStore.syncCartFromDB();
  }
});
</script>

<template>
  <div class="app-wrapper">
    <!-- ПАНЕЛЬ НАВИГАЦИИ -->
    <Navbar />

    <!-- ОСНОВНОЙ КОНТЕНТ С АНИМАЦИЕЙ ПЕРЕХОДА -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ОБЩИЙ ПОДВАЛ (FOOTER) -->
    <footer class="main-footer">
      <div class="footer-container">
        
        <!-- Секция 1: Брендинг -->
        <div class="footer-section about">
          <router-link to="/" class="footer-logo">
            <strong>Apex</strong>Drive
          </router-link>
          <p class="footer-desc">
            Ваш надежный партнер в мире автозапчастей. Интеллектуальная логистика, 
            прямые поставки и гарантия качества для каждого автомобиля.
          </p>
          <div class="social-links">
            <a href="https://t.me/M0nss" target="_blank" title="Telegram" class="glass-icon">TG</a>
            <a href="https://vk.com/mr.monss" target="_blank" title="VK" class="glass-icon">VK</a>
          </div>
        </div>

        <!-- Секция 2: Навигация -->
        <div class="footer-section links">
          <h4>Магазин</h4>
          <router-link to="/catalog">Каталог товаров</router-link>
          <router-link to="/catalog">Популярные бренды</router-link>
          <router-link to="/about">Акции и скидки</router-link>
        </div>

        <!-- Секция 3: Инфо -->
        <div class="footer-section links">
          <h4>Информация</h4>
          <router-link to="/about">О компании</router-link>
          <router-link to="/contacts">Доставка и оплата</router-link>
          <router-link to="/notifications">Уведомления</router-link>
        </div>

        <!-- Секция 4: Контакты -->
        <div class="footer-section contacts">
          <h4>Поддержка</h4>
          <a href="tel:+79991234567" class="footer-phone">+7 (999) 123-45-67</a>
          <a href="mailto:monsschogath@gmail.com" class="footer-email">support@apexdrive.ru</a>
          <p class="work-time">Ежедневно: 09:00 — 21:00</p>
        </div>

      </div>

      <!-- Нижняя плашка -->
      <div class="footer-bottom">
        <div class="bottom-content">
          <p>&copy; 2026 ApexDrive. Все права защищены.</p>
          <div class="legal-links">
            <router-link to="/about">Политика конфиденциальности</router-link>
            <router-link to="/about">Публичная оферта</router-link>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
/* ==========================================================================
   ГЛОБАЛЬНЫЕ СТИЛИ ПРИЛОЖЕНИЯ
   ========================================================================== */
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: rgba(37, 99, 235, 0.1);
  --accent: #0ea5e9;
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --text-main: #0f172a;
  --text-muted: #64748b;
  --bg-body: #f8fafc;
  --bg-card: #ffffff;
  --border-color: #e2e8f0;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --transition: all 0.3s ease;
}

/* Стили для ТЕМНОЙ ТЕМЫ */
html.dark {
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --bg-body: #0f172a;
  --bg-card: #1e293b;
  --border-color: #334155;
}

body {
  margin: 0;
  font-family: 'Inter', -apple-system, sans-serif;
  background-color: var(--bg-body);
  color: var(--text-main);
  transition: background-color 0.3s ease, color 0.3s ease;
}

.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
}

/* АНИМАЦИЯ ПЕРЕХОДА СТРАНИЦ */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* ==========================================================================
   ФУТЕР
   ========================================================================== */
.main-footer {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border-color);
  padding-top: 60px;
  margin-top: 80px;
}

.footer-container {
  max-width: 1440px;
  margin: 0 auto;
  width: 92%;
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1.2fr;
  gap: 40px;
  padding-bottom: 50px;
}

.footer-section h4 {
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 25px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.footer-logo {
  font-size: 2rem;
  text-decoration: none;
  color: var(--text-main);
  display: block;
  margin-bottom: 20px;
}
.footer-logo strong {
  color: var(--primary);
  font-weight: 900;
}
.footer-desc {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 0.95rem;
  margin-bottom: 25px;
}

.footer-section.links {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.footer-section.links a {
  text-decoration: none;
  color: var(--text-muted);
  font-size: 0.95rem;
  transition: var(--transition);
}
.footer-section.links a:hover {
  color: var(--primary);
  transform: translateX(5px);
}

.footer-section.contacts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.footer-phone {
  font-size: 1.4rem;
  font-weight: 900;
  color: var(--text-main);
  text-decoration: none;
}
.footer-email {
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}
.work-time {
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.social-links {
  display: flex;
  gap: 15px;
}
.glass-icon {
  width: 44px;
  height: 44px;
  background: rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-main);
  font-weight: 800;
  transition: var(--transition);
  border: 1px solid var(--border-color);
}
html.dark .glass-icon { background: rgba(255,255,255,0.05); }

.social-links a:hover {
  background: var(--primary);
  color: #fff;
  transform: translateY(-3px);
  border-color: var(--primary);
  box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3);
}

.footer-bottom {
  border-top: 1px solid var(--border-color);
  padding: 30px 0;
  background-color: rgba(0,0,0,0.02);
}
html.dark .footer-bottom { background-color: rgba(0,0,0,0.2); }

.bottom-content {
  max-width: 1440px;
  margin: 0 auto;
  width: 92%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.legal-links {
  display: flex;
  gap: 25px;
}
.legal-links a {
  text-decoration: none;
  color: var(--text-muted);
}
.legal-links a:hover {
  text-decoration: underline;
}

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) {
  .footer-container {
    grid-template-columns: 1fr 1fr;
    gap: 50px;
  }
}

@media (max-width: 640px) {
  .footer-container {
    grid-template-columns: 1fr;
    text-align: center;
    width: 90%;
  }
  .social-links {
    justify-content: center;
  }
  .bottom-content {
    flex-direction: column;
    gap: 20px;
    text-align: center;
  }
  .legal-links {
    flex-direction: column;
    gap: 10px;
  }
}
</style>