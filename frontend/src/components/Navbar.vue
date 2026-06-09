<template>
  <nav class="main-navbar animate-fade-in" aria-label="Основная навигация">
    <div class="nav-container">
      <!-- ЛЕВАЯ ЧАСТЬ -->
      <div class="nav-section left-section">
        <router-link to="/" class="logo" aria-label="Главная страница ApexDrive">
          <strong>Автотовары</strong>
        </router-link>
        <div class="city-selector-container" ref="cityMenu">
          <button @click="toggleCityDropdown" class="city-btn glass-card" aria-haspopup="listbox" :aria-expanded="isCityDropdownOpen">
            <span class="city-icon">📍</span>
            <span class="city-name">{{ appStore.city || 'Выберите город' }}</span>
            <span class="dropdown-arrow" :class="{ rotate: isCityDropdownOpen }">▼</span>
          </button>
          <transition name="dropdown-fade">
            <div v-if="isCityDropdownOpen" class="dropdown-menu city-menu glass-card" role="listbox">
              <div class="city-search">
                <input v-model="citySearch" placeholder="Поиск города..." @keyup.enter="selectFirstFilteredCity" @click.stop aria-label="Поиск города" />
              </div>
              <div class="city-list">
                <button v-for="city in filteredCities" :key="city" @click="selectCity(city)" class="dropdown-item" :class="{ active: city === appStore.city }" role="option">{{ city }}</button>
              </div>
            </div>
          </transition>
        </div>
        <div class="menu-links hidden-mobile">
          <router-link to="/catalog" active-class="active-link">Каталог</router-link>
          <router-link to="/about" active-class="active-link">О нас</router-link>
          <router-link to="/contacts" active-class="active-link">Контакты</router-link>
        </div>
      </div>

      <!-- ЦЕНТР: ПОИСК -->
      <div class="search-bar-container" ref="searchRef">
        <div class="search-input-wrapper glass-card" :class="{ 'is-focused': isSearchOpen }">
          <span v-if="!isSearching" class="search-icon">🔍</span>
          <span v-else class="search-icon loading-spinner">⏳</span>
          <input v-model="searchQuery" type="text" placeholder="Поиск деталей, категорий (от 2 букв)..." @focus="isSearchOpen = true" @input="handleGlobalSearch" aria-label="Поиск по сайту" />
          <button v-if="searchQuery" @click="clearSearch" class="search-clear-btn" aria-label="Очистить поиск">&times;</button>
        </div>
        <transition name="dropdown-fade">
          <div v-if="isSearchOpen && searchQuery.length >= 2" class="search-dropdown glass-card">
            <div v-if="isSearching" class="s-none">Ищем лучшие совпадения...</div>
            <template v-else>
              <div v-if="filteredPages.length" class="s-group">
                <div class="s-label">Разделы сайта</div>
                <router-link v-for="p in filteredPages" :key="p.path" :to="p.path" class="s-item" @click="closeSearch">
                  <span class="s-icon">{{ p.icon }}</span> {{ p.name }}
                </router-link>
              </div>
              <div v-if="searchResults.categories.length" class="s-group">
                <div class="s-label">Категории</div>
                <router-link v-for="c in searchResults.categories" :key="c.id" :to="`/category/${c.id}`" class="s-item" @click="closeSearch">
                  <span class="s-icon">📂</span> {{ c.name }}
                </router-link>
              </div>
              <div v-if="searchResults.products.length" class="s-group">
                <div class="s-label">Товары</div>
                <router-link v-for="prod in searchResults.products" :key="prod.id" :to="`/product/${prod.id}`" class="s-item prod-flex" @click="closeSearch">
                  <img :src="prod.images?.[0] || '/assets/images/no-image.png'" class="s-img" />
                  <div class="s-info">
                    <div class="s-name">{{ prod.name }}</div>
                    <div class="s-meta">
                      <span class="s-sku">Арт: {{ prod.sku }}</span>
                      <span class="s-price">{{ prod.discount_price || prod.price }} ₽</span>
                    </div>
                  </div>
                </router-link>
              </div>
              <div v-if="noResults" class="s-none">Ничего не найдено по запросу "{{ searchQuery }}"</div>
            </template>
          </div>
        </transition>
      </div>

      <!-- ПРАВАЯ ЧАСТЬ -->
      <div class="nav-section right-section">
        <label class="theme-switch" title="Сменить тему">
          <input type="checkbox" :checked="appStore.theme === 'dark'" @change="appStore.toggleTheme" />
          <span class="slider">
            <span class="sun">☀️</span>
            <span class="moon">🌙</span>
          </span>
        </label>

        <!-- УВЕДОМЛЕНИЯ -->
        <div v-if="userId" class="nav-icon-container" ref="notifMenu">
          <div class="icon-with-badge" @click="toggleNotifDropdown" aria-label="Уведомления" role="button">
            <span class="nav-icon-btn">🔔</span>
            <transition name="badge-pop">
              <span v-if="unreadNotifsCount > 0" class="badge notif-badge">{{ unreadNotifsCount }}</span>
            </transition>
          </div>
          <transition name="dropdown-fade">
            <div v-if="isNotifDropdownOpen" class="dropdown-menu notif-menu glass-card">
              <div class="notif-header">
                <b>Уведомления</b>
                <button v-if="unreadNotifsCount > 0" @click="markAllAsRead" class="text-xs text-primary">Прочитать всё</button>
              </div>
              <div class="notif-list">
                <div v-if="notifications.length === 0" class="p-3 text-center text-muted text-sm">Нет новых уведомлений</div>
                <div v-for="n in notifications" :key="n.id" class="notif-item" :class="{ 'is-unread': !n.is_read }" @click="markAsRead(n)">
                  <div class="notif-title">{{ n.title }}</div>
                  <div class="notif-message">{{ n.message }}</div>
                  <div class="notif-time">{{ new Date(n.created_at).toLocaleDateString() }}</div>
                </div>
              </div>
              <router-link to="/notifications" class="notif-footer" @click="isNotifDropdownOpen = false">Все уведомления →</router-link>
            </div>
          </transition>
        </div>

        <!-- ИЗБРАННОЕ -->
        <router-link to="/wishlist" class="nav-icon-link" title="Избранное" aria-label="Избранное">
          <div class="icon-with-badge">
            <span class="heart-icon">❤️</span>
            <transition name="badge-pop">
              <span v-if="wishlistCount > 0" class="badge wishlist-badge">{{ wishlistCount }}</span>
            </transition>
          </div>
        </router-link>

        <div class="divider hidden-mobile d-none d-lg-block"></div>

        <!-- АВТОРИЗАЦИЯ -->
        <div v-if="!userId" class="auth-links hidden-mobile">
          <router-link to="/login" class="auth-link">Войти</router-link>
          <router-link to="/register" class="auth-link reg-btn">Регистрация</router-link>
        </div>

        <div v-else class="user-profile-container" ref="profileMenu">
          <div class="profile-trigger" @click="toggleProfileDropdown" aria-haspopup="true" :aria-expanded="isProfileDropdownOpen">
            <img :src="userAvatar || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png'" class="nav-avatar" alt="Аватар" />
            <span class="user-display-name hidden-mobile">{{ userName || 'Профиль' }}</span>
            <span class="dropdown-arrow hidden-mobile" :class="{ rotate: isProfileDropdownOpen }">▼</span>
          </div>
          <transition name="dropdown-fade">
            <div v-if="isProfileDropdownOpen" class="dropdown-menu profile-menu glass-card">
              <router-link v-if="userRole === 'admin'" to="/admin" class="dropdown-item admin-item" @click="isProfileDropdownOpen = false">
                <span class="menu-icon">🛡️</span> <b>Админ-панель</b>
              </router-link>
              <hr v-if="userRole === 'admin'" class="dropdown-divider" />
              <router-link to="/profile" class="dropdown-item" @click="isProfileDropdownOpen = false"><span class="menu-icon">👤</span> Профиль</router-link>
              <router-link to="/orders" class="dropdown-item" @click="isProfileDropdownOpen = false"><span class="menu-icon">📦</span> Заказы</router-link>
              <router-link to="/wishlist" class="dropdown-item" @click="isProfileDropdownOpen = false"><span class="menu-icon">❤️</span> Избранное</router-link>
              <router-link to="/settings" class="dropdown-item" @click="isProfileDropdownOpen = false"><span class="menu-icon">⚙️</span> Настройки</router-link>
              <hr class="dropdown-divider" />
              <button @click="handleLogout" class="dropdown-item logout-item"><span class="menu-icon">🚪</span> Выйти</button>
            </div>
          </transition>
        </div>

        <!-- КОРЗИНА -->
        <div class="cart-card" @click="router.push('/cart')" aria-label="Корзина">
          <div class="cart-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 576 512">
              <path fill="currentColor" d="M0 24C0 10.7 10.7 0 24 0H69.5c22 0 41.5 12.8 50.6 32h411c26.3 0 45.5 25 38.6 50.4l-41 152.3c-8.5 31.4-37 53.3-69.5 53.3H170.7l5.4 28.5c2.2 11.3 12.1 19.5 23.6 19.5H488c13.3 0 24 10.7 24 24s-10.7 24-24 24H199.7c-34.6 0-64.3-24.6-70.7-58.5L77.4 54.5c-.7-3.8-4-6.5-7.9-6.5H24C10.7 48 0 37.3 0 24zM128 464a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm336-48a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"/>
            </svg>
            <transition name="badge-pop">
              <span v-if="cartItemsCount > 0" class="badge cart-badge">{{ cartItemsCount }}</span>
            </transition>
          </div>
          <div class="cart-info hidden-mobile">
            <div class="cart-title">Корзина</div>
            <div class="cart-total">{{ cartStore.totalPriceFinal || 0 }} ₽</div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
