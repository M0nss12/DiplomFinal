<template>
  <div class="cart-page animate-fade-in">
    <h1 class="text-center mb-3">🛒 Ваша корзина</h1>

    <!-- НЕПУСТАЯ КОРЗИНА -->
    <div v-if="cartStore.items.length > 0" class="cart-content">
      <!-- Таблица товаров (используем глобальный класс .cart-table) -->
      <div class="glass-card cart-table-wrapper">
        <table class="cart-table">
          <thead>
            <tr>
              <th class="col-product">ТОВАР</th>
              <th class="col-price">ЦЕНА</th>
              <th class="col-qty">КОЛИЧЕСТВО</th>
              <th class="col-total">ИТОГО</th>
              <th class="col-action"></th>
            </tr>
          </thead>
          <transition-group name="row" tag="tbody">
            <tr v-for="item in cartStore.items" :key="item.id">
              <!-- Товар -->
              <td class="col-product" data-label="Товар">
                <div class="product-info">
                  <div class="img-wrap">
                    <img :src="getImageUrl(item)" :alt="item.name" loading="lazy" />
                  </div>
                  <div>
                    <strong class="product-name">{{ item.name }}</strong>
                    <small class="product-sku text-muted">Арт: {{ item.sku }}</small>
                    <div class="weight-hint text-muted">⚖️ {{ (item.weight_kg || 0) * (item.quantity || 1) }} кг</div>
                  </div>
                </div>
              </td>

              <!-- Цена -->
              <td class="col-price" data-label="Цена">
                <div v-if="item.discount_price" class="price-discount">
                  <span class="badge badge-danger">-{{ calculatePercent(item) }}%</span>
                  <strong class="new-price text-danger">{{ item.discount_price }} ₽</strong>
                  <s class="old-price text-muted">{{ item.price }} ₽</s>
                </div>
                <div v-else>
                  <strong class="regular-price">{{ item.price }} ₽</strong>
                </div>
              </td>

              <!-- Количество -->
              <td class="col-qty" data-label="Количество">
                <div class="qty-control">
                  <button @click="updateQuantity(item, -1)" class="qty-btn" aria-label="Уменьшить">-</button>
                  <span class="qty-value">{{ item.quantity }}</span>
                  <button @click="updateQuantity(item, 1)" class="qty-btn" aria-label="Увеличить">+</button>
                </div>
                <div class="stock-info" :class="{ 'text-success': isLocalAvailable(item), 'text-warning': !isLocalAvailable(item) }">
                  {{ isLocalAvailable(item) ? '✅ В городе (' + appStore.city + ')' : '🚚 Межгород' }}
                </div>
                <div v-if="item.stock_quantity != null" class="max-hint text-muted text-xs">
                  Доступно: {{ item.stock_quantity }} шт.
                </div>
              </td>

              <!-- Итого -->
              <td class="col-total" data-label="Итого">
                <strong class="total-price">{{ lineTotal(item) }} ₽</strong>
              </td>

              <!-- Удалить -->
              <td class="col-action">
                <button @click="cartStore.removeFromCart(item.id)" class="remove-btn" title="Удалить">&times;</button>
              </td>
            </tr>
          </transition-group>
        </table>
      </div>

      <!-- Итоговый блок -->
      <div class="cart-summary glass-card">
        <div class="summary-details">
          <h4 class="text-muted">Состав заказа:</h4>
          <div class="summary-list">
            <div v-for="item in cartStore.items" :key="item.id" class="summary-item flex justify-between">
              <span class="s-name">{{ item.name }} <span class="s-qty text-muted">x{{ item.quantity }}</span></span>
              <span class="s-price font-bold">{{ lineTotal(item) }} ₽</span>
            </div>
          </div>
          <div class="total-weight mt-2 pt-2" style="border-top: 1px solid var(--border-color)">
            Общий вес: <b>{{ totalWeight }} кг</b>
          </div>
        </div>

        <div class="summary-total">
          <div class="price-row flex justify-between">
            <span>Товары (без скидки):</span> 
            <strong>{{ totalOriginal }} ₽</strong>
          </div>

          <transition name="discount-fade">
            <div v-if="totalDiscount > 0" class="price-row discount-row flex justify-between text-danger">
              <span>Скидка:</span>
              <strong>- {{ totalDiscount }} ₽</strong>
            </div>
          </transition>

          <hr class="divider" />

          <div class="final-total flex justify-between items-center">
            <span>Итого к оплате:</span>
            <h1 class="total-h1 text-success m-0">{{ totalFinal }} ₽</h1>
          </div>

          <div class="summary-actions flex gap-2">
            <button @click="cartStore.clearCart()" class="btn btn-outline flex-1">Очистить</button>
            <router-link to="/checkout" class="btn btn-success btn-lg flex-1 text-center">Оформить заказ</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- ПУСТАЯ КОРЗИНА -->
    <div v-else class="empty-cart glass-card text-center p-5">
      <div class="empty-icon text-4xl mb-2">🛒</div>
      <h2 class="mb-1">Ваша корзина пуста</h2>
      <p class="text-muted mb-3">Перейдите в каталог, чтобы найти нужные детали для вашего авто.</p>
      <router-link to="/catalog" class="btn btn-primary btn-lg">Перейти в каталог</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const cartStore = useCartStore();
