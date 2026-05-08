<template>
  <div class="settings-page">
    <div v-if="user" class="settings-container glass-card">
      <div class="settings-header">
        <h1>Настройки профиля</h1>
        <router-link to="/profile" class="back-link">← Вернуться в кабинет</router-link>
      </div>

      <!-- 1. БЛОК АВАТАРА (улучшенный) -->
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
            <button @click="triggerFile" class="btn-upload">Загрузить фото</button>
            <button v-if="!isProtectedAvatar(user.avatar_url)" @click="resetToDefault" class="btn-reset-avatar">Удалить личное фото</button>
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

      <hr class="section-divider" />

      <!-- 2. ДАННЫЕ (ФИО) -->
      <section class="data-section">
        <h3 class="section-title">🔸 Основная информация</h3>
        <div class="input-grid-3">
          <div class="field-box">
            <label>Фамилия</label>
            <input v-model="user.last_name" placeholder="Иванов" class="form-input" />
          </div>
          <div class="field-box">
            <label>Имя *</label>
            <input v-model="user.first_name" placeholder="Иван" class="form-input" />
          </div>
          <div class="field-box">
            <label>Отчество</label>
            <input v-model="user.otchestvo" placeholder="Иванович" class="form-input" />
          </div>
        </div>
        
        <div class="input-grid-2">
          <div class="field-box">
            <label>Email</label>
            <input v-model="user.email" placeholder="example@mail.com" class="form-input" />
          </div>
          <div class="field-box">
            <label>Телефон</label>
            <input v-model="user.phone_number" placeholder="+7 (___) ___-__-__" class="form-input" />
          </div>
        </div>
      </section>

      <!-- 3. РЕГИОН -->
      <section class="region-section glass-card">
        <h3 class="section-title">📍 Ваш регион</h3>
        <div class="field-box">
          <label>Город (Населенный пункт)</label>
          <!-- Используем отдельное поле cityName для связи с таблицей cities -->
          <input v-model="cityName" placeholder="Напр. г. Москва" class="form-input" />
          <small class="hint-text">Смена города изменит выбор складов и расчёт доставки.</small>
        </div>
        <div class="checkbox-box">
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
          <div v-for="field in ['old', 'new', 'confirm']" :key="field" class="field-box">
            <label>{{ field === 'old' ? 'Текущий пароль' : field === 'new' ? 'Новый пароль' : 'Повтор пароля' }}</label>
            <div class="password-input-wrap">
              <input v-model="passwords[field]" :type="visibility[field] ? 'text' : 'password'" class="form-input" />
              <button type="button" @click="visibility[field] = !visibility[field]" class="eye-btn">
                {{ visibility[field] ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ФУТЕР -->
      <div class="settings-footer">
        <button @click="$router.push('/profile')" class="btn-cancel">Отмена</button>
        <button @click="saveChanges" class="btn-save" :disabled="isSaving">
          <span v-if="isSaving" class="spinner-small"></span>
          <span v-else>💾 СОХРАНИТЬ ВСЁ</span>
        </button>
      </div>
    </div>

    <!-- ЗАГРУЗКА -->
    <div v-else class="loading-container">
      <div v-if="!errorMessage" class="loading-box glass-card">
        <div class="loader"></div>
        <h2>Загрузка настроек...</h2>
      </div>
      <div v-else class="error-box glass-card">
        <h2>⚠️ {{ errorMessage }}</h2>
        <button @click="logout" class="btn-login-redirect">Войти заново</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const appStore = useAppStore();

const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const authConfig = { headers: { 'x-admin-key': ADMIN_KEY } };

const user = ref(null);
const cityName = ref('');
const errorMessage = ref('');
const isSaving = ref(false);

// Дефолтные аватары из новой БД
const defaultAvatars = ref([
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
]);

const passwords = reactive({ old: '', new: '', confirm: '' });
const visibility = reactive({ old: false, new: false, confirm: false });

const loadData = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) { router.push('/login'); return; }
  
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${userId}`);
    user.value = res.data;
    // Если есть связанный город, вытаскиваем его имя
    if (user.value.cities?.name) {
      cityName.value = user.value.cities.name;
    }
  } catch (e) { 
    errorMessage.value = "Ошибка связи с сервером."; 
  }
};

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
    alert("Фото загружено. Обязательно нажмите 'Сохранить всё'.");
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

const saveChanges = async () => {
  const userId = localStorage.getItem('user_id');
  isSaving.value = true;

  if (passwords.new) {
    if (!passwords.old) { alert("Введите текущий пароль"); isSaving.value = false; return; }
    if (passwords.new !== passwords.confirm) { alert("Пароли не совпадают"); isSaving.value = false; return; }
    
    // Эндпоинт смены пароля (если ты его сделаешь в будущем, пока заглушка)
    // await axios.post(`/api/users/change-password/${userId}`, { oldPassword: passwords.old, newPassword: passwords.new });
  }

  try {
    // Извлекаем системные поля, которые нельзя обновлять напрямую
    const { password_hash, cities, ...updateData } = user.value;
    
    // Передаем город на бэк, чтобы он нашел его ID или создал
    updateData.city = cityName.value;

    const res = await axios.put(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${userId}`, updateData);
    
    // Обновляем локальные данные
    localStorage.setItem('user_name', `${res.data.first_name || ''} ${res.data.last_name || ''}`.trim());
    localStorage.setItem('user_first_name', res.data.first_name || '');
    localStorage.setItem('user_avatar', res.data.avatar_url || defaultAvatars.value[0]);
    
    // Обновляем город в глобальном хранилище
    if (cityName.value) {
      appStore.setCity(cityName.value);
    }

    passwords.old = ''; passwords.new = ''; passwords.confirm = '';
    alert("Профиль успешно обновлен!");
    await loadData();
  } catch (e) { 
    alert("Ошибка сохранения: " + (e.response?.data?.error || e.message)); 
  } finally {
    isSaving.value = false;
  }
};

