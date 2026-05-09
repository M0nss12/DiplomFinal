<template>
  <div class="admin-returns">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>📦 Возвраты и рекламации</h1>
        <p class="subtitle">Рассмотрение заявок от клиентов и создание новых</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📉</span>
        Активных: <b>{{ pendingCount }}</b>
      </div>
    </div>

    <!-- ФОРМА СОЗДАНИЯ ЗАЯВКИ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Создать новый возврат</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createRequest" class="admin-form">
        <!-- ЗАКАЗ (автодополнение) -->
        <div class="input-group autocomplete-wrapper">
          <label>📦 Заказ #</label>
          <input
            v-model="orderSearch"
            type="text"
            placeholder="Введите номер заказа"
            class="form-input"
            @input="filterOrders"
            @focus="showOrderSuggestions = true"
            @blur="hideOrderSuggestions"
          />
          <ul v-if="showOrderSuggestions && filteredOrders.length" class="suggestions glass-card">
            <li
              v-for="o in filteredOrders"
              :key="o.id"
              @mousedown.prevent="selectOrder(o)"
            >
              Заказ #{{ o.id }} — {{ o.customer_name || 'Гость' }} ({{ o.total_price }} ₽)
            </li>
          </ul>
        </div>

        <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ КЛИЕНТЕ (только для просмотра) -->
        <div v-if="selectedOrder" class="input-group">
          <label>👤 Клиент</label>
          <div class="user-display glass-card">
            <template v-if="selectedOrder.user_id && getUserName(selectedOrder.user_id) !== 'Гость'">
              <strong>{{ getUserName(selectedOrder.user_id) }}</strong>
              <small>{{ selectedOrder.customer_email || selectedOrder.customer_phone || '' }}</small>
            </template>
            <template v-else>
              <strong>Гость</strong>
              <small>{{ selectedOrder.customer_phone || selectedOrder.customer_email || 'без контактов' }}</small>
            </template>
          </div>
        </div>

        <!-- ПРИЧИНА -->
        <div class="input-group full-width">
          <label>📝 Причина возврата</label>
          <textarea
            v-model="newRequest.reason"
            placeholder="Опишите причину..."
            required
            class="form-input"
            rows="3"
          ></textarea>
        </div>

        <div class="form-footer">
          <button type="submit" class="btn-primary">
            📩 Отправить заявку
          </button>
        </div>
      </form>
    </section>

    <!-- ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Фильтрация заявок</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить</button>
      </div>
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔎 Поиск (Заказ #, User ID или причина)</label>
          <input v-model="searchQuery" placeholder="Введите данные..." class="form-input" />
        </div>
        <div class="input-group">
          <label>📌 Статус заявки</label>
          <select v-model="statusFilter" class="form-input">
            <option value="all">Все заявки</option>
            <option value="pending">⏳ На рассмотрении</option>
            <option value="approved">✅ Одобрено</option>
            <option value="rejected">❌ Отклонено</option>
          </select>
        </div>
      </div>
    </section>

    <!-- СПИСОК ЗАЯВОК -->
    <div class="table-container">
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
      </div>

      <div v-else-if="paginatedReturns.length > 0" class="returns-list">
        <div
          v-for="req in paginatedReturns"
          :key="req.id"
          class="return-card glass-card"
          :class="req.status"
        >
          <div class="return-header">
            <div class="req-id">Заявка #{{ req.id }}</div>
            <div class="req-date">{{ formatDateTime(req.created_at) }}</div>
            <div class="status-badge-wrap">
              <span class="status-badge" :class="req.status">
                {{ translateStatus(req.status) }}
              </span>
            </div>
          </div>

          <div class="return-body">
            <div class="info-block">
              <div class="info-item">
                <span class="label">Заказ:</span>
                <router-link :to="'/admin/orders'" class="order-link">
                  #{{ req.order_id }}
                </router-link>
              </div>
              <div class="info-item">
                <span class="label">Клиент:</span>
                <div class="user-info">
                  <strong>{{ getUserName(req.user_id) }}</strong>
                  <small v-if="req.user_id">ID: {{ req.user_id.substring(0, 8) }}...</small>
                </div>
              </div>
            </div>

            <div class="reason-block glass-card">
              <span class="label">📝 Причина возврата:</span>
              <p class="reason-text">{{ req.reason }}</p>
            </div>
          </div>

          <div class="return-footer">
            <div class="action-buttons" v-if="req.status === 'pending'">
              <button @click="updateStatus(req.id, 'approved')" class="btn-approve">
                Одобрить возврат
              </button>
              <button @click="updateStatus(req.id, 'rejected')" class="btn-reject">
                Отклонить
              </button>
            </div>
            <div class="archive-actions">
              <button @click="deleteRequest(req)" class="btn-delete-small">
                🗑️ Удалить запись
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <div class="empty-icon">📂</div>
        <h3>Заявок не найдено</h3>
      </div>
    </div>

    <!-- ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination-wrapper">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="p-btn glass-card"
      >
        ←
      </button>
      <div class="p-numbers">
        <button
          v-for="p in totalPages"
          :key="p"
          @click="currentPage = p"
          class="glass-card"
          :class="{ active: currentPage === p }"
        >
          {{ p }}
        </button>
      </div>
      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="p-btn glass-card"
      >
        →
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const requests = ref([]);
const users = ref([]);
const orders = ref([]);
const loading = ref(true);

// Поиск заказа
const orderSearch = ref('');
const showOrderSuggestions = ref(false);
const selectedOrder = ref(null);      // объект заказа после выбора

const newRequest = reactive({
  order_id: null,
  user_id: null,   // будет заполняться автоматически
  reason: ''
});

const searchQuery = ref('');
const statusFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 10;

// =====================
// Загрузка данных
// =====================
const loadData = async () => {
  loading.value = true;
  try {
    const [rRes, uRes, oRes] = await Promise.all([
      axios.get(`/api/admin/return_requests`, config),
      axios.get(`/api/admin/users`, config),
      axios.get(`/api/admin/orders`, config)
    ]);
    requests.value = rRes.data;
    users.value = uRes.data;
    orders.value = oRes.data;
  } catch (e) {
    console.error('Ошибка загрузки данных');
  } finally {
    loading.value = false;
  }
};

// =====================
// Автодополнение заказов
// =====================
const filteredOrders = computed(() => {
  const q = orderSearch.value.trim();
  if (!q) return [];
  return orders.value.filter(o => o.id.toString().includes(q));
});

const selectOrder = (order) => {
  selectedOrder.value = order;
  newRequest.order_id = order.id;
  newRequest.user_id = order.user_id;   // берём из заказа (может быть невалидным – сервер поправит)
  orderSearch.value = `#${order.id}`;
  showOrderSuggestions.value = false;
};

const filterOrders = () => {
  showOrderSuggestions.value = true;
};

const hideOrderSuggestions = () => {
  setTimeout(() => { showOrderSuggestions.value = false; }, 150);
};

// =====================
// Отображение имени пользователя
// =====================
const getUserName = (id) => {
  if (!id) return 'Гость';
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name || ''}`.trim() : 'Гость';
};

// =====================
// Создание заявки
// =====================
const createRequest = async () => {
  if (!newRequest.order_id || !newRequest.reason.trim()) {
    alert('Выберите заказ и укажите причину');
    return;
  }
  try {
    const payload = {
      order_id: newRequest.order_id,
      user_id: newRequest.user_id,   // сервер проверит и при необходимости обнулит
      reason: newRequest.reason.trim()
    };
    const res = await axios.post(`/api/admin/return_requests`, payload, config);
    requests.value.unshift(res.data);
    // Сброс
    Object.assign(newRequest, { order_id: null, user_id: null, reason: '' });
    orderSearch.value = '';
    selectedOrder.value = null;
    alert('Заявка на возврат создана');
  } catch (e) {
    alert('Ошибка создания заявки');
  }
};

// =====================
// Статусы, удаление и пр.
// =====================
const formatDateTime = (iso) => new Date(iso).toLocaleString('ru-RU');
const translateStatus = (s) =>
  ({ pending: 'Ожидает', approved: 'Одобрено', rejected: 'Отклонено' }[s] || s);

const updateStatus = async (id, newStatus) => {
  try {
    await axios.put(`/api/admin/return_requests/${id}`, { status: newStatus }, config);
    const req = requests.value.find(r => r.id === id);
    if (req) req.status = newStatus;
    alert(`Статус изменён на: ${translateStatus(newStatus)}`);
  } catch (e) {
    alert('Ошибка сохранения');
  }
};

const deleteRequest = async (req) => {
  if (!confirm('Удалить запись о возврате?')) return;
  try {
    await axios.delete(`/api/admin/return_requests/${req.id}`, config);
    requests.value = requests.value.filter(r => r.id !== req.id);
  } catch (e) {
    alert('Ошибка при удалении');
  }
};

// =====================
// Фильтрация и пагинация
// =====================
const filteredReturns = computed(() => {
  let res = [...requests.value];
  if (statusFilter.value !== 'all') res = res.filter(r => r.status === statusFilter.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    res = res.filter(
      r =>
        r.reason.toLowerCase().includes(q) ||
        r.order_id.toString() === q ||
        getUserName(r.user_id).toLowerCase().includes(q)
    );
  }
  return res.sort((a, b) => b.id - a.id);
});

const pendingCount = computed(() => requests.value.filter(r => r.status === 'pending').length);
const totalPages = computed(() => Math.ceil(filteredReturns.value.length / itemsPerPage));
const paginatedReturns = computed(() =>
  filteredReturns.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage)
);

const resetFilters = () => {
  searchQuery.value = '';
  statusFilter.value = 'all';
  currentPage.value = 1;
};
watch([searchQuery, statusFilter], () => (currentPage.value = 1));

onMounted(loadData);
</script>

<style scoped>
/* Полный CSS из предыдущего ответа + новый класс user-display */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-returns { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-returns { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

.input-group { display: flex; flex-direction: column; gap: 8px; }
.full-width { grid-column: 1 / -1; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: 8px;
  border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a);
  font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }

.autocomplete-wrapper { position: relative; }
.suggestions {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  max-height: 200px; overflow-y: auto; list-style: none; padding: 0; margin-top: 4px;
  border-radius: 8px; background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
:global(.dark) .suggestions { background: #1e293b; border-color: #334155; }
.suggestions li {
  padding: 10px 16px; cursor: pointer; font-size: 0.9rem; color: var(--text-main, #0f172a);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .suggestions li { color: #f8fafc; }
.suggestions li:hover { background: rgba(37, 99, 235, 0.1); }

.user-display {
  padding: 10px 16px; background: rgba(0,0,0,0.02); border-radius: 8px;
  font-size: 0.95rem;
}
.user-display strong { display: block; }

.form-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 14px 30px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

.filter-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; align-items: flex-end; }

/* Карточки возвратов (прежние стили) */
.returns-list { display: flex; flex-direction: column; gap: 20px; }
.return-card { padding: 30px; border-left: 6px solid #94a3b8; }
.return-card.pending { border-left-color: #f59e0b; }
.return-card.approved { border-left-color: #10b981; opacity: 0.8; }
.return-card.rejected { border-left-color: #ef4444; opacity: 0.8; }

.return-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.req-id { font-weight: 900; font-size: 1.2rem; color: var(--primary, #2563eb); }
.req-date { font-size: 0.85rem; color: var(--text-muted, #94a3b8); font-weight: 600; }

.status-badge { padding: 6px 14px; border-radius: 40px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.status-badge.pending { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.status-badge.approved { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

.return-body { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
.info-block { display: flex; flex-direction: column; gap: 15px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted, #94a3b8); text-transform: uppercase; margin-bottom: 5px; display: block; }
.order-link { font-weight: 800; color: var(--primary, #2563eb); text-decoration: none; font-size: 1.1rem; }
.user-info strong { display: block; color: var(--text-main, #0f172a); }
:global(.dark) .user-info strong { color: #f8fafc; }

.reason-block { padding: 15px 20px; background: rgba(0,0,0,0.02); }
:global(.dark) .reason-block { background: rgba(255,255,255,0.02); }
.reason-text { margin-top: 8px; line-height: 1.5; font-weight: 500; font-size: 0.95rem; }

.return-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 20px; }
.action-buttons { display: flex; gap: 15px; }

.btn-approve { background: #10b981; color: white; border: none; padding: 10px 24px; border-radius: 40px; font-weight: 800; cursor: pointer; transition: 0.3s; }
.btn-approve:hover { background: #059669; transform: translateY(-2px); }

.btn-reject { background: transparent; border: 2px solid #ef4444; color: #ef4444; padding: 8px 24px; border-radius: 40px; font-weight: 800; cursor: pointer; transition: 0.3s; }
.btn-reject:hover { background: rgba(239, 68, 68, 0.1); }

.btn-delete-small { background: none; border: none; color: var(--text-muted, #94a3b8); font-weight: 700; cursor: pointer; font-size: 0.85rem; }
.btn-delete-small:hover { color: #ef4444; text-decoration: underline; }

.empty-state { text-align: center; padding: 60px; color: var(--text-muted, #64748b); font-weight: 600; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); }

@media (max-width: 900px) {
  .return-body { grid-template-columns: 1fr; }
  .filter-grid { grid-template-columns: 1fr; }
}
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-returns { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-returns { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 24px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.full-width { grid-column: 1 / -1; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
  border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a);
  font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }

.autocomplete-wrapper { position: relative; }
.suggestions {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  max-height: 200px; overflow-y: auto; list-style: none; padding: 0; margin-top: 4px;
  border-radius: 8px; background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
:global(.dark) .suggestions { background: #1e293b; border-color: #334155; }
.suggestions li {
  padding: 10px 16px; cursor: pointer; font-size: 0.9rem; color: var(--text-main, #0f172a);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .suggestions li { color: #f8fafc; }
.suggestions li:hover { background: rgba(37, 99, 235, 0.1); }

.form-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 14px 30px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* НОВЫЕ СТИЛИ ДЛЯ ФОРМЫ */
.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 24px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }
.full-width { grid-column: 1 / -1; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
  border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a);
  font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }

.upload-gallery { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px; }
.preview-item { width: 80px; height: 80px; position: relative; padding: 4px; background: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.preview-item img { max-width: 100%; max-height: 100%; object-fit: contain; cursor: zoom-in; }
.file-label-big { width: 100px; height: 80px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color); cursor: pointer; border-radius: 12px; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; }
.file-label-big:hover { border-color: var(--primary); color: var(--primary); background: rgba(37,99,235,0.05); }
.hidden-file { display: none; }
.btn-clear-img { position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; background: var(--danger, #ef4444); color: white; border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.spinner-small { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.form-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 14px 30px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-returns { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-returns { color: #f8fafc; }

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
.filter-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; align-items: flex-end; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; }

/* КАРТОЧКА ЗАЯВКИ */
.returns-list { display: flex; flex-direction: column; gap: 20px; }
.return-card { padding: 30px; border-left: 6px solid #94a3b8; }
.return-card.pending { border-left-color: var(--warning, #f59e0b); }
.return-card.approved { border-left-color: var(--success, #10b981); opacity: 0.8; }
.return-card.rejected { border-left-color: var(--danger, #ef4444); opacity: 0.8; }

.return-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.req-id { font-weight: 900; font-size: 1.2rem; color: var(--primary, #2563eb); }
.req-date { font-size: 0.85rem; color: var(--text-muted, #94a3b8); font-weight: 600; }

.status-badge { padding: 6px 14px; border-radius: 40px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.status-badge.pending { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.status-badge.approved { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-badge.rejected { background: rgba(239, 68, 68, 0.1); color: #dc2626; }

.return-body { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
.info-block { display: flex; flex-direction: column; gap: 15px; }
.info-item { display: flex; flex-direction: column; gap: 4px; }
.label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted, #94a3b8); text-transform: uppercase; margin-bottom: 5px; display: block; }
.order-link { font-weight: 800; color: var(--primary, #2563eb); text-decoration: none; font-size: 1.1rem; }
.user-info strong { display: block; color: var(--text-main, #0f172a); }
:global(.dark) .user-info strong { color: #f8fafc; }

.reason-block { padding: 15px 20px; background: rgba(0,0,0,0.02); }
:global(.dark) .reason-block { background: rgba(255,255,255,0.02); }
.reason-text { margin-top: 8px; line-height: 1.5; font-weight: 500; font-size: 0.95rem; }

.evidence-gallery { grid-column: 1 / -1; margin-top: 20px; }
.img-grid { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px; }
.evidence-img { width: 100px; height: 100px; object-fit: cover; cursor: zoom-in; padding: 5px !important; }
.evidence-img:hover { transform: scale(1.05); border-color: var(--primary, #2563eb); }

/* ФУТЕР И КНОПКИ */
.return-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 20px; }
:global(.dark) .return-footer { border-color: #334155; }
.action-buttons { display: flex; gap: 15px; }

.btn-approve { background: var(--success, #10b981); color: white; border: none; padding: 10px 24px; border-radius: 40px; font-weight: 800; cursor: pointer; transition: 0.3s; }
.btn-approve:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }

.btn-reject { background: transparent; border: 2px solid var(--danger, #ef4444); color: var(--danger, #ef4444); padding: 8px 24px; border-radius: 40px; font-weight: 800; cursor: pointer; transition: 0.3s; }
.btn-reject:hover { background: rgba(239, 68, 68, 0.1); }

.btn-delete-small { background: none; border: none; color: var(--text-muted, #94a3b8); font-weight: 700; cursor: pointer; font-size: 0.85rem; }
.btn-delete-small:hover { color: var(--danger, #ef4444); text-decoration: underline; }

/* FULLSCREEN VIEW */
.fullscreen-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
.full-img { max-width: 90%; max-height: 90vh; border-radius: 12px; }
.close-fs { position: absolute; top: 20px; right: 30px; color: white; background: none; border: none; font-size: 2.5rem; cursor: pointer; }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 900px) {
  .return-body { grid-template-columns: 1fr; }
  .filter-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .return-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .return-footer { flex-direction: column; gap: 20px; text-align: center; }
}
</style>