const appStore = useAppStore();

const getImageUrl = (item) => {
  if (item.images && Array.isArray(item.images) && item.images.length > 0) return item.images[0];
  if (item.image) return item.image;
  return '/assets/images/no-image.png';
};

const calculatePercent = (item) => {
  if (!item.discount_price) return 0;
  return Math.round(((item.price - item.discount_price) / item.price) * 100);
};

const lineTotal = (item) => ((item.discount_price || item.price) * (item.quantity || 1)).toFixed(2);

const totalOriginal = computed(() =>
  cartStore.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0).toFixed(2)
);

const totalDiscount = computed(() =>
  cartStore.items.reduce((sum, item) => {
    if (item.discount_price && item.price > item.discount_price)
      return sum + (item.price - item.discount_price) * (item.quantity || 1);
    return sum;
  }, 0).toFixed(2)
);

const totalFinal = computed(() =>
  cartStore.items.reduce((sum, item) => sum + (item.discount_price || item.price) * (item.quantity || 1), 0).toFixed(2)
);

const totalWeight = computed(() =>
  cartStore.items.reduce((sum, item) => sum + (item.weight_kg || 0) * (item.quantity || 1), 0).toFixed(1)
);

const isSameCity = (city1, city2) => {
  if (!city1 || !city2) return false;
  return city1.trim().toLowerCase() === city2.trim().toLowerCase();
};

const isLocalAvailable = (item) => {
  if (!item.product_stocks || !appStore.city) return false;
  return item.product_stocks.some(s => {
    const wCity = s.warehouses?.cities?.name || s.warehouses?.city_name;
    return isSameCity(wCity, appStore.city);
  });
};

const updateQuantity = (item, delta) => {
  const currentQty = item.quantity || 1;
  const newQty = currentQty + delta;
  if (newQty < 1) return;
  if (delta > 0 && item.stock_quantity != null && newQty > item.stock_quantity) {
    alert(`Нельзя добавить больше ${item.stock_quantity} шт. (столько всего в наличии).`);
    return;
  }
  cartStore.updateQuantity(item.id, delta);
};
</script>

<style scoped>
/* Только уникальные стили, отсутствующие в глобальном CSS */
.cart-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* Обёртка таблицы (просто чтобы не терять стекломорфизм) */
.cart-table-wrapper {
  overflow: hidden; /* для скругления углов у глобальной .cart-table */
  margin-bottom: 24px;
}

/* Колонки (ширины) */
.col-product { width: 45%; }
.col-price, .col-qty, .col-total { width: 15%; text-align: center; }
.col-action { width: 10%; text-align: center; }

/* Товар */
.product-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.img-wrap {
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  background: #fff;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5px;
}
:global(.dark) .img-wrap {
  background: #0f172a;
  border-color: #334155;
}
.img-wrap img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.product-name {
  font-size: 1rem;
  color: var(--text-main);
  display: block;
  line-height: 1.3;
  margin-bottom: 5px;
}
:global(.dark) .product-name {
  color: #f8fafc;
}
.product-sku {
  font-size: 0.85rem;
}
.weight-hint {
  font-size: 0.8rem;
  margin-top: 4px;
}

