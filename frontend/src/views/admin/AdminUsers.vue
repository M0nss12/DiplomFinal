<template>
  <div class="admin-users">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>👥 Управление пользователями</h1>
        <p class="subtitle">Редактирование профилей, управление аватарами и правами доступа</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Всего: <b>{{ filteredUsers.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА СОЗДАНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить пользователя</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createUser" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>📛 Фамилия</label>
            <input v-model="newUser.last_name" placeholder="Иванов" class="form-input" />
          </div>
          <div class="input-group">
            <label>📛 Имя *</label>
            <input v-model="newUser.first_name" placeholder="Иван" required class="form-input" />
          </div>
          <div class="input-group">
            <label>📛 Отчество</label>
            <input v-model="newUser.otchestvo" placeholder="Иванович" class="form-input" />
          </div>
          <div class="input-group">
            <label>📧 Email</label>
            <input v-model="newUser.email" type="email" placeholder="mail@example.com" class="form-input" />
          </div>
          <div class="input-group">
            <label>📞 Телефон</label>
            <input
              v-model="newUser.phone_number"
              type="tel"
              placeholder="+7-___-___-__-__"
              class="form-input"
              @input="formatPhone($event, 'new')"
            />
          </div>
          <div class="input-group">
            <label>👑 Роль</label>
            <select v-model="newUser.role" class="form-input">
              <option value="guest">Гость</option>
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
            </select>
          </div>
          <div class="input-group">
            <label>🔒 Пароль</label>
            <input v-model="newUser.password" type="password" placeholder="Задайте пароль..." class="form-input" />
          </div>
          <!-- Город с автодополнением -->
          <div class="input-group autocomplete-wrapper">
            <label>📍 Город</label>
            <input
              v-model="citySearch"
              type="text"
              placeholder="Начните вводить..."
              class="form-input"
              @input="filterCities"
              @focus="showCitySuggestions = true"
              @blur="hideCitySuggestions"
            />
            <ul v-if="showCitySuggestions && filteredCities.length" class="suggestions glass-card">
              <li
                v-for="c in filteredCities"
                :key="c.id"
                @mousedown.prevent="selectCity(c)"
              >
                {{ c.name }}
              </li>
            </ul>
          </div>
        </div>
        <div class="form-footer">
          <button type="submit" class="btn-primary" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner-small"></span>
            <span v-else>✨ Создать аккаунт</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Фильтры и поиск</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔎 Умный поиск</label>
          <input v-model="searchQuery" placeholder="ФИО, Email, Телефон, ID..." class="form-input" />
        </div>
        <div class="input-group">
          <label>👑 Роль</label>
          <select v-model="roleFilter" class="form-input">
            <option value="all">Все роли</option>
            <option value="admin">Администраторы</option>
            <option value="user">Пользователи</option>
            <option value="guest">Гости</option>
          </select>
        </div>
        <div class="input-group">
          <label>📊 Сортировка</label>
          <select v-model="sortOrder" class="form-input">
            <option value="new">Сначала новые</option>
            <option value="old">Сначала старые</option>
            <option value="name">По имени (А→Я)</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ -->
    <div class="table-container">
      <div class="table-meta">
        <span class="meta-icon">📄</span>
        Страница {{ currentPage }} из {{ totalPages || 1 }}
      </div>

      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-avatar">Аватар</th>
              <th>ID / ФИО</th>
              <th>Контакты</th>
              <th class="text-center">Роль / Согласие</th>
              <th>Город</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in paginatedUsers" :key="u.id" class="user-row">
              <td class="col-avatar">
                <div class="avatar-edit-box">
                  <img :src="u.avatar_url || defaultAvatars[0]" 
                       class="table-avatar clickable" 
                       @click="openImagePreview(u.avatar_url)"
                       @error="u.avatar_url = defaultAvatars[0]" />
                  <button @click="openAvatarPicker(u)" class="btn-edit-avatar">✎</button>
                </div>
              </td>

              <td>
                <div class="client-id">ID: {{ u.id }}</div>
                <div class="name-edit-row">
                  <input v-model="u.last_name" @change="updateUser(u)" class="inline-edit bold" placeholder="Фамилия" />
                  <input v-model="u.first_name" @change="updateUser(u)" class="inline-edit bold" placeholder="Имя" />
                  <input v-model="u.otchestvo" @change="updateUser(u)" class="inline-edit" placeholder="Отчество" />
                </div>
                <div class="date-tag">Рег: {{ formatDate(u.created_at) }}</div>
              </td>

              <td>
                <div class="contact-fields">
                  <input v-model="u.email" @change="updateUser(u)" class="inline-edit" placeholder="Email" />
                  <input
                    v-model="u.phone_number"
                    type="tel"
                    class="inline-edit"
                    placeholder="+7-___-___-__-__"
                    @input="formatPhone($event, u)"
                    @change="updateUser(u)"
                  />
                </div>
              </td>

              <td class="text-center">
                <div class="role-control">
                  <select v-model="u.role" @change="updateUser(u)" class="role-select" :class="u.role">
                    <option value="guest">Гость</option>
                    <option value="user">Пользователь</option>
                    <option value="admin">Админ</option>
                  </select>
                </div>
                <div class="consent-control">
                  <label class="custom-checkbox small-check">
                    <input type="checkbox" v-model="u.allows_data_saving" @change="updateUser(u)" />
                    <span class="checkmark"></span>
                    <span class="consent-text">Data Saving</span>
                  </label>
                </div>
              </td>

              <!-- Город через select -->
              <td>
                <select
                  v-model="u.city_id"
                  @change="onCitySelect(u)"
                  class="inline-edit table-select"
                >
                  <option :value="null">-- Не выбран --</option>
                  <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </td>

              <td class="text-right action-buttons">
                <button @click="resetUserPassword(u)" class="btn-secondary-small">🔑 Пароль</button>
                <button @click="deleteUser(u)" class="btn-delete-small">🗑️</button>
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

    <!-- МОДАЛКА ВЫБОРА АВАТАРА -->
    <div v-if="showAvatarPicker" class="modal-overlay" @click.self="showAvatarPicker = false">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>Аватар для {{ editingUser?.first_name }}</h3>
          <button @click="showAvatarPicker = false" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <p class="section-label">🎨 Стандартные аватары:</p>
          <div class="avatar-grid">
            <img v-for="url in defaultAvatars" :key="url" :src="url" @click="setAvatar(url)" class="avatar-option glass-card" />
          </div>
          <div class="upload-custom">
            <p class="section-label">📁 Загрузить своё фото:</p>
            <label class="file-upload-label glass-card">
              <input type="file" @change="handleFileUpload" accept="image/*" hidden />
              <span>Выбрать файл</span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <!-- ПРОСМОТР ФОТО -->
    <div v-if="previewUrl" class="image-preview-overlay" @click="previewUrl = null">
      <img :src="previewUrl" class="full-image" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const users = ref([]);
const cities = ref([]);                     // для выбора города
const searchQuery = ref('');
const roleFilter = ref('all');
const sortOrder = ref('new');
const currentPage = ref(1);
const itemsPerPage = 20;
const loadingAction = ref(false);

const defaultAvatars = [
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
    `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
];

const showAvatarPicker = ref(false);
const editingUser = ref(null);
const previewUrl = ref(null);

// Для автодополнения города в форме создания
const citySearch = ref('');
const showCitySuggestions = ref(false);
const filteredCities = computed(() => {
  const q = citySearch.value.trim().toLowerCase();
  if (!q) return [];
  return cities.value.filter(c => c.name.toLowerCase().includes(q));
});

const selectCity = (city) => {
  newUser.city = city.name;
  citySearch.value = city.name;
  showCitySuggestions.value = false;
};

const filterCities = () => {
  showCitySuggestions.value = true;
};

const hideCitySuggestions = () => {
  setTimeout(() => { showCitySuggestions.value = false; }, 150);
};

// Маска телефона (универсальная для формы и строк таблицы)
const formatPhone = (event, target) => {
  const input = event.target;
  let value = input.value.replace(/[^\d]/g, '');
  if (value.length === 0) {
    input.value = '';
    if (target === 'new') newUser.phone_number = '';
    else target.phone_number = '';
    return;
  }

  let formatted = '+7';
  if (value.length > 1) formatted += '-' + value.substring(1, 4);
  if (value.length >= 4) formatted += '-' + value.substring(4, 7);
  if (value.length >= 7) formatted += '-' + value.substring(7, 9);
  if (value.length >= 9) formatted += '-' + value.substring(9, 11);
  input.value = formatted;

  if (target === 'new') newUser.phone_number = formatted;
  else target.phone_number = formatted;
};

const loadData = async () => {
  try {
    const [userRes, cityRes] = await Promise.all([
      axios.get(`/api/admin/users`, config),
      axios.get(`/api/cities`)          // публичный эндпоинт городов
    ]);
    users.value = userRes.data.map(u => ({
      ...u,
      cityName: u.cities?.name || ''
    }));
    cities.value = cityRes.data || [];
  } catch (e) { 
    console.error('Ошибка загрузки данных'); 
  }
};

const formatDate = (date) => date ? new Date(date).toLocaleDateString('ru-RU') : '---';

// Менеджмент Storage (как и раньше)
const getFilenameFromUrl = (url) => url ? url.split('/').pop() : null;
const isProtectedAvatar = (url) => {
  const name = getFilenameFromUrl(url);
  return ['1.png', '2.png', '3.png'].includes(name);
};

const deleteAvatarFromStorage = async (url) => {
  if (!url || isProtectedAvatar(url)) return;
  try {
    await axios.delete(`/api/storage/avatars/${getFilenameFromUrl(url)}`, config);
  } catch (e) { }
};

const openImagePreview = (url) => { if (url) previewUrl.value = url; };
const openAvatarPicker = (user) => { editingUser.value = user; showAvatarPicker.value = true; };

const setAvatar = async (newUrl) => {
  await deleteAvatarFromStorage(editingUser.value.avatar_url);
  editingUser.value.avatar_url = newUrl;
  await updateUser(editingUser.value);
  showAvatarPicker.value = false;
};

const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await axios.post(`/api/upload/avatars`, formData, config);
    await setAvatar(res.data.url);
  } catch (err) { alert('Ошибка загрузки'); }
};

// CRUD
const newUser = reactive({ first_name: '', last_name: '', otchestvo: '', email: '', phone_number: '', role: 'user', password: '', city: '', allows_data_saving: false });

const createUser = async () => {
  if (!newUser.first_name) return alert('Имя обязательно');
  loadingAction.value = true;
  try {
    // Для города передаем название (newUser.city уже заполнено через автодополнение)
    const res = await axios.post(`/api/admin/users`, newUser, config);
    await loadData();
    Object.assign(newUser, { first_name: '', last_name: '', otchestvo: '', email: '', phone_number: '', password: '', city: '' });
    citySearch.value = '';
    alert('Пользователь создан!');
  } catch (e) { 
    alert(e.response?.data?.error || 'Ошибка создания'); 
  } finally {
    loadingAction.value = false;
  }
};

const updateUser = async (user) => {
  try {
    const { cities, cityName, ...payload } = user;
    // Если город выбран через select, city_id содержит id. Передадим его как city_id, а бэкенд сам разберется.
    // Но текущий бэкенд ожидает 'city' (название). Поэтому мы дополнительно отправляем city_id? 
    // Проще: при выборе в select мы сохраняем city_id и cityName. В payload отправляем city: cityName.
    payload.city = user.cityName || '';
    await axios.put(`/api/users/profile/${user.id}`, payload, config);
  } catch (e) { console.error("Update error"); }
};

// Обработчик изменения города в таблице
const onCitySelect = (user) => {
  const selectedCity = cities.value.find(c => c.id === user.city_id);
  if (selectedCity) {
    user.cityName = selectedCity.name;
    updateUser(user);
  }
};

const resetUserPassword = async (user) => {
  const newPass = prompt(`Новый пароль для ${user.first_name}:`);
  if (newPass && newPass.length >= 6) {
    await axios.put(`/api/users/profile/${user.id}`, { password_hash: newPass }, config);
    alert('Пароль обновлен');
  } else if (newPass) alert('Минимум 6 символов');
};

const deleteUser = async (user) => {
  if (!confirm(`Удалить ${user.first_name}?`)) return;
  try {
    await deleteAvatarFromStorage(user.avatar_url);
    await axios.delete(`/api/admin/users/${user.id}`, config);
    users.value = users.value.filter(u => u.id !== user.id);
  } catch (e) { alert('Ошибка удаления'); }
};

// Фильтры
const filteredUsers = computed(() => {
  let res = [...users.value];
  if (roleFilter.value !== 'all') res = res.filter(u => u.role === roleFilter.value);
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(u =>
      (u.first_name || '').toLowerCase().includes(q) ||
      (u.last_name || '').toLowerCase().includes(q) ||
      (u.otchestvo || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone_number || '').includes(q) ||
      u.id.includes(q)
    );
  }
  if (sortOrder.value === 'new') res.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (sortOrder.value === 'name') res.sort((a, b) => a.first_name.localeCompare(b.first_name));
  return res;
});

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage));
const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredUsers.value.slice(start, start + itemsPerPage);
});

const resetFilters = () => { searchQuery.value = ''; roleFilter.value = 'all'; sortOrder.value = 'new'; };
watch([searchQuery, roleFilter, sortOrder], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
/* Полный CSS из предыдущей версии + новые стили для autocomplete */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-users { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-users { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0 0 6px 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

/* ФОРМА */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; margin-bottom: 28px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 10px 14px; border-radius: 8px; border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.9rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

/* autocomplete */
.autocomplete-wrapper { position: relative; }
.suggestions {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 100;
  max-height: 200px; overflow-y: auto; list-style: none; padding: 0; margin-top: 4px;
  border-radius: 8px; background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0);
  box-shadow: 0 10px 20px rgba(0,0,0,0.1);
}
:global(.dark) .suggestions { background: #1e293b; border-color: #334155; }
.suggestions li {
  padding: 10px 16px; cursor: pointer; font-size: 0.9rem; color: var(--text-main, #0f172a);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .suggestions li { color: #f8fafc; }
.suggestions li:hover { background: rgba(37, 99, 235, 0.1); }

.form-footer { display: flex; justify-content: flex-end; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); display: flex; align-items: center; gap: 10px;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* ФИЛЬТРЫ */
.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 20px; align-items: flex-end; }
.btn-text-link { background: none; border: none; color: var(--primary, #2563eb); font-weight: 800; cursor: pointer; text-decoration: underline; }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; transition: background 0.2s; }
:global(.dark) .admin-table td { border-color: #334155; }
.user-row:hover td { background: rgba(37, 99, 235, 0.03); }

.col-avatar { width: 80px; text-align: center; }
.table-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color, #cbd5e1); cursor: pointer; transition: 0.2s; }
.avatar-edit-box { position: relative; display: inline-block; }
.btn-edit-avatar { position: absolute; bottom: 0; right: 0; background: var(--primary, #2563eb); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }

.client-id { font-size: 0.7rem; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; margin-bottom: 5px; }
.name-edit-row { display: flex; flex-direction: column; gap: 4px; }
.inline-edit { background: transparent; border: 1px solid transparent; padding: 4px 8px; border-radius: 6px; color: var(--text-main, #0f172a); width: 100%; transition: 0.2s; font-size: 0.9rem; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #cbd5e1); }
.inline-edit:focus { border-color: var(--primary, #2563eb); background: var(--bg-card, #fff); outline: none; }
.bold { font-weight: 800; }
.date-tag { font-size: 0.65rem; color: var(--text-muted, #94a3b8); margin-top: 5px; font-weight: 600;}

/* Селект города в таблице */
.table-select {
  background: transparent; border: 1px solid transparent; padding: 6px; border-radius: 6px;
  width: 100%; font-weight: 500; cursor: pointer; color: var(--text-main, #0f172a);
}
:global(.dark) .table-select { color: #f8fafc; }

/* Роли */
.role-select { padding: 6px 12px; border-radius: 40px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; border: none; cursor: pointer; transition: 0.2s; background: rgba(0,0,0,0.05); }
.role-select.admin { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }
.role-select.user { background: rgba(37, 99, 235, 0.1); color: var(--primary, #2563eb); }
.role-select.guest { background: rgba(0,0,0,0.1); color: #64748b; }

.consent-control { margin-top: 8px; }
.custom-checkbox.small-check .checkmark { width: 16px; height: 16px; }
.consent-text { font-size: 0.65rem; color: var(--text-muted, #94a3b8); font-weight: 700; }

.action-buttons { display: flex; flex-direction: column; gap: 6px; }
.btn-secondary-small { background: rgba(0,0,0,0.05); border: 1px solid var(--border-color, #cbd5e1); padding: 6px 12px; border-radius: 30px; font-weight: 700; font-size: 0.75rem; color: var(--text-main, #0f172a); cursor: pointer; transition: 0.2s; }
:global(.dark) .btn-secondary-small { color: #f8fafc; border-color: #475569; }
.btn-delete-small { background: rgba(239, 68, 68, 0.1); border: none; padding: 6px 12px; border-radius: 30px; font-weight: 800; font-size: 0.75rem; color: var(--danger, #ef4444); cursor: pointer; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 40px; }
.p-btn { width: 40px; height: 40px; border-radius: 12px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card, #fff); color: var(--text-main, #0f172a); font-weight: 800; cursor: pointer; }
:global(.dark) .p-btn { background: #1e293b; border-color: #334155; color: #f8fafc; }
.p-numbers button { width: 40px; height: 40px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(37, 99, 235, 0.3); }

/* МОДАЛКА */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-content { width: 90%; max-width: 480px; padding: 30px; position: relative; }
.avatar-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
.avatar-option { width: 100%; aspect-ratio: 1; border-radius: 50%; object-fit: cover; cursor: pointer; transition: 0.2s; border: 2px solid transparent; }
.avatar-option:hover { border-color: var(--primary, #2563eb); transform: scale(1.05); }

/* ПРОСМОТР */
.image-preview-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10001; cursor: zoom-out; }
.full-image { max-width: 90%; max-height: 90%; border-radius: 20px; border: 4px solid #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }

/* АДАПТИВНОСТЬ */
@media (max-width: 900px) { .filter-grid { grid-template-columns: 1fr; } .input-grid { grid-template-columns: 1fr; } }
@media (max-width: 768px) {
  .admin-users { padding: 24px 16px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .action-buttons { flex-direction: row; }
}
</style>