const logout = () => { localStorage.clear(); router.push('/login'); };
onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ И СТЕКЛА)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.settings-page { padding: 60px 20px; display: flex; justify-content: center; min-height: calc(100vh - 80px); animation: fadeSlideUp 0.6s ease-out; }

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: transform 0.3s, box-shadow 0.3s;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.settings-container { width: 100%; max-width: 1000px; padding: 48px; }
.settings-container:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1); }
:global(.dark) .settings-container:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5); }

/* ШАПКА */
.settings-header { display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 20px; margin-bottom: 40px; }
.settings-header h1 { font-size: 2.2rem; font-weight: 900; margin: 0; color: var(--text-main, #0f172a); }
:global(.dark) .settings-header h1 { color: #f8fafc; }

.back-link { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: var(--primary, #2563eb); text-decoration: none; transition: all 0.3s; padding: 6px 0; }
.back-link:hover { transform: translateX(-6px); text-decoration: underline; }

/* АВАТАР */
.avatar-section { display: flex; flex-direction: column; align-items: center; gap: 32px; padding: 20px 0; }
.avatar-main { text-align: center; position: relative; }
.avatar-wrapper { position: relative; width: 140px; height: 140px; margin: 0 auto; cursor: pointer; }
.current-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 4px solid var(--bg-card, #fff); padding: 0 !important; }
:global(.dark) .current-avatar-img { border-color: #1e293b; }

.avatar-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.3s ease; cursor: pointer;
}
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }
.avatar-wrapper:hover .current-avatar-img { transform: scale(1.02); }
.camera-icon { font-size: 2rem; color: white; }

.avatar-actions { display: flex; gap: 12px; justify-content: center; margin-top: 16px; flex-wrap: wrap; }
.btn-upload { background: var(--primary, #2563eb); color: white; border: none; padding: 8px 24px; border-radius: 40px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
.btn-upload:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }

.btn-reset-avatar { background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger, #ef4444); color: var(--danger, #ef4444); padding: 8px 20px; border-radius: 40px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.3s; }
.btn-reset-avatar:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

.avatar-picker { width: 100%; text-align: center; }
.section-subtitle { color: var(--text-muted, #64748b); font-weight: 600; font-size: 0.9rem; margin-bottom: 16px; letter-spacing: 0.3px; }
.avatar-grid { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
.avatar-option { width: 60px; height: 60px; border-radius: 50%; cursor: pointer; padding: 0 !important; border: 3px solid transparent; transition: all 0.2s; opacity: 0.8; object-fit: cover; }
.avatar-option:hover { transform: translateY(-5px) scale(1.05); opacity: 1; }
.avatar-option.is-selected { border-color: var(--primary, #2563eb); opacity: 1; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2); }

.section-divider { margin: 40px 0; border: none; height: 1px; background: var(--border-color, #e2e8f0); }
:global(.dark) .section-divider { background: #334155; }

/* СЕКЦИИ ДАННЫХ */
.section-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 24px; color: var(--text-main, #0f172a); display: flex; align-items: center; gap: 8px; }
:global(.dark) .section-title { color: #f8fafc; }

.input-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 24px; }
.input-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 24px; }

.field-box { display: flex; flex-direction: column; gap: 8px; }
.field-box label { font-size: 0.75rem; font-weight: 800; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.8px; }
:global(.dark) .field-box label { color: #94a3b8; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); background: rgba(0,0,0,0.02);
  border: 1px solid var(--border-color, #cbd5e1); font-size: 0.95rem; color: var(--text-main, #0f172a); transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); outline: none; }

.hint-text { font-size: 0.75rem; color: var(--text-muted, #94a3b8); margin-top: 4px; }

/* РЕГИОН И ПАРОЛЬ (Выделенные блоки) */
.region-section { background: rgba(37, 99, 235, 0.03); padding: 28px 32px; border-radius: var(--radius-md, 12px); margin: 40px 0; border: 1px solid rgba(37, 99, 235, 0.1); }
:global(.dark) .region-section { background: rgba(37, 99, 235, 0.05); border-color: rgba(37, 99, 235, 0.2); }
.password-section { background: rgba(239, 68, 68, 0.03); padding: 28px 32px; border-radius: var(--radius-md, 12px); margin-bottom: 40px; border: 1px solid rgba(239, 68, 68, 0.1); }
:global(.dark) .password-section { background: rgba(239, 68, 68, 0.05); border-color: rgba(239, 68, 68, 0.2); }

/* ПОЛЕ ПАРОЛЯ С ГЛАЗКОМ */
.password-input-wrap { position: relative; display: flex; align-items: center; }
.password-input-wrap .form-input { flex: 1; padding-right: 45px; }
.eye-btn { position: absolute; right: 12px; background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6; transition: all 0.2s; padding: 4px; }
.eye-btn:hover { opacity: 1; transform: scale(1.1); }

/* ЧЕКБОКС */
.checkbox-box { margin-top: 24px; }
.custom-checkbox { display: inline-flex; align-items: center; gap: 12px; cursor: pointer; font-weight: 600; font-size: 0.95rem; color: var(--text-main, #0f172a); user-select: none; }
:global(.dark) .custom-checkbox { color: #f8fafc; }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; background: transparent; border: 2px solid var(--border-color, #cbd5e1); border-radius: 6px; position: relative; transition: all 0.2s; }
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--primary, #2563eb); border-color: var(--primary, #2563eb); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

/* ФУТЕРНЫЕ КНОПКИ */
.settings-footer { display: flex; justify-content: flex-end; gap: 20px; margin-top: 40px; }
.btn-cancel { background: transparent; padding: 12px 32px; border-radius: var(--radius-md, 8px); font-weight: 700; font-size: 0.95rem; color: var(--text-muted, #64748b); border: 2px solid var(--border-color, #cbd5e1); cursor: pointer; transition: all 0.3s; }
:global(.dark) .btn-cancel { border-color: #475569; color: #94a3b8; }
.btn-cancel:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); transform: translateY(-2px); }

.btn-save {
  background: linear-gradient(135deg, var(--success, #10b981), #059669); color: white; padding: 12px 44px;
  border-radius: var(--radius-md, 8px); font-weight: 800; font-size: 0.95rem; letter-spacing: 1px;
  border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  display: inline-flex; align-items: center; justify-content: center; min-width: 200px;
}
.btn-save:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4); }
.btn-save:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner-small { width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

/* ЛОАДЕР */
.loading-container { padding: 100px; text-align: center; }
.loading-box { padding: 40px; max-width: 400px; margin: 0 auto; }
.loader { width: 60px; height: 60px; border: 4px solid var(--border-color, #e2e8f0); border-top-color: var(--primary, #2563eb); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
:global(.dark) .loader { border-color: #334155; border-top-color: #3b82f6; }

.loading-box h2 { color: var(--text-muted, #64748b); font-size: 1.2rem; font-weight: 600; }
.error-box { background: rgba(239, 68, 68, 0.1); padding: 40px; max-width: 400px; margin: 0 auto; text-align: center; border: 1px solid rgba(239, 68, 68, 0.3); }
.error-box h2 { color: var(--danger, #ef4444); margin-bottom: 20px; }
.btn-login-redirect { background: var(--primary, #2563eb); color: white; padding: 12px 24px; border-radius: var(--radius-md, 8px); font-weight: 700; border: none; cursor: pointer; }

/* АДАПТИВНОСТЬ */
@media (max-width: 992px) { .settings-container { padding: 32px; } }
@media (max-width: 768px) {
  .settings-page { padding: 40px 16px; }
  .settings-container { padding: 24px; }
  .input-grid-3, .input-grid-2 { grid-template-columns: 1fr; gap: 16px; }
  .settings-header { flex-direction: column; align-items: flex-start; }
  .settings-footer { flex-direction: column-reverse; gap: 12px; }
  .settings-footer button { width: 100%; justify-content: center; }
  .region-section, .password-section { padding: 20px; }
  .avatar-wrapper { width: 110px; height: 110px; }
}
</style>