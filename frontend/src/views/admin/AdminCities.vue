<template>
  <div class="admin-logistics-dashboard animate-fade-in">
    <!-- ГЛОБАЛЬНАЯ ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>🌍 География и Логистика</h1>
        <p class="subtitle">Управление логистической сетью, городами присутствия и пунктами выдачи</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">🏢</span>
        Городов: <b>{{ cities.length }}</b> | Точек: <b>{{ warehouses.length }}</b>
      </div>
    </div>

    <!-- НАВИГАЦИЯ ПО ВКЛАДКАМ -->
    <div class="admin-tabs glass-card">
      <button :class="{ active: currentTab === 'cities' }" @click="currentTab = 'cities'">
        🏙️ Города присутствия
      </button>
      <button :class="{ active: currentTab === 'warehouses' }" @click="currentTab = 'warehouses'">
        📍 Склады и ПВЗ
      </button>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 1: ГОРОДА -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'cities'">
      <!-- ФОРМА СОЗДАНИЯ ГОРОДА -->
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Добавить новый город</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createCity" class="admin-form">
          <div class="input-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
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
          <div class="form-footer" style="justify-content: flex-end; margin-top: 20px;">
            <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
              <span v-if="loadingAction" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
              <span v-else>➕ Создать город</span>
            </button>
          </div>
        </form>
      </section>

      <!-- ФИЛЬТРЫ ГОРОДОВ -->
      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Поиск по базе городов</h3>
          <button @click="citiesSearch = ''; citiesPage = 1;" class="btn-text-link">Сбросить</button>
        </div>
        <div class="form-group" style="max-width: 500px;">
          <input v-model="citiesSearch" placeholder="Поиск по названию или региону..." />
        </div>
      </section>

      <!-- ТАБЛИЦА ГОРОДОВ -->
      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Показано {{ paginatedCities.length }} из {{ filteredCities.length }} городов
        </div>
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
                <td><input v-model="city.name" @change="updateCity(city)" class="inline-edit bold" /></td>
                <td><input v-model="city.region" @change="updateCity(city)" class="inline-edit" placeholder="Не указан" /></td>
                <td>
                  <div class="coords-row">
                    <input v-model.number="city.lat" @change="updateCity(city)" type="number" step="0.0001" class="inline-edit mini" />
                    <span class="sep">,</span>
                    <input v-model.number="city.lon" @change="updateCity(city)" type="number" step="0.0001" class="inline-edit mini" />
                  </div>
                </td>
                <td class="text-right">
                  <button @click="deleteCity(city.id)" class="btn btn-danger btn-sm">🗑️</button>
                </td>
              </tr>
              <tr v-if="filteredCities.length === 0">
                <td colspan="5" class="text-center" style="padding:30px; color:var(--text-muted);">Ничего не найдено</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="citiesTotalPages > 1" class="pagination mt-3">
          <button @click="citiesPage--" :disabled="citiesPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in citiesTotalPages" :key="p" @click="citiesPage = p" :class="{ active: citiesPage === p }">{{ p }}</button>
          </div>
          <button @click="citiesPage++" :disabled="citiesPage === citiesTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 2: СКЛАДЫ И ПВЗ -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'warehouses'">
      <!-- ФОРМА СОЗДАНИЯ СКЛАДА -->
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Добавить новый объект</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createWarehouse" class="admin-form">
          <div class="input-grid">
            <div class="form-group">
              <label>🏙️ Город</label>
              <select v-model="newWarehouse.city_id" required>
                <option :value="null" disabled>-- Выберите город --</option>
                <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>🏠 Точный адрес</label>
              <input v-model="newWarehouse.address" placeholder="ул. ..., д. ..." required />
            </div>
            <div class="form-group">
              <label>📞 Телефон</label>
              <input v-model="newWarehouse.phone" type="tel" placeholder="+7-___-___-__-__" @input="formatPhone($event, 'new')" />
            </div>
            <div class="form-group">
              <label>🕒 Часы работы</label>
              <input v-model="newWarehouse.working_hours" type="text" placeholder="09:00-21:00" @input="formatHours($event, 'new')" />
            </div>
          </div>
          <div class="form-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
            <label class="custom-checkbox">
              <input type="checkbox" v-model="newWarehouse.is_pickup_point" />
              <span class="checkmark"></span>
              <span>⭐ Разрешить выдачу заказов (ПВЗ)</span>
            </label>
            <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
              <span v-if="loadingAction" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
              <span v-else>➕ Добавить в базу</span>
            </button>
          </div>
        </form>
      </section>

      <!-- ФИЛЬТРЫ СКЛАДОВ -->
      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Поиск и фильтрация объектов</h3>
          <button @click="resetWarehouseFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr 1fr;">
          <div class="form-group">
            <label>🔎 Поиск (Город, Адрес, ID)</label>
            <input v-model="warehousesFilters.search" placeholder="Название или ID..." />
          </div>
          <div class="form-group">
            <label>🏢 Тип объекта</label>
            <select v-model="warehousesFilters.type">
              <option value="all">Все объекты</option>
              <option value="pickup">Только ПВЗ</option>
              <option value="warehouse">Только Склады</option>
            </select>
          </div>
          <div class="form-group">
            <label>📊 Сортировка</label>
            <select v-model="warehousesFilters.sort">
              <option value="id-desc">Сначала новые</option>
              <option value="city">По алфавиту (Город)</option>
            </select>
          </div>
        </div>
      </section>

      <!-- ТАБЛИЦА СКЛАДОВ -->
      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Найдено: <b>{{ filteredWarehouses.length }}</b> из {{ warehouses.length }} (показана стр. {{ warehousesPage }})
        </div>
        <div class="admin-table-wrapper glass-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>🏙️ Город</th>
                <th>🏠 Адрес / Часы работы</th>
                <th>📞 Телефон</th>
                <th class="text-center">⚙️ Статус</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="w in paginatedWarehouses" :key="w.id" class="warehouse-row">
                <td class="col-id"><span class="id-badge">#{{ w.id }}</span></td>
                <td style="width: 180px;">
                  <select v-model="w.city_id" @change="updateWarehouse(w)" class="inline-edit bold-city">
                    <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </td>
                <td>
                  <input v-model="w.address" @change="updateWarehouse(w)" class="inline-edit addr-input" placeholder="ул. ..., д. ..." />
                  <div class="sub-input-row">
                    <small>🕒</small>
                    <input v-model="w.working_hours" type="text" class="inline-edit-sub" placeholder="XX:XX-XX:XX" @input="formatHours($event, w)" @change="updateWarehouse(w)" />
                  </div>
                </td>
                <td style="width: 160px;">
                  <input v-model="w.phone" type="tel" class="inline-edit" placeholder="+7-___-___-__-__" @input="formatPhone($event, w)" @change="updateWarehouse(w)" />
                </td>
                <td class="text-center" style="width: 140px;">
                  <div class="status-cell" style="justify-content: center;">
                    <label class="toggle-switch">
                      <input type="checkbox" v-model="w.is_pickup_point" @change="updateWarehouse(w)" />
                      <span class="toggle-slider"></span>
                    </label>
                    <span class="status-tag" :class="w.is_pickup_point ? 'tag-pickup' : 'tag-storage'">
                      {{ w.is_pickup_point ? 'ПВЗ' : 'СКЛАД' }}
                    </span>
                  </div>
                </td>
                <td class="text-right">
                  <button @click="deleteWarehouse(w.id)" class="btn btn-danger btn-sm">🗑️</button>
                </td>
              </tr>
              <tr v-if="filteredWarehouses.length === 0">
                <td colspan="6" class="text-center" style="padding:40px; color:var(--text-muted);">
                  Ничего не найдено. Попробуйте изменить параметры поиска или фильтры.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="warehousesTotalPages > 1" class="pagination mt-3">
          <button @click="warehousesPage--" :disabled="warehousesPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in warehousesTotalPages" :key="p" @click="warehousesPage = p" :class="{ active: warehousesPage === p }">{{ p }}</button>
          </div>
          <button @click="warehousesPage++" :disabled="warehousesPage === warehousesTotalPages">→</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

