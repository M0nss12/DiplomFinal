<template>
  <div class="notifications-page">
    <div class="notifications-container">
      
      <!-- ШАПКА СТРАНИЦЫ -->
      <header class="page-header">
        <div class="header-left">
          <h1>🔔 Уведомления</h1>
          <p class="unread-count" v-if="unreadCount > 0">У вас <b>{{ unreadCount }}</b> новых сообщений</p>
          <p class="unread-count" v-else>Все сообщения прочитаны</p>
        </div>
        <div class="header-actions">
          <button 
            v-if="unreadCount > 0" 
            @click="markAllAsRead" 
            class="btn-mark-all"
            :disabled="processingAll"
          >
            <span v-if="processingAll" class="spinner-inline"></span>
            Прочитать все
          </button>
          <router-link to="/profile" class="back-link">← В профиль</router-link>
        </div>
      </header>

      <hr class="section-divider" />

      <!-- СОСТОЯНИЕ ЗАГРУЗКИ -->
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
        <p>Загрузка уведомлений...</p>
      </div>

      <!-- СПИСОК УВЕДОМЛЕНИЙ -->
      <div v-else-if="groupedNotifications.length > 0" class="notif-list">
        <template v-for="(group, idx) in groupedNotifications" :key="idx">
          <div class="date-separator">{{ group.label }}</div>
          <transition-group name="list">
            <div 
              v-for="n in group.items" 
              :key="n.id" 
              class="notif-card glass-card"
              :class="{ 'is-unread': !n.is_read }"
              @click="handleNotifClick(n)"
            >
              <div class="notif-icon-wrap" :class="n.type">
                <span class="icon">{{ getIcon(n.type) }}</span>
              </div>

              <div class="notif-content">
                <div class="notif-top">
                  <h3 class="notif-title">{{ n.title }}</h3>
                  <span class="notif-date">{{ formatDateTime(n.created_at) }}</span>
                </div>
                <p class="notif-message">{{ n.message }}</p>
                <div v-if="isOrderNotif(n)" class="order-link-hint">
                  📋 Нажмите для перехода к заказам →
                </div>
              </div>

              <div class="notif-actions">
                <button 
                  v-if="!n.is_read" 
                  @click.stop="markAsRead(n)" 
                  class="btn-check" 
                  title="Отметить как прочитанное"
                >
                  ✔
                </button>
                <button @click.stop="deleteNotif(n.id)" class="btn-delete" title="Удалить">
                  &times;
                </button>
              </div>
            </div>
          </transition-group>
        </template>
      </div>

      <!-- ПУСТОЕ СОСТОЯНИЕ -->
      <div v-else class="empty-state glass-card">
        <div class="empty-icon">📭</div>
        <h2>Уведомлений пока нет</h2>
        <p>Здесь будут появляться новости о ваших заказах и персональные предложения.</p>
        <router-link to="/catalog" class="btn-catalog">Перейти за покупками</router-link>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const notifications = ref([]);
const loading = ref(true);
const processingAll = ref(false);
const userId = localStorage.getItem('user_id');
const API_URL = import.meta.env.VITE_API_URL || '';

const unreadCount = computed(() => notifications.value.filter(n => !n.is_read).length);

