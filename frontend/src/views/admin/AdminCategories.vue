<template>
  <div class="admin-catalog-dashboard animate-fade-in">
    <!-- ЗАГОЛОВОК И ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>📂 Структура каталога</h1>
        <p class="subtitle">Управление категориями, подкатегориями и их динамическими характеристиками</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Разделов: <b>{{ categories.length }}</b> | Атрибутов: <b>{{ attributes.length }}</b>
      </div>
    </div>

    <!-- НАВИГАЦИЯ ПО ВКЛАДКАМ -->
    <div class="admin-tabs glass-card">
      <button :class="{ active: currentTab === 'categories' }" @click="currentTab = 'categories'">
        📂 Категории
      </button>
      <button :class="{ active: currentTab === 'attributes' }" @click="currentTab = 'attributes'">
        ⚙️ Атрибуты (Фильтры)
      </button>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 1: КАТЕГОРИИ -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'categories'">
      <!-- ФОРМА СОЗДАНИЯ КАТЕГОРИИ -->
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Создать новую категорию</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createCategory" class="admin-form">
          <div class="input-grid">
            <div class="form-group">
              <label>📛 Название</label>
              <input v-model="newCategory.name" placeholder="Напр. Трансмиссия" required />
            </div>
            <div class="form-group">
              <label>🔗 Slug (URL адрес)</label>
              <input v-model="newCategory.slug" placeholder="transmission" required />
            </div>
            <div class="form-group">
              <label>📁 Родительская категория</label>
              <select v-model="newCategory.parent_id" @change="onParentChangeForNew">
                <option :value="null">-- Корневая (нет родителя) --</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group" v-if="!newCategory.parent_id">
              <label>🖼️ Иконка раздела</label>
              <div class="upload-controls">
                <div v-if="newCategory.image_url" class="preview-new-img glass-card">
                  <img :src="newCategory.image_url" @click="previewImage(newCategory.image_url)" title="Просмотр" />
                  <button type="button" @click="newCategory.image_url = ''" class="btn-clear-img">✕</button>
                </div>
                <label v-else class="file-label glass-card">
                  📁 Загрузить файл
                  <input type="file" @change="(e) => handleFileUpload(e, 'new')" accept="image/*" hidden />
                </label>
                <input v-model="newCategory.image_url" placeholder="Или прямая ссылка" class="url-mini" />
              </div>
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary create-btn" :disabled="uploading">
              <span v-if="uploading" class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
              <span v-else>✨ Создать категорию</span>
            </button>
          </div>
        </form>
      </section>

      <!-- ФИЛЬТРЫ КАТЕГОРИЙ -->
      <section class="admin-card filter-section glass-card">
        <div class="filter-header flex justify-between items-center mb-4">
          <h3 class="card-title">🔍 Поиск и фильтры</h3>
          <button @click="resetCategoryFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr;">
          <div class="form-group">
            <label>🔎 Поиск (Название, Slug или ID)</label>
            <input v-model="categoriesSearch" placeholder="Введите данные для поиска..." />
          </div>
          <div class="form-group">
            <label>📂 Тип</label>
            <select v-model="categoryTypeFilter">
              <option value="all">Все</option>
              <option value="root">Только категории (корневые)</option>
              <option value="sub">Только подкатегории</option>
            </select>
          </div>
        </div>
      </section>

      <!-- ТАБЛИЦА КАТЕГОРИЙ -->
      <div class="table-container">
        <div class="table-meta">
          <span class="meta-icon">📄</span> Показано {{ paginatedCategories.length }} из {{ filteredCategories.length }}
        </div>

        <div class="admin-table-wrapper glass-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th class="col-photo">Иконка</th>
                <th>Название категории</th>
                <th>Slug (URL)</th>
                <th>Родительский раздел</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="cat in paginatedCategories" :key="cat.id" class="category-row" :class="{ 'is-sub': cat.parent_id }">
                <td class="col-id">#{{ cat.id }}</td>
                <td class="col-photo">
                  <template v-if="cat.parent_id"><span class="no-icon">—</span></template>
                  <template v-else>
                    <div class="category-img-box glass-card">
                      <template v-if="cat.image_url">
                        <img :src="cat.image_url" @click="previewImage(cat.image_url)" title="Клик для просмотра" />
                        <button @click="removeExistingIcon(cat)" class="btn-img-delete" title="Удалить из облака">✕</button>
                      </template>
                      <label v-else class="upload-mini-btn">
                        <span>+</span>
                        <input type="file" @change="(e) => handleFileUpload(e, 'edit', cat)" hidden />
                      </label>
                    </div>
                  </template>
                </td>
                <td>
                  <div class="name-cell">
                    <span v-if="cat.parent_id" class="sub-arrow">↳</span>
                    <input v-model="cat.name" @change="updateCategory(cat)" class="inline-edit bold" />
                  </div>
                </td>
                <td>
                  <div class="slug-wrapper">
                    <span class="slug-prefix">/</span>
                    <input v-model="cat.slug" @change="updateCategory(cat)" class="inline-edit slug-text" />
                  </div>
                </td>
                <td>
                  <select v-model="cat.parent_id" @change="updateCategory(cat)" class="table-select">
                    <option :value="null">-- Корневая --</option>
                    <option v-for="c in categories" :key="c.id" :value="c.id" :disabled="c.id === cat.id">{{ c.name }}</option>
                  </select>
                </td>
                <td class="text-right">
                  <button @click="deleteCategory(cat)" class="btn btn-danger btn-sm">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="categoriesTotalPages > 1" class="pagination mt-3">
          <button @click="categoriesPage--" :disabled="categoriesPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in categoriesTotalPages" :key="p" @click="categoriesPage = p" :class="{ active: categoriesPage === p }">{{ p }}</button>
          </div>
          <button @click="categoriesPage++" :disabled="categoriesPage === categoriesTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 2: АТРИБУТЫ (ФИЛЬТРЫ) -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'attributes'">
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Добавить атрибут категории</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createAttribute" class="admin-form">
          <div class="input-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="form-group">
              <label>📂 Категория *</label>
              <select v-model="newAttr.category_id" required>
                <option :value="null" disabled>-- Выберите раздел --</option>
                <template v-for="parent in rootCategories" :key="parent.id">
                  <optgroup :label="parent.name">
                    <option v-for="child in getChildren(parent.id)" :key="child.id" :value="child.id">{{ child.name }}</option>
                  </optgroup>
                </template>
              </select>
            </div>
            <div class="form-group">
              <label>🏷️ Название (Label) *</label>
              <input v-model="newAttr.label" placeholder="Напр. Ёмкость, Ач" required />
            </div>
            <div class="form-group">
              <label>💻 Код (системный) *</label>
              <input v-model="newAttr.code" placeholder="capacity_ah" required class="code-font" />
            </div>
            <div class="form-group">
              <label>📊 Тип поля</label>
              <select v-model="newAttr.type">
                <option value="range">Интервал (От-До)</option>
                <option value="checkbox">Список (Множ. выбор)</option>
                <option value="boolean">Логический (Да/Нет)</option>
                <option value="text">Текст</option>
              </select>
            </div>
            <div class="form-group">
              <label>📏 Ед. измерения</label>
              <input v-model="newAttr.unit" placeholder="шт, кг, V, Ah..." />
            </div>
            <div class="form-group">
              <label>🔢 Порядок</label>
              <input v-model.number="newAttr.sort_order" type="number" />
            </div>
          </div>

          <div v-if="newAttr.type === 'checkbox'" class="options-zone glass-card">
            <label>📝 Варианты выбора (через запятую):</label>
            <textarea v-model="tempOptions" placeholder="60Ah, 70Ah, 100Ah..." rows="2"></textarea>
            <small style="color: var(--text-muted)">Эти значения пользователь увидит в фильтрах.</small>
          </div>

          <div class="form-footer" style="justify-content: space-between;">
            <div class="toggles">
              <label class="custom-checkbox">
                <input type="checkbox" v-model="newAttr.is_filterable" />
                <span class="checkmark"></span><span>Показывать в фильтрах</span>
              </label>
              <label class="custom-checkbox">
                <input type="checkbox" v-model="newAttr.is_required" />
                <span class="checkmark"></span><span>Обязателен для товара</span>
              </label>
            </div>
            <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
              <span v-if="loadingAction" class="spinner" style="width:16px;height:16px;border-width:2px;"></span>
              <span v-else>➕ Создать атрибут</span>
            </button>
          </div>
        </form>
      </section>

      <!-- ФИЛЬТРЫ АТРИБУТОВ -->
      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Поиск и фильтры</h3>
          <button @click="resetAttributeFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 1fr 1fr;">
          <div class="form-group">
            <label>🔎 Поиск по названию или коду</label>
            <input v-model="attributesSearch" placeholder="Введите часть названия или кода..." />
          </div>
          <div class="form-group">
            <label>📂 Категория</label>
            <select v-model="attributesCategoryFilter">
              <option value="all">Все категории</option>
              <template v-for="parent in rootCategories" :key="parent.id">
                <option :value="`parent:${parent.id}`">📁 {{ parent.name }}</option>
                <option v-for="child in getChildren(parent.id)" :key="child.id" :value="child.id">
                  &nbsp;&nbsp;&nbsp;└ {{ child.name }}
                </option>
              </template>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Показано {{ paginatedAttributes.length }} из {{ filteredAttributes.length }} атрибутов
        </div>
        <div class="admin-table-wrapper glass-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>Категория</th>
                <th>Код / Название</th>
                <th>Тип / Ед. изм.</th>
                <th class="text-center">Фильтр</th>
                <th class="text-center">Обяз.</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in paginatedAttributes" :key="a.id" class="attr-row">
                <td class="col-id">#{{ a.id }}</td>
                <td><span class="cat-tag">{{ getCategoryName(a.category_id) }}</span></td>
                <td>
                  <input v-model="a.label" @change="updateAttr(a)" class="inline-edit bold" />
                  <input v-model="a.code" @change="updateAttr(a)" class="inline-edit mini code-font" />
                </td>
                <td>
                  <select v-model="a.type" @change="updateAttr(a)" class="table-select" style="margin-bottom: 5px;">
                    <option value="range">range</option>
                    <option value="checkbox">checkbox</option>
                    <option value="boolean">boolean</option>
                    <option value="text">text</option>
                  </select>
                  <input v-model="a.unit" @change="updateAttr(a)" class="inline-edit mini" placeholder="Ед.изм" />
                </td>
                <td class="text-center">
                  <label class="custom-checkbox no-text" style="justify-content: center;">
                    <input type="checkbox" v-model="a.is_filterable" @change="updateAttr(a)" />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td class="text-center">
                  <label class="custom-checkbox no-text" style="justify-content: center;">
                    <input type="checkbox" v-model="a.is_required" @change="updateAttr(a)" />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td class="text-right">
                  <button @click="deleteAttr(a.id)" class="btn btn-danger btn-sm">🗑️</button>
                </td>
              </tr>
              <tr v-if="paginatedAttributes.length === 0">
                <td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">Атрибуты не найдены</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="attributesTotalPages > 1" class="pagination mt-3">
          <button @click="attributesPage--" :disabled="attributesPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in attributesTotalPages" :key="p" @click="attributesPage = p" :class="{ active: attributesPage === p }">{{ p }}</button>
          </div>
          <button @click="attributesPage++" :disabled="attributesPage === attributesTotalPages">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const currentTab = ref('categories');
