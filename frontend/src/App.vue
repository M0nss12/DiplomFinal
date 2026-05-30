<!-- App.vue -->
<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import Navbar from './components/Navbar.vue';
import { useAppStore } from '@/stores/appStore';
import { useCartStore } from '@/stores/cartStore';
import axios from 'axios';

const appStore = useAppStore();
const cartStore = useCartStore();
const route = useRoute();

// --- ГЛОБАЛЬНАЯ ЛОГИКА "НЕДАВНО ПРОСМОТРЕННЫЕ" ---
const recentProducts = ref([]);
const recentRef = ref(null);
const tiltStyles = ref({});
const wishlistIds = ref([]);

let isDragging = false;
let startX = 0;
let scrollLeft = 0;

// Загрузка ID избранного для корректного отображения сердечек
const loadWishlistIds = async () => {
  const uid = localStorage.getItem('user_id');
  if (uid) {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${uid}`);
      wishlistIds.value = res.data.map(i => i.product_id);
    } catch (e) { console.error('Ошибка загрузки избранного', e); }
  } else {
    wishlistIds.value = [];
  }
};

// Загрузка недавно просмотренных товаров
const loadRecentProducts = async () => {
  try {
    const recentIds = JSON.parse(localStorage.getItem('recent_views') || '[]');
    if (recentIds.length > 0) {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/products/recent`, { ids: recentIds.slice(0, 15) });
      // Восстанавливаем порядок сортировки (от новых просмотров к старым)
      const productsMap = new Map(res.data.map(p => [p.id, p]));
      recentProducts.value = recentIds.map(id => productsMap.get(id)).filter(p => p);
    } else {
      recentProducts.value = [];
    }
  } catch (e) {
    console.error('Ошибка загрузки недавно просмотренных', e);
  }
};

// Тогл избранного
const toggleWishlist = async (id) => {
  const uid = localStorage.getItem('user_id');
  if (!uid) return alert('Войдите в аккаунт.');
  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    if (wishlistIds.value.includes(id)) {
      await axios.delete(`${API_URL}/api/wishlist/${uid}/${id}`);
      wishlistIds.value = wishlistIds.value.filter(i => i !== id);
    } else {
      await axios.post(`${API_URL}/api/wishlist`, { user_id: uid, product_id: id });
      wishlistIds.value.push(id);
    }
    // Вызываем глобальное событие, чтобы обновить счетчик в Navbar
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) { console.error(e); }
};

// Добавление в корзину
const handleAddToCart = (p) => {
  const totalStock = p.product_stocks?.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || 0;
  cartStore.addToCart({ ...p, stock_quantity: totalStock });
};

// Логика карусели (Drag-to-scroll)
const scroll = (dir) => {
  if (recentRef.value) recentRef.value.scrollBy({ left: 320 * dir, behavior: 'smooth' });
};
const startDrag = (e) => {
  isDragging = true;
  startX = e.pageX - recentRef.value.offsetLeft;
  scrollLeft = recentRef.value.scrollLeft;
  recentRef.value.classList.add('dragging');
};
const duringDrag = (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const x = e.pageX - recentRef.value.offsetLeft;
  const walk = (x - startX) * 2;
  recentRef.value.scrollLeft = scrollLeft - walk;
};
const stopDrag = () => {
  isDragging = false;
  if (recentRef.value) recentRef.value.classList.remove('dragging');
};

// Эффект 3D наклона карточки
const handle3DTilt = (e, id) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  const rotateX = ((y - centerY) / centerY) * 10;
  const rotateY = ((x - centerX) / centerX) * 10;
  tiltStyles.value[id] = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
};
const resetTilt = (id) => tiltStyles.value[id] = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
const getTiltStyle = (id) => tiltStyles.value[id] || '';

// Утилиты
const getStockInCity = (p) => {
  if (!p.product_stocks || !appStore.city) return 0;
  return p.product_stocks
    .filter(s => {
      const wCity = s.warehouses?.cities?.name || s.warehouses?.city_name;
      return wCity?.trim().toLowerCase() === appStore.city.trim().toLowerCase();
    })
    .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
};
const getTotalStock = (p) => p.product_stocks?.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || 0;

// Условие отображения блока (Скрываем в админке, при входе и оформлении заказа)
const showRecentBlock = computed(() => {
  const hiddenRoutes = ['/admin', '/login', '/register', '/checkout'];
  const isHidden = hiddenRoutes.some(path => route.path.includes(path));
  return recentProducts.value.length > 0 && !isHidden;
});

onMounted(() => {
  appStore.initTheme();
  appStore.syncCity();
  if (localStorage.getItem('user_id')) {
    cartStore.syncCartFromDB();
  }
  loadWishlistIds();
  loadRecentProducts();

  window.addEventListener('wishlist-updated', loadWishlistIds);
});

onUnmounted(() => {
  window.removeEventListener('wishlist-updated', loadWishlistIds);
});

// Обновляем список просмотров при смене роута (если юзер зашел на другой товар)
watch(() => route.path, () => {
  loadRecentProducts();
});
</script>

