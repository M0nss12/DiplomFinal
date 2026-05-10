<template>
  <div class="admin-layout">
    <!-- БОКОВАЯ ПАНЕЛЬ -->
    <aside class="admin-sidebar glass-card">
      <div class="admin-brand">
        <div class="admin-logo">AD</div>
        <div class="brand-text">
          <h2>ApexDrive</h2>
          <span>Admin Panel v2.0</span>
        </div>
      </div>

      <nav class="admin-nav-container">
        <div v-for="group in groupedMenu" :key="group.title" class="nav-group">
          <h3 class="group-title">{{ group.title }}</h3>
          <div class="group-links">
            <router-link 
              v-for="link in group.items" 
              :key="link.path" 
              :to="'/admin/' + link.path"
              class="nav-link"
            >
              <span class="nav-icon">{{ link.icon }}</span>
              <span class="nav-name">{{ link.name }}</span>
            </router-link>
          </div>
        </div>
      </nav>

      <div class="sidebar-footer">
        <router-link to="/" class="exit-link glass-card">
          🏠 На главный сайт
        </router-link>
      </div>
    </aside>

    <!-- ОСНОВНОЙ КОНТЕНТ -->
    <main class="admin-main">
      <header class="admin-top-bar glass-card">
        <div class="top-left">
          <div class="breadcrumb">
            Админ-панель / <span class="current-page">{{ currentPageName }}</span>
          </div>
        </div>
        <div class="top-right">
          <div class="server-status">
            <span class="status-dot"></span>
            DB Connected
          </div>
          <div class="admin-profile-mini">
            <img :src="userAvatar" class="mini-avatar" />
          </div>
        </div>
      </header>

      <div class="admin-content-view">
        <router-view v-slot="{ Component }">
          <transition name="fade-admin" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const userAvatar = localStorage.getItem('user_avatar') || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png';

const groupedMenu = [
  {
    title: '🛍️ Магазин',
    items: [
      { name: 'Заказы', path: 'orders', icon: '📦' },
      { name: 'Журнал продаж', path: 'order_items', icon: '📈' },
      { name: 'Товары', path: 'products', icon: '🛒' },
      { name: 'Категории', path: 'categories', icon: '📂' },
      { name: 'Атрибуты', path: 'attributes', icon: '⚙️' },
      { name: 'Бренды', path: 'brands', icon: '🏭' },
      { name: 'Отзывы', path: 'reviews', icon: '💬' },
    ]
  },
  {
    title: '🚚 Логистика',
    items: [
      { name: 'Остатки', path: 'stocks', icon: '📊' },
      { name: 'Склады и ПВЗ', path: 'warehouses', icon: '📍' },
      { name: 'Города', path: 'cities', icon: '🏙️' },
      { name: 'Возвраты', path: 'returns', icon: '🔄' },
    ]
  },
  {
    title: '👥 Клиенты',
    items: [
      { name: 'Пользователи', path: 'users', icon: '👤' },
      { name: 'Гараж клиентов', path: 'vehicles', icon: '🚗' },
      { name: 'Избранное', path: 'wishlists', icon: '❤️' },
      { name: 'Рассылка', path: 'notifications', icon: '🔔' },
    ]
  },
  {
    title: '🛡️ Система',
    items: [
      { name: 'Логи сервера', path: 'logs', icon: '📜' },
      { name: 'Заказы (лог)', path: 'history', icon: '⏳' },
      { name: 'Безопасность', path: 'tokens', icon: '🔑' },
    ]
  }
];

const currentPageName = computed(() => {
  for (const group of groupedMenu) {
    const found = group.items.find(item => route.path.includes(item.path));
    if (found) return found.name;
  }
  return 'Главная';
});
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ АДМИН-МАКЕТА (глобальные классы уже применены)
   ========================================================================== */

.admin-layout {
  display: flex;
  height: 100vh;
  background: var(--bg-body);
  overflow: hidden;
}

/* Сайдбар */
.admin-sidebar {
  width: 260px;
  display: flex;
  flex-direction: column;
  height: 100%;
  z-index: 100;
  border-radius: 0;
  border-left: none;
}

.admin-brand {
  padding: 25px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-logo {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 900;
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3);
}

.brand-text h2 {
  font-size: 1.1rem;
  margin: 0;
  font-weight: 900;
  color: var(--text-main);
}
.brand-text span {
  font-size: 0.65rem;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
}

/* Навигация */
.admin-nav-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
}
.admin-nav-container::-webkit-scrollbar { width: 4px; }
.admin-nav-container::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }

.nav-group { margin-bottom: 20px; }
.group-title {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  padding: 0 12px 8px;
  font-weight: 800;
}

.group-links { display: flex; flex-direction: column; gap: 2px; }

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  text-decoration: none;
  color: var(--text-muted);
  font-weight: 700;
  border-radius: 10px;
  transition: all 0.2s;
  font-size: 0.9rem;
}
.nav-link:hover {
  background: var(--primary-light);
  color: var(--primary);
}
.nav-link.router-link-active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.nav-icon { font-size: 1.1rem; }

.sidebar-footer { padding: 15px; }
.exit-link {
  display: block;
  padding: 12px;
  text-align: center;
  text-decoration: none;
  font-weight: 800;
  font-size: 0.8rem;
  color: var(--text-main);
  border-radius: 10px;
  transition: background 0.2s, color 0.2s;
}
.exit-link:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Основной контент */
.admin-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.admin-top-bar {
  height: 60px;
  margin: 15px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.breadcrumb {
  font-weight: 600;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.current-page {
  color: var(--primary);
  font-weight: 800;
}

.top-right { display: flex; align-items: center; gap: 20px; }
.server-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--success);
}
.status-dot {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  box-shadow: 0 0 8px var(--success);
  animation: pulse 2s infinite;
}

.mini-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary);
}

.admin-content-view {
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 30px;
}

/* Анимации */
@keyframes pulse { 
  0% { transform: scale(0.95); opacity: 0.7; } 
  50% { transform: scale(1.1); opacity: 1; } 
  100% { transform: scale(0.95); opacity: 0.7; } 
}

.fade-admin-enter-active, .fade-admin-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.fade-admin-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-admin-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .admin-sidebar { width: 70px; }
  .brand-text, .nav-name, .group-title, .sidebar-footer, .breadcrumb { display: none; }
  .admin-brand, .nav-link { justify-content: center; padding: 15px 0; }
  .nav-group { margin-bottom: 10px; }
}
</style>