const itemsPerPage = 20;

const categories = ref([]);
const attributes = ref([]);

// Инициализация загрузки всех данных
const loadAllData = async () => {
  try {
    const [cRes, aRes] = await Promise.all([
      axios.get(`/api/admin/categories`, config),
      axios.get(`/api/admin/category_attributes`, config)
    ]);
    categories.value = Array.isArray(cRes.data) ? cRes.data : [];
    attributes.value = Array.isArray(aRes.data) ? aRes.data : [];
  } catch (e) {
    console.error('Ошибка загрузки каталога', e);
  }
};

// ==========================================
// ХЕЛПЕРЫ КАТЕГОРИЙ (Общие)
// ==========================================
const rootCategories = computed(() => categories.value.filter(c => c.parent_id === null));
const getChildren = (parentId) => categories.value.filter(c => c.parent_id === parentId);
const getCategoryName = (id) => categories.value.find(c => c.id === id)?.name || '---';

// ==========================================
// ЛОГИКА: ВКЛАДКА "КАТЕГОРИИ"
// ==========================================
const categoriesPage = ref(1);
const categoriesSearch = ref('');
const categoryTypeFilter = ref('all');
const uploading = ref(false);

const newCategory = reactive({ name: '', slug: '', parent_id: null, image_url: '' });

