<template>
  <div v-if="product" class="product-detail-page">
    
    <h1 class="product-main-title">{{ product.name }}</h1>

    <div class="product-core-grid">
      
      <!-- ЛЕВАЯ КОЛОНКА: ФОТО (Галлерея) -->
      <div class="product-gallery">
        <div class="image-card glass-card">
          <button @click="toggleWishlist" class="wishlist-float-btn" :class="{ 'is-active': isFavorite }" title="В избранное">
            <span>❤️</span>
          </button>
          
          <img :src="activeImage" class="main-image" @click="previewImage(activeImage)" />
        </div>

        <!-- Если картинок несколько, показываем миниатюры -->
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

      <!-- ЦЕНТРАЛЬНАЯ КОЛОНКА: ИНФО -->
      <div class="product-info-column">
        <div class="brand-header">
          <div class="sku-badge">Артикул: <b>{{ product.sku }}</b></div>
          <img :src="product.brands?.logo_url" class="brand-mini-logo glass-card" v-if="product.brands?.logo_url" />
        </div>
        
        <div class="specs-section glass-card">
          <h3>Характеристики</h3>
          <ul class="specs-list">
            <li v-if="product.weight_kg"><span>📦 Вес</span> <b>{{ product.weight_kg }} кг</b></li>
            <li v-if="product.warranty_months"><span>🛡️ Гарантия</span> <b>{{ product.warranty_months }} мес.</b></li>
            <!-- Динамические характеристики из JSONB -->
            <li v-for="(val, key) in product.characteristics" :key="key">
               <span>{{ key }}</span> <b>{{ val }}</b>
            </li>
          </ul>
        </div>

        <div class="stock-section glass-card">
          <h3>Наличие в магазинах</h3>
          
          <div v-if="localStocks.length > 0" class="city-stock-card">
            <div class="city-header">
               📍 В г. {{ appStore.city }}: <b>{{ totalLocalStock }} шт.</b>
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

          <div v-else class="stock-alert">
             ⚠️ В г. {{ appStore.city }} нет в наличии. Доступно под заказ.
          </div>

          <div v-if="groupedOtherCityStocks.length > 0" class="other-cities-wrap">
             <button @click="showOtherCities = !showOtherCities" class="btn-outline-small">
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
            <div v-if="totalLocalStock > 0" class="status-ok">✅ В наличии сегодня</div>
            <div v-else class="status-wait">🚢 Межгород. Доставка 2-4 дня</div>
        </div>

        <button 
          @click="handleAddToCart" 
          :disabled="totalStockCount === 0" 
          class="main-cart-btn"
          :class="{ 'disabled': totalStockCount === 0 }"
        >
          {{ totalStockCount > 0 ? 'В корзину' : 'Нет в наличии' }}
        </button>

        <div class="trust-icons">
          <div class="t-item">💳 Оплата: <b>Онлайн или при получении</b></div>
          <div class="t-item">🚚 Быстрая логистика между складами</div>
        </div>
      </aside>
    </div>

    <!-- ОПИСАНИЕ ТОВАРА (Если есть) -->
    <section v-if="product.description" class="product-description-section glass-card">
        <h2>Описание</h2>
        <p>{{ product.description }}</p>
    </section>

    <!-- ==============================================
         СЕКЦИЯ ОТЗЫВОВ 
         ============================================== -->
    <section class="reviews-section">
      <div class="reviews-header">
        <h2>Отзывы покупателей <span class="reviews-count-badge">{{ reviews.length }}</span></h2>
        
        <button v-if="canUserLeaveReview && !userExistingReview && !showReviewForm" 
                @click="prepareCreate" class="btn-write-review">
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
              <input v-model="newReview.pros" placeholder="➕ Достоинства" class="form-input" />
              <input v-model="newReview.cons" placeholder="➖ Недостатки" class="form-input" />
          </div>

          <textarea v-model="newReview.comment" placeholder="Напишите подробнее о качестве детали..." rows="4" class="form-textarea"></textarea>
          
          <!-- ЗОНА ЗАГРУЗКИ ФОТО -->
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
                <span v-else class="loader-mini"></span>
              </label>
            </div>
          </div>

          <div class="form-actions">
              <button @click="submitReview" :disabled="submittingReview || isUploadingPhoto" class="btn-submit-review">
                  {{ submittingReview ? 'Сохранение...' : 'Опубликовать' }}
              </button>
              <button @click="cancelReviewForm" class="btn-cancel">Отмена</button>
          </div>
        </div>
      </transition>

      <!-- СПИСОК ОТЗЫВОВ -->
      <div v-if="reviews.length > 0" class="reviews-list">
        <div v-for="review in reviews" :key="review.id" 
             class="review-item glass-card"
             :class="{ 'is-mine': review.user_id == currentUserId }">
          
          <div v-if="review.user_id == currentUserId && !showReviewForm" class="my-review-actions">
            <button @click="prepareEdit(review)" class="btn-action edit">✎ Редактировать</button>
            <button @click="deleteMyReview(review)" class="btn-action delete">🗑️ Удалить</button>
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

          <!-- ГАЛЕРЕЯ ФОТОГРАФИЙ ОТЗЫВА -->
          <div v-if="review.images && review.images.length > 0" class="review-gallery">
            <img v-for="(img, i) in review.images" :key="i" :src="img" @click="previewImage(img)" class="gallery-thumb" />
          </div>

        </div>
      </div>
      <div v-else class="no-reviews glass-card">
        <p>На этот товар еще нет отзывов. Купите товар и станьте первым!</p>
      </div>
    </section>
  </div>

  <div v-else class="product-loader">
    <div class="spinner"></div>
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

