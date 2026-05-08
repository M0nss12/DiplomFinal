<template>
  <div class="admin-warehouses">
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
          <div class="input-group">
            <label>🏙️ Город</label>
            <input v-model="newWarehouse.city_name" placeholder="Напр. Москва" required class="form-input" />
          </div>
          <div class="input-group">
            <label>🏠 Точный адрес</label>
            <input v-model="newWarehouse.address" placeholder="Улица, дом..." required class="form-input" />
          </div>
          <div class="input-group">
            <label>📞 Телефон</label>
            <input v-model="newWarehouse.phone" placeholder="+7..." class="form-input" />
          </div>
          <div class="input-group">
            <label>🕒 Часы работы</label>
            <input v-model="newWarehouse.working_hours" placeholder="09:00 - 21:00" class="form-input" />
          </div>
        </div>

        <div class="form-footer">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="newWarehouse.is_pickup_point" />
            <span class="checkmark"></span>
            <span>⭐ Разрешить выдачу заказов (ПВЗ)</span>
          </label>
          <button type="submit" class="btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner-small"></span>
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
        <div class="input-group search-group">
          <label>🔎 Поиск (Город, Адрес, ID)</label>
          <input 
            v-model="filters.search" 
            placeholder="Название или ID..." 
            class="form-input"
          />
        </div>

        <div class="input-group">
          <label>🏢 Тип объекта</label>
          <select v-model="filters.type" class="form-input">
            <option value="all">Все объекты</option>
            <option value="pickup">Только ПВЗ</option>
            <option value="warehouse">Только Склады</option>
          </select>
        </div>

        <div class="input-group">
          <label>📊 Сортировка</label>
          <select v-model="filters.sort" class="form-input">
            <option value="id-desc">Сначала новые</option>
            <option value="city">По алфавиту (Город)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta">
        <span class="meta-icon">📄</span>
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
                <input v-model="w.city_display_name" @change="updateWarehouse(w)" class="inline-edit bold-city" />
              </td>

              <td>
                <input v-model="w.address" @change="updateWarehouse(w)" class="inline-edit addr-input" />
                <div class="sub-input-row">
                  <small>🕒</small>
                  <input v-model="w.working_hours" @change="updateWarehouse(w)" class="inline-edit-sub" placeholder="Укажите часы работы" />
                </div>
              </td>

              <td style="width: 160px;">
                <input v-model="w.phone" @change="updateWarehouse(w)" class="inline-edit" placeholder="Нет тел." />
              </td>

              <td class="text-center" style="width: 140px;">
                <div class="status-cell">
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
                <button @click="deleteWarehouse(w.id)" class="btn-delete-small">🗑️ Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filteredWarehouses.length === 0" class="empty-state glass-card">
        <div class="empty-icon">🏜️</div>
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
const loading = ref(false);

const filters = reactive({ search: '', type: 'all', sort: 'id-desc' });
const newWarehouse = reactive({ city_name: '', address: '', phone: '', working_hours: '', is_pickup_point: true });

const fetchWarehouses = async () => {
  try {
    const res = await axios.get(`${API_URL}/api/admin/warehouses`, config);
    // Приводим город к строке cityName для удобства инпутов
    warehouses.value = res.data.map(w => ({
        ...w,
        city_display_name: w.cities?.name || w.city_name || ''
    }));
  } catch (e) { console.error('Ошибка загрузки складов'); }
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
  loading.value = true;
  try {
    const res = await axios.post(`${API_URL}/api/admin/warehouses`, newWarehouse, config);
    await fetchWarehouses(); // Обновляем список для синхронизации связей
    Object.assign(newWarehouse, { city_name: '', address: '', phone: '', working_hours: '', is_pickup_point: true });
    alert('Объект добавлен!');
  } catch (e) { alert('Ошибка при создании'); }
  finally { loading.value = false; }
};

const updateWarehouse = async (w) => {
  try {
    // Извлекаем cityName обратно в структуру, которую ждет серверный хелпер (если есть)
    // Либо отправляем как есть, если сервер умеет обрабатывать city_id
    const { cities, city_display_name, ...payload } = w;
    payload.city_name = city_display_name; // Передаем имя города для обработки на бэке
    await axios.put(`${API_URL}/api/admin/warehouses/${w.id}`, payload, config);
  } catch (e) { console.error('Ошибка сохранения'); }
};

const deleteWarehouse = async (id) => {
  if (!confirm('ВНИМАНИЕ! Удаление склада удалит все связанные остатки товаров на нем. Продолжить?')) return;
  try {
    await axios.delete(`${API_URL}/api/admin/warehouses/${id}`, config);
    warehouses.value = warehouses.value.filter(item => item.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

onMounted(fetchWarehouses);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: СКЛАДЫ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-warehouses { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-warehouses { color: #f8fafc; }

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
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 28px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); outline: none; }

.form-footer { margin-top: 20px; padding-top: 20px; border-top: 1px dashed var(--border-color, #e2e8f0); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; }

.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: flex; align-items: center; gap: 10px;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.col-id { width: 80px; font-weight: 800; color: var(--primary, #2563eb); }
.inline-edit { background: transparent; border: 1px solid transparent; padding: 6px 10px; border-radius: 6px; color: var(--text-main, #0f172a); width: 100%; font-weight: 500; transition: 0.2s; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #cbd5e1); }
.inline-edit:focus { border-color: var(--primary, #2563eb); background: var(--bg-card, #fff); outline: none; }
.bold-city { font-weight: 800; color: var(--primary, #2563eb); }

.sub-input-row { display: flex; align-items: center; gap: 5px; margin-top: 4px; padding-left: 10px; }
.inline-edit-sub { background: transparent; border: none; font-size: 0.75rem; color: var(--text-muted, #64748b); width: 100%; }

/* Статусы и Тогглы */
.status-cell { display: flex; align-items: center; gap: 12px; }
.toggle-switch { position: relative; display: inline-block; width: 40px; height: 20px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #cbd5e1; transition: .4s; border-radius: 20px; }
.toggle-slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background: var(--success, #10b981); }
input:checked + .toggle-slider:before { transform: translateX(20px); }

.status-tag { padding: 4px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px; }
.tag-pickup { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.tag-storage { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.8rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; }

.empty-state { text-align: center; padding: 60px; color: var(--text-muted, #64748b); font-weight: 600; }
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

/* АДАПТИВНОСТЬ */
@media (max-width: 900px) { .filter-grid { grid-template-columns: 1fr; } .input-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .admin-warehouses { padding: 24px 16px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .form-footer { flex-direction: column; align-items: stretch; }
  .status-cell { flex-direction: column; gap: 5px; }
}
</style>