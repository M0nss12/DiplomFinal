<template>
  <div class="admin-brands animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>🏭 Управление брендами</h1>
        <p class="subtitle">База данных производителей с автоматической очисткой хранилища</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Всего: <b>{{ filteredBrands.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА ДОБАВЛЕНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить новый бренд</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createBrand" class="admin-form">
        <div class="input-grid">
          <div class="form-group">
            <label>📛 Название бренда</label>
            <input v-model="newBrand.name" placeholder="Напр. Bosch, Brembo..." required />
          </div>

          <div class="form-group">
            <label>🌍 Страна происхождения</label>
            <input v-model="newBrand.country" placeholder="Германия, Италия..." />
          </div>

          <div class="form-group">
            <label>🖼️ Логотип бренда</label>
            <div class="upload-controls">
              <div v-if="newBrand.logo_url" class="preview-new-logo glass-card">
                <img :src="newBrand.logo_url" @click="previewImage(newBrand.logo_url)" />
                <button type="button" @click="newBrand.logo_url = ''" class="btn-clear-img" title="Удалить">✕</button>
              </div>
              <label v-else class="file-label glass-card">
                📁 Загрузить файл
                <input type="file" @change="(e) => handleFileUpload(e, 'new')" accept="image/*" class="sr-only" />
              </label>
              <input v-model="newBrand.logo_url" placeholder="Или прямая ссылка" class="url-mini" />
            </div>
          </div>
        </div>

        <div class="form-footer">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="newBrand.is_popular" />
            <span class="checkmark"></span>
            <span>⭐ Популярный бренд (на главную)</span>
          </label>
          <button type="submit" class="btn btn-primary create-btn" :disabled="uploading">
            <span v-if="uploading" class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
            <span v-else>✨ Создать бренд</span>
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
        <div class="form-group">
          <label>🔎 Поиск (Название, Страна, ID)</label>
          <input v-model="searchQuery" placeholder="Введите название или ID..." />
        </div>
        <div class="form-group">
          <label>🌍 Фильтр по стране</label>
          <select v-model="countryFilter">
            <option value="all">Все страны</option>
            <option v-for="country in uniqueCountries" :key="country" :value="country">{{ country }}</option>
          </select>
        </div>
        <div class="checkbox-group">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="popularOnly" />
            <span class="checkmark"></span>
            <span>⭐ Только популярные</span>
          </label>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА БРЕНДОВ -->
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
              <th class="col-logo">Логотип</th>
              <th>Название бренда</th>
              <th>Страна</th>
              <th class="text-center">Популярный</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="brand in paginatedBrands" :key="brand.id">
              <tr class="brand-row">
                <td class="col-id">#{{ brand.id }}</td>
                <td class="col-logo">
                  <div class="logo-preview-box glass-card">
                    <template v-if="brand.logo_url">
                      <img :src="brand.logo_url" @click="previewImage(brand.logo_url)" title="Клик для просмотра" />
                      <button @click="removeExistingLogo(brand)" class="btn-img-delete" title="Удалить логотип">✕</button>
                    </template>
                    <label v-else class="upload-mini-btn">
                      <span>+</span>
                      <input type="file" @change="(e) => handleFileUpload(e, 'edit', brand)" hidden />
                    </label>
                  </div>
                </td>
                <td>
                  <input v-model="brand.name" @change="updateBrand(brand)" class="inline-edit bold" />
                </td>
                <td>
                  <input v-model="brand.country" @change="updateBrand(brand)" class="inline-edit" placeholder="Указать страну" />
                </td>
                <td class="text-center">
                  <label class="custom-checkbox no-text">
                    <input type="checkbox" v-model="brand.is_popular" @change="updateBrand(brand)" />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td class="text-right">
                  <button @click="deleteBrand(brand)" class="btn btn-danger btn-sm">🗑️ Удалить</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination">
        <button @click="currentPage--" :disabled="currentPage === 1">←</button>
        <div class="pagination-pages">
          <button v-for="p in totalPages" :key="p" @click="currentPage = p" :class="{ active: currentPage === p }">{{ p }}</button>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages">→</button>
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

const brands = ref([]);
const searchQuery = ref('');
const countryFilter = ref('all');
const popularOnly = ref(false);
const uploading = ref(false);
const currentPage = ref(1);
const itemsPerPage = 20;

const newBrand = reactive({ name: '', country: '', logo_url: '', is_popular: true });

const loadData = async () => {
  try {
    const res = await axios.get(`/api/admin/brands`, config);
    brands.value = res.data;
  } catch (e) { console.error('Ошибка загрузки брендов'); }
};

// --- МЕНЕДЖМЕНТ ФАЙЛОВ ---
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts.pop();
};

const previewImage = (url) => { if (url) window.open(url, '_blank'); };

const removeExistingLogo = async (brand) => {
  if (!confirm('Удалить логотип физически из хранилища?')) return;
  const filename = getFilenameFromUrl(brand.logo_url);
  try {
    if (filename) await axios.delete(`/api/storage/brands/${filename}`, config);
    brand.logo_url = null;
    await updateBrand(brand);
  } catch (e) { alert('Ошибка при удалении файла'); }
};

const handleFileUpload = async (event, mode, target = null) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  uploading.value = true;

  try {
    const res = await axios.post(`/api/upload/brands`, formData, config);
    if (mode === 'new') {
      newBrand.logo_url = res.data.url;
    } else {
      if (target.logo_url) {
        const oldFile = getFilenameFromUrl(target.logo_url);
        await axios.delete(`/api/storage/brands/${oldFile}`, config).catch(() => {});
      }
      target.logo_url = res.data.url;
      await updateBrand(target);
    }
  } catch (e) { alert('Ошибка загрузки'); } 
  finally { uploading.value = false; }
};