// ЕДИНЫЙ СЛЕДЫТЬ ЗА ID (Исправляет баг пустых страниц)
watch(
  () => route.params.id, 
  async (newId) => {
    // Срабатывает только если мы на странице товара
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

// --- ВЫЧИСЛЯЕМЫЕ СВОЙСТВА ---
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

// --- ЗАГРУЗКА ДАННЫХ ---
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

// --- ОТЗЫВЫ ---
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
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ И СТЕКЛА)
   ========================================================================== */

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.product-detail-page {
  max-width: 1400px; margin: 0 auto; padding: 40px 24px;
  animation: fadeSlideUp 0.6s ease-out; color: var(--text-main, #0f172a);
}
:global(.dark) .product-detail-page { color: #f8fafc; }

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: transform 0.3s, box-shadow 0.3s;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
.glass-card:hover { box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1); transform: translateY(-2px); }
:global(.dark) .glass-card:hover { box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5); }

.product-main-title {
  font-size: 2.5rem; font-weight: 900; margin-bottom: 32px;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

.product-core-grid { display: grid; grid-template-columns: 1fr 1.2fr 0.8fr; gap: 32px; align-items: flex-start; }

/* ГАЛЕРЕЯ (ЛЕВАЯ КОЛОНКА) */
.product-gallery { display: flex; flex-direction: column; gap: 15px; }
.product-gallery .image-card {
  padding: 40px; display: flex; align-items: center; justify-content: center;
  min-height: 400px; position: relative; cursor: zoom-in;
}
.main-image { max-width: 100%; max-height: 400px; object-fit: contain; transition: transform 0.4s; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05)); }
:global(.dark) .main-image { filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); }
.image-card:hover .main-image { transform: scale(1.05); }