const onParentChangeForNew = () => { if (newCategory.parent_id) newCategory.image_url = ''; };
const getFilenameFromUrl = (url) => url ? url.split('/').pop() : null;
const previewImage = (url) => { if (url) window.open(url, '_blank'); };

const removeExistingIcon = async (cat) => {
  if (!confirm('Удалить иконку физически из хранилища?')) return;
  const filename = getFilenameFromUrl(cat.image_url);
  try {
    if (filename) await axios.delete(`/api/storage/categories/${filename}`, config);
    cat.image_url = null;
    await updateCategory(cat);
    replaceCategoryInList(cat);
  } catch (e) { alert('Ошибка при удалении файла'); }
};

const handleFileUpload = async (event, mode, target = null) => {
  const file = event.target.files[0];
  if (!file) return;
  const formData = new FormData(); formData.append('file', file);
  uploading.value = true;
  try {
    const res = await axios.post(`/api/upload/categories`, formData, config);
    if (mode === 'new') {
      newCategory.image_url = res.data.url;
    } else {
      if (target.image_url) {
        const oldFile = getFilenameFromUrl(target.image_url);
        await axios.delete(`/api/storage/categories/${oldFile}`, config).catch(() => {});
      }
      target.image_url = res.data.url;
      await updateCategory(target);
      replaceCategoryInList(target);
    }
  } catch (e) { alert('Ошибка загрузки иконки'); } 
  finally { uploading.value = false; }
};

