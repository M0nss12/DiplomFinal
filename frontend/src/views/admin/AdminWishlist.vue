<template>
  <div class="admin-wishlist">
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

    <!-- 1. ФОРМА ДОБАВЛЕНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить товар в избранное</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createWishlistItem" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>👤 Пользователь</label>
            <select v-model="newItem.user_id" required class="form-input">
              <option :value="null" disabled>-- Выберите --</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ getUserFullName(u) }} ({{ u.email || u.phone_number || u.id }})
              </option>
            </select>
          </div>
          <div class="input-group">
            <label>🛒 Товар</label>
            <select v-model="newItem.product_id" required class="form-input">
              <option :value="null" disabled>-- Выберите --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} ({{ p.sku }})</option>
            </select>
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn-primary" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner-small"></span>
            <span v-else>❤️ Добавить в избранное</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ И ПОИСК -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Фильтрация журнала</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔎 Поиск (Товар, Артикул, Пользователь)</label>
          <input v-model="searchQuery" placeholder="Введите название детали или имя клиента..." class="form-input" />
        </div>
        <div class="input-group">
          <label>📅 Период добавления</label>
          <select v-model="timeFilter" class="form-input">
            <option value="all">За всё время</option>
            <option value="today">За сегодня</option>
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
          </select>
        </div>
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
                    <strong>{{ getUserFullName(item.users) }}</strong>
                    <small>{{ item.users?.email || item.users?.phone_number }}</small>
                  </div>
                </div>
              </td>

              <td>
                <router-link :to="'/product/' + item.product_id" class="product-link">
                  {{ item.products?.name || 'Товар удален' }}
                </router-link>
              </td>

              <td>
                <code class="sku-tag">{{ item.products?.sku || '---' }}</code>
              </td>

              <td>
                <span class="date-text">{{ formatDateTime(item.added_at) }}</span>
              </td>

              <td class="text-right">
                <button @click="removeFromWishlist(item.id)" class="btn-delete-small" title="Удалить из избранного пользователя">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ПУСТОЕ СОСТОЯНИЕ -->
      <div v-if="filteredWishlist.length === 0" class="empty-state glass-card">
        <div class="empty-icon">💔</div>
        <h3>Записей не найдено</h3>
        <p>Пользователи пока не добавили товары в избранное или фильтры слишком строгие.</p>
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

const wishlist = ref([]);
const users = ref([]);
const products = ref([]);
const loadingAction = ref(false);
const searchQuery = ref('');
const timeFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 20;

const newItem = reactive({
  user_id: null,
  product_id: null
});

const loadData = async () => {
  try {
    const [wRes, uRes, pRes] = await Promise.all([
      axios.get(`/api/admin/wishlists`, config),
      axios.get(`/api/admin/users`, config),
      axios.get(`/api/admin/products`, config)
    ]);
    wishlist.value = wRes.data;
    users.value = uRes.data;
    products.value = pRes.data;
  } catch (e) {
    console.error('Ошибка загрузки данных');
  }
};

const getUserFullName = (u) => {
  if (!u) return '';
  return `${u.last_name || ''} ${u.first_name || ''}`.trim();
};

const formatDateTime = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const createWishlistItem = async () => {
  if (!newItem.user_id || !newItem.product_id) return alert('Выберите пользователя и товар');
  loadingAction.value = true;
  try {
    const res = await axios.post(`/api/admin/wishlists`, newItem, config);
    wishlist.value.unshift(res.data);
    // сброс товара, пользователь остаётся для удобства
    newItem.product_id = null;
    alert('Товар добавлен в избранное');
  } catch (e) {
    alert(e.response?.data?.error || 'Ошибка добавления');
  } finally {
    loadingAction.value = false;
  }
};

const removeFromWishlist = async (id) => {
  if (!confirm('Удалить эту позицию из избранного пользователя?')) return;
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
      const uName = getUserFullName(item.users).toLowerCase();
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
/* Все существующие стили + новый класс для формы */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-wishlist { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-wishlist { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 12px 24px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 24px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.form-footer { display: flex; justify-content: flex-end; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: flex; align-items: center; gap: 10px;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-wishlist { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-wishlist { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 12px 24px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 25px; align-items: flex-end; }

/* ИНПУТЫ */
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
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.wish-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }

/* Пользователь */
.user-cell { display: flex; align-items: center; gap: 12px; }
.mini-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.u-info strong { display: block; font-size: 0.9rem; color: var(--text-main, #0f172a); }
:global(.dark) .u-info strong { color: #f8fafc; }
.u-info small { color: var(--text-muted, #94a3b8); font-size: 0.75rem; font-weight: 600; }

/* Товар */
.product-link { color: var(--primary, #2563eb); font-weight: 700; text-decoration: none; font-size: 0.95rem; }
.product-link:hover { text-decoration: underline; }
.sku-tag { background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; font-weight: 700; color: var(--text-muted, #64748b); }

.date-text { font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: none; width: 36px; height: 36px; border-radius: 50%; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; font-size: 1.1rem; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: scale(1.1); }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

/* ПУСТОЕ СОСТОЯНИЕ */
.empty-state { text-align: center; padding: 60px; color: var(--text-muted, #64748b); font-weight: 600; }
.empty-icon { font-size: 4rem; margin-bottom: 15px; opacity: 0.5; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; }

@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .filter-grid { grid-template-columns: 1fr; }
  .p-numbers { display: none; }
}
</style>