// Глобальные стейты компонента
const currentTab = ref('cities');
const itemsPerPage = 20;
const loadingAction = ref(false);

const cities = ref([]);
const warehouses = ref([]);

// 1. Инициализация (загружаем всё сразу)
const loadAllData = async () => {
  try {
    const [cRes, wRes] = await Promise.all([
      axios.get(`/api/admin/cities`, config),
      axios.get(`/api/admin/warehouses`, config)
    ]);
    cities.value = Array.isArray(cRes.data) ? cRes.data : [];
    warehouses.value = Array.isArray(wRes.data) ? wRes.data : [];
  } catch (e) {
    console.error('Ошибка загрузки логистики', e);
  }
};

// Вспомогательная функция для получения имени города
const getCityName = (cityId) => {
  const c = cities.value.find(c => c.id === cityId);
  return c ? c.name : '';
};

// ==========================================
// ЛОГИКА: ВКЛАДКА "ГОРОДА"
// ==========================================
const citiesPage = ref(1);
const citiesSearch = ref('');
const newCity = reactive({ name: '', region: '', lat: null, lon: null });

const createCity = async () => {
  loadingAction.value = true;
  try {
    const res = await axios.post(`/api/admin/cities`, newCity, config);
    cities.value.unshift(res.data);
    Object.assign(newCity, { name: '', region: '', lat: null, lon: null });
    alert('Город добавлен');
  } catch (e) { alert('Ошибка при создании города'); }
  finally { loadingAction.value = false; }
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
    // Также можно каскадно убрать склады локально или дождаться рефреша
  } catch (e) { alert('Ошибка удаления (возможно, город используется)'); }
};

