<template>
  <div class="admin-products animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>📦 Управление товарами</h1>
        <p class="subtitle">Каталог запчастей (v2.0 Schema)</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Всего: <b>{{ filteredProducts.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА ДОБАВЛЕНИЯ (без дублирования стилей) -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить новый товар</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createProduct" class="admin-form">
        <div class="input-grid">
          <!-- Поля формы используют глобальные стили -->
          <div class="form-group">
            <label>📛 Название товара</label>
            <input v-model="newProduct.name" placeholder="Тормозные колодки..." required />
          </div>
          <div class="form-group">
            <label>🔖 Артикул (SKU)</label>
            <input v-model="newProduct.sku" placeholder="ABC-123" required />
          </div>
          <div class="form-group">
            <label>💰 Цена (₽)</label>
            <input v-model.number="newProduct.price" type="number" placeholder="0" required />
          </div>
          <div class="form-group">
            <label>📂 Категория</label>
            <select v-model="newProduct.category_id" required>
              <option :value="null">-- Выберите --</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>🏷️ Бренд</label>
            <select v-model="newProduct.brand_id">
              <option :value="null">-- Без бренда --</option>
              <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>⚖️ Вес (кг) / 🛡️ Гарантия (мес)</label>
            <div class="flex-row">
              <input v-model.number="newProduct.weight_kg" type="number" step="0.1" placeholder="Вес" />
              <input v-model.number="newProduct.warranty_months" type="number" placeholder="Гарантия" />
            </div>
          </div>
          <div class="form-group full-width">
            <label>📝 Описание</label>
            <textarea v-model="newProduct.description" placeholder="Общее описание товара..." rows="2"></textarea>
          </div>
          <!-- Характеристики -->
          <div class="form-group full-width">
            <label>⚙️ Характеристики (Фильтры)</label>
            <div class="char-editor glass-card">
              <div v-for="(val, key) in newProduct.characteristics" :key="key" class="char-row">
                <input :value="key" readonly class="char-key" />
                <input v-model="newProduct.characteristics[key]" class="char-val" />
                <button type="button" @click="removeCharFromNew(key)" class="btn-remove-char">×</button>
              </div>
              <div class="char-add-row">
                <input v-model="tempChar.key" placeholder="Свойство (напр. Материал)" class="char-key" />
                <input v-model="tempChar.val" placeholder="Значение" class="char-val" />
                <button type="button" @click="addCharToNew" class="btn-add-char">Добавить</button>
              </div>
            </div>
          </div>
          <!-- Галерея -->
          <div class="form-group full-width">
            <label>🖼️ Галерея изображений (макс 5)</label>
            <div class="upload-gallery">
              <div v-for="(img, idx) in newProduct.images" :key="idx" class="preview-item glass-card">
                <img :src="img" @click="previewImage(img)" />
                <button type="button" @click="newProduct.images.splice(idx, 1)" class="btn-clear-img">✕</button>
              </div>
              <label v-if="newProduct.images.length < 5" class="file-label-big glass-card">
                <span v-if="!uploading">+ Добавить фото</span>
                <span v-else class="spinner" style="width:20px; height:20px; border-width:2px;"></span>
                <input type="file" @change="uploadPhoto" accept="image/*" class="sr-only" :disabled="uploading" />
              </label>
            </div>
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn btn-primary create-btn" :disabled="uploading">
            <span v-if="uploading" class="spinner" style="width:20px; height:20px; border-width:2px;"></span>
            <span v-else>✨ Создать товар</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск и фильтрация</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="form-group">
          <label>🔎 Поиск по всему</label>
          <input v-model="searchQuery" placeholder="Название, артикул или ID..." />
        </div>
        <div class="form-group">
          <label>📂 Категория</label>
          <select v-model="filters.categoryId">
            <option value="all">Все категории</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>🏷️ Бренд</label>
          <select v-model="filters.brandId">
            <option value="all">Все бренды</option>
            <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>📊 Сортировка</label>
          <select v-model="filters.sort">
            <option value="new">Сначала новые</option>
            <option value="price-asc">Дешевые сверху</option>
            <option value="price-desc">Дорогие сверху</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА ТОВАРОВ -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedProducts.length }} из {{ filteredProducts.length }} товаров (страница {{ currentPage }} из {{ totalPages }})
      </div>
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-photo">Фото</th>
              <th>Данные товара</th>
              <th>Категория / Бренд</th>
              <th>Цена (₽)</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in paginatedProducts" :key="p.id">
              <tr class="product-row" :class="{ 'is-expanded': expandedRow === p.id }">
                <td class="col-id">#{{ p.id }}</td>
                <td class="col-photo">
                  <div class="product-img-box glass-card">
                    <template v-if="p.images && p.images.length > 0">
                      <img :src="p.images[0]" @click="previewImage(p.images[0])" />
                      <span v-if="p.images.length > 1" class="photo-count">{{ p.images.length }}</span>
                    </template>
                    <label v-else class="upload-mini-btn">
                      <span>+</span>
                      <input type="file" @change="(e) => uploadPhotoToExisting(e, p)" hidden />
                    </label>
                  </div>
                </td>
                <td>
                  <input v-model="p.name" @change="updateProduct(p)" class="inline-edit bold" />
                  <div class="sku-row">
                    <span class="muted">SKU:</span>
                    <input v-model="p.sku" @change="updateProduct(p)" class="inline-edit mini" />
                  </div>
                </td>
                <td>
                  <select v-model="p.category_id" @change="updateProduct(p)" class="table-select">
                    <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                  <select v-model="p.brand_id" @change="updateProduct(p)" class="table-select muted">
                    <option :value="null">Без бренда</option>
                    <option v-for="b in brands" :key="b.id" :value="b.id">{{ b.name }}</option>
                  </select>
                </td>
                <td>
                  <div class="price-edit-row">
                    <input v-model.number="p.price" type="number" @change="updateProduct(p)" class="inline-edit price-val" />
                  </div>
                  <div class="discount-edit-row" v-if="p.discount_price !== null">
                    <span class="muted">Скидка:</span>
                    <input v-model.number="p.discount_price" type="number" @change="updateProduct(p)" class="inline-edit discount-val" />
                    <button @click="p.discount_price = null; updateProduct(p)" class="remove-discount">✕</button>
                  </div>
                  <div v-else class="add-discount" @click="p.discount_price = 0">➕ Скидка</div>
                </td>
                <td class="text-right">
                  <button @click="toggleDetails(p.id)" class="btn-action-circle" :class="{ 'active': expandedRow === p.id }">⚙️</button>
                  <button @click="deleteProduct(p.id)" class="btn btn-danger btn-sm">🗑️</button>
                </td>
              </tr>
              <!-- Аккордеон деталей -->
              <tr v-if="expandedRow === p.id" class="details-row">
                <td colspan="6">
                  <div class="details-panel glass-card">
                    <div class="details-grid">
                      <div class="detail-field">
                        <label>⚖️ Вес (кг):</label>
                        <input v-model.number="p.weight_kg" type="number" step="0.1" @change="updateProduct(p)" />
                      </div>
                      <div class="detail-field">
                        <label>🛡️ Гарантия (мес):</label>
                        <input v-model.number="p.warranty_months" type="number" @change="updateProduct(p)" />
                      </div>
                      <div class="detail-field full-width">
                        <label>📝 Описание:</label>
                        <textarea v-model="p.description" @change="updateProduct(p)" rows="3"></textarea>
                      </div>
                      <div class="detail-field full-width">
                        <label>⚙️ Характеристики JSONB:</label>
                        <div class="char-editor mini">
                          <div v-for="(v, k) in p.characteristics" :key="k" class="char-row">
                            <input :value="k" readonly class="char-key" />
                            <input v-model="p.characteristics[k]" @change="updateProduct(p)" class="char-val" />
                            <button @click="deleteChar(p, k)" class="btn-remove-char">×</button>
                          </div>
                          <div class="char-add-row">
                            <input v-model="tempTableChar.key" placeholder="Новое свойство" class="char-key" />
                            <input v-model="tempTableChar.val" placeholder="Значение" class="char-val" />
                            <button @click="addCharToExisting(p)" class="btn-add-char">Добавить</button>
                          </div>
                        </div>
                      </div>
                      <div class="detail-field full-width">
                        <label>🖼️ Галерея изображений ({{ p.images?.length || 0 }}/5)</label>
                        <div class="gallery-editor">
                          <div v-for="(img, idx) in p.images" :key="idx" class="gallery-item glass-card">
                            <img :src="img" @click="previewImage(img)" />
                            <button type="button" @click="deletePhotoFromExisting(p, idx)" class="btn-clear-img">✕</button>
                          </div>
                          <label v-if="!p.images || p.images.length < 5" class="add-photo-btn glass-card">
                            <span>+ Добавить фото</span>
                            <input type="file" @change="(e) => uploadPhotoToExisting(e, p)" accept="image/*" class="sr-only" />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination mt-3">
        <button @click="currentPage--" :disabled="currentPage === 1">←</button>
        <div class="pagination-pages">
          <button v-for="page in totalPages" :key="page" @click="currentPage = page" :class="{ active: currentPage === page }">{{ page }}</button>
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

