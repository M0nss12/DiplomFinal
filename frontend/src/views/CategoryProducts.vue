<template>
  <div class="category-products-page">
    <!-- ХЛЕБНЫЕ КРОШКИ -->
    <nav v-if="allCategories.length" class="breadcrumbs">
      <router-link to="/catalog">Каталог</router-link>
      <span v-for="crumb in breadcrumbs" :key="crumb.id" class="crumb-item">
        <span class="separator">/</span>
        <router-link :to="'/catalog/' + crumb.id">{{ crumb.name }}</router-link>
      </span>
      <span class="separator">/</span>
      <span class="current">{{ currentCategory?.name || 'Загрузка...' }}</span>
    </nav>

    <h1>{{ currentCategory?.name }}</h1>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Загрузка товаров...</p>
    </div>

    <div v-else class="content-wrapper">
      <!-- БОКОВАЯ ПАНЕЛЬ ФИЛЬТРОВ -->
      <aside class="filters-sidebar">
        <div class="filters-box glass-card">
          <h3>Фильтры</h3>

          <div class="filter-group">
            <label>Цена (₽):</label>
            <div class="price-range-inputs">
              <input v-model.number="filterPriceMin" type="number" placeholder="От" />
              <span class="price-separator">—</span>
              <input v-model.number="filterPriceMax" type="number" placeholder="До" />
            </div>
          </div>

          <div class="filter-group checkbox-group">
            <label class="custom-checkbox">
              <input type="checkbox" v-model="filterOnlyInMyCity" />
              <span class="checkmark"></span>
              В наличии в г. {{ appStore.city }}
            </label>
          </div>

          <div v-for="spec in availableSpecs" :key="spec.name" class="filter-group spec-group">
            <b>{{ spec.name }}</b>
            <div v-for="val in spec.values" :key="val" class="checkbox-item">
              <label class="custom-checkbox small">
                <input type="checkbox" :value="val" v-model="activeSpecFilters[spec.name]" />
                <span class="checkmark"></span>
                {{ val }}
              </label>
            </div>
          </div>

          <button @click="resetFilters" class="btn btn-outline btn-block mt-2">Сбросить всё</button>
        </div>
      </aside>

      <!-- СПИСОК ТОВАРОВ -->
      <main class="products-list-container">
        <div class="list-header glass-card">
          <span class="found-count">Найдено: <b>{{ filteredProducts.length }}</b></span>
          <select v-model="sortOrder" class="sort-select">
            <option value="cheap">Сначала дешевые</option>
            <option value="expensive">Сначала дорогие</option>
          </select>
        </div>

        <div v-if="filteredProducts.length > 0" class="products-list-vertical">
          <div v-for="p in paginatedProducts" :key="p.id" class="product-list-item glass-card">
            <div class="item-image-col">
              <img
                :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'"
                :alt="p.name"
                loading="lazy"
              />
              <button
                @click.stop="toggleWishlist(p.id)"
                class="wishlist-btn"
                :class="{ active: wishlistIds.includes(p.id) }"
                title="В избранное"
              >
                ❤
              </button>
            </div>

            <div class="item-info-col">
              <div class="brand-row" v-if="p.brands?.logo_url || p.brands?.name">
                <img v-if="p.brands?.logo_url" :src="p.brands.logo_url" class="brand-logo-mini" />
                <span v-else class="brand-name-text">{{ p.brands?.name }}</span>
              </div>

              <router-link :to="'/product/' + p.id" class="product-link">
                {{ p.name }}
              </router-link>

              <div class="product-meta">
                <span>Арт: {{ p.sku }}</span>
              </div>

              <!-- Рейтинг товара -->
              <div class="product-rating" v-if="getRating(p.id).count > 0">
                <span class="stars-small">
                  <span
                    v-for="n in 5"
                    :key="n"
                    class="star-small"
                    :class="{ filled: n <= Math.round(getRating(p.id).avg) }"
                  >★</span>
                </span>
                <span class="rating-value-small">{{ getRating(p.id).avg }}</span>
                <span class="rating-count">({{ getRating(p.id).count }} отз.)</span>
              </div>

              <p class="product-desc">{{ p.description }}</p>
            </div>

            <div class="item-action-col">
              <div class="price-container">
                <div v-if="p.discount_price" class="price-box">
                  <s class="old-price">{{ p.price }} ₽</s>
                  <h2 class="new-price">{{ p.discount_price }} ₽</h2>
                </div>
                <h2 v-else class="regular-price">{{ p.price }} ₽</h2>
              </div>

              <!-- СТАТУС НАЛИЧИЯ ПОД ЦЕНОЙ -->
              <div class="stock-status" style="margin-top: 12px; text-align: right;">
                <span 
                  v-if="getTotalStock(p) === 0"
                  style="display: inline-block; background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid #ef4444; border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700;"
                >❌ Нет в наличии</span>
                <span 
                  v-else-if="getStockInCity(p) > 0"
                  style="display: inline-block; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981; border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700;"
                >✅ В наличии (г. {{ appStore.city }})</span>
                <span 
                  v-else
                  style="display: inline-block; background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid #f59e0b; border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; font-weight: 700;"
                >🚚 Доставка (Межгород)</span>
              </div>

              <button
                @click="handleAddToCart(p)"
                :disabled="getTotalStock(p) === 0"
                class="btn btn-primary btn-block"
              >
                {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-state glass-card mt-2">
          <div class="empty-state-icon">🔍</div>
          <h3>Товары не найдены</h3>
          <p>Попробуйте изменить параметры фильтрации или выбрать другой город.</p>
          <button @click="resetFilters" class="btn btn-outline">Сбросить фильтры</button>
        </div>

        <!-- ПАГИНАЦИЯ -->
        <div v-if="totalPages > 1" class="pagination glass-card">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1" 
            @click="setPage(currentPage - 1)"
          >←</button>
          <div class="page-numbers">
            <button 
              v-for="page in visiblePages" 
              :key="page" 
              class="page-btn" 
              :class="{ active: page === currentPage }"
              @click="setPage(page)"
            >{{ page }}</button>
          </div>
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages" 
            @click="setPage(currentPage + 1)"
          >→</button>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive, watch } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const route = useRoute();