.gallery-thumbnails { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
.gallery-thumbnails::-webkit-scrollbar { display: none; }
.thumb-img {
  width: 70px; height: 70px; object-fit: contain; padding: 5px; cursor: pointer;
  border-radius: var(--radius-sm, 8px); opacity: 0.6; transition: all 0.2s;
}
.thumb-img.active, .thumb-img:hover { opacity: 1; border-color: var(--primary, #2563eb); }

/* ИЗБРАННОЕ */
.wishlist-float-btn {
  position: absolute; top: 15px; right: 15px; width: 50px; height: 50px;
  border-radius: 50%; background: var(--bg-card, #fff); border: 1px solid var(--border-color, #e2e8f0);
  font-size: 1.6rem; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s; color: var(--text-muted, #94a3b8); z-index: 10;
}
:global(.dark) .wishlist-float-btn { background: #1e293b; border-color: #334155; }
.wishlist-float-btn:hover { transform: scale(1.15) rotate(5deg); background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }
.wishlist-float-btn.is-active { color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); background: rgba(239, 68, 68, 0.1); }

/* ЦЕНТРАЛЬНАЯ КОЛОНКА (ХАРАКТЕРИСТИКИ) */
.brand-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.sku-badge { background: rgba(0,0,0,0.05); padding: 6px 14px; border-radius: 40px; font-size: 0.85rem; font-weight: 700; color: var(--text-muted, #64748b); }
:global(.dark) .sku-badge { background: rgba(255,255,255,0.05); color: #94a3b8; }
.brand-mini-logo { height: 40px; object-fit: contain; padding: 4px 8px; border-radius: 8px; }

.specs-section, .stock-section, .product-description-section { padding: 24px; margin-bottom: 28px; }
.specs-section h3, .stock-section h3, .product-description-section h2 { font-size: 1.25rem; font-weight: 800; margin-bottom: 16px; color: var(--text-main, #0f172a); }
:global(.dark) .specs-section h3, :global(.dark) .stock-section h3, :global(.dark) .product-description-section h2 { color: #f8fafc; }

.specs-list { list-style: none; padding: 0; margin: 0; }
.specs-list li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed var(--border-color, #e2e8f0); }
:global(.dark) .specs-list li { border-color: #334155; }
.specs-list li:last-child { border-bottom: none; }
.specs-list span { color: var(--text-muted, #64748b); font-weight: 600; }
.specs-list b { color: var(--text-main, #0f172a); }
:global(.dark) .specs-list b { color: #e2e8f0; }

.product-description-section p { line-height: 1.6; color: var(--text-muted, #64748b); font-size: 1rem; }
:global(.dark) .product-description-section p { color: #cbd5e1; }

/* НАЛИЧИЕ И СКЛАДЫ */
.city-stock-card { background: rgba(16, 185, 129, 0.05); border: 1px solid var(--success, #10b981); border-radius: var(--radius-md, 8px); overflow: hidden; margin-top: 16px; }
.city-header { padding: 12px 16px; background: rgba(16, 185, 129, 0.1); font-weight: 800; color: var(--success, #10b981); }
.stock-table { width: 100%; border-collapse: collapse; }
.stock-table td { padding: 12px 16px; border-top: 1px solid rgba(16, 185, 129, 0.15); font-size: 0.9rem; color: var(--text-main, #0f172a); }
:global(.dark) .stock-table td { color: #e2e8f0; }
.qty-cell { text-align: right; font-weight: 800; color: var(--success, #10b981); }

.stock-alert { padding: 14px; background: rgba(245, 158, 11, 0.1); border-radius: var(--radius-md, 8px); color: var(--warning, #d97706); font-weight: 700; margin-top: 16px; }

.btn-outline-small { margin-top: 16px; padding: 8px 18px; background: transparent; border: 1px solid var(--border-color, #cbd5e1); border-radius: 40px; font-size: 0.85rem; font-weight: 700; color: var(--text-muted, #64748b); cursor: pointer; transition: all 0.2s; }
:global(.dark) .btn-outline-small { border-color: #475569; color: #94a3b8; }
.btn-outline-small:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); background: rgba(37, 99, 235, 0.05); transform: translateY(-2px); }

.other-cities-list { margin-top: 12px; overflow: hidden; }

/* ПРАВАЯ КОЛОНКА – ПОКУПКА */
.product-buy-card { padding: 28px; position: sticky; top: 100px; }
.price-container { margin-bottom: 20px; }
.new-price { font-size: 2.8rem; font-weight: 900; color: var(--danger, #ef4444); line-height: 1; }
.old-price { font-size: 1.1rem; text-decoration: line-through; color: var(--text-muted, #64748b); margin-bottom: 5px; display: block; font-weight: 600; }

.delivery-hint { margin: 20px 0; font-weight: 700; font-size: 0.95rem; }
.status-ok { color: var(--success, #10b981); }
.status-wait { color: var(--warning, #d97706); }

.main-cart-btn {
  width: 100%; padding: 16px; background: var(--primary, #2563eb); color: white;
  border: none; border-radius: var(--radius-md, 12px); font-size: 1.1rem; font-weight: 800;
  cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}
.main-cart-btn:hover:not(.disabled) { transform: translateY(-3px); background: var(--primary-hover, #1d4ed8); }
.main-cart-btn.disabled { background: rgba(0,0,0,0.05); color: var(--text-muted, #94a3b8); cursor: not-allowed; box-shadow: none; }
:global(.dark) .main-cart-btn.disabled { background: rgba(255,255,255,0.05); }

.trust-icons { margin-top: 24px; display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem; color: var(--text-muted, #64748b); }

/* СЕКЦИЯ ОТЗЫВОВ */
.reviews-section { margin-top: 60px; padding-top: 48px; }
.reviews-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.reviews-header h2 { font-size: 1.8rem; font-weight: 900; color: var(--text-main, #0f172a); }
:global(.dark) .reviews-header h2 { color: #f8fafc; }
.reviews-count-badge { background: rgba(37, 99, 235, 0.1); color: var(--primary, #2563eb); padding: 4px 12px; border-radius: 40px; font-size: 1rem; font-weight: 800; margin-left: 12px; }

.btn-write-review {
  background: var(--text-main, #0f172a); color: white; border: none; padding: 12px 28px;
  border-radius: 40px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
:global(.dark) .btn-write-review { background: #f8fafc; color: #0f172a; }
.btn-write-review:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }

/* ФОРМА ОТЗЫВА */
.review-form-card { padding: 28px; margin-bottom: 40px; }
.review-form-card h3 { font-size: 1.3rem; font-weight: 800; margin-bottom: 20px; color: var(--text-main, #0f172a); }
:global(.dark) .review-form-card h3 { color: #f8fafc; }

.rating-picker { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; font-weight: 700; color: var(--text-muted, #64748b); }
.stars button { font-size: 2.2rem; background: none; border: none; color: #e2e8f0; cursor: pointer; transition: transform 0.2s; padding: 0 5px; }
:global(.dark) .stars button { color: #334155; }
.stars button.active { color: #f59e0b; }
.stars button:hover { transform: scale(1.2); }

.review-inputs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
.form-input, .form-textarea {
  width: 100%; padding: 14px 18px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-family: inherit; font-size: 1rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input, :global(.dark) .form-textarea { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus, .form-textarea:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

/* ФОТО В ОТЗЫВЕ */
.client-photo-upload-zone { margin-top: 20px; padding: 16px; border: 2px dashed var(--border-color, #cbd5e1); border-radius: var(--radius-md, 12px); background: rgba(0,0,0,0.02); }
:global(.dark) .client-photo-upload-zone { background: rgba(255,255,255,0.02); border-color: #475569; }
.upload-label { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 12px; }
.images-preview-grid { display: flex; gap: 12px; flex-wrap: wrap; }
.client-img-item { position: relative; width: 70px; height: 70px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color, #e2e8f0); background: #fff; }
:global(.dark) .client-img-item { border-color: #334155; background: #1e293b; }
.client-preview-img { width: 100%; height: 100%; object-fit: cover; }
.client-remove-img-btn { position: absolute; top: -5px; right: -5px; width: 22px; height: 22px; background: var(--danger, #ef4444); color: white; border: none; border-radius: 50%; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }

.client-upload-btn { width: 70px; height: 70px; border: 2px dashed var(--border-color, #cbd5e1); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: var(--text-muted, #94a3b8); cursor: pointer; transition: all 0.2s; background: transparent; }
:global(.dark) .client-upload-btn { border-color: #475569; }
.client-upload-btn:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); background: rgba(37, 99, 235, 0.05); }

.form-actions { display: flex; gap: 16px; margin-top: 24px; }
.btn-submit-review { background: var(--success, #10b981); color: white; border: none; padding: 14px 32px; border-radius: 40px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.2s; }
.btn-submit-review:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3); background: #059669; }
.btn-submit-review:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-cancel { background: transparent; border: 2px solid var(--border-color, #cbd5e1); padding: 12px 28px; border-radius: 40px; font-weight: 700; color: var(--text-main, #0f172a); cursor: pointer; transition: all 0.2s; }
:global(.dark) .btn-cancel { border-color: #475569; color: #f8fafc; }
.btn-cancel:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); border-color: var(--danger, #ef4444); }

/* СПИСОК ОТЗЫВОВ */
.review-item { padding: 24px; margin-bottom: 24px; position: relative; }
.review-item.is-mine { border-left: 4px solid var(--primary, #2563eb); background: linear-gradient(145deg, var(--bg-card, #fff), rgba(37, 99, 235, 0.03)); }
:global(.dark) .review-item.is-mine { background: linear-gradient(145deg, #1e293b, rgba(37, 99, 235, 0.05)); }

.my-review-actions { position: absolute; top: 20px; right: 20px; display: flex; gap: 10px; z-index: 5; }
.btn-action { background: rgba(0,0,0,0.03); border: none; font-size: 0.75rem; font-weight: 800; cursor: pointer; padding: 6px 12px; border-radius: 30px; transition: all 0.2s; }
:global(.dark) .btn-action { background: rgba(255,255,255,0.05); }
.btn-action.edit { color: var(--primary, #2563eb); }
.btn-action.edit:hover { background: rgba(37, 99, 235, 0.1); transform: translateY(-2px); }
.btn-action.delete { color: var(--danger, #ef4444); }
.btn-action.delete:hover { background: rgba(239, 68, 68, 0.1); transform: translateY(-2px); }

.review-user-info { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.review-user-info img { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(37, 99, 235, 0.2); }
.u-meta strong { font-size: 1rem; display: block; color: var(--text-main, #0f172a); }
:global(.dark) .u-meta strong { color: #f8fafc; }
.you-tag { color: var(--primary, #2563eb); font-size: 0.75rem; font-weight: 800; margin-left: 6px; }
.user-stars { color: #f59e0b; font-size: 1rem; margin-top: 2px; }
.empty-star { color: #e2e8f0; }
:global(.dark) .empty-star { color: #334155; }
.review-date { color: var(--text-muted, #94a3b8); font-size: 0.8rem; margin-left: auto; font-weight: 500; }

.review-text { line-height: 1.6; margin-bottom: 16px; color: var(--text-main, #0f172a); font-size: 0.95rem; }
:global(.dark) .review-text { color: #e2e8f0; }

.pros-cons { font-size: 0.9rem; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
.pros, .cons { display: flex; align-items: flex-start; gap: 8px; color: var(--text-main, #0f172a); }
:global(.dark) .pros, :global(.dark) .cons { color: #cbd5e1; }
.pros b { color: var(--success, #10b981); font-size: 1.2rem; line-height: 1; }
.cons b { color: var(--danger, #ef4444); font-size: 1.2rem; line-height: 1; }

.review-gallery { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }
.gallery-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 12px; cursor: zoom-in; border: 1px solid var(--border-color, #e2e8f0); transition: all 0.2s; }
:global(.dark) .gallery-thumb { border-color: #334155; }
.gallery-thumb:hover { transform: scale(1.05); border-color: var(--primary, #2563eb); box-shadow: 0 4px 10px rgba(0,0,0,0.1); }

.no-reviews { padding: 40px; text-align: center; color: var(--text-muted, #64748b); font-weight: 600; font-size: 1.1rem; }

/* ЛОАДЕР */
.product-loader { text-align: center; padding: 100px; color: var(--text-muted, #64748b); }
.spinner { width: 60px; height: 60px; border: 4px solid var(--border-color, #e2e8f0); border-top-color: var(--primary, #2563eb); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
:global(.dark) .spinner { border-color: #334155; }

/* ФУЛЛСКРИН ПРОСМОТР ФОТО */
.fullscreen-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; cursor: zoom-out; animation: fadeIn 0.2s; }
.fullscreen-img { max-width: 90%; max-height: 90vh; border-radius: var(--radius-md, 12px); box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5); object-fit: contain; }
.fullscreen-close { position: absolute; top: 20px; right: 30px; background: none; border: none; color: white; font-size: 2.5rem; cursor: pointer; transition: transform 0.2s; }
.fullscreen-close:hover { transform: scale(1.1); color: var(--danger, #ef4444); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1200px) { .product-core-grid { grid-template-columns: 1fr 1fr; } }
@media (max-width: 992px) { .product-core-grid { grid-template-columns: 1fr; gap: 24px; } .product-buy-card { position: static; } }
@media (max-width: 768px) {
  .product-detail-page { padding: 24px 16px; }
  .product-main-title { font-size: 1.8rem; }
  .review-inputs-grid { grid-template-columns: 1fr; }
  .my-review-actions { position: static; justify-content: flex-end; margin-bottom: 16px; }
  .review-user-info { flex-wrap: wrap; }
  .review-date { margin-left: 0; }
}
</style>