/* Цены */
.price-discount {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.new-price {
  font-size: 1.1rem;
  font-weight: 700;
}
.old-price {
  text-decoration: line-through;
  font-size: 0.9rem;
}
.regular-price {
  font-size: 1.1rem;
  color: var(--text-main);
  font-weight: 700;
}
:global(.dark) .regular-price {
  color: #f8fafc;
}

/* Количество */
.qty-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(0,0,0,0.03);
  padding: 5px;
  border-radius: var(--radius-sm);
  width: fit-content;
  margin: 0 auto;
}
:global(.dark) .qty-control {
  background: rgba(255,255,255,0.05);
}

.qty-btn {
  width: 28px;
  height: 28px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  color: var(--text-main);
  transition: border-color 0.2s, color 0.2s;
}
:global(.dark) .qty-btn {
  background: #1e293b;
  border-color: #475569;
  color: #f8fafc;
}
.qty-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.qty-value {
  font-weight: 700;
  min-width: 20px;
  text-align: center;
  color: var(--text-main);
}
:global(.dark) .qty-value {
  color: #f8fafc;
}

.stock-info {
  margin-top: 8px;
  font-size: 0.75rem;
  font-weight: 600;
}
.max-hint {
  margin-top: 4px;
}

/* Итого в строке */
.total-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
}
:global(.dark) .total-price {
  color: #f8fafc;
}

/* Кнопка удаления */
.remove-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  padding: 5px;
}
.remove-btn:hover {
  color: var(--danger);
}

/* Итоговый блок */
.cart-summary {
  display: flex;
  gap: 30px;
  padding: 30px;
}
.summary-details {
  flex: 1;
  padding-right: 30px;
  border-right: 1px dashed var(--border-color);
}
:global(.dark) .summary-details {
  border-color: #475569;
}
.summary-details h4 {
  margin: 0 0 15px 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.summary-list {
  max-height: 200px;
  overflow-y: auto;
  padding-right: 10px;
}
.summary-list::-webkit-scrollbar { width: 4px; }
.summary-list::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
:global(.dark) .summary-list::-webkit-scrollbar-thumb { background: #475569; }

.summary-item {
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--text-main);
}
.s-qty {
  margin-left: 5px;
}

.summary-total {
  width: 350px;
  display: flex;
  flex-direction: column;
}
.price-row {
  margin-bottom: 10px;
  font-size: 1.1rem;
  color: var(--text-main);
}
.discount-row {
  color: var(--danger);
}

/* Анимация скидки */
.discount-fade-enter-active,
.discount-fade-leave-active {
  transition: all 0.3s ease;
}
.discount-fade-enter-from,
.discount-fade-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
}

.final-total {
  margin-bottom: 25px;
}
.total-h1 {
  font-size: 2.2rem;
}

/* Пустая корзина */
.empty-cart {
  border: 2px dashed var(--border-color);
}

/* Анимация удаления строки */
.row-leave-active {
  transition: all 0.3s ease;
  opacity: 0;
  transform: translateX(-20px);
}

/* Адаптив */
@media (max-width: 900px) {
  .cart-summary {
    flex-direction: column;
  }
  .summary-details {
    border-right: none;
    border-bottom: 1px dashed var(--border-color);
    padding-right: 0;
    padding-bottom: 20px;
  }
  .summary-total {
    width: 100%;
  }
}

@media (max-width: 768px) {
  /* Глобальные стили .cart-table уже содержат блочное отображение для tr/td.
     Добавим лишь точечные доработки под наш дизайн */
  .cart-table td.col-product {
    padding-bottom: 15px !important;
    border-bottom: 1px solid var(--border-color) !important;
  }
  :global(.dark) .cart-table td.col-product {
    border-color: #334155 !important;
  }
  .col-action {
    position: absolute;
    top: 10px;
    right: 10px;
    width: auto;
    padding: 0;
  }
  .qty-control {
    margin: 0;
  }
  .price-discount {
    align-items: flex-end;
  }
  .img-wrap {
    width: 60px;
    height: 60px;
  }
  .summary-actions {
    flex-direction: column-reverse;
  }
}
</style>