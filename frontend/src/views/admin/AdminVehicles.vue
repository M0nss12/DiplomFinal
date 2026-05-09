<template>
  <div class="admin-vehicles">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>🚗 Гараж пользователей</h1>
        <p class="subtitle">Управление списком автомобилей клиентов и проверка совместимости</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">🛠️</span>
        Автомобилей: <b>{{ filteredVehicles.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА ДОБАВЛЕНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить авто в профиль</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createVehicle" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>👤 Владелец (Пользователь)</label>
            <select v-model="newVehicle.user_id" required class="form-input">
              <option :value="null" disabled>-- Выберите владельца --</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.last_name || '' }} {{ u.first_name }} ({{ u.email || u.phone_number }})
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>🏎️ Марка</label>
            <input v-model="newVehicle.brand" placeholder="Toyota" required class="form-input" />
          </div>
          <div class="input-group">
            <label>🚘 Модель</label>
            <input v-model="newVehicle.model" placeholder="Camry" required class="form-input" />
          </div>
          <div class="input-group">
            <label>📅 Год выпуска</label>
            <input
              v-model.number="newVehicle.year"
              type="number"
              placeholder="2024"
              class="form-input"
              :class="{ 'year-warn': isYearInvalid(newVehicle.year) }"
            />
          </div>
          <div class="input-group">
            <label>🆔 VIN-номер (17 знаков)</label>
            <input
              v-model="newVehicle.vin"
              maxlength="17"
              class="form-input vin-input"
              @input="formatVin($event)"
            />
          </div>
          <div class="input-group">
            <label>🧪 Объем двигателя (л)</label>
            <input
              v-model.number="newVehicle.engine_volume"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="2.0"
              class="form-input"
            />
          </div>
        </div>
        <div class="form-footer">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="newVehicle.is_primary" />
            <span class="checkmark"></span>
            <span>⭐ Сделать основным авто</span>
          </label>
          <button type="submit" class="btn-primary" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner-small"></span>
            <span v-else>➕ Добавить в гараж</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск по автопарку</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔎 Поиск (Марка, Модель, VIN или владелец)</label>
          <input v-model="searchQuery" placeholder="Введите данные для поиска..." class="form-input" />
        </div>
        <div class="input-group">
          <label>🏎️ Фильтр по марке</label>
          <select v-model="brandFilter" class="form-input">
            <option value="all">Все марки</option>
            <option v-for="b in uniqueBrands" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Владелец</th>
              <th class="col-auto">Автомобиль</th>
              <th class="col-vin">VIN-номер</th>
              <th class="col-specs text-center">Характеристики</th>
              <th class="text-center">Основной</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="v in paginatedVehicles"
              :key="v.id"
              class="vehicle-row"
              :class="{ 'row-updated': updatedRow === v.id, 'row-error': errorRow === v.id }"
            >
              <td class="col-id">#{{ v.id }}</td>

              <td>
                <div class="owner-info">
                  <strong>{{ getUserName(v.user_id) }}</strong>
                  <small>{{ getUserEmail(v.user_id) }}</small>
                </div>
              </td>

              <td class="col-auto">
                <div class="car-info-row">
                  <input v-model="v.brand" @change="updateVehicle(v)" class="inline-edit bold auto-input" />
                  <input v-model="v.model" @change="updateVehicle(v)" class="inline-edit auto-input" />
                </div>
              </td>

              <td class="col-vin">
                <input v-model="v.vin" @change="updateVehicle(v)" @input="formatVin($event)" class="inline-edit vin-code" maxlength="17" />
              </td>

              <td class="col-specs text-center">
                <div class="specs-inline">
                  <input v-model.number="v.year" @change="updateVehicle(v)" type="number" class="inline-edit mini" :class="{ 'year-warn': isYearInvalid(v.year) }" />
                  <span class="sep">|</span>
                  <input v-model.number="v.engine_volume" @change="updateVehicle(v)" type="number" step="0.1" min="0.1" class="inline-edit mini" />
                  <span class="muted">л.</span>
                </div>
              </td>

              <td class="text-center">
                <label class="custom-checkbox no-text">
                  <input type="checkbox" v-model="v.is_primary" @change="updateVehicle(v)" />
                  <span class="checkmark"></span>
                </label>
              </td>

              <td class="text-right">
                <button @click="deleteVehicle(v.id)" class="btn-delete-small">🗑️ Удалить</button>
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

const vehicles = ref([]);
const users = ref([]);
const loadingAction = ref(false);
const searchQuery = ref('');
const brandFilter = ref('all');
const currentPage = ref(1);
const itemsPerPage = 15;

const updatedRow = ref(null);
const errorRow = ref(null);

const newVehicle = reactive({
  user_id: null,
  brand: '',
  model: '',
  year: new Date().getFullYear(),
  vin: '',
  engine_volume: 1.6,
  is_primary: false
});

const loadData = async () => {
  try {
    const [vRes, uRes] = await Promise.all([
      axios.get(`/api/admin/user_vehicles`, config),
      axios.get(`/api/admin/users`, config)
    ]);
    vehicles.value = vRes.data;
    users.value = uRes.data;
  } catch (e) { console.error('Ошибка загрузки'); }
};

