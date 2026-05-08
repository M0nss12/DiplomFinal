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
      <div class="cat-count">Всего разделов: {{ visibleCategories.length }}</div>
    </div>
    
    <hr class="divider" />

    <!-- СОСТОЯНИЕ ЗАГРУЗКИ -->
    <div v-if="loading" class="loading-state">
      <div class="loader"></div>
      <p>Загрузка категорий...</p>
    </div>

    <!-- СПИСОК КАТЕГОРИЙ -->
    <div v-else-if="visibleCategories.length > 0">
      
      <div class="categories-grid">
        <div v-for="cat in paginatedCategories" :key="cat.id" @click="goToCategory(cat)" class="category-card glass-card">
          
          <div class="card-header">
            <h3>{{ cat.name }}</h3>
            <img :src="cat.image_url || '/assets/images/no-cat.png'" :alt="cat.name" loading="lazy" />
          </div>
          
          <div class="card-body">
            <ul class="subcategories-list">
              <li v-for="child in getChildCategories(cat.id).slice(0, 4)" :key="child.id">
                {{ child.name }}
              </li>
              <li v-if="getChildCategories(cat.id).length > 4" class="more-link">
                и еще {{ getChildCategories(cat.id).length - 4 }}...
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination-controls">
        <button @click="currentPage--" :disabled="currentPage === 1" class="page-btn prev">← Назад</button>
        
        <div class="page-numbers glass-card">
          <span class="current-page">{{ currentPage }}</span> / <span class="total-pages">{{ totalPages }}</span>
        </div>

        <button @click="currentPage++" :disabled="currentPage === totalPages" class="page-btn next">Вперед →</button>
      </div>

    </div>

    <!-- ПУСТОЕ СОСТОЯНИЕ -->
    <div v-else class="empty-state glass-card">
      <div class="empty-icon">📂</div>
      <h3>В этой категории пока пусто</h3>
      <p>Попробуйте выбрать другой раздел или вернитесь назад.</p>
      <button @click="$router.push('/catalog')" class="btn-back">Вернуться в начало</button>
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
const loading = ref(true);

// Пагинация
const currentPage = ref(1);
const itemsPerPage = 9;