// (логика без изменений)
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const cartStore = useCartStore();
const appStore = useAppStore();

const storedId = localStorage.getItem('user_id');
const storedName = localStorage.getItem('user_first_name') || localStorage.getItem('user_name');
const storedRole = localStorage.getItem('role');

if (storedId) axios.defaults.headers.common['x-user-id'] = storedId;
if (storedName) axios.defaults.headers.common['x-user-name'] = encodeURIComponent(storedName);
if (storedRole) axios.defaults.headers.common['x-user-role'] = storedRole;

const userId = ref(storedId);
const userName = ref(storedName || '');
const userAvatar = ref(localStorage.getItem('user_avatar') || '');
const userRole = ref(storedRole || '');

const wishlistCount = ref(0);

const cartItemsCount = computed(() => {
  const items = cartStore.items;
  return Array.isArray(items) ? items.reduce((total, item) => total + (item.quantity || 1), 0) : 0;
});

const loadWishlistCount = async () => {
  if (userId.value) {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${userId.value}`);
      wishlistCount.value = res.data.length;
    } catch (e) { console.error("Ошибка загрузки избранного"); }
  }
};

const notifications = ref([]);
const isNotifDropdownOpen = ref(false);
const notifMenu = ref(null);

const unreadNotifsCount = computed(() => notifications.value.filter(n => !n.is_read).length);

const loadNotifications = async () => {
  if (!userId.value) return;
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/notifications/${userId.value}`);
    notifications.value = res.data.slice(0, 5);
  } catch (e) { console.error("Ошибка загрузки уведомлений"); }
};

