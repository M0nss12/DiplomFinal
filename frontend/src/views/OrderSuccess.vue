<template>
  <div class="success-page">
    <div class="success-card glass-card">
      <div class="icon-wrap">🎉</div>
      <h1>Заказ успешно оформлен!</h1>
      <p class="order-num" v-if="orderId">Номер вашего заказа: <b>#{{ orderId }}</b></p>

      <div class="actions">
        <router-link to="/orders" class="btn-primary">Мои заказы</router-link>
        <router-link to="/catalog" class="btn-outline">Продолжить покупки</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const orderId = computed(() => route.query.orderId);
</script>

<style scoped>
.success-page { min-height: 70vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.success-card { max-width: 600px; width: 100%; padding: 50px; text-align: center; }
.icon-wrap { font-size: 4rem; margin-bottom: 20px; }
h1 { font-size: 2rem; font-weight: 900; margin-bottom: 10px; color: var(--text-main, #0f172a); }
:global(.dark) h1 { color: #f8fafc; }
.order-num { font-size: 1.2rem; color: var(--text-muted, #64748b); margin-bottom: 30px; }
.order-num b { color: var(--primary, #2563eb); }
.info-box { background: rgba(0,0,0,0.02); padding: 20px; border-radius: 12px; margin-bottom: 40px; color: var(--text-muted, #64748b); line-height: 1.6; }
:global(.dark) .info-box { background: rgba(255,255,255,0.02); }
.actions { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; }
.btn-primary { background: var(--primary, #2563eb); color: white; padding: 14px 30px; border-radius: 40px; text-decoration: none; font-weight: 800; transition: all 0.3s; }
.btn-outline { border: 2px solid var(--border-color, #cbd5e1); color: var(--text-main, #0f172a); padding: 12px 30px; border-radius: 40px; text-decoration: none; font-weight: 700; transition: all 0.3s; }
:global(.dark) .btn-outline { color: #f8fafc; border-color: #475569; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(37, 99, 235, 0.3); }
</style>