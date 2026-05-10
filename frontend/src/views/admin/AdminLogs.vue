<template>
  <div class="admin-logs-page animate-fade-in">
    <!-- ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>🖥️ Системный журнал</h1>
        <p class="subtitle">Мониторинг активности, ошибок и рассылок уведомлений</p>
      </div>
      <div class="stats-badge glass-card">
        Записей: <b>{{ filteredLogs.length }}</b>
      </div>
    </div>

    <!-- ПАНЕЛЬ УПРАВЛЕНИЯ -->
    <section class="admin-card control-panel glass-card">
      <div class="filter-grid">
        <div class="form-group">
          <label>🔍 Поиск</label>
          <input v-model="searchQuery" placeholder="IP, ID пользователя или текст..." />
        </div>

        <div class="form-group">
          <label>Тип данных</label>
          <div class="tab-switcher">
            <button :class="{ active: logType === 'actions' }" @click="setLogType('actions')">🚀 Действия</button>
            <button :class="{ active: logType === 'notifications' }" @click="setLogType('notifications')">🔔 Уведомления</button>
            <button :class="{ active: logType === 'errors' }" @click="setLogType('errors')">❌ Ошибки</button>
          </div>
        </div>

        <div class="refresh-group">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="autoRefresh" />
            <span class="checkmark"></span>
            <span class="live-label">LIVE</span>
          </label>
          <button @click="fetchLogs" class="btn btn-outline btn-sm" :disabled="loading">
            <span v-if="loading" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
            <span v-else>🔄 Обновить</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ТАБЛИЦА ДЕЙСТВИЙ -->
    <div v-if="logType === 'actions'" class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedLogs.length }} из {{ filteredLogs.length }} записей (страница {{ currentPage }} из {{ totalPages }})
      </div>
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-datetime">Дата/Время</th>
              <th>Пользователь</th>
              <th class="col-method">Действие</th>
              <th>Сообщение</th>
              <th>IP адрес</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="log-row">
              <td class="col-datetime">{{ log.timestamp || '—' }}</td>
              <td>
                <div class="user-info">
                  <span class="user-name">{{ log.user?.name || 'Система' }}</span>
                  <small class="text-muted text-xs">ID: {{ log.user?.id || '---' }}</small>
                </div>
              </td>
              <td>
                <span class="badge" :class="getMethodClass(log.action)">{{ log.action }}</span>
              </td>
              <td class="cell-msg">{{ log.message }}</td>
              <td><code>{{ log.ip }}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ТАБЛИЦА УВЕДОМЛЕНИЙ -->
    <div v-if="logType === 'notifications'" class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedLogs.length }} из {{ filteredLogs.length }} записей (страница {{ currentPage }} из {{ totalPages }})
      </div>
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-datetime">Дата/Время</th>
              <th>Получатель (ID)</th>
              <th>Тип</th>
              <th>Заголовок и текст</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="log-row">
              <td class="col-datetime">{{ log.timestamp || '—' }}</td>
              <td><code class="id-code">{{ log.userId || 'Все' }}</code></td>
              <td>
                <span class="badge" :class="log.type">{{ log.type }}</span>
              </td>
              <td class="cell-msg">
                <strong>{{ log.title }}</strong>
                <p class="msg-sub text-muted text-xs">{{ log.message }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ТАБЛИЦА ОШИБОК -->
    <div v-if="logType === 'errors'" class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedLogs.length }} из {{ filteredLogs.length }} записей (страница {{ currentPage }} из {{ totalPages }})
      </div>
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-datetime">Дата/Время</th>
              <th>Сообщение</th>
              <th>Локация / URL</th>
              <th class="text-right">Детали</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="row-error">
              <td class="col-datetime">{{ log.timestamp || '—' }}</td>
              <td class="error-msg"><b>{{ log.message }}</b></td>
              <td>
                 <code class="url-text">{{ log.url }}</code>
                 <div class="text-muted text-xs">User: {{ log.user }}</div>
              </td>
              <td class="text-right">
                <button @click="openErrorDetail(log)" class="btn btn-outline btn-sm">🔍 Анализ</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination-wrapper mt-3">
      <div class="pagination">
        <button @click="currentPage = 1" :disabled="currentPage === 1" title="Первая страница">
          ««
        </button>
        <button @click="currentPage--" :disabled="currentPage === 1" title="Предыдущая">
          «
        </button>
        <div class="pagination-pages">
          <button
            v-for="p in visiblePages"
            :key="p"
            @click="currentPage = p"
            :class="{ active: currentPage === p }"
          >
            {{ p }}
          </button>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages" title="Следующая">
          »
        </button>
        <button @click="currentPage = totalPages" :disabled="currentPage === totalPages" title="Последняя страница">
          »»
        </button>
      </div>
      <div class="pagination-info text-muted text-sm mt-2">
        Всего страниц: {{ totalPages }} | Записей на странице: {{ itemsPerPage }}
      </div>
    </div>

    <!-- МОДАЛКА ДЕТАЛЕЙ ОШИБКИ -->
    <div v-if="selectedError" class="modal-overlay" @click="selectedError = null">
      <div class="modal-content log-modal glass-card" @click.stop>
        <div class="modal-header">
          <h3>🚨 Отчет об ошибке сервера</h3>
          <button @click="selectedError = null" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="tech-info">
                <strong>Событие:</strong> <code>{{ selectedError.message }}</code>
            </div>
            <div class="tech-info" style="margin-top: 10px">
                <strong>Маршрут:</strong> <code class="url-code">{{ selectedError.url }}</code>
            </div>
            <p class="label-tech">Системный стек:</p>
            <pre class="terminal-box">{{ selectedError.stack || 'Стек отсутствует' }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const logs = ref([]);
const logType = ref('actions'); 
const selectedError = ref(null);
const loading = ref(false);
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 50;
const autoRefresh = ref(false);
let refreshInterval = null;

const setLogType = (type) => { 
  logType.value = type; 
  currentPage.value = 1; 
  fetchLogs(); 
};

const fetchLogs = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`/api/admin/system/logs?type=${logType.value}`, config);
    logs.value = res.data || [];
  } catch (e) {
    console.error('Ошибка загрузки журналов');
  } finally {
    loading.value = false;
  }
};