const getUserName = (id) => {
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name || ''}`.trim() : '---';
};
const getUserEmail = (id) => users.value.find(user => user.id === id)?.email || '';

const formatVin = (event) => {
  const input = event.target;
  let val = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (val.length > 17) val = val.substring(0, 17);
  input.value = val;
};

const isYearInvalid = (year) => {
  const currentYear = new Date().getFullYear();
  return year && (year < 1886 || year > currentYear + 1);
};

// CRUD
const createVehicle = async () => {
  if (!newVehicle.user_id) return alert('Выберите владельца');
  loadingAction.value = true;
  try {
    const res = await axios.post(`/api/admin/user_vehicles`, newVehicle, config);
    vehicles.value.unshift(res.data);
    Object.assign(newVehicle, {
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      engine_volume: 1.6,
      is_primary: false,
    });
    alert('Автомобиль добавлен');
  } catch (e) { alert('Ошибка при сохранении'); }
  finally { loadingAction.value = false; }
};

// ** Исправляем обновление: убираем лишние поля **
const updateVehicle = async (v) => {
  try {
    // Отправляем только нужные поля
    const payload = {
      user_id: v.user_id,
      brand: v.brand,
      model: v.model,
      year: v.year,
      vin: v.vin,
      engine_volume: v.engine_volume,
      is_primary: v.is_primary
    };
    await axios.put(`/api/admin/user_vehicles/${v.id}`, payload, config);
    updatedRow.value = v.id;
    setTimeout(() => (updatedRow.value = null), 800);
  } catch (e) {
    alert('Ошибка обновления');
    errorRow.value = v.id;
    setTimeout(() => (errorRow.value = null), 800);
  }
};

const deleteVehicle = async (id) => {
  if (!confirm('Удалить этот автомобиль из базы?')) return;
  try {
    await axios.delete(`/api/admin/user_vehicles/${id}`, config);
    vehicles.value = vehicles.value.filter(v => v.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

// Фильтры
const uniqueBrands = computed(() => {
  const brands = vehicles.value.map(v => v.brand).filter(Boolean);
  return Array.from(new Set(brands)).sort();
});

const filteredVehicles = computed(() => {
  let res = [...vehicles.value];
  if (brandFilter.value !== 'all') res = res.filter(v => v.brand === brandFilter.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    res = res.filter(v =>
      v.brand.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.vin && v.vin.toLowerCase().includes(q)) ||
      getUserName(v.user_id).toLowerCase().includes(q)
    );
  }
  return res.sort((a, b) => b.id - a.id);
});

const totalPages = computed(() => Math.ceil(filteredVehicles.value.length / itemsPerPage));
const paginatedVehicles = computed(() =>
  filteredVehicles.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage)
);

const resetFilters = () => { searchQuery.value = ''; brandFilter.value = 'all'; currentPage.value = 1; };
watch([searchQuery, brandFilter], () => (currentPage.value = 1));

onMounted(loadData);
</script>

<style scoped>
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-vehicles { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-vehicles { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; margin-top: 5px; }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 28px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #64748b); display: block; margin-bottom: 8px; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; }

.vin-input { font-family: monospace; text-transform: uppercase; letter-spacing: 1px; }
.year-warn { background: rgba(255, 193, 7, 0.15) !important; border-color: #ffc107 !important; }

.form-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-top: 20px; border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 20px; }

.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: flex-end; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; }

.table-container { margin-top: 20px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.vehicle-row:hover td { background: rgba(37, 99, 235, 0.02); }
.row-updated td { background: rgba(16, 185, 129, 0.15) !important; }
.row-error td { background: rgba(239, 68, 68, 0.15) !important; }

.col-id { width: 70px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }

.owner-info strong { display: block; font-size: 0.95rem; color: var(--text-main, #0f172a); }
:global(.dark) .owner-info strong { color: #f8fafc; }
.owner-info small { color: var(--text-muted, #94a3b8); font-size: 0.8rem; }

/* Увеличенные столбцы */
.col-auto { min-width: 200px; }
.col-vin { min-width: 160px; }
.col-specs { min-width: 140px; text-align: center; }

.car-info-row { display: flex; gap: 8px; flex-wrap: wrap; }
.auto-input { flex: 1 1 100px; }

.specs-inline { display: flex; align-items: center; gap: 5px; justify-content: center; }

.inline-edit { background: transparent; border: 1px solid transparent; padding: 6px; border-radius: 6px; color: var(--text-main, #0f172a); width: 100%; font-weight: 500; transition: 0.2s; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #cbd5e1); }
.inline-edit:focus { border-color: var(--primary, #2563eb); background: var(--bg-card, #fff); outline: none; }
.bold { font-weight: 800; }
.vin-code { font-family: monospace; text-transform: uppercase; color: var(--primary, #2563eb); font-weight: 700; width: 100%; min-width: 140px; }
.inline-edit.mini { width: 70px; text-align: center; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

.custom-checkbox { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 0.85rem; }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; background: transparent; border: 2px solid var(--border-color, #cbd5e1); border-radius: 6px; position: relative; transition: all 0.2s; }
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--primary, #2563eb); border-color: var(--primary, #2563eb); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr; }
  .filter-grid { grid-template-columns: 1fr; }
}
</style>