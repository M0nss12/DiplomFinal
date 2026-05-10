<template>
  <div class="not-found-page animate-fade-in">
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
        <router-link to="/" class="btn btn-primary btn-lg btn-block">На главную</router-link>
        <button @click="goBack" class="btn btn-outline btn-lg btn-block">Вернуться назад</button>
        <router-link to="/catalog" class="text-primary font-bold mt-2">Перейти в каталог →</router-link>
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
const goBack = () => router.go(-1);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ 404 (глобальный CSS используется)
   ========================================================================== */

/* Легкий эффект стекла поверх глобального .glass-card */
.glass-card {
  backdrop-filter: blur(12px);
}

.not-found-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.error-container {
  max-width: 600px;
  width: 100%;
  padding: 60px 40px;
}

/* 404 число */
.number-404 {
  font-size: 8rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 20px;
  letter-spacing: -5px;
}

/* Анимация машинки */
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
  background: var(--border-color);
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
  background: var(--primary);
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

/* Заголовок и описание */
h1 {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 15px;
}

p {
  color: var(--text-muted);
  font-size: 1.1rem;
  line-height: 1.6;
  margin-bottom: 40px;
}

/* Кнопки */
.error-actions {
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
}

/* Блок помощи */
.support-hint {
  margin-top: 40px;
  padding-top: 25px;
  border-top: 1px solid var(--border-color);
  font-size: 0.9rem;
  color: var(--text-muted);
  display: flex;
  justify-content: center;
  gap: 10px;
}

.support-hint a {
  color: var(--text-main);
  font-weight: 700;
  text-decoration: none;
}
:global(.dark) .support-hint a {
  color: #f8fafc;
}
.support-hint a:hover {
  text-decoration: underline;
}

/* Адаптив */
@media (max-width: 480px) {
  .number-404 {
    font-size: 6rem;
  }
  .error-container {
    padding: 40px 20px;
  }
  h1 {
    font-size: 1.5rem;
  }
  p {
    font-size: 1rem;
  }
}
</style>