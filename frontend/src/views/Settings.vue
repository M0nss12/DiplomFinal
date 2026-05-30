<template>
  <div class="settings-page animate-fade-in">
    <div v-if="user" class="settings-container glass-card">
      <div class="settings-header">
        <h1>⚙️ Настройки профиля</h1>
        <router-link to="/profile" class="back-link">← Вернуться в кабинет</router-link>
      </div>

      <!-- 1. БЛОК АВАТАРА -->
      <section class="avatar-section">
        <div class="avatar-main">
          <div class="avatar-wrapper">
            <img :src="user.avatar_url || defaultAvatars[0]" class="current-avatar-img glass-card" />
            <div class="avatar-overlay" @click="triggerFile">
              <span class="camera-icon">📷</span>
            </div>
          </div>
          <input type="file" @change="handleCustomPhoto" id="avatar-file" style="display:none" accept="image/*" />
          <div class="avatar-actions">
            <button @click="triggerFile" class="btn btn-primary btn-sm">Загрузить фото</button>
            <button v-if="!isProtectedAvatar(user.avatar_url)" @click="resetToDefault" class="btn btn-outline btn-sm text-danger">Удалить личное фото</button>
          </div>
        </div>
        
        <div class="avatar-picker">
          <p class="section-subtitle">Или выберите готовый аватар:</p>
          <div class="avatar-grid">
            <img 
              v-for="url in defaultAvatars" 
              :key="url" 
              :src="url" 
              @click="selectDefaultAvatar(url)"
              class="avatar-option glass-card"
              :class="{ 'is-selected': user.avatar_url === url }"
            />
          </div>
        </div>
      </section>

      <hr class="divider" />

      <!-- 2. ДАННЫЕ (ФИО) -->
      <section class="data-section">
        <h3 class="section-title">🔸 Основная информация</h3>
        <div class="input-grid-3">
          <div class="form-group">
            <label>Фамилия</label>
            <input v-model="user.last_name" placeholder="Иванов" />
          </div>
          <div class="form-group">
            <label>Имя *</label>
            <input v-model="user.first_name" placeholder="Иван" />
          </div>
          <div class="form-group">
            <label>Отчество</label>
            <input v-model="user.otchestvo" placeholder="Иванович" />
          </div>
        </div>
        
        <div class="input-grid-2">
          <div class="form-group">
            <label>Email</label>
            <input v-model="user.email" placeholder="example@mail.com" />
          </div>
          <div class="form-group">
            <label>Телефон</label>
            <input :value="phoneDisplay" type="tel" placeholder="+7 (___) ___-__-__" @input="onPhoneInput" />
          </div>
        </div>
      </section>

      <!-- 3. РЕГИОН -->
      <section class="region-section glass-card">
        <h3 class="section-title">📍 Ваш регион</h3>
        <div class="form-group city-autocomplete">
          <label>Город (Населенный пункт)</label>
          <input 
            :value="cityInput" 
            @input="onCityInput" 
            @focus="showCitySuggestions = true" 
            @blur="onCityBlur" 
            placeholder="Начните вводить название..." 
            autocomplete="off"
          />
          <transition name="dropdown-fade">
            <ul v-if="showCitySuggestions && filteredCities.length" class="city-suggestions glass-card">
              <li v-for="c in filteredCities" :key="c.id" @mousedown.prevent="selectCity(c)">
                {{ c.name }}
              </li>
            </ul>
          </transition>
          <small class="hint-text">Смена города изменит выбор складов и расчёт доставки.</small>
        </div>
        <div class="checkbox-box mt-3">
          <label class="custom-checkbox">
            <input type="checkbox" v-model="user.allows_data_saving" />
            <span class="checkmark"></span>
            Разрешить обработку и сохранение данных для будущих заказов
          </label>
        </div>
      </section>

      <!-- 4. ПАРОЛЬ -->
      <section class="password-section glass-card">
        <h3 class="section-title">🔒 Безопасность</h3>
        <div class="input-grid-3">
          <div v-for="field in ['old', 'new', 'confirm']" :key="field" class="form-group">
            <label>{{ field === 'old' ? 'Текущий пароль' : field === 'new' ? 'Новый пароль' : 'Повтор пароля' }}</label>
            <div class="password-input-wrap">
              <input v-model="passwords[field]" :type="visibility[field] ? 'text' : 'password'" />
              <button type="button" @click="visibility[field] = !visibility[field]" class="eye-btn">
                {{ visibility[field] ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ФУТЕР -->
      <div class="settings-footer">
        <button @click="$router.push('/profile')" class="btn btn-outline">Отмена</button>
        <button @click="saveChanges" class="btn btn-success" :disabled="isSaving">
          <span v-if="isSaving" class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
          <span v-else>💾 СОХРАНИТЬ ВСЁ</span>
        </button>
      </div>
    </div>

    <!-- ЗАГРУЗКА -->
    <div v-else class="loading-container">
      <div v-if="!errorMessage" class="text-center">
        <span class="spinner" style="width: 60px; height: 60px; border-width: 4px;"></span>
        <h2 class="text-muted mt-3">Загрузка настроек...</h2>
      </div>
      <div v-else class="alert alert-error glass-card" style="max-width: 400px; margin: 0 auto;">
        <h2>⚠️ {{ errorMessage }}</h2>
        <button @click="logout" class="btn btn-primary">Войти заново</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const appStore = useAppStore();

const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const authConfig = { headers: { 'x-admin-key': ADMIN_KEY } };

const user = ref(null);
const cityInput = ref('');
const phoneDisplay = ref('');
const errorMessage = ref('');
const isSaving = ref(false);

// Список городов для автодополнения
const cities = ref([]);
const showCitySuggestions = ref(false);
const filteredCities = computed(() => {
  const q = cityInput.value.trim().toLowerCase();
  if (!q) return [];
  return cities.value.filter(c => c.name.toLowerCase().includes(q));
});

// Дефолтные аватары
const defaultAvatars = ref([
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
]);

const passwords = reactive({ old: '', new: '', confirm: '' });
const visibility = reactive({ old: false, new: false, confirm: false });

// Загрузка данных пользователя и городов
const loadData = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) { router.push('/login'); return; }
  
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${userId}`);
    user.value = res.data;
    // Город из профиля
    if (user.value.cities?.name) {
      cityInput.value = user.value.cities.name;
    } else if (appStore.city) {
      cityInput.value = appStore.city;
    }
    // Телефон
    if (user.value.phone_number) {
      phoneDisplay.value = formatPhoneForDisplay(user.value.phone_number);
    }
  } catch (e) { 
    errorMessage.value = "Ошибка связи с сервером."; 
  }
};

const loadCities = async () => {
  try {
    const res = await axios.get('/api/cities');
    cities.value = res.data || [];
  } catch (e) { /* игнорируем */ }
};

// Маска телефона
const onPhoneInput = (e) => {
  let val = e.target.value.replace(/[^\d]/g, '');
  if (val.startsWith('7') || val.startsWith('8')) val = val.substring(1);
  let formatted = '+7';
  if (val.length > 0) formatted += ' (' + val.substring(0, 3);
  if (val.length >= 4) formatted += ') ' + val.substring(3, 6);
  if (val.length >= 7) formatted += '-' + val.substring(6, 8);
  if (val.length >= 9) formatted += '-' + val.substring(8, 10);
  e.target.value = formatted;
  phoneDisplay.value = formatted;
  user.value.phone_number = '+' + val.replace(/\D/g, ''); // сохраняем чистый номер
};

const formatPhoneForDisplay = (phone) => {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d]/g, '');
  if (cleaned.startsWith('8')) cleaned = '7' + cleaned.substring(1);
  if (!cleaned.startsWith('7')) cleaned = '7' + cleaned;
  let display = '+7';
  if (cleaned.length > 1) display += ' (' + cleaned.substring(1, 4);
  if (cleaned.length >= 4) display += ') ' + cleaned.substring(4, 7);
  if (cleaned.length >= 7) display += '-' + cleaned.substring(7, 9);
  if (cleaned.length >= 9) display += '-' + cleaned.substring(9, 11);
  return display.substring(0, 17);
};

// Автодополнение города
const onCityInput = (e) => {
  cityInput.value = e.target.value;
  showCitySuggestions.value = true;
};
const selectCity = (city) => {
  cityInput.value = city.name;
  showCitySuggestions.value = false;
};
const onCityBlur = () => {
  setTimeout(() => {
    if (!cities.value.some(c => c.name === cityInput.value)) {
      // если ввели что-то не из списка – оставляем старое значение
      cityInput.value = (user.value.cities?.name) || appStore.city || '';
    }
    showCitySuggestions.value = false;
  }, 150);
};

// Файловые утилиты
const getFilenameFromUrl = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  return parts.pop();
};

const isProtectedAvatar = (url) => {
  if (!url) return true;
  const filename = getFilenameFromUrl(url);
  return ['1.png', '2.png', '3.png', '4.png', '5.png', '6.png'].includes(filename);
};

const deleteAvatarFromStorage = async (url) => {
  if (!url || isProtectedAvatar(url)) return;
  const filename = getFilenameFromUrl(url);
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/storage/avatars/${filename}`, authConfig);
  } catch (e) { console.warn('Файл не найден в Storage'); }
};

