<template>
  <div class="catalog-page">
    
    <!-- ХЛЕБНЫЕ КРОШКИ -->
    <nav class="breadcrumbs">
      <router-link to="/catalog">Каталог</router-link>
      <span v-for="crumb in breadcrumbs" :key="crumb.id" class="crumb-item">
        <span class="separator">/</span>
        <router-link :to="'/catalog/' + crumb.id">{{ crumb.name }}</router-link>
      </span>
    </nav>

    <div class="header-row">
      <h1>{{ currentCategoryName }}</h1>
      <div class="cat-count">Найдено разделов: {{ visibleCategories.length }}</div>
    </div>
    
    <hr class="divider" />

    <!-- СОСТОЯНИЕ ЗАГРУЗКИ -->
    <div v-if="loading" class="loading-state">
      <div class="loader"></div>
      <p>Синхронизация с базой данных...</p>
    </div>

    <!-- СПИСОК КАРТОЧЕК -->
    <div v-else-if="visibleCategories.length > 0">
      
      <div class="categories-grid">
        <div v-for="cat in paginatedCategories" :key="cat.id" @click="goToCategory(cat)" class="category-card glass-card">
          
          <div class="card-header">
            <h3>{{ cat.name }}</h3>
            <!-- Фото показываем только для главных категорий, для подкатегорий убираем согласно инструкции -->
            <img v-if="!currentParentId" :src="cat.image_url || '/assets/images/no-cat.png'" :alt="cat.name" class="cat-icon" />
          </div>
          
          <div class="card-body">
            <!-- ВАРИАНТ 1: Мы на главной каталога -> Показываем подкатегории текстом -->
            <ul v-if="!currentParentId" class="items-list">
              <li class="list-label">Подкатегории:</li>
              <li v-for="child in getChildCategories(cat.id).slice(0, 5)" :key="child.id">
                {{ child.name }}
              </li>
              <li v-if="getChildCategories(cat.id).length > 5" class="more-link">
                еще {{ getChildCategories(cat.id).length - 5 }} разделов...
              </li>
              <li v-if="getChildCategories(cat.id).length === 0" class="muted">Нет подкатегорий</li>
            </ul>

            <!-- ВАРИАНТ 2: Мы внутри категории -> Показываем ТОВАРЫ этой подкатегории -->
            <ul v-else class="items-list products-theme">
              <li class="list-label">Товары в наличии:</li>
              <li v-for="prod in getProductsForCategory(cat.id).slice(0, 6)" :key="prod.id" class="product-li">
                {{ prod.name }}
              </li>
              <li v-if="getProductsForCategory(cat.id).length > 6" class="more-link">
                Смотреть все товары ({{ getProductsForCategory(cat.id).length }})
              </li>
              <li v-if="getProductsForCategory(cat.id).length === 0" class="muted">В этом разделе пока нет товаров</li>
            </ul>
          </div>

          <div class="card-footer-action">
             <span>{{ currentParentId ? 'Перейти к товарам' : 'Открыть раздел' }}</span>
             <span class="arrow">→</span>
          </div>
        </div>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination-controls">
        <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn glass-card">←</button>
        <div class="page-numbers glass-card">
          <span class="current-page">{{ currentPage }}</span> / <span>{{ totalPages }}</span>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn glass-card">→</button>
      </div>

    </div>

    <!-- ПУСТОЕ СОСТОЯНИЕ -->
    <div v-else class="empty-state glass-card">
      <div class="empty-icon">📂</div>
      <h3>В этом разделе пока ничего нет</h3>
      <p>Попробуйте вернуться в основной каталог или воспользуйтесь поиском.</p>
      <button @click="$router.push('/catalog')" class="btn-back">В начало каталога</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();
const allCategories = ref([]);
const allProducts = ref([]); // Добавили массив товаров
const loading = ref(true);

const currentPage = ref(1);
const itemsPerPage = 9;

// Загрузка данных
const loadData = async () => {
  loading.value = true;
  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const [cRes, pRes] = await Promise.all([
      axios.get(`${API_URL}/api/categories`),
      axios.get(`${API_URL}/api/products`)
    ]);
    allCategories.value = cRes.data;
    allProducts.value = pRes.data;
  } catch (e) {
    console.error("Ошибка загрузки данных каталога", e);
  } finally {
    loading.value = false;
  }
};

const currentParentId = computed(() => route.params.id ? Number(route.params.id) : null);

const currentCategoryName = computed(() => {
  if (!currentParentId.value) return 'Каталог запчастей';
  const cat = allCategories.value.find(c => Number(c.id) === currentParentId.value);
  return cat ? cat.name : 'Раздел каталога';
});

// Получение детей категории
const getChildCategories = (parentId) => {
  return allCategories.value.filter(c => c.parent_id === parentId);
};

// Получение товаров конкретной категории
const getProductsForCategory = (catId) => {
  return allProducts.value.filter(p => p.category_id === catId);
};

const visibleCategories = computed(() => getChildCategories(currentParentId.value));

const totalPages = computed(() => Math.ceil(visibleCategories.value.length / itemsPerPage));
const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return visibleCategories.value.slice(start, start + itemsPerPage);
});

