<template>
  <div class="admin-returns animate-fade-in">
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
        <div class="form-group autocomplete-wrapper">
          <label>📦 Заказ #</label>
          <input
            v-model="orderSearch"
            type="text"
            placeholder="Введите номер заказа"
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

        <!-- ИНФОРМАЦИЯ О ВЫБРАННОМ КЛИЕНТЕ -->
        <div v-if="selectedOrder" class="form-group">
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
        <div class="form-group full-width">
          <label>📝 Причина возврата</label>
          <textarea
            v-model="newRequest.reason"
            placeholder="Опишите причину..."
            required
            rows="3"
          ></textarea>
        </div>

        <div class="form-footer">
          <button type="submit" class="btn btn-primary create-btn">
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
        <div class="form-group">
          <label>🔎 Поиск (Заказ #, User ID или причина)</label>
          <input v-model="searchQuery" placeholder="Введите данные..." />
        </div>
        <div class="form-group">
          <label>📌 Статус заявки</label>
          <select v-model="statusFilter">
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
      <div v-if="loading" class="text-center py-10">
        <span class="spinner" style="width: 40px; height: 40px; border-width: 3px;"></span>
        <p class="text-muted mt-2">Загрузка заявок...</p>
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
              <span class="badge" :class="getStatusClass(req.status)">
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
              <button @click="updateStatus(req.id, 'approved')" class="btn btn-success btn-sm">
                ✔️ Одобрить
              </button>
              <button @click="updateStatus(req.id, 'rejected')" class="btn btn-outline btn-sm text-danger">
                ✕ Отклонить
              </button>
            </div>
            <div class="archive-actions">
              <button @click="deleteRequest(req)" class="btn btn-outline btn-sm text-muted">
                🗑️ Удалить
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <div class="empty-state-icon">📂</div>
        <h3>Заявок не найдено</h3>
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

const requests = ref([]);
const users = ref([]);
const orders = ref([]);
const loading = ref(true);

// Поиск заказа
const orderSearch = ref('');
const showOrderSuggestions = ref(false);
const selectedOrder = ref(null);

const newRequest = reactive({
  order_id: null,
  user_id: null,
  reason: ''
});

const searchQuery = ref('');
const statusFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

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
  newRequest.user_id = order.user_id;
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
// Форматирование дат и статусов
// =====================
const formatDateTime = (iso) => new Date(iso).toLocaleString('ru-RU');
const translateStatus = (s) =>
  ({ pending: 'Ожидает', approved: 'Одобрено', rejected: 'Отклонено' }[s] || s);

// Функция для получения CSS-класса бейджа статуса
const getStatusClass = (status) => {
  switch (status) {
    case 'approved': return 'badge-success';
    case 'pending': return 'badge-warning';
    case 'rejected': return 'badge-danger';
    default: return '';
  }
};

// =====================
// Создание заявки
// =====================
const createRequest = async () => {
  if (!newRequest.order_id || !newRequest.reason.trim()) {
    alert('Выберите заказ и укажите причину');
    return;
  }

  // Проверяем локально, нет ли уже такой заявки в списке (для красоты)
  const hasActive = requests.value.find(r => 
    r.order_id === newRequest.order_id && (r.status === 'pending' || r.status === 'approved')
  );
  
  if (hasActive) {
    alert(`Ошибка: Для заказа #${newRequest.order_id} уже есть активная заявка.`);
    return;
  }

  try {
    const payload = {
      order_id: newRequest.order_id,
      user_id: newRequest.user_id,
      reason: newRequest.reason.trim()
    };
    
    // Отправляем на бэкенд
    const res = await axios.post(`/api/admin/return_requests`, payload, config);
    
    requests.value.unshift(res.data);
    Object.assign(newRequest, { order_id: null, user_id: null, reason: '' });
    orderSearch.value = '';
    selectedOrder.value = null;
    alert('Заявка на возврат успешно создана');
  } catch (e) {
    // Выводим текст ошибки от сервера (например, "уже существует")
    const msg = e.response?.data?.error || 'Ошибка создания заявки';
    alert(msg);
  }
};

// =====================
// Статусы, удаление и пр.
// =====================
const updateStatus = async (id, newStatus) => {
  const confirmMsg = newStatus === 'approved' 
    ? 'Одобрить возврат? ТОВАР БУДЕТ ВЕРНУТ НА СКЛАД!' 
    : 'Отклонить заявку?';
    
  if (!confirm(confirmMsg)) return;

  try {
    const res = await axios.put(`/api/admin/return_requests/${id}`, { status: newStatus }, config);
    
    // Находим и обновляем локально
    const idx = requests.value.findIndex(r => r.id === id);
    if (idx !== -1) {
      requests.value[idx] = res.data;
    }
    
    alert(`Заявка ${newStatus === 'approved' ? 'одобрена, остатки возвращены' : 'отклонена'}`);
  } catch (e) {
    alert(e.response?.data?.error || 'Ошибка сохранения');
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
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ ВОЗВРАТОВ (глобальный CSS используется)
   ========================================================================== */

.admin-returns {
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
  padding: 28px;
  margin-bottom: 32px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.card-title {
  font-size: 1.35rem;
  font-weight: 900;
  margin: 0;
}
.card-decoration {
  width: 50px;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 4px;
}

/* Форма */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}
.form-group label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
}

.autocomplete-wrapper {
  position: relative;
}
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin-top: 4px;
  border-radius: 8px;
}
.suggestions li {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
}
.suggestions li:hover {
  background: var(--primary-light);
}

.user-display {
  padding: 10px 16px;
  background: rgba(0,0,0,0.02);
  border-radius: 8px;
  font-size: 0.95rem;
}
.user-display strong {
  display: block;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.create-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

/* Фильтры */
.filter-section {
  background: rgba(0,0,0,0.01);
  border-style: dashed;
}
.filter-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
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

/* Карточки возвратов */
.returns-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.return-card {
  padding: 30px;
  border-left: 6px solid var(--border-color);
}
.return-card.pending {
  border-left-color: var(--warning);
}
.return-card.approved {
  border-left-color: var(--success);
  opacity: 0.9;
}
.return-card.rejected {
  border-left-color: var(--danger);
  opacity: 0.9;
}

.return-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
.req-id {
  font-weight: 900;
  font-size: 1.2rem;
  color: var(--primary);
}
.req-date {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

.return-body {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 30px;
}
.info-block {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  margin-bottom: 5px;
  display: block;
}
.order-link {
  font-weight: 800;
  color: var(--primary);
  text-decoration: none;
  font-size: 1.1rem;
}
.user-info strong {
  display: block;
  color: var(--text-main);
}

.reason-block {
  padding: 15px 20px;
  background: rgba(0,0,0,0.02);
}
:global(.dark) .reason-block {
  background: rgba(255,255,255,0.02);
}
.reason-text {
  margin-top: 8px;
  line-height: 1.5;
  font-weight: 500;
  font-size: 0.95rem;
}

.return-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 30px;
  border-top: 1px dashed var(--border-color);
  padding-top: 20px;
}
.action-buttons {
  display: flex;
  gap: 15px;
}

@media (max-width: 900px) {
  .return-body {
    grid-template-columns: 1fr;
  }
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>