const filteredCities = computed(() => {
  let res = [...cities.value];
  if (citiesSearch.value.trim()) {
    const q = citiesSearch.value.toLowerCase();
    res = res.filter(c => c.name.toLowerCase().includes(q) || (c.region && c.region.toLowerCase().includes(q)));
  }
  return res.sort((a, b) => b.id - a.id);
});
const citiesTotalPages = computed(() => Math.ceil(filteredCities.value.length / itemsPerPage));
const paginatedCities = computed(() => filteredCities.value.slice((citiesPage.value - 1) * itemsPerPage, citiesPage.value * itemsPerPage));
watch(citiesSearch, () => citiesPage.value = 1);

// ==========================================
// ЛОГИКА: ВКЛАДКА "СКЛАДЫ И ПВЗ"
// ==========================================
const warehousesPage = ref(1);
const warehousesFilters = reactive({ search: '', type: 'all', sort: 'id-desc' });
const newWarehouse = reactive({ city_id: null, address: '', phone: '', working_hours: '', is_pickup_point: true });

// Маски ввода
const formatPhone = (event, target) => {
  const input = event.target;
  let value = input.value.replace(/[^\d]/g, '');
  if (value.length === 0) {
    input.value = '';
    if (target === 'new') newWarehouse.phone = ''; else target.phone = '';
    return;
  }
  let formatted = '+7';
  if (value.length > 1) formatted += '-' + value.substring(1, 4);
  if (value.length >= 4) formatted += '-' + value.substring(4, 7);
  if (value.length >= 7) formatted += '-' + value.substring(7, 9);
  if (value.length >= 9) formatted += '-' + value.substring(9, 11);
  input.value = formatted;
  if (target === 'new') newWarehouse.phone = formatted; else target.phone = formatted;
};

const formatHours = (event, target) => {
  const input = event.target;
  let value = input.value.replace(/[^\d]/g, '');
  if (value.length === 0) {
    input.value = '';
    if (target === 'new') newWarehouse.working_hours = ''; else target.working_hours = '';
    return;
  }
  let formatted = '';
  if (value.length >= 1) formatted += value.substring(0, 2);
  if (value.length >= 2) formatted += ':' + value.substring(2, 4);
  if (value.length > 4) formatted += '-' + value.substring(4, 6);
  if (value.length >= 6) formatted += ':' + value.substring(6, 8);
  input.value = formatted;
  if (target === 'new') newWarehouse.working_hours = formatted; else target.working_hours = formatted;
};

const createWarehouse = async () => {
  if (!newWarehouse.city_id) return alert('Пожалуйста, выберите город');
  loadingAction.value = true;
  try {
    const res = await axios.post(`/api/admin/warehouses`, newWarehouse, config);
    warehouses.value.unshift(res.data);
    Object.assign(newWarehouse, { city_id: null, address: '', phone: '', working_hours: '', is_pickup_point: true });
    alert('Объект добавлен!');
  } catch (e) { alert('Ошибка при создании'); }
  finally { loadingAction.value = false; }
};

const updateWarehouse = async (w) => {
  try {
    const { cities, city_display_name, ...payload } = w;
    await axios.put(`/api/admin/warehouses/${w.id}`, payload, config);
  } catch (e) { console.error('Ошибка сохранения'); }
};