const triggerFile = () => document.getElementById('avatar-file').click();

const handleCustomPhoto = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  try {
    await deleteAvatarFromStorage(user.value.avatar_url);
    const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/upload/avatars`, formData);
    user.value.avatar_url = res.data.url;
    alert("Фото загружено. Нажмите 'Сохранить всё'.");
  } catch (err) { alert("Ошибка загрузки"); }
};

const selectDefaultAvatar = async (url) => {
  if (user.value.avatar_url !== url) {
    await deleteAvatarFromStorage(user.value.avatar_url);
    user.value.avatar_url = url;
  }
};

const resetToDefault = async () => {
  await deleteAvatarFromStorage(user.value.avatar_url);
  user.value.avatar_url = defaultAvatars.value[0];
};

// Сохранение
const saveChanges = async () => {
  const userId = localStorage.getItem('user_id');
  isSaving.value = true;

  // Смена пароля
  if (passwords.new) {
    if (!passwords.old) { 
      alert("Введите текущий пароль для подтверждения изменений"); 
      isSaving.value = false; 
      return; 
    }
    if (passwords.new !== passwords.confirm) { 
      alert("Новые пароли не совпадают"); 
      isSaving.value = false; 
      return; 
    }
    if (passwords.new.length < 6) {
      alert("Новый пароль должен быть не короче 6 символов");
      isSaving.value = false;
      return;
    }

    try {
      await axios.post(`/api/users/change-password/${userId}`, {
        oldPassword: passwords.old,
        newPassword: passwords.new
      });
      passwords.old = ''; passwords.new = ''; passwords.confirm = '';
      alert("Пароль успешно обновлен!");
    } catch (e) { 
      alert(e.response?.data?.error || "Ошибка при смене пароля"); 
      isSaving.value = false;
      return;
    }
  }

  // Сохранение профиля
  try {
    const { password_hash, cities, ...updateData } = user.value;
    updateData.city = cityInput.value;   // отправляем название города
    const res = await axios.put(`/api/users/profile/${userId}`, updateData);
    
    localStorage.setItem('user_name', `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim());
    localStorage.setItem('user_first_name', res.data.first_name || '');
    localStorage.setItem('user_avatar', res.data.avatar_url || defaultAvatars.value[0]);
    
    if (cityInput.value) {
      appStore.setCity(cityInput.value);
    }

    alert("Данные профиля сохранены!");
    await loadData();
  } catch (e) { 
    alert("Ошибка сохранения профиля: " + (e.response?.data?.error || e.message)); 
  } finally {
    isSaving.value = false;
  }
};

