<template>
  <div class="profile-container">
    <!-- 1. ШАПКА ПРОФИЛЯ -->
    <section v-if="user" class="profile-header glass-card">
      <div class="profile-user-info">
        <img :src="user.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png'" class="profile-avatar" />
        <div>
          <h1 class="profile-title">Личный кабинет</h1>
          <!-- Используем новые поля first_name и last_name -->
          <p class="profile-welcome">Добро пожаловать, <strong>{{ user.first_name || user.email }}</strong>!</p>
        </div>
      </div>
      <div class="profile-since-badge" v-if="user.created_at">
        📅 На сайте с {{ formatDate(user.created_at) }}
      </div>
    </section>
    <div v-else class="profile-loading glass-card">Загрузка данных профиля...</div>

    <hr class="profile-divider" />

    <!-- 2. БЛОК СТАТИСТИКИ -->
    <section class="stats-grid">
      <div class="stat-card glass-card">
        <small class="stat-label">ЗАКАЗОВ</small>
        <h2 class="stat-value">{{ Array.isArray(orders) ? orders.length : 0 }}</h2>
      </div>
      <div class="stat-card glass-card">
        <small class="stat-label">ТРАТЫ</small>
        <h2 class="stat-value">{{ totalSpent }} ₽</h2>
      </div>
      <div class="stat-card glass-card">
        <small class="stat-label">ИЗБРАННОЕ</small>
        <h2 class="stat-value">{{ wishlistCount }}</h2>
        <router-link to="/wishlist" class="stat-link">Перейти →</router-link>
      </div>
      <div class="stat-card glass-card">
        <small class="stat-label">ГАРАЖ</small>
        <h2 class="stat-value">{{ vehiclesCount }}</h2>
        <router-link to="/garage" class="stat-link">Мои авто →</router-link>
      </div>
    </section>

    <!-- 3. КНОПКИ ДЕЙСТВИЙ -->
    <section class="action-buttons">
      <router-link to="/settings" class="action-btn settings-btn glass-card">⚙️ Настройки</router-link>
      <router-link to="/catalog" class="action-btn catalog-btn">🛒 В каталог</router-link>
    </section>

    <!-- 4. УВЕДОМЛЕНИЯ (НОВЫЙ БЛОК) -->
    <section class="notifications-section glass-card">
      <div class="section-header">
        <h3 class="section-title">
          🔔 Последние уведомления 
          <span v-if="unreadCount > 0" class="badge notif-badge">{{ unreadCount }}</span>
        </h3>
        <router-link to="/notifications" class="view-all-link">Все уведомления →</router-link>
      </div>

      <div v-if="loadingNotifs" class="loading-text">Загрузка уведомлений...</div>
      <div v-else-if="notifications.length > 0" class="notif-list">
        <div 
          v-for="n in notifications" 
          :key="n.id" 
          class="notif-item" 
          :class="{ 'unread': !n.is_read }"
        >
          <div class="notif-header">
            <strong>{{ n.title }}</strong>
            <small>{{ formatDate(n.created_at) }}</small>
          </div>
          <p>{{ n.message }}</p>
        </div>
      </div>
      <div v-else class="empty-state">У вас пока нет уведомлений.</div>
    </section>

    <!-- 5. ОСНОВНОЙ КОНТЕНТ: ЗАКАЗЫ + НЕДАВНО ПРОСМОТРЕННЫЕ -->
    <div class="profile-content">
      <!-- ЗАКАЗЫ -->
      <div class="orders-section glass-card">
        <div class="section-header">
          <h3 class="section-title">📦 Последние заказы</h3>
          <router-link to="/orders" class="view-all-link">Все заказы →</router-link>
        </div>

        <div v-if="loadingOrders" class="loading-text">Загрузка заказов...</div>
        <div v-else-if="Array.isArray(orders) && orders.length > 0" class="orders-list">
          <div v-for="o in orders.slice(0, 5)" :key="o.id" class="order-card">
            <div class="order-header">
              <div class="order-info">
                <strong class="order-number">Заказ №{{ o.id }}</strong>
                <div class="order-date">от {{ formatDate(o.created_at) }}</div>
              </div>
              <div class="order-statuses">
                <span :style="getDeliveryStatusStyle(o.delivery_status)" class="status-badge">
                  {{ translateDelivery(o.delivery_status) }}
                </span>
                <span :style="getPaymentStatusStyle(o.payment_status)" class="payment-badge">
                  {{ translatePayment(o.payment_status) }}
                </span>
              </div>
            </div>

            <div class="order-items">
              <div v-for="item in o.order_items" :key="item.id" class="order-item">
                <router-link :to="'/product/' + item.product_id" class="order-item-img-link">
                  <!-- Картинка из массива images -->
                  <img :src="item.products?.images && item.products.images.length > 0 ? item.products.images[0] : '/assets/images/no-image.png'" class="order-item-img" />
                  <span v-if="item.quantity > 1" class="order-item-qty">x{{ item.quantity }}</span>
                </router-link>
                <div class="order-item-details">
                  <router-link :to="'/product/' + item.product_id" class="order-item-name">
                    {{ item.products?.name || 'Товар недоступен' }}
                  </router-link>
                  <div class="order-item-price">{{ item.quantity }} шт. × {{ item.unit_price }} ₽</div>
                </div>
              </div>
            </div>

            <div class="order-total">Итого: {{ o.total_price }} ₽</div>
          </div>
        </div>
        <div v-else class="empty-state">Заказов пока нет. Время сделать первую покупку!</div>
      </div>

      <!-- НЕДАВНО ПРОСМОТРЕННЫЕ -->
      <div class="recent-section glass-card">
        <h3 class="section-title">👁️ Недавно смотрели ({{ recentProducts.length }})</h3>
        <div class="recent-list">
          <div v-if="recentProducts.length > 0">
            <div v-for="p in recentProducts" :key="p.id" class="recent-item">
              <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" class="recent-img" />
              <div class="recent-info">
                <router-link :to="'/product/' + p.id" class="recent-name">{{ p.name }}</router-link>
                <div class="recent-price">{{ p.discount_price || p.price }} ₽</div>
              </div>
              <button @click="removeFromRecent(p.id)" class="recent-remove" title="Удалить из истории">&times;</button>
            </div>
          </div>
          <div v-else class="empty-state">История пуста</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { supabase } from '@/supabase';