// Навигация
const goToCategory = (cat) => {
  const children = getChildCategories(cat.id);
  if (children.length > 0) {
    router.push(`/catalog/${cat.id}`);
  } else {
    // Если это конечная подкатегория — ведем на страницу товаров
    router.push(`/category/${cat.id}`);
  }
};

const breadcrumbs = computed(() => {
  const crumbs = [];
  let currentId = currentParentId.value;
  while (currentId) {
    const cat = allCategories.value.find(c => Number(c.id) === currentId);
    if (cat) {
      crumbs.unshift(cat);
      currentId = cat.parent_id;
    } else break;
  }
  return crumbs;
});

watch(() => route.params.id, () => {
  currentPage.value = 1;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   СТИЛИ КАТАЛОГА (СВЕТЛАЯ/ТЕМНАЯ ТЕМА + GLASS)
   ========================================================================== */
.catalog-page { padding: 40px 20px 100px; max-width: 1250px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

/* ХЛЕБНЫЕ КРОШКИ */
.breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 25px; font-size: 0.9rem; }
.breadcrumbs a { color: var(--primary, #2563eb); text-decoration: none; font-weight: 600; }
.breadcrumbs a:hover { text-decoration: underline; }
:global(.dark) .breadcrumbs a { color: #60a5fa; }
.separator { color: var(--text-muted); margin: 0 4px; }

/* ЗАГОЛОВОК */
.header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
h1 { font-size: 2.2rem; font-weight: 900; color: var(--text-main, #0f172a); }
:global(.dark) h1 { color: #f8fafc; }
.cat-count { font-size: 0.9rem; color: var(--text-muted); font-weight: 700; background: rgba(0,0,0,0.05); padding: 5px 15px; border-radius: 20px; }
:global(.dark) .cat-count { background: rgba(255,255,255,0.05); }

.divider { border: none; border-top: 1px solid var(--border-color, #e2e8f0); margin-bottom: 40px; }
:global(.dark) .divider { border-color: #334155; }

/* СЕТКА */
.categories-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 30px; }

.category-card {
  padding: 30px; cursor: pointer; display: flex; flex-direction: column;
  height: 100%; position: relative; overflow: hidden; min-height: 280px;
}
.category-card:hover { transform: translateY(-8px); border-color: var(--primary, #2563eb); box-shadow: 0 20px 40px -10px rgba(37, 99, 235, 0.15); }

.card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.category-card h3 { font-size: 1.4rem; color: var(--text-main, #0f172a); font-weight: 800; margin: 0; line-height: 1.2; }
:global(.dark) .category-card h3 { color: #f8fafc; }

.cat-icon { width: 60px; height: 60px; object-fit: contain; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1)); }

/* СПИСКИ (ПОДКАТЕГОРИИ И ТОВАРЫ) */
.items-list { list-style: none; padding: 0; margin: 0; flex: 1; }
.list-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; letter-spacing: 1px; }

.items-list li:not(.list-label) {
  font-size: 0.95rem; color: var(--text-muted, #64748b); margin-bottom: 8px;
  padding-left: 15px; position: relative; transition: color 0.2s;
}
:global(.dark) .items-list li:not(.list-label) { color: #94a3b8; }
.items-list li:not(.list-label)::before { content: '•'; position: absolute; left: 0; color: var(--primary, #2563eb); font-weight: 900; }

/* Стиль списка товаров (более жирный) */
.products-theme li:not(.list-label) { color: var(--text-main, #0f172a); font-weight: 600; }
:global(.dark) .products-theme li:not(.list-label) { color: #e2e8f0; }

.more-link { color: var(--primary, #2563eb) !important; font-style: italic; font-weight: 700 !important; margin-top: 10px; }
.muted { color: var(--text-muted); font-style: italic; font-size: 0.9rem; }

/* ФУТЕР КАРТОЧКИ */
.card-footer-action {
  margin-top: 25px; padding-top: 15px; border-top: 1px solid var(--border-color, #e2e8f0);
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 800; font-size: 0.85rem; color: var(--primary, #2563eb); text-transform: uppercase;
}
:global(.dark) .card-footer-action { border-color: #334155; }
.arrow { transition: transform 0.3s; }
.category-card:hover .arrow { transform: translateX(5px); }

/* ПАГИНАЦИЯ */
.pagination-controls { display: flex; justify-content: center; align-items: center; gap: 20px; margin-top: 60px; }
.page-btn { padding: 12px 25px; font-weight: 800; cursor: pointer; color: var(--text-main); border: none; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-numbers { padding: 12px 25px; font-weight: 800; color: var(--text-muted); }
.current-page { color: var(--primary, #2563eb); font-size: 1.2rem; }

/* LOADING */
.loading-state { text-align: center; padding: 100px; color: var(--text-muted); font-weight: 700; }
.loader { border: 4px solid var(--border-color, #e2e8f0); border-top: 4px solid var(--primary, #2563eb); border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 0 auto 20px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* EMPTY */
.empty-state { text-align: center; padding: 80px; }
.empty-icon { font-size: 4rem; margin-bottom: 20px; opacity: 0.5; }
.btn-back { background: var(--primary, #2563eb); color: white; border: none; padding: 15px 35px; border-radius: 40px; font-weight: 800; cursor: pointer; margin-top: 25px; }

@media (max-width: 768px) {
  .categories-grid { grid-template-columns: 1fr; }
  .category-card { min-height: auto; }
}
</style>