<template>
  <div class="admin-tokens animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>🔑 Токены сброса пароля</h1>
        <p class="subtitle">Мониторинг запросов на восстановление доступа и управление сессиями сброса</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">⏳</span>
        Всего записей: <b>{{ filteredTokens.length }}</b>
      </div>
    </div>

    <!-- 1. ПАНЕЛЬ ФИЛЬТРОВ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск и фильтрация</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="form-group">
          <label>🔎 Поиск (ID, токен или имя пользователя)</label>
          <input v-model="searchQuery" placeholder="Введите часть ID, токена или имени..." />
        </div>
        <div class="form-group">
          <label>📅 Период создания</label>
          <select v-model="dateFilter">
            <option value="all">За всё время</option>
            <option value="today">Сегодня</option>
            <option value="week">Последняя неделя</option>
            <option value="month">Последний месяц</option>
          </select>
        </div>
        <div class="form-group">
          <label>📌 Статус токена</label>
          <select v-model="statusFilter">
            <option value="all">Все токены</option>
            <option value="active">Активные</option>
            <option value="used">Использованные</option>
            <option value="expired">Просроченные</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 2. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedTokens.length }} из {{ filteredTokens.length }} записей (страница {{ currentPage }} из {{ totalPages }})
      </div>

      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Пользователь</th>
              <th>Токен (хэш)</th>
              <th>Создан</th>
              <th>Истекает</th>
              <th class="text-center">Статус</th>
              <th class="text-right">Управление</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in paginatedTokens" :key="t.id" class="token-row">
              <td class="col-id">#{{ t.id }}</td>
              
              <td>
                <div class="user-cell">
                  <strong>{{ getUserName(t.user_id) }}</strong>
                  <code class="id-sub">ID: {{ t.user_id.split('-')[0] }}...</code>
                </div>
              </td>

              <td>
                <div class="token-cell" @click="copyToken(t.token)" title="Нажмите, чтобы скопировать">
                  <code>{{ t.token.substring(0, 12) }}...</code>
                </div>
              </td>

              <td>{{ formatDateTime(t.created_at) }}</td>
              
              <td>
                <span :class="{ 'text-danger': isExpired(t.expires_at) && !t.used }">
                  {{ formatDateTime(t.expires_at) }}
                </span>
              </td>

              <td class="text-center">
                <span class="badge" :class="getTokenStatusClass(t)">
                  {{ getTokenStatusText(t) }}
                </span>
              </td>

              <td class="text-right">
                <button
                  v-if="!t.used && !isExpired(t.expires_at)"
                  @click="toggleTokenStatus(t)"
                  class="btn btn-outline btn-sm"
                  title="Отметить как использованный"
                >
                  ✔️ Использовать
                </button>
                <button
                  v-else
                  @click="toggleTokenStatus(t)"
                  class="btn btn-outline btn-sm"
                  title="Сбросить статус (сделать активным)"
                >
                  🔄 Сбросить
                </button>
                <button @click="deleteToken(t.id)" class="btn btn-danger btn-sm ml-2" title="Аннулировать/Удалить">
                  🗑️ Удалить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const tokens = ref([]);
const users = ref([]);
const searchQuery = ref('');
const statusFilter = ref('all');
const dateFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

const loadData = async () => {
  try {
    const [tRes, uRes] = await Promise.all([
      axios.get(`/api/admin/password_reset_tokens`, config),
      axios.get(`/api/admin/users`, config)
    ]);
    tokens.value = tRes.data;
    users.value = uRes.data;
  } catch (e) {
    console.error('Ошибка загрузки данных безопасности');
  }
};

const getUserName = (id) => {
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name}`.trim() : 'Неизвестен';
};

const formatDateTime = (iso) => {
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const isExpired = (date) => new Date(date) < new Date();

const getTokenStatusText = (t) => {
  if (t.used) return 'Использован';
  if (isExpired(t.expires_at)) return 'Просрочен';
  return 'Активен';
};

const getTokenStatusClass = (t) => {
  if (t.used) return 'badge-used';
  if (isExpired(t.expires_at)) return 'badge-danger';  // используем глобальный класс для красного
  return 'badge-success';  // глобальный класс для зелёного
};

const toggleTokenStatus = async (token) => {
  const newUsed = !token.used;
  try {
    await axios.put(`/api/admin/password_reset_tokens/${token.id}`, { used: newUsed }, config);
    token.used = newUsed;
    alert(newUsed ? 'Токен помечен как использованный' : 'Токен снова активен');
  } catch (e) {
    alert('Ошибка при обновлении статуса');
  }
};

const deleteToken = async (id) => {
  if (!confirm('Удалить этот токен? Пользователь не сможет сбросить пароль по старой ссылке.')) return;
  try {
    await axios.delete(`/api/admin/password_reset_tokens/${id}`, config);
    tokens.value = tokens.value.filter(t => t.id !== id);
  } catch (e) {
    alert('Ошибка при удалении');
  }
};

const copyToken = (text) => {
  navigator.clipboard.writeText(text);
  alert('Токен скопирован в буфер обмена');
};

const filteredTokens = computed(() => {
  let res = [...tokens.value];
  
  if (statusFilter.value === 'active') res = res.filter(t => !t.used && !isExpired(t.expires_at));
  else if (statusFilter.value === 'used') res = res.filter(t => t.used);
  else if (statusFilter.value === 'expired') res = res.filter(t => !t.used && isExpired(t.expires_at));

  if (dateFilter.value !== 'all') {
    const now = new Date();
    res = res.filter(t => {
      const d = new Date(t.created_at);
      if (dateFilter.value === 'today') return d.toDateString() === now.toDateString();
      if (dateFilter.value === 'week') return (now - d) < 7 * 24 * 60 * 60 * 1000;
      if (dateFilter.value === 'month') return (now - d) < 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    res = res.filter(t => {
      const userName = getUserName(t.user_id).toLowerCase();
      return t.user_id.toLowerCase().includes(q) ||
             t.token.toLowerCase().includes(q) ||
             userName.includes(q);
    });
  }
  
  return res.sort((a, b) => b.id - a.id);
});

const totalPages = computed(() => Math.ceil(filteredTokens.value.length / itemsPerPage));
const paginatedTokens = computed(() => filteredTokens.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

const resetFilters = () => {
  searchQuery.value = '';
  statusFilter.value = 'all';
  dateFilter.value = 'all';
  currentPage.value = 1;
};
watch([searchQuery, statusFilter, dateFilter], () => currentPage.value = 1);

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ (глобальный CSS используется)
   ========================================================================== */

.admin-tokens {
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
  font-weight: 500;
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
  grid-template-columns: 2fr 1fr 1fr;
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

.table-container {
  margin-top: 20px;
}
.table-meta {
  font-size: 0.85rem;
  font-weight: 600;
}

.admin-table-wrapper {
  overflow-x: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}
.admin-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-color);
}
.admin-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  font-size: 0.9rem;
}
.token-row:hover td {
  background: rgba(37, 99, 235, 0.02);
}

.col-id {
  width: 70px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}

.user-cell strong {
  display: block;
  color: var(--text-main);
}
.id-sub {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.token-cell code {
  background: rgba(0,0,0,0.05);
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}
.token-cell code:hover {
  background: var(--primary-light);
  color: var(--primary);
}

/* Статусы – используем глобальные badge-success и badge-danger, плюс кастомный для used */
.badge.badge-used {
  background: var(--primary);
  color: white;
}

.text-danger {
  color: var(--danger);
  font-weight: 700;
}

.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}

.ml-2 {
  margin-left: 8px;
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

@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>