const user = ref(null);
const orders = ref([]);
const recentProducts = ref([]);
const wishlistCount = ref(0);
const vehiclesCount = ref(0);
const loadingOrders = ref(true);

// Уведомления
const notifications = ref([]);
const loadingNotifs = ref(true);
const unreadCount = ref(0);

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
// Обновлено под новые статусы БД
const translateDelivery = (s) => ({ 'processing': 'Обработка', 'shipping': 'В пути', 'delivered': 'Получен', 'cancelled': 'Отменен', 'returned': 'Возврат' }[s] || 'В обработке');
const getDeliveryStatusStyle = (s) => {
  if (['cancelled', 'returned'].includes(s)) return { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
  if (s === 'delivered') return { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
  return { backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' };
};

const translatePayment = (s) => ({ 'paid': 'Оплачен', 'unpaid': 'Не оплачен', 'refunded': 'Возврат средств' }[s] || 'Ожидание');
const getPaymentStatusStyle = (s) => ({ 
  'paid': { color: 'var(--success)', borderColor: 'rgba(16, 185, 129, 0.5)' },
  'unpaid': { color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.5)' },
  'refunded': { color: 'var(--text-muted)', borderColor: 'var(--border-color)' }
}[s] || { color: 'var(--text-muted)' });

const formatDate = (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '---';
const totalSpent = computed(() => Array.isArray(orders.value) ? orders.value.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + Number(o.total_price || 0), 0) : 0);

// --- ЗАГРУЗКА ДАННЫХ ---
const loadData = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) return;

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Профиль
  try {
    const uRes = await axios.get(`/api/users/profile/${userId}`);
    user.value = uRes.data;
  } catch (e) { console.error("Ошибка загрузки профиля"); }

  // Заказы
  axios.get(`/api/orders/${userId}`).then(res => { orders.value = res.data; loadingOrders.value = false; });
  
  // Избранное
  axios.get(`/api/wishlist/${userId}`).then(res => wishlistCount.value = res.data.length);

  // Уведомления (Новое)
  axios.get(`/api/notifications/${userId}`).then(res => {
    notifications.value = res.data.slice(0, 3); // Показываем 3 последних
    unreadCount.value = res.data.filter(n => !n.is_read).length;
    loadingNotifs.value = false;
  }).catch(() => loadingNotifs.value = false);


   try {
    const vRes = await axios.get(`/api/admin/user_vehicles`, config);
    // Фильтруем машины, чтобы посчитать только те, что принадлежат текущему юзеру
    vehiclesCount.value = vRes.data.filter(v => v.user_id === userId).length;
  } catch (e) {
    console.error("Ошибка загрузки гаража в профиле", e);
  }

  // Недавно просмотренные
  const savedIds = JSON.parse(localStorage.getItem('recent_views') || '[]');
  if (savedIds.length) {
    axios.post(`/api/products/recent`, { ids: savedIds.slice(0, 15) }).then(res => {
      const productsMap = new Map(res.data.map(p => [p.id, p]));
      recentProducts.value = savedIds.map(id => productsMap.get(id)).filter(p => p);
    });
  }
};

const removeFromRecent = (id) => {
  let ids = JSON.parse(localStorage.getItem('recent_views') || '[]');
  ids = ids.filter(i => i !== id);
  localStorage.setItem('recent_views', JSON.stringify(ids));
  recentProducts.value = recentProducts.value.filter(p => p.id !== id);
};

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session && !localStorage.getItem('user_id')) {
    const sbUser = session.user;
    localStorage.setItem('user_id', sbUser.id);
    localStorage.setItem('user_name', sbUser.user_metadata?.full_name || sbUser.email);
    localStorage.setItem('user_avatar', sbUser.user_metadata?.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png');
    localStorage.setItem('role', 'user');
    window.location.reload();
  }
  loadData();
});
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