// --- CRUD ---
const createBrand = async () => {
  try {
    const res = await axios.post(`/api/admin/brands`, newBrand, config);
    brands.value.unshift(res.data);
    Object.assign(newBrand, { name: '', country: '', logo_url: '', is_popular: true });
    alert('Бренд создан');
  } catch (e) { alert('Ошибка создания'); }
};

const updateBrand = async (brand) => {
  try { await axios.put(`/api/admin/brands/${brand.id}`, brand, config); } catch (e) { }
};

const deleteBrand = async (brand) => {
  if (!confirm('Удалить бренд и его логотип?')) return;
  try {
    if (brand.logo_url) {
      const filename = getFilenameFromUrl(brand.logo_url);
      await axios.delete(`/api/storage/brands/${filename}`, config).catch(() => {});
    }
    await axios.delete(`/api/admin/brands/${brand.id}`, config);
    brands.value = brands.value.filter(b => b.id !== brand.id);
  } catch (e) { alert('Ошибка удаления'); }
};

// --- ФИЛЬТРЫ И ПАГИНАЦИЯ ---
const uniqueCountries = computed(() => {
  const countries = brands.value.map(b => b.country).filter(c => c);
  return Array.from(new Set(countries)).sort();
});

const filteredBrands = computed(() => {
  let res = [...brands.value];
  if (popularOnly.value) res = res.filter(b => b.is_popular);
  if (countryFilter.value !== 'all') res = res.filter(b => b.country === countryFilter.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(b => b.name.toLowerCase().includes(q) || (b.country && b.country.toLowerCase().includes(q)) || b.id.toString() === q);
  }
  return res;
});

const totalPages = computed(() => Math.ceil(filteredBrands.value.length / itemsPerPage));
const paginatedBrands = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredBrands.value.slice(start, start + itemsPerPage);
});

const resetFilters = () => {
  searchQuery.value = '';
  countryFilter.value = 'all';
  popularOnly.value = false;
  currentPage.value = 1;
};

