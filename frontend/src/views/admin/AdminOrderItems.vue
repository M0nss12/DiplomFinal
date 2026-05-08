<template>
  <div class="admin-sales-report">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>📈 Журнал продаж (Позиции)</h1>
        <p class="subtitle">Полный список всех проданных товаров из всех заказов</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">💰</span>
        Выручка: <b>{{ totalRevenue.toLocaleString() }} ₽</b>
      </div>
    </div>

    <!-- 1. ФИЛЬТРЫ И ПОИСК -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Фильтрация продаж</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить</button>
      </div>
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔎 Поиск (Товар, SKU или № заказа)</label>
          <input v-model="searchQuery" placeholder="Введите название или артикул..." class="form-input" />
        </div>
        <div class="input-group">
          <label>📅 Период</label>
          <select v-model="dateFilter" class="form-input">
            <option value="all">За всё время</option>
            <option value="today">За сегодня</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 2. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta">
        <span class="meta-icon">📄</span>
        Всего продано позиций: <b>{{ filteredItems.length }}</b>
      </div>

      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Заказ</th>
              <th>Товар / Артикул</th>
              <th class="text-center">Кол-во</th>
              <th>Цена ед.</th>
              <th>Сумма</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedItems" :key="item.id" class="item-row">
              <td class="col-id">#{{ item.id }}</td>
              
              <td>
                <router-link :to="'/admin/orders'" class="order-link">
                  📦 Заказ #{{ item.order_id }}
                </router-link>
              </td>

              <td>
                <div class="product-cell">
                  <img :src="item.products?.images?.[0] || '/assets/images/no-photo.png'" class="mini-thumb glass-card" />
                  <div class="p-info">
                    <strong>{{ item.products?.name || 'Товар удален' }}</strong>
                    <code class="sku-tag">{{ item.products?.sku || '---' }}</code>
                  </div>
                </div>
              </td>

              <td class="text-center">
                <span class="qty-badge">{{ item.quantity }} шт.</span>
              </td>

              <td>{{ item.unit_price.toLocaleString() }} ₽</td>

              <td>
                <strong class="total-cell">{{ (item.unit_price * item.quantity).toLocaleString() }} ₽</strong>
              </td>

              <td class="text-right">
                <button @click="deleteItem(item.id)" class="btn-delete-small" title="Удалить позицию (только из отчета)">🗑️</button>
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
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const items = ref([]);
const searchQuery = ref('');
const dateFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

const loadData = async () => {
  try {
    // В server.js должен быть эндпоинт /api/admin/order_items
    const res = await axios.get(`/api/admin/order_items`, config);
    items.value = res.data;
  } catch (e) {
    console.error('Ошибка загрузки данных продаж');
  }
};

const deleteItem = async (id) => {
  if (!confirm('Вы уверены? Это изменит только запись в базе состава заказа, но не итоговую сумму в самом заказе!')) return;
  try {
    await axios.delete(`/api/admin/order_items/${id}`, config);
    items.value = items.value.filter(i => i.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const filteredItems = computed(() => {
  let res = [...items.value];
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(i => 
      (i.products?.name || '').toLowerCase().includes(q) || 
      (i.products?.sku || '').toLowerCase().includes(q) ||
      i.order_id.toString() === q
    );
  }
  
  // Логика фильтра по датам (если в ответе есть поле created_at от заказа)
  // Для этого в server.js запрос должен делать .select('*, products(*), orders(created_at)')
  
  return res.sort((a, b) => b.id - a.id);
});

const totalRevenue = computed(() => {
  return filteredItems.value.reduce((sum, i) => sum + (Number(i.unit_price) * i.quantity), 0);
});

const totalPages = computed(() => Math.ceil(filteredItems.value.length / itemsPerPage));
const paginatedItems = computed(() => filteredItems.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

const resetFilters = () => { searchQuery.value = ''; dateFilter.value = 'all'; currentPage.value = 1; };
watch([searchQuery, dateFilter], () => currentPage.value = 1);

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ПРОДАЖИ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-sales-report { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-sales-report { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 12px 24px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 1rem; color: var(--success, #10b981); }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; align-items: flex-end; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; font-size: 0.95rem; }
:global(.dark) .admin-table td { border-color: #334155; }

.item-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }

.order-link { color: var(--primary, #2563eb); text-decoration: none; font-weight: 800; padding: 6px 12px; background: rgba(37, 99, 235, 0.1); border-radius: 20px; font-size: 0.85rem; }
.order-link:hover { text-decoration: underline; background: var(--primary, #2563eb); color: white; }

.product-cell { display: flex; align-items: center; gap: 15px; }
.mini-thumb { width: 45px; height: 45px; object-fit: contain; padding: 4px; background: #fff; border-radius: 8px; }
.p-info { display: flex; flex-direction: column; gap: 2px; }
.sku-tag { font-size: 0.7rem; color: var(--text-muted, #94a3b8); font-weight: 700; text-transform: uppercase; }

.qty-badge { background: rgba(0,0,0,0.05); padding: 4px 12px; border-radius: 20px; font-weight: 800; font-size: 0.85rem; }
:global(.dark) .qty-badge { background: rgba(255,255,255,0.05); }

.total-cell { color: var(--primary, #2563eb); font-size: 1.1rem; }
:global(.dark) .total-cell { color: #60a5fa; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: none; width: 36px; height: 36px; border-radius: 50%; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; font-size: 1.1rem; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; border-color: #475569; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }
</style>