const toggleNotifDropdown = () => {
  isNotifDropdownOpen.value = !isNotifDropdownOpen.value;
  isProfileDropdownOpen.value = false;
  isCityDropdownOpen.value = false;
  if (isNotifDropdownOpen.value) loadNotifications();
};

const markAsRead = async (notif) => {
  if (notif.is_read) return;
  notif.is_read = true;
  try {
    await axios.patch(`${import.meta.env.VITE_API_URL || ''}/api/notifications/${notif.id}`, { is_read: true });
  } catch (e) { console.error("Ошибка обновления уведомления"); }
};

const markAllAsRead = async () => {
  notifications.value.forEach(n => markAsRead(n));
};

const searchQuery = ref('');
const isSearchOpen = ref(false);
const isSearching = ref(false);
const searchRef = ref(null);
const searchResults = ref({ products: [], categories: [] });
let searchTimer = null;

const staticPages = [
  { name: 'Каталог', path: '/catalog', icon: '🛒', tags: 'запчасти детали каталог' },
  { name: 'О компании', path: '/about', icon: 'ℹ️', tags: 'инфо доставка контакты' },
  { name: 'Личный кабинет', path: '/profile', icon: '👤', tags: 'профиль данные настройки' },
];

const filteredPages = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return staticPages.filter(p => p.name.toLowerCase().includes(q) || p.tags.toLowerCase().includes(q));
});

const noResults = computed(() => !isSearching.value && !filteredPages.value.length && !searchResults.value.products.length && !searchResults.value.categories.length);

