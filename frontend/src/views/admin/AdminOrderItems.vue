<template>
  <div class="admin-sales-report animate-fade-in">
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
        <div class="form-group">
          <label>🔎 Поиск (Товар, SKU или № заказа)</label>
          <input v-model="searchQuery" placeholder="Введите название или артикул..." />
        </div>
        <div class="form-group">
          <label>📅 Период</label>
          <select v-model="dateFilter">
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
      <div class="table-meta text-muted mb-2">
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
                <router-link to="/admin/orders" class="order-link">
                  📦 Заказ #{{ item.order_id }}
                </router-link>
              </td>

              <td>
                <div class="product-cell">
                  <div class="thumb-wrap glass-card">
                    <img
                      :src="getProductImage(item)"
                      :alt="item.products?.name || 'Товар'"
                      class="mini-thumb"
                      @error="onImgError($event)"
                    />
                  </div>
                  <div class="p-info">
                    <strong>{{ item.products?.name || 'Товар удалён' }}</strong>
                    <code class="sku-tag">{{ item.products?.sku || '---' }}</code>
                  </div>
                </div>
              </td>

              <td class="text-center">
                <span class="badge">{{ item.quantity }} шт.</span>
              </td>

              <td>{{ Number(item.unit_price).toLocaleString() }} ₽</td>

              <td>
                <strong class="total-cell">
                  {{ (Number(item.unit_price) * item.quantity).toLocaleString() }} ₽
                </strong>
              </td>

              <td class="text-right">
                <button
                  @click="deleteItem(item.id)"
                  class="btn btn-danger btn-sm"
                  title="Удалить позицию"
                >🗑️</button>
              </td>
            </tr>

            <tr v-if="paginatedItems.length === 0">
              <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                Нет данных по заданным фильтрам
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination mt-3">
        <button @click="currentPage--" :disabled="currentPage === 1">←</button>
        <div class="pagination-pages">
          <button
            v-for="p in totalPages"
            :key="p"
            @click="currentPage = p"
            :class="{ active: currentPage === p }"
          >{{ p }}</button>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

// Заглушка в base64 — не зависит от файловой системы проекта
const FALLBACK_IMG =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDUiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NSA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDUiIGhlaWdodD0iNDUiIHJ4PSI4IiBmaWxsPSIjRjFGNUY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1NCUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5NEEzQjgiPvCfk7g8L3RleHQ+PC9zdmc+';

const items       = ref([]);
const searchQuery = ref('');
const dateFilter  = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

// ── Загрузка ─────────────────────────────────────────────────────────────────
const loadData = async () => {
  try {
    const res = await axios.get('/api/admin/order_items', config);
    items.value = res.data;
  } catch (e) {
    console.error('Ошибка загрузки данных продаж', e);
  }
};

// ── Изображение товара ───────────────────────────────────────────────────────
/*
  images в БД хранится как TEXT[] (массив строк).
  Supabase возвращает его по-разному в зависимости от версии клиента:
  - уже как JS Array → берём [0]
  - как строка вида '{"url1","url2"}' (PostgreSQL literal) → парсим
*/
const getProductImage = (item) => {
  const raw = item.products?.images;
  if (!raw) return FALLBACK_IMG;

  // Уже массив
  if (Array.isArray(raw) && raw.length > 0) return raw[0];

  // PostgreSQL-литерал: {"https://...","https://..."}
  if (typeof raw === 'string') {
    try {
      // Превращаем PG-формат в JSON-массив
      const jsonStr = raw.replace(/^\{/, '[').replace(/\}$/, ']');
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
      // Если строка сама по себе URL
      if (raw.startsWith('http')) return raw;
    }
  }

  return FALLBACK_IMG;
};

// При ошибке загрузки ставим заглушку и не повторяем попытку
const onImgError = (e) => {
  if (e.target.src !== FALLBACK_IMG) {
    e.target.src = FALLBACK_IMG;
  }
};

// ── CRUD ─────────────────────────────────────────────────────────────────────
const deleteItem = async (id) => {
  if (!confirm(
    'Вы уверены? Это изменит только запись состава заказа, но не итоговую сумму в самом заказе!'
  )) return;
  try {
    await axios.delete(`/api/admin/order_items/${id}`, config);
    items.value = items.value.filter(i => i.id !== id);
  } catch (e) {
    alert('Ошибка при удалении');
  }
};

// ── Фильтрация ───────────────────────────────────────────────────────────────
const filteredItems = computed(() => {
  let res = [...items.value];

  // Текстовый поиск
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(i =>
      (i.products?.name || '').toLowerCase().includes(q) ||
      (i.products?.sku  || '').toLowerCase().includes(q) ||
      String(i.order_id) === q
    );
  }

  // Фильтр по периоду
  if (dateFilter.value !== 'all') {
    const now = new Date();
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today   = startOf(now);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);

    res = res.filter(i => {
      // order_items не имеет created_at → используем порядок id как прокси,
      // или берём дату из связанного заказа если она есть
      const d = i.orders?.created_at ? new Date(i.orders.created_at) : null;
      if (!d) return true; // нет даты — не исключаем

      if (dateFilter.value === 'today')  return d >= today;
      if (dateFilter.value === 'week')   return d >= weekAgo;
      if (dateFilter.value === 'month')  return d >= monthAgo;
      return true;
    });
  }

  return res.sort((a, b) => b.id - a.id);
});

const totalRevenue = computed(() =>
  filteredItems.value.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0)
);

const totalPages = computed(() =>
  Math.ceil(filteredItems.value.length / itemsPerPage)
);
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredItems.value.slice(start, start + itemsPerPage);
});

const resetFilters = () => {
  searchQuery.value = '';
  dateFilter.value  = 'all';
  currentPage.value = 1;
};

watch([searchQuery, dateFilter], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
.admin-sales-report { padding: 40px 24px; }

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
.subtitle { color: var(--text-muted); font-size: 0.95rem; font-weight: 500; }

.stats-badge {
  padding: 12px 24px;
  border-radius: 60px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1rem;
  color: var(--success);
}

.admin-card { padding: 25px; margin-bottom: 30px; }

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.card-title { font-size: 1.2rem; font-weight: 900; margin: 0; }

.filter-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 25px;
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

.table-container { margin-top: 20px; }
.table-meta { font-size: 0.85rem; font-weight: 600; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-color);
}
.admin-table td {
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
  font-size: 0.95rem;
}
.item-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-id { width: 70px; font-weight: 800; color: var(--primary); font-family: monospace; }

.order-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 800;
  padding: 6px 12px;
  background: var(--primary-light);
  border-radius: 20px;
  font-size: 0.85rem;
  white-space: nowrap;
}
.order-link:hover { background: var(--primary); color: white; }

/* Ячейка товара */
.product-cell { display: flex; align-items: center; gap: 14px; }

.thumb-wrap {
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}
.mini-thumb {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}

.p-info { display: flex; flex-direction: column; gap: 3px; }
.sku-tag { font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }

.total-cell { color: var(--primary); font-size: 1.05rem; }
:global(.dark) .total-cell { color: #60a5fa; }

.text-right  { text-align: right; }
.text-center { text-align: center; }

/* Пагинация */
.pagination-pages { display: flex; gap: 8px; }
.pagination-pages button {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.pagination-pages button:hover { background: var(--primary-light); border-color: var(--primary); }
.pagination-pages button.active { background: var(--primary); color: white; border-color: var(--primary); }

@media (max-width: 768px) {
  .filter-grid { grid-template-columns: 1fr; }
  .header-row  { flex-direction: column; align-items: flex-start; }
}
</style>