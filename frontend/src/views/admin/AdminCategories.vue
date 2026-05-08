<template>
  <div class="admin-categories">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>📂 Управление категориями</h1>
        <p class="subtitle">Структура каталога и автоматическая очистка хранилища иконок</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Всего: <b>{{ filteredCategories.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА СОЗДАНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Создать новую категорию</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createCategory" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>📛 Название</label>
            <input v-model="newCategory.name" placeholder="Напр. Трансмиссия" required class="form-input" />
          </div>
          <div class="input-group">
            <label>🔗 Slug (URL адрес)</label>
            <input v-model="newCategory.slug" placeholder="transmission" required class="form-input" />
          </div>
          <div class="input-group">
            <label>📁 Родительская категория</label>
            <select v-model="newCategory.parent_id" class="form-input">
              <option :value="null">-- Корневая (нет родителя) --</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>🖼️ Иконка раздела</label>
            <div class="upload-controls">
              <div v-if="newCategory.image_url" class="preview-new-img glass-card">
                <img :src="newCategory.image_url" @click="previewImage(newCategory.image_url)" title="Просмотр" />
                <button type="button" @click="newCategory.image_url = ''" class="btn-clear-img">✕</button>
              </div>
              <label v-else class="file-label glass-card">
                📁 Загрузить файл
                <input type="file" @change="(e) => handleFileUpload(e, 'new')" accept="image/*" class="hidden-file" />
              </label>
              <input v-model="newCategory.image_url" placeholder="Или прямая ссылка" class="form-input url-mini" />
            </div>
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" :disabled="uploading" class="btn-primary">
            <span v-if="uploading" class="spinner-small"></span>
            <span v-else>✨ Создать категорию</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. УМНАЯ ФИЛЬТРАЦИЯ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск и фильтры</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="input-group">
          <label>🔎 Поиск (Название, Slug или ID)</label>
          <input v-model="searchQuery" placeholder="Введите данные для поиска..." class="form-input" />
        </div>

        <div class="input-group">
          <label>📂 Фильтр по родителю</label>
          <select v-model="parentFilter" class="form-input">
            <option value="all">Все категории</option>
            <option :value="null">Только корневые</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА КАТЕГОРИЙ -->
    <div class="table-container">
      <div class="table-meta">
        <span class="meta-icon">📄</span>
        Страница {{ currentPage }} из {{ totalPages || 1 }}
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
            <tr v-for="cat in paginatedCategories" :key="cat.id" class="category-row">
              <td class="col-id">#{{ cat.id }}</td>
              
              <td class="col-photo">
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
              </td>

              <td>
                <input v-model="cat.name" @change="updateCategory(cat)" class="inline-edit bold" />
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
                  <option v-for="c in categories" :key="c.id" :value="c.id" :disabled="c.id === cat.id">
                    {{ c.name }}
                  </option>
                </select>
              </td>

              <td class="text-right">
                <button @click="deleteCategory(cat)" class="btn-delete-small">🗑️ Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <button @click="currentPage--" :disabled="currentPage === 1" class="p-btn glass-card">←</button>
        <div class="p-numbers">
          <button v-for="p in totalPages" :key="p" @click="currentPage = p" class="glass-card" :class="{ active: currentPage === p }">{{ p }}</button>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-btn glass-card">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const categories = ref([]);
const searchQuery = ref('');
const parentFilter = ref('all');
const uploading = ref(false);
const currentPage = ref(1);
const itemsPerPage = 20;

const newCategory = reactive({ name: '', slug: '', parent_id: null, image_url: '' });

// Загрузка данных
const loadData = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/admin/categories`, config);
    categories.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) { 
    console.error('Ошибка загрузки данных категорий'); 
  }
};

// --- МЕНЕДЖМЕНТ ФАЙЛОВ ---
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts.pop();
};

const previewImage = (url) => { if (url) window.open(url, '_blank'); };

const removeExistingIcon = async (cat) => {
  if (!confirm('Удалить иконку физически из хранилища?')) return;
  const filename = getFilenameFromUrl(cat.image_url);
  try {
    if (filename) await axios.delete(`${API_URL}/api/storage/categories/${filename}`, config);
    cat.image_url = null;
    await updateCategory(cat);
  } catch (e) { 
    alert('Ошибка при удалении файла'); 
  }
};

const handleFileUpload = async (event, mode, target = null) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  uploading.value = true;

  try {
    const res = await axios.post(`${API_URL}/api/upload/categories`, formData, config);
    if (mode === 'new') {
      newCategory.image_url = res.data.url;
    } else {
      // Очистка старой иконки при замене
      if (target.image_url) {
        const oldFile = getFilenameFromUrl(target.image_url);
        await axios.delete(`${API_URL}/api/storage/categories/${oldFile}`, config).catch(() => {});
      }
      target.image_url = res.data.url;
      await updateCategory(target);
    }
  } catch (e) { 
    alert('Ошибка загрузки иконки'); 
  } finally { 
    uploading.value = false; 
  }
};

// --- CRUD ---
const createCategory = async () => {
  try {
    const res = await axios.post(`${API_URL}/api/admin/categories`, newCategory, config);
    categories.value.unshift(res.data);
    Object.assign(newCategory, { name: '', slug: '', parent_id: null, image_url: '' });
    alert('Категория создана');
  } catch (e) { 
    alert('Ошибка создания категории'); 
  }
};

const updateCategory = async (cat) => {
  try { 
    await axios.put(`${API_URL}/api/admin/categories/${cat.id}`, cat, config); 
  } catch (e) { 
    console.error("Update error", e);
  }
};

const deleteCategory = async (cat) => {
  if (!confirm('Удалить категорию и её иконку?')) return;
  try {
    if (cat.image_url) {
      const filename = getFilenameFromUrl(cat.image_url);
      await axios.delete(`${API_URL}/api/storage/categories/${filename}`, config).catch(() => {});
    }
    await axios.delete(`${API_URL}/api/admin/categories/${cat.id}`, config);
    categories.value = categories.value.filter(c => c.id !== cat.id);
  } catch (e) { 
    alert('Ошибка удаления (возможно, в категории есть товары или подкатегории)'); 
  }
};

// --- ФИЛЬТРАЦИЯ И ПАГИНАЦИЯ ---
const filteredCategories = computed(() => {
  if (!Array.isArray(categories.value)) return [];
  let res = [...categories.value];
  
  if (parentFilter.value !== 'all') {
    res = res.filter(c => c.parent_id === parentFilter.value);
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(c => 
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.slug && c.slug.toLowerCase().includes(q)) ||
      c.id.toString() === q
    );
  }
  return res;
});

const totalPages = computed(() => Math.ceil(filteredCategories.value.length / itemsPerPage));

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredCategories.value.slice(start, start + itemsPerPage);
});

const resetFilters = () => {
  searchQuery.value = '';
  parentFilter.value = 'all';
  currentPage.value = 1;
};

watch([searchQuery, parentFilter], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: КАТЕГОРИИ (СВЕТЛАЯ/ТЕМНАЯ ТЕМА И СТЕКЛО)
   ========================================================================== */

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-categories {
  padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a);
}
:global(.dark) .admin-categories { color: #f8fafc; }

/* ШАПКА */
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0 0 6px 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); margin: 0; font-size: 0.95rem; font-weight: 500; }
:global(.dark) .subtitle { color: #94a3b8; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

/* ФОРМА */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-bottom: 28px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.upload-controls { display: flex; flex-direction: column; gap: 10px; }
.file-label { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; font-size: 0.85rem; font-weight: 700; cursor: pointer; border-radius: 8px; width: fit-content; transition: 0.2s; }
.file-label:hover { background: rgba(37, 99, 235, 0.1); border-color: var(--primary, #2563eb); }
.hidden-file { display: none; }

.preview-new-img { position: relative; width: 80px; height: 60px; background: #fff; border-radius: 8px; overflow: hidden; padding: 4px; margin-bottom: 8px; }
.preview-new-img img { width: 100%; height: 100%; object-fit: contain; }
.btn-clear-img { position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; background: var(--danger, #ef4444); color: white; border: none; border-radius: 50%; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.form-footer { display: flex; justify-content: flex-end; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 14px 32px; border-radius: var(--radius-md, 8px); font-weight: 800; font-size: 0.95rem; cursor: pointer; transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: flex; align-items: center; gap: 10px;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.spinner-small { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

/* ФИЛЬТРЫ */
.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-grid { display: grid; grid-template-columns: 2fr 1.5fr; gap: 24px; align-items: flex-end; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }

/* ТАБЛИЦА */
.table-container { margin-top: 16px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; display: flex; align-items: center; gap: 8px; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; transition: background 0.2s; }
:global(.dark) .admin-table td { border-color: #334155; }
.category-row:hover td { background: rgba(37, 99, 235, 0.03); }
:global(.dark) .category-row:hover td { background: rgba(37, 99, 235, 0.05); }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }
.col-photo { width: 90px; text-align: center; }
.category-img-box { width: 60px; height: 60px; background: #fff; display: flex; align-items: center; justify-content: center; position: relative; border-radius: 12px; padding: 4px !important; }
.category-img-box img { max-width: 90%; max-height: 90%; object-fit: contain; cursor: zoom-in; }
.upload-mini-btn { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: #cbd5e1; cursor: pointer; }
.btn-img-delete { position: absolute; top: -8px; right: -8px; width: 18px; height: 18px; background: var(--danger, #ef4444); color: white; border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

.inline-edit { background: transparent; border: 1px solid transparent; padding: 8px; border-radius: 8px; color: var(--text-main, #0f172a); width: 100%; font-weight: 500; transition: 0.2s; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #e2e8f0); }
:global(.dark) .inline-edit:hover { background: rgba(255,255,255,0.03); border-color: #475569; }
.inline-edit:focus { background: var(--bg-card, #fff); border-color: var(--primary, #2563eb); outline: none; }
.bold { font-weight: 800; }

.slug-wrapper { display: flex; align-items: center; gap: 4px; }
.slug-prefix { font-weight: 800; color: var(--primary, #2563eb); }
.slug-text { font-family: monospace; color: var(--primary, #2563eb); }
:global(.dark) .slug-text { color: #60a5fa; }

.table-select { background: transparent; border: 1px solid transparent; padding: 8px; border-radius: 8px; width: 100%; font-weight: 600; cursor: pointer; color: var(--text-main, #0f172a); }
:global(.dark) .table-select { color: #f8fafc; }
.table-select:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #e2e8f0); }
:global(.dark) .table-select:hover { background: rgba(255,255,255,0.03); border-color: #475569; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: all 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(239, 68, 68, 0.2); }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; color: var(--text-main, #0f172a); border: 1px solid var(--border-color, #e2e8f0); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-btn:hover:not(:disabled) { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); background: rgba(37, 99, 235, 0.05); }
.p-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.p-numbers { display: flex; gap: 8px; }
.p-numbers button { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; font-weight: 800; cursor: pointer; transition: all 0.2s; color: var(--text-muted, #64748b); }
:global(.dark) .p-numbers button { color: #94a3b8; }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) { .filter-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .admin-categories { padding: 24px 16px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr; }
  .pagination-wrapper { flex-wrap: wrap; }
}
</style>