// Группировка по дате
const groupedNotifications = computed(() => {
  const groups = {
    today: { label: 'Сегодня', items: [] },
    yesterday: { label: 'Вчера', items: [] },
    thisWeek: { label: 'На этой неделе', items: [] },
    older: { label: 'Ранее', items: [] }
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  notifications.value.forEach(n => {
    const d = new Date(n.created_at);
    if (d >= startOfToday) groups.today.items.push(n);
    else if (d >= startOfYesterday) groups.yesterday.items.push(n);
    else if (d >= new Date(startOfToday.getTime() - 7 * 86400000)) groups.thisWeek.items.push(n);
    else groups.older.items.push(n);
  });

  return Object.values(groups).filter(g => g.items.length > 0);
});

const loadNotifications = async () => {
  if (!userId) return;
  try {
    const res = await axios.get(`${API_URL}/api/notifications/${userId}`);
    notifications.value = res.data;
  } catch (e) {
    console.error("Ошибка загрузки уведомлений");
  } finally {
    loading.value = false;
  }
};

const markAsRead = async (notif) => {
  if (notif.is_read) return;
  try {
    await axios.patch(`${API_URL}/api/notifications/${notif.id}`, { is_read: true });
    notif.is_read = true;
  } catch (e) {
    console.error("Ошибка при обновлении статуса");
  }
};

const markAllAsRead = async () => {
  processingAll.value = true;
  try {
    const unread = notifications.value.filter(n => !n.is_read);
    await Promise.all(unread.map(n => axios.patch(`${API_URL}/api/notifications/${n.id}`, { is_read: true })));
    notifications.value.forEach(n => n.is_read = true);
  } catch (e) {
    console.error("Ошибка при обновлении всех уведомлений");
  } finally {
    processingAll.value = false;
  }
};

const deleteNotif = async (id) => {
  try {
    await axios.delete(`${API_URL}/api/admin/notifications/${id}`, { 
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' } 
    });
    notifications.value = notifications.value.filter(n => n.id !== id);
  } catch (e) {
    console.error("Ошибка при удалении");
  }
};

// Проверка, связано ли уведомление с заказом
const isOrderNotif = (notif) => {
  if (notif.type === 'order') return true;
  const title = (notif.title || '').toLowerCase();
  return title.includes('заказ');
};

const handleNotifClick = (notif) => {
  markAsRead(notif);
  if (isOrderNotif(notif)) {
    router.push('/orders');
  }
};

const getIcon = (type) => {
  const icons = {
    'order': '📦',
    'system': '🛡️'
  };
  return icons[type] || '🔔';
};

const formatDateTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

onMounted(loadNotifications);
</script>

<style scoped>
/* ==========================================================================
   СТИЛИ СТРАНИЦЫ УВЕДОМЛЕНИЙ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */

.notifications-page {
  padding: 40px 0 80px;
  animation: fadeIn 0.5s ease-out;
  color: var(--text-main, #0f172a);
}
:global(.dark) .notifications-page { color: #f8fafc; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.notifications-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ШАПКА */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 2.4rem;
  font-weight: 900;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.unread-count { color: var(--text-muted, #64748b); font-weight: 600; font-size: 1rem; }
.unread-count b { color: var(--primary, #2563eb); }
:global(.dark) .unread-count b { color: #60a5fa; }

.header-actions { display: flex; align-items: center; gap: 20px; }

.btn-mark-all {
  background: rgba(37, 99, 235, 0.1);
  border: 1px solid rgba(37, 99, 235, 0.2);
  color: var(--primary, #2563eb);
  padding: 8px 20px;
  border-radius: 40px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
  display: flex; align-items: center; gap: 8px;
}
.btn-mark-all:hover:not(:disabled) { background: var(--primary, #2563eb); color: white; transform: translateY(-2px); }
.btn-mark-all:disabled { opacity: 0.6; cursor: not-allowed; }

.back-link { color: var(--text-muted, #94a3b8); text-decoration: none; font-weight: 700; font-size: 0.95rem; transition: color 0.2s; }
.back-link:hover { color: var(--primary, #2563eb); text-decoration: underline; }

.section-divider { border: none; height: 1px; background: var(--border-color, #e2e8f0); margin: 20px 0 40px; }
:global(.dark) .section-divider { background: #334155; }

/* ДАТЫ-РАЗДЕЛИТЕЛИ */
.date-separator {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted, #94a3b8);
  padding: 10px 0;
  margin-top: 10px;
}
:global(.dark) .date-separator { color: #64748b; }

/* КАРТОЧКИ УВЕДОМЛЕНИЙ */
.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.notif-list { display: flex; flex-direction: column; gap: 16px; }

.notif-card {
  display: flex;
  align-items: flex-start;
  padding: 20px;
  gap: 20px;
  cursor: pointer;
  position: relative;
}

.notif-card.is-unread {
  background: rgba(37, 99, 235, 0.03);
  border-left: 4px solid var(--primary, #2563eb);
}
:global(.dark) .notif-card.is-unread { background: rgba(37, 99, 235, 0.08); }

.notif-card:hover { transform: translateX(5px); border-color: var(--primary, #2563eb); }

/* Иконки типов */
.notif-icon-wrap {
  width: 50px; height: 50px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.5rem; flex-shrink: 0;
  background: rgba(0,0,0,0.03);
}
:global(.dark) .notif-icon-wrap { background: rgba(255,255,255,0.05); }

.notif-icon-wrap.order { color: #2563eb; background: rgba(37, 99, 235, 0.1); }
.notif-icon-wrap.system { color: #10b981; background: rgba(16, 185, 129, 0.1); }

.notif-content { flex: 1; }
.notif-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.notif-title { font-size: 1.1rem; font-weight: 800; margin: 0; color: var(--text-main, #0f172a); }
:global(.dark) .notif-title { color: #f8fafc; }
.notif-date { font-size: 0.8rem; color: var(--text-muted, #94a3b8); font-weight: 600; white-space: nowrap; margin-left: 15px; }

.notif-message { font-size: 0.95rem; line-height: 1.5; color: var(--text-muted, #64748b); margin: 0 0 8px 0; }
:global(.dark) .notif-message { color: #cbd5e1; }

.order-link-hint {
  font-size: 0.85rem;
  color: var(--primary, #2563eb);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
}

/* Кнопки действий на карточке */
.notif-actions { display: flex; gap: 8px; opacity: 0; transition: opacity 0.2s; margin-left: 10px; }
.notif-card:hover .notif-actions { opacity: 1; }

.btn-check, .btn-delete {
  width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-weight: bold; transition: all 0.2s;
}
.btn-check { background: var(--success, #10b981); color: white; }
.btn-check:hover { transform: scale(1.1); background: #059669; }
.btn-delete { background: rgba(0,0,0,0.05); color: var(--text-muted, #64748b); font-size: 1.2rem; }
:global(.dark) .btn-delete { background: rgba(255,255,255,0.1); color: #f8fafc; }
.btn-delete:hover { background: var(--danger, #ef4444); color: white; }

/* ПУСТОЕ СОСТОЯНИЕ */
.empty-state { text-align: center; padding: 80px 20px; border: 2px dashed var(--border-color, #cbd5e1); }
.empty-icon { font-size: 5rem; margin-bottom: 24px; opacity: 0.5; }
.empty-state h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; color: var(--text-main, #0f172a); }
:global(.dark) .empty-state h2 { color: #f8fafc; }
.empty-state p { color: var(--text-muted, #64748b); margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto; }

.btn-catalog {
  display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  color: white; border-radius: 40px; font-weight: 800; text-decoration: none; transition: all 0.3s;
}
.btn-catalog:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3); }

/* АНИМАЦИИ СПИСКА */
.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from { opacity: 0; transform: translateX(-30px); }
.list-leave-to { opacity: 0; transform: translateX(30px); }

/* ЛОАДЕР */
.loading-state { text-align: center; padding: 100px 0; }
.loader { width: 50px; height: 50px; border: 4px solid var(--border-color, #e2e8f0); border-top-color: var(--primary, #2563eb); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
.spinner-inline { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }

/* АДАПТИВНОСТЬ */
@media (max-width: 768px) {
  .page-header h1 { font-size: 1.8rem; }
  .notif-card { gap: 15px; padding: 15px; }
  .notif-icon-wrap { width: 40px; height: 40px; font-size: 1.2rem; }
  .notif-actions { opacity: 1; }
  .header-actions { width: 100%; justify-content: space-between; }
  .notif-date { display: none; }
}
</style>