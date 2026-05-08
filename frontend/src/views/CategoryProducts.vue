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
      <div class="loader"></div>
      <p>Загрузка товаров...</p>
    </div>

    <div v-else class="content-wrapper">
      
      <!-- БОКОВАЯ ПАНЕЛЬ ФИЛЬТРОВ -->
      <aside class="filters-sidebar">
        <div class="filters-box glass-card">
          <h3>Фильтры</h3>
          
          <!-- ФИЛЬТР ПО ЦЕНЕ: ОТ И ДО -->
          <div class="filter-group">
            <label>Цена (₽):</label>
            <div class="price-range-inputs">
              <div class="price-input-field">
                <input v-model.number="filterPriceMin" type="number" placeholder="От" />
              </div>
              <span class="price-separator">—</span>
              <div class="price-input-field">
                <input v-model.number="filterPriceMax" type="number" placeholder="До" />
              </div>
            </div>
          </div>

          <div class="filter-group checkbox-group">
            <label class="custom-checkbox">
              <input type="checkbox" v-model="filterOnlyInMyCity" /> 
              <span class="checkmark"></span>
              В наличии в г. {{ appStore.city }}
            </label>
          </div>

          <!-- Характеристики (Динамически из JSONB поля characteristics) -->
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
          
          <button @click="resetFilters" class="btn-reset">Сбросить всё</button>
        </div>
      </aside>

      <!-- СПИСОК ТОВАРОВ -->
      <main class="products-list">
        <div class="list-header glass-card">
          <span class="found-count">Найдено: <b>{{ filteredProducts.length }}</b></span>
          <select v-model="sortOrder" class="sort-select">
            <option value="cheap">Сначала дешевые</option>
            <option value="expensive">Сначала дорогие</option>
          </select>
        </div>

        <div v-if="filteredProducts.length > 0" class="products-grid">
          <div v-for="p in filteredProducts" :key="p.id" class="product-item glass-card">
            
            <div class="product-img-wrap">
               <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" :alt="p.name" loading="lazy" />
               <button 
                @click.stop="toggleWishlist(p.id)" 
                class="wishlist-btn" 
                :class="{ 'active': wishlistIds.includes(p.id) }"
                title="В избранное"
               >
                ❤
               </button>
            </div>
            
            <div class="product-info">
              <router-link :to="'/product/' + p.id" class="product-link">
                {{ p.name }}
              </router-link>
              <div class="product-meta">
                 <span>Артикул: {{ p.sku }}</span>
                 <span v-if="p.brands?.name"> | Бренд: {{ p.brands.name }}</span>
              </div>
              <p class="product-desc">{{ p.description }}</p>
              
              <div class="stock-status">
                <span v-if="getStockInCity(p) > 0" class="in-stock">✅ В наличии в г. {{ appStore.city }}</span>
                <span v-else class="out-stock">🚚 Доставка (Межгород)</span>
              </div>
            </div>

            <div class="product-actions">
              <div class="price-container">
                <div v-if="p.discount_price" class="price-box">
                  <s class="old-price">{{ p.price }} ₽</s>
                  <h2 class="new-price">{{ p.discount_price }} ₽</h2>
                </div>
                <h2 v-else class="regular-price">{{ p.price }} ₽</h2>
              </div>
              
              <button @click="handleAddToCart(p)" :disabled="getTotalStock(p) === 0" class="add-btn">
                {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-results glass-card">
          <div class="empty-icon">🔍</div>
          <h3>Товары не найдены</h3>
          <p>Попробуйте изменить параметры фильтрации или выбрать другой город.</p>
          <button @click="resetFilters" class="btn-link">Сбросить фильтры</button>
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

// ПЕРЕМЕННЫЕ ФИЛЬТРАЦИИ
const filterPriceMin = ref(null);
const filterPriceMax = ref(null);
const filterOnlyInMyCity = ref(false);
const sortOrder = ref('cheap');
const activeSpecFilters = reactive({});

const loadData = async () => {
  loading.value = true;
  const categoryId = route.params.id; 
  const uid = localStorage.getItem('user_id');

  try {
    const [pRes, cRes] = await Promise.all([
      axios.get(`${import.meta.env.VITE_API_URL || ''}/api/products?category_id=${categoryId}`), 
      axios.get(`${import.meta.env.VITE_API_URL || ''}/api/categories`)
    ]);
    
    products.value = pRes.data;
    allCategories.value = Array.isArray(cRes.data) ? cRes.data : [];

    if (uid) {
      const wRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${uid}`);
      wishlistIds.value = wRes.data.map(i => i.product_id);
    }

    // Инициализация реактивного объекта фильтров на основе доступных характеристик
    availableSpecs.value.forEach(s => {
      if (!activeSpecFilters[s.name]) activeSpecFilters[s.name] = [];
    });

  } catch (e) { 
    console.error("Ошибка загрузки товаров:", e); 
  } finally { 
    loading.value = false; 
  }
};

const toggleWishlist = async (id) => {
    const uid = localStorage.getItem('user_id');
    if (!uid) {
      alert("Пожалуйста, войдите в аккаунт, чтобы добавить товар в избранное.");
      return;
    }
    try {
        if (wishlistIds.value.includes(id)) {
            await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${uid}/${id}`);
            wishlistIds.value = wishlistIds.value.filter(i => i !== id);
        } else {
            await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/wishlist`, { user_id: uid, product_id: id });
            wishlistIds.value.push(id);
        }
        window.dispatchEvent(new Event('wishlist-updated'));
    } catch (e) { console.error("Ошибка избранного:", e); }
};

const currentCategory = computed(() => {
    return allCategories.value.find(c => Number(c.id) === Number(route.params.id));
});

const breadcrumbs = computed(() => {
  const crumbs = [];
  let parentId = currentCategory.value?.parent_id;
  while (parentId) {
    const cat = allCategories.value.find(c => Number(c.id) === Number(parentId));
    if (cat) {
      crumbs.unshift(cat);
      parentId = cat.parent_id;
    } else break;
  }
  return crumbs;
});

// Проверка наличия в выбранном городе по новой структуре БД
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

const getTotalStock = (p) => {
  return p.product_stocks?.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0) || 0;
};

// ==========================================
// ЛОГИКА ФИЛЬТРАЦИИ И СОРТИРОВКИ
// ==========================================
const filteredProducts = computed(() => {
  let res = [...products.value];

  // 1. По наличию в городе
  if (filterOnlyInMyCity.value) {
    res = res.filter(p => getStockInCity(p) > 0);
  }
  
  // 2. По цене ОТ
  if (filterPriceMin.value !== null && filterPriceMin.value !== '') {
    res = res.filter(p => (p.discount_price || p.price) >= filterPriceMin.value);
  }

  // 3. По цене ДО
  if (filterPriceMax.value !== null && filterPriceMax.value !== '') {
    res = res.filter(p => (p.discount_price || p.price) <= filterPriceMax.value);
  }

  // 4. По характеристикам (JSONB)
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

  // 5. Сортировка
  res.sort((a, b) => {
    const p1 = a.discount_price || a.price; 
    const p2 = b.discount_price || b.price;
    return sortOrder.value === 'cheap' ? p1 - p2 : p2 - p1;
  });

  return res;
});

// Извлечение всех уникальных характеристик из JSONB для сайдбара
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
  
  return Object.keys(specsMap).map(key => ({ 
    name: key, 
    values: Array.from(specsMap[key]).sort() 
  }));
});

const resetFilters = () => {
    filterPriceMin.value = null;
    filterPriceMax.value = null;
    filterOnlyInMyCity.value = false;
    Object.keys(activeSpecFilters).forEach(k => activeSpecFilters[k] = []);
};

const handleAddToCart = (p) => {
    // В CartStore.js теперь адаптивная логика, передаем товар целиком
    cartStore.addToCart(p);
};

onMounted(loadData);
watch(() => route.params.id, () => {
  resetFilters();
  loadData();
});
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
.category-products-page {
  padding: 40px 20px;
  max-width: 1300px;
  margin: 0 auto;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}
:global(.dark) .glass-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

/* ХЛЕБНЫЕ КРОШКИ */
.breadcrumbs {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  margin-bottom: 25px; font-size: 0.9rem; color: var(--text-muted, #64748b);
}
.breadcrumbs a { color: var(--primary, #2563eb); text-decoration: none; font-weight: 600; transition: color 0.2s; }
.breadcrumbs a:hover { color: var(--primary-hover, #1d4ed8); text-decoration: underline; }
:global(.dark) .breadcrumbs a { color: #60a5fa; }
.separator { color: var(--border-color, #cbd5e1); margin: 0 4px; }
:global(.dark) .separator { color: #475569; }
.current { color: var(--text-main, #0f172a); font-weight: 700; }
:global(.dark) .current { color: #f8fafc; }

h1 { font-size: 2.2rem; font-weight: 900; color: var(--text-main, #0f172a); margin-bottom: 30px; }
:global(.dark) h1 { color: #f8fafc; }

/* СОСТОЯНИЕ ЗАГРУЗКИ */
.loading-state { text-align: center; padding: 80px 20px; color: var(--text-muted, #64748b); font-weight: 600; }
.loader {
  border: 4px solid var(--border-color, #e2e8f0); border-top: 4px solid var(--primary, #2563eb);
  border-radius: 50%; width: 48px; height: 48px; animation: spin 1s infinite; margin: 0 auto 20px;
}
:global(.dark) .loader { border-color: #334155; border-top-color: #3b82f6; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* МАКЕТ ПАНЕЛЕЙ */
.content-wrapper { display: flex; gap: 30px; align-items: flex-start; }

/* САЙДБАР ФИЛЬТРОВ */
.filters-sidebar { width: 280px; flex-shrink: 0; }
.filters-box { padding: 25px; position: sticky; top: 100px; }
.filters-box h3 { margin-top: 0; font-size: 1.2rem; border-bottom: 1px solid var(--border-color, #e2e8f0); padding-bottom: 15px; margin-bottom: 20px; color: var(--text-main, #0f172a); font-weight: 800; }
:global(.dark) .filters-box h3 { color: #f8fafc; border-color: #334155; }

.filter-group { margin-bottom: 25px; }
.filter-group label { display: block; font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; color: var(--text-main, #0f172a); }
:global(.dark) .filter-group label { color: #f8fafc; }

/* ЦЕНА ОТ И ДО */
.price-range-inputs { display: flex; align-items: center; gap: 8px; }
.price-input-field { flex: 1; }
.price-input-field input {
  width: 100%; padding: 10px; border: 1px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-sm, 8px); background: rgba(0,0,0,0.02);
  font-size: 0.9rem; outline: none; transition: all 0.2s; color: var(--text-main, #0f172a);
}
:global(.dark) .price-input-field input { background: rgba(255,255,255,0.05); border-color: #475569; color: #f8fafc; }
.price-input-field input:focus { border-color: var(--primary, #2563eb); background: transparent; }
.price-separator { color: var(--text-muted, #64748b); font-weight: bold; }

/* ЧЕКБОКСЫ */
.custom-checkbox { position: relative; display: flex; align-items: center; padding-left: 30px; cursor: pointer; font-size: 0.9rem; margin-bottom: 10px; font-weight: 500 !important; color: var(--text-main, #0f172a) !important;}
:global(.dark) .custom-checkbox { color: #e2e8f0 !important; }
.custom-checkbox input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
.checkmark { position: absolute; top: 50%; left: 0; transform: translateY(-50%); height: 20px; width: 20px; background-color: rgba(0,0,0,0.05); border: 2px solid var(--border-color, #cbd5e1); border-radius: 4px; transition: all 0.2s; }
:global(.dark) .checkmark { background-color: rgba(255,255,255,0.05); border-color: #475569; }
.custom-checkbox input:checked ~ .checkmark { background-color: var(--primary, #2563eb); border-color: var(--primary, #2563eb); }
.checkmark:after { content: ""; position: absolute; display: none; left: 5px; top: 1px; width: 5px; height: 10px; border: solid white; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.custom-checkbox input:checked ~ .checkmark:after { display: block; }

.spec-group { border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 15px; }
:global(.dark) .spec-group { border-color: #334155; }
.spec-group b { display: block; margin-bottom: 10px; font-size: 0.95rem; color: var(--text-main, #0f172a); }
:global(.dark) .spec-group b { color: #f8fafc; }

.btn-reset {
  width: 100%; padding: 12px; background: rgba(0,0,0,0.05); border: none;
  border-radius: var(--radius-sm, 8px); font-weight: 700; color: var(--text-muted, #64748b); cursor: pointer; transition: all 0.2s;
}
:global(.dark) .btn-reset { background: rgba(255,255,255,0.05); color: #94a3b8; }
.btn-reset:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }

/* СПИСОК ТОВАРОВ */
.products-list { flex: 1; }

.list-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 15px 20px;
}
.found-count { color: var(--text-muted, #64748b); font-size: 0.95rem; }
.found-count b { color: var(--text-main, #0f172a); }
:global(.dark) .found-count b { color: #f8fafc; }

.sort-select {
  padding: 8px 12px; border-radius: var(--radius-sm, 8px); border: 1px solid var(--border-color, #cbd5e1);
  background: transparent; color: var(--text-main, #0f172a); cursor: pointer; font-weight: 600; outline: none;
}
:global(.dark) .sort-select { border-color: #475569; color: #f8fafc; background: #1e293b; }

/* Карточка товара */
.product-item {
  display: flex; gap: 20px; padding: 20px; margin-bottom: 20px; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.product-item:hover { transform: translateY(-3px); box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1); border-color: var(--primary, #2563eb); }
:global(.dark) .product-item:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5); }

.product-img-wrap {
  width: 160px; height: 160px; flex-shrink: 0; background: #fff;
  border-radius: var(--radius-sm, 8px); border: 1px solid var(--border-color, #e2e8f0);
  display: flex; align-items: center; justify-content: center; position: relative; padding: 10px;
}
:global(.dark) .product-img-wrap { border-color: #334155; }
.product-img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }

.wishlist-btn {
  position: absolute; top: 8px; right: 8px; background: #fff; border: 1px solid #e2e8f0;
  border-radius: 50%; width: 32px; height: 32px; cursor: pointer; color: #cbd5e1; font-size: 1.1rem;
  display: flex; align-items: center; justify-content: center; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.wishlist-btn:hover { transform: scale(1.1); color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }
.wishlist-btn.active { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }

.product-info { flex: 1; display: flex; flex-direction: column; }
.product-link { font-size: 1.25rem; font-weight: 800; color: var(--text-main, #0f172a); text-decoration: none; margin-bottom: 8px; transition: color 0.2s; }
:global(.dark) .product-link { color: #f8fafc; }
.product-link:hover { color: var(--primary, #2563eb); }

.product-meta { font-size: 0.85rem; color: var(--text-muted, #64748b); margin-bottom: 12px; font-weight: 600;}
.product-desc { font-size: 0.95rem; color: var(--text-muted, #64748b); margin-bottom: 15px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.5; }

.stock-status { margin-top: auto; }
.in-stock { color: var(--success, #10b981); font-weight: 700; font-size: 0.9rem; background: rgba(16, 185, 129, 0.1); padding: 4px 10px; border-radius: 20px; }
.out-stock { color: var(--warning, #f59e0b); font-weight: 700; font-size: 0.9rem; background: rgba(245, 158, 11, 0.1); padding: 4px 10px; border-radius: 20px; }

.product-actions { width: 180px; text-align: right; display: flex; flex-direction: column; justify-content: space-between; }
.price-container { margin-bottom: 15px; }
.new-price { color: var(--danger, #ef4444); font-size: 1.6rem; font-weight: 900; margin: 0; }
.old-price { color: var(--text-muted, #64748b); text-decoration: line-through; font-size: 0.95rem; font-weight: 600; display: block; margin-bottom: 4px; }
.regular-price { font-size: 1.6rem; color: var(--text-main, #0f172a); font-weight: 900; margin: 0; }
:global(.dark) .regular-price { color: #f8fafc; }

.add-btn {
  width: 100%; padding: 14px; background: var(--primary, #2563eb); color: white; border: none; border-radius: var(--radius-sm, 8px);
  font-weight: 700; cursor: pointer; transition: all 0.3s; font-size: 1rem;
}
.add-btn:hover:not(:disabled) { background: var(--primary-hover, #1d4ed8); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.add-btn:disabled { background: rgba(0,0,0,0.05); color: var(--text-muted, #64748b); cursor: not-allowed; }
:global(.dark) .add-btn:disabled { background: rgba(255,255,255,0.05); }

.empty-results { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 3.5rem; margin-bottom: 15px; opacity: 0.7; }
.empty-results h3 { color: var(--text-main, #0f172a); font-size: 1.5rem; margin-bottom: 10px; }
:global(.dark) .empty-results h3 { color: #f8fafc; }
.empty-results p { color: var(--text-muted, #64748b); margin-bottom: 20px; }
.btn-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 700; text-decoration: underline; cursor: pointer; font-size: 1rem; }

/* АДАПТИВНОСТЬ */
@media (max-width: 950px) {
  .content-wrapper { flex-direction: column; }
  .filters-sidebar { width: 100%; }
  .filters-box { position: static; }
}

@media (max-width: 600px) {
  .product-item { flex-direction: column; align-items: center; text-align: center; position: relative; }
  .wishlist-btn { top: 15px; right: 15px; width: 40px; height: 40px; font-size: 1.3rem; }
  .product-actions { width: 100%; text-align: center; align-items: center; margin-top: 15px; }
  .price-container { margin-bottom: 20px; }
  .stock-status { margin-top: 15px; }
}
</style>