// Загрузка категорий с сервера
const loadCategories = async () => {
  loading.value = true;
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/categories`);
    allCategories.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error("Ошибка загрузки категорий", e);
  } finally {
    loading.value = false;
  }
};

const currentParentId = computed(() => route.params.id ? Number(route.params.id) : null);

const currentCategoryName = computed(() => {
  if (!currentParentId.value) return 'Каталог запчастей';
  const cat = allCategories.value.find(c => Number(c.id) === currentParentId.value);
  return cat ? cat.name : 'Каталог';
});

const getChildCategories = (parentId) => {
  return allCategories.value.filter(c => {
    const pId = c.parent_id ? Number(c.parent_id) : null;
    return pId === parentId;
  });
};

const visibleCategories = computed(() => getChildCategories(currentParentId.value));

// Логика пагинации
const totalPages = computed(() => Math.ceil(visibleCategories.value.length / itemsPerPage));

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return visibleCategories.value.slice(start, end);
});

// Сброс страницы при переходе в другую категорию
watch(() => route.params.id, () => {
  currentPage.value = 1;
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Навигация
const goToCategory = (cat) => {
  const children = getChildCategories(cat.id);
  if (children.length > 0) {
    // Если есть вложенные категории, открываем их
    router.push(`/catalog/${cat.id}`);
  } else {
    // Если вложенных нет, идем к списку товаров категории
    router.push(`/category/${cat.id}`);
  }
};

// Хлебные крошки
const breadcrumbs = computed(() => {
  const crumbs = [];
  let currentId = currentParentId.value;
  while (currentId) {
    const cat = allCategories.value.find(c => Number(c.id) === currentId);
    if (cat) {
      crumbs.unshift(cat);
      currentId = cat.parent_id ? Number(cat.parent_id) : null;
    } else break;
  }
  return crumbs;
});

onMounted(loadCategories);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
.catalog-page {
  padding: 40px 20px 80px 20px;
  max-width: 1200px;
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
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 25px;
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
}

.breadcrumbs a {
  color: var(--primary, #2563eb);
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.breadcrumbs a:hover {
  color: var(--primary-hover, #1d4ed8);
  text-decoration: underline;
}
:global(.dark) .breadcrumbs a { color: #60a5fa; }
:global(.dark) .breadcrumbs a:hover { color: #93c5fd; }

.separator {
  color: var(--border-color, #cbd5e1);
  margin: 0 4px;
}
:global(.dark) .separator { color: #475569; }

/* ЗАГОЛОВОК И СЧЕТЧИК */
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 15px;
}

h1 {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--text-main, #0f172a);
  margin: 0;
}
:global(.dark) h1 { color: #f8fafc; }

.cat-count {
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  font-weight: 600;
  background: rgba(0,0,0,0.05);
  padding: 4px 10px;
  border-radius: 20px;
}
:global(.dark) .cat-count { background: rgba(255,255,255,0.05); color: #94a3b8; }

.divider {
  border: none;
  border-top: 1px solid var(--border-color, #e2e8f0);
  margin-bottom: 40px;
}
:global(.dark) .divider { border-color: #334155; }

/* СЕТКА КАТЕГОРИЙ */
.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 25px;
  margin-bottom: 40px;
}

.category-card {
  padding: 25px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.category-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1);
  border-color: var(--primary, #2563eb);
}
:global(.dark) .category-card:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.category-card h3 {
  font-size: 1.25rem;
  color: var(--text-main, #0f172a);
  font-weight: 800;
  margin: 0;
  line-height: 1.3;
}
:global(.dark) .category-card h3 { color: #f8fafc; }

.category-card img {
  width: 70px;
  height: 70px;
  object-fit: contain;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  opacity: 0.9;
  margin-left: 10px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}
:global(.dark) .category-card img { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5)); }

.category-card:hover img {
  transform: scale(1.15) rotate(5deg);
  opacity: 1;
}

/* СПИСОК ПОДКАТЕГОРИЙ */
.subcategories-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.subcategories-list li {
  font-size: 0.9rem;
  color: var(--text-muted, #64748b);
  margin-bottom: 6px;
  padding-left: 12px;
  position: relative;
  transition: color 0.2s;
  font-weight: 500;
}
:global(.dark) .subcategories-list li { color: #94a3b8; }

.subcategories-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--border-color, #cbd5e1); 
  font-weight: bold;
}
:global(.dark) .subcategories-list li::before { color: #475569; }

.category-card:hover .subcategories-list li { color: var(--text-main, #0f172a); }
:global(.dark) .category-card:hover .subcategories-list li { color: #e2e8f0; }

.category-card:hover .subcategories-list li::before { color: var(--primary, #2563eb); }

.more-link {
  color: var(--primary, #2563eb) !important;
  font-style: italic;
  font-size: 0.85rem !important;
  margin-top: 8px;
}
:global(.dark) .more-link { color: #60a5fa !important; }

/* ПАГИНАЦИЯ */
.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 50px;
}

.page-btn {
  padding: 10px 20px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--border-color, #cbd5e1);
  background: var(--bg-card, #fff);
  color: var(--text-main, #0f172a);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
:global(.dark) .page-btn { background: #1e293b; border-color: #334155; color: #f8fafc; }

.page-btn:hover:not(:disabled) {
  background: var(--primary, #2563eb);
  color: white;
  border-color: var(--primary, #2563eb);
}
:global(.dark) .page-btn:hover:not(:disabled) { background: #3b82f6; border-color: #3b82f6; }

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0,0,0,0.05);
}
:global(.dark) .page-btn:disabled { background: rgba(255,255,255,0.05); }

.page-numbers {
  padding: 10px 20px;
  font-size: 1rem;
  color: var(--text-muted, #64748b);
  font-weight: 600;
}
:global(.dark) .page-numbers { color: #94a3b8; }

.current-page {
  color: var(--primary, #2563eb);
  font-weight: 800;
}
:global(.dark) .current-page { color: #60a5fa; }

/* СОСТОЯНИЯ ЗАГРУЗКИ И ПУСТОТЫ */
.loading-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-muted, #64748b);
  font-weight: 600;
}

.loader {
  border: 4px solid var(--border-color, #e2e8f0);
  border-top: 4px solid var(--primary, #2563eb);
  border-radius: 50%;
  width: 48px;
  height: 48px;
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  margin: 0 auto 20px;
}
:global(.dark) .loader { border-color: #334155; border-top-color: #3b82f6; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-muted, #64748b);
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 20px;
  opacity: 0.8;
}

.empty-state h3 { color: var(--text-main, #0f172a); margin-bottom: 10px; font-size: 1.5rem; }
:global(.dark) .empty-state h3 { color: #f8fafc; }

.btn-back {
  background: var(--primary, #2563eb);
  color: #fff;
  padding: 12px 28px;
  border-radius: 40px;
  margin-top: 25px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-back:hover {
  background: var(--primary-hover, #1d4ed8);
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(37, 99, 235, 0.3);
}

/* АДАПТИВНОСТЬ */
@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: 1fr;
    gap: 15px;
  }

  .category-card {
    flex-direction: row;
    align-items: center;
    padding: 15px 20px;
    height: auto;
  }

  .card-header {
    flex: 1;
    margin-bottom: 0;
    align-items: center;
  }
  
  .card-header h3 {
    font-size: 1.1rem;
    margin-right: 10px;
  }

  .category-card img {
    width: 50px;
    height: 50px;
    order: 2;
  }

  .card-body {
    display: none; /* Скрываем список подкатегорий на мобиле для компактности */
  }
  
  .header-row { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>