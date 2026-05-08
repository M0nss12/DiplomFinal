<template>
  <div class="admin-cities">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>🏙️ Управление городами</h1>
        <p class="subtitle">География логистической сети ApexDrive</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">🌍</span>
        Всего городов: <b>{{ filteredCities.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА ДОБАВЛЕНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить новый город</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createCity" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>Название города *</label>
            <input v-model="newCity.name" placeholder="Напр. Новосибирск" required class="form-input" />
          </div>
          <div class="input-group">
            <label>Регион / Область</label>
            <input v-model="newCity.region" placeholder="Новосибирская обл." class="form-input" />
          </div>
          <div class="input-group">
            <label>Широта (Lat)</label>
            <input v-model.number="newCity.lat" type="number" step="0.000001" placeholder="55.0084" class="form-input" />
          </div>
          <div class="input-group">
            <label>Долгота (Lon)</label>
            <input v-model.number="newCity.lon" type="number" step="0.000001" placeholder="82.9357" class="form-input" />
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner-small"></span>
            <span v-else>➕ Создать город</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск</h3>
        <button @click="searchQuery = ''" class="btn-text-link">Сбросить</button>
      </div>
      <div class="input-group">
        <input v-model="searchQuery" placeholder="Поиск по названию или региону..." class="form-input" />
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Название города</th>
              <th>Регион</th>
              <th>Координаты (Lat, Lon)</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="city in paginatedCities" :key="city.id" class="city-row">
              <td class="col-id">#{{ city.id }}</td>
              
              <td>
                <input v-model="city.name" @change="updateCity(city)" class="inline-edit bold" />
              </td>

              <td>
                <input v-model="city.region" @change="updateCity(city)" class="inline-edit" placeholder="Не указан" />
              </td>

              <td>
                <div class="coords-row">
                  <input v-model.number="city.lat" @change="updateCity(city)" type="number" step="0.0001" class="inline-edit mini" />
                  <span class="sep">,</span>
                  <input v-model.number="city.lon" @change="updateCity(city)" type="number" step="0.0001" class="inline-edit mini" />
                </div>
              </td>

              <td class="text-right">
                <button @click="deleteCity(city.id)" class="btn-delete-small">🗑️ Удалить</button>
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

const cities = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const currentPage = ref(1);
const itemsPerPage = 20;

const newCity = reactive({ name: '', region: '', lat: null, lon: null });

const loadCities = async () => {
  try {
    const res = await axios.get(`/api/admin/cities`, config);
    cities.value = res.data;
  } catch (e) { console.error('Ошибка загрузки городов'); }
};

const createCity = async () => {
  loading.value = true;
  try {
    const res = await axios.post(`/api/admin/cities`, newCity, config); // Здесь нужен эндпоинт, который мы сейчас добавим в server.js или используем универсальный PUT/POST если он есть
    await loadCities();
    Object.assign(newCity, { name: '', region: '', lat: null, lon: null });
    alert('Город добавлен');
  } catch (e) { alert('Ошибка при создании города'); }
  finally { loading.value = false; }
};

const updateCity = async (city) => {
  try {
    await axios.put(`/api/admin/cities/${city.id}`, city, config);
  } catch (e) { console.error('Ошибка сохранения'); }
};

const deleteCity = async (id) => {
  if (!confirm('Удалить город? Это может повлиять на привязанные к нему склады!')) return;
  try {
    await axios.delete(`/api/admin/cities/${id}`, config);
    cities.value = cities.value.filter(c => c.id !== id);
  } catch (e) { alert('Ошибка удаления (возможно, город используется)'); }
};

const filteredCities = computed(() => {
  let res = [...cities.value];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    res = res.filter(c => c.name.toLowerCase().includes(q) || (c.region && c.region.toLowerCase().includes(q)));
  }
  return res;
});

const totalPages = computed(() => Math.ceil(filteredCities.value.length / itemsPerPage));
const paginatedCities = computed(() => filteredCities.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

watch(searchQuery, () => currentPage.value = 1);
onMounted(loadCities);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ГОРОДА (GLASSMORPHISM & DARK MODE)
   ========================================================================== */

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-cities { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-cities { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; margin-top: 5px; }

/* ФОРМА */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; display: block;}

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; }

.form-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

.spinner-small { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ТАБЛИЦА */
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.city-row:hover td { background: rgba(37, 99, 235, 0.02); }

.col-id { width: 80px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }

.inline-edit { background: transparent; border: 1px solid transparent; padding: 6px 10px; border-radius: 6px; color: var(--text-main, #0f172a); width: 100%; font-weight: 500; transition: 0.2s; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #cbd5e1); }
.inline-edit:focus { border-color: var(--primary, #2563eb); background: var(--bg-card, #fff); outline: none; }
.bold { font-weight: 800; }

.coords-row { display: flex; align-items: center; gap: 5px; }
.inline-edit.mini { width: 90px; font-family: monospace; font-size: 0.8rem; }
.sep { font-weight: bold; color: var(--text-muted, #94a3b8); }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers { display: flex; gap: 8px; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

.text-right { text-align: right; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }

@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr; }
  .form-footer { width: 100%; }
  .btn-primary { width: 100%; }
}
</style>