const handleGlobalSearch = () => {
  clearTimeout(searchTimer);
  if (searchQuery.value.length < 2) {
    searchResults.value = { products: [], categories: [] };
    isSearching.value = false;
    return;
  }
  isSearching.value = true;
  searchTimer = setTimeout(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/global-search?q=${searchQuery.value}`);
      searchResults.value = res.data;
    } catch (e) { 
      console.error("Search error:", e); 
    } finally {
      isSearching.value = false;
    }
  }, 400);
};

const clearSearch = () => { 
  searchQuery.value = ''; 
  isSearchOpen.value = false; 
  searchResults.value = { products: [], categories: [] };
};
const closeSearch = () => isSearchOpen.value = false;

const isCityDropdownOpen = ref(false);
const cityMenu = ref(null);
const availableCities = ref([]);
const citySearch = ref('');

const loadCities = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/admin/warehouses`, { 
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' } 
    });
    const citiesNames = res.data.map(w => w.cities?.name).filter(Boolean);
    availableCities.value = Array.from(new Set(citiesNames)).sort();
  } catch (e) { 
    availableCities.value = ['Москва', 'Санкт-Петербург', 'Иркутск', 'Ангарск']; 
  }
};

const selectCity = async (city) => {
  await appStore.setCity(city);
  isCityDropdownOpen.value = false;
  citySearch.value = '';
};

const selectFirstFilteredCity = () => {
  const cities = filteredCities.value;
  if (cities.length > 0) {
    selectCity(cities[0]);
  }
};

const exactMatch = computed(() => availableCities.value.some(c => c.toLowerCase() === citySearch.value.toLowerCase().trim()));
const filteredCities = computed(() => citySearch.value ? availableCities.value.filter(c => c.toLowerCase().includes(citySearch.value.toLowerCase())) : availableCities.value);

const isProfileDropdownOpen = ref(false);
const profileMenu = ref(null);

const toggleProfileDropdown = () => { 
  isProfileDropdownOpen.value = !isProfileDropdownOpen.value; 
  isCityDropdownOpen.value = false; 
  isNotifDropdownOpen.value = false;
};

const toggleCityDropdown = () => { 
  isCityDropdownOpen.value = !isCityDropdownOpen.value; 
  isProfileDropdownOpen.value = false; 
  isNotifDropdownOpen.value = false;
};

const handleClickOutside = (event) => {
  if (profileMenu.value && !profileMenu.value.contains(event.target)) isProfileDropdownOpen.value = false;
  if (cityMenu.value && !cityMenu.value.contains(event.target)) isCityDropdownOpen.value = false;
  if (notifMenu.value && !notifMenu.value.contains(event.target)) isNotifDropdownOpen.value = false;
  if (searchRef.value && !searchRef.value.contains(event.target)) isSearchOpen.value = false;
};

const handleLogout = () => {
  if (confirm('Выйти из системы?')) {
    localStorage.clear();
    router.push('/');
    setTimeout(() => window.location.reload(), 100);
  }
};

onMounted(() => {
  loadCities();
  loadWishlistCount();
  loadNotifications();
  
  window.addEventListener('wishlist-updated', loadWishlistCount);
  window.addEventListener('click', handleClickOutside);
  setInterval(loadNotifications, 30000);
});

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('wishlist-updated', loadWishlistCount);
});
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ НАВИГАЦИИ (глобальный CSS используется для glass-card, badge и т.п.)
   ========================================================================== */