const products = ref([]);
const categories = ref([]);
const brands = ref([]);
const searchQuery = ref('');
const uploading = ref(false);
const currentPage = ref(1);
const itemsPerPage = 20;
const expandedRow = ref(null);

const tempChar = reactive({ key: '', val: '' });
const tempTableChar = reactive({ key: '', val: '' });

const filters = reactive({ categoryId: 'all', brandId: 'all', onlyDiscount: false, sort: 'new' });
const newProduct = reactive({ 
    name: '', sku: '', price: 0, category_id: null, brand_id: null, 
    description: '', images: [], characteristics: {}, 
    discount_price: null, weight_kg: null, warranty_months: 12 
});

const loadData = async () => {
  try {
    const [pRes, cRes, bRes] = await Promise.all([
      axios.get(`/api/admin/products`, config),
      axios.get(`/api/admin/categories`, config),
      axios.get(`/api/admin/brands`, config)
    ]);
    products.value = pRes.data;
    categories.value = cRes.data;
    brands.value = bRes.data;
  } catch (e) { console.error('Ошибка загрузки данных товаров'); }
};

// --- ХАРАКТЕРИСТИКИ ---
const removeCharFromNew = (key) => {
  delete newProduct.characteristics[key];
};

const addCharToNew = () => {
    if (!tempChar.key || !tempChar.val) return;
    newProduct.characteristics[tempChar.key] = tempChar.val;
    tempChar.key = ''; tempChar.val = '';
};

