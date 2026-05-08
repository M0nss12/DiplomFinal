<template>
  <div class="admin-tokens">
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
        <div class="input-group search-group">
          <label>🔎 Поиск (User ID или токен)</label>
          <input v-model="searchQuery" placeholder="Введите часть ID или токена..." class="form-input" />
        </div>
        <div class="input-group">
          <label>📌 Статус токена</label>
          <select v-model="statusFilter" class="form-input">
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
      <div class="table-meta">
        <span class="meta-icon">📄</span>
        Последние запросы безопасности
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
                <span class="status-badge" :class="getTokenStatusClass(t)">
                  {{ getTokenStatusText(t) }}
                </span>
              </td>

              <td class="text-right">
                <button @click="deleteToken(t.id)" class="btn-delete-small" title="Аннулировать/Удалить">
                  🗑️ Удалить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
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
const currentPage = ref(1);
const itemsPerPage = 15;

const loadData = async () => {
  try {
    const [tRes, uRes] = await Promise.all([
      axios.get(`${API_URL}/api/admin/password_reset_tokens`, config),
      axios.get(`${API_URL}/api/admin/users`, config)
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
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const isExpired = (date) => new Date(date) < new Date();

const getTokenStatusText = (t) => {
  if (t.used) return 'Использован';
  if (isExpired(t.expires_at)) return 'Просрочен';
  return 'Активен';
};

const getTokenStatusClass = (t) => {
  if (t.used) return 'status-used';
  if (isExpired(t.expires_at)) return 'status-expired';
  return 'status-active';
};

const deleteToken = async (id) => {
  if (!confirm('Удалить этот токен? Пользователь не сможет сбросить пароль по старой ссылке.')) return;
  try {
    await axios.delete(`${API_URL}/api/admin/password_reset_tokens/${id}`, config);
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

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    res = res.filter(t => t.user_id.toLowerCase().includes(q) || t.token.toLowerCase().includes(q));
  }
  
  return res.sort((a, b) => b.id - a.id);
});

const totalPages = computed(() => Math.ceil(filteredTokens.value.length / itemsPerPage));
const paginatedTokens = computed(() => filteredTokens.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

const resetFilters = () => { searchQuery.value = ''; statusFilter.value = 'all'; currentPage.value = 1; };
watch([searchQuery, statusFilter], () => currentPage.value = 1);

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ТОКЕНЫ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-tokens { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-tokens { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

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

/* ИНПУТЫ */
.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; }

.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; font-size: 0.9rem; }
:global(.dark) .admin-table td { border-color: #334155; }
.token-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }
.user-cell strong { display: block; color: var(--text-main, #0f172a); }
:global(.dark) .user-cell strong { color: #f8fafc; }
.id-sub { font-size: 0.7rem; color: var(--text-muted, #94a3b8); }

.token-cell code { background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.token-cell code:hover { background: var(--primary-light); color: var(--primary, #2563eb); }

/* СТАТУСЫ */
.status-badge { padding: 6px 12px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.status-active { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }
.status-used { background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.2); }
.status-expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

.text-danger { color: var(--danger, #ef4444); font-weight: 700; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; }

@media (max-width: 900px) { .filter-grid { grid-template-columns: 1fr; } }
</style>