const createCategory = async () => {
  try {
    if (newCategory.parent_id) newCategory.image_url = '';
    const res = await axios.post(`/api/admin/categories`, newCategory, config);
    categories.value.unshift(res.data);
    Object.assign(newCategory, { name: '', slug: '', parent_id: null, image_url: '' });
  } catch (e) { alert('Ошибка создания категории'); }
};

const updateCategory = async (cat) => {
  try {
    if (cat.parent_id && cat.image_url) cat.image_url = null;
    await axios.put(`/api/admin/categories/${cat.id}`, cat, config);
    replaceCategoryInList(cat);
  } catch (e) { console.error('Update error', e); }
};

const deleteCategory = async (cat) => {
  if (!confirm('Удалить категорию и её иконку?')) return;
  try {
    if (cat.image_url) {
      const filename = getFilenameFromUrl(cat.image_url);
      await axios.delete(`/api/storage/categories/${filename}`, config).catch(() => {});
    }
    await axios.delete(`/api/admin/categories/${cat.id}`, config);
    categories.value = categories.value.filter(c => c.id !== cat.id);
  } catch (e) { alert('Ошибка удаления (возможно, в категории есть товары или подкатегории)'); }
};

const replaceCategoryInList = (cat) => { categories.value = categories.value.map(c => (c.id === cat.id ? { ...cat } : c)); };

const resetCategoryFilters = () => { categoriesSearch.value = ''; categoryTypeFilter.value = 'all'; categoriesPage.value = 1; };

const filteredCategories = computed(() => {
  let res = [...categories.value];
  if (categoryTypeFilter.value === 'root') res = res.filter(c => !c.parent_id);
  else if (categoryTypeFilter.value === 'sub') res = res.filter(c => c.parent_id);
  
  if (categoriesSearch.value.trim()) {
    const q = categoriesSearch.value.toLowerCase().trim();
    res = res.filter(c => (c.name && c.name.toLowerCase().includes(q)) || (c.slug && c.slug.toLowerCase().includes(q)) || c.id.toString() === q);
  }
  return res;
});
const categoriesTotalPages = computed(() => Math.ceil(filteredCategories.value.length / itemsPerPage));
const paginatedCategories = computed(() => filteredCategories.value.slice((categoriesPage.value - 1) * itemsPerPage, categoriesPage.value * itemsPerPage));
watch([categoriesSearch, categoryTypeFilter], () => categoriesPage.value = 1);


// ==========================================
// ЛОГИКА: ВКЛАДКА "АТРИБУТЫ"
// ==========================================
const attributesPage = ref(1);
const attributesSearch = ref('');
const attributesCategoryFilter = ref('all');
const tempOptions = ref('');
const loadingAction = ref(false);

const newAttr = reactive({ category_id: null, code: '', label: '', type: 'text', unit: '', sort_order: 0, is_filterable: true, is_required: false, options_json: [] });

