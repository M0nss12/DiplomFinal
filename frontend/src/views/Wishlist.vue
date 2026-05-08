<template>
  <div class="wishlist-page">
    <div class="wishlist-container">
      <header class="wishlist-header">
        <div class="header-left">
          <h1>❤ Избранные товары</h1>
          <p class="region-info">Ваш город: <b>{{ appStore.city }}</b></p>
        </div>
        <router-link to="/profile" class="back-link">
          <span class="icon">←</span> Вернуться в кабинет
        </router-link>
      </header>

      <hr class="section-divider" />

      <!-- ЗАГРУЗКА -->
      <div v-if="loading" class="loading-state">
        <div class="loader"></div>
        <h2>Загрузка данных...</h2>
      </div>

      <!-- СПИСОК ТОВАРОВ -->
      <div v-else-if="products.length > 0" class="wishlist-grid">
        <div v-for="p in products" :key="p.id" class="product-card glass-card">
          
          <!-- Удаление -->
          <button @click="removeFromWishlist(p.wishlist_record_id)" class="btn-remove" title="Удалить из избранного">
            &times;
          </button>

          <router-link :to="'/product/' + p.id" class="card-content-link">
            <div class="image-wrapper">
              <!-- Адаптировано под массив изображений -->
              <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" :alt="p.name" class="product-img" />
            </div>
            
            <h3 class="product-name">{{ p.name }}</h3>
            
            <div class="price-box">
              <strong class="price-main">{{ p.discount_price || p.price }} ₽</strong>
              <s v-if="p.discount_price" class="price-old">{{ p.price }} ₽</s>
            </div>

            <!-- БЛОК НАЛИЧИЯ -->
            <div class="stock-status-box">
               <div v-if="getStockInCity(p) > 0" class="status-badge local">
                  ✅ В наличии: {{ getStockInCity(p) }} шт.
               </div>
               <div v-else-if="getTotalStock(p) > 0" class="status-badge intercity">
                  🚛 Доставка (Межгород)
               </div>
               <div v-else class="status-badge out">
                  ❌ Нет в наличии
               </div>
            </div>
          </router-link>

          <button @click="addToCart(p)" class="btn-add-to-cart" :disabled="getTotalStock(p) === 0">
            {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
          </button>
        </div>
      </div>

      <!-- ПУСТОЕ СОСТОЯНИЕ -->
      <div v-else class="empty-state glass-card">
        <div class="empty-icon">📂</div>
        <h2>В избранном пока пусто</h2>
        <p>Добавляйте товары, которые вам понравились, чтобы не потерять их.</p>
        <router-link to="/catalog">
          <button class="btn-primary">Перейти в каталог</button>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';
import { useCartStore } from '@/stores/cartStore';

const appStore = useAppStore();
const cartStore = useCartStore();

const products = ref([]); 
const loading = ref(true);

const loadWishlist = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) { loading.value = false; return; }

  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${userId}`);
    products.value = (res.data || []).map(row => {
        const p = row.products || row.product;
        return {
            ...p,
            wishlist_record_id: row.id 
        };
    }).filter(p => p.id);
  } catch (e) {
    console.error("Ошибка загрузки:", e);
  } finally {
    loading.value = false;
  }
};

const getStockInCity = (p) => {
    if (!p || !p.product_stocks || !appStore.city) return 0;
    const searchCity = appStore.city.trim().toLowerCase();
    
    return p.product_stocks.reduce((total, stockRecord) => {
        let wh = stockRecord.warehouses || stockRecord.warehouse;
        if (Array.isArray(wh)) wh = wh[0];
        
        // Поддержка новой связи БД (cities.name)
        const wCity = wh?.cities?.name || wh?.city_name;
        
        if (wCity && wCity.trim().toLowerCase() === searchCity) {
            return total + (Number(stockRecord.quantity) || 0);
        }
        return total;
    }, 0);
};

const getTotalStock = (p) => {
    if (!p || !p.product_stocks) return 0;
    return p.product_stocks.reduce((total, s) => total + (Number(s.quantity) || 0), 0);
};

const removeFromWishlist = async (wishlistId) => {
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${wishlistId}`);
    products.value = products.value.filter(p => p.wishlist_record_id !== wishlistId);
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    alert("Ошибка при удалении");
  }
};

const addToCart = (p) => {
  cartStore.addToCart(p);
  // alert("Товар добавлен в корзину!"); // Закомментировано, чтобы не мешать
};

onMounted(loadWishlist);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes spin { to { transform: rotate(360deg); } }

.wishlist-page { padding: 40px 0 80px; animation: fadeIn 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .wishlist-page { color: #f8fafc; }

.wishlist-container { max-width: 1400px; margin: 0 auto; padding: 0 24px; }

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: transform 0.3s, box-shadow 0.3s;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
.glass-card:hover { box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.1); transform: translateY(-4px); }
:global(.dark) .glass-card:hover { box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5); }

