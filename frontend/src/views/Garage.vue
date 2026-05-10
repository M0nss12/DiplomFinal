<template>
  <div class="garage-page animate-fade-in">
    <div class="garage-container">
      <header class="garage-header">
        <div class="header-left">
          <h1>🚗 Мой гараж</h1>
          <p class="subtitle">Сохраните данные ваших авто для быстрого подбора запчастей</p>
        </div>
        <router-link to="/profile" class="back-link">← В профиль</router-link>
      </header>

      <hr class="divider" />

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
                <input v-model="newCar.brand" placeholder="Toyota" required />
              </div>
              <div class="input-group">
                <label>Модель *</label>
                <input v-model="newCar.model" placeholder="Camry" required />
              </div>
              <div class="input-group">
                <label>Год выпуска</label>
                <input v-model.number="newCar.year" type="number" placeholder="2020" />
              </div>
              <div class="input-group">
                <label>VIN-номер</label>
                <input 
                  v-model="newCar.vin" 
                  @input="formatVin($event, 'new')" 
                  placeholder="17 символов" 
                  maxlength="17" 
                  class="vin-field" 
                />
              </div>
              <div class="input-group">
                <label>Объем двигателя (л)</label>
                <input v-model.number="newCar.engine_volume" type="number" step="0.1" placeholder="2.5" />
              </div>
            </div>
            <div class="form-actions">
              <label class="custom-checkbox">
                <input type="checkbox" v-model="newCar.is_primary" />
                <span class="checkmark"></span>
                <span>Сделать основным</span>
              </label>
              <button type="submit" class="btn btn-primary" :disabled="loadingAdd">
                <span v-if="loadingAdd" class="spinner"></span>
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
        <transition-group name="car-list">
          <div v-for="car in vehicles" :key="car.id" class="car-card glass-card" :class="{ 'primary-border': car.is_primary }">
            <div class="car-identity">
              <div class="car-icon">🚙</div>
              <div class="car-main-title">
                <h2>{{ car.brand }} {{ car.model }}</h2>
                <span class="car-year">{{ car.year || '—' }} г.в.</span>
                <span v-if="car.is_primary" class="primary-star">⭐</span>
              </div>
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

            <div class="car-actions">
              <button v-if="!car.is_primary" @click="setPrimary(car.id)" class="btn btn-outline btn-sm">⭐ Сделать основным</button>
              <button @click="deleteVehicle(car.id)" class="btn-delete">🗑️ Удалить</button>
            </div>
          </div>
        </transition-group>
      </div>

      <div v-else class="empty-state glass-card">
        <div class="empty-state-icon">🚗</div>
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

const formatVin = (event, source) => {
  const input = event.target;
  let val = input.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (val.length > 17) val = val.substring(0, 17);
  input.value = val;
  if (source === 'new') newCar.vin = val;
};

