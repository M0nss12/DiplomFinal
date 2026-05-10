<template>
  <div v-if="product" class="product-detail-page animate-fade-in-up">
    <!-- ХЛЕБНЫЕ КРОШКИ -->
    <nav v-if="product.categories" class="breadcrumbs">
      <router-link to="/catalog">Каталог</router-link>
      <span v-for="crumb in breadcrumbs" :key="crumb.id" class="breadcrumb-item">
        <span class="separator">/</span>
        <router-link :to="'/catalog/' + crumb.id">{{ crumb.name }}</router-link>
      </span>
      <span class="separator">/</span>
      <router-link :to="'/category/' + product.category_id" class="current-category">
        {{ product.categories?.name || 'Категория' }}
      </router-link>
      <span class="separator">/</span>
      <span class="current-product">{{ product.name }}</span>
    </nav>

    <h1 class="product-main-title">{{ product.name }}</h1>

    <!-- РЕЙТИНГ ТОВАРА -->
    <div v-if="reviews.length > 0" class="product-rating-overview">
      <div class="stars-display">
        <span v-for="n in 5" :key="n" class="star" :class="{ filled: n <= Math.round(averageRating) }">★</span>
      </div>
      <span class="rating-value">{{ averageRating }} / 5</span>
      <span class="text-muted">({{ reviews.length }} отзывов)</span>
    </div>

    <div class="product-core-grid">
      <!-- ЛЕВАЯ КОЛОНКА: ФОТО -->
      <div class="product-gallery">
        <div class="image-card glass-card">
          <button @click="toggleWishlist" class="wishlist-float-btn" :class="{ 'is-active': isFavorite }" title="В избранное">
            <span>❤️</span>
          </button>
          <img :src="activeImage" class="main-image" @click="previewImage(activeImage)" />
        </div>
        <div v-if="product.images && product.images.length > 1" class="gallery-thumbnails">
          <img 
            v-for="(img, idx) in product.images" 
            :key="idx" 
            :src="img" 
            @click="activeImage = img"
            class="thumb-img glass-card"
            :class="{ active: activeImage === img }"
          />
        </div>
      </div>

      <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА: ХАРАКТЕРИСТИКИ -->
      <div class="product-info-column">
        <div class="brand-header">
          <div class="badge">Артикул: <b>{{ product.sku }}</b></div>
          <img :src="product.brands?.logo_url" class="brand-mini-logo glass-card" v-if="product.brands?.logo_url" />
        </div>

        <div class="specs-section glass-card">
          <h3>Характеристики</h3>
          <ul class="specs-list">
            <li v-if="product.weight_kg"><span>📦 Вес</span> <b>{{ product.weight_kg }} кг</b></li>
            <li v-if="product.warranty_months"><span>🛡️ Гарантия</span> <b>{{ product.warranty_months }} мес.</b></li>
            <li v-for="(val, key) in product.characteristics" :key="key">
               <span>{{ key }}</span> <b>{{ val }}</b>
            </li>
          </ul>
        </div>

        <div class="stock-section glass-card">
          <h3>Наличие в магазинах</h3>
          <div v-if="localStocks.length > 0" class="city-stock-card">
            <div class="city-header">
               📍 В {{ appStore.city || 'вашем городе' }}: <b>{{ totalLocalStock }} шт.</b>
            </div>
            <table class="stock-table">
              <tbody>
                <tr v-for="stock in localStocks" :key="stock.id">
                  <td>{{ stock.warehouses?.address }}</td>
                  <td class="qty-cell">{{ stock.quantity }} шт.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="alert alert-warning">
            ⚠️ В {{ appStore.city || 'вашем городе' }} нет в наличии. Доступно под заказ.
          </div>

          <div v-if="groupedOtherCityStocks.length > 0" class="other-cities-wrap">
            <button @click="showOtherCities = !showOtherCities" class="btn btn-outline btn-sm">
              {{ showOtherCities ? 'Скрыть города' : `Наличие в других городах (${groupedOtherCityStocks.length})` }}
            </button>

            <transition name="slide">
              <div v-if="showOtherCities" class="other-cities-list glass-card">
                <table class="stock-table">
                  <tbody>
                    <tr v-for="cityInfo in groupedOtherCityStocks" :key="cityInfo.city">
                      <td>{{ cityInfo.city }}</td>
                      <td class="qty-cell"><b>{{ cityInfo.total }} шт.</b></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <!-- ПРАВАЯ КОЛОНКА: ЦЕНА И КУПИТЬ -->
      <aside class="product-buy-card glass-card">
        <div class="price-container">
          <div v-if="product.discount_price" class="price-discount-wrap">
            <s class="old-price">{{ product.price }} ₽</s>
            <div class="new-price">{{ product.discount_price }} ₽</div>
          </div>
          <div v-else class="new-price">{{ product.price }} ₽</div>
        </div>

        <div class="delivery-hint">
          <div v-if="totalLocalStock > 0" class="badge badge-success">✅ В наличии сегодня</div>
          <div v-else class="badge badge-warning">🚢 Межгород. Доставка 2-4 дня</div>
        </div>

        <button 
          @click="handleAddToCart" 
          :disabled="totalStockCount === 0" 
          class="btn btn-primary btn-block add-to-cart-btn"
        >
          {{ totalStockCount > 0 ? 'В корзину' : 'Нет в наличии' }}
        </button>

        <div class="trust-icons">
          <div class="t-item">💳 Оплата: <b>Онлайн или при получении</b></div>
          <div class="t-item">🚚 Быстрая логистика между складами</div>
        </div>
      </aside>
    </div>

    <!-- ОПИСАНИЕ ТОВАРА -->
    <section v-if="product.description" class="product-description-section glass-card">
      <h2>Описание</h2>
      <p>{{ product.description }}</p>
    </section>

    <!-- СЕКЦИЯ ОТЗЫВОВ (без изменений, только кнопки и инпуты адаптированы под глобальные стили) -->
    <section class="reviews-section">
      <div class="reviews-header">
        <h2>Отзывы покупателей <span class="badge">{{ reviews.length }}</span></h2>
        <button v-if="canUserLeaveReview && !userExistingReview && !showReviewForm" 
                @click="prepareCreate" class="btn btn-outline">
          Написать отзыв
        </button>
      </div>

      <!-- ФОРМА СОЗДАНИЯ / РЕДАКТИРОВАНИЯ ОТЗЫВА -->
      <transition name="fade">
        <div v-if="showReviewForm" class="review-form-card glass-card">
          <h3>{{ isEditing ? 'Редактирование отзыва' : 'Ваше мнение о товаре' }}</h3>
          <div class="rating-picker">
            <span>Ваша оценка:</span>
            <div class="stars">
              <button v-for="n in 5" :key="n" @click="newReview.rating = n" 
                      :class="{ 'active': n <= newReview.rating }">★</button>
            </div>
          </div>
          <div class="review-inputs-grid">
            <input v-model="newReview.pros" placeholder="➕ Достоинства" />
            <input v-model="newReview.cons" placeholder="➖ Недостатки" />
          </div>
          <textarea v-model="newReview.comment" placeholder="Напишите подробнее о качестве детали..." rows="4"></textarea>
          <div class="client-photo-upload-zone">
            <p class="upload-label">Прикрепить фото (макс. 5 шт):</p>
            <div class="images-preview-grid">
              <div v-for="(img, idx) in newReview.images" :key="idx" class="client-img-item">
                <img :src="img" class="client-preview-img" @click="previewImage(img)"/>
                <button type="button" @click="removePhotoFromForm(idx)" class="client-remove-img-btn">✕</button>
              </div>
              <label v-if="newReview.images.length < 5" class="client-upload-btn" :class="{'is-uploading': isUploadingPhoto}">
                <input type="file" @change="handlePhotoUpload" accept="image/*" hidden />
                <span v-if="!isUploadingPhoto">+</span>
                <span v-else class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></span>
              </label>
            </div>
          </div>
          <div class="form-actions">
            <button @click="submitReview" :disabled="submittingReview || isUploadingPhoto" class="btn btn-success">
              {{ submittingReview ? 'Сохранение...' : 'Опубликовать' }}
            </button>
            <button @click="cancelReviewForm" class="btn btn-outline">Отмена</button>
          </div>
        </div>
      </transition>

      <!-- СПИСОК ОТЗЫВОВ (только кнопки заменены на .btn) -->
      <div v-if="reviews.length > 0" class="reviews-list">
        <div v-for="review in reviews" :key="review.id" 
             class="review-item glass-card"
             :class="{ 'is-mine': review.user_id == currentUserId }">
          <div v-if="review.user_id == currentUserId && !showReviewForm" class="my-review-actions">
            <button @click="prepareEdit(review)" class="btn btn-sm btn-outline">✎ Редактировать</button>
            <button @click="deleteMyReview(review)" class="btn btn-sm btn-danger">🗑️ Удалить</button>
          </div>
          <div class="review-user-info">
            <img :src="review.users?.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png'" @error="$event.target.src = 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png'" />
            <div class="u-meta">
              <strong>{{ review.users?.first_name || 'Покупатель' }} <span v-if="review.user_id == currentUserId" class="you-tag">(Вы)</span></strong>
              <div class="user-stars">{{ '★'.repeat(review.rating) }}<span class="empty-star">{{ '★'.repeat(5 - review.rating) }}</span></div>
            </div>
            <span class="review-date">{{ review.created_at ? new Date(review.created_at).toLocaleDateString() : 'Недавно' }}</span>
          </div>
          <div class="review-text">{{ review.comment }}</div>
          <div class="pros-cons" v-if="review.pros || review.cons">
            <div v-if="review.pros" class="pros"><b>+</b> {{ review.pros }}</div>
            <div v-if="review.cons" class="cons"><b>−</b> {{ review.cons }}</div>
          </div>
          <div v-if="review.images && review.images.length > 0" class="review-gallery">
            <img v-for="(img, i) in review.images" :key="i" :src="img" @click="previewImage(img)" class="gallery-thumb" />
          </div>
        </div>
      </div>
      <div v-else class="empty-state glass-card">
        <p>На этот товар еще нет отзывов. Купите товар и станьте первым!</p>
      </div>
    </section>
  </div>

  <div v-else class="product-loader">
    <span class="spinner" style="width: 60px; height: 60px; border-width: 4px;"></span>
    <h2>Загрузка запчасти...</h2>
  </div>

  <!-- ФУЛЛСКРИН ПРОСМОТР ФОТО -->
  <div v-if="fullscreenImage" class="fullscreen-overlay" @click="fullscreenImage = null">
    <img :src="fullscreenImage" class="fullscreen-img" />
    <button class="fullscreen-close">✕</button>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const route = useRoute();
