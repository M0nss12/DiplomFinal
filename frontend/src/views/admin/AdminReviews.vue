<template>
  <div class="admin-reviews">
    <!-- ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>💬 Управление отзывами</h1>
        <p class="subtitle">Модерация текстов, проверка фотографий и создание новых отзывов</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Всего: <b>{{ filteredReviews.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА СОЗДАНИЯ ОТЗЫВА -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Создать новый отзыв</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createReview" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>📦 Товар *</label>
            <select v-model="newReview.product_id" required class="form-input">
              <option :value="null" disabled>-- Выберите товар --</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>👤 Пользователь *</label>
            <select v-model="newReview.user_id" required class="form-input">
              <option :value="null" disabled>-- Выберите пользователя --</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.last_name || '' }} {{ u.first_name || '' }} ({{ u.email || u.phone_number || 'ID: ' + u.id }})
              </option>
            </select>
          </div>
          <div class="input-group">
            <label>⭐ Оценка</label>
            <select v-model="newReview.rating" class="form-input">
              <option v-for="n in 5" :key="n" :value="n">{{ n }} ★</option>
            </select>
          </div>
          <div class="input-group">
            <label>📌 Статус</label>
            <select v-model="newReview.is_approved" class="form-input">
              <option :value="true">✅ Опубликован</option>
              <option :value="false">⏳ На модерации</option>
            </select>
          </div>
        </div>

        <div class="input-group full-width">
          <label>💬 Комментарий</label>
          <textarea v-model="newReview.comment" placeholder="Текст отзыва..." class="form-input comment-area" rows="3"></textarea>
        </div>

        <div class="pros-cons-grid-form">
          <div class="input-group">
            <label class="label-pros">➕ Плюсы</label>
            <input v-model="newReview.pros" placeholder="Что понравилось?" class="form-input" />
          </div>
          <div class="input-group">
            <label class="label-cons">➖ Минусы</label>
            <input v-model="newReview.cons" placeholder="Что можно улучшить?" class="form-input" />
          </div>
        </div>

        <!-- ГАЛЕРЕЯ НОВОГО ОТЗЫВА -->
        <div class="input-group full-width">
          <label>🖼️ Фотографии (до 5)</label>
          <div class="upload-gallery">
            <div v-for="(img, idx) in newReview.images" :key="idx" class="preview-item glass-card">
              <img :src="img" @click="previewImage(img)" />
              <button type="button" @click="newReview.images.splice(idx, 1)" class="btn-clear-img">✕</button>
            </div>
            <label v-if="newReview.images.length < 5" class="file-label-big glass-card">
              <span v-if="!uploading">+ Добавить фото</span>
              <span v-else class="spinner-small"></span>
              <input type="file" @change="handleNewReviewImage" accept="image/*" class="hidden-file" :disabled="uploading" />
            </label>
          </div>
        </div>

        <div class="form-footer">
          <button type="submit" :disabled="uploading" class="btn-primary">
            <span v-if="uploading" class="spinner-small"></span>
            <span v-else>✨ Опубликовать отзыв</span>
          </button>
        </div>
      </form>
    </section>

    <!-- ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Фильтры и поиск</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="input-group search-group">
          <label>🔎 Поиск (текст, имя, товар)</label>
          <input v-model="searchQuery" placeholder="Текст отзыва, автор или товар..." class="form-input" />
        </div>
        <div class="input-group">
          <label>⭐ Оценка</label>
          <select v-model="ratingFilter" class="form-input">
            <option value="all">Любая</option>
            <option v-for="n in 5" :key="n" :value="n">{{ n }} ★</option>
          </select>
        </div>
        <div class="input-group">
          <label>📌 Статус</label>
          <select v-model="statusFilter" class="form-input">
            <option value="all">Все</option>
            <option value="approved">Опубликованные</option>
            <option value="pending">На модерации</option>
          </select>
        </div>
        <div class="input-group">
          <label>📊 Сортировка</label>
          <select v-model="sortOrder" class="form-input">
            <option value="new">Сначала новые</option>
            <option value="rating-desc">Высокий рейтинг</option>
            <option value="rating-asc">Низкий рейтинг</option>
          </select>
        </div>
      </div>
    </section>

    <!-- ТАБЛИЦА ОТЗЫВОВ -->
    <div class="table-container">
      <div class="table-meta">
        <span class="meta-icon">📄</span>
        Страница {{ currentPage }} из {{ totalPages || 1 }}
      </div>

      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Товар / Автор</th>
              <th class="text-center">Оценка</th>
              <th class="col-content">Отзыв и галерея</th>
              <th class="text-center">Статус</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in paginatedReviews" :key="r.id" class="review-row" :class="{ 'row-pending': !r.is_approved }">
              <td class="col-id">
                <span class="id-badge">#{{ r.id }}</span>
                <div class="date-tag">{{ formatDate(r.created_at) }}</div>
              </td>
              
              <td>
                <div class="review-meta-info">
                  <div class="product-name">{{ getProductName(r.product_id) }}</div>
                  <div class="user-name">👤 {{ getUserName(r.user_id) }}</div>
                </div>
              </td>

              <td class="text-center">
                <select v-model.number="r.rating" @change="saveReview(r)" class="rating-select glass-card">
                  <option v-for="n in 5" :key="n" :value="n">{{ n }} ★</option>
                </select>
              </td>

              <td class="col-content">
                <div class="review-body-edit">
                  <div class="text-fields">
                    <label>💬 Комментарий:</label>
                    <textarea v-model="r.comment" @change="saveReview(r)" class="comment-textarea glass-card" placeholder="Текст отзыва..."></textarea>
                    
                    <div class="pros-cons-grid">
                      <div>
                        <label class="label-pros">➕ Плюсы:</label>
                        <input v-model="r.pros" @change="saveReview(r)" class="mini-input glass-card" placeholder="Не указано" />
                      </div>
                      <div>
                        <label class="label-cons">➖ Минусы:</label>
                        <input v-model="r.cons" @change="saveReview(r)" class="mini-input glass-card" placeholder="Не указано" />
                      </div>
                    </div>
                  </div>

                  <!-- ГАЛЕРЕЯ -->
                  <div class="image-management-zone">
                    <div class="images-grid">
                      <div v-for="(imgUrl, index) in (r.images || [])" :key="index" class="img-item">
                        <img :src="imgUrl" @click="previewImage(imgUrl)" class="img-preview glass-card" />
                        <button @click="deleteSpecificImage(r, index)" class="delete-img-trigger" title="Удалить фото">✕</button>
                      </div>

                      <label v-if="(r.images?.length || 0) < 5" class="upload-new-trigger glass-card" :class="{'loading': uploadLoadingId === r.id}">
                        <input type="file" @change="(e) => handleImageUpload(e, r)" accept="image/*" hidden />
                        <span v-if="uploadLoadingId !== r.id">+</span>
                        <span v-else class="loader-mini"></span>
                      </label>
                    </div>
                    <div class="img-counter">{{ r.images?.length || 0 }} / 5 фото</div>
                  </div>
                </div>
              </td>

              <td class="text-center">
                <div class="status-wrapper">
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="r.is_approved" @change="saveReview(r)" />
                    <span class="toggle-slider"></span>
                  </label>
                  <span class="status-text" :class="{ 'active': r.is_approved }">
                    {{ r.is_approved ? 'Опубликован' : 'Скрыт' }}
                  </span>
                </div>
              </td>

              <td class="text-right">
                <button @click="removeReview(r.id)" class="btn-delete-small">🗑️ Удалить</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination-wrapper">
        <button @click="currentPage--" :disabled="currentPage === 1" class="p-btn glass-card">←</button>
        <div class="p-numbers">
          <button v-for="page in totalPages" :key="page" @click="currentPage = page" class="glass-card" :class="{ active: currentPage === page }">
            {{ page }}
          </button>
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

