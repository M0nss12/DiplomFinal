<!-- App.vue -->
<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAppStore } from '@/stores/appStore';
import { useCartStore } from '@/stores/cartStore';

const appStore = useAppStore();
const cartStore = useCartStore();

onMounted(() => {
  appStore.initTheme();
  appStore.syncCity();
  if (localStorage.getItem('user_id')) {
    cartStore.syncCartFromDB();
  }
});
</script>

<template>
  <div class="app-wrapper">
    <Navbar />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="main-footer">
      <div class="footer-container">
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

        <div class="footer-section links">
          <h4>Магазин</h4>
          <router-link to="/catalog">Каталог товаров</router-link>
          <router-link to="/catalog">Популярные бренды</router-link>
          <router-link to="/about">Акции и скидки</router-link>
        </div>

        <div class="footer-section links">
          <h4>Информация</h4>
          <router-link to="/about">О компании</router-link>
          <router-link to="/contacts">Доставка и оплата</router-link>
          <router-link to="/notifications">Уведомления</router-link>
        </div>

        <div class="footer-section contacts">
          <h4>Поддержка</h4>
          <a href="tel:+79991234567" class="footer-phone">+7 (999) 123-45-67</a>
          <a href="mailto:monsschogath@gmail.com" class="footer-email">support@apexdrive.ru</a>
          <p class="work-time">Ежедневно: 09:00 — 21:00</p>
        </div>
      </div>

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
   ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
   ========================================================================== */
:root {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;
  --primary-light: rgba(37, 99, 235, 0.12);
  --accent: #0ea5e9;
  --success: #10b981;
  --success-light: rgba(16, 185, 129, 0.12);
  --danger: #ef4444;
  --danger-light: rgba(239, 68, 68, 0.12);
  --warning: #f59e0b;
  --warning-light: rgba(245, 158, 11, 0.12);

  --text-main: #0f172a;
  --text-muted: #64748b;

  --bg-body: #f8fafc;
  --bg-card: #ffffff;
  --bg-input: #ffffff;
  --border-color: #e2e8f0;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;

  /* навигация */
  --nav-bg: rgba(255, 255, 255, 0.85);
}

/* ==========================================================================
   ТЁМНАЯ ТЕМА
   ========================================================================== */
html.dark {
  --primary: #60a5fa;
  --primary-hover: #3b82f6;
  --primary-light: rgba(96, 165, 250, 0.2);
  --accent: #38bdf8;
  --success: #34d399;
  --success-light: rgba(52, 211, 153, 0.2);
  --danger: #f87171;
  --danger-light: rgba(248, 113, 113, 0.2);
  --warning: #fbbf24;
  --warning-light: rgba(251, 191, 36, 0.2);

  --text-main: #f8fafc;
  --text-muted: #94a3b8;

  --bg-body: #0f172a;
  --bg-card: #1e293b;
  --bg-input: #1e293b;
  --border-color: #334155;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.4);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.5);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.6);

  --nav-bg: rgba(15, 23, 42, 0.9);
}

/* ==========================================================================
   БАЗОВЫЕ СБРОСЫ
   ========================================================================== */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-body);
  color: var(--text-main);
  line-height: 1.6;
  transition: background-color 0.3s ease, color 0.3s ease;
  min-height: 100vh;
  overflow-x: hidden;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  font-size: inherit;
  transition: opacity 0.2s ease, transform 0.2s ease;
}
button:active {
  transform: scale(0.97);
}

input,
select,
textarea {
  font-family: inherit;
  font-size: 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  background: var(--bg-input);
  color: var(--text-main);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  outline: none;
  width: 100%;
}

input:focus,
select:focus,
textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

/* ==========================================================================
   АНИМАЦИИ
   ========================================================================== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}
.animate-fade-in-up {
  animation: fadeInUp 0.35s ease-out;
}

/* ==========================================================================
   КЛАССЫ КОМПОНЕНТОВ (используются везде)
   ========================================================================== */

/* Карточка */
.glass-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.glass-card:hover {
  box-shadow: var(--shadow-md);
}

/* Кнопки */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: var(--radius-full);
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
  white-space: nowrap;
  cursor: pointer;
}
.btn:active {
  transform: scale(0.97);
}
.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
}
.btn-primary:hover {
  background: var(--primary-hover);
  box-shadow: 0 4px 12px var(--primary-light);
}
.btn-outline {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-main);
}
.btn-outline:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}
.btn-success {
  background: var(--success);
  color: white;
  border: none;
}
.btn-success:hover {
  opacity: 0.9;
}
.btn-danger {
  background: var(--danger);
  color: white;
  border: none;
}
.btn-danger:hover {
  opacity: 0.9;
}
.btn-sm {
  padding: 6px 14px;
  font-size: 0.8rem;
}
.btn-lg {
  padding: 14px 28px;
  font-size: 1rem;
}
.btn-block {
  width: 100%;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Бейджи */
.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  background: var(--primary);
}
.badge-success {
  background: var(--success);
}
.badge-danger {
  background: var(--danger);
}
.badge-warning {
  background: var(--warning);
}

/* Спиннер */
.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

/* Сообщения */
.alert {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  margin-bottom: 16px;
}
.alert-error {
  background: var(--danger-light);
  color: var(--danger);
  border: 1px solid var(--danger);
}
.alert-success {
  background: var(--success-light);
  color: var(--success);
  border: 1px solid var(--success);
}
.alert-info {
  background: var(--primary-light);
  color: var(--primary);
  border: 1px solid var(--primary);
}
.alert-warning {
  background: var(--warning-light);
  color: var(--warning);
  border: 1px solid var(--warning);
}

/* Разделитель */
.divider {
  border: none;
  height: 1px;
  background: var(--border-color);
  margin: 20px 0;
}

/* Пустое состояние */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
}
.empty-state h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-main);
}
.empty-state p {
  margin-bottom: 20px;
  font-size: 0.95rem;
}

/* Формы */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
  width: 100%;
}
.form-group label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ==========================================================================
   СТРУКТУРА ПРИЛОЖЕНИЯ
   ========================================================================== */
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main-content {
  flex: 1;
}

/* Анимация смены страниц */
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
  transition: var(--transition, all 0.3s ease);
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
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}
html.dark .glass-icon {
  background: rgba(255,255,255,0.05);
}
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
html.dark .footer-bottom {
  background-color: rgba(0,0,0,0.2);
}
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

/* ==========================================================================
   АДАПТИВНОСТЬ ФУТЕРА
   ========================================================================== */
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