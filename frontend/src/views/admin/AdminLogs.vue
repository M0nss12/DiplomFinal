<template>
  <div class="admin-logs-page">
    <!-- ШАПКА ЖУРНАЛА -->
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
        <div class="input-group search-group">
          <label>🔍 Поиск</label>
          <input v-model="searchQuery" placeholder="IP, ID пользователя или текст..." class="form-input" />
        </div>

        <div class="input-group">
          <label>Тип данных</label>
          <div class="tab-switcher glass-card">
            <button :class="{ active: logType === 'actions' }" @click="setLogType('actions')">🚀 Действия</button>
            <button :class="{ active: logType === 'notifications' }" @click="setLogType('notifications')">🔔 Уведомления</button>
            <button :class="{ active: logType === 'errors' }" @click="setLogType('errors')">❌ Ошибки</button>
          </div>
        </div>

        <div class="refresh-group">
          <label class="custom-checkbox live-check">
            <input type="checkbox" v-model="autoRefresh" />
            <span class="checkmark"></span>
            <span class="live-label">LIVE</span>
          </label>
          <button @click="fetchLogs" class="btn-refresh glass-card" :disabled="loading" :title="loading ? 'Загрузка...' : 'Обновить'">
            <span :class="{ 'spinning': loading }">🔄</span>
          </button>
        </div>
      </div>
    </section>

    <!-- ТАБЛИЦА ДЕЙСТВИЙ -->
    <div v-if="logType === 'actions'" class="table-container">
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-time">Время</th>
              <th>Пользователь</th>
              <th class="col-method">Действие</th>
              <th>Сообщение</th>
              <th>IP адрес</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="log-row">
              <td class="col-time">{{ formatTime(log.timestamp) }}</td>
              <td>
                <div class="user-info">
                  <span class="user-name">{{ log.user?.name || 'Система' }}</span>
                  <small class="user-id">ID: {{ log.user?.id || '---' }}</small>
                </div>
              </td>
              <td>
                <span class="method-badge" :class="getMethodClass(log.action)">{{ log.action }}</span>
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
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-time">Время</th>
              <th>Получатель (ID)</th>
              <th>Тип</th>
              <th>Заголовок и текст</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="log-row">
              <td class="col-time">{{ formatTime(log.timestamp) }}</td>
              <td><code class="id-code">{{ log.userId || 'Все' }}</code></td>
              <td>
                <span class="type-badge" :class="log.type">{{ log.type }}</span>
              </td>
              <td class="cell-msg">
                <strong>{{ log.title }}</strong>
                <p class="msg-sub">{{ log.message }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ТАБЛИЦА ОШИБОК -->
    <div v-if="logType === 'errors'" class="table-container">
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-time">Время</th>
              <th>Сообщение</th>
              <th>Локация / URL</th>
              <th class="text-right">Детали</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="row-error">
              <td class="col-time">{{ formatTime(log.timestamp) }}</td>
              <td class="error-msg"><b>{{ log.message }}</b></td>
              <td>
                 <code class="url-text">{{ log.url }}</code>
                 <div class="user-id-small">User: {{ log.user }}</div>
              </td>
              <td class="text-right">
                <button @click="openErrorDetail(log)" class="btn-detail glass-card">🔍 Анализ</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination-wrapper">
      <button @click="currentPage--" :disabled="currentPage === 1" class="p-btn glass-card">←</button>
      <div class="p-numbers">
        <button v-for="p in totalPages" :key="p" @click="currentPage = p" class="glass-card" :class="{ active: currentPage === p }">
          {{ p }}
        </button>
      </div>
      <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-btn glass-card">→</button>
    </div>

    <!-- МОДАЛКА ДЕТАЛЕЙ ОШИБКИ -->
    <div v-if="selectedError" class="modal-overlay" @click="selectedError = null">
      <div class="modal-content log-modal glass-card" @click.stop>
        <div class="modal-header">
          <h3>🚨 Отчет об ошибке сервера</h3>
          <button @click="selectedError = null" class="close-btn">&times;</button>
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
const itemsPerPage = 25;
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
    logs.value = res.data;
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

const formatTime = (ts) => {
    if (!ts) return '---';
    // Если формат "08.05.2026, 15:30:45", берем только время
    return ts.includes(', ') ? ts.split(', ')[1] : ts;
};

const openErrorDetail = (log) => { selectedError.value = log; };

onMounted(fetchLogs);
onUnmounted(() => clearInterval(refreshInterval));
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ЛОГИ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.admin-logs-page { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-logs-page { color: #f8fafc; }

/* ШАПКА */
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-grid { display: grid; grid-template-columns: 1.5fr 2fr 1fr; gap: 25px; align-items: flex-end; }

/* ИНПУТЫ */
.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; }

/* ПЕРЕКЛЮЧАТЕЛЬ ВКЛАДОК */
.tab-switcher { background: rgba(0,0,0,0.03); padding: 4px; display: flex; gap: 4px; border-radius: 12px; }
:global(.dark) .tab-switcher { background: rgba(255,255,255,0.05); }
.tab-switcher button {
  flex: 1; padding: 10px; border: none; background: transparent; color: var(--text-muted, #64748b);
  font-weight: 800; font-size: 0.85rem; cursor: pointer; border-radius: 10px; transition: all 0.2s;
}
.tab-switcher button.active { background: var(--primary, #2563eb); color: white; box-shadow: 0 4px 10px rgba(37,99,235,0.2); }

/* REFRESH И LIVE */
.refresh-group { display: flex; align-items: center; gap: 20px; justify-content: flex-end; }
.live-check { color: var(--success, #10b981) !important; font-weight: 800; display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.8rem; }
.btn-refresh {
  width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; cursor: pointer; background: var(--bg-card, #fff); transition: transform 0.2s;
}
.btn-refresh:hover { transform: scale(1.1); color: var(--primary, #2563eb); border-color: var(--primary, #2563eb); }
.spinning { animation: spin 1s linear infinite; display: inline-block; }

/* ТАБЛИЦА */
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 14px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; font-size: 0.9rem; }
:global(.dark) .admin-table td { border-color: #334155; }
.log-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-time { font-family: 'JetBrains Mono', monospace; font-weight: 800; color: var(--primary, #2563eb); width: 100px; }
code { background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: var(--text-muted, #64748b); }
:global(.dark) code { background: rgba(255,255,255,0.05); color: #94a3b8; }

/* Методы и Типы */
.method-badge { padding: 4px 10px; border-radius: 6px; font-weight: 900; font-family: monospace; font-size: 0.75rem; text-transform: uppercase; }
.m-get { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.m-post { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.m-update { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.m-delete { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.type-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.type-badge.order { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.type-badge.system { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.user-info { display: flex; flex-direction: column; }
.user-name { font-weight: 800; font-size: 0.9rem; }
.user-id { font-size: 0.7rem; color: var(--text-muted, #94a3b8); }

/* ОШИБКИ */
.row-error { background: rgba(239, 68, 68, 0.02); }
.error-msg { color: var(--danger, #ef4444); font-size: 0.95rem; }
.url-text { color: var(--text-muted, #64748b); font-size: 0.8rem; }
.btn-detail { background: rgba(0,0,0,0.03); border: 1px solid var(--border-color, #cbd5e1); padding: 8px 16px; border-radius: 30px; cursor: pointer; font-weight: 700; font-size: 0.8rem; transition: 0.2s; }
:global(.dark) .btn-detail { background: rgba(255,255,255,0.05); border-color: #475569; color: #f8fafc; }
.btn-detail:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); }

/* МОДАЛКА */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; animation: fadeIn 0.2s; }
.log-modal { width: 90%; max-width: 900px; padding: 35px; position: relative; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.modal-header h3 { font-size: 1.5rem; font-weight: 900; }
.close-btn { background: none; border: none; font-size: 2.2rem; cursor: pointer; color: var(--text-muted, #94a3b8); }

.terminal-box {
    background: #0f172a; color: #38bdf8; padding: 25px; border-radius: 12px;
    font-family: 'JetBrains Mono', monospace; font-size: 0.85rem; overflow-x: auto;
    margin: 15px 0; line-height: 1.6; border: 1px solid rgba(255,255,255,0.1);
    box-shadow: inset 0 4px 10px rgba(0,0,0,0.5);
}
:global(.dark) .terminal-box { background: #020617; }
.label-tech { font-weight: 800; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted, #64748b); margin-top: 20px; }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-weight: 900; cursor: pointer; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) { .filter-grid { grid-template-columns: 1fr; gap: 15px; } .refresh-group { justify-content: space-between; } }
@media (max-width: 600px) { .admin-logs-page { padding: 20px 15px; } .header-row { flex-direction: column; align-items: flex-start; } .p-numbers { display: none; } }
</style>