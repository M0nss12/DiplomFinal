<template>
  <div class="admin-notifs">
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

    <!-- 1. ФОРМА ОТПРАВКИ (SEND CENTER) -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Отправить новое уведомление</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="sendNotification" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>👤 Получатель</label>
            <select v-model="newNotif.user_id" required class="form-input">
              <option :value="null" disabled>-- Выберите пользователя --</option>
              <option value="all">📢 ВСЕМ ПОЛЬЗОВАТЕЛЯМ (Рассылка)</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.last_name || '' }} {{ u.first_name }} ({{ u.email || u.phone_number }})
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>🏷️ Тип сообщения</label>
            <select v-model="newNotif.type" class="form-input">
              <option value="system">🛡️ Системное</option>
              <option value="order">📦 По заказу</option>
            </select>
          </div>

          <div class="input-group full-width">
            <label>📌 Заголовок</label>
            <input v-model="newNotif.title" placeholder="Напр. Ваш заказ готов к выдаче!" required class="form-input" />
          </div>

          <div class="input-group full-width">
            <label>💬 Текст сообщения</label>
            <textarea v-model="newNotif.message" placeholder="Введите текст сообщения..." rows="3" required class="form-input"></textarea>
          </div>
        </div>

        <div class="form-footer">
          <p class="hint-text" v-if="newNotif.user_id === 'all'">
            ⚠️ Внимание: сообщение будет отправлено <b>{{ users.length }}</b> пользователям.
          </p>
          <button type="submit" class="btn-primary" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner-small"></span>
            <span v-else>🚀 Отправить сейчас</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ ЖУРНАЛА -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 История уведомлений</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить</button>
      </div>
      <div class="filter-grid">
        <div class="input-group">
          <label>🔎 Поиск по тексту или ID</label>
          <input v-model="searchQuery" placeholder="Поиск..." class="form-input" />
        </div>
        <div class="input-group">
          <label>📂 Категория</label>
          <select v-model="typeFilter" class="form-input">
            <option value="all">Все типы</option>
            <option value="system">Системные</option>
            <option value="order">Заказы</option>
          </select>
        </div>
        <div class="input-group">
          <label>👁️ Статус</label>
          <select v-model="readFilter" class="form-input">
            <option value="all">Все</option>
            <option value="read">Прочитанные</option>
            <option value="unread">Непрочитанные</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
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
                <span class="type-badge" :class="n.type">{{ n.type }}</span>
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
                <button @click="deleteNotif(n.id)" class="btn-delete-small">🗑️ Удалить</button>
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
const itemsPerPage = 15;

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

// CRUD
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

// Фильтрация
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
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-notifs { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-notifs { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; margin-top: 5px; }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 28px; }
.input-group.full-width { grid-column: 1 / -1; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); display: block; margin-bottom: 8px; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; }

.form-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 20px; }
.hint-text { font-size: 0.85rem; color: var(--warning, #d97706); font-weight: 600; }

.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 24px; align-items: flex-end; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; }

.table-container { margin-top: 20px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.notif-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }

.user-cell strong { display: block; font-size: 0.95rem; color: var(--text-main, #0f172a); }
:global(.dark) .user-cell strong { color: #f8fafc; }
.user-cell small { color: var(--text-muted, #94a3b8); font-size: 0.75rem; font-weight: 600; }

/* Бейджи типов – оставлены только два */
.type-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
.type-badge.system { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.type-badge.order { background: rgba(37, 99, 235, 0.1); color: #2563eb; }

.col-msg { max-width: 400px; }
.msg-content strong { display: block; margin-bottom: 4px; color: var(--text-main, #0f172a); font-size: 0.9rem; }
:global(.dark) .msg-content strong { color: #fff; }
.msg-content p { font-size: 0.85rem; color: var(--text-muted, #64748b); line-height: 1.4; margin: 0; }
:global(.dark) .msg-content p { color: #cbd5e1; }

.read-status { font-size: 1.2rem; filter: grayscale(1); opacity: 0.3; }
.read-status.is-read { filter: grayscale(0); opacity: 1; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr; }
  .filter-grid { grid-template-columns: 1fr; }
}
</style>