const deleteWarehouse = async (id) => {
  if (!confirm('ВНИМАНИЕ! Удаление склада удалит все связанные остатки товаров на нем. Продолжить?')) return;
  try {
    await axios.delete(`/api/admin/warehouses/${id}`, config);
    warehouses.value = warehouses.value.filter(item => item.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const resetWarehouseFilters = () => { warehousesFilters.search = ''; warehousesFilters.type = 'all'; warehousesFilters.sort = 'id-desc'; warehousesPage.value = 1; };

const filteredWarehouses = computed(() => {
  let result = [...warehouses.value];
  
  if (warehousesFilters.search.trim()) {
    const q = warehousesFilters.search.toLowerCase().trim();
    result = result.filter(w => 
      getCityName(w.city_id).toLowerCase().includes(q) || 
      w.address.toLowerCase().includes(q) || 
      w.id.toString() === q
    );
  }
  
  if (warehousesFilters.type === 'pickup') result = result.filter(w => w.is_pickup_point);
  else if (warehousesFilters.type === 'warehouse') result = result.filter(w => !w.is_pickup_point);

  if (warehousesFilters.sort === 'city') {
    result.sort((a, b) => getCityName(a.city_id).localeCompare(getCityName(b.city_id)));
  } else {
    result.sort((a, b) => b.id - a.id);
  }
  return result;
});

const warehousesTotalPages = computed(() => Math.ceil(filteredWarehouses.value.length / itemsPerPage));
const paginatedWarehouses = computed(() => filteredWarehouses.value.slice((warehousesPage.value - 1) * itemsPerPage, warehousesPage.value * itemsPerPage));

watch(() => warehousesFilters, () => { warehousesPage.value = 1; }, { deep: true });

onMounted(loadAllData);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ КОМПОНЕНТА ЛОГИСТИКИ
   ========================================================================== */
.admin-logistics-dashboard { padding: 40px 24px; }
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
.header-left h1 { font-size: 2.2rem; font-weight: 900; margin: 0 0 6px 0; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: var(--text-muted); margin: 0; font-size: 0.95rem; font-weight: 500; }
.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* Tabs */
.admin-tabs { display: flex; gap: 10px; padding: 10px; margin-bottom: 30px; border-radius: 12px; overflow-x: auto; }
.admin-tabs button { padding: 12px 24px; border: none; background: transparent; color: var(--text-muted); font-weight: 800; border-radius: 8px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.admin-tabs button:hover { background: rgba(0,0,0,0.05); }
.admin-tabs button.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
:global(.dark) .admin-tabs button:hover { background: rgba(255,255,255,0.05); }

/* Common UI */
.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-title { font-size: 1.25rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); border-radius: 4px; margin-top: 5px; }
.filter-grid { display: grid; gap: 20px; align-items: flex-end; }
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
.btn-text-link { background: none; border: none; color: var(--primary); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }
.create-btn { background: linear-gradient(135deg, var(--primary), var(--accent)); border: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.2s, box-shadow 0.2s; }
.create-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* Tables */
.table-container { margin-top: 20px; }
.table-meta { font-size: 0.85rem; font-weight: 600; margin-bottom: 15px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); border-bottom: 2px solid var(--border-color); text-transform: uppercase; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color); vertical-align: middle; transition: background 0.2s; font-size: 0.9rem; }
.admin-table tbody tr:hover td { background: rgba(37, 99, 235, 0.02); }
.col-id { width: 70px; font-weight: 800; color: var(--primary); font-family: monospace; }
.text-right { text-align: right; }
.text-center { text-align: center; }

/* Inline Edits */
.inline-edit { background: transparent; border: 1px solid transparent; padding: 6px 10px; border-radius: 6px; color: var(--text-main); width: 100%; font-weight: 500; transition: 0.2s; font-size: inherit; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color); }
:global(.dark) .inline-edit:hover { background: rgba(255,255,255,0.03); border-color: #475569; }
.inline-edit:focus { border-color: var(--primary); background: var(--bg-card); outline: none; }
.bold { font-weight: 800; }
.bold-city { font-weight: 800; color: var(--primary); cursor: pointer; }

/* Checkboxes */
.custom-checkbox { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 0.85rem; color: var(--text-main); }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; border: 2px solid var(--border-color); border-radius: 6px; position: relative; transition: all 0.2s; }
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--primary); border-color: var(--primary); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; }
.pagination-pages { display: flex; gap: 8px; }
.pagination button, .pagination-pages button { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer; transition: background 0.2s; }
.pagination button:hover:not(:disabled), .pagination-pages button:hover { background: var(--primary-light); border-color: var(--primary); }
.pagination-pages button.active { background: var(--primary); color: white; border-color: var(--primary); }

/* ==========================================================================
   СПЕЦИФИЧНЫЕ СТИЛИ (Города и Склады)
   ========================================================================== */
/* Города */
.coords-row { display: flex; align-items: center; gap: 5px; }
.inline-edit.mini { width: 90px; font-family: monospace; font-size: 0.8rem; }
.sep { font-weight: bold; color: var(--text-muted); }

/* Склады */
.addr-input { width: 100%; }
.sub-input-row { display: flex; align-items: center; gap: 5px; margin-top: 4px; padding-left: 10px; }
.inline-edit-sub { background: transparent; border: none; font-size: 0.75rem; color: var(--text-muted); width: 100%; }
.status-cell { display: flex; align-items: center; gap: 12px; }
.toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #cbd5e1; transition: .4s; border-radius: 20px; }
.toggle-slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background: var(--success); }
input:checked + .toggle-slider:before { transform: translateX(20px); }
.status-tag { padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px; }
.tag-pickup { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.tag-storage { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

@media (max-width: 900px) {
  .filter-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr !important; }
  .status-cell { flex-direction: column; gap: 5px; }
}
</style>

<style>
html.dark .bold-city option {
  background-color: var(--bg-input) !important;
  color: var(--text-main) !important;
}
</style>