const cartStore = useCartStore();
const appStore = useAppStore();

const loading = ref(true);
const products = ref([]);
const allCategories = ref([]);
const wishlistIds = ref([]);
const currentPage = ref(1);
const itemsPerPage = 10;

const filterPriceMin = ref(null);
const filterPriceMax = ref(null);
const filterOnlyInMyCity = ref(false);
const sortOrder = ref('cheap');
const activeSpecFilters = reactive({});
const ratingsMap = ref({});

function getAllChildCategoryIds(parentId, list) {
  const children = allCategories.value.filter(c => c.parent_id === parentId);
  for (const child of children) {
    list.push(child.id);
    getAllChildCategoryIds(child.id, list);
  }
}

const loadRatings = async () => {
  if (!products.value.length) return;
  try {
    const productIds = products.value.map(p => p.id);
    const res = await axios.get('/api/admin/reviews', {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    const allReviews = res.data.filter(r => productIds.includes(r.product_id) && r.is_approved);

    const map = {};
    allReviews.forEach(r => {
      if (!map[r.product_id]) map[r.product_id] = { sum: 0, count: 0 };
      map[r.product_id].sum += r.rating;
      map[r.product_id].count += 1;
    });
    Object.keys(map).forEach(pid => {
      const entry = map[pid];
      map[pid] = { avg: (entry.sum / entry.count).toFixed(1), count: entry.count };
    });
    ratingsMap.value = map;
  } catch (e) {
    console.warn('Не удалось загрузить рейтинги');
  }
};

const getRating = (productId) => ratingsMap.value[productId] || { avg: 0, count: 0 };

const loadData = async () => {
  loading.value = true;
  currentPage.value = 1;
  const categoryId = Number(route.params.id);
  const uid = localStorage.getItem('user_id');

  try {
    const [cRes, pRes] = await Promise.all([axios.get('/api/categories'), axios.get('/api/products')]);

    allCategories.value = cRes.data;

    const allowedCategoryIds = [categoryId];
    getAllChildCategoryIds(categoryId, allowedCategoryIds);

    products.value = pRes.data.filter(p => allowedCategoryIds.includes(p.category_id));

    await loadRatings();

    if (uid) {
      const wRes = await axios.get(`/api/wishlist/${uid}`);
      wishlistIds.value = wRes.data.map(i => i.product_id);
    }

    // Инициализация активных фильтров для характеристик
    const specsMap = {};
    products.value.forEach(p => {
      const chars = p.characteristics || {};
      Object.keys(chars).forEach(key => {
        if (!specsMap[key]) specsMap[key] = [];
      });
    });
    Object.keys(specsMap).forEach(spec => {
      if (!activeSpecFilters[spec]) activeSpecFilters[spec] = [];
    });
  } catch (e) {
    console.error('Ошибка загрузки товаров:', e);
  } finally {
    loading.value = false;
  }
};

const toggleWishlist = async (id) => {
  const uid = localStorage.getItem('user_id');
  if (!uid) {
    alert('Пожалуйста, войдите в аккаунт, чтобы добавить товар в избранное.');
    return;
  }
  try {
    if (wishlistIds.value.includes(id)) {
      await axios.delete(`/api/wishlist/${uid}/${id}`);
      wishlistIds.value = wishlistIds.value.filter(i => i !== id);
    } else {
      await axios.post(`/api/wishlist`, { user_id: uid, product_id: id });
      wishlistIds.value.push(id);
    }
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    console.error('Ошибка избранного:', e);
  }
};

const currentCategory = computed(() => allCategories.value.find(c => c.id === Number(route.params.id)));

const breadcrumbs = computed(() => {
  const crumbs = [];
  let parentId = currentCategory.value?.parent_id;
  while (parentId) {
    const cat = allCategories.value.find(c => c.id === parentId);
    if (cat) {
      crumbs.unshift(cat);
      parentId = cat.parent_id;
    } else break;
  }
  return crumbs;
});

const getStockInCity = (p) => {
  if (!p.product_stocks || !appStore.city) return 0;
  const targetCity = appStore.city.trim().toLowerCase();
  return p.product_stocks
    .filter(s => {
      const wCity = s.warehouses?.cities?.name || '';
      return wCity.trim().toLowerCase() === targetCity;
    })
    .reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
};

const getTotalStock = (p) =>
  p.product_stocks?.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || 0;

const filteredProducts = computed(() => {
  let res = [...products.value];
  if (filterOnlyInMyCity.value) res = res.filter(p => getStockInCity(p) > 0);
  if (filterPriceMin.value !== null && filterPriceMin.value !== '')
    res = res.filter(p => (p.discount_price || p.price) >= filterPriceMin.value);
  if (filterPriceMax.value !== null && filterPriceMax.value !== '')
    res = res.filter(p => (p.discount_price || p.price) <= filterPriceMax.value);

  Object.keys(activeSpecFilters).forEach(name => {
    const selectedVals = activeSpecFilters[name];
    if (selectedVals && selectedVals.length > 0) {
      res = res.filter(p => {
        const pChars = p.characteristics || {};
        const productVal = pChars[name]?.toString().trim();
        return selectedVals.includes(productVal);
      });
    }
  });

  res.sort((a, b) => {
    const p1 = a.discount_price || a.price;
    const p2 = b.discount_price || b.price;
    return sortOrder.value === 'cheap' ? p1 - p2 : p2 - p1;
  });
  return res;
});

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / itemsPerPage));

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredProducts.value.slice(start, start + itemsPerPage);
});