const reviews = ref([]);
const products = ref([]);
const users = ref([]);
const uploadLoadingId = ref(null);
const uploading = ref(false);

// --- Новый отзыв ---
const newReview = reactive({
  product_id: null,
  user_id: null,
  rating: 5,
  comment: '',
  pros: '',
  cons: '',
  images: [],
  is_approved: true
});

// Фильтры
const searchQuery = ref('');
const ratingFilter = ref('all');
const statusFilter = ref('all');
const sortOrder = ref('new');
const currentPage = ref(1);
const itemsPerPage = 10;

const loadData = async () => {
  try {
    const [rRes, pRes, uRes] = await Promise.all([
      axios.get(`/api/admin/reviews`, config),
      axios.get(`/api/admin/products`, config),
      axios.get(`/api/admin/users`, config)
    ]);
    
    reviews.value = rRes.data.map(rev => ({
      ...rev,
      images: Array.isArray(rev.images) ? rev.images : [],
      pros: rev.pros || '',
      cons: rev.cons || ''
    }));
    
    products.value = pRes.data;
    users.value = uRes.data;
  } catch (e) { console.error('Ошибка загрузки данных отзывов'); }
};

const getFilenameFromUrl = (url) => url ? url.split('/').pop() : null;

// --- Работа с существующими отзывами ---
const saveReview = async (review) => {
  try {
    const { users, products, ...payload } = review;
    await axios.put(`/api/admin/reviews/${review.id}`, payload, config);
  } catch (e) { console.error('Ошибка сохранения'); }
};

