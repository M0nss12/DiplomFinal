<template>
  <div class="home-page">
    <!-- ДЕКОРАТИВНЫЕ ЭЛЕМЕНТЫ -->
    <div class="gear gear-1"></div>
    <div class="gear gear-2"></div>
    <div class="sparkle-container" v-if="!isMobile">
      <div v-for="n in 30" :key="n" class="sparkle" :style="getRandomSparkleStyle()"></div>
    </div>

    <!-- КНОПКА НАВЕРХ -->
    <transition name="fade">
      <button v-if="showScrollTop" @click="scrollToTop" class="scroll-top-btn glass-card" title="Наверх">
        ↑
      </button>
    </transition>

    <!-- 1. ГЕРОЙСКИЙ БЛОК -->
    <section class="hero-section glass-card-hero">
      <div class="hero-bg-gradient"></div>
      <div class="hero-particles"></div>
      <div class="hero-content">
        <h1 class="hero-title" data-aos="fade-up">
          Надёжные автозапчасти
          <span class="highlight">с доставкой по всей России</span>
        </h1>
        <p class="hero-subtitle" data-aos="fade-up" data-aos-delay="100">
          Более 100 000 оригинальных деталей и аналогов. Готовы отправить сегодня в <strong>{{ appStore.city }}</strong>.
        </p>

        <div class="hero-search-container" ref="heroSearchRef" data-aos="fade-up" data-aos-delay="200">
          <div class="hero-search-bar">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Название детали, артикул или бренд..."
              @input="handleHeroSearch"
              @focus="isHeroSearchOpen = true"
              @keyup.enter="goToSearchPage"
            />
            <button @click="goToSearchPage" class="pulse-on-hover">Найти запчасть</button>
          </div>

          <transition name="fade">
            <div v-if="isHeroSearchOpen && searchQuery.length >= 2" class="hero-search-dropdown glass-card">
              <div v-if="heroSearchResults.categories.length" class="hs-group">
                <div class="hs-label">Категории</div>
                <router-link v-for="c in heroSearchResults.categories" :key="c.id" :to="`/category/${c.id}`" class="hs-item">
                  <span class="hs-icon">📂</span> {{ c.name }}
                </router-link>
              </div>

              <div v-if="heroSearchResults.products.length" class="hs-group">
                <div class="hs-label">Товары</div>
                <router-link v-for="prod in heroSearchResults.products" :key="prod.id" :to="`/product/${prod.id}`" class="hs-item hs-prod-item">
                  <img :src="prod.images && prod.images.length > 0 ? prod.images[0] : '/assets/images/no-image.png'" class="hs-img" />
                  <div class="hs-info">
                    <div class="hs-name">{{ prod.name }}</div>
                    <div class="hs-price">{{ prod.discount_price || prod.price }} ₽</div>
                  </div>
                </router-link>
              </div>

              <div v-if="noHeroResults" class="hs-none">Ничего не найдено 😔</div>
            </div>
          </transition>
        </div>

        <div class="hero-buttons" data-aos="fade-up" data-aos-delay="300">
          <router-link to="/catalog" class="btn-primary-large">
            <span>📦</span> Открыть каталог
          </router-link>
          <router-link to="/about" class="btn-secondary-large glass-btn">
            <span>🚚</span> Условия доставки
          </router-link>
        </div>
      </div>
    </section>

    <!-- 2. БЛОК ПРЕИМУЩЕСТВ -->
    <section class="features-section">
      <div v-for="(feature, idx) in features" :key="feature.title" class="feature-card glass-card" :class="{ 'feature-visible': animatedFeatures[idx] }" ref="featureRefs">
        <div class="feature-icon">{{ feature.icon }}</div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
        <div class="feature-stat">
          <span class="counter" :data-target="feature.countNum">{{ animatedFeatures[idx] ? animatedCounts[idx] : 0 }}</span>
          {{ feature.countUnit }}
        </div>
        <div class="feature-glow"></div>
      </div>
    </section>

    <!-- 3. ГОРЯЧИЕ ПРЕДЛОЖЕНИЯ (КАРУСЕЛЬ) -->
    <section v-if="hotDeals.length" class="carousel-section">
      <div class="carousel-header">
        <h2>🔥 Горячие предложения</h2>
        <div class="carousel-controls">
          <button @click="scroll('hotDeals', -1)" class="ctrl-btn glass-card">←</button>
          <button @click="scroll('hotDeals', 1)" class="ctrl-btn glass-card">→</button>
        </div>
      </div>

      <div class="scroll-container" ref="hotDealsRef" @mousedown="startDrag" @mousemove="duringDrag" @mouseup="stopDrag">
        <div v-for="p in hotDeals" :key="p.id" class="product-card glass-card" @mousemove="handle3DTilt($event, p.id)" @mouseleave="resetTilt(p.id)" :style="getTiltStyle(p.id)">
          <div class="discount-badge" v-if="p.discount_price">-{{ calcDiscount(p.price, p.discount_price) }}%</div>
          <button @click.stop="toggleWishlist(p.id)" class="wishlist-btn" :class="{ active: wishlistIds.includes(p.id) }">❤</button>
          <button class="quick-view-btn" @click.stop="openQuickView(p)">🔍</button>
          <router-link :to="'/product/' + p.id" class="card-link">
            <img v-if="p.brands?.logo_url" :src="p.brands.logo_url" class="brand-logo" loading="lazy" />
            <div class="img-wrapper">
              <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" class="product-img" :alt="p.name" loading="lazy" />
            </div>
            <div class="card-info-bottom">
              <h4 class="product-title">{{ p.name }}</h4>
              <div class="price-block">
                <span class="old-price">{{ p.price }} ₽</span>
                <strong class="new-price">{{ p.discount_price || p.price }} ₽</strong>
              </div>
              <div class="stock-status">
                <span v-if="getStockInCity(p) > 0" class="in-stock">✅ В {{ appStore.city }}: {{ getStockInCity(p) }} шт.</span>
                <span v-else class="out-stock">🚢 Под заказ (Межгород)</span>
              </div>
            </div>
          </router-link>
          <button @click="handleAddToCart(p)" class="cart-btn" :disabled="getTotalStock(p) === 0">
            {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
          </button>
        </div>
      </div>
      <div class="carousel-dots">
        <span v-for="(dot, i) in hotDeals" :key="'dot'+i" class="dot" :class="{ active: i === activeHotDealIndex }" @click="scrollToIndex('hotDeals', i)"></span>
      </div>
    </section>

    <!-- 4. ТОВАРЫ С РЕЙТИНГОМ 5 (КАРУСЕЛЬ) -->
    <section v-if="topRatedProducts.length" class="carousel-section top-rated-carousel">
      <div class="carousel-header">
        <h2>⭐ Товары с рейтингом 5.0</h2>
        <div class="carousel-controls">
          <button @click="scrollTopRated(-1)" class="ctrl-btn glass-card">←</button>
          <button @click="scrollTopRated(1)" class="ctrl-btn glass-card">→</button>
        </div>
      </div>

      <div class="scroll-container" ref="topRatedRef" @mousedown="startDragTopRated" @mousemove="duringDragTopRated" @mouseup="stopDragTopRated">
        <div v-for="p in topRatedProducts" :key="p.id" class="product-card top-rated-card glass-card" @mousemove="handle3DTilt($event, 't'+p.id)" @mouseleave="resetTilt('t'+p.id)" :style="getTiltStyle('t'+p.id)">
          <div class="rating-badge">⭐⭐⭐⭐⭐ 5.0</div>
          <div class="discount-badge" v-if="p.discount_price" style="top: 45px;">-{{ calcDiscount(p.price, p.discount_price) }}%</div>
          <button @click.stop="toggleWishlist(p.id)" class="wishlist-btn" :class="{ active: wishlistIds.includes(p.id) }">❤</button>
          <button class="quick-view-btn" @click.stop="openQuickView(p)">🔍</button>
          <router-link :to="'/product/' + p.id" class="card-link">
            <img v-if="p.brands?.logo_url" :src="p.brands.logo_url" class="brand-logo" loading="lazy" />
            <div class="img-wrapper">
              <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" class="product-img" :alt="p.name" loading="lazy" />
            </div>
            <div class="card-info-bottom">
              <h4 class="product-title">{{ p.name }}</h4>
              <div class="price-block">
                <span class="old-price" v-if="p.discount_price">{{ p.price }} ₽</span>
                <strong class="new-price">{{ p.discount_price || p.price }} ₽</strong>
              </div>
              <div class="stock-status">
                <span v-if="getStockInCity(p) > 0" class="in-stock">✅ В {{ appStore.city }}: {{ getStockInCity(p) }} шт.</span>
                <span v-else class="out-stock">🚢 Под заказ (Межгород)</span>
              </div>
            </div>
          </router-link>
          <button @click="handleAddToCart(p)" class="cart-btn" :disabled="getTotalStock(p) === 0">
            {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
          </button>
        </div>
      </div>
      <div class="carousel-dots">
        <span v-for="(dot, i) in topRatedProducts" :key="'tdot'+i" class="dot" :class="{ active: i === activeTopRatedIndex }" @click="scrollToIndex('topRated', i)"></span>
      </div>
    </section>

    <!-- 5. БРЕНДЫ -->
    <section class="brands-section glass-card" style="padding: 20px 0; overflow: hidden;">
      <div class="section-header" style="text-align: center; margin-bottom: 20px;">
        <h2>Наши официальные партнёры</h2>
      </div>
      <div class="brands-ribbon">
        <div class="brands-track">
          <div v-for="brand in brands" :key="brand.id" class="brand-item">
            <img :src="brand.logo_url" :title="brand.name" loading="lazy" />
          </div>
          <div v-for="brand in brands" :key="'dup-' + brand.id" class="brand-item">
            <img :src="brand.logo_url" :title="brand.name" loading="lazy" />
          </div>
        </div>
      </div>
      <div class="race-track">
        <div class="moving-dot"></div>
        <div class="moving-dot" style="animation-delay: -1s"></div>
        <div class="moving-dot" style="animation-delay: -2s"></div>
      </div>
    </section>

    <!-- 6. НЕДАВНО ПРОСМОТРЕННЫЕ -->
    <section v-if="recentProducts.length" class="carousel-section">
      <div class="carousel-header">
        <h2>🕒 Вы недавно смотрели</h2>
        <div class="carousel-controls">
          <button @click="scroll('recent', -1)" class="ctrl-btn glass-card">←</button>
          <button @click="scroll('recent', 1)" class="ctrl-btn glass-card">→</button>
        </div>
      </div>

      <div class="scroll-container" ref="recentRef" @mousedown="startDrag" @mousemove="duringDrag" @mouseup="stopDrag">
        <div v-for="p in recentProducts" :key="p.id" class="product-card glass-card" @mousemove="handle3DTilt($event, 'r'+p.id)" @mouseleave="resetTilt('r'+p.id)" :style="getTiltStyle('r'+p.id)">
          <button @click.stop="toggleWishlist(p.id)" class="wishlist-btn" :class="{ active: wishlistIds.includes(p.id) }">❤</button>
          <button class="quick-view-btn" @click.stop="openQuickView(p)">🔍</button>
          <router-link :to="'/product/' + p.id" class="card-link">
            <div class="img-wrapper">
              <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" class="product-img" loading="lazy" />
            </div>
            <div class="card-info-bottom">
              <h4 class="product-title">{{ p.name }}</h4>
              <div class="price-block">
                <strong class="new-price" style="color: var(--danger);">{{ p.discount_price || p.price }} ₽</strong>
              </div>
              <div class="stock-status">
                <span v-if="getStockInCity(p) > 0" class="in-stock">✅ В {{ appStore.city }}: {{ getStockInCity(p) }} шт.</span>
                <span v-else class="out-stock">🚢 Под заказ (Межгород)</span>
              </div>
            </div>
          </router-link>
          <button @click="handleAddToCart(p)" class="cart-btn" :disabled="getTotalStock(p) === 0">
            {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
          </button>
        </div>
      </div>
    </section>

    <!-- 7. SEO-ТЕКСТ -->
    <section class="seo-description glass-card">
      <h2>Интернет-магазин автозапчастей ApexDrive</h2>
      <p>
        Мы предлагаем более 100 000 наименований оригинальных запчастей и качественных аналогов для легковых автомобилей.
        Благодаря прямым контрактам с производителями и умной логистике, мы гарантируем низкие цены и быструю доставку в г.
        <b>{{ appStore.city }}</b>.
      </p>
    </section>

    <!-- МОДАЛЬНОЕ ОКНО БЫСТРОГО ПРОСМОТРА -->
    <div v-if="quickViewProduct" class="modal-overlay" @click.self="closeQuickView">
      <div class="modal-content glass-card">
        <button class="modal-close" @click="closeQuickView">&times;</button>
        <div class="modal-grid">
          <div class="modal-images">
            <img :src="quickViewProduct.images && quickViewProduct.images.length > 0 ? quickViewProduct.images[0] : '/assets/images/no-image.png'" :alt="quickViewProduct.name" />
          </div>
          <div class="modal-details">
            <h2>{{ quickViewProduct.name }}</h2>
            <p class="modal-sku">Артикул: <b>{{ quickViewProduct.sku }}</b></p>
            <p class="modal-desc">{{ quickViewProduct.description || 'Описание отсутствует.' }}</p>
            <div class="modal-price-block">
              <s v-if="quickViewProduct.discount_price">{{ quickViewProduct.price }} ₽</s>
              <strong>{{ quickViewProduct.discount_price || quickViewProduct.price }} ₽</strong>
            </div>
            <button @click="handleAddToCart(quickViewProduct)" class="btn-primary-large" style="width: 100%; margin-top: 20px; justify-content: center;">
              В корзину
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';
import { useCartStore } from '@/stores/cartStore';

const router = useRouter();
const appStore = useAppStore();
const cartStore = useCartStore();

const brands = ref([]);
const hotDeals = ref([]);
const topRatedProducts = ref([]);
const recentProducts = ref([]);
const wishlistIds = ref([]);
const searchQuery = ref('');
const quickViewProduct = ref(null);
const isMobile = ref(false);

const isHeroSearchOpen = ref(false);
const heroSearchRef = ref(null);
const heroSearchResults = ref({ products: [], categories: [] });
let heroSearchTimer = null;

const hotDealsRef = ref(null);
const recentRef = ref(null);
const topRatedRef = ref(null);

let isDragging = false;
let startX = 0;
let scrollLeft = 0;
let isDraggingTopRated = false;
let startXTopRated = 0;
let scrollLeftTopRated = 0;

const tiltStyles = ref({});
const featureRefs = ref([]);
const animatedFeatures = ref([false, false, false]);
const animatedCounts = ref([0, 0, 0]);
const activeHotDealIndex = ref(0);
const activeTopRatedIndex = ref(0);
const showScrollTop = ref(false);

const features = ref([
  { icon: '🚚', title: 'Умная логистика', description: 'Бесплатное перемещение товаров между складами вашего города.', countNum: 24, countUnit: 'часа' },
  { icon: '🛡️', title: '100% Оригинал', description: 'Прямые контракты с производителями. Гарантия до 24 месяцев.', countNum: 100, countUnit: '%' },
  { icon: '↩️', title: 'Легкий возврат', description: 'Не подошла деталь? Вернем деньги без лишних вопросов в течение 14 дней.', countNum: 14, countUnit: 'дней' },
]);

const calcDiscount = (oldP, newP) => Math.round(((oldP - newP) / oldP) * 100);
const isSameCity = (c1, c2) => c1?.trim().toLowerCase() === c2?.trim().toLowerCase();

const getStockInCity = (p) => {
  if (!p.product_stocks || !appStore.city) return 0;
  return p.product_stocks
    .filter(s => {
      const wCity = s.warehouses?.cities?.name || s.warehouses?.city_name;
      return isSameCity(wCity, appStore.city);
    })
    .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
};

const getTotalStock = (p) => p.product_stocks?.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || 0;

const loadData = async () => {
  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const [b, pRes] = await Promise.all([
      axios.get(`/api/admin/brands`, { headers: {'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123'} }).catch(() => ({data: []})),
      axios.get(`${API_URL}/api/products`)
    ]);
    brands.value = b.data.filter(br => br.logo_url);
    const withDiscount = pRes.data.filter(p => p.discount_price && p.discount_price < p.price);
    hotDeals.value = withDiscount.slice(0, 10);
    topRatedProducts.value = pRes.data.slice(0, 12);

    const uid = localStorage.getItem('user_id');
    if (uid) {
      const w = await axios.get(`${API_URL}/api/wishlist/${uid}`);
      wishlistIds.value = w.data.map(i => i.product_id);
    }

    const recentIds = JSON.parse(localStorage.getItem('recent_views') || '[]');
    if (recentIds.length) {
      const recentRes = await axios.post(`${API_URL}/api/products/recent`, { ids: recentIds.slice(0, 15) });
      recentProducts.value = recentRes.data;
    }
  } catch (e) {
    console.error('Ошибка загрузки данных главной страницы', e);
  }
};

const handleHeroSearch = () => {
  clearTimeout(heroSearchTimer);
  if (searchQuery.value.length < 2) {
    heroSearchResults.value = { products: [], categories: [] };
    return;
  }
  heroSearchTimer = setTimeout(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/global-search?q=${searchQuery.value}`);
      heroSearchResults.value = res.data;
    } catch (e) {
      console.error('Hero search error:', e);
    }
  }, 300);
};

const goToSearchPage = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/catalog', query: { q: searchQuery.value } });
  }
};

const noHeroResults = computed(() => {
  return searchQuery.value.length >= 2 &&
    heroSearchResults.value.products.length === 0 &&
    heroSearchResults.value.categories.length === 0;
});

const handleClickOutside = (event) => {
  if (heroSearchRef.value && !heroSearchRef.value.contains(event.target)) {
    isHeroSearchOpen.value = false;
  }
};

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
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    console.error(e);
  }
};

const handleAddToCart = (p) => {
  cartStore.addToCart({ ...p, stock_quantity: getTotalStock(p) });
  closeQuickView();
};

const scroll = (name, dir) => {
  const el = name === 'hotDeals' ? hotDealsRef.value : recentRef.value;
  if (el) el.scrollBy({ left: 320 * dir, behavior: 'smooth' });
};

const startDrag = (e) => {
  isDragging = true;
  const el = e.currentTarget;
  startX = e.pageX - el.offsetLeft;
  scrollLeft = el.scrollLeft;
  el.classList.add('dragging');
};

const duringDrag = (e) => {
  if (!isDragging) return;
  e.preventDefault();
  const el = e.currentTarget;
  const x = e.pageX - el.offsetLeft;
  const walk = (x - startX) * 2;
  el.scrollLeft = scrollLeft - walk;
};

const stopDrag = () => {
  isDragging = false;
  const el = hotDealsRef.value || recentRef.value;
  if (el) el.classList.remove('dragging');
};

const scrollTopRated = (dir) => {
  if (topRatedRef.value) {
    topRatedRef.value.scrollBy({ left: 320 * dir, behavior: 'smooth' });
  }
};

const startDragTopRated = (e) => {
  isDraggingTopRated = true;
  const el = e.currentTarget;
  startXTopRated = e.pageX - el.offsetLeft;
  scrollLeftTopRated = el.scrollLeft;
  el.classList.add('dragging');
};

const duringDragTopRated = (e) => {
  if (!isDraggingTopRated) return;
  e.preventDefault();
  const el = e.currentTarget;
  const x = e.pageX - el.offsetLeft;
  const walk = (x - startXTopRated) * 2;
  el.scrollLeft = scrollLeftTopRated - walk;
};

const stopDragTopRated = () => {
  isDraggingTopRated = false;
  if (topRatedRef.value) topRatedRef.value.classList.remove('dragging');
};

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

const resetTilt = (id) => {
  tiltStyles.value[id] = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
};

const getTiltStyle = (id) => tiltStyles.value[id] || '';

const openQuickView = async (product) => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/products/${product.id}`);
    quickViewProduct.value = res.data;
  } catch (e) {
    console.error('Ошибка при загрузке данных быстрого просмотра', e);
    quickViewProduct.value = product;
  }
};

const closeQuickView = () => {
  quickViewProduct.value = null;
};

const animateCounter = (el, target, index) => {
  let start = 0;
  const duration = 1500;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const value = Math.floor(progress * target);
    animatedCounts.value[index] = value;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      animatedCounts.value[index] = target;
    }
  };
  requestAnimationFrame(step);
};