const cartStore = useCartStore();
const appStore = useAppStore();

const product = ref(null);
const activeImage = ref('/assets/images/no-image.png');
const reviews = ref([]);
const wishlistId = ref(null);
const showOtherCities = ref(false);
const currentUserId = ref(localStorage.getItem('user_id'));
const fullscreenImage = ref(null);

const canUserLeaveReview = ref(false);
const userExistingReview = ref(null);
const showReviewForm = ref(false);
const isEditing = ref(false);
const submittingReview = ref(false);
const isUploadingPhoto = ref(false);

const newReview = reactive({ 
    id: null, 
    rating: 5, 
    comment: '', 
    pros: '', 
    cons: '',
    images: []
});

// Хлебные крошки (упрощённо – только текущая категория)
const breadcrumbs = computed(() => {
  const crumbs = [];
  if (!product.value?.categories) return crumbs;
  let parentId = product.value.categories.parent_id;
  // Для полной цепочки нужен запрос всех категорий, но пока оставим только текущую
  return crumbs;
});

// Рейтинг товара
const averageRating = computed(() => {
  if (!reviews.value.length) return 0;
  const sum = reviews.value.reduce((acc, r) => acc + r.rating, 0);
  return (sum / reviews.value.length).toFixed(1);
});

// Срабатывает при смене ID
watch(
  () => route.params.id, 
  async (newId) => {
    if (newId && route.name === 'product-detail') {
      await loadData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
);

const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const uploadConfig = { headers: { 'x-admin-key': ADMIN_KEY } };

const getFilenameFromUrl = (url) => url ? url.split('/').pop() : null;
const previewImage = (url) => { if (url) fullscreenImage.value = url; };

const isSameCity = (city1) => {
    if (!city1 || !appStore.city) return false;
    return city1.trim().toLowerCase() === appStore.city.trim().toLowerCase();
};

const localStocks = computed(() => {
    if (!product.value?.product_stocks) return [];
    return product.value.product_stocks.filter(s => {
        const wCity = s.warehouses?.cities?.name || s.warehouses?.city_name;
        return isSameCity(wCity) && s.quantity > 0;
    });
});

const totalLocalStock = computed(() => localStocks.value.reduce((sum, s) => sum + s.quantity, 0));

const groupedOtherCityStocks = computed(() => {
    if (!product.value?.product_stocks) return [];
    const rawStocks = product.value.product_stocks.filter(s => {
        const wCity = s.warehouses?.cities?.name || s.warehouses?.city_name;
        return !isSameCity(wCity) && s.quantity > 0;
    });
    const groups = {};
    rawStocks.forEach(s => {
        const c = s.warehouses?.cities?.name || s.warehouses?.city_name || 'Неизвестный город';
        groups[c] = (groups[c] || 0) + s.quantity;
    });
    return Object.keys(groups).map(city => ({ city, total: groups[city] })).sort((a, b) => b.total - a.total);
});

const totalStockCount = computed(() => product.value?.product_stocks?.reduce((sum, s) => sum + s.quantity, 0) || 0);
const isFavorite = computed(() => wishlistId.value !== null);

const loadData = async () => {
  const pId = route.params.id;
  if (!pId) return;

  try {
    const pRes = await axios.get(`/api/products/${pId}`);
    product.value = pRes.data;
    activeImage.value = (product.value.images && product.value.images.length > 0) ? product.value.images[0] : '/assets/images/no-image.png';

    saveToHistory(pId);

    const rRes = await axios.get(`/api/reviews/${pId}`);
    reviews.value = rRes.data.map(r => ({ ...r, images: Array.isArray(r.images) ? r.images : [] }));

    const uId = localStorage.getItem('user_id');
    if (uId) {
      userExistingReview.value = reviews.value.find(r => r.user_id == uId) || null;
      const wRes = await axios.get(`/api/wishlist/${uId}`);
      const found = wRes.data.find(item => item.product_id == pId);
      wishlistId.value = found ? found.id : null;

      const orderRes = await axios.get(`/api/orders/${uId}`);
      canUserLeaveReview.value = orderRes.data.some(order => 
        order.delivery_status === 'delivered' && 
        order.order_items.some(item => Number(item.product_id) === Number(pId))
      );
    } else {
      canUserLeaveReview.value = false;
    }
  } catch (e) { console.error("Ошибка загрузки:", e); }
};

const saveToHistory = (id) => {
    let viewed = JSON.parse(localStorage.getItem('recent_views') || '[]');
    viewed = viewed.filter(vId => Number(vId) !== Number(id));
    viewed.unshift(Number(id));
    if (viewed.length > 25) viewed = viewed.slice(0, 25);
    localStorage.setItem('recent_views', JSON.stringify(viewed));
};

const handleAddToCart = () => {
    if (!product.value) return;
    cartStore.addToCart(product.value);
};

const toggleWishlist = async () => {
  const uId = localStorage.getItem('user_id');
  if (!uId) return alert("Войдите в аккаунт.");
  try {
      if (isFavorite.value) {
        await axios.delete(`/api/wishlist/${uId}/${product.value.id}`);
        wishlistId.value = null;
      } else {
        const res = await axios.post('/api/wishlist', { user_id: uId, product_id: product.value.id });
        wishlistId.value = res.data.id;
      }
      window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) { console.error(e); }
};

const prepareCreate = () => {
    isEditing.value = false;
    Object.assign(newReview, { id: null, rating: 5, comment: '', pros: '', cons: '', images: [] });
    showReviewForm.value = true;
};

const prepareEdit = (review) => {
    isEditing.value = true;
    Object.assign(newReview, { 
        id: review.id, rating: review.rating, comment: review.comment, 
        pros: review.pros, cons: review.cons, images: [...(review.images || [])] 
    });
    showReviewForm.value = true;
};

const cancelReviewForm = () => { showReviewForm.value = false; };

const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    isUploadingPhoto.value = true;
    try {
        const res = await axios.post('/api/upload/reviews', formData, uploadConfig);
        newReview.images.push(res.data.url);
    } catch (e) { alert('Ошибка загрузки фото'); } 
    finally { isUploadingPhoto.value = false; }
};

const removePhotoFromForm = (index) => { newReview.images.splice(index, 1); };

const submitReview = async () => {
    if (!newReview.comment.trim()) return alert("Напишите комментарий");
    submittingReview.value = true;
    try {
        const reviewData = { product_id: product.value.id, user_id: currentUserId.value, rating: newReview.rating, comment: newReview.comment, pros: newReview.pros, cons: newReview.cons, images: newReview.images };
        if (isEditing.value) await axios.patch(`/api/reviews/${newReview.id}`, reviewData);
        else await axios.post(`/api/reviews`, reviewData);
        showReviewForm.value = false;
        await loadData(); 
    } catch (e) { alert("Ошибка сохранения отзыва"); } 
    finally { submittingReview.value = false; }
};

const deleteMyReview = async (review) => {
    if (!confirm('Удалить отзыв?')) return;
    try {
        await axios.delete(`/api/admin/reviews/${review.id}`, uploadConfig);
        reviews.value = reviews.value.filter(r => r.id !== review.id);
        userExistingReview.value = null;
    } catch (e) { alert('Ошибка удаления'); }
};

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ ТОВАРА
   ========================================================================== */

.product-detail-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 24px;
}