/* ШАПКА */
.wishlist-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
.header-left h1 {
  font-size: 2.4rem; font-weight: 800; margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.region-info { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; }
:global(.dark) .region-info { color: #94a3b8; }
.region-info b { color: var(--primary, #2563eb); font-weight: 700; }
:global(.dark) .region-info b { color: #60a5fa; }

.back-link {
  display: inline-flex; align-items: center; gap: 8px; font-weight: 700;
  color: var(--primary, #2563eb); text-decoration: none; transition: all 0.3s; padding: 8px 0;
}
:global(.dark) .back-link { color: #60a5fa; }
.back-link:hover { transform: translateX(-6px); text-decoration: underline; }

.section-divider { border: none; height: 1px; background: var(--border-color, #e2e8f0); margin: 20px 0 40px; }
:global(.dark) .section-divider { background: #334155; }

/* ГРИД КАРТОЧЕК */
.wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 32px; }

.product-card { padding: 24px; display: flex; flex-direction: column; position: relative; }

/* КНОПКА УДАЛЕНИЯ */
.btn-remove {
  position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%;
  background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); display: flex; align-items: center; justify-content: center;
  font-size: 20px; cursor: pointer; z-index: 10; border: 1px solid rgba(239, 68, 68, 0.2); transition: all 0.2s;
}
.btn-remove:hover { background: var(--danger, #ef4444); color: white; transform: rotate(90deg) scale(1.1); box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }

/* ССЫЛКА-КОНТЕНТ */
.card-content-link { text-decoration: none; color: inherit; flex: 1; display: flex; flex-direction: column; }

/* ИЗОБРАЖЕНИЕ */
.image-wrapper {
  height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
  background: #fff; border-radius: var(--radius-md, 12px); padding: 12px; border: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .image-wrapper { border-color: #334155; }
.product-img { max-width: 100%; max-height: 170px; object-fit: contain; transition: transform 0.4s; }
.product-card:hover .product-img { transform: scale(1.08); }

/* НАЗВАНИЕ */
.product-name {
  font-size: 1.05rem; font-weight: 700; line-height: 1.4; height: 2.8em; overflow: hidden;
  margin-bottom: 12px; color: var(--text-main, #0f172a); transition: color 0.2s;
}
:global(.dark) .product-name { color: #f8fafc; }
.card-content-link:hover .product-name { color: var(--primary, #2563eb); }

/* ЦЕНЫ */
.price-box { margin-bottom: 16px; display: flex; align-items: baseline; flex-wrap: wrap; gap: 8px; }
.price-main { font-size: 1.5rem; font-weight: 800; color: var(--danger, #ef4444); }
.price-old { color: var(--text-muted, #64748b); text-decoration: line-through; font-size: 0.95rem; font-weight: 600; }

/* СТАТУС НАЛИЧИЯ */
.stock-status-box { margin-bottom: 20px; margin-top: auto; }
.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 40px; font-size: 0.8rem; font-weight: 700; }
.status-badge.local { background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); border: 1px solid rgba(16, 185, 129, 0.2); }
.status-badge.intercity { background: rgba(245, 158, 11, 0.1); color: var(--warning, #f59e0b); border: 1px solid rgba(245, 158, 11, 0.2); }
.status-badge.out { background: rgba(0,0,0,0.05); color: var(--text-muted, #64748b); border: 1px solid var(--border-color, #e2e8f0); }
:global(.dark) .status-badge.out { background: rgba(255,255,255,0.05); border-color: #475569; color: #94a3b8; }

/* КНОПКА В КОРЗИНУ */
.btn-add-to-cart {
  width: 100%; padding: 14px; background: linear-gradient(135deg, var(--success, #10b981), #059669);
  color: white; border: none; border-radius: var(--radius-md, 8px); font-weight: 800; font-size: 0.95rem;
  cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}
.btn-add-to-cart:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4); }
.btn-add-to-cart:disabled { background: rgba(0,0,0,0.05); color: var(--text-muted, #94a3b8); cursor: not-allowed; box-shadow: none; transform: none; }
:global(.dark) .btn-add-to-cart:disabled { background: rgba(255,255,255,0.05); }

/* ПУСТОЕ СОСТОЯНИЕ */
.empty-state { text-align: center; padding: 80px 20px; max-width: 600px; margin: 40px auto; border: 2px dashed var(--border-color, #cbd5e1); }
:global(.dark) .empty-state { border-color: #475569; }
.empty-icon { font-size: 5rem; margin-bottom: 24px; opacity: 0.6; }
.empty-state h2 { font-size: 1.8rem; font-weight: 800; margin-bottom: 12px; color: var(--text-main, #0f172a); }
:global(.dark) .empty-state h2 { color: #f8fafc; }
.empty-state p { color: var(--text-muted, #64748b); margin-bottom: 32px; max-width: 400px; margin-left: auto; margin-right: auto; }

.btn-primary {
  display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  color: white; border-radius: 40px; font-weight: 800; font-size: 1rem; border: none; cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(37, 99, 235, 0.4); }

/* ЛОАДЕР */
.loading-state { text-align: center; padding: 100px 0; }
.loader { width: 60px; height: 60px; border: 4px solid var(--border-color, #e2e8f0); border-top-color: var(--primary, #2563eb); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 24px; }
:global(.dark) .loader { border-color: #334155; border-top-color: #3b82f6; }
.loading-state h2 { font-size: 1.3rem; color: var(--text-muted, #64748b); font-weight: 600; }

/* АДАПТИВНОСТЬ */
@media (max-width: 1024px) { .wishlist-grid { gap: 24px; } }
@media (max-width: 768px) {
  .wishlist-page { padding: 24px 0 60px; }
  .wishlist-container { padding: 0 16px; }
  .header-left h1 { font-size: 1.8rem; }
  .wishlist-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
  .product-card { padding: 20px; }
  .image-wrapper { height: 160px; }
  .product-img { max-height: 130px; }
  .price-main { font-size: 1.3rem; }
  .empty-state h2 { font-size: 1.4rem; }
}
@media (max-width: 480px) {
  .wishlist-grid { grid-template-columns: 1fr; }
  .wishlist-header { flex-direction: column; align-items: flex-start; }
  .back-link { margin-top: 8px; }
}
</style>