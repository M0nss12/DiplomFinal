<template>
  <div class="admin-warehouses animate-fade-in">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>📍 Склады и ПВЗ</h1>
        <p class="subtitle">Управление логистической сетью: пункты выдачи и региональные хранилища</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">🏙️</span>
        Всего точек: <b>{{ warehouses.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА СОЗДАНИЯ -->
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
            <input
              v-model="newWarehouse.phone"
              type="tel"
              placeholder="+7-___-___-__-__"
              @input="formatPhone($event, 'new')"
            />
          </div>
          <div class="form-group">
            <label>🕒 Часы работы</label>
            <input
              v-model="newWarehouse.working_hours"
              type="text"
              placeholder="09:00-21:00"
              @input="formatHours($event, 'new')"
            />
          </div>
        </div>

        <div class="form-footer">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="newWarehouse.is_pickup_point" />
            <span class="checkmark"></span>
            <span>⭐ Разрешить выдачу заказов (ПВЗ)</span>
          </label>
          <button type="submit" class="btn btn-primary create-btn" :disabled="loading">
            <span v-if="loading" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
            <span v-else>➕ Добавить в базу</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск и фильтрация</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>

      <div class="filter-grid">
        <div class="form-group">
          <label>🔎 Поиск (Город, Адрес, ID)</label>
          <input v-model="filters.search" placeholder="Название или ID..." />
        </div>

        <div class="form-group">
          <label>🏢 Тип объекта</label>
          <select v-model="filters.type">
            <option value="all">Все объекты</option>
            <option value="pickup">Только ПВЗ</option>
            <option value="warehouse">Только Склады</option>
          </select>
        </div>

        <div class="form-group">
          <label>📊 Сортировка</label>
          <select v-model="filters.sort">
            <option value="id-desc">Сначала новые</option>
            <option value="city">По алфавиту (Город)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Найдено: <b>{{ filteredWarehouses.length }}</b> из {{ warehouses.length }}
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
            <tr v-for="w in filteredWarehouses" :key="w.id" class="warehouse-row">
              <td class="col-id">
                <span class="id-badge">#{{ w.id }}</span>
              </td>

              <td style="width: 180px;">
                <select
                  v-model="w.city_id"
                  @change="updateWarehouse(w)"
                  class="inline-edit bold-city"
                >
                  <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </td>

              <td>
                <input
                  v-model="w.address"
                  @change="updateWarehouse(w)"
                  class="inline-edit addr-input"
                  placeholder="ул. ..., д. ..."
                />
                <div class="sub-input-row">
                  <small>🕒</small>
                  <input
                    v-model="w.working_hours"
                    type="text"
                    class="inline-edit-sub"
                    placeholder="XX:XX-XX:XX"
                    @input="formatHours($event, w)"
                    @change="updateWarehouse(w)"
                  />
                </div>
              </td>

              <td style="width: 160px;">
                <input
                  v-model="w.phone"
                  type="tel"
                  class="inline-edit"
                  placeholder="+7-___-___-__-__"
                  @input="formatPhone($event, w)"
                  @change="updateWarehouse(w)"
                />
              </td>

              <td class="text-center" style="width: 140px;">
                <div class="status-cell">
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      v-model="w.is_pickup_point"
                      @change="updateWarehouse(w)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                  <span
                    class="status-tag"
                    :class="w.is_pickup_point ? 'tag-pickup' : 'tag-storage'"
                  >
                    {{ w.is_pickup_point ? 'ПВЗ' : 'СКЛАД' }}
                  </span>
                </div>
              </td>

              <td class="text-right">
                <button @click="deleteWarehouse(w.id)" class="btn btn-danger btn-sm">🗑️ Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredWarehouses.length === 0" class="empty-state glass-card">
        <div class="empty-state-icon">🏜️</div>
        <h3>Ничего не найдено</h3>
        <p>Попробуйте изменить параметры поиска или фильтры.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const warehouses = ref([]);
const cities = ref([]);
const loading = ref(false);

const filters = reactive({ search: '', type: 'all', sort: 'id-desc' });
const newWarehouse = reactive({
  city_id: null,
  address: '',
  phone: '',
  working_hours: '',
  is_pickup_point: true
});

// =======================
// Маски ввода
// =======================

// Телефон: +7-XXX-XXX-XX-XX
const formatPhone = (event, target) => {
  // target может быть 'new' (новый объект) или объект строки таблицы
  const input = event.target;
  let value = input.value.replace(/[^\d]/g, ''); // только цифры
  if (value.length === 0) {
    input.value = '';
    if (target === 'new') newWarehouse.phone = '';
    else target.phone = '';
    return;
  }

  let formatted = '+7';
  if (value.length > 1) {
    const part1 = value.substring(1, 4);
    formatted += '-' + part1;
  }
  if (value.length >= 4) {
    const part2 = value.substring(4, 7);
    formatted += '-' + part2;
  }
  if (value.length >= 7) {
    const part3 = value.substring(7, 9);
    formatted += '-' + part3;
  }
  if (value.length >= 9) {
    const part4 = value.substring(9, 11);
    formatted += '-' + part4;
  }
  input.value = formatted;

  // Записываем в модель
  if (target === 'new') newWarehouse.phone = formatted;
  else target.phone = formatted;
};

// Часы работы: XX:XX-XX:XX
const formatHours = (event, target) => {
  const input = event.target;
  let value = input.value.replace(/[^\d]/g, ''); // только цифры
  if (value.length === 0) {
    input.value = '';
    if (target === 'new') newWarehouse.working_hours = '';
    else target.working_hours = '';
    return;
  }

  let formatted = '';
  if (value.length >= 1) formatted += value.substring(0, 2);
  if (value.length >= 2) formatted += ':' + value.substring(2, 4);
  if (value.length > 4) {
    formatted += '-' + value.substring(4, 6);
  }
  if (value.length >= 6) {
    formatted += ':' + value.substring(6, 8);
  }
  input.value = formatted;

  if (target === 'new') newWarehouse.working_hours = formatted;
  else target.working_hours = formatted;
};

// =======================
// Загрузка данных
// =======================
const fetchWarehouses = async () => {
  try {
    const res = await axios.get(`/api/admin/warehouses`, config);
    warehouses.value = res.data.map(w => ({
      ...w,
      city_display_name: w.cities?.name || w.city_name || ''
    }));
  } catch (e) { console.error('Ошибка загрузки складов'); }
};

const fetchCities = async () => {
  try {
    const res = await axios.get(`/api/cities`); // публичный эндпоинт
    cities.value = res.data || [];
  } catch (e) { console.error('Ошибка загрузки городов'); }
};

const resetFilters = () => { filters.search = ''; filters.type = 'all'; filters.sort = 'id-desc'; };

const filteredWarehouses = computed(() => {
  let result = [...warehouses.value];
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    result = result.filter(w =>
      w.city_display_name.toLowerCase().includes(q) ||
      w.address.toLowerCase().includes(q) ||
      w.id.toString() === q
    );
  }
  if (filters.type === 'pickup') result = result.filter(w => w.is_pickup_point);
  else if (filters.type === 'warehouse') result = result.filter(w => !w.is_pickup_point);

  if (filters.sort === 'city') result.sort((a, b) => a.city_display_name.localeCompare(b.city_display_name));
  else result.sort((a, b) => b.id - a.id);
  return result;
});

const createWarehouse = async () => {
  if (!newWarehouse.city_id) {
    alert('Пожалуйста, выберите город');
    return;
  }
  loading.value = true;
  try {
    await axios.post(`/api/admin/warehouses`, newWarehouse, config);
    await fetchWarehouses();
    Object.assign(newWarehouse, {
      city_id: null,
      address: '',
      phone: '',
      working_hours: '',
      is_pickup_point: true
    });
    alert('Объект добавлен!');
  } catch (e) { alert('Ошибка при создании'); }
  finally { loading.value = false; }
};

const updateWarehouse = async (w) => {
  try {
    // Удаляем лишние поля, которые не нужны для PUT
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

onMounted(() => {
  fetchWarehouses();
  fetchCities();
});
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ АДМИНКИ СКЛАДОВ (глобальные классы уже применены)
   ========================================================================== */

.admin-warehouses {
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

/* Форма */
.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 28px;
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
  color: var(--text-muted);
}

.form-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

/* Кнопка создания (глобальный btn btn-primary + градиент) */
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
.filter-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 20px;
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

/* Таблица */
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
  min-width: 900px;
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

.col-id {
  width: 80px;
  font-weight: 800;
  color: var(--primary);
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
.bold-city {
  font-weight: 800;
  color: var(--primary);
}

.sub-input-row {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 4px;
  padding-left: 10px;
}
.inline-edit-sub {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  color: var(--text-muted);
  width: 100%;
}

/* Статусы и тогглы */
.status-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}
.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #cbd5e1;
  transition: .4s;
  border-radius: 20px;
}
.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 3px;
  bottom: 3px;
  background: white;
  transition: .4s;
  border-radius: 50%;
}
input:checked + .toggle-slider {
  background: var(--success);
}
input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.status-tag {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.tag-pickup {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.tag-storage {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.text-center { text-align: center; }
.text-right { text-align: right; }

/* Чекбокс (локальный) */
.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  user-select: none;
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
  background: var(--primary);
  border-color: var(--primary);
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

@media (max-width: 900px) {
  .filter-grid { grid-template-columns: 1fr; }
  .input-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .admin-warehouses { padding: 24px 16px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .form-footer { flex-direction: column; align-items: stretch; }
  .status-cell { flex-direction: column; gap: 5px; }
}
</style>