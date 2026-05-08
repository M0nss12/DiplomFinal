<template>
  <div class="admin-history">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>⏳ История изменений</h1>
        <p class="subtitle">Аудит всех смен статусов и системных событий заказов</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📝</span>
        Всего записей: <b>{{ filteredHistory.length }}</b>
      </div>
    </div>

    <!-- ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск по истории</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="input-group">
          <label>📦 Номер заказа (ID)</label>
          <input v-model="filters.orderId" placeholder="Напр. 125" class="form-input" />
        </div>
        <div class="input-group">
          <label>👨‍💼 Кто изменил (Admin ID)</label>
          <input v-model="filters.changedBy" placeholder="ID администратора..." class="form-input" />
        </div>
        <div class="input-group">
          <label>🚚 Статус доставки</label>
          <select v-model="filters.delivery" class="form-input">
            <option value="all">Все</option>
            <option value="processing">Обработка</option>
            <option value="shipping">В пути</option>
            <option value="delivered">Выдан</option>
            <option value="cancelled">Отменен</option>
          </select>
        </div>
      </div>
    </section>

    <!-- СПИСОК СОБЫТИЙ (TIMELINE STYLE) -->
    <div class="timeline-container">
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
      </div>

      <div v-else-if="paginatedHistory.length > 0" class="timeline">
        <div v-for="log in paginatedHistory" :key="log.id" class="timeline-item glass-card">
          <div class="timeline-left">
            <div class="order-num-tag">Заказ #{{ log.order_id }}</div>
            <div class="time-stamp">{{ formatDateTime(log.created_at) }}</div>
          </div>

          <div class="timeline-content">
            <div class="status-path">
              <div class="path-segment">
                <span class="path-label">Доставка:</span>
                <span class="status-badge-mini" :class="log.delivery_status">{{ translateStatus(log.delivery_status) }}</span>
              </div>
              <div class="path-divider"></div>
              <div class="path-segment">
                <span class="path-label">Оплата:</span>
                <span class="status-badge-mini" :class="log.payment_status">{{ translatePayment(log.payment_status) }}</span>
              </div>
            </div>

            <div v-if="log.comment" class="log-comment">
              <span class="quote-icon">"</span>
              {{ log.comment }}
            </div>

            <div class="log-footer">
              <span class="author-tag">
                👤 Изменил: <b>{{ log.changed_by || 'Автоматика / Система' }}</b>
              </span>
              <router-link :to="'/admin/orders'" class="btn-go-order">Перейти к заказу →</router-link>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <div class="empty-icon">🕳️</div>
        <h3>История пуста</h3>
        <p>Событий по заданным фильтрам не найдено.</p>
      </div>
    </div>

    <!-- ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination-wrapper">
      <button @click="currentPage--" :disabled="currentPage === 1" class="p-btn glass-card">←</button>
      <div class="p-numbers">
        <button v-for="p in totalPages" :key="p" @click="currentPage = p" class="glass-card" :class="{ active: currentPage === p }">{{ p }}</button>
      </div>
      <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-btn glass-card">→</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const history = ref([]);
const loading = ref(true);
const currentPage = ref(1);
const itemsPerPage = 15;

const filters = reactive({
  orderId: '',
  changedBy: '',
  delivery: 'all'
});

const loadHistory = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`/api/admin/order_status_history`, config);
    history.value = res.data;
  } catch (e) {
    console.error('Ошибка загрузки истории');
  } finally {
    loading.value = false;
  }
};

const formatDateTime = (iso) => {
  return new Date(iso).toLocaleString('ru-RU', { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
};

const translateStatus = (s) => ({
  'processing': 'Обработка',
  'shipping': 'В пути',
  'delivered': 'Выдан',
  'cancelled': 'Отменен'
}[s] || s);

const translatePayment = (p) => ({
  'paid': 'Оплачен',
  'unpaid': 'Не оплачен',
  'refunded': 'Возврат'
}[p] || p);

const filteredHistory = computed(() => {
  let res = [...history.value];
  if (filters.orderId) res = res.filter(l => l.order_id.toString().includes(filters.orderId));
  if (filters.changedBy) res = res.filter(l => l.changed_by?.toLowerCase().includes(filters.changedBy.toLowerCase()));
  if (filters.delivery !== 'all') res = res.filter(l => l.delivery_status === filters.delivery);
  
  return res.sort((a, b) => b.id - a.id);
});

const totalPages = computed(() => Math.ceil(filteredHistory.value.length / itemsPerPage));
const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredHistory.value.slice(start, start + itemsPerPage);
});

const resetFilters = () => {
  filters.orderId = ''; filters.changedBy = ''; filters.delivery = 'all';
  currentPage.value = 1;
};

watch(filters, () => currentPage.value = 1);
onMounted(loadHistory);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ИСТОРИЯ СТАТУСОВ (TIMELINE STYLE)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-history { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-history { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; align-items: flex-end; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; }

/* ТАЙМЛАЙН */
.timeline-container { margin-top: 20px; }
.timeline { display: flex; flex-direction: column; gap: 15px; position: relative; }
.timeline::before {
    content: ''; position: absolute; left: 160px; top: 0; bottom: 0; width: 2px;
    background: linear-gradient(to bottom, var(--primary, #2563eb), transparent); opacity: 0.2;
}

.timeline-item { display: flex; padding: 20px; gap: 40px; position: relative; }
.timeline-item:hover { transform: translateX(5px); border-color: var(--primary, #2563eb); }

.timeline-left { width: 140px; flex-shrink: 0; text-align: right; }
.order-num-tag { font-weight: 900; font-size: 1rem; color: var(--primary, #2563eb); }
.time-stamp { font-size: 0.75rem; color: var(--text-muted, #94a3b8); margin-top: 5px; font-weight: 600;}

.timeline-content { flex: 1; }
.status-path { display: flex; align-items: center; gap: 20px; margin-bottom: 12px; flex-wrap: wrap; }
.path-segment { display: flex; align-items: center; gap: 8px; }
.path-label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted, #64748b); text-transform: uppercase; }

.status-badge-mini { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; background: rgba(0,0,0,0.05); }
.status-badge-mini.delivered { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-badge-mini.cancelled { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.status-badge-mini.paid { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid #10b981; }

.log-comment { 
    background: rgba(0,0,0,0.02); padding: 12px 15px; border-radius: 8px; font-style: italic; 
    color: var(--text-main, #0f172a); margin-bottom: 15px; font-size: 0.9rem; position: relative;
}
:global(.dark) .log-comment { background: rgba(255,255,255,0.03); color: #cbd5e1; }
.quote-icon { font-size: 2rem; position: absolute; left: -10px; top: -10px; opacity: 0.1; color: var(--primary, #2563eb); }

.log-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 12px; }
:global(.dark) .log-footer { border-color: #334155; }
.author-tag { font-size: 0.8rem; color: var(--text-muted, #64748b); }
.author-tag b { color: var(--text-main, #0f172a); }
:global(.dark) .author-tag b { color: #f8fafc; }

.btn-go-order { font-size: 0.8rem; font-weight: 800; color: var(--primary, #2563eb); text-decoration: none; }
.btn-go-order:hover { text-decoration: underline; }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }

.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 768px) {
  .timeline::before { display: none; }
  .timeline-item { flex-direction: column; gap: 15px; }
  .timeline-left { width: 100%; text-align: left; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
  .filter-grid { grid-template-columns: 1fr; }
}
</style>