const visiblePages = computed(() => {
  const delta = 2;
  const range = [];
  const left = Math.max(1, currentPage.value - delta);
  const right = Math.min(totalPages.value, currentPage.value + delta);
  for (let i = left; i <= right; i++) range.push(i);
  return range;
});

const setPage = (page) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

watch(filteredProducts, () => {
  if (currentPage.value > totalPages.value && totalPages.value > 0) {
    currentPage.value = totalPages.value;
  } else if (currentPage.value > totalPages.value && totalPages.value === 0) {
    currentPage.value = 1;
  } else if (currentPage.value === 1 && totalPages.value >= 1) {
    // если страница уже 1, ничего не делаем, но при изменении фильтров нужно сбросить
    currentPage.value = 1;
  } else {
    currentPage.value = 1;
  }
});

const availableSpecs = computed(() => {
  const specsMap = {};
  products.value.forEach(p => {
    const chars = p.characteristics || {};
    Object.entries(chars).forEach(([key, val]) => {
      if (val) {
        if (!specsMap[key]) specsMap[key] = new Set();
        specsMap[key].add(val.toString().trim());
      }
    });
  });
  return Object.keys(specsMap).map(key => ({ name: key, values: Array.from(specsMap[key]).sort() }));
});

const resetFilters = () => {
  filterPriceMin.value = null;
  filterPriceMax.value = null;
  filterOnlyInMyCity.value = false;
  Object.keys(activeSpecFilters).forEach(k => (activeSpecFilters[k] = []));
};

