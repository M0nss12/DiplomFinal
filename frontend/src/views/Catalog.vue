<template>
  <div class="catalog-page animate-fade-in">
    <!-- ХЛЕБНЫЕ КРОШКИ -->
    <nav class="breadcrumbs flex flex-wrap items-center gap-1 mb-2 text-sm">
      <router-link to="/catalog" class="text-primary font-bold">Каталог</router-link>
      <template v-for="crumb in breadcrumbs" :key="crumb.id">
        <span class="text-muted mx-1">/</span>
        <router-link :to="'/catalog/' + crumb.id" class="text-primary font-bold">{{ crumb.name }}</router-link>
      </template>
    </nav>

    <div class="header-row flex justify-between items-center mb-3">
      <h1 class="text-main">{{ currentCategoryName }}</h1>
      <span class="cat-count text-muted font-bold">{{ visibleCategories.length }} разделов</span>
    </div>

    <hr class="divider" />

    <!-- ЗАГРУЗКА -->
    <div v-if="loading" class="loading-state text-center py-20">
      <span class="spinner" style="width: 50px; height: 50px; border-width: 4px;"></span>
      <p class="text-muted mt-3 font-bold">Синхронизация с базой данных...</p>
    </div>

    <!-- СПИСОК РАЗДЕЛОВ -->
    <div v-else-if="visibleCategories.length > 0">
      <div class="categories-grid">
        <div
          v-for="cat in paginatedCategories"
          :key="cat.id"
          class="category-card glass-card"
        >
          <div class="card-header flex justify-between items-start mb-4">
            <h3 class="text-main font-extrabold m-0" @click="goToCategory(cat)">{{ cat.name }}</h3>
            <img
              v-if="!currentParentId"
              :src="cat.image_url || '/assets/images/no-cat.png'"
              :alt="cat.name"
              class="cat-icon"
            />
          </div>

          <div class="card-body">
            <!-- ПОДКАТЕГОРИИ -->
            <ul v-if="!currentParentId" class="items-list">
              <li class="list-label text-uppercase text-muted mb-2">Подкатегории:</li>
              <li v-for="child in getChildCategories(cat.id).slice(0, 5)" :key="child.id" class="text-muted mb-1">
                {{ child.name }}
              </li>
              <li v-if="getChildCategories(cat.id).length > 5" class="more-link text-primary font-bold italic mt-2">
                еще {{ getChildCategories(cat.id).length - 5 }} разделов...
              </li>
              <li v-if="getChildCategories(cat.id).length === 0" class="text-muted italic">Нет подкатегорий</li>
            </ul>

            <!-- ТОВАРЫ В РАЗДЕЛЕ -->
            <ul v-else class="items-list products-theme">
              <li class="list-label text-uppercase text-muted mb-2">Товары в наличии:</li>
              <li v-for="prod in getProductsForCategory(cat.id).slice(0, 6)" :key="prod.id" class="font-semibold mb-1">
                {{ prod.name }}
              </li>
              <li v-if="getProductsForCategory(cat.id).length > 6" class="more-link text-primary font-bold italic mt-2">
                Смотреть все товары ({{ getProductsForCategory(cat.id).length }})
              </li>
              <li v-if="getProductsForCategory(cat.id).length === 0" class="text-muted italic">В этом разделе пока нет товаров</li>
            </ul>
          </div>

          <div class="card-footer-actions flex justify-between items-center gap-2 mt-5 pt-4" style="border-top: 1px solid var(--border-color)">
            <div class="action-primary flex items-center gap-2 text-primary font-extrabold text-uppercase cursor-pointer" @click="goToCategory(cat)">
              <span>{{ currentParentId ? 'К товарам раздела' : 'Открыть раздел' }}</span>
              <span class="arrow">→</span>
            </div>
            <button
              v-if="getChildCategories(cat.id).length > 0"
              class="btn btn-primary btn-sm"
              @click.stop="goToAllProducts(cat)"
            >
              🛒 Все товары
            </button>
          </div>
        </div>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination mt-10">
        <button @click="currentPage--" :disabled="currentPage === 1">←</button>
        <span class="font-bold text-muted mx-4">{{ currentPage }} / {{ totalPages }}</span>
        <button @click="currentPage++" :disabled="currentPage === totalPages">→</button>
      </div>
    </div>

    <!-- ПУСТО -->
    <div v-else class="empty-state glass-card text-center p-10">
      <div class="empty-state-icon">📂</div>
      <h3>В этом разделе пока ничего нет</h3>
      <p>Попробуйте вернуться в основной каталог или воспользуйтесь поиском.</p>
      <button @click="$router.push('/catalog')" class="btn btn-primary btn-lg mt-4">В начало каталога</button>
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
const allProducts = ref([]);
const loading = ref(true);

const currentPage = ref(1);
const itemsPerPage = 9;

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

const currentParentId = computed(() => (route.params.id ? Number(route.params.id) : null));

const currentCategoryName = computed(() => {
  if (!currentParentId.value) return 'Каталог запчастей';
  const cat = allCategories.value.find(c => Number(c.id) === currentParentId.value);
  return cat ? cat.name : 'Раздел каталога';
});

const getChildCategories = (parentId) => allCategories.value.filter(c => c.parent_id === parentId);
const getProductsForCategory = (catId) => allProducts.value.filter(p => p.category_id === catId);

const visibleCategories = computed(() => getChildCategories(currentParentId.value));

const totalPages = computed(() => Math.ceil(visibleCategories.value.length / itemsPerPage));
const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return visibleCategories.value.slice(start, start + itemsPerPage);
});

const goToCategory = (cat) => {
  const children = getChildCategories(cat.id);
  if (children.length > 0) {
    router.push(`/catalog/${cat.id}`);
  } else {
    router.push(`/category/${cat.id}`);
  }
};

const goToAllProducts = (cat) => {
  router.push(`/category/${cat.id}`);
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
/* Увеличенные шрифты и картинки */
.catalog-page {
  max-width: 1250px;
  margin: 0 auto;
  padding: 40px 20px 100px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 30px;
}

.category-card {
  padding: 30px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 320px; /* немного выше для больших фото */
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.category-card:hover {
  transform: translateY(-8px);
  border-color: var(--primary);
  box-shadow: 0 20px 40px -10px var(--primary-light);
}

.category-card h3 {
  font-size: 1.6rem; /* было 1.4rem по умолчанию, увеличили */
}

.cat-icon {
  width: 80px;  /* было 60px */
  height: 80px;
  object-fit: contain;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}

.items-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex: 1;
}
.items-list li:not(.list-label) {
  position: relative;
  padding-left: 15px;
  color: var(--text-muted);
  font-size: 1rem; /* было 0.95rem, увеличили */
}
.items-list li:not(.list-label)::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--primary);
  font-weight: 900;
}

.list-label {
  font-size: 0.8rem; /* чуток крупнее */
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.products-theme li:not(.list-label) {
  color: var(--text-main);
  font-weight: 600;
}

.action-primary {
  font-size: 0.9rem; /* немного больше */
}
.action-primary:hover .arrow {
  transform: translateX(5px);
}
.arrow {
  transition: transform 0.2s;
}

.cat-count {
  background: rgba(0,0,0,0.05);
  padding: 5px 15px;
  border-radius: 20px;
}
:global(.dark) .cat-count {
  background: rgba(255,255,255,0.08);
}

@media (max-width: 768px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
  .category-card {
    min-height: auto;
  }
  .cat-icon {
    width: 60px;
    height: 60px;
  }
}
</style>