const setupObservers = () => {
  const featureElements = document.querySelectorAll('.feature-card');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = Array.from(featureElements).indexOf(entry.target);
        if (!animatedFeatures.value[idx]) {
          animatedFeatures.value[idx] = true;
          const target = features.value[idx].countNum;
          animateCounter(entry.target, target, idx);
          countObserver.unobserve(entry.target);
        }
      }
    });
  }, { threshold: 0.5 });
  featureElements.forEach(el => countObserver.observe(el));
};

const getRandomSparkleStyle = () => {
  return {
    left: Math.random() * 100 + '%',
    animationDelay: Math.random() * 10 + 's',
    width: Math.random() * 4 + 2 + 'px',
    height: Math.random() * 4 + 2 + 'px',
    opacity: Math.random() * 0.5 + 0.2,
  };
};

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleScroll = () => {
  showScrollTop.value = window.pageYOffset > 600;
};

const updateHotDealActiveIndex = () => {
  if (!hotDealsRef.value) return;
  const el = hotDealsRef.value;
  const index = Math.round(el.scrollLeft / 280);
  activeHotDealIndex.value = index >= 0 ? index : 0;
};

const updateTopRatedActiveIndex = () => {
  if (!topRatedRef.value) return;
  const el = topRatedRef.value;
  const index = Math.round(el.scrollLeft / 280);
  activeTopRatedIndex.value = index >= 0 ? index : 0;
};