const filteredLogs = computed(() => {
    if (!searchQuery.value.trim()) return logs.value;
    const q = searchQuery.value.toLowerCase().trim();
    return logs.value.filter(l => {
        if (!l) return false;
        const msg = (l.message || '').toLowerCase();
        const title = (l.title || '').toLowerCase();
        const ip = (l.ip || '');
        const userName = (l.user?.name || '').toLowerCase();
        const userId = (l.userId || l.user?.id || '').toString();
        
        return msg.includes(q) || title.includes(q) || ip.includes(q) || userName.includes(q) || userId.includes(q);
    });
});

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / itemsPerPage));
const paginatedLogs = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage;
    return filteredLogs.value.slice(start, start + itemsPerPage);
});

// Вычисляет список видимых страниц (текущая ±2, с ограничениями)
const visiblePages = computed(() => {
  const total = totalPages.value;
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const current = currentPage.value;
  let start = Math.max(1, current - 2);
  let end = Math.min(total, current + 2);
  if (current <= 3) end = 5;
  if (current >= total - 2) start = total - 4;
  const pages = [];
  if (start > 1) pages.push(1, '...');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) pages.push('...', total);
  return pages;
});

watch(searchQuery, () => currentPage.value = 1);
watch(autoRefresh, (newVal) => {
    if (newVal) refreshInterval = setInterval(fetchLogs, 10000);
    else clearInterval(refreshInterval);
});