/* Хлебные крошки */
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 0.9rem;
  color: var(--text-muted);
}
.breadcrumbs a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}
.breadcrumbs a:hover {
  text-decoration: underline;
}
.separator {
  margin: 0 4px;
  color: var(--border-color);
}
.current-product {
  font-weight: 700;
  color: var(--text-main);
}

.product-main-title {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Рейтинг */
.product-rating-overview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.stars-display .star {
  font-size: 1.6rem;
  color: #e2e8f0;
  margin-right: 2px;
}
.stars-display .star.filled {
  color: #f59e0b;
}
.rating-value {
  font-weight: 800;
  color: var(--text-main);
  font-size: 1.1rem;
}

/* Сетка */
.product-core-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr 0.8fr;
  gap: 32px;
  align-items: flex-start;
}

/* Галерея */
.product-gallery {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.image-card {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 350px;
  position: relative;
}
.main-image {
  max-width: 100%;
  max-height: 350px;
  object-fit: contain;
  cursor: zoom-in;
}
.gallery-thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.thumb-img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  padding: 4px;
  cursor: pointer;
  opacity: 0.6;
  border: 2px solid transparent;
  border-radius: 8px;
}
.thumb-img.active,
.thumb-img:hover {
  opacity: 1;
  border-color: var(--primary);
}

