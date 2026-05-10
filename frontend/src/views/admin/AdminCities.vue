<template>
  <div class="admin-cities animate-fade-in">
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
          <div class="form-group">
            <label>Название города *</label>
            <input v-model="newCity.name" placeholder="Напр. Новосибирск" required />
          </div>
          <div class="form-group">
            <label>Регион / Область</label>
            <input v-model="newCity.region" placeholder="Новосибирская обл." />
          </div>
          <div class="form-group">
            <label>Широта (Lat)</label>
            <input v-model.number="newCity.lat" type="number" step="0.000001" placeholder="55.0084" />
          </div>
          <div class="form-group">
            <label>Долгота (Lon)</label>
            <input v-model.number="newCity.lon" type="number" step="0.000001" placeholder="82.9357" />
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn btn-primary create-btn" :disabled="loading">
            <span v-if="loading" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
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
      <div class="form-group">
        <input v-model="searchQuery" placeholder="Поиск по названию или региону..." />
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
                <button @click="deleteCity(city.id)" class="btn btn-danger btn-sm">🗑️ Удалить</button>
              </td>
            </tr>
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
   УНИКАЛЬНЫЕ СТИЛИ АДМИНКИ ГОРОДОВ (глобальные классы уже применены)
   ========================================================================== */

.admin-cities {
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

/* Кнопка создания (глобальный btn + градиент) */
.create-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
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
.btn-text-link {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 800;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}

/* Таблица */
.admin-table-wrapper {
  overflow-x: auto;
}
.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 800px;
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
.city-row:hover td {
  background: rgba(37, 99, 235, 0.02);
}

.col-id {
  width: 80px;
  font-weight: 800;
  color: var(--primary);
  font-family: monospace;
}

.inline-edit {
  background: transparent;
  border: 1px solid transparent;
  padding: 6px 10px;
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
  border-color: var(--primary);
  background: var(--bg-card);
  outline: none;
}
.bold {
  font-weight: 800;
}

.coords-row {
  display: flex;
  align-items: center;
  gap: 5px;
}
.inline-edit.mini {
  width: 90px;
  font-family: monospace;
  font-size: 0.8rem;
}
.sep {
  font-weight: bold;
  color: var(--text-muted);
}

.text-right {
  text-align: right;
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

@media (max-width: 768px) {
  .header-row {
    flex-direction: column;
    align-items: flex-start;
  }
  .input-grid {
    grid-template-columns: 1fr;
  }
  .create-btn {
    width: 100%;
  }
}
</style>