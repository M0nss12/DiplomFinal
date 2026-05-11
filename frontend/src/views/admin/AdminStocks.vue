<template>
  <div class="admin-stocks animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>📊 Управление остатками</h1>
        <p class="subtitle">Учет запасов товаров на ПВЗ и региональных складах</p>
      </div>
      <div class="stats-badge glass-card">
        Записей: <b>{{ filteredStocks.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА ПРИЕМКИ ТОВАРА -->
    <section class="admin-card admission-card glass-card">
      <h3 class="card-title">📦 Приход товара на склад</h3>
      <form @submit.prevent="createStock" class="admin-form">
        <div class="input-grid">
          <div class="form-group">
            <label>Товар</label>
            <select v-model="newStock.product_id" required>
              <option :value="null">-- Выберите товар --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} (арт: {{ p.sku }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Склад (ПВЗ)</label>
            <select v-model="newStock.warehouse_id" required>
              <option :value="null">-- Выберите склад --</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.cities?.name || w.city_name }} — {{ w.address }}
              </option>
            </select>
          </div>
          <div class="form-group mini">
            <label>Кол-во</label>
            <input v-model.number="newStock.quantity" type="number" required />
          </div>
          <div class="form-group mini">
            <label>Место (полка)</label>
            <input v-model="newStock.shelf_location" placeholder="Напр. A-1" />
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn btn-success admission-btn" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
            <span v-else>✅ Добавить на склад</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. УМНАЯ ФИЛЬТРАЦИЯ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-grid">
        <div class="form-group">
          <label>🔍 Поиск товара/SKU</label>
          <input v-model="searchQuery" placeholder="Название или артикул..." />
        </div>
        <div class="form-group">
          <label>Склад</label>
          <select v-model="filters.warehouseId">
            <option value="all">Все склады</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.cities?.name || w.city_name }} ({{ w.address }})
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>Категория</label>
          <select v-model="filters.categoryId">
            <option value="all">Все категории</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Сортировка</label>
          <select v-model="filters.sort">
            <option value="product-name">По названию</option>
            <option value="qty-asc">Мало на складе ↑</option>
            <option value="qty-desc">Много на складе ↓</option>
          </select>
        </div>
      </div>

      <div class="filter-footer">
        <label class="custom-checkbox danger-text">
          <input type="checkbox" v-model="filters.onlyEmpty" />
          <span class="checkmark"></span>
          <span>ТОЛЬКО НУЛЕВЫЕ ОСТАТКИ</span>
        </label>
        <button @click="resetFilters" class="btn-text-link">🧹 Сбросить всё</button>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Показано {{ paginatedStocks.length }} из {{ filteredStocks.length }} записей (страница {{ currentPage }} из {{ totalPages }})
      </div>

      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Товар / Артикул</th>
              <th>Склад / Город</th>
              <th class="text-center">Количество</th>
              <th>Место</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="stock in paginatedStocks" :key="stock.id" class="stock-row" :class="{ 'row-zero': stock.quantity === 0 }">
              <td class="col-id">#{{ stock.id }}</td>
              
              <td>
                <select v-model="stock.product_id" @change="updateStock(stock)" class="inline-edit table-select bold">
                  <option v-for="p in products" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.sku }})
                  </option>
                </select>
              </td>

              <td>
                <select v-model="stock.warehouse_id" @change="updateStock(stock)" class="inline-edit table-select muted">
                  <option v-for="w in warehouses" :key="w.id" :value="w.id">
                    {{ w.cities?.name || w.city_name }} ({{ w.address }})
                  </option>
                </select>
              </td>

              <td class="text-center">
                <input v-model.number="stock.quantity" type="number" 
                       @change="updateStock(stock)" 
                       class="inline-edit qty-input text-center" 
                       :class="{ 'warning-input': stock.quantity === 0 }" />
              </td>

              <td>
                <input v-model="stock.shelf_location" 
                       @change="updateStock(stock)" 
                       class="inline-edit shelf-input" 
                       placeholder="---" />
              </td>

              <td class="text-right">
                <button @click="deleteStock(stock.id)" class="btn btn-danger btn-sm">🗑️ Удалить</button>
              </td>
            </tr>
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

const stocks = ref([]);
const products = ref([]);
const warehouses = ref([]);
const categories = ref([]);
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;
const loadingAction = ref(false);

const filters = reactive({
  warehouseId: 'all',
  categoryId: 'all',
  onlyEmpty: false,
  sort: 'product-name'
});

const loadData = async () => {
  try {
    const [sRes, pRes, wRes, cRes] = await Promise.all([
      axios.get(`/api/admin/product_stocks`, config),
      axios.get(`/api/admin/products`, config),
      axios.get(`/api/admin/warehouses`, config),
      axios.get(`/api/admin/categories`, config)
    ]);
    stocks.value = sRes.data;
    products.value = pRes.data;
    warehouses.value = wRes.data;
    categories.value = cRes.data;
  } catch (e) { console.error('Ошибка загрузки данных склада'); }
};

const getProductName = (id) => products.value.find(p => p.id === id)?.name || '---';

const resetFilters = () => {
  searchQuery.value = ''; filters.warehouseId = 'all'; filters.categoryId = 'all';
  filters.onlyEmpty = false; filters.sort = 'product-name'; currentPage.value = 1;
};