const loadVehicles = async () => {
  if (!userId) return;
  try {
    const res = await axios.get(`${API_URL}/api/admin/user_vehicles`, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    vehicles.value = res.data.filter(v => v.user_id === userId).sort((a, b) => b.is_primary - a.is_primary);
  } catch (e) {
    console.error("Ошибка загрузки гаража");
  } finally {
    loading.value = false;
  }
};

const addVehicle = async () => {
  if (!newCar.brand.trim() || !newCar.model.trim()) {
    alert('Марка и модель обязательны');
    return;
  }
  loadingAdd.value = true;
  try {
    const res = await axios.post(`${API_URL}/api/admin/user_vehicles`, {
      ...newCar,
      user_id: userId
    }, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    vehicles.value.unshift(res.data);
    Object.assign(newCar, { brand: '', model: '', year: null, vin: '', engine_volume: null, is_primary: false });
    showAddForm.value = false;
    if (res.data.is_primary) {
      vehicles.value.forEach(v => { if (v.id !== res.data.id) v.is_primary = false; });
    }
  } catch (e) {
    alert("Ошибка при добавлении");
  } finally {
    loadingAdd.value = false;
  }
};

const setPrimary = async (id) => {
  try {
    await axios.put(`${API_URL}/api/admin/user_vehicles/${id}`, { is_primary: true }, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    vehicles.value.forEach(v => v.is_primary = v.id === id);
  } catch (e) { console.error(e); }
};

const deleteVehicle = async (id) => {
  if (!confirm("Удалить этот автомобиль из гаража?")) return;
  try {
    await axios.delete(`${API_URL}/api/admin/user_vehicles/${id}`, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    vehicles.value = vehicles.value.filter(v => v.id !== id);
  } catch (e) { console.error(e); }
};

onMounted(loadVehicles);
</script>

<style scoped>
/* ===== Только уникальные стили, глобальные уже присутствуют ===== */
.garage-page {
  padding: 40px 0 80px;
}
.garage-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

.garage-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
}
.garage-header h1 {
  font-size: 2.4rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: var(--text-muted);
  margin-top: 5px;
}
.back-link {
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
}

/* Форма добавления */
.add-vehicle-section {
  margin-bottom: 40px;
  overflow: hidden;
}
.add-header {
  padding: 20px;
  cursor: pointer;
  text-align: center;
  transition: background 0.2s;
}
.add-header:hover {
  background: var(--primary-light);
}
.add-form {
  padding: 0 30px 30px;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
}
.input-group label {
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
/* Поля ввода используют глобальные стили input */
.vin-field {
  font-family: monospace;
  text-transform: uppercase;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Чекбокс (уникальный) */
.custom-checkbox {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-main);
  user-select: none;
}
.custom-checkbox input {
  position: absolute;
  opacity: 0;
  height: 0;
  width: 0;
}
.checkmark {
  position: relative;
  display: inline-block;
  height: 20px;
  width: 20px;
  background: var(--bg-input);
  border: 2px solid var(--border-color);
  border-radius: 4px;
  transition: all 0.2s;
}
.custom-checkbox:hover input ~ .checkmark {
  border-color: var(--primary);
}
.custom-checkbox input:checked ~ .checkmark {
  background: var(--primary);
  border-color: var(--primary);
}
.checkmark::after {
  content: "";
  position: absolute;
  display: none;
  left: 5px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.custom-checkbox input:checked ~ .checkmark::after {
  display: block;
}

/* Карточки автомобилей */
.vehicles-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
.car-card {
  padding: 25px;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
}
.car-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.08);
}
.car-card.primary-border {
  border-left: 5px solid var(--success);
}
.car-identity {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
}
.car-icon {
  font-size: 2rem;
}
.car-main-title h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 10px;
}
.car-year {
  color: var(--text-muted);
  font-weight: 600;
}
.primary-star {
  font-size: 1.2rem;
}

.car-details {
  display: flex;
  gap: 30px;
  margin-top: 10px;
}
.detail-item {
  display: flex;
  flex-direction: column;
}
.detail-item .label {
  font-size: 0.7rem;
  color: var(--text-muted);
  font-weight: 800;
  text-transform: uppercase;
}
.detail-item .val {
  font-weight: 700;
  color: var(--text-main);
}

.car-actions {
  display: flex;
  gap: 15px;
  margin-top: 20px;
}

/* Кнопка удаления (кастомная) */
.btn-delete {
  color: var(--danger);
  background: transparent;
  border: none;
  font-weight: 700;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 20px;
  transition: background 0.2s;
}
.btn-delete:hover {
  background: var(--danger-light);
}

/* Пустое состояние – используем глобальный .empty-state + иконку */
/* .empty-state уже глобально, здесь только уточнение */
/* .empty-state-icon глобальный, размер можно докрутить */
.empty-state-icon {
  font-size: 4rem; /* переопределим глобальный размер для этой страницы */
}

/* Загрузка */
.loading-state {
  text-align: center;
  padding: 50px;
}
.loader {
  width: 40px;
  height: 40px;
  border: 4px solid var(--border-color);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 15px;
}
/* анимация spin берётся из глобального CSS */

/* Анимация формы */
.slide-enter-active, .slide-leave-active {
  transition: max-height 0.4s ease, opacity 0.4s ease;
  max-height: 500px;
  overflow: hidden;
}
.slide-enter-from, .slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.car-list-enter-active, .car-list-leave-active {
  transition: all 0.3s ease;
}
.car-list-enter-from, .car-list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 768px) {
  .car-card {
    padding: 20px;
  }
  .car-details {
    flex-direction: column;
    gap: 10px;
  }
  .car-actions {
    flex-direction: column;
    gap: 10px;
  }
}
</style>