const addCharToExisting = (p) => {
    if (!tempTableChar.key || !tempTableChar.val) return;
    if (!p.characteristics) p.characteristics = {};
    p.characteristics[tempTableChar.key] = tempTableChar.val;
    updateProduct(p);
    tempTableChar.key = ''; tempTableChar.val = '';
};

const deleteChar = (p, key) => {
    delete p.characteristics[key];
    updateProduct(p);
};

// --- МЕНЕДЖМЕНТ ФОТО ---
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  return url.split('/').pop();
};

const previewImage = (url) => window.open(url, '_blank');

const uploadPhoto = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  uploading.value = true;
  try {
    const res = await axios.post(`/api/upload/products`, formData, config);
    newProduct.images.push(res.data.url);
  } finally { uploading.value = false; }
};

const uploadPhotoToExisting = async (e, p) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await axios.post(`/api/upload/products`, formData, config);
    if (!p.images) p.images = [];
    p.images.push(res.data.url);
    await updateProduct(p);
  } catch (e) { alert('Ошибка загрузки'); }
};

const deletePhotoFromExisting = async (p, index) => {
  const url = p.images[index];
  const filename = getFilenameFromUrl(url);
  try {
    await axios.delete(`/api/storage/products/${filename}`, config).catch(() => {});
    p.images.splice(index, 1);
    await updateProduct(p);
  } catch (err) {
    alert('Ошибка удаления фото');
  }
};

// --- CRUD ---
const createProduct = async () => {
  try {
    const res = await axios.post(`/api/admin/products`, newProduct, config);
    products.value.unshift(res.data);
    alert('Товар успешно добавлен!');
    Object.assign(newProduct, { name: '', sku: '', price: 0, category_id: null, brand_id: null, description: '', images: [], characteristics: {}, discount_price: null, weight_kg: null });
  } catch (e) { alert('Ошибка при создании товара'); }
};

const updateProduct = async (p) => { 
  try { 
    const { brands, categories, product_stocks, ...payload } = p;
    await axios.put(`/api/admin/products/${p.id}`, payload, config); 
  } catch(e) { console.error("Update error", e); }
};

const deleteProduct = async (id) => {
  if (!confirm('Удалить товар навсегда?')) return;
  try {
    const p = products.value.find(item => item.id === id);
    if (p.images && p.images.length > 0) {
      for (const url of p.images) {
        const fname = getFilenameFromUrl(url);
        await axios.delete(`/api/storage/products/${fname}`, config).catch(() => {});
      }
    }
    await axios.delete(`/api/admin/products/${id}`, config);
    products.value = products.value.filter(p => p.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

// --- ФИЛЬТРЫ И ПАГИНАЦИЯ ---
const filteredProducts = computed(() => {
  let res = [...products.value];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.id.toString() === q);
  }
  if (filters.categoryId !== 'all') res = res.filter(p => p.category_id === filters.categoryId);
  if (filters.brandId !== 'all') res = res.filter(p => p.brand_id === filters.brandId);
  if (filters.onlyDiscount) res = res.filter(p => p.discount_price > 0);
  
  if (filters.sort === 'price-asc') res.sort((a, b) => a.price - b.price);
  else if (filters.sort === 'price-desc') res.sort((a, b) => b.price - a.price);
  else res.sort((a, b) => b.id - a.id);
  return res;
});

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / itemsPerPage));
const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredProducts.value.slice(start, start + itemsPerPage);
});