const filteredStocks = computed(() => {
  let res = [...stocks.value];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(s => {
      const p = products.value.find(item => item.id === s.product_id);
      return p?.name.toLowerCase().includes(q) || p?.sku.toLowerCase().includes(q);
    });
  }
  if (filters.warehouseId !== 'all') res = res.filter(s => s.warehouse_id === filters.warehouseId);
  if (filters.categoryId !== 'all') {
      res = res.filter(s => {
          const p = products.value.find(item => item.id === s.product_id);
          return p?.category_id === filters.categoryId;
      });
  }
  if (filters.onlyEmpty) res = res.filter(s => s.quantity === 0);
  
  if (filters.sort === 'product-name') res.sort((a, b) => getProductName(a.product_id).localeCompare(getProductName(b.product_id)));
  else if (filters.sort === 'qty-desc') res.sort((a, b) => b.quantity - a.quantity);
  else if (filters.sort === 'qty-asc') res.sort((a, b) => a.quantity - b.quantity);
  
  return res;
});

const totalPages = computed(() => Math.ceil(filteredStocks.value.length / itemsPerPage));
const paginatedStocks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredStocks.value.slice(start, start + itemsPerPage);
});

watch([searchQuery, filters], () => currentPage.value = 1);

const newStock = reactive({ product_id: null, warehouse_id: null, quantity: 0, shelf_location: '' });
const createStock = async () => {
  if (!newStock.product_id || !newStock.warehouse_id) return alert('Выберите товар и склад!');
  loadingAction.value = true;
  try {
    const res = await axios.post(`/api/admin/product_stocks`, newStock, config);
    stocks.value.unshift(res.data);
    newStock.quantity = 0; newStock.shelf_location = '';
    alert('Товар успешно оформлен');
  } catch (e) { alert('Ошибка при сохранении'); }
  finally { loadingAction.value = false; }
};

const updateStock = async (stock) => {
  try { 
    // Очищаем объект от вложенных данных перед отправкой в БД
    const { products, warehouses, ...payload } = stock;
    await axios.put(`/api/admin/product_stocks/${stock.id}`, payload, config); 
  } catch (e) { console.error("Update error", e); }
};

const deleteStock = async (id) => {
  if (!confirm('Удалить запись об остатке товара?')) return;
  try {
    await axios.delete(`/api/admin/product_stocks/${id}`, config);
    stocks.value = stocks.value.filter(s => s.id !== id);
  } catch (e) { alert('Ошибка удаления'); }
};

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ АДМИНКИ СКЛАДА (глобальный CSS используется)
   ========================================================================== */

.admin-stocks {
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
}

.stats-badge {
  padding: 10px 20px;
  border-radius: 60px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.admin-card {
  padding: 28px;
  margin-bottom: 32px;
}
.admission-card {
  border-left: 5px solid var(--success);
  background: rgba(16, 185, 129, 0.03);
}
:global(.dark) .admission-card {
  background: rgba(16, 185, 129, 0.05);
}

.card-title {
  font-size: 1.25rem;
  font-weight: 900;
  margin-top: 0;
  margin-bottom: 25px;
  color: var(--text-main);
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.form-group label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
}
.mini {
  max-width: 140px;
}

.form-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* Кнопка приёмки (глобальный btn-success + небольшой градиент) */
.admission-btn {
  background: linear-gradient(135deg, var(--success), #059669);
  border: none;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.admission-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4);
}

/* Фильтры */
.filter-section {
  background: rgba(0,0,0,0.01);
  border-style: dashed;
}
.filter-grid {
  display: grid;
  grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr;
  gap: 20px;
  align-items: flex-end;
}
.filter-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 25px;
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

/* Чекбокс "только нулевые" (локальный) */
.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-weight: 700;
  font-size: 0.85rem;
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
  background: var(--danger);
  border-color: var(--danger);
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
.danger-text {
  color: var(--danger);
  font-weight: 800;
  font-size: 0.85rem;
}

/* Таблица */
.table-container {
  margin-top: 16px;
}
.table-meta {
  font-size: 0.85rem;
  font-weight: 600;
}
.admin-table-wrapper {
  overflow-x: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
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
  padding: 12px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  transition: background 0.2s;
}
.stock-row:hover td {
  background: rgba(37, 99, 235, 0.02);
}
.row-zero {
  background: rgba(239, 68, 68, 0.03);
}
:global(.dark) .row-zero {
  background: rgba(239, 68, 68, 0.05);
}

.col-id {
  width: 70px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}

/* Инлайн-редактирование */
.inline-edit {
  background: transparent;
  border: 1px solid transparent;
  padding: 8px;
  border-radius: 8px;
  color: var(--text-main);
  width: 100%;
  transition: 0.2s;
  font-size: 0.9rem;
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
  border-color: var(--primary);
  background: var(--bg-card);
  outline: none;
}
.table-select {
  font-weight: 700;
  cursor: pointer;
}
.table-select.muted {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
}
.qty-input {
  font-weight: 900;
  font-size: 1.1rem;
  color: var(--primary);
  width: 80px;
}
.warning-input {
  color: var(--danger) !important;
  font-weight: 900;
}
.text-center { text-align: center; }
.text-right { text-align: right; }

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

@media (max-width: 900px) {
  .filter-grid { grid-template-columns: 1fr; }
  .input-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .admin-stocks { padding: 24px 16px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .pagination-pages { display: none; }
}
</style>