<template>
  <div class="garage-page">
    <div class="garage-container">
      <header class="garage-header">
        <div class="header-left">
          <h1>🚗 Мой гараж</h1>
          <p class="subtitle">Сохраните данные ваших авто для быстрого подбора запчастей</p>
        </div>
        <router-link to="/profile" class="back-link">← В профиль</router-link>
      </header>

      <hr class="section-divider" />

      <!-- 1. ФОРМА ДОБАВЛЕНИЯ -->
      <section class="add-vehicle-section glass-card" :class="{ 'is-open': showAddForm }">
        <div class="add-header" @click="showAddForm = !showAddForm">
          <h3>{{ showAddForm ? '🔽 Скрыть форму' : '➕ Добавить автомобиль' }}</h3>
        </div>
        
        <transition name="slide">
          <form v-if="showAddForm" @submit.prevent="addVehicle" class="add-form">
            <div class="input-grid">
              <div class="input-group">
                <label>Марка *</label>
                <input v-model="newCar.brand" placeholder="Toyota" required class="form-input" />
              </div>
              <div class="input-group">
                <label>Модель *</label>
                <input v-model="newCar.model" placeholder="Camry" required class="form-input" />
              </div>
              <div class="input-group">
                <label>Год выпуска</label>
                <input v-model.number="newCar.year" type="number" placeholder="2020" class="form-input" />
              </div>
              <div class="input-group">
                <label>VIN-номер</label>
                <input v-model="newCar.vin" placeholder="17 символов" maxlength="17" class="form-input vin-field" />
              </div>
              <div class="input-group">
                <label>Объем двигателя (л)</label>
                <input v-model.number="newCar.engine_volume" type="number" step="0.1" placeholder="2.5" class="form-input" />
              </div>
            </div>
            <div class="form-actions">
              <label class="custom-checkbox">
                <input type="checkbox" v-model="newCar.is_primary" />
                <span class="checkmark"></span>
                <span>Сделать основным</span>
              </label>
              <button type="submit" class="btn-submit" :disabled="loadingAdd">
                {{ loadingAdd ? 'Сохранение...' : 'Добавить авто' }}
              </button>
            </div>
          </form>
        </transition>
      </section>

      <!-- 2. СПИСОК АВТОМОБИЛЕЙ -->
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
        <p>Загрузка гаража...</p>
      </div>

      <div v-else-if="vehicles.length > 0" class="vehicles-grid">
        <div v-for="car in vehicles" :key="car.id" class="car-card glass-card" :class="{ 'primary-border': car.is_primary }">
          <div v-if="car.is_primary" class="primary-badge">Основной</div>
          
          <div class="car-info">
            <div class="car-main-title">
              <h2>{{ car.brand }} {{ car.model }}</h2>
              <span class="car-year">{{ car.year }} г.в.</span>
            </div>
            
            <div class="car-details">
              <div class="detail-item">
                <span class="label">VIN:</span>
                <code class="val">{{ car.vin || 'Не указан' }}</code>
              </div>
              <div class="detail-item">
                <span class="label">Двигатель:</span>
                <span class="val">{{ car.engine_volume ? car.engine_volume + ' л.' : '---' }}</span>
              </div>
            </div>
          </div>

          <div class="car-actions">
            <button v-if="!car.is_primary" @click="setPrimary(car.id)" class="btn-set-primary">⭐ Сделать основным</button>
            <button @click="deleteVehicle(car.id)" class="btn-delete">🗑️ Удалить</button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card">
        <div class="empty-icon">🚗</div>
        <h2>Ваш гараж пуст</h2>
        <p>Добавьте свой автомобиль, чтобы мы могли точнее подбирать запчасти.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const userId = localStorage.getItem('user_id');

const vehicles = ref([]);
const loading = ref(true);
const loadingAdd = ref(false);
const showAddForm = ref(false);

const newCar = reactive({
  brand: '', model: '', year: null, vin: '', engine_volume: null, is_primary: false
});

const loadVehicles = async () => {
  if (!userId) return;
  try {
    const res = await axios.get(`/api/admin/user_vehicles`); 
    // Фильтруем на фронте (в идеале сделать эндпоинт /api/user_vehicles/:userId)
    vehicles.value = res.data.filter(v => v.user_id === userId).sort((a, b) => b.is_primary - a.is_primary);
  } catch (e) {
    console.error("Ошибка загрузки гаража");
  } finally {
    loading.value = false;
  }
};