const handleImageUpload = async (event, review) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  uploadLoadingId.value = review.id;

  try {
    const res = await axios.post(`/api/upload/reviews`, formData, config);
    if (!Array.isArray(review.images)) review.images = [];
    review.images.push(res.data.url);
    await saveReview(review);
  } catch (e) {
    alert('Ошибка загрузки фото');
  } finally {
    uploadLoadingId.value = null;
  }
};

const deleteSpecificImage = async (review, index) => {
  const url = review.images[index];
  const filename = getFilenameFromUrl(url);
  if (!confirm('Удалить фото навсегда?')) return;

  try {
    await axios.delete(`/api/storage/reviews/${filename}`, config);
    review.images.splice(index, 1);
    await saveReview(review);
  } catch (e) {
    console.warn('Не удалось удалить файл из хранилища, но удаляем из записи');
    review.images.splice(index, 1);
    await saveReview(review);
  }
};

const removeReview = async (id) => {
  const review = reviews.value.find(r => r.id === id);
  if (!review || !confirm('Удалить отзыв и все прикреплённые фотографии?')) return;

  try {
    if (review.images && review.images.length > 0) {
      for (const url of review.images) {
        const filename = getFilenameFromUrl(url);
        await axios.delete(`/api/storage/reviews/${filename}`, config).catch(() => {});
      }
    }
    await axios.delete(`/api/admin/reviews/${id}`, config);
    reviews.value = reviews.value.filter(r => r.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

// --- Создание нового отзыва ---
const handleNewReviewImage = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);
  uploading.value = true;

  try {
    const res = await axios.post(`/api/upload/reviews`, formData, config);
    newReview.images.push(res.data.url);
  } catch (e) {
    alert('Ошибка загрузки фото');
  } finally {
    uploading.value = false;
  }
};

const createReview = async () => {
  try {
    const res = await axios.post(`/api/admin/reviews`, newReview, config);
    reviews.value.unshift(res.data);
    // Сброс формы
    Object.assign(newReview, {
      product_id: null,
      user_id: null,
      rating: 5,
      comment: '',
      pros: '',
      cons: '',
      images: [],
      is_approved: true
    });
    alert('Отзыв успешно создан!');
  } catch (e) {
    alert('Ошибка при создании отзыва');
  }
};

// --- Вспомогательные функции ---
const getProductName = (id) => products.value.find(p => p.id === id)?.name || 'Товар удален';
const getUserName = (id) => {
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name || ''}`.trim() : 'Гость';
};
const formatDate = (d) => new Date(d).toLocaleDateString('ru-RU');
const previewImage = (url) => window.open(url, '_blank');

// --- Фильтрация и пагинация ---
const filteredReviews = computed(() => {
  let res = [...reviews.value];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(r => {
      const pName = getProductName(r.product_id).toLowerCase();
      const uName = getUserName(r.user_id).toLowerCase();
      return (r.comment || '').toLowerCase().includes(q) || pName.includes(q) || uName.includes(q);
    });
  }
  if (ratingFilter.value !== 'all') res = res.filter(r => r.rating === parseInt(ratingFilter.value));
  if (statusFilter.value === 'approved') res = res.filter(r => r.is_approved);
  else if (statusFilter.value === 'pending') res = res.filter(r => !r.is_approved);

  if (sortOrder.value === 'new') res.sort((a, b) => b.id - a.id);
  else if (sortOrder.value === 'rating-desc') res.sort((a, b) => b.rating - a.rating);
  else if (sortOrder.value === 'rating-asc') res.sort((a, b) => a.rating - b.rating);
  return res;
});

const totalPages = computed(() => Math.ceil(filteredReviews.value.length / itemsPerPage));
const paginatedReviews = computed(() => filteredReviews.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

const resetFilters = () => { searchQuery.value = ''; ratingFilter.value = 'all'; statusFilter.value = 'all'; sortOrder.value = 'new'; };
watch([searchQuery, ratingFilter, statusFilter, sortOrder], () => { currentPage.value = 1; });

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ОТЗЫВЫ (GLASSMORPHISM & DARK MODE) – обновлено
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-reviews { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-reviews { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 25px; margin-bottom: 30px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; margin-top: 5px; }

.filter-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 20px; align-items: flex-end; }

/* ИНПУТЫ */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 24px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); }
.input-group.full-width { grid-column: 1 / -1; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.comment-area { resize: vertical; min-height: 100px; }
.pros-cons-grid-form { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.label-pros { color: var(--success, #10b981); }
.label-cons { color: var(--danger, #ef4444); }

/* Загрузка фото */
.upload-gallery { display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px; }
.preview-item { width: 80px; height: 80px; position: relative; padding: 4px; background: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.preview-item img { max-width: 100%; max-height: 100%; object-fit: contain; cursor: zoom-in; }
.file-label-big { width: 100px; height: 80px; display: flex; align-items: center; justify-content: center; border: 2px dashed var(--border-color); cursor: pointer; border-radius: 12px; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; }
.file-label-big:hover { border-color: var(--primary); color: var(--primary); background: rgba(37,99,235,0.05); }
.hidden-file { display: none; }
.btn-clear-img { position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; background: var(--danger, #ef4444); color: white; border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.spinner-small { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.form-footer { display: flex; justify-content: flex-end; margin-top: 20px; }
.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 14px 30px; border-radius: 8px; font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.admin-reviews { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-reviews { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 20px; align-items: flex-end; }

/* ИНПУТЫ */
.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.input-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.table-meta { margin-bottom: 16px; font-size: 0.85rem; color: var(--text-muted, #64748b); font-weight: 600; }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.review-row:hover td { background: rgba(37, 99, 235, 0.02); }
.row-pending { background: rgba(245, 158, 11, 0.03); }
:global(.dark) .row-pending { background: rgba(245, 158, 11, 0.05); }

.col-id { width: 80px; font-weight: 800; color: var(--primary, #2563eb); font-family: monospace; }
.date-tag { font-size: 0.65rem; color: var(--text-muted, #94a3b8); margin-top: 5px; font-weight: 700; }

.product-name { font-weight: 800; font-size: 0.95rem; color: var(--text-main, #0f172a); }
:global(.dark) .product-name { color: #f8fafc; }
.user-name { font-size: 0.85rem; color: var(--text-muted, #64748b); margin-top: 5px; font-weight: 600; }

/* Оценка */
.rating-select { padding: 6px 12px; border-radius: 20px; font-weight: 800; border: 1px solid var(--border-color, #cbd5e1); background: transparent; cursor: pointer; color: #f59e0b; }

/* Контент отзыва */
.col-content { min-width: 450px; }
.review-body-edit { display: flex; flex-direction: column; gap: 15px; }
.comment-textarea { width: 100%; padding: 10px; font-size: 0.9rem; color: var(--text-main, #0f172a); resize: vertical; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; }
:global(.dark) .comment-textarea { color: #e2e8f0; }

.pros-cons-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.label-pros { color: var(--success, #10b981); font-size: 0.7rem; font-weight: 800; display: block; margin-bottom: 5px; }
.label-cons { color: var(--danger, #ef4444); font-size: 0.7rem; font-weight: 800; display: block; margin-bottom: 5px; }
.mini-input { width: 100%; padding: 8px; font-size: 0.8rem; border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; }

/* Галерея в таблице */
.image-management-zone { border-top: 1px dashed var(--border-color, #e2e8f0); padding-top: 15px; }
.images-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.img-item { position: relative; width: 60px; height: 60px; }
.img-preview { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; cursor: zoom-in; padding: 0 !important; }
.delete-img-trigger { position: absolute; top: -5px; right: -5px; width: 18px; height: 18px; background: var(--danger, #ef4444); color: white; border: none; border-radius: 50%; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }

.upload-new-trigger { width: 60px; height: 60px; border: 2px dashed var(--border-color, #cbd5e1); border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted, #94a3b8); font-size: 1.5rem; transition: 0.2s; }
.upload-new-trigger:hover { border-color: var(--primary, #2563eb); background: rgba(37, 99, 235, 0.05); }
.loader-mini { width: 20px; height: 20px; border: 2px solid rgba(0,0,0,0.1); border-top-color: var(--primary, #2563eb); border-radius: 50%; animation: spin 0.6s linear infinite; }

/* Статус Toggle */
.status-wrapper { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.toggle-switch { position: relative; display: inline-block; width: 44px; height: 22px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px; }
.toggle-slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .toggle-slider { background-color: var(--success, #10b981); }
input:checked + .toggle-slider:before { transform: translateX(22px); }
.status-text { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #94a3b8); }
.status-text.active { color: var(--success, #10b981); }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: none; padding: 8px 16px; border-radius: 30px; font-weight: 800; font-size: 0.75rem; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; border-radius: 12px; font-weight: 900; display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { color: #f8fafc; }
.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) { .filter-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 768px) { .admin-reviews { padding: 24px 16px; } .header-row { flex-direction: column; align-items: flex-start; } .col-content { min-width: 250px; } .p-numbers { display: none; } }
</style>