const handleAddToCart = p => cartStore.addToCart(p);

onMounted(loadData);
watch(
  () => route.params.id,
  () => {
    resetFilters();
    loadData();
  }
);
</script>

<style scoped>
/* ==========================================================================
   ЛОКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ
   ========================================================================== */
.category-products-page {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Хлебные крошки */
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 25px;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.breadcrumbs a {
  color: var(--primary);
  font-weight: 600;
}
.breadcrumbs a:hover {
  text-decoration: underline;
}
.separator {
  margin: 0 4px;
}
.current {
  font-weight: 700;
  color: var(--text-main);
}

h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 30px;
}

/* Каркас: Сайдбар + Контент */
.content-wrapper {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

/* САЙДБАР ФИЛЬТРОВ */
.filters-sidebar {
  width: 280px;
  flex-shrink: 0;
}
.filters-box {
  padding: 25px;
  position: sticky;
  top: 100px;
}
.filters-box h3 {
  margin-top: 0;
  font-size: 1.2rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 15px;
  margin-bottom: 20px;
  font-weight: 800;
}

.filter-group {
  margin-bottom: 25px;
}
.filter-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 700;
  margin-bottom: 10px;
}

.price-range-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.price-range-inputs input {
  width: 100%;
}
.price-separator {
  color: var(--text-muted);
  font-weight: bold;
}

/* Чекбоксы фильтров */
.custom-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  padding-left: 30px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  margin-bottom: 10px;
  user-select: none;
}
.custom-checkbox input {
  position: absolute;
  opacity: 0;
  height: 0;
  width: 0;
}
.checkmark {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  height: 20px;
  width: 20px;
  background-color: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  transition: 0.2s;
}
.custom-checkbox:hover input ~ .checkmark {
  border-color: var(--primary);
}
.custom-checkbox input:checked ~ .checkmark {
  background-color: var(--primary);
  border-color: var(--primary);
}
.checkmark:after {
  content: '';
  position: absolute;
  display: none;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.custom-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.spec-group {
  border-top: 1px solid var(--border-color);
  padding-top: 15px;
}
.spec-group b {
  display: block;
  margin-bottom: 10px;
  font-size: 0.95rem;
}

/* СПИСОК ТОВАРОВ */
.products-list-container {
  flex: 1;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 24px;
}
.found-count {
  color: var(--text-muted);
  font-size: 0.95rem;
}
.found-count b {
  color: var(--text-main);
  font-weight: 800;
}
.sort-select {
  padding: 8px 12px;
  max-width: 200px;
  cursor: pointer;
  font-weight: 600;
}

.products-list-vertical {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Строка товара */
.product-list-item {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  padding: 24px;
  gap: 24px;
}

/* Левая колонка: Картинка */
.item-image-col {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  padding: 10px;
}
:global(.dark) .item-image-col {
  background: #0f172a;
  border-color: #334155;
}
.item-image-col img {
  max-width: 100%;
  max-height: 180px;
  object-fit: contain;
}

.wishlist-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1.2rem;
  transition: 0.2s;
  box-shadow: var(--shadow-sm);
}
.wishlist-btn:hover,
.wishlist-btn.active {
  color: var(--danger);
  border-color: var(--danger);
  transform: scale(1.1);
}

/* Средняя колонка: Инфо */
.item-info-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
/* Увеличенные логотипы брендов */
.brand-logo-mini {
  height: 35px;
  max-width: 120px;
  object-fit: contain;
}
.brand-name-text {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
}

.product-link {
  font-size: 1.4rem;
  font-weight: 800;
  margin-bottom: 8px;
  transition: color 0.2s;
}
.product-link:hover {
  color: var(--primary);
}

.product-meta {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 12px;
  font-weight: 600;
  font-family: monospace;
}
.product-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin-bottom: 15px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 2; /* для совместимости */
}
:global(.dark) .product-desc {
  color: #cbd5e1;
}

