<template>
  <div class="admin-wishlist animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>❤️ Мониторинг избранного</h1>
        <p class="subtitle">Анализ интересов пользователей: какие товары чаще всего сохраняют «на потом»</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📈</span>
        Всего сохранений: <b>{{ filteredWishlist.length }}</b>
      </div>
    </div>

    <!-- ФИЛЬТРЫ И ПОИСК -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Фильтрация журнала</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="form-group">
          <label>🔎 Поиск (Товар, Артикул, Пользователь)</label>
          <input v-model="searchQuery" placeholder="Введите название детали или имя клиента..." />
        </div>
        <div class="form-group">
          <label>📅 Период добавления</label>
          <select v-model="timeFilter">
            <option value="all">За всё время</option>
            <option value="today">За сегодня</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
          </select>
        </div>
      </div>
    </section>

    <!-- ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Страница {{ currentPage }} из {{ totalPages || 1 }} (показано {{ paginatedWishlist.length }} из {{ filteredWishlist.length }})
      </div>

      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Пользователь</th>
              <th>Товар</th>
              <th>Артикул (SKU)</th>
              <th>Дата добавления</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedWishlist" :key="item.id" class="wish-row">
              <td class="col-id">#{{ item.id }}</td>
              
              <td>
                <div class="user-cell">
                  <img :src="item.users?.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png'" class="mini-avatar glass-card" />
                  <div class="u-info">
                    <strong>{{ getFullName(item.users) }}</strong>
                    <small>{{ item.users?.email || item.users?.phone_number }}</small>
                  </div>
                </div>
              </td>

              <td>
                <router-link :to="'/product/' + item.product_id" class="product-link">
                  {{ item.products?.name }}
                </router-link>
              </td>

              <td>
                <code class="sku-tag">{{ item.products?.sku }}</code>
              </td>

              <td>
                <span class="date-text">{{ formatDateTime(item.added_at) }}</span>
              </td>

              <td class="text-right">
                <button @click="removeFromWishlist(item.id)" class="btn btn-danger btn-sm">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ПУСТОЕ СОСТОЯНИЕ -->
      <div v-if="filteredWishlist.length === 0" class="empty-state glass-card">
        <div class="empty-state-icon">💔</div>
        <h3>Записей не найдено</h3>
        <p>Пользователи пока не добавили товары в избранное или фильтры слишком строгие.</p>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination mt-3">
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
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const wishlist = ref([]);
const searchQuery = ref('');
const timeFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

const loadData = async () => {
  try {
    const res = await axios.get(`/api/admin/wishlists`, config);
    wishlist.value = res.data;
  } catch (e) {
    console.error('Ошибка загрузки избранного');
  }
};

const getFullName = (u) => {
  if (!u) return '';
  return [u.last_name, u.first_name].filter(Boolean).join(' ') || 'Без имени';
};

const formatDateTime = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const removeFromWishlist = async (id) => {
  if (!confirm('Удалить этот товар из избранного?')) return;
  try {
    await axios.delete(`/api/admin/wishlists/${id}`, config);
    wishlist.value = wishlist.value.filter(item => item.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const filteredWishlist = computed(() => {
  let res = [...wishlist.value];
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(item => {
      const pName = (item.products?.name || '').toLowerCase();
      const pSku = (item.products?.sku || '').toLowerCase();
      const uName = getFullName(item.users).toLowerCase();
      return pName.includes(q) || pSku.includes(q) || uName.includes(q);
    });
  }

  if (timeFilter.value !== 'all') {
    const now = new Date();
    res = res.filter(item => {
      const added = new Date(item.added_at);
      if (timeFilter.value === 'today') return added.toDateString() === now.toDateString();
      if (timeFilter.value === 'week') return (now - added) < 7 * 24 * 60 * 60 * 1000;
      if (timeFilter.value === 'month') return (now - added) < 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }

  return res.sort((a, b) => b.id - a.id);
});

const totalPages = computed(() => Math.ceil(filteredWishlist.value.length / itemsPerPage));
const paginatedWishlist = computed(() => filteredWishlist.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

const resetFilters = () => { searchQuery.value = ''; timeFilter.value = 'all'; currentPage.value = 1; };
watch([searchQuery, timeFilter], () => currentPage.value = 1);

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ АДМИНКИ ИЗБРАННОГО (глобальные классы уже применены)
   ========================================================================== */

.admin-wishlist {
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
}

.stats-badge {
  padding: 12px 24px;
  border-radius: 60px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.admin-card {
  padding: 25px;
  margin-bottom: 30px;
}
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
}

.table-container {
  margin-top: 20px;
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
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-color);
}
.admin-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}
.wish-row:hover td {
  background: rgba(37, 99, 235, 0.02);
}

.col-id {
  width: 70px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mini-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}
.u-info strong {
  display: block;
  font-size: 0.9rem;
  color: var(--text-main);
}
.u-info small {
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}

.product-link {
  color: var(--primary);
  font-weight: 700;
  text-decoration: none;
  font-size: 0.95rem;
}
.product-link:hover {
  text-decoration: underline;
}
.sku-tag {
  background: rgba(0,0,0,0.05);
  padding: 4px 8px;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
}

.date-text {
  font-size: 0.85rem;
  color: var(--text-muted);
  font-weight: 600;
}

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

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-grid {
    grid-template-columns: 1fr;
  }
  .pagination-pages {
    display: none;
  }
}
</style>