.wishlist-float-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.wishlist-float-btn.is-active {
  color: var(--danger);
  border-color: var(--danger);
}

/* Инфо-колонка */
.brand-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}
.badge {
  background: rgba(0,0,0,0.05);
  padding: 6px 14px;
  border-radius: 40px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}
:global(.dark) .badge {
  background: rgba(255,255,255,0.05);
  color: #94a3b8;
}

.brand-mini-logo {
  height: 40px;
  object-fit: contain;
  padding: 4px 8px;
  border-radius: 8px;
}

.specs-section,
.stock-section,
.product-description-section {
  padding: 24px;
  margin-bottom: 28px;
}
.specs-section h3,
.stock-section h3,
.product-description-section h2 {
  font-size: 1.25rem;
  font-weight: 800;
  margin-bottom: 16px;
  color: var(--text-main);
}

.specs-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.specs-list li {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-color);
}
:global(.dark) .specs-list li {
  border-color: #334155;
}
.specs-list li:last-child {
  border-bottom: none;
}
.specs-list span {
  color: var(--text-muted);
  font-weight: 600;
}
.specs-list b {
  color: var(--text-main);
}
:global(.dark) .specs-list b {
  color: #e2e8f0;
}

.product-description-section p {
  line-height: 1.6;
  color: var(--text-muted);
  font-size: 1rem;
}
:global(.dark) .product-description-section p {
  color: #cbd5e1;
}