.profile-container { max-width: 1400px; margin: 0 auto; padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; }

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: transform 0.3s, box-shadow 0.3s;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

/* ШАПКА ПРОФИЛЯ */
.profile-header {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;
  padding: 24px 32px; margin-bottom: 30px;
}
.profile-user-info { display: flex; align-items: center; gap: 24px; }
.profile-avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid var(--primary, #2563eb); }
.profile-title {
  font-size: 2rem; font-weight: 800; margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.profile-welcome { font-size: 1.1rem; margin: 0; color: var(--text-muted, #64748b); }
:global(.dark) .profile-welcome { color: #94a3b8; }
.profile-welcome strong { color: var(--text-main, #0f172a); }
:global(.dark) .profile-welcome strong { color: #f8fafc; }

.profile-since-badge { background: rgba(245, 158, 11, 0.1); padding: 12px 24px; border-radius: var(--radius-md, 8px); color: var(--warning, #d97706); font-weight: 700; font-size: 0.9rem; }

.profile-divider { margin: 30px 0; border: none; height: 1px; background: var(--border-color, #e2e8f0); }
:global(.dark) .profile-divider { background: #334155; }
.profile-loading { text-align: center; padding: 40px; color: var(--text-muted, #64748b); font-weight: 600; }

/* СТАТИСТИКА */
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 30px; }
.stat-card { padding: 24px 20px; text-align: center; position: relative; overflow: hidden; }
.stat-card:hover { transform: translateY(-5px); border-color: var(--primary, #2563eb); box-shadow: 0 10px 20px -5px rgba(0,0,0,0.1); }
.stat-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800; color: var(--text-muted, #64748b); }
:global(.dark) .stat-label { color: #94a3b8; }
.stat-value {
  font-size: 2.5rem; font-weight: 800; margin: 12px 0 8px;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.stat-link { font-size: 0.85rem; color: var(--primary, #2563eb); text-decoration: none; font-weight: 600; transition: all 0.2s; }
.stat-link:hover { text-decoration: underline; transform: translateX(3px); display: inline-block; }

/* КНОПКИ ДЕЙСТВИЙ */
.action-buttons { display: flex; gap: 16px; margin-bottom: 40px; flex-wrap: wrap; }
.action-btn { padding: 14px 32px; border-radius: 40px; font-weight: 700; text-decoration: none; transition: all 0.3s; display: inline-flex; align-items: center; gap: 8px; }
.settings-btn { color: var(--text-main, #0f172a); }
:global(.dark) .settings-btn { color: #f8fafc; }
.settings-btn:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); transform: translateY(-2px); }
.catalog-btn { background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; box-shadow: 0 8px 16px rgba(37, 99, 235, 0.3); }
.catalog-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(37, 99, 235, 0.4); }

/* ОБЩИЕ ЗАГОЛОВКИ СЕКЦИЙ */
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
.section-title { font-size: 1.4rem; font-weight: 800; margin: 0; color: var(--text-main, #0f172a); }
:global(.dark) .section-title { color: #f8fafc; }
.view-all-link { color: var(--primary, #2563eb); text-decoration: none; font-weight: 700; font-size: 0.9rem; transition: transform 0.2s; }
.view-all-link:hover { text-decoration: underline; transform: translateX(3px); }

/* УВЕДОМЛЕНИЯ */
.notifications-section { padding: 24px; margin-bottom: 40px; }
.notif-badge { background: var(--danger, #ef4444); color: white; padding: 2px 8px; border-radius: 20px; font-size: 0.8rem; margin-left: 8px; vertical-align: top; }
.notif-list { display: flex; flex-direction: column; gap: 12px; }
.notif-item { padding: 16px; border-radius: var(--radius-md, 8px); background: rgba(0,0,0,0.02); border: 1px solid transparent; transition: all 0.2s; }
:global(.dark) .notif-item { background: rgba(255,255,255,0.02); }
.notif-item.unread { background: rgba(37, 99, 235, 0.05); border-left: 3px solid var(--primary, #2563eb); border-color: rgba(37, 99, 235, 0.1); }
:global(.dark) .notif-item.unread { background: rgba(37, 99, 235, 0.1); }
.notif-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.notif-header strong { color: var(--text-main, #0f172a); font-size: 1rem; }
:global(.dark) .notif-header strong { color: #f8fafc; }
.notif-header small { color: var(--text-muted, #94a3b8); font-size: 0.8rem; }
.notif-item p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; line-height: 1.4; }
:global(.dark) .notif-item p { color: #cbd5e1; }

.loading-text, .empty-state { text-align: center; padding: 30px; color: var(--text-muted, #64748b); font-weight: 500; }

/* ОСНОВНОЙ КОНТЕНТ (ЗАКАЗЫ + ИСТОРИЯ) */
.profile-content { display: flex; gap: 30px; align-items: flex-start; flex-wrap: wrap; }

.orders-section { flex: 2; padding: 24px; }
.orders-list { display: flex; flex-direction: column; gap: 24px; }
.order-card { border-bottom: 1px dashed var(--border-color, #e2e8f0); padding-bottom: 20px; }
:global(.dark) .order-card { border-color: #334155; }
.order-card:last-child { border-bottom: none; padding-bottom: 0; }

.order-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; }
.order-number { font-size: 1.1rem; font-weight: 800; color: var(--text-main, #0f172a); }
:global(.dark) .order-number { color: #f8fafc; }
.order-date { font-size: 0.85rem; color: var(--text-muted, #64748b); margin-top: 4px; }

.order-statuses { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.status-badge, .payment-badge { padding: 4px 12px; border-radius: 30px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; }
.payment-badge { border: 1px solid; background: transparent; }

.order-items { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }
.order-item { display: flex; align-items: center; gap: 15px; }
.order-item-img-link { position: relative; display: block; }
.order-item-img { width: 50px; height: 50px; object-fit: contain; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; background: #fff; padding: 4px; transition: transform 0.2s; }
:global(.dark) .order-item-img { border-color: #334155; }
.order-item-img:hover { transform: scale(1.05); }
.order-item-qty { position: absolute; bottom: -6px; right: -6px; background: var(--primary, #2563eb); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 20px; font-weight: 800; }

.order-item-details { flex: 1; }
.order-item-name { font-weight: 600; text-decoration: none; color: var(--text-main, #0f172a); font-size: 0.95rem; display: block; margin-bottom: 4px; transition: color 0.2s; }
:global(.dark) .order-item-name { color: #e2e8f0; }
.order-item-name:hover { color: var(--primary, #2563eb); }
.order-item-price { font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 500; }

.order-total { text-align: right; font-weight: 800; font-size: 1.1rem; margin-top: 12px; padding-top: 12px; color: var(--text-main, #0f172a); }
:global(.dark) .order-total { color: #f8fafc; }

/* НЕДАВНО ПРОСМОТРЕННЫЕ */
.recent-section { flex: 1; padding: 24px; position: sticky; top: 100px; max-height: 600px; display: flex; flex-direction: column; }
.recent-list { flex: 1; overflow-y: auto; padding-right: 8px; scrollbar-width: thin; }
.recent-list::-webkit-scrollbar { width: 4px; }
.recent-list::-webkit-scrollbar-thumb { background: var(--border-color, #cbd5e1); border-radius: 4px; }

.recent-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-color, #e2e8f0); transition: transform 0.2s; }
:global(.dark) .recent-item { border-color: #334155; }
.recent-item:last-child { border-bottom: none; }
.recent-item:hover { transform: translateX(4px); }

.recent-img { width: 45px; height: 45px; object-fit: contain; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; background: #fff; padding: 3px; }
:global(.dark) .recent-img { border-color: #334155; }
.recent-info { flex: 1; }
.recent-name { font-weight: 600; font-size: 0.9rem; text-decoration: none; color: var(--text-main, #0f172a); display: block; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
:global(.dark) .recent-name { color: #e2e8f0; }
.recent-name:hover { color: var(--primary, #2563eb); }
.recent-price { font-weight: 800; color: var(--danger, #ef4444); font-size: 0.9rem; }

.recent-remove { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted, #94a3b8); transition: color 0.2s; padding: 0 5px; }
.recent-remove:hover { color: var(--danger, #ef4444); transform: scale(1.1); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) {
  .profile-content { flex-direction: column; }
  .recent-section { position: static; max-height: none; }
  .stats-grid { gap: 16px; }
}

@media (max-width: 768px) {
  .profile-container { padding: 24px 16px; }
  .profile-header { flex-direction: column; text-align: center; }
  .profile-user-info { flex-direction: column; }
  .stats-grid { grid-template-columns: 1fr; }
  .order-header { flex-direction: column; align-items: flex-start; }
  .order-statuses { align-items: flex-start; }
  .action-buttons { flex-direction: column; }
  .action-btn { justify-content: center; }
}
</style>