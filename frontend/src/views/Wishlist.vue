<template>
  <div class="wishlist-page animate-fade-in">
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

      <hr class="divider" />

      <!-- ЗАГРУЗКА -->
      <div v-if="loading" class="text-center py-20">
        <span class="spinner" style="width: 60px; height: 60px; border-width: 4px;"></span>
        <h2 class="text-muted mt-3">Загрузка данных...</h2>
      </div>

      <!-- СПИСОК ТОВАРОВ -->
      <div v-else-if="products.length > 0" class="wishlist-grid">
        <div v-for="p in products" :key="p.wishlist_record_id" class="product-card glass-card">
          
          <!-- Удаление -->
          <button 
            @click="removeFromWishlist(p)" 
            class="btn-remove" 
            title="Удалить из избранного"
            :disabled="p.removing"
          >
            <span v-if="p.removing" class="spinner" style="width: 14px; height: 14px; border-width: 2px;"></span>
            <span v-else>&times;</span>
          </button>

          <!-- Товар существует -->
          <template v-if="p.id">
            <router-link :to="'/product/' + p.id" class="card-content-link">
              <div class="image-wrapper">
                <img :src="p.images && p.images.length > 0 ? p.images[0] : '/assets/images/no-image.png'" :alt="p.name" class="product-img" />
              </div>
              <h3 class="product-name">{{ p.name }}</h3>
              <div class="price-box">
                <strong class="price-main">{{ p.discount_price || p.price }} ₽</strong>
                <s v-if="p.discount_price" class="price-old">{{ p.price }} ₽</s>
              </div>
              <div class="stock-status-box">
                 <div v-if="getStockInCity(p) > 0" class="badge badge-success">
                    ✅ В наличии: {{ getStockInCity(p) }} шт.
                 </div>
                 <div v-else-if="getTotalStock(p) > 0" class="badge badge-warning">
                    🚛 Доставка (Межгород)
                 </div>
                 <div v-else class="badge">
                    ❌ Нет в наличии
                 </div>
              </div>
            </router-link>

            <button @click="addToCart(p)" class="btn btn-success btn-block add-to-cart-btn" :disabled="getTotalStock(p) === 0">
              {{ getTotalStock(p) > 0 ? 'В корзину' : 'Нет в наличии' }}
            </button>
          </template>

          <!-- Товар удалён из каталога -->
          <div v-else class="deleted-product">
            <div class="deleted-icon">🗑️</div>
            <p>Товар больше не доступен</p>
          </div>
        </div>
      </div>

      <!-- ПУСТОЕ СОСТОЯНИЕ -->
      <div v-else class="empty-state glass-card">
        <div class="empty-state-icon">📂</div>
        <h2>В избранном пока пусто</h2>
        <p>Добавляйте товары, которые вам понравились, чтобы не потерять их.</p>
        <router-link to="/catalog" class="btn btn-primary">Перейти в каталог</router-link>
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
        const p = row.products;
        if (!p) return { wishlist_record_id: row.id, removing: false };
        return {
            ...p,
            wishlist_record_id: row.id,
            removing: false
        };
    });
  } catch (e) {
    console.error("Ошибка загрузки:", e);
  } finally {
    loading.value = false;
  }
};

const getStockInCity = (p) => {
    if (!p || !p.product_stocks || !appStore.city) return 0;
    const searchCity = appStore.city.trim().toLowerCase();
    return p.product_stocks.reduce((total, stock) => {
        const wh = stock.warehouses;
        if (!wh) return total;
        const wCity = wh.cities?.name || wh.city_name || '';
        if (wCity.trim().toLowerCase() === searchCity) {
            return total + (Number(stock.quantity) || 0);
        }
        return total;
    }, 0);
};

const getTotalStock = (p) => {
    if (!p || !p.product_stocks) return 0;
    return p.product_stocks.reduce((total, s) => total + (Number(s.quantity) || 0), 0);
};