/* Наличие */
.city-stock-card {
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid var(--success);
  border-radius: var(--radius-md);
  overflow: hidden;
  margin-top: 16px;
}
.city-header {
  padding: 12px 16px;
  background: rgba(16, 185, 129, 0.1);
  font-weight: 800;
  color: var(--success);
}
.stock-table {
  width: 100%;
  border-collapse: collapse;
}
.stock-table td {
  padding: 12px 16px;
  border-top: 1px solid rgba(16, 185, 129, 0.15);
  font-size: 0.9rem;
  color: var(--text-main);
}
:global(.dark) .stock-table td {
  color: #e2e8f0;
}
.qty-cell {
  text-align: right;
  font-weight: 800;
  color: var(--success);
}

.other-cities-list {
  margin-top: 12px;
  overflow: hidden;
}

/* Карточка покупки */
.product-buy-card {
  padding: 28px;
  position: sticky;
  top: 100px;
}
.price-container {
  margin-bottom: 20px;
}
.new-price {
  font-size: 2.8rem;
  font-weight: 900;
  color: var(--danger);
  line-height: 1;
}
.old-price {
  font-size: 1.1rem;
  text-decoration: line-through;
  color: var(--text-muted);
  margin-bottom: 5px;
  display: block;
  font-weight: 600;
}

.delivery-hint {
  margin: 20px 0;
  font-weight: 700;
  font-size: 0.95rem;
}