.product-rating {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}
.stars-small {
  display: inline-flex;
}
.star-small {
  font-size: 1.1rem;
  color: #e2e8f0;
}
:global(.dark) .star-small {
  color: #334155;
}
.star-small.filled {
  color: #f59e0b;
}
.rating-value-small {
  font-weight: 800;
  font-size: 1rem;
  margin-left: 4px;
}
.rating-count {
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* Правая колонка: Цена, статус и кнопка */
.item-action-col {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: flex-end;
  border-left: 1px dashed var(--border-color);
  padding-left: 24px;
}

.price-container {
  text-align: right;
  margin-bottom: 15px;
}
.new-price,
.regular-price {
  font-size: 1.8rem;
  font-weight: 900;
  margin: 0;
  line-height: 1;
}
.new-price {
  color: var(--danger);
}
.old-price {
  color: var(--text-muted);
  text-decoration: line-through;
  font-size: 1rem;
  font-weight: 600;
  display: block;
  margin-bottom: 5px;
}

/* СТАТУС НАЛИЧИЯ – ПРИНУДИТЕЛЬНАЯ ВИДИМОСТЬ */
.stock-status {
  width: 100%;
  text-align: right;
  margin: 12px 0 16px;
}

.stock-status .badge {
  display: inline-block !important;
  visibility: visible !important;
  opacity: 1 !important;
  padding: 4px 12px !important;
  border-radius: 20px !important;
  font-size: 0.75rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.3px !important;
  line-height: 1.4 !important;
}

.stock-status .badge-danger {
  background: rgba(239, 68, 68, 0.15) !important;
  color: #ef4444 !important;
  border: 1px solid #ef4444 !important;
}

.stock-status .badge-success {
  background: rgba(16, 185, 129, 0.15) !important;
  color: #10b981 !important;
  border: 1px solid #10b981 !important;
}

.stock-status .badge-warning {
  background: rgba(245, 158, 11, 0.15) !important;
  color: #f59e0b !important;
  border: 1px solid #f59e0b !important;
}

/* ПАГИНАЦИЯ */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
  padding: 12px 20px;
  flex-wrap: wrap;
}
.page-numbers {
  display: flex;
  gap: 8px;
}
.page-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-main);
}
.page-btn:hover:not(:disabled) {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
.page-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ЗАГРУЗКА И ОШИБКИ */
.loading-state {
  text-align: center;
  padding: 100px 20px;
}

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) {
  .product-list-item {
    gap: 16px;
    padding: 16px;
  }
  .item-image-col {
    width: 180px;
  }
  .item-action-col {
    width: 180px;
    padding-left: 16px;
  }
}

@media (max-width: 900px) {
  .content-wrapper {
    flex-direction: column;
  }
  .filters-sidebar {
    width: 100%;
  }
  .filters-box {
    position: static;
    margin-bottom: 20px;
  }
}

@media (max-width: 600px) {
  .product-list-item {
    flex-direction: column;
  }
  .item-image-col {
    width: 100%;
    height: 200px;
  }
  .item-action-col {
    width: 100%;
    border-left: none;
    border-top: 1px dashed var(--border-color);
    padding-left: 0;
    padding-top: 20px;
    align-items: center;
    text-align: center;
  }
  .price-container {
    text-align: center;
  }
  .stock-status {
    text-align: center;
  }
  .list-header {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  .sort-select {
    max-width: 100%;
  }
  .pagination {
    flex-direction: column;
  }
}
</style>