const getMethodClass = (action) => {
    if (!action) return 'm-get';
    const a = action.toUpperCase();
    if (a.includes('DELETE')) return 'm-delete';
    if (a.includes('POST') || a.includes('CREATE')) return 'm-post';
    if (a.includes('PATCH') || a.includes('PUT') || a.includes('UPDATE')) return 'm-update';
    return 'm-get';
};

const openErrorDetail = (log) => { selectedError.value = log; };

onMounted(fetchLogs);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СИСТЕМНОГО ЖУРНАЛА (глобальные классы уже применены)
   ========================================================================== */

.admin-logs-page {
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
  font-size: 0.9rem;
}

.admin-card {
  padding: 25px;
  margin-bottom: 30px;
}

.filter-grid {
  display: grid;
  grid-template-columns: 1.5fr 2fr 1fr;
  gap: 25px;
  align-items: flex-end;
}

/* Переключатель вкладок */
.tab-switcher {
  background: rgba(0,0,0,0.03);
  padding: 4px;
  display: flex;
  gap: 4px;
  border-radius: 12px;
}
:global(.dark) .tab-switcher {
  background: rgba(255,255,255,0.05);
}
.tab-switcher button {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  border-radius: 10px;
  transition: all 0.2s;
}
.tab-switcher button.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 10px rgba(37,99,235,0.2);
}

/* Группа обновления */
.refresh-group {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: flex-end;
}

.live-label {
  color: var(--success);
  font-weight: 800;
}

/* Таблицы */
.table-container { margin-top: 20px; }
.admin-table-wrapper { overflow-x: auto; }
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
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  font-size: 0.9rem;
}
.log-row:hover td {
  background: rgba(37, 99, 235, 0.02);
}

.col-datetime {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  color: var(--primary);
  width: 130px;
  white-space: nowrap;
}

code {
  background: rgba(0,0,0,0.05);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.85rem;
  color: var(--text-muted);
}
:global(.dark) code {
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
}

/* Бейджи действий (поверх глобального .badge) */
.badge.m-post { background: var(--primary); }
.badge.m-update { background: var(--warning); }
.badge.m-delete { background: var(--danger); }
.badge.m-get { background: var(--success); }

.badge.order { background: var(--primary); }
.badge.system { background: var(--success); }

.user-info {
  display: flex;
  flex-direction: column;
}
.user-name {
  font-weight: 800;
  font-size: 0.9rem;
}

.row-error {
  background: rgba(239, 68, 68, 0.02);
}
.error-msg {
  color: var(--danger);
  font-size: 0.95rem;
}

/* Модалка */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
}
.log-modal {
  width: 90%;
  max-width: 900px;
  padding: 35px;
  position: relative;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
.modal-header h3 {
  font-size: 1.5rem;
  font-weight: 900;
}

.terminal-box {
  background: #0f172a;
  color: #38bdf8;
  padding: 25px;
  border-radius: 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  overflow-x: auto;
  margin: 15px 0;
  line-height: 1.6;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 4px 10px rgba(0,0,0,0.5);
}
:global(.dark) .terminal-box {
  background: #020617;
}
.label-tech {
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-top: 20px;
}

/* ПАГИНАЦИЯ */
.pagination-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 24px;
}

.pagination-pages {
  display: flex;
  gap: 4px;
}
.pagination-pages button {
  min-width: 40px;
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
.pagination-pages button:hover:not(.active) {
  background: var(--primary-light);
  border-color: var(--primary);
}
.pagination-pages button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.pagination-pages button:disabled {
  opacity: 0.5;
  cursor: default;
}

@media (max-width: 1024px) {
  .filter-grid { grid-template-columns: 1fr; gap: 15px; }
  .refresh-group { justify-content: space-between; }
}
@media (max-width: 600px) {
  .admin-logs-page { padding: 20px 15px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .pagination-pages { gap: 2px; }
  .pagination-pages button { min-width: 34px; height: 34px; font-size: 0.8rem; }
}
</style>