.add-to-cart-btn {
  padding: 16px;
  font-size: 1.1rem;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}
.add-to-cart-btn:disabled {
  background: rgba(0,0,0,0.05);
  color: var(--text-muted);
  box-shadow: none;
}
:global(.dark) .add-to-cart-btn:disabled {
  background: rgba(255,255,255,0.05);
}

.trust-icons {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Секция отзывов */
.reviews-section {
  margin-top: 60px;
  padding-top: 48px;
}
.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}
.reviews-header h2 {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--text-main);
}

.rating-picker {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  font-weight: 700;
  color: var(--text-muted);
}
.stars button {
  font-size: 2.2rem;
  background: none;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  padding: 0 5px;
}
:global(.dark) .stars button {
  color: #334155;
}
.stars button.active {
  color: #f59e0b;
}

.review-inputs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.client-photo-upload-zone {
  margin-top: 20px;
  padding: 16px;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-md);
  background: rgba(0,0,0,0.02);
}
:global(.dark) .client-photo-upload-zone {
  background: rgba(255,255,255,0.02);
  border-color: #475569;
}
.upload-label {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.images-preview-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.client-img-item {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  background: #fff;
}
:global(.dark) .client-img-item {
  border-color: #334155;
  background: #1e293b;
}
.client-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.client-remove-img-btn {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 22px;
  height: 22px;
  background: var(--danger);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.client-upload-btn {
  width: 70px;
  height: 70px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--text-muted);
  cursor: pointer;
}
:global(.dark) .client-upload-btn {
  border-color: #475569;
}
.client-upload-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-light);
}

.form-actions {
  display: flex;
  gap: 16px;
  margin-top: 24px;
}

/* Список отзывов */
.review-item {
  padding: 24px;
  margin-bottom: 24px;
  position: relative;
}
.review-item.is-mine {
  border-left: 4px solid var(--primary);
  background: linear-gradient(145deg, var(--bg-card), var(--primary-light));
}
:global(.dark) .review-item.is-mine {
  background: linear-gradient(145deg, #1e293b, rgba(37, 99, 235, 0.05));
}

.my-review-actions {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 10px;
  z-index: 5;
}

.review-user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.review-user-info img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(37, 99, 235, 0.2);
}
.u-meta strong {
  font-size: 1rem;
  display: block;
  color: var(--text-main);
}
.you-tag {
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 800;
  margin-left: 6px;
}
.user-stars {
  color: #f59e0b;
  font-size: 1rem;
  margin-top: 2px;
}
.empty-star {
  color: #e2e8f0;
}
.review-date {
  color: var(--text-muted);
  font-size: 0.8rem;
  margin-left: auto;
  font-weight: 500;
}

.review-text {
  line-height: 1.6;
  margin-bottom: 16px;
  color: var(--text-main);
  font-size: 0.95rem;
}
.pros-cons {
  font-size: 0.9rem;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.pros,
.cons {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--text-main);
}
.pros b {
  color: var(--success);
}
.cons b {
  color: var(--danger);
}

.review-gallery {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 16px;
}
.gallery-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px;
  cursor: zoom-in;
  border: 1px solid var(--border-color);
}
.gallery-thumb:hover {
  transform: scale(1.05);
  border-color: var(--primary);
}

/* Загрузка */
.product-loader {
  text-align: center;
  padding: 100px;
  color: var(--text-muted);
}

/* Фуллскрин */
.fullscreen-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  cursor: zoom-out;
}
.fullscreen-img {
  max-width: 90%;
  max-height: 90vh;
  border-radius: var(--radius-md);
  object-fit: contain;
}
.fullscreen-close {
  position: absolute;
  top: 20px;
  right: 30px;
  background: none;
  border: none;
  color: white;
  font-size: 2.5rem;
  cursor: pointer;
}
.fullscreen-close:hover {
  transform: scale(1.1);
  color: var(--danger);
}

/* Адаптивность */
@media (max-width: 1200px) {
  .product-core-grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 992px) {
  .product-core-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .product-buy-card {
    position: static;
  }
}
@media (max-width: 768px) {
  .product-detail-page {
    padding: 24px 16px;
  }
  .product-main-title {
    font-size: 1.8rem;
  }
  .review-inputs-grid {
    grid-template-columns: 1fr;
  }
  .my-review-actions {
    position: static;
    justify-content: flex-end;
    margin-bottom: 16px;
  }
  .review-user-info {
    flex-wrap: wrap;
  }
  .review-date {
    margin-left: 0;
  }
}
</style>