const createAttribute = async () => {
  loadingAction.value = true;
  try {
    if (newAttr.type === 'checkbox' && tempOptions.value) newAttr.options_json = tempOptions.value.split(',').map(s => s.trim()).filter(Boolean);
    else newAttr.options_json = [];
    
    const res = await axios.post('/api/admin/category_attributes', newAttr, config);
    attributes.value.unshift(res.data);
    Object.assign(newAttr, { category_id: null, code: '', label: '', type: 'text', unit: '', sort_order: 0, options_json: [] });
    tempOptions.value = '';
    alert('Атрибут добавлен');
  } catch (e) { alert('Ошибка при создании (возможно, такой код уже есть)'); } 
  finally { loadingAction.value = false; }
};

const updateAttr = async (a) => {
  try { await axios.put(`/api/admin/category_attributes/${a.id}`, a, config); } 
  catch (e) { console.error('Ошибка обновления', e); }
};

const deleteAttr = async (id) => {
  if (!confirm('Удалить этот атрибут? Он исчезнет из всех товаров этой категории!')) return;
  try {
    await axios.delete(`/api/admin/category_attributes/${id}`, config);
    attributes.value = attributes.value.filter(a => a.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const resetAttributeFilters = () => { attributesSearch.value = ''; attributesCategoryFilter.value = 'all'; attributesPage.value = 1; };

const filteredAttributes = computed(() => {
  let res = [...attributes.value];
  if (attributesCategoryFilter.value !== 'all') {
    const val = attributesCategoryFilter.value;
    if (typeof val === 'string' && val.startsWith('parent:')) {
      const parentId = Number(val.replace('parent:', ''));
      const childIds = getChildren(parentId).map(c => c.id);
      res = res.filter(a => childIds.includes(a.category_id));
    } else {
      const subId = Number(val);
      if (!isNaN(subId)) res = res.filter(a => a.category_id === subId);
    }
  }
  if (attributesSearch.value.trim()) {
    const q = attributesSearch.value.toLowerCase().trim();
    res = res.filter(a => (a.label && a.label.toLowerCase().includes(q)) || (a.code && a.code.toLowerCase().includes(q)));
  }
  return res.sort((a, b) => a.sort_order - b.sort_order);
});
const attributesTotalPages = computed(() => Math.ceil(filteredAttributes.value.length / itemsPerPage));
const paginatedAttributes = computed(() => filteredAttributes.value.slice((attributesPage.value - 1) * itemsPerPage, attributesPage.value * itemsPerPage));
watch([attributesSearch, attributesCategoryFilter], () => attributesPage.value = 1);

onMounted(loadAllData);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (Переиспользуемые)
   ========================================================================== */
.admin-catalog-dashboard { padding: 40px 24px; }
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
.header-left h1 { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px 0; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: var(--text-muted); margin: 0; font-size: 0.95rem; font-weight: 500; }
.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* Tabs */
.admin-tabs { display: flex; gap: 10px; padding: 10px; margin-bottom: 30px; border-radius: 12px; overflow-x: auto; }
.admin-tabs button { padding: 12px 24px; border: none; background: transparent; color: var(--text-muted); font-weight: 800; border-radius: 8px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.admin-tabs button:hover { background: rgba(0,0,0,0.05); }
.admin-tabs button.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
:global(.dark) .admin-tabs button:hover { background: rgba(255,255,255,0.05); }

/* Common UI */
.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-title { font-size: 1.25rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: 4px; margin-top: 5px; }
.filter-grid { display: grid; gap: 20px; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
.btn-text-link { background: none; border: none; color: var(--primary); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }

/* Tables */
.table-container { margin-top: 20px; }
.table-meta { font-size: 0.85rem; font-weight: 600; margin-bottom: 15px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); border-bottom: 2px solid var(--border-color); text-transform: uppercase; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color); vertical-align: middle; transition: background 0.2s;}
.col-id { width: 70px; font-weight: 800; color: var(--primary); font-family: monospace; }
.text-right { text-align: right; }
.text-center { text-align: center; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; }
.pagination-pages { display: flex; gap: 8px; }
.pagination button, .pagination-pages button { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer; transition: background 0.2s; }
.pagination button:hover:not(:disabled), .pagination-pages button:hover { background: var(--primary-light); border-color: var(--primary); }
.pagination-pages button.active { background: var(--primary); color: white; border-color: var(--primary); }

/* ==========================================================================
   СТИЛИ ДЛЯ ВКЛАДКИ "КАТЕГОРИИ"
   ========================================================================== */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 28px; }
.upload-controls { display: flex; flex-direction: column; gap: 10px; }
.file-label { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 0.85rem; font-weight: 700; cursor: pointer; border-radius: 8px; width: fit-content; transition: border-color 0.2s, background 0.2s; }
.file-label:hover { background: var(--primary-light); border-color: var(--primary); }
.url-mini { width: 100%; margin-top: 4px; }
.preview-new-img { position: relative; width: 80px; height: 60px; background: #fff; border-radius: 8px; overflow: hidden; padding: 4px; margin-bottom: 8px; }
.preview-new-img img { width: 100%; height: 100%; object-fit: contain; }
.btn-clear-img { position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; background: var(--danger); color: white; border: none; border-radius: 50%; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.form-footer { display: flex; justify-content: flex-end; }
.create-btn { background: linear-gradient(135deg, var(--primary), var(--accent)); border: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.create-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
.category-row:hover td { background: rgba(37, 99, 235, 0.03); }
:global(.dark) .category-row:hover td { background: rgba(37, 99, 235, 0.05); }
.col-photo { width: 90px; text-align: center; }
.category-img-box { width: 60px; height: 60px; background: #fff; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 12px; padding: 4px; }
.category-img-box img { max-width: 90%; max-height: 90%; object-fit: contain; cursor: zoom-in; }
.upload-mini-btn { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #cbd5e1; cursor: pointer; }
.btn-img-delete { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; background: var(--danger); color: white; border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.name-cell { display: flex; align-items: center; gap: 6px; }
.sub-arrow { color: var(--primary); font-weight: 900; font-size: 1.2rem; line-height: 1; }
.slug-wrapper { display: flex; align-items: center; gap: 4px; }
.slug-prefix { font-weight: 800; color: var(--primary); }
.slug-text { font-family: monospace; color: var(--primary); }
:global(.dark) .slug-text { color: #60a5fa; }
.is-sub td { background-color: rgba(0, 0, 0, 0.02); padding-left: 30px !important; }
:global(.dark) .is-sub td { background-color: rgba(255, 255, 255, 0.03); }
.no-icon { color: var(--text-muted); font-weight: 700; font-size: 1.1rem; }

/* ==========================================================================
   СТИЛИ ДЛЯ ВКЛАДКИ "АТРИБУТЫ"
   ========================================================================== */
.code-font { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--primary); }
.options-zone { padding: 20px; background: rgba(0,0,0,0.02); margin-bottom: 24px; border-style: dashed; }
.options-zone label { font-size: 0.8rem; font-weight: 800; color: var(--primary); margin-bottom: 10px; display: block; }
.toggles { display: flex; gap: 30px; }
.attr-row:hover td { background: rgba(37,99,235,0.02); }
.cat-tag { background: rgba(37,99,235,0.1); color: var(--primary); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; white-space: nowrap; }
.custom-checkbox { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 0.85rem; color: var(--text-main); }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; background: transparent; border: 2px solid var(--border-color); border-radius: 6px; position: relative; transition: all 0.2s; }
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--primary); border-color: var(--primary); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

/* Inline edits & Selects */
.inline-edit { background: transparent; border: 1px solid transparent; padding: 6px 8px; border-radius: 6px; color: var(--text-main); width: 100%; font-weight: 500; transition: 0.2s; font-size: inherit; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color); }
:global(.dark) .inline-edit:hover { background: rgba(255,255,255,0.03); border-color: #475569; }
.inline-edit:focus { border-color: var(--primary); background: var(--bg-card); outline: none; }
.inline-edit.mini { font-size: 0.8rem; color: var(--text-muted); }
.bold { font-weight: 800; }
.table-select { background: transparent; border: 1px solid transparent; padding: 8px; border-radius: 8px; width: 100%; font-weight: 600; cursor: pointer; color: var(--text-main); }
:global(.dark) .table-select { color: #f8fafc; }
.table-select:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color); }
:global(.dark) .table-select:hover { background: rgba(255,255,255,0.03); border-color: #475569; }

@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr !important; }
  .filter-grid { grid-template-columns: 1fr !important; }
  .toggles { flex-direction: column; gap: 10px; }
}
</style>

<style>
/* Исправление белых опций в тёмной теме для селектов */
html.dark .table-select option, html.dark select option {
  background-color: var(--bg-input) !important;
  color: var(--text-main) !important;
}
</style>