const scrollToIndex = (name, index) => {
  const el = name === 'hotDeals' ? hotDealsRef.value : topRatedRef.value;
  if (el) el.scrollTo({ left: index * 280, behavior: 'smooth' });
};

onMounted(() => {
  loadData();
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', handleScroll);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  nextTick(() => {
    setupObservers();
    if (hotDealsRef.value) hotDealsRef.value.addEventListener('scroll', updateHotDealActiveIndex);
    if (topRatedRef.value) topRatedRef.value.addEventListener('scroll', updateTopRatedActiveIndex);
  });
});

onUnmounted(() => {
  clearInterval(heroSearchTimer);
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', checkMobile);
  if (hotDealsRef.value) hotDealsRef.value.removeEventListener('scroll', updateHotDealActiveIndex);
  if (topRatedRef.value) topRatedRef.value.removeEventListener('scroll', updateTopRatedActiveIndex);
});

watch(() => appStore.city, loadData);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
.home-page {
  padding-bottom: 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 96%;
}

.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes moveDot { 0% { left: -10px; opacity: 1; } 100% { left: 100%; opacity: 0; } }
@keyframes pulseGlow { 0% { box-shadow: 0 0 0 0 var(--primary-light, rgba(37,99,235,0.4)); } 70% { box-shadow: 0 0 0 15px rgba(37,99,235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37,99,235, 0); } }
@keyframes sparkle { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }

.gear {
  position: fixed; width: 80px; height: 80px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.07.08A10 10 0 0 0 12 18a10 10 0 0 0 6.26-2.22z"/><path d="M5.52 10.5a10 10 0 0 1 12.96 0"/></svg>') center/contain no-repeat;
  opacity: 0.08; pointer-events: none; z-index: -1; animation: spin 20s linear infinite; color: var(--text-main, #0f172a);
}
:global(.dark) .gear { color: #f8fafc; opacity: 0.05; }
.gear-1 { top: 10%; left: 5%; width: 100px; height: 100px; animation-duration: 25s; }
.gear-2 { bottom: 10%; right: 5%; width: 70px; height: 70px; animation-duration: 18s; animation-direction: reverse; }

.sparkle-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1; overflow: hidden; }
.sparkle { position: absolute; background: radial-gradient(circle, var(--primary, #2563eb) 0%, transparent 80%); border-radius: 50%; animation: sparkle 8s linear infinite; }

.scroll-top-btn {
  position: fixed; bottom: 30px; right: 30px; width: 48px; height: 48px;
  border-radius: 50%; background: var(--primary, #2563eb); color: white;
  display: flex; align-items: center; justify-content: center; font-size: 1.5rem;
  cursor: pointer; z-index: 900; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
  transition: transform 0.2s, background 0.2s;
}
.scroll-top-btn:hover { transform: translateY(-3px); background: var(--accent, #0ea5e9); }

/* ГЕРОЙ */
.hero-section { position: relative; border-radius: var(--radius-lg, 16px); margin: 40px 0 60px 0; overflow: visible !important; box-shadow: var(--shadow-md); }
.glass-card-hero { background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0); }
:global(.dark) .glass-card-hero { background: #1e293b; border-color: #334155; }

.hero-bg-gradient {
  position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: linear-gradient(125deg, rgba(255,255,255,0) 0%, rgba(37,99,235,0.05) 30%, rgba(14,165,233,0.05) 70%, rgba(255,255,255,0) 100%);
  background-size: 200% 200%; animation: gradientShift 12s ease infinite; z-index: 0; pointer-events: none; border-radius: inherit;
}
:global(.dark) .hero-bg-gradient { background: linear-gradient(125deg, rgba(30,41,59,0) 0%, rgba(37,99,235,0.1) 30%, rgba(14,165,233,0.1) 70%, rgba(30,41,59,0) 100%); }

.hero-particles { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle at 20% 40%, rgba(0,0,0,0.03) 1px, transparent 1px); background-size: 30px 30px; pointer-events: none; z-index: 1; border-radius: inherit; }
:global(.dark) .hero-particles { background-image: radial-gradient(circle at 20% 40%, rgba(255,255,255,0.03) 1px, transparent 1px); }

.hero-content { position: relative; z-index: 2; max-width: 800px; margin: 0 auto; text-align: center; padding: 70px 40px; }

.hero-title { font-size: 3.2rem; line-height: 1.2; font-weight: 900; margin-bottom: 20px; animation: fadeSlideUp 0.6s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .hero-title { color: #f8fafc; }

.highlight { background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; display: inline-block; }

.hero-subtitle { font-size: 1.2rem; color: var(--text-muted, #64748b); margin-bottom: 30px; }
:global(.dark) .hero-subtitle { color: #94a3b8; }
.hero-subtitle strong { color: var(--primary, #2563eb); }
:global(.dark) .hero-subtitle strong { color: #60a5fa; }

.hero-search-container { max-width: 650px; margin: 0 auto 40px; position: relative; z-index: 100; }
.hero-search-bar {
  display: flex; align-items: center; background: var(--bg-card, #fff); border-radius: 60px;
  padding: 6px 6px 6px 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #e2e8f0); transition: all 0.3s;
}
:global(.dark) .hero-search-bar { background: #0f172a; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
.hero-search-bar:focus-within { box-shadow: 0 0 0 4px rgba(37,99,235,0.15), 0 10px 25px -5px rgba(0,0,0,0.1); transform: scale(1.01); border-color: var(--primary, #2563eb); }
.search-icon { font-size: 1.2rem; color: var(--text-muted, #64748b); margin-right: 10px; }
.hero-search-bar input { flex: 1; border: none; background: transparent; padding: 14px 0; font-size: 1rem; outline: none; color: var(--text-main, #0f172a); }
:global(.dark) .hero-search-bar input { color: #f8fafc; }
.hero-search-bar button {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border: none;
  padding: 12px 32px; border-radius: 50px; color: white; font-weight: 700; cursor: pointer; transition: transform 0.2s;
}
.pulse-on-hover:hover { animation: pulseGlow 1s infinite; transform: scale(1.02); }

.hero-search-dropdown {
  position: absolute; top: calc(100% + 12px); left: 0; right: 0;
  max-height: min(480px, 50vh); overflow-y: auto; overscroll-behavior: contain; z-index: 1000; padding: 8px 0; text-align: left;
}
.hero-search-dropdown::-webkit-scrollbar { width: 6px; }
.hero-search-dropdown::-webkit-scrollbar-track { background: transparent; }
.hero-search-dropdown::-webkit-scrollbar-thumb { background: var(--border-color, #cbd5e1); border-radius: 3px; }
.hs-group { margin-bottom: 8px; }
.hs-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: var(--text-muted, #64748b); padding: 8px 20px; background: rgba(0,0,0,0.02); position: sticky; top: 0; backdrop-filter: blur(4px); z-index: 2; }
:global(.dark) .hs-label { background: rgba(255,255,255,0.02); color: #94a3b8; }
.hs-item { display: flex; align-items: center; gap: 15px; padding: 10px 20px; text-decoration: none; color: var(--text-main, #0f172a); transition: background 0.2s; cursor: pointer; }
:global(.dark) .hs-item { color: #f8fafc; }
.hs-item:hover { background: rgba(37,99,235,0.05); }
.hs-img { width: 44px; height: 44px; object-fit: contain; background: #fff; border-radius: var(--radius-sm, 8px); padding: 4px; border: 1px solid var(--border-color, #e2e8f0); }
:global(.dark) .hs-img { border-color: #334155; }
.hs-info { flex: 1; }
.hs-name { font-weight: 600; font-size: 0.9rem; line-height: 1.2; }
.hs-price { color: var(--success, #10b981); font-weight: 700; font-size: 0.85rem; margin-top: 2px; }
.hs-none { padding: 20px; text-align: center; color: var(--text-muted, #64748b); font-weight: 500; }

.hero-buttons { display: flex; gap: 20px; justify-content: center; }
.btn-primary-large, .btn-secondary-large { display: inline-flex; align-items: center; gap: 10px; padding: 14px 32px; border-radius: 40px; font-weight: 700; transition: all 0.3s; text-decoration: none; }
.btn-primary-large { background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; box-shadow: 0 10px 20px rgba(37,99,235, 0.3); }
.btn-primary-large:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(37,99,235, 0.5); }
.glass-btn { background: rgba(0,0,0,0.02); border: 2px solid var(--border-color, #cbd5e1); color: var(--text-main, #0f172a); }
:global(.dark) .glass-btn { background: rgba(255,255,255,0.02); border-color: #334155; color: #f8fafc; }
.glass-btn:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); transform: translateY(-3px); background: var(--bg-card, #fff); }
:global(.dark) .glass-btn:hover { background: #1e293b; color: #60a5fa; }

/* ПРЕИМУЩЕСТВА */
.features-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 60px; }
.feature-card { position: relative; padding: 30px 20px; text-align: center; overflow: hidden; transform: translateY(20px); opacity: 0; animation: fadeSlideUp 0.6s forwards; }
.feature-card:nth-child(1) { animation-delay: 0.1s; }
.feature-card:nth-child(2) { animation-delay: 0.2s; }
.feature-card:nth-child(3) { animation-delay: 0.3s; }
.feature-card:hover { transform: translateY(-8px); border-color: var(--primary, #2563eb); }
.feature-icon { font-size: 3rem; margin-bottom: 15px; transition: transform 0.3s; }
.feature-card:hover .feature-icon { transform: scale(1.1) rotate(5deg); }
.feature-card h3 { color: var(--text-main, #0f172a); font-weight: 800; font-size: 1.2rem; margin-bottom: 10px; }
:global(.dark) .feature-card h3 { color: #f8fafc; }
.feature-card p { color: var(--text-muted, #64748b); font-size: 0.95rem; line-height: 1.5; }
.feature-stat { font-size: 1.3rem; font-weight: 800; color: var(--primary, #2563eb); margin-top: 15px; }
:global(.dark) .feature-stat { color: #60a5fa; }
.counter { font-size: 2.2rem; display: inline-block; min-width: 60px; }
.feature-glow { position: absolute; bottom: -2px; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, transparent, var(--primary, #2563eb), transparent); opacity: 0; transition: opacity 0.3s; }
.feature-card:hover .feature-glow { opacity: 1; }

/* КАРУСЕЛИ И КАРТОЧКИ */
.carousel-section { margin-bottom: 60px; }
.carousel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.carousel-header h2 { font-size: 1.8rem; font-weight: 900; color: var(--text-main, #0f172a); }
:global(.dark) .carousel-header h2 { color: #f8fafc; }
.ctrl-btn { width: 44px; height: 44px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 1.3rem; cursor: pointer; color: var(--text-main, #0f172a); margin-left: 12px; }
:global(.dark) .ctrl-btn { color: #f8fafc; }
.ctrl-btn:hover { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); transform: scale(1.05); }

.scroll-container { display: flex; gap: 24px; overflow-x: auto; padding-bottom: 20px; scrollbar-width: none; cursor: grab; }
.scroll-container.dragging { cursor: grabbing; }
.scroll-container::-webkit-scrollbar { display: none; }

.product-card {
  min-width: 270px; max-width: 270px; padding: 20px; position: relative;
  display: flex; flex-direction: column; transform-style: preserve-3d;
}
.product-card:hover { border-color: var(--primary, #2563eb); transform: translateY(-5px); }
.discount-badge { position: absolute; top: 15px; left: 15px; background: linear-gradient(135deg, var(--danger, #ef4444), #dc2626); color: white; padding: 4px 12px; border-radius: 30px; font-weight: 800; font-size: 0.75rem; z-index: 3; box-shadow: 0 2px 4px rgba(239,68,68,0.3); }
.wishlist-btn, .quick-view-btn { position: absolute; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: var(--bg-card, #fff); border: 1px solid var(--border-color, #cbd5e1); display: flex; align-items: center; justify-content: center; font-size: 1.1rem; transition: all 0.2s; z-index: 3; cursor: pointer; color: var(--text-muted, #94a3b8); }
:global(.dark) .wishlist-btn, :global(.dark) .quick-view-btn { background: #1e293b; border-color: #475569; }
.wishlist-btn { top: 15px; }
.quick-view-btn { top: 60px; }
.wishlist-btn:hover, .quick-view-btn:hover { transform: scale(1.15); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.wishlist-btn:hover { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }
.quick-view-btn:hover { color: var(--primary, #2563eb); border-color: var(--primary, #2563eb); }
.wishlist-btn.active { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }

.card-link { text-decoration: none; display: flex; flex-direction: column; flex: 1; }
.img-wrapper { height: 170px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; }
.product-img { max-height: 100%; max-width: 100%; object-fit: contain; transition: transform 0.4s ease; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05)); }
:global(.dark) .product-img { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
.product-card:hover .product-img { transform: scale(1.08); }

.brand-logo {
  position: absolute; top: 15px; right: 55px; height: 24px; width: auto; max-width: 60px;
  object-fit: contain; z-index: 3; background: rgba(255,255,255,0.8); padding: 2px 4px; border-radius: 4px;
}

.product-title { font-size: 0.95rem; font-weight: 700; color: var(--text-main, #0f172a); height: 44px; overflow: hidden; margin-bottom: 10px; line-height: 1.4; }
:global(.dark) .product-title { color: #f8fafc; }
.price-block { margin-top: auto; display: flex; align-items: baseline; gap: 8px; }
.old-price { text-decoration: line-through; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 600; }
.new-price { font-size: 1.3rem; font-weight: 900; color: var(--danger, #ef4444); }
.stock-status { font-size: 0.75rem; margin-top: 8px; }
.in-stock { color: var(--success, #10b981); font-weight: 700; }
.out-stock { color: var(--warning, #f59e0b); font-weight: 700; }
.cart-btn {
  width: 100%; padding: 12px; background: var(--primary, #2563eb); color: white; border: none;
  border-radius: var(--radius-sm, 8px); font-weight: 800; margin-top: 16px; transition: all 0.2s; cursor: pointer;
}
.cart-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
.cart-btn:disabled { background: rgba(0,0,0,0.05); color: var(--text-muted, #94a3b8); cursor: not-allowed; }
:global(.dark) .cart-btn:disabled { background: rgba(255,255,255,0.05); }

.rating-badge {
  position: absolute; top: 15px; left: 15px; background: rgba(255, 193, 7, 0.15); color: #f59e0b;
  padding: 4px 10px; border-radius: 30px; font-weight: 800; font-size: 0.75rem; z-index: 3; border: 1px solid rgba(255, 193, 7, 0.5); backdrop-filter: blur(4px);
}

/* БРЕНДЫ */
.brands-section h2 { color: var(--text-main, #0f172a); font-weight: 800; font-size: 1.8rem; }
:global(.dark) .brands-section h2 { color: #f8fafc; }
.brands-ribbon { overflow: hidden; white-space: nowrap; position: relative; padding: 20px 0; mask-image: linear-gradient(90deg, transparent, black 10%, black 90%, transparent); }
.brands-track { display: inline-flex; gap: 40px; animation: scrollBrands 20s linear infinite; }
@keyframes scrollBrands { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
.brand-item {
  min-width: 120px; height: 70px; display: inline-flex; align-items: center; justify-content: center; padding: 10px; transition: all 0.3s;
}
.brand-item img { max-width: 90%; max-height: 90%; filter: grayscale(100%); opacity: 0.5; transition: all 0.3s; }
:global(.dark) .brand-item img { filter: grayscale(100%) invert(1); }
.brand-item:hover img { filter: grayscale(0); opacity: 1; transform: scale(1.1); }
:global(.dark) .brand-item:hover img { filter: grayscale(0) invert(0); background: #fff; padding: 4px; border-radius: 4px; }
.race-track { position: relative; height: 4px; background: rgba(0,0,0,0.05); margin: 0 40px 10px; border-radius: 2px; overflow: hidden; }
:global(.dark) .race-track { background: rgba(255,255,255,0.05); }
.moving-dot { position: absolute; width: 8px; height: 8px; background: var(--primary, #2563eb); border-radius: 50%; top: -2px; animation: moveDot 3s linear infinite; }

/* SEO-ТЕКСТ */
.seo-description { padding: 40px; margin-bottom: 40px; text-align: center; }
.seo-description h2 { color: var(--text-main, #0f172a); margin-bottom: 15px; font-weight: 800; }
:global(.dark) .seo-description h2 { color: #f8fafc; }
.seo-description p { color: var(--text-muted, #64748b); line-height: 1.6; font-size: 1.05rem; max-width: 800px; margin: 0 auto; }
:global(.dark) .seo-description p { color: #94a3b8; }

/* МОДАЛКА */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeSlideUp 0.2s ease-out; }
.modal-content { width: 850px; max-width: 95%; padding: 30px; position: relative; }
.modal-close { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.05); border: none; font-size: 24px; cursor: pointer; transition: all 0.2s; color: var(--text-main, #0f172a); display: flex; align-items: center; justify-content: center; }
:global(.dark) .modal-close { background: rgba(255,255,255,0.05); color: #f8fafc; }
.modal-close:hover { background: rgba(239,68,68,0.1); color: var(--danger, #ef4444); transform: rotate(90deg); }
.modal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
.modal-images img { width: 100%; height: 300px; object-fit: contain; background: #fff; border-radius: var(--radius-md, 8px); padding: 10px; border: 1px solid var(--border-color, #e2e8f0); }
:global(.dark) .modal-images img { border-color: #334155; }
.modal-details h2 { font-size: 1.6rem; font-weight: 800; color: var(--text-main, #0f172a); margin-bottom: 10px; }
:global(.dark) .modal-details h2 { color: #f8fafc; }
.modal-sku { font-size: 0.9rem; color: var(--text-muted, #64748b); margin-bottom: 15px; }
.modal-desc { font-size: 0.95rem; color: var(--text-main, #0f172a); line-height: 1.6; margin-bottom: 20px; }
:global(.dark) .modal-desc { color: #e2e8f0; }
.modal-price-block { margin: 20px 0; font-size: 2rem; font-weight: 900; color: var(--danger, #ef4444); display: flex; align-items: baseline; gap: 10px; }
.modal-price-block s { font-size: 1.1rem; color: var(--text-muted, #64748b); font-weight: 600; text-decoration: line-through; }

/* ТОЧКИ КАРУСЕЛИ */
.carousel-dots { display: flex; justify-content: center; gap: 8px; margin-top: 15px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border-color, #cbd5e1); cursor: pointer; transition: background 0.2s; }
.dot.active { background: var(--primary, #2563eb); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) {
  .hero-title { font-size: 2.5rem; }
  .features-section { gap: 20px; }
}
@media (max-width: 768px) {
  .hero-content { padding: 40px 20px; }
  .hero-title { font-size: 1.8rem; }
  .hero-search-bar { flex-direction: column; border-radius: 28px; padding: 15px; }
  .hero-search-bar button { width: 100%; margin-top: 10px; }
  .hero-buttons { flex-direction: column; gap: 12px; }
  .features-section { grid-template-columns: 1fr; }
  .modal-grid { grid-template-columns: 1fr; }
  .modal-images img { height: 200px; }
  .product-card { min-width: 240px; max-width: 240px; }
  .gear, .sparkle-container { display: none; }
}
</style>