const addVehicle = async () => {
  loadingAdd.value = true;
  try {
    const res = await axios.post(`/api/admin/user_vehicles`, { ...newCar, user_id: userId }, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    vehicles.value.unshift(res.data);
    Object.assign(newCar, { brand: '', model: '', year: null, vin: '', engine_volume: null, is_primary: false });
    showAddForm.value = false;
    if (res.data.is_primary) await loadVehicles(); // Перезагрузка для обновления флагов
  } catch (e) {
    alert("Ошибка при добавлении");
  } finally {
    loadingAdd.value = false;
  }
};

const setPrimary = async (id) => {
  try {
    await axios.put(`/api/admin/user_vehicles/${id}`, { is_primary: true }, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    await loadVehicles();
  } catch (e) { console.error(e); }
};

const deleteVehicle = async (id) => {
  if (!confirm("Удалить этот автомобиль из гаража?")) return;
  try {
    await axios.delete(`/api/admin/user_vehicles/${id}`, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    vehicles.value = vehicles.value.filter(v => v.id !== id);
  } catch (e) { console.error(e); }
};

onMounted(loadVehicles);
</script>

<style scoped>
.garage-page { padding: 40px 0 80px; animation: fadeIn 0.5s ease-out; }
.garage-container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }

.garage-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.garage-header h1 { font-size: 2.4rem; font-weight: 900; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: var(--text-muted); margin-top: 5px; }
.back-link { color: var(--primary); text-decoration: none; font-weight: 700; }

.section-divider { border: none; height: 1px; background: var(--border-color); margin: 20px 0 40px; }

/* СТЕКЛО */
.glass-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); box-shadow: 0 4px 6px rgba(0,0,0,0.05); backdrop-filter: blur(8px); }
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; }

/* ФОРМА ДОБАВЛЕНИЯ */
.add-vehicle-section { margin-bottom: 40px; overflow: hidden; }
.add-header { padding: 20px; cursor: pointer; text-align: center; transition: background 0.2s; }
.add-header:hover { background: rgba(37, 99, 235, 0.05); }
.add-form { padding: 0 30px 30px; }

.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.02); color: var(--text-main); }
:global(.dark) .form-input { background: rgba(255,255,255,0.05); color: #fff; }
.vin-field { font-family: monospace; text-transform: uppercase; }

.form-actions { display: flex; justify-content: space-between; align-items: center; }
.btn-submit { background: var(--primary); color: white; border: none; padding: 12px 30px; border-radius: 40px; font-weight: 800; cursor: pointer; transition: 0.3s; }
.btn-submit:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

/* КАРТОЧКИ МАШИН */
.vehicles-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
.car-card { padding: 25px; display: flex; justify-content: space-between; align-items: center; position: relative; }
.car-card.primary-border { border-left: 5px solid var(--success); }
.primary-badge { position: absolute; top: 10px; right: 20px; background: var(--success); color: white; padding: 2px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; }

.car-main-title h2 { margin: 0; font-size: 1.5rem; color: var(--text-main); }
:global(.dark) .car-main-title h2 { color: #fff; }
.car-year { color: var(--text-muted); font-weight: 600; }

.car-details { display: flex; gap: 30px; margin-top: 15px; }
.detail-item { display: flex; flex-direction: column; }
.detail-item .label { font-size: 0.7rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; }
.detail-item .val { font-weight: 700; color: var(--text-main); }
:global(.dark) .detail-item .val { color: #e2e8f0; }

.car-actions { display: flex; gap: 15px; }
.btn-set-primary { background: transparent; border: 1px solid var(--primary); color: var(--primary); padding: 8px 16px; border-radius: 20px; font-weight: 700; cursor: pointer; }
.btn-delete { color: var(--danger); background: transparent; border: none; font-weight: 700; cursor: pointer; }

/* ПУСТОЕ СОСТОЯНИЕ */
.empty-state { text-align: center; padding: 60px; color: var(--text-muted); }
.empty-icon { font-size: 4rem; margin-bottom: 20px; opacity: 0.5; }

/* АДАПТИВНОСТЬ */
@media (max-width: 768px) {
    .car-card { flex-direction: column; align-items: flex-start; gap: 20px; }
    .car-actions { width: 100%; justify-content: space-between; }
}
</style>