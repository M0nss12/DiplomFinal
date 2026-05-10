<template>
  <div class="admin-history animate-fade-in">
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
        <div class="form-group">
          <label>📦 Номер заказа (ID)</label>
          <input v-model="filters.orderId" placeholder="Напр. 125" />
        </div>
        <div class="form-group">
          <label>👨‍💼 Кто изменил (Admin ID)</label>
          <input v-model="filters.changedBy" placeholder="ID администратора..." />
        </div>
        <div class="form-group">
          <label>🚚 Статус доставки</label>
          <select v-model="filters.delivery">
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
      <div v-if="loading" class="text-center py-10">
        <span class="spinner" style="width: 40px; height: 40px; border-width: 3px;"></span>
        <p class="text-muted mt-2">Загрузка истории...</p>
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
        <div class="empty-state-icon">🕳️</div>
        <h3>История пуста</h3>
        <p>Событий по заданным фильтрам не найдено.</p>
      </div>
    </div>

    <!-- ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination mt-3">
      <button @click="currentPage--" :disabled="currentPage === 1">←</button>
      <div class="pagination-pages">
        <button v-for="p in totalPages" :key="p" @click="currentPage = p" :class="{ active: currentPage === p }">{{ p }}</button>
      </div>
      <button @click="currentPage++" :disabled="currentPage === totalPages">→</button>
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
const itemsPerPage = 20;   // стандартное значение

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
   УНИКАЛЬНЫЕ СТИЛИ ИСТОРИИ (глобальный CSS используется)
   ========================================================================== */

.admin-history {
  padding: 40px 24px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}
.header-left h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.stats-badge {
  padding: 10px 20px;
  border-radius: 60px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.admin-card {
  padding: 25px;
  margin-bottom: 30px;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  align-items: flex-end;
}
.btn-text-link {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 800;
  cursor: pointer;
  text-decoration: underline;
}

/* Таймлайн */
.timeline-container {
  margin-top: 20px;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 15px;
  position: relative;
}
.timeline::before {
  content: '';
  position: absolute;
  left: 160px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, var(--primary), transparent);
  opacity: 0.2;
}

.timeline-item {
  display: flex;
  padding: 20px;
  gap: 40px;
  position: relative;
}
.timeline-item:hover {
  transform: translateX(5px);
  border-color: var(--primary);
}

.timeline-left {
  width: 140px;
  flex-shrink: 0;
  text-align: right;
}
.order-num-tag {
  font-weight: 900;
  font-size: 1rem;
  color: var(--primary);
}
.time-stamp {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 5px;
  font-weight: 600;
}

.timeline-content {
  flex: 1;
}
.status-path {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.path-segment {
  display: flex;
  align-items: center;
  gap: 8px;
}
.path-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
}

.status-badge-mini {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 800;
  background: rgba(0,0,0,0.05);
  color: var(--text-main);
}
.status-badge-mini.delivered { background: var(--success-light); color: var(--success); }
.status-badge-mini.cancelled { background: var(--danger-light); color: var(--danger); }
.status-badge-mini.paid { background: var(--success-light); color: var(--success); border: 1px solid var(--success); }

.log-comment {
  background: rgba(0,0,0,0.02);
  padding: 12px 15px;
  border-radius: 8px;
  font-style: italic;
  color: var(--text-main);
  margin-bottom: 15px;
  font-size: 0.9rem;
  position: relative;
}
:global(.dark) .log-comment { background: rgba(255,255,255,0.03); color: #cbd5e1; }
.quote-icon {
  font-size: 2rem;
  position: absolute;
  left: -10px;
  top: -10px;
  opacity: 0.1;
  color: var(--primary);
}

.log-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px dashed var(--border-color);
  padding-top: 12px;
}
.author-tag {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.author-tag b {
  color: var(--text-main);
}

.btn-go-order {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--primary);
  text-decoration: none;
}
.btn-go-order:hover {
  text-decoration: underline;
}

/* Пагинация */
.pagination-pages {
  display: flex;
  gap: 8px;
}
.pagination-pages button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.pagination-pages button:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}
.pagination-pages button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

@media (max-width: 768px) {
  .timeline::before { display: none; }
  .timeline-item { flex-direction: column; gap: 15px; }
  .timeline-left { width: 100%; text-align: left; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; }
  .filter-grid { grid-template-columns: 1fr; }
}
</style>