<template>
  <div class="app-wrapper">
    <Navbar />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- ГЛОБАЛЬНЫЙ БЛОК: НЕДАВНО ПРОСМОТРЕННЫЕ -->
    <section v-if="showRecentBlock" class="global-recent-section">
      <div class="carousel-header">
        <h2>🕒 Вы недавно смотрели</h2>
        <div class="carousel-controls">
          <button @click="scroll(-1)" class="ctrl-btn glass-card">←</button>
          <button @click="scroll(1)" class="ctrl-btn glass-card">→</button>
        </div>
      </div>

      <div class="scroll-container" ref="recentRef" @mousedown="startDrag" @mousemove="duringDrag" @mouseup="stopDrag">
        <div v-for="p in recentProducts" :key="p.id" class="product-card glass-card" @mousemove="handle3DTilt($event, 'gr'+p.id)" @mouseleave="resetTilt('gr'+p.id)" :style="getTiltStyle('gr'+p.id)">
          <button @click.stop="toggleWishlist(p.id)" class="wishlist-btn" :class="{ active: wishlistIds.includes(p.id) }">❤</button>
          
          <router-link :to="'/product/' + p.id" class="card-link">
            <div class="img-wrapper">
              <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" class="product-img" loading="lazy" />
            </div>
            <div class="card-info-bottom">
              <h4 class="product-title">{{ p.name }}</h4>
              <div class="price-block">
                <s class="old-price" v-if="p.discount_price">{{ p.price }} ₽</s>
                <strong class="new-price" :style="{ color: p.discount_price ? 'var(--danger)' : 'var(--text-main)' }">
                  {{ p.discount_price || p.price }} ₽
                </strong>
              </div>
              <div class="stock-status">
                <span v-if="getStockInCity(p) > 0" class="in-stock">✅ В {{ appStore.city }}: {{ getStockInCity(p) }} шт.</span>
                <span v-else class="out-stock">🚢 Под заказ (Межгород)</span>
              </div>
            </div>
          </router-link>
          
          <button @click="handleAddToCart(p)" class="btn btn-primary btn-block mt-2" :disabled="getTotalStock(p) === 0">
            {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
          </button>
        </div>
      </div>
    </section>

    <footer class="main-footer">
      <div class="footer-container">
        <div class="footer-section about">
          <router-link to="/" class="footer-logo">
            <strong>Apex</strong>Drive
          </router-link>
          <p class="footer-desc">
            Ваш надежный партнер в мире автозапчастей. Интеллектуальная логистика, 
            прямые поставки и гарантия качества для каждого автомобиля.
          </p>
          <div class="social-links">
            <a href="https://t.me/M0nss" target="_blank" title="Telegram" class="glass-icon">TG</a>
            <a href="https://vk.com/mr.monss" target="_blank" title="VK" class="glass-icon">VK</a>
          </div>
        </div>

        <div class="footer-section links">
          <h4>Магазин</h4>
          <router-link to="/catalog">Каталог товаров</router-link>
        </div>

        <div class="footer-section links">
          <h4>Информация</h4>
          <router-link to="/about">О компании</router-link>
          <router-link to="/about">Доставка и оплата</router-link>
          <router-link to="/notifications">Уведомления</router-link>
        </div>

        <div class="footer-section contacts">
          <h4>Поддержка</h4>
          <a href="tel:+79991234567" class="footer-phone">+7 (999) 123-45-67</a>
          <a href="mailto:monsschogath@gmail.com" class="footer-email">support@apexdrive.ru</a>
          <p class="work-time">Ежедневно: 09:00 — 21:00</p>
        </div>
      </div>

      <div class="footer-bottom">
        <div class="bottom-content">
          <p>&copy; 2026 ApexDrive. Все права защищены.</p>
          <div class="legal-links">
            <router-link to="/about">Политика конфиденциальности</router-link>
            <router-link to="/about">Публичная оферта</router-link>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<!-- SCOPED стили для добавленного блока -->
<style scoped>
.global-recent-section {
  max-width: 1400px;
  margin: 0 auto 60px auto;
  padding: 0 20px;
  width: 96%;
}

.carousel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}
.carousel-header h2 {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-main);
}
.ctrl-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  cursor: pointer;
  color: var(--text-main);
  margin-left: 12px;
  border: none;
  background: var(--bg-card);
}
.ctrl-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: scale(1.05);
}

.scroll-container {
  display: flex;
  gap: 24px;
  overflow-x: auto;
  padding-bottom: 20px;
  scrollbar-width: none;
  cursor: grab;
}
.scroll-container.dragging {
  cursor: grabbing;
}
.scroll-container::-webkit-scrollbar {
  display: none;
}

.product-card {
  min-width: 270px;
  max-width: 270px;
  padding: 20px;
  position: relative;
  display: flex;
  flex-direction: column;
  transform-style: preserve-3d;
}
.product-card:hover {
  border-color: var(--primary);
  transform: translateY(-5px);
}

.wishlist-btn {
  position: absolute;
  right: 15px;
  top: 15px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s;
  z-index: 3;
  cursor: pointer;
  color: var(--text-muted);
}
.wishlist-btn:hover, .wishlist-btn.active {
  color: var(--danger);
  border-color: var(--danger);
  transform: scale(1.15);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.card-link {
  text-decoration: none;
  display: flex;
  flex-direction: column;
  flex: 1;
}
.img-wrapper {
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
}
.product-img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: transform 0.4s ease;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
}
.product-card:hover .product-img {
  transform: scale(1.08);
}

.product-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  height: 44px;
  overflow: hidden;
  margin-bottom: 10px;
  line-height: 1.4;
}
.price-block {
  margin-top: auto;
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.old-price {
  text-decoration: line-through;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 600;
}
.new-price {
  font-size: 1.3rem;
  font-weight: 900;
}
.stock-status {
  font-size: 0.75rem;
  margin-top: 8px;
}
.in-stock { color: var(--success); font-weight: 700; }
.out-stock { color: var(--warning); font-weight: 700; }

@media (max-width: 768px) {
  .product-card { min-width: 240px; max-width: 240px; }
  .carousel-header h2 { font-size: 1.5rem; }
}
</style>

