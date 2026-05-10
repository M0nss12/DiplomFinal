<template>
  <div class="success-page animate-fade-in-up">
    <!-- ДЕКОРАТИВНЫЕ ЭЛЕМЕНТЫ -->
    <div class="gear gear-1"></div>
    <div class="gear gear-2"></div>
    <div class="sparkle-container" v-if="!isMobile">
      <div v-for="n in 20" :key="n" class="sparkle" :style="getRandomSparkleStyle()"></div>
    </div>

    <div class="success-card glass-card">
      <div class="icon-wrap">🎉</div>
      <h1>Заказ успешно оформлен!</h1>
      <p class="order-num" v-if="orderId">Номер вашего заказа: <b>#{{ orderId }}</b></p>
      
      <div class="info-box">
        <template v-if="paymentStatus === 'paid'">
          ✅ Заказ оплачен онлайн. Мы уже начали сборку!
        </template>
        <template v-else-if="paymentStatus === 'unpaid'">
          📦 Заказ оформлен с оплатой при получении. Вы сможете оплатить его в пункте выдачи.
        </template>
        <template v-else>
          Ваш заказ принят в обработку. Информация о статусе появится в личном кабинете.
        </template>
      </div>

      <div class="actions">
        <router-link to="/orders" class="btn btn-primary btn-lg">📋 Мои заказы</router-link>
        <router-link to="/catalog" class="btn btn-outline btn-lg">🛒 Продолжить покупки</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const orderId = computed(() => route.query.orderId);
const paymentStatus = computed(() => route.query.status || null);

const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const getRandomSparkleStyle = () => ({
  left: Math.random() * 100 + '%',
  animationDelay: Math.random() * 8 + 's',
  width: Math.random() * 4 + 2 + 'px',
  height: Math.random() * 4 + 2 + 'px',
  opacity: Math.random() * 0.5 + 0.2,
});

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});
</script>

<style scoped>
/* ==========================================================================
   ТОЛЬКО УНИКАЛЬНЫЕ СТИЛИ (глобальные классы уже присутствуют)
   ========================================================================== */

/* Анимация иконки */
@keyframes pop {
  0% { transform: scale(0.5); }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.success-page {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-main);
  position: relative;
  overflow: hidden;
}

/* Карточка с легким дополнительным эффектом стекла */
.success-card {
  max-width: 580px;
  width: 100%;
  padding: 60px 40px;
  text-align: center;
  position: relative;
  z-index: 1;
  backdrop-filter: blur(8px); /* усиливает глобальный glass-card */
}

.icon-wrap {
  font-size: 5rem;
  margin-bottom: 20px;
  animation: pop 0.5s ease;
}

h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 15px;
  color: var(--text-main);
}

.order-num {
  font-size: 1.2rem;
  color: var(--text-muted);
  margin-bottom: 30px;
}
.order-num b {
  color: var(--primary);
}

.info-box {
  background: rgba(0,0,0,0.02);
  padding: 20px 25px;
  border-radius: 12px;
  margin-bottom: 40px;
  color: var(--text-muted);
  line-height: 1.6;
  font-size: 1rem;
  font-weight: 500;
}
:global(.dark) .info-box {
  background: rgba(255,255,255,0.02);
}

.actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Декоративные шестерёнки */
.gear {
  position: fixed;
  width: 80px;
  height: 80px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.07.08A10 10 0 0 0 12 18a10 10 0 0 0 6.26-2.22z"/><path d="M5.52 10.5a10 10 0 0 1 12.96 0"/></svg>') center/contain no-repeat;
  opacity: 0.08;
  pointer-events: none;
  z-index: 0;
  animation: spin 20s linear infinite;
  color: var(--text-main);
}
:global(.dark) .gear {
  color: #f8fafc;
  opacity: 0.05;
}
.gear-1 { top: 10%; left: 5%; width: 100px; height: 100px; animation-duration: 25s; }
.gear-2 { bottom: 10%; right: 5%; width: 70px; height: 70px; animation-duration: 18s; animation-direction: reverse; }

/* Блёстки */
.sparkle-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.sparkle {
  position: absolute;
  background: radial-gradient(circle, var(--primary) 0%, transparent 80%);
  border-radius: 50%;
  animation: sparkle 8s linear infinite;
}

@keyframes sparkle {
  0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
}

@media (max-width: 768px) {
  .success-card {
    padding: 40px 25px;
  }
  h1 {
    font-size: 1.8rem;
  }
  .icon-wrap {
    font-size: 3.5rem;
  }
  .gear, .sparkle-container {
    display: none;
  }
}
</style>