.main-navbar {
background: var(--nav-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-color);
  height: 80px;
  position: sticky;
  top: 0;
  z-index: 1000;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

:global(.dark) .main-navbar {
  background: rgba(15, 23, 42, 0.9);
  border-bottom-color: #1e293b;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  width: 96%;
  height: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.left-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  text-decoration: none;
  font-size: 1.7rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  transition: transform 0.3s;
}
.logo:hover { transform: scale(1.02); }

.city-selector-container { position: relative; }
.city-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 8px 16px;
  border-radius: 40px;
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  color: var(--text-main);
  transition: all 0.2s;
}
:global(.dark) .city-btn {  border-color: #334155; }
.city-btn:hover {
  border-color: var(--primary);
  background: var(--primary-light);
}
.city-name { max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dropdown-arrow { font-size: 0.7rem; transition: transform 0.3s; }
.dropdown-arrow.rotate { transform: rotate(180deg); }

.menu-links { display: flex; gap: 24px; }
.menu-links a {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.95rem;
  position: relative;
  padding: 6px 0;
  text-decoration: none;
}
.menu-links a::after {
  content: ''; position: absolute; width: 0; height: 3px; bottom: 0; left: 0;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  transition: width 0.3s ease; border-radius: 3px;
}
.menu-links a:hover::after, .menu-links a.active-link::after { width: 100%; }
.menu-links a:hover, .menu-links a.active-link { color: var(--text-main); }
:global(.dark) .menu-links a:hover, :global(.dark) .menu-links a.active-link { color: #fff; }

/* Поиск */
.search-bar-container { flex: 1; max-width: 500px; position: relative; }
.search-input-wrapper {
  display: flex; align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 60px;
  padding: 0 16px; height: 44px;
  transition: all 0.3s;
}
:global(.dark) .search-input-wrapper { background: #1e293b; border-color: #334155; }
.search-input-wrapper.is-focused {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}
.search-icon { font-size: 1.1rem; color: var(--text-muted); margin-right: 12px; }
.loading-spinner { animation: spin 2s linear infinite; }
.search-input-wrapper input {
  flex: 1; border: none; background: transparent;
  font-size: 0.95rem; color: var(--text-main); outline: none;
}
.search-clear-btn { background: none; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted); }

.search-dropdown {
  position: absolute; top: calc(100% + 8px); left: 0; right: 0;
  border-radius: var(--radius-md); padding: 8px 0;
}
.s-label { font-size: 0.7rem; text-transform: uppercase; font-weight: 800; color: var(--text-muted); padding: 6px 16px; background: rgba(0,0,0,0.02); }
:global(.dark) .s-label { background: rgba(255,255,255,0.02); }
.s-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; text-decoration: none; color: var(--text-main); transition: background 0.2s; }
.s-item:hover { background: var(--primary-light); }
.prod-flex .s-img { width: 40px; height: 40px; object-fit: contain; background: #fff; border-radius: 6px; padding: 2px; }
.s-info { display: flex; flex-direction: column; }
.s-name { font-weight: 600; font-size: 0.9rem; }
.s-meta { display: flex; gap: 10px; font-size: 0.8rem; align-items: center; }
.s-price { color: var(--success); font-weight: 700; }
.s-none { padding: 16px; text-align: center; color: var(--text-muted); font-size: 0.9rem; }

/* Правая часть */
.right-section { display: flex; align-items: center; gap: 20px; }

/* Переключатель темы */
.theme-switch { position: relative; display: inline-block; width: 56px; height: 28px; cursor: pointer; }
.theme-switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: #cbd5e1; border-radius: 34px; transition: 0.4s;
  display: flex; align-items: center; justify-content: space-between; padding: 0 6px;
}
:global(.dark) .slider { background: #334155; }
.slider .sun, .slider .moon { font-size: 0.8rem; z-index: 1; }
.slider::before {
  position: absolute; content: ""; height: 22px; width: 22px; left: 3px; bottom: 3px;
  background-color: white; transition: 0.4s; border-radius: 50%; box-shadow: 0 1px 3px rgba(0,0,0,0.2); z-index: 2;
}
.theme-switch input:checked + .slider::before { transform: translateX(28px); }

/* Иконки с бейджами – бейджи используют глобальный .badge с переопределением цвета */
.nav-icon-container { position: relative; cursor: pointer; }
.icon-with-badge { position: relative; display: flex; align-items: center; justify-content: center; padding: 4px; }
.nav-icon-btn, .heart-icon { font-size: 1.6rem; transition: transform 0.2s; }
.icon-with-badge:hover .nav-icon-btn, .icon-with-badge:hover .heart-icon { transform: scale(1.1); }

.badge {
  position: absolute; top: -4px; right: -6px;
  font-size: 0.65rem; font-weight: 800; padding: 2px 5px;
  border-radius: 20px; border: 2px solid var(--bg-card); min-width: 18px; text-align: center;
}
.notif-badge { background: var(--primary); }
.wishlist-badge { background: #ef4444; }
.cart-badge { background: var(--success); }

.badge-pop-enter-active { animation: pop-in 0.3s ease-out; }
.badge-pop-leave-active { animation: pop-out 0.2s ease-in; }
@keyframes pop-in {
  0% { transform: scale(0); opacity: 0; }
  80% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes pop-out {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0); opacity: 0; }
}

/* Дропдаун уведомлений */
.notif-menu { width: 320px; right: -60px; padding: 0; overflow: hidden; }
.notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border-color); }
.notif-list { max-height: 300px; overflow-y: auto; }
.notif-item { padding: 12px 16px; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s; }
.notif-item.is-unread { background: var(--primary-light); border-left: 3px solid var(--primary); }
.notif-item:hover { background: rgba(0,0,0,0.02); }
:global(.dark) .notif-item:hover { background: rgba(255,255,255,0.05); }
.notif-title { font-weight: 600; font-size: 0.9rem; margin-bottom: 4px; color: var(--text-main); }
.notif-message { font-size: 0.8rem; color: var(--text-muted); line-height: 1.3; }
.notif-time { font-size: 0.7rem; color: #94a3b8; margin-top: 6px; text-align: right; }
.notif-footer { display: block; text-align: center; padding: 10px; font-size: 0.85rem; font-weight: 600; color: var(--primary); text-decoration: none; background: rgba(0,0,0,0.02); }
.notif-footer:hover { background: var(--primary-light); }

/* Разделитель */
.divider { width: 1px; height: 32px; background: var(--border-color); }

/* Авторизация */
.auth-links { display: flex; gap: 12px; align-items: center; }
.auth-link { font-weight: 600; font-size: 0.9rem; color: var(--text-main); text-decoration: none; }
.reg-btn { background: var(--primary); color: white !important; padding: 8px 16px; border-radius: 40px; transition: transform 0.2s, box-shadow 0.2s; }
.reg-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px var(--primary-light); }

/* Профиль */
.user-profile-container { position: relative; }
.profile-trigger {
  display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 8px;
  border-radius: 40px; border: 1px solid transparent; transition: background 0.2s;
}
.profile-trigger:hover { background: rgba(0,0,0,0.05); }
:global(.dark) .profile-trigger:hover { background: rgba(255,255,255,0.05); }
.nav-avatar { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color); }
.dropdown-menu {
  position: absolute; top: calc(100% + 12px); right: 0;
  min-width: 200px; z-index: 1200;
}
.dropdown-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; text-decoration: none; color: var(--text-main); font-size: 0.9rem; transition: background 0.2s; cursor: pointer; width: 100%; border: none; text-align: left; background: transparent; }
.dropdown-item:hover { background: var(--primary-light); color: var(--primary); }
.admin-item { color: #d97706; background: rgba(217, 119, 6, 0.1); }
.logout-item { color: #ef4444; }
.logout-item:hover { background: var(--danger-light); color: #dc2626; }
.dropdown-divider { margin: 4px 0; border: none; height: 1px; background: var(--border-color); }

/* Корзина */
.cart-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 40px; padding: 6px 16px 6px 12px; cursor: pointer; transition: all 0.3s;
}
:global(.dark) .cart-card { background: #1e293b; border-color: #334155; }
.cart-card:hover { border-color: var(--success); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15); }
.cart-icon-wrapper svg { color: var(--text-main); transition: color 0.2s; }
.cart-card:hover .cart-icon-wrapper svg { color: var(--success); }
.cart-info { text-align: right; }
.cart-title { font-size: 0.65rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.cart-total { font-size: 0.95rem; font-weight: 800; color: var(--text-main); }

/* Анимации */
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-10px); }

/* Класс скрытия на мобильных */
@media (max-width: 1100px) {
  .hidden-mobile { display: none !important; }
}

/* Адаптив */
@media (max-width: 1100px) {
  .cart-info, .divider { display: none; }
  .cart-card { padding: 8px 12px; border-radius: 50%; }
}
@media (max-width: 768px) {
  .main-navbar { height: auto; padding: 12px 0; background: var(--nav-bg);  }
  .nav-container { flex-wrap: wrap; gap: 12px; }
  .search-bar-container { order: 3; width: 100%; max-width: 100%; }
  .left-section, .right-section { flex: 1; justify-content: space-between; }
  .user-display-name, .dropdown-arrow { display: none; }
  .notif-menu { right: -100px; }
}
@media (max-width: 480px) {
  .city-name { display: none; }
  .logo { font-size: 1.4rem; }
  .nav-icon-btn, .heart-icon { font-size: 1.4rem; }
}

.cart-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cart-icon-wrapper .badge {
  position: absolute;
  top: -8px;
  right: -10px;
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 5px;
  border-radius: 20px;
  border: 2px solid var(--bg-card);
  min-width: 18px;
  text-align: center;
  background: var(--success);
  color: white;
  line-height: 1;
  z-index: 2;
}
</style>