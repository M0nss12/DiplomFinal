<template>
  <div class="admin-users-dashboard animate-fade-in">
    <!-- ГЛОБАЛЬНАЯ ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>👥 Клиенты и безопасность</h1>
        <p class="subtitle">Управление профилями, гаражами, доступом и списками желаний</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">🛡️</span>
        Аккаунтов: <b>{{ users.length }}</b>
      </div>
    </div>

    <!-- НАВИГАЦИЯ ПО ВКЛАДКАМ -->
    <div class="admin-tabs glass-card">
      <button :class="{ active: currentTab === 'users' }" @click="currentTab = 'users'">👤 Пользователи</button>
      <button :class="{ active: currentTab === 'tokens' }" @click="currentTab = 'tokens'">🔑 Токены сброса</button>
      <button :class="{ active: currentTab === 'wishlist' }" @click="currentTab = 'wishlist'">❤️ Избранное</button>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 1: ПОЛЬЗОВАТЕЛИ -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'users'">
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Добавить пользователя</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createUser" class="admin-form">
          <div class="input-grid">
            <div class="form-group">
              <label>📛 Фамилия</label>
              <input v-model="newUser.last_name" placeholder="Иванов" />
            </div>
            <div class="form-group">
              <label>📛 Имя *</label>
              <input v-model="newUser.first_name" placeholder="Иван" required />
            </div>
            <div class="form-group">
              <label>📛 Отчество</label>
              <input v-model="newUser.otchestvo" placeholder="Иванович" />
            </div>
            <div class="form-group">
              <label>📧 Email</label>
              <input v-model="newUser.email" type="email" placeholder="mail@example.com" />
            </div>
            <div class="form-group">
              <label>📞 Телефон</label>
              <input v-model="newUser.phone_number" type="tel" placeholder="+7-___-___-__-__" @input="formatPhone($event, 'new')" />
            </div>
            <div class="form-group">
              <label>👑 Роль</label>
              <select v-model="newUser.role">
                <option value="guest">Гость</option>
                <option value="user">Пользователь</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            <div class="form-group">
              <label>🔒 Пароль</label>
              <input v-model="newUser.password" type="password" placeholder="Задайте пароль..." />
            </div>
            <div class="form-group autocomplete-wrapper">
              <label>📍 Город</label>
              <input v-model="citySearch" type="text" placeholder="Начните вводить..." @input="showCitySuggestions = true" @focus="showCitySuggestions = true" @blur="hideCitySuggestions" />
              <ul v-if="showCitySuggestions && filteredCities.length" class="suggestions glass-card">
                <li v-for="c in filteredCities" :key="c.id" @mousedown.prevent="selectCity(c)">{{ c.name }}</li>
              </ul>
            </div>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
              <span v-if="loadingAction" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
              <span v-else>✨ Создать аккаунт</span>
            </button>
          </div>
        </form>
      </section>

      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Фильтры и поиск</h3>
          <button @click="resetUserFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr 1fr;">
          <div class="form-group">
            <label>🔎 Умный поиск</label>
            <input v-model="usersSearch" placeholder="ФИО, Email, Телефон, ID..." />
          </div>
          <div class="form-group">
            <label>👑 Роль</label>
            <select v-model="usersRoleFilter">
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="user">Пользователи</option>
              <option value="guest">Гости</option>
            </select>
          </div>
          <div class="form-group">
            <label>📊 Сортировка</label>
            <select v-model="usersSortOrder">
              <option value="new">Сначала новые</option>
              <option value="old">Сначала старые</option>
              <option value="name">По имени (А→Я)</option>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Показано {{ paginatedUsers.length }} из {{ filteredUsers.length }} пользователей
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
                    <img :src="u.avatar_url || defaultAvatars[0]" class="table-avatar clickable" @click="openImagePreview(u.avatar_url)" @error="u.avatar_url = defaultAvatars[0]" />
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
                  <div class="date-tag">Рег: {{ formatDateOnly(u.created_at) }}</div>
                </td>
                <td>
                  <div class="contact-fields">
                    <input v-model="u.email" @change="updateUser(u)" class="inline-edit" placeholder="Email" />
                    <input v-model="u.phone_number" type="tel" class="inline-edit" placeholder="+7-___-___-__-__" @input="formatPhone($event, u)" @change="updateUser(u)" />
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
                <td>
                  <select v-model="u.city_id" @change="onCitySelect(u)" class="inline-edit table-select">
                    <option :value="null">-- Не выбран --</option>
                    <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </td>
                <td class="text-right action-buttons">
                  <button @click="resetUserPassword(u)" class="btn btn-outline btn-sm">🔑 Пароль</button>
                  <button @click="deleteUser(u)" class="btn btn-danger btn-sm ml-2">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="usersTotalPages > 1" class="pagination mt-3">
          <button @click="usersPage--" :disabled="usersPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in usersTotalPages" :key="p" @click="usersPage = p" :class="{ active: usersPage === p }">{{ p }}</button>
          </div>
          <button @click="usersPage++" :disabled="usersPage === usersTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 2: АВТОМОБИЛИ -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'vehicles'">
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Добавить авто в профиль</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createVehicle" class="admin-form">
          <div class="input-grid">
            <div class="form-group">
              <label>👤 Владелец (Пользователь)</label>
              <select v-model="newVehicle.user_id" required>
                <option :value="null" disabled>-- Выберите владельца --</option>
                <option v-for="u in users" :key="u.id" :value="u.id">
                  {{ u.last_name || '' }} {{ u.first_name }} ({{ u.email || u.phone_number }})
                </option>
              </select>
            </div>
            <div class="form-group"><label>🏎️ Марка</label><input v-model="newVehicle.brand" placeholder="Toyota" required /></div>
            <div class="form-group"><label>🚘 Модель</label><input v-model="newVehicle.model" placeholder="Camry" required /></div>
            <div class="form-group">
              <label>📅 Год выпуска</label>
              <input v-model.number="newVehicle.year" type="number" placeholder="2024" :class="{ 'year-warn': isYearInvalid(newVehicle.year) }" />
            </div>
            <div class="form-group"><label>🆔 VIN-номер (17 знаков)</label><input v-model="newVehicle.vin" maxlength="17" class="vin-input" @input="formatVin($event)" /></div>
            <div class="form-group"><label>🧪 Объем двигателя (л)</label><input v-model.number="newVehicle.engine_volume" type="number" step="0.1" min="0.1" placeholder="2.0" /></div>
          </div>
          <div class="form-footer" style="justify-content: space-between;">
            <label class="custom-checkbox">
              <input type="checkbox" v-model="newVehicle.is_primary" />
              <span class="checkmark"></span><span>⭐ Сделать основным авто</span>
            </label>
            <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
              <span v-if="loadingAction" class="spinner" style="width: 18px; height: 18px; border-width: 2px;"></span>
              <span v-else>➕ Добавить в гараж</span>
            </button>
          </div>
        </form>
      </section>

      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Поиск по автопарку</h3>
          <button @click="resetVehicleFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr;">
          <div class="form-group"><label>🔎 Поиск (Марка, Модель, VIN или владелец)</label><input v-model="vehiclesSearch" placeholder="Введите данные..." /></div>
          <div class="form-group">
            <label>🏎️ Фильтр по марке</label>
            <select v-model="vehiclesBrandFilter">
              <option value="all">Все марки</option>
              <option v-for="b in uniqueBrands" :key="b" :value="b">{{ b }}</option>
            </select>
          </div>
        </div>
      </section>

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
              <tr v-for="v in paginatedVehicles" :key="v.id" class="vehicle-row" :class="{ 'row-updated': updatedRow === v.id, 'row-error': errorRow === v.id }">
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
                <td class="col-vin"><input v-model="v.vin" @change="updateVehicle(v)" @input="formatVin($event)" class="inline-edit vin-code" maxlength="17" /></td>
                <td class="col-specs text-center">
                  <div class="specs-inline">
                    <input v-model.number="v.year" @change="updateVehicle(v)" type="number" class="inline-edit mini" :class="{ 'year-warn': isYearInvalid(v.year) }" />
                    <span class="sep">|</span>
                    <input v-model.number="v.engine_volume" @change="updateVehicle(v)" type="number" step="0.1" min="0.1" class="inline-edit mini" />
                    <span class="muted">л.</span>
                  </div>
                </td>
                <td class="text-center">
                  <label class="custom-checkbox no-text" style="justify-content:center;">
                    <input type="checkbox" v-model="v.is_primary" @change="updateVehicle(v)" />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td class="text-right"><button @click="deleteVehicle(v.id)" class="btn btn-danger btn-sm">🗑️</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="vehiclesTotalPages > 1" class="pagination mt-3">
          <button @click="vehiclesPage--" :disabled="vehiclesPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in vehiclesTotalPages" :key="p" @click="vehiclesPage = p" :class="{ active: vehiclesPage === p }">{{ p }}</button>
          </div>
          <button @click="vehiclesPage++" :disabled="vehiclesPage === vehiclesTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 3: ТОКЕНЫ СБРОСА -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'tokens'">
      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Поиск и фильтрация токенов</h3>
          <button @click="resetTokenFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr 1fr;">
          <div class="form-group"><label>🔎 Поиск (ID, токен, имя)</label><input v-model="tokensSearch" placeholder="Введите часть данных..." /></div>
          <div class="form-group">
            <label>📅 Период</label>
            <select v-model="tokensDateFilter">
              <option value="all">За всё время</option><option value="today">Сегодня</option>
              <option value="week">Неделя</option><option value="month">Месяц</option>
            </select>
          </div>
          <div class="form-group">
            <label>📌 Статус</label>
            <select v-model="tokensStatusFilter">
              <option value="all">Все токены</option><option value="active">Активные</option>
              <option value="used">Использованные</option><option value="expired">Просроченные</option>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="admin-table-wrapper glass-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>Пользователь</th>
                <th>Токен (хэш)</th>
                <th>Создан / Истекает</th>
                <th class="text-center">Статус</th>
                <th class="text-right">Управление</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in paginatedTokens" :key="t.id" class="token-row">
                <td class="col-id">#{{ t.id }}</td>
                <td>
                  <div class="user-cell">
                    <strong>{{ getUserName(t.user_id) }}</strong>
                    <code class="id-sub">ID: {{ t.user_id.split('-')[0] }}...</code>
                  </div>
                </td>
                <td>
                  <div class="token-cell" @click="copyToken(t.token)" title="Скопировать">
                    <code>{{ t.token.substring(0, 12) }}...</code>
                  </div>
                </td>
                <td>
                  <div>{{ formatDateTime(t.created_at) }}</div>
                  <div :class="{ 'text-danger': isExpired(t.expires_at) && !t.used }" style="font-size:0.8rem; margin-top:2px;">
                    До: {{ formatDateTime(t.expires_at) }}
                  </div>
                </td>
                <td class="text-center">
                  <span class="badge" :class="getTokenStatusClass(t)">{{ getTokenStatusText(t) }}</span>
                </td>
                <td class="text-right">
                  <button v-if="!t.used && !isExpired(t.expires_at)" @click="toggleTokenStatus(t)" class="btn btn-outline btn-sm">✔️ Исп.</button>
                  <button v-else @click="toggleTokenStatus(t)" class="btn btn-outline btn-sm">🔄 Сброс</button>
                  <button @click="deleteToken(t.id)" class="btn btn-danger btn-sm ml-2">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="tokensTotalPages > 1" class="pagination mt-3">
          <button @click="tokensPage--" :disabled="tokensPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in tokensTotalPages" :key="p" @click="tokensPage = p" :class="{ active: tokensPage === p }">{{ p }}</button>
          </div>
          <button @click="tokensPage++" :disabled="tokensPage === tokensTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 4: ИЗБРАННОЕ (WISHLIST) -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'wishlist'">
      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Фильтрация журнала избранного</h3>
          <button @click="resetWishlistFilters" class="btn-text-link">Сбросить всё</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr;">
          <div class="form-group"><label>🔎 Поиск (Товар, SKU, Имя)</label><input v-model="wishlistSearch" placeholder="Название или клиент..." /></div>
          <div class="form-group">
            <label>📅 Период</label>
            <select v-model="wishlistDateFilter">
              <option value="all">За всё время</option><option value="today">Сегодня</option>
              <option value="week">Неделя</option><option value="month">Месяц</option>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="admin-table-wrapper glass-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>Пользователь</th>
                <th>Товар / SKU</th>
                <th>Дата добавления</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedWishlist" :key="item.id" class="wish-row">
                <td class="col-id">#{{ item.id }}</td>
                <td>
                  <div class="user-cell">
                    <img :src="item.users?.avatar_url || defaultAvatars[0]" class="mini-avatar glass-card" />
                    <div class="u-info">
                      <strong>{{ getFullName(item.users) }}</strong>
                      <small>{{ item.users?.email || item.users?.phone_number }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <router-link :to="'/product/' + item.product_id" class="product-link">{{ item.products?.name }}</router-link>
                  <br><code class="sku-tag" style="margin-top:5px; display:inline-block;">{{ item.products?.sku }}</code>
                </td>
                <td><span class="date-text">{{ formatDateTime(item.added_at) }}</span></td>
                <td class="text-right"><button @click="removeFromWishlist(item.id)" class="btn btn-danger btn-sm">🗑️</button></td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredWishlist.length === 0" class="empty-state glass-card" style="padding:40px; text-align:center;">
            <h3>Записей не найдено</h3>
          </div>
        </div>
        <div v-if="wishlistTotalPages > 1" class="pagination mt-3">
          <button @click="wishlistPage--" :disabled="wishlistPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in wishlistTotalPages" :key="p" @click="wishlistPage = p" :class="{ active: wishlistPage === p }">{{ p }}</button>
          </div>
          <button @click="wishlistPage++" :disabled="wishlistPage === wishlistTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- МОДАЛКА ВЫБОРА АВАТАРА (Глобальная для компонента) -->
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
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const currentTab = ref('users');
const itemsPerPage = 20;
const loadingAction = ref(false);

const defaultAvatars = [
  `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png`,
  `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/2.png`,
  `https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/3.png`
];

// Глобальные стейты БД
const users = ref([]);
const cities = ref([]);
const vehicles = ref([]);
const tokens = ref([]);
const wishlists = ref([]);

// Инициализация загрузки всех данных
const loadAllData = async () => {
  try {
    const results = await Promise.allSettled([
      axios.get(`/api/admin/users`, config),
      axios.get(`/api/cities`),
      axios.get(`/api/admin/user_vehicles`, config),
      axios.get(`/api/admin/password_reset_tokens`, config),
      axios.get(`/api/admin/wishlists`, config)
    ]);
    
    if (results[0].status === 'fulfilled') {
      users.value = results[0].value.data.map(u => ({
        ...u, city_id: u.saved_city_id, cityName: u.cities?.name || ''
      }));
    }
    if (results[1].status === 'fulfilled') cities.value = results[1].value.data || [];
    if (results[2].status === 'fulfilled') vehicles.value = results[2].value.data || [];
    if (results[3].status === 'fulfilled') tokens.value = results[3].value.data || [];
    if (results[4].status === 'fulfilled') wishlists.value = results[4].value.data || [];
  } catch (e) {
    console.error('Ошибка глобальной загрузки данных', e);
  }
};

// ==========================================
// УТИЛИТЫ (Общие)
// ==========================================
const formatDateTime = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const formatDateOnly = (date) => date ? new Date(date).toLocaleDateString('ru-RU') : '---';
const getUserName = (id) => {
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name || ''}`.trim() : 'Гость / Неизвестен';
};
const getFullName = (u) => {
  if (!u) return '';
  return [u.last_name, u.first_name].filter(Boolean).join(' ') || 'Без имени';
};


// ==========================================
// ЛОГИКА: ВКЛАДКА "ПОЛЬЗОВАТЕЛИ"
// ==========================================
const usersPage = ref(1);
const usersSearch = ref('');
const usersRoleFilter = ref('all');
const usersSortOrder = ref('new');
const newUser = reactive({ first_name: '', last_name: '', otchestvo: '', email: '', phone_number: '', role: 'user', password: '', city: '', allows_data_saving: false });

const showAvatarPicker = ref(false);
const editingUser = ref(null);
const previewUrl = ref(null);
const citySearch = ref('');
const showCitySuggestions = ref(false);

const filteredCities = computed(() => {
  const q = citySearch.value.trim().toLowerCase();
  if (!q) return [];
  return cities.value.filter(c => c.name.toLowerCase().includes(q));
});
const selectCity = (city) => { newUser.city = city.name; citySearch.value = city.name; showCitySuggestions.value = false; };
const hideCitySuggestions = () => { setTimeout(() => { showCitySuggestions.value = false; }, 150); };

const formatPhone = (event, target) => {
  const input = event.target;
  let value = input.value.replace(/[^\d]/g, '');
  if (value.length === 0) {
    input.value = '';
    if (target === 'new') newUser.phone_number = ''; else target.phone_number = '';
    return;
  }
  let formatted = '+7';
  if (value.length > 1) formatted += '-' + value.substring(1, 4);
  if (value.length >= 4) formatted += '-' + value.substring(4, 7);
  if (value.length >= 7) formatted += '-' + value.substring(7, 9);
  if (value.length >= 9) formatted += '-' + value.substring(9, 11);
  input.value = formatted;
  if (target === 'new') newUser.phone_number = formatted; else target.phone_number = formatted;
};

const getFilenameFromUrl = (url) => url ? url.split('/').pop() : null;
const isProtectedAvatar = (url) => ['1.png', '2.png', '3.png'].includes(getFilenameFromUrl(url));
const deleteAvatarFromStorage = async (url) => {
  if (!url || isProtectedAvatar(url)) return;
  try { await axios.delete(`/api/storage/avatars/${getFilenameFromUrl(url)}`, config); } catch (e) {}
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
  const formData = new FormData(); formData.append('file', file);
  try {
    const res = await axios.post(`/api/upload/avatars`, formData, config);
    await setAvatar(res.data.url);
  } catch (err) { alert('Ошибка загрузки'); }
};

const createUser = async () => {
  if (!newUser.first_name) return alert('Имя обязательно');
  loadingAction.value = true;
  try {
    await axios.post(`/api/admin/users`, newUser, config);
    await loadAllData();
    Object.assign(newUser, { first_name: '', last_name: '', otchestvo: '', email: '', phone_number: '', password: '', city: '' });
    citySearch.value = ''; alert('Пользователь создан!');
  } catch (e) { alert(e.response?.data?.error || 'Ошибка создания'); }
  finally { loadingAction.value = false; }
};

const updateUser = async (user) => {
  try {
    const { cities, cityName, ...payload } = user;
    payload.city = user.cityName || '';
    await axios.put(`/api/users/profile/${user.id}`, payload, config);
  } catch (e) { console.error("Update error"); }
};
const onCitySelect = (user) => {
  const selectedCity = cities.value.find(c => c.id === user.city_id);
  if (selectedCity) { user.cityName = selectedCity.name; updateUser(user); }
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

const resetUserFilters = () => { usersSearch.value = ''; usersRoleFilter.value = 'all'; usersSortOrder.value = 'new'; usersPage.value = 1; };

const filteredUsers = computed(() => {
  let res = [...users.value];
  if (usersRoleFilter.value !== 'all') res = res.filter(u => u.role === usersRoleFilter.value);
  if (usersSearch.value.trim()) {
    const q = usersSearch.value.toLowerCase().trim();
    res = res.filter(u => (u.first_name || '').toLowerCase().includes(q) || (u.last_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone_number || '').includes(q) || u.id.includes(q));
  }
  if (usersSortOrder.value === 'new') res.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  else if (usersSortOrder.value === 'name') res.sort((a, b) => a.first_name.localeCompare(b.first_name));
  return res;
});
const usersTotalPages = computed(() => Math.ceil(filteredUsers.value.length / itemsPerPage));
const paginatedUsers = computed(() => filteredUsers.value.slice((usersPage.value - 1) * itemsPerPage, usersPage.value * itemsPerPage));
watch([usersSearch, usersRoleFilter, usersSortOrder], () => { usersPage.value = 1; });


// ==========================================
// ЛОГИКА: ВКЛАДКА "АВТОМОБИЛИ"
// ==========================================
const vehiclesPage = ref(1);
const vehiclesSearch = ref('');
const vehiclesBrandFilter = ref('all');
const updatedRow = ref(null);
const errorRow = ref(null);

const newVehicle = reactive({ user_id: null, brand: '', model: '', year: new Date().getFullYear(), vin: '', engine_volume: 1.6, is_primary: false });

const getUserEmail = (id) => users.value.find(user => user.id === id)?.email || '';
const formatVin = (event) => {
  let val = event.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (val.length > 17) val = val.substring(0, 17);
  event.target.value = val;
};
const isYearInvalid = (year) => year && (year < 1886 || year > new Date().getFullYear() + 1);

const createVehicle = async () => {
  if (!newVehicle.user_id) return alert('Выберите владельца');
  loadingAction.value = true;
  try {
    const res = await axios.post(`/api/admin/user_vehicles`, newVehicle, config);
    vehicles.value.unshift(res.data);
    Object.assign(newVehicle, { brand: '', model: '', year: new Date().getFullYear(), vin: '', engine_volume: 1.6, is_primary: false });
    alert('Автомобиль добавлен');
  } catch (e) { alert('Ошибка при сохранении'); } finally { loadingAction.value = false; }
};

const updateVehicle = async (v) => {
  try {
    await axios.put(`/api/admin/user_vehicles/${v.id}`, { user_id: v.user_id, brand: v.brand, model: v.model, year: v.year, vin: v.vin, engine_volume: v.engine_volume, is_primary: v.is_primary }, config);
    updatedRow.value = v.id; setTimeout(() => (updatedRow.value = null), 800);
  } catch (e) { alert('Ошибка обновления'); errorRow.value = v.id; setTimeout(() => (errorRow.value = null), 800); }
};

const deleteVehicle = async (id) => {
  if (!confirm('Удалить этот автомобиль из базы?')) return;
  try {
    await axios.delete(`/api/admin/user_vehicles/${id}`, config);
    vehicles.value = vehicles.value.filter(v => v.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const resetVehicleFilters = () => { vehiclesSearch.value = ''; vehiclesBrandFilter.value = 'all'; vehiclesPage.value = 1; };

const uniqueBrands = computed(() => Array.from(new Set(vehicles.value.map(v => v.brand).filter(Boolean))).sort());
const filteredVehicles = computed(() => {
  let res = [...vehicles.value];
  if (vehiclesBrandFilter.value !== 'all') res = res.filter(v => v.brand === vehiclesBrandFilter.value);
  if (vehiclesSearch.value.trim()) {
    const q = vehiclesSearch.value.toLowerCase();
    res = res.filter(v => v.brand.toLowerCase().includes(q) || v.model.toLowerCase().includes(q) || (v.vin && v.vin.toLowerCase().includes(q)) || getUserName(v.user_id).toLowerCase().includes(q));
  }
  return res.sort((a, b) => b.id - a.id);
});
const vehiclesTotalPages = computed(() => Math.ceil(filteredVehicles.value.length / itemsPerPage));
const paginatedVehicles = computed(() => filteredVehicles.value.slice((vehiclesPage.value - 1) * itemsPerPage, vehiclesPage.value * itemsPerPage));
watch([vehiclesSearch, vehiclesBrandFilter], () => (vehiclesPage.value = 1));


// ==========================================
// ЛОГИКА: ВКЛАДКА "ТОКЕНЫ СБРОСА"
// ==========================================
const tokensPage = ref(1);
const tokensSearch = ref('');
const tokensStatusFilter = ref('all');
const tokensDateFilter = ref('all');

const isExpired = (date) => new Date(date) < new Date();
const getTokenStatusText = (t) => { if (t.used) return 'Использован'; if (isExpired(t.expires_at)) return 'Просрочен'; return 'Активен'; };
const getTokenStatusClass = (t) => { if (t.used) return 'badge-used'; if (isExpired(t.expires_at)) return 'badge-danger'; return 'badge-success'; };

const toggleTokenStatus = async (token) => {
  const newUsed = !token.used;
  try {
    await axios.put(`/api/admin/password_reset_tokens/${token.id}`, { used: newUsed }, config);
    token.used = newUsed; alert(newUsed ? 'Токен помечен как использованный' : 'Токен снова активен');
  } catch (e) { alert('Ошибка при обновлении статуса'); }
};

const deleteToken = async (id) => {
  if (!confirm('Удалить этот токен? Пользователь не сможет сбросить пароль по старой ссылке.')) return;
  try {
    await axios.delete(`/api/admin/password_reset_tokens/${id}`, config);
    tokens.value = tokens.value.filter(t => t.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};
const copyToken = (text) => { navigator.clipboard.writeText(text); alert('Токен скопирован в буфер обмена'); };

const resetTokenFilters = () => { tokensSearch.value = ''; tokensStatusFilter.value = 'all'; tokensDateFilter.value = 'all'; tokensPage.value = 1; };

const filteredTokens = computed(() => {
  let res = [...tokens.value];
  if (tokensStatusFilter.value === 'active') res = res.filter(t => !t.used && !isExpired(t.expires_at));
  else if (tokensStatusFilter.value === 'used') res = res.filter(t => t.used);
  else if (tokensStatusFilter.value === 'expired') res = res.filter(t => !t.used && isExpired(t.expires_at));
  
  if (tokensDateFilter.value !== 'all') {
    const now = new Date();
    res = res.filter(t => {
      const d = new Date(t.created_at);
      if (tokensDateFilter.value === 'today') return d.toDateString() === now.toDateString();
      if (tokensDateFilter.value === 'week') return (now - d) < 7 * 24 * 60 * 60 * 1000;
      if (tokensDateFilter.value === 'month') return (now - d) < 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }
  if (tokensSearch.value.trim()) {
    const q = tokensSearch.value.toLowerCase();
    res = res.filter(t => t.user_id.toLowerCase().includes(q) || t.token.toLowerCase().includes(q) || getUserName(t.user_id).toLowerCase().includes(q));
  }
  return res.sort((a, b) => b.id - a.id);
});
const tokensTotalPages = computed(() => Math.ceil(filteredTokens.value.length / itemsPerPage));
const paginatedTokens = computed(() => filteredTokens.value.slice((tokensPage.value - 1) * itemsPerPage, tokensPage.value * itemsPerPage));
watch([tokensSearch, tokensStatusFilter, tokensDateFilter], () => tokensPage.value = 1);


// ==========================================
// ЛОГИКА: ВКЛАДКА "ИЗБРАННОЕ (WISHLIST)"
// ==========================================
const wishlistPage = ref(1);
const wishlistSearch = ref('');
const wishlistDateFilter = ref('all');

const removeFromWishlist = async (id) => {
  if (!confirm('Удалить этот товар из избранного?')) return;
  try {
    await axios.delete(`/api/admin/wishlists/${id}`, config);
    wishlists.value = wishlists.value.filter(item => item.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const resetWishlistFilters = () => { wishlistSearch.value = ''; wishlistDateFilter.value = 'all'; wishlistPage.value = 1; };

const filteredWishlist = computed(() => {
  let res = [...wishlists.value];
  if (wishlistSearch.value.trim()) {
    const q = wishlistSearch.value.toLowerCase().trim();
    res = res.filter(item => (item.products?.name || '').toLowerCase().includes(q) || (item.products?.sku || '').toLowerCase().includes(q) || getFullName(item.users).toLowerCase().includes(q));
  }
  if (wishlistDateFilter.value !== 'all') {
    const now = new Date();
    res = res.filter(item => {
      const added = new Date(item.added_at);
      if (wishlistDateFilter.value === 'today') return added.toDateString() === now.toDateString();
      if (wishlistDateFilter.value === 'week') return (now - added) < 7 * 24 * 60 * 60 * 1000;
      if (wishlistDateFilter.value === 'month') return (now - added) < 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }
  return res.sort((a, b) => b.id - a.id);
});
const wishlistTotalPages = computed(() => Math.ceil(filteredWishlist.value.length / itemsPerPage));
const paginatedWishlist = computed(() => filteredWishlist.value.slice((wishlistPage.value - 1) * itemsPerPage, wishlistPage.value * itemsPerPage));
watch([wishlistSearch, wishlistDateFilter], () => wishlistPage.value = 1);

onMounted(loadAllData);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (Переиспользуемые)
   ========================================================================== */
.admin-users-dashboard { padding: 40px 24px; }
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
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 28px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
.btn-text-link { background: none; border: none; color: var(--primary); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }
.create-btn { background: linear-gradient(135deg, var(--primary), var(--accent)); border: none; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: transform 0.2s, box-shadow 0.2s; }
.create-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* Tables */
.table-container { margin-top: 20px; }
.table-meta { font-size: 0.85rem; font-weight: 600; margin-bottom: 15px; color: var(--text-muted); }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); border-bottom: 2px solid var(--border-color); text-transform: uppercase; }
.admin-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); vertical-align: middle; transition: background 0.2s; font-size: 0.9rem; }
.admin-table tbody tr:hover td { background: rgba(37, 99, 235, 0.02); }
.col-id { width: 70px; font-weight: 800; color: var(--primary); font-family: monospace; }
.text-right { text-align: right; }
.text-center { text-align: center; }

/* Inline Edits & Selects */
.inline-edit { background: transparent; border: 1px solid transparent; padding: 4px 8px; border-radius: 6px; color: var(--text-main); width: 100%; transition: 0.2s; font-size: 0.9rem; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color); }
.inline-edit:focus { border-color: var(--primary); background: var(--bg-card); outline: none; }
.bold { font-weight: 800; }
.table-select { font-weight: 500; cursor: pointer; }

/* Checkboxes */
.custom-checkbox { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 0.85rem; }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; border: 2px solid var(--border-color); border-radius: 6px; position: relative; transition: all 0.2s; }
.custom-checkbox input:checked + .checkmark { background: var(--primary); border-color: var(--primary); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; }
.pagination-pages { display: flex; gap: 8px; }
.pagination button, .pagination-pages button { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer; transition: background 0.2s; }
.pagination button:hover:not(:disabled), .pagination-pages button:hover { background: var(--primary-light); border-color: var(--primary); }
.pagination-pages button.active { background: var(--primary); color: white; border-color: var(--primary); }

/* ==========================================================================
   СТИЛИ: ПОЛЬЗОВАТЕЛИ
   ========================================================================== */
.autocomplete-wrapper { position: relative; }
.suggestions { position: absolute; top: 100%; left: 0; right: 0; z-index: 100; max-height: 200px; overflow-y: auto; list-style: none; padding: 0; margin-top: 4px; border-radius: 8px; }
.suggestions li { padding: 10px 16px; cursor: pointer; font-size: 0.9rem; border-bottom: 1px solid var(--border-color); }
.suggestions li:hover { background: var(--primary-light); }
.form-footer { display: flex; justify-content: flex-end; }
.col-avatar { width: 80px; text-align: center; }
.table-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--border-color); cursor: pointer; transition: 0.2s; }
.avatar-edit-box { position: relative; display: inline-block; }
.btn-edit-avatar { position: absolute; bottom: 0; right: 0; background: var(--primary); color: white; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.client-id { font-size: 0.7rem; font-weight: 800; color: var(--primary); font-family: monospace; margin-bottom: 5px; }
.name-edit-row { display: flex; flex-direction: column; gap: 4px; }
.date-tag { font-size: 0.65rem; color: var(--text-muted); margin-top: 5px; font-weight: 600; }
.contact-fields { display: flex; flex-direction: column; gap: 5px; }
.role-select { padding: 6px 12px; border-radius: 40px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; border: none; cursor: pointer; transition: 0.2s; background: rgba(0,0,0,0.05); color: var(--text-main); }
.role-select.admin { background: var(--danger-light); color: var(--danger); }
.role-select.user { background: var(--primary-light); color: var(--primary); }
.role-select.guest { background: rgba(0,0,0,0.1); color: #64748b; }
.consent-control { margin-top: 8px; }
.custom-checkbox.small-check .checkmark { width: 16px; height: 16px; }
.consent-text { font-size: 0.65rem; color: var(--text-muted); font-weight: 700; }
.action-buttons { display: flex; gap: 5px; justify-content: flex-end; }
.ml-2 { margin-left: 8px; }

/* Модалка аватара */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 10000; }
.modal-content { width: 90%; max-width: 480px; padding: 30px; position: relative; }
.avatar-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
.avatar-option { width: 100%; aspect-ratio: 1; border-radius: 50%; object-fit: cover; cursor: pointer; transition: transform 0.2s, border-color 0.2s; border: 2px solid transparent; }
.avatar-option:hover { border-color: var(--primary); transform: scale(1.05); }
.file-upload-label { display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 700; transition: background 0.2s; }
.file-upload-label:hover { background: var(--primary-light); }
.image-preview-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); display: flex; align-items: center; justify-content: center; z-index: 10001; cursor: zoom-out; }
.full-image { max-width: 90%; max-height: 90%; border-radius: 20px; border: 4px solid #fff; box-shadow: 0 20px 50px rgba(0,0,0,0.5); }

/* ==========================================================================
   СТИЛИ: АВТОМОБИЛИ
   ========================================================================== */
.vin-input { font-family: monospace; text-transform: uppercase; letter-spacing: 1px; }
.year-warn { background: rgba(255, 193, 7, 0.15) !important; border-color: #ffc107 !important; }
.row-updated td { background: rgba(16, 185, 129, 0.15) !important; }
.row-error td { background: rgba(239, 68, 68, 0.15) !important; }
.owner-info strong { display: block; color: var(--text-main); }
.owner-info small { color: var(--text-muted); font-size: 0.8rem; }
.car-info-row { display: flex; gap: 8px; flex-wrap: wrap; }
.auto-input { flex: 1 1 100px; }
.specs-inline { display: flex; align-items: center; gap: 5px; justify-content: center; }
.vin-code { font-family: monospace; text-transform: uppercase; color: var(--primary); font-weight: 700; width: 100%; min-width: 140px; }
.inline-edit.mini { width: 70px; text-align: center; }

/* ==========================================================================
   СТИЛИ: ТОКЕНЫ И ИЗБРАННОЕ
   ========================================================================== */
.user-cell { display: flex; align-items: center; gap: 12px; }
.user-cell strong { display: block; color: var(--text-main); }
.id-sub { font-size: 0.7rem; color: var(--text-muted); }
.token-cell code { background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.token-cell code:hover { background: var(--primary-light); color: var(--primary); }
.badge.badge-used { background: var(--primary); color: white; }
.text-danger { color: var(--danger); font-weight: 700; }
.mini-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
.u-info strong { display: block; font-size: 0.9rem; color: var(--text-main); }
.u-info small { color: var(--text-muted); font-size: 0.75rem; font-weight: 600; }
.product-link { color: var(--primary); font-weight: 700; text-decoration: none; font-size: 0.95rem; }
.product-link:hover { text-decoration: underline; }
.sku-tag { background: rgba(0,0,0,0.05); padding: 4px 8px; border-radius: 6px; font-family: monospace; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); }
.date-text { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }

@media (max-width: 900px) {
  .filter-grid { grid-template-columns: 1fr !important; }
}
@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr; }
  .form-footer { flex-direction: column; align-items: stretch; gap: 10px; }
}
</style>

<style>
html.dark .table-select option { background-color: var(--bg-input) !important; color: var(--text-main) !important; }
</style>