const removeFromWishlist = async (product) => {
  const userId = localStorage.getItem('user_id');
  if (!userId || !product.id) return;
  
  product.removing = true;
  try {
    await axios.delete(`${import.meta.env.VITE_API_URL || ''}/api/wishlist/${userId}/${product.id}`);
    products.value = products.value.filter(p => p.wishlist_record_id !== product.wishlist_record_id);
    window.dispatchEvent(new Event('wishlist-updated'));
  } catch (e) {
    alert("Ошибка при удалении");
    product.removing = false;
  }
};

const addToCart = (p) => {
  cartStore.addToCart(p);
};

onMounted(loadWishlist);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ ИЗБРАННОГО (глобальный CSS используется)
   ========================================================================== */

.wishlist-page {
  padding: 40px 0 80px;
}

.wishlist-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
}

.wishlist-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 24px;
}
.header-left h1 {
  font-size: 2.4rem;
  font-weight: 800;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.region-info {
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
}
.region-info b {
  color: var(--primary);
  font-weight: 700;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  transition: transform 0.2s;
  padding: 8px 0;
}
.back-link:hover {
  transform: translateX(-6px);
  text-decoration: underline;
}

/* Сетка избранного */
.wishlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 32px;
}

/* Карточка товара */
.product-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Кнопка удаления */
.btn-remove {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  z-index: 10;
  border: 1px solid rgba(239, 68, 68, 0.2);
  transition: all 0.2s;
}
.btn-remove:hover:not(:disabled) {
  background: var(--danger);
  color: white;
  transform: rotate(90deg) scale(1.1);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
}
.btn-remove:disabled {
  opacity: 0.7;
  cursor: wait;
}

.card-content-link {
  text-decoration: none;
  color: inherit;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.image-wrapper {
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  background: #fff;
  border-radius: var(--radius-md);
  padding: 12px;
  border: 1px solid var(--border-color);
}
:global(.dark) .image-wrapper {
  border-color: #334155;
}
.product-img {
  max-width: 100%;
  max-height: 170px;
  object-fit: contain;
  transition: transform 0.4s;
}
.product-card:hover .product-img {
  transform: scale(1.08);
}

.product-name {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.4;
  height: 2.8em;
  overflow: hidden;
  margin-bottom: 12px;
  color: var(--text-main);
  transition: color 0.2s;
}
.card-content-link:hover .product-name {
  color: var(--primary);
}

.price-box {
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.price-main {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--danger);
}
.price-old {
  color: var(--text-muted);
  text-decoration: line-through;
  font-size: 0.95rem;
  font-weight: 600;
}

.stock-status-box {
  margin-bottom: 20px;
  margin-top: auto;
}

/* Кнопка "В корзину" с градиентом */
.add-to-cart-btn {
  background: linear-gradient(135deg, var(--success), #059669);
  border: none;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.add-to-cart-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.4);
}
.add-to-cart-btn:disabled {
  background: rgba(0,0,0,0.05);
  color: var(--text-muted);
  box-shadow: none;
}
:global(.dark) .add-to-cart-btn:disabled {
  background: rgba(255,255,255,0.05);
}

/* Товар удалён */
.deleted-product {
  text-align: center;
  padding: 30px 0;
  color: var(--text-muted);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.deleted-icon {
  font-size: 3rem;
  margin-bottom: 10px;
  opacity: 0.5;
}
.deleted-product p {
  font-weight: 600;
  color: var(--text-muted);
}

/* Адаптивность */
@media (max-width: 1024px) {
  .wishlist-grid {
    gap: 24px;
  }
}
@media (max-width: 768px) {
  .wishlist-page {
    padding: 24px 0 60px;
  }
  .wishlist-container {
    padding: 0 16px;
  }
  .header-left h1 {
    font-size: 1.8rem;
  }
  .wishlist-grid {
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 20px;
  }
  .product-card {
    padding: 20px;
  }
  .image-wrapper {
    height: 160px;
  }
  .product-img {
    max-height: 130px;
  }
  .price-main {
    font-size: 1.3rem;
  }
  .empty-state h2 {
    font-size: 1.4rem;
  }
}
@media (max-width: 480px) {
  .wishlist-grid {
    grid-template-columns: 1fr;
  }
  .wishlist-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .back-link {
    margin-top: 8px;
  }
}
</style>