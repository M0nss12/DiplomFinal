<template>
  <div class="not-found-page">
    <div class="error-container glass-card">
      
      <!-- ВИЗУАЛЬНАЯ ЧАСТЬ -->
      <div class="error-visual">
        <div class="number-404">404</div>
        <div class="car-animation">
          <span class="icon">🚗</span>
          <div class="road"></div>
        </div>
      </div>

      <!-- ТЕКСТОВАЯ ЧАСТЬ -->
      <div class="error-content">
        <h1>Упс! Кажется, вы свернули не туда</h1>
        <p>Страница, которую вы ищете, была перемещена, удалена или никогда не существовала в нашем каталоге.</p>
      </div>

      <!-- КНОПКИ ДЕЙСТВИЯ -->
      <div class="error-actions">
        <router-link to="/" class="btn-primary">На главную</router-link>
        <button @click="goBack" class="btn-outline">Вернуться назад</button>
        <router-link to="/catalog" class="btn-link">Перейти в каталог →</router-link>
      </div>

      <!-- БЛОК ПОМОЩИ -->
      <div class="support-hint">
        <span>Нужна помощь?</span>
        <router-link to="/contacts">Связаться с поддержкой</router-link>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goBack = () => {
  router.go(-1);
};
</script>

<style scoped>
/* ==========================================================================
   СТИЛИ СТРАНИЦЫ 404 (GLASSMORPHISM & DARK MODE)
   ========================================================================== */

.not-found-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  animation: fadeIn 0.5s ease-out;
  text-align: center;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.error-container {
  max-width: 600px;
  width: 100%;
  padding: 60px 40px;
}

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 24px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(12px);
}
:global(.dark) .glass-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.5);
}

/* ВИЗУАЛ */
.number-404 {
  font-size: 8rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 20px;
  letter-spacing: -5px;
}

.car-animation {
  position: relative;
  width: 200px;
  margin: 0 auto 40px;
}

.car-animation .icon {
  font-size: 3rem;
  display: inline-block;
  animation: carMove 3s infinite ease-in-out;
}

.road {
  height: 4px;
  background: var(--border-color, #cbd5e1);
  width: 100%;
  border-radius: 2px;
  margin-top: -10px;
  position: relative;
  overflow: hidden;
}

.road::after {
  content: '';
  position: absolute;
  width: 40px;
  height: 100%;
  background: var(--primary, #2563eb);
  animation: roadMove 1.5s infinite linear;
}

@keyframes carMove {
  0%, 100% { transform: translateX(-50px) rotate(0deg); }
  50% { transform: translateX(50px) rotate(-2deg); }
}

@keyframes roadMove {
  from { left: -100%; }
  to { left: 100%; }
}

/* ТЕКСТ */
h1 {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main, #0f172a);
  margin-bottom: 15px;
}
:global(.dark) h1 { color: #f8fafc; }

p {
  color: var(--text-muted, #64748b);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 40px;
}
:global(.dark) p { color: #94a3b8; }

/* КНОПКИ */
.error-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

.btn-primary {
  width: 100%;
  max-width: 280px;
  padding: 14px;
  background: var(--primary, #2563eb);
  color: white;
  text-decoration: none;
  border-radius: 40px;
  font-weight: 800;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
  background: var(--primary-hover, #1d4ed8);
}

.btn-outline {
  width: 100%;
  max-width: 280px;
  padding: 12px;
  background: transparent;
  border: 2px solid var(--border-color, #cbd5e1);
  color: var(--text-main, #0f172a);
  border-radius: 40px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}
:global(.dark) .btn-outline { color: #f8fafc; border-color: #475569; }

.btn-outline:hover {
  background: rgba(0,0,0,0.03);
  border-color: var(--primary, #2563eb);
  color: var(--primary, #2563eb);
}
:global(.dark) .btn-outline:hover { background: rgba(255,255,255,0.05); }

.btn-link {
  color: var(--primary, #2563eb);
  text-decoration: none;
  font-weight: 700;
  margin-top: 10px;
}
.btn-link:hover { text-decoration: underline; }

/* ПОМОЩЬ */
.support-hint {
  margin-top: 40px;
  padding-top: 25px;
  border-top: 1px solid var(--border-color, #e2e8f0);
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  display: flex;
  justify-content: center;
  gap: 10px;
}
:global(.dark) .support-hint { border-color: #334155; }

.support-hint a {
  color: var(--text-main, #0f172a);
  font-weight: 700;
  text-decoration: none;
}
:global(.dark) .support-hint a { color: #f8fafc; }
.support-hint a:hover { text-decoration: underline; }

/* АДАПТИВНОСТЬ */
@media (max-width: 480px) {
  .number-404 { font-size: 6rem; }
  .error-container { padding: 40px 20px; }
  h1 { font-size: 1.5rem; }
  p { font-size: 1rem; }
}
</style>