const toggleDetails = (id) => expandedRow.value = expandedRow.value === id ? null : id;
const resetFilters = () => {
  searchQuery.value = '';
  filters.categoryId = 'all'; filters.brandId = 'all';
  filters.onlyDiscount = false; filters.sort = 'new';
  currentPage.value = 1;
};

watch([() => filters.categoryId, () => filters.brandId, () => filters.onlyDiscount, searchQuery], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ (глобальный CSS используется для glass-card, btn и т.д.)
   ========================================================================== */
.admin-products {
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
  margin: 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  margin-top: 5px;
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

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin-bottom: 28px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group.full-width {
  grid-column: 1 / -1;
}
.form-group label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}

.flex-row {
  display: flex;
  gap: 10px;
}
.flex-row input {
  flex: 1;
}

.char-editor {
  padding: 15px;
  background: rgba(0,0,0,0.01);
}
.char-row, .char-add-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}
.char-key {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: rgba(0,0,0,0.05);
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-main);
}
:global(.dark) .char-key {
  background: rgba(255,255,255,0.05);
  color: #f8fafc;
}
.char-val {
  flex: 1.5;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: #fff;
  font-size: 0.85rem;
  color: #000;
}
:global(.dark) .char-val {
  background: #0f172a;
  color: #fff;
  border-color: #475569;
}

.btn-remove-char {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--danger);
  cursor: pointer;
}
.btn-add-char {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0 15px;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
}

.upload-gallery {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.preview-item {
  width: 100px;
  height: 100px;
  position: relative;
  padding: 5px;
}
.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
  border-radius: 8px;
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.file-label-big {
  width: 150px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-muted);
  border: 2px dashed var(--border-color);
  text-align: center;
}
.file-label-big:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.create-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.table-meta {
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 16px;
}
.admin-table-wrapper {
  overflow-x: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1100px;
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
.product-row:hover td {
  background: rgba(37, 99, 235, 0.02);
}
.product-row.is-expanded td {
  background: rgba(37, 99, 235, 0.05);
}

.col-id {
  width: 70px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}
.col-photo {
  width: 90px;
  text-align: center;
}
.product-img-box {
  width: 60px;
  height: 60px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  padding: 2px !important;
}
.product-img-box img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  cursor: zoom-in;
}

.inline-edit {
  background: transparent;
  border: 1px solid transparent;
  padding: 6px;
  border-radius: 6px;
  color: var(--text-main);
  width: 100%;
  font-weight: 500;
  transition: 0.2s;
}
.inline-edit:hover {
  background: rgba(0,0,0,0.03);
  border-color: var(--border-color);
}
.inline-edit:focus {
  background: var(--bg-card);
  border-color: var(--primary);
  outline: none;
}
.bold {
  font-weight: 800;
  font-size: 0.95rem;
}
.table-select {
  background: transparent;
  border: 1px solid transparent;
  padding: 6px;
  border-radius: 6px;
  width: 100%;
  font-weight: 700;
  cursor: pointer;
  color: var(--text-main);
}
.table-select.muted {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.price-edit-row {
  margin-bottom: 5px;
}
.price-val {
  font-weight: 900;
  color: var(--primary);
}
.discount-val {
  color: var(--danger);
  font-weight: 800;
}
.add-discount {
  font-size: 0.75rem;
  color: var(--primary);
  cursor: pointer;
  font-weight: 700;
  margin-top: 5px;
}
.remove-discount {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-weight: 700;
  margin-left: 5px;
}

.btn-action-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
  margin-right: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-action-circle.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.details-row td {
  padding: 0 !important;
  border-bottom: none;
}
.details-panel {
  margin: 15px 25px 30px 25px;
  padding: 25px;
  border-top: 3px solid var(--primary);
}
.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.details-grid .full-width {
  grid-column: 1 / -1;
}
.detail-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.gallery-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 10px;
}
.gallery-item {
  position: relative;
  width: 100px;
  height: 100px;
  padding: 4px;
  background: #fff;
  border-radius: 10px;
}
.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  background: #fff;
  border-radius: 6px;
}
.add-photo-btn {
  width: 120px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
  position: relative;
}
.add-photo-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}
.photo-count {
  position: absolute;
  bottom: -6px;
  right: -6px;
  background: var(--primary);
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid white;
}

/* Пагинация */
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

.text-right {
  text-align: right;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  align-items: flex-end;
}

@media (max-width: 900px) {
  .details-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 600px) {
  .admin-products {
    padding: 20px 15px;
  }
  .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>