watch([searchQuery, countryFilter, popularOnly], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ АДМИНКИ БРЕНДОВ (глобальные классы уже применены)
   ========================================================================== */

.admin-brands {
  padding: 40px 24px;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}
.header-left h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0 0 6px 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
}

.stats-badge {
  padding: 10px 20px;
  border-radius: 60px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}
.stats-icon {
  font-size: 1.2rem;
}

/* Карточки */
.admin-card {
  padding: 28px;
  margin-bottom: 32px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.card-title {
  font-size: 1.35rem;
  font-weight: 900;
  margin: 0;
}
.card-decoration {
  width: 50px;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 4px;
}

/* Сетка формы */
.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin-bottom: 28px;
}

/* Загрузка логотипа */
.upload-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.file-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 8px;
  width: fit-content;
  transition: border-color 0.2s, background 0.2s;
}
.file-label:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}
.url-mini {
  width: 100%;
  margin-top: 4px;
}

.preview-new-logo {
  position: relative;
  width: 80px;
  height: 50px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  padding: 4px;
  margin-bottom: 8px;
}
.preview-new-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.btn-clear-img {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 22px;
  height: 22px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

/* Кнопка создания (глобальный btn + градиент) */
.create-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

/* Фильтры */
.filter-section {
  background: rgba(0,0,0,0.01);
  border-style: dashed;
}
.filter-grid {
  display: grid;
  grid-template-columns: 2fr 1.5fr 1fr;
  gap: 24px;
  align-items: flex-end;
}
.btn-text-link {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 800;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}

/* Чекбокс */
.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  user-select: none;
}
.custom-checkbox input {
  display: none;
}
.checkmark {
  width: 20px;
  height: 20px;
  background: transparent;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  position: relative;
  transition: all 0.2s;
}
:global(.dark) .checkmark {
  border-color: #475569;
}
.custom-checkbox input:checked + .checkmark {
  background: var(--primary);
  border-color: var(--primary);
}
.custom-checkbox input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

/* Таблица */
.table-container {
  margin-top: 16px;
}
.table-meta {
  margin-bottom: 16px;
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-table-wrapper {
  overflow-x: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
.admin-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-color);
}
.admin-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  transition: background 0.2s;
}
.brand-row:hover td {
  background: rgba(37, 99, 235, 0.03);
}
:global(.dark) .brand-row:hover td {
  background: rgba(37, 99, 235, 0.05);
}

.col-id {
  width: 70px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}
.col-logo {
  width: 90px;
  text-align: center;
}

.logo-preview-box {
  width: 60px;
  height: 40px;
  background: #fff;
  overflow: visible;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 8px;
  padding: 2px !important;
}
.logo-preview-box img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  cursor: zoom-in;
}
.upload-mini-btn {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #cbd5e1;
  cursor: pointer;
}
.btn-img-delete {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 18px;
  height: 18px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.inline-edit {
  background: transparent;
  border: 1px solid transparent;
  padding: 8px;
  border-radius: 8px;
  color: var(--text-main);
  width: 100%;
  font-weight: 500;
  transition: 0.2s;
}
.inline-edit:hover {
  background: rgba(0,0,0,0.03);
  border-color: var(--border-color);
}
:global(.dark) .inline-edit:hover {
  background: rgba(255,255,255,0.03);
  border-color: #475569;
}
.inline-edit:focus {
  background: var(--bg-card);
  border-color: var(--primary);
  outline: none;
}
.bold {
  font-weight: 800;
}

.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}

/* Пагинация (используем глобальный .pagination с доработкой) */
.pagination-pages {
  display: flex;
  gap: 8px;
}
.pagination-pages button {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.pagination-pages button:hover {
  background: var(--primary-light);
  border-color: var(--primary);
}
.pagination-pages button.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Адаптивность */
@media (max-width: 900px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }
  .input-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 768px) {
  .admin-brands {
    padding: 24px 16px;
  }
  .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .form-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .pagination {
    flex-wrap: wrap;
  }
}
</style>