const logout = () => { localStorage.clear(); router.push('/login'); };

onMounted(() => {
  loadCities();
  loadData();
});
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ НАСТРОЕК (глобальные классы уже применены)
   ========================================================================== */
.settings-page {
  padding: 60px 20px;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 80px);
}

.settings-container {
  width: 100%;
  max-width: 1000px;
  padding: 48px;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 40px;
}
.settings-header h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0;
  color: var(--text-main);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  transition: transform 0.2s;
}
.back-link:hover {
  transform: translateX(-6px);
  text-decoration: underline;
}

/* Аватар */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 20px 0;
}
.avatar-main {
  text-align: center;
  position: relative;
}
.avatar-wrapper {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 0 auto;
  cursor: pointer;
}
.current-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--bg-card);
}
.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  cursor: pointer;
}
.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}
.camera-icon {
  font-size: 2rem;
  color: white;
}

.avatar-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
}

/* Текстовые подсказки */
.section-subtitle {
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.avatar-grid {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}
.avatar-option {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  border: 3px solid transparent;
  transition: all 0.2s;
  opacity: 0.8;
  object-fit: cover;
}
.avatar-option:hover {
  transform: translateY(-5px) scale(1.05);
  opacity: 1;
}
.avatar-option.is-selected {
  border-color: var(--primary);
  opacity: 1;
  box-shadow: 0 0 0 3px var(--primary-light);
}

/* Заголовки секций */
.section-title {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 24px;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Сетки */
.input-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}
.input-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 24px;
}

/* Обёртка группы полей – используем глобальный .form-group, убираем лишние стили */
.form-group {
  margin-bottom: 0; /* сбросим глобальный отступ, так как управляем через сетку */
}

/* Автодополнение городов */
.city-autocomplete {
  position: relative;
}
.city-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin-top: 4px;
}
.city-suggestions li {
  padding: 12px 18px;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}
.city-suggestions li:hover {
  background: var(--primary-light);
  color: var(--primary);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.hint-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Акцентные секции (регион/пароль) */
.region-section {
  background: var(--primary-light);
  padding: 28px 32px;
  border-radius: var(--radius-md);
  margin: 40px 0;
  border: 1px solid var(--primary-light);
}
.password-section {
  background: rgba(239, 68, 68, 0.03);
  padding: 28px 32px;
  border-radius: var(--radius-md);
  margin-bottom: 40px;
  border: 1px solid rgba(239, 68, 68, 0.1);
}
:global(.dark) .password-section {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

.password-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.password-input-wrap input {
  padding-right: 45px;
}
.eye-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
  padding: 4px;
}
.eye-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Чекбокс */
.checkbox-box {
  margin-top: 24px;
}
.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-main);
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

/* Футер */
.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 20px;
  margin-top: 40px;
}

/* Утилиты */
.mt-3 { margin-top: 24px; }

/* Адаптивность */
@media (max-width: 992px) {
  .settings-container {
    padding: 32px;
  }
}
@media (max-width: 768px) {
  .settings-page {
    padding: 40px 16px;
  }
  .settings-container {
    padding: 24px;
  }
  .input-grid-3,
  .input-grid-2 {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .settings-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .settings-footer {
    flex-direction: column-reverse;
    gap: 12px;
  }
  .region-section,
  .password-section {
    padding: 20px;
  }
  .avatar-wrapper {
    width: 110px;
    height: 110px;
  }
}
</style>