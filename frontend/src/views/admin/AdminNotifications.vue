<template>
  <div class="admin-notifs animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>🔔 Управление уведомлениями</h1>
        <p class="subtitle">Создание персональных пушей и рассылка системных оповещений</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📈</span>
        Всего пушей: <b>{{ filteredNotifs.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА ОТПРАВКИ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Отправить новое уведомление</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="sendNotification" class="admin-form">
        <div class="input-grid">
          <div class="form-group">
            <label>👤 Получатель</label>
            <select v-model="newNotif.user_id" required>
              <option :value="null" disabled>-- Выберите пользователя --</option>
              <option value="all">📢 ВСЕМ ПОЛЬЗОВАТЕЛЯМ (Рассылка)</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.last_name || '' }} {{ u.first_name }} ({{ u.email || u.phone_number }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>🏷️ Тип сообщения</label>
            <select v-model="newNotif.type">
              <option value="system">🛡️ Системное</option>
              <option value="order">📦 По заказу</option>
            </select>
          </div>

          <div class="form-group full-width">
            <label>📌 Заголовок</label>
            <input v-model="newNotif.title" placeholder="Напр. Ваш заказ готов к выдаче!" required />
          </div>

          <div class="form-group full-width">
            <label>💬 Текст сообщения</label>
            <textarea v-model="newNotif.message" placeholder="Введите текст сообщения..." rows="3" required></textarea>
          </div>
        </div>

        <div class="form-footer">
          <p class="hint-text" v-if="newNotif.user_id === 'all'">
            ⚠️ Внимание: сообщение будет отправлено <b>{{ users.length }}</b> пользователям.
          </p>
          <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner" style="width: 16px; height: 16px; border-width: 2px;"></span>
            <span v-else>🚀 Отправить сейчас</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ ИСТОРИИ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 История уведомлений</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить</button>
      </div>
      <div class="filter-grid">
        <div class="form-group">
          <label>🔎 Поиск по тексту или ID</label>
          <input v-model="searchQuery" placeholder="Поиск..." />
        </div>
        <div class="form-group">
          <label>📂 Категория</label>
          <select v-model="typeFilter">
            <option value="all">Все типы</option>
            <option value="system">Системные</option>
            <option value="order">Заказы</option>
          </select>
        </div>
        <div class="form-group">
          <label>👁️ Статус</label>
          <select v-model="readFilter">
            <option value="all">Все</option>
            <option value="read">Прочитанные</option>
            <option value="unread">Непрочитанные</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedNotifs.length }} из {{ filteredNotifs.length }} записей (страница {{ currentPage }} из {{ totalPages }})
      </div>
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Получатель</th>
              <th>Тип</th>
              <th>Содержание</th>
              <th class="text-center">Прочитано</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="n in paginatedNotifs" :key="n.id" class="notif-row">
              <td class="col-id">#{{ n.id }}</td>
              
              <td>
                <div class="user-cell">
                  <strong>{{ getUserName(n.user_id) }}</strong>
                  <small>{{ formatDate(n.created_at) }}</small>
                </div>
              </td>

              <td>
                <span class="badge" :class="n.type">{{ n.type }}</span>
              </td>

              <td class="col-msg">
                <div class="msg-content">
                   <strong>{{ n.title }}</strong>
                   <p>{{ n.message }}</p>
                </div>
              </td>

              <td class="text-center">
                <div class="read-status" :class="{ 'is-read': n.is_read }">
                  {{ n.is_read ? '👁️' : '📩' }}
                </div>
              </td>

              <td class="text-right">
                <button @click="deleteNotif(n.id)" class="btn btn-danger btn-sm">🗑️ Удалить</button>
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
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const notifications = ref([]);
const users = ref([]);
const loadingAction = ref(false);
const searchQuery = ref('');
const typeFilter = ref('all');
const readFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

const newNotif = reactive({ user_id: null, type: 'system', title: '', message: '' });

const loadData = async () => {
  try {
    const [nRes, uRes] = await Promise.all([
      axios.get(`/api/admin/notifications`, config),
      axios.get(`/api/admin/users`, config)
    ]);
    notifications.value = nRes.data;
    users.value = uRes.data;
  } catch (e) { console.error('Ошибка загрузки уведомлений'); }
};

const getUserName = (id) => {
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name}`.trim() : 'Система / Все';
};

const formatDate = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const sendNotification = async () => {
  loadingAction.value = true;
  try {
    if (newNotif.user_id === 'all') {
      const promises = users.value.map(u => 
        axios.post(`/api/admin/notifications`, { ...newNotif, user_id: u.id }, config)
      );
      await Promise.all(promises);
      alert(`Рассылка завершена для ${users.value.length} пользователей`);
    } else {
      const res = await axios.post(`/api/admin/notifications`, newNotif, config);
      notifications.value.unshift(res.data);
      alert('Уведомление отправлено!');
    }
    Object.assign(newNotif, { user_id: null, type: 'system', title: '', message: '' });
    await loadData();
  } catch (e) { alert('Ошибка при отправке'); }
  finally { loadingAction.value = false; }
};

const deleteNotif = async (id) => {
  if (!confirm('Удалить это уведомление из истории?')) return;
  try {
    await axios.delete(`/api/admin/notifications/${id}`, config);
    notifications.value = notifications.value.filter(n => n.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const filteredNotifs = computed(() => {
  let res = [...notifications.value];
  if (typeFilter.value !== 'all') res = res.filter(n => n.type === typeFilter.value);
  if (readFilter.value === 'read') res = res.filter(n => n.is_read);
  if (readFilter.value === 'unread') res = res.filter(n => !n.is_read);
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    res = res.filter(n => 
      n.title.toLowerCase().includes(q) || 
      n.message.toLowerCase().includes(q) ||
      getUserName(n.user_id).toLowerCase().includes(q)
    );
  }
  return res.sort((a, b) => b.id - a.id);
});

const totalPages = computed(() => Math.ceil(filteredNotifs.value.length / itemsPerPage));
const paginatedNotifs = computed(() => filteredNotifs.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

const resetFilters = () => { searchQuery.value = ''; typeFilter.value = 'all'; readFilter.value = 'all'; currentPage.value = 1; };
watch([searchQuery, typeFilter, readFilter], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ (глобальный CSS используется)
   ========================================================================== */

.admin-notifs {
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
  padding: 28px;
  margin-bottom: 32px;
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
  margin-top: 5px;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 28px;
}
.full-width {
  grid-column: 1 / -1;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  border-top: 1px dashed var(--border-color);
  padding-top: 20px;
}
.hint-text {
  font-size: 0.85rem;
  color: var(--warning);
  font-weight: 600;
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

.filter-section {
  background: rgba(0,0,0,0.01);
  border-style: dashed;
}
.filter-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 24px;
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
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-color);
}
.admin-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}
.notif-row:hover td {
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
  font-size: 0.95rem;
  color: var(--text-main);
}
.user-cell small {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Бейджи типов (поверх глобального .badge) */
.badge.system { background: var(--success); }
.badge.order { background: var(--primary); }

.col-msg {
  max-width: 400px;
}
.msg-content strong {
  display: block;
  margin-bottom: 4px;
  color: var(--text-main);
  font-size: 0.9rem;
}
.msg-content p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin: 0;
}

.read-status {
  font-size: 1.2rem;
  filter: grayscale(1);
  opacity: 0.3;
}
.read-status.is-read {
  filter: grayscale(0);
  opacity: 1;
}

.text-right { text-align: right; }
.text-center { text-align: center; }

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
  .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .input-grid {
    grid-template-columns: 1fr;
  }
  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>