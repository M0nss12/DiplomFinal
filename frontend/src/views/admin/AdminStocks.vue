<template>
  <div class="admin-stocks">
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
      <h3 class="card-title">📦 Приходовать товар на склад</h3>
      <form @submit.prevent="createStock" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>Товар</label>
            <select v-model="newStock.product_id" required class="form-input">
              <option :value="null">-- Выберите товар --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.name }} (арт: {{ p.sku }})
              </option>
            </select>
          </div>
          <div class="input-group">
            <label>Склад (ПВЗ)</label>
            <select v-model="newStock.warehouse_id" required class="form-input">
              <option :value="null">-- Выберите склад --</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.cities?.name || w.city_name }} — {{ w.address }}
              </option>
            </select>
          </div>
          <div class="input-group mini">
            <label>Кол-во</label>
            <input v-model.number="newStock.quantity" type="number" required class="form-input" />
          </div>
          <div class="input-group mini">
            <label>Место (полка)</label>
            <input v-model="newStock.shelf_location" placeholder="Напр. A-1" class="form-input" />
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn-admission" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner-small"></span>
            <span v-else>✅ Добавить на склад</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. УМНАЯ ФИЛЬТРАЦИЯ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔍 Поиск товара/SKU</label>
          <input v-model="searchQuery" placeholder="Название или артикул..." class="form-input" />
        </div>

        <div class="input-group">
          <label>Склад</label>
          <select v-model="filters.warehouseId" class="form-input">
            <option value="all">Все склады</option>
            <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.cities?.name || w.city_name }} ({{ w.address }})
            </option>
          </select>
        </div>

        <div class="input-group">
          <label>Категория</label>
          <select v-model="filters.categoryId" class="form-input">
            <option value="all">Все категории</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <div class="input-group">
          <label>Сортировка</label>
          <select v-model="filters.sort" class="form-input">
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
      <div class="table-meta">
        <span class="meta-icon">📄</span>
        Страница {{ currentPage }} из {{ totalPages || 1 }}
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
                <button @click="deleteStock(stock.id)" class="btn-delete-small">🗑️ Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredStocks.length === 0" class="empty-state glass-card">
        <div class="empty-icon">📦</div>
        <h3>Остатки не найдены</h3>
        <p>Попробуйте изменить параметры фильтрации.</p>
      </div>
    </div>

    <!-- 4. ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination-wrapper">
      <button @click="currentPage--" :disabled="currentPage === 1" class="p-btn glass-card">←</button>
      <div class="p-numbers">
        <button v-for="page in totalPages" :key="page" 
                @click="currentPage = page"
                class="glass-card"
                :class="{ active: currentPage === page }">
          {{ page }}
        </button>
      </div>
      <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-btn glass-card">→</button>
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
    alert('Товар успешно оприходован');
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
   АДМИНКА: СКЛАДСКОЙ УЧЕТ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-stocks { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-stocks { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.9rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.admission-card { border-left: 5px solid var(--success, #10b981); background: rgba(16, 185, 129, 0.03); }
:global(.dark) .admission-card { background: rgba(16, 185, 129, 0.05); }

.card-title { font-size: 1.25rem; font-weight: 900; margin-top: 0; margin-bottom: 25px; color: var(--text-main, #0f172a); }
:global(.dark) .card-title { color: #f8fafc; }

/* ИНПУТЫ */
.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #64748b); margin-bottom: 8px; }

/* КНОПКИ */
.btn-admission {
  background: var(--success, #10b981); color: white; border: none; padding: 14px 30px;
  border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); display: flex; align-items: center; gap: 10px;
}
.btn-admission:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(16, 185, 129, 0.4); background: #059669; }
.btn-admission:disabled { opacity: 0.6; cursor: not-allowed; }

.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }

.spinner-small { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

/* ФИЛЬТРЫ */
.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-grid { display: grid; grid-template-columns: 2fr 1.2fr 1.2fr 1.2fr; gap: 20px; align-items: flex-end; }
.filter-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 25px; }

.danger-text { color: var(--danger, #ef4444); font-weight: 800; font-size: 0.85rem; }

/* ТАБЛИЦА */
.table-container { margin-top: 16px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; display: flex; align-items: center; gap: 8px; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 12px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; transition: background 0.2s; }
:global(.dark) .admin-table td { border-color: #334155; }

.stock-row:hover td { background: rgba(37, 99, 235, 0.02); }
.row-zero { background: rgba(239, 68, 68, 0.03); }
:global(.dark) .row-zero { background: rgba(239, 68, 68, 0.05); }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }

/* РЕДАКТИРОВАНИЕ В ТАБЛИЦЕ */
.inline-edit { background: transparent; border: 1px solid transparent; padding: 8px; border-radius: 8px; color: var(--text-main, #0f172a); width: 100%; transition: 0.2s; font-size: 0.9rem; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #cbd5e1); }
:global(.dark) .inline-edit:hover { background: rgba(255,255,255,0.03); border-color: #475569; }
.inline-edit:focus { border-color: var(--primary, #2563eb); background: var(--bg-card, #fff); outline: none; }

.table-select { font-weight: 700; cursor: pointer; }
.table-select.muted { color: var(--text-muted, #64748b); font-size: 0.8rem; font-weight: 500; }

.qty-input { font-weight: 900; font-size: 1.1rem; color: var(--primary, #2563eb); width: 80px; }
.warning-input { color: var(--danger, #ef4444) !important; font-weight: 900; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 6px 14px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card, #fff); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { background: #1e293b; border-color: #334155; color: #f8fafc; }
.p-btn:hover:not(:disabled) { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); background: rgba(37, 99, 235, 0.05); }

.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

/* ЧЕКБОКСЫ */
.custom-checkbox { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 0.85rem; }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; background: transparent; border: 2px solid var(--border-color, #cbd5e1); border-radius: 6px; position: relative; transition: all 0.2s; }
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

/* ПУСТОЕ СОСТОЯНИЕ */
.empty-state { text-align: center; padding: 60px; color: var(--text-muted, #64748b); font-weight: 600; }
.empty-icon { font-size: 4rem; margin-bottom: 15px; opacity: 0.5; }

/* АДАПТИВНОСТЬ */
@media (max-width: 900px) { .filter-grid { grid-template-columns: 1fr; } .input-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .admin-stocks { padding: 24px 16px; } .header-row { flex-direction: column; align-items: flex-start; } .p-numbers { display: none; } }
</style>