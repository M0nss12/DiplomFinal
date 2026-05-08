<template>
  <div class="cart-container">
    <h1>🛒 Ваша корзина</h1>

    <div v-if="cartStore.items.length > 0" class="cart-content">
      
      <!-- ТАБЛИЦА ТОВАРОВ -->
      <div class="cart-table-wrapper glass-card">
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
          <tbody>
            <tr v-for="item in cartStore.items" :key="item.id">
              <td class="col-product">
                <div class="product-info">
                  <div class="img-wrap">
                    <!-- Адаптировано: используем item.image вместо item.image_url -->
                    <img :src="item.image || '/assets/images/no-image.png'" :alt="item.name" loading="lazy" />
                  </div>
                  <div>
                    <strong class="product-name">{{ item.name }}</strong>
                    <small class="product-sku">Арт: {{ item.sku }}</small>
                  </div>
                </div>
              </td>

              <td class="col-price">
                <div v-if="item.discount_price" class="price-discount">
                  <span class="discount-tag">-{{ calculatePercent(item) }}%</span>
                  <strong class="new-price">{{ item.discount_price }} ₽</strong>
                  <s class="old-price">{{ item.price }} ₽</s>
                </div>
                <div v-else>
                  <strong class="regular-price">{{ item.price }} ₽</strong>
                </div>
              </td>

              <td class="col-qty">
                <div class="qty-control">
                  <button @click="cartStore.updateQuantity(item.id, -1)" class="qty-btn" aria-label="Уменьшить">-</button>
                  <span class="qty-value">{{ item.quantity }}</span>
                  <button @click="cartStore.updateQuantity(item.id, 1)" class="qty-btn" aria-label="Увеличить">+</button>
                </div>
                <div class="stock-info" :class="{ 'local': getSourcingInfo(item).includes(appStore.city) }">
                   {{ getSourcingInfo(item) }}
                </div>
              </td>

              <td class="col-total">
                <strong class="total-price">{{ (item.discount_price || item.price) * item.quantity }} ₽</strong>
              </td>

              <td class="col-action">
                <button @click="cartStore.removeFromCart(item.id)" class="remove-btn" title="Удалить">&times;</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- БЛОК ИТОГО -->
      <div class="cart-summary glass-card">
        <div class="summary-details">
          <h4>Состав заказа:</h4>
          <div class="summary-list">
            <div v-for="item in cartStore.items" :key="item.id" class="summary-item">
               <span class="s-name">{{ item.name }} <span class="s-qty">x{{ item.quantity }}</span></span>
               <span class="s-price">{{ (item.discount_price || item.price) * item.quantity }} ₽</span>
            </div>
          </div>
          <div class="total-weight">
            Общий вес: <b>{{ cartStore.totalWeight }} кг</b>
          </div>
        </div>

        <div class="summary-total">
          <div class="price-row">
            <span>Товары:</span> 
            <strong>{{ cartStore.totalPriceOriginal }} ₽</strong>
          </div>

          <div v-if="cartStore.totalDiscount > 0" class="price-row discount-row">
            <span>Скидка:</span>
            <strong>- {{ cartStore.totalDiscount }} ₽</strong>
          </div>

          <hr class="divider" />

          <div class="final-total">
             <span>Итого:</span>
             <h1 class="total-h1">{{ cartStore.totalPriceFinal }} ₽</h1>
          </div>
          
          <div class="summary-actions">
            <button @click="cartStore.clearCart()" class="btn-clear">Очистить</button>
            <router-link to="/checkout" class="btn-checkout">Оформить заказ</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- ПУСТАЯ КОРЗИНА -->
    <div v-else class="empty-cart glass-card">
      <div class="empty-icon">🛒</div>
      <h2>Ваша корзина пуста</h2>
      <p>Перейдите в каталог, чтобы найти нужные детали для вашего авто.</p>
      <router-link to="/catalog" class="btn-catalog">Перейти в каталог</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const cartStore = useCartStore();
const appStore = useAppStore();

const calculatePercent = (item) => {
    if (!item.discount_price) return 0;
    return Math.round(((item.price - item.discount_price) / item.price) * 100);
};

const isSameCity = (city1, city2) => {
    if (!city1 || !city2) return false;
    return city1.trim().toLowerCase() === city2.trim().toLowerCase();
};

const getSourcingInfo = (item) => {
    if (!item || !item.product_stocks) return "Наличие уточняется";
    
    // В новой БД связь идет: warehouses.cities.name, но мы оставили алиас city_name в старом варианте, 
    // поэтому проверяем и так, и так для надежности.
    const localStock = item.product_stocks
        .filter(s => {
            const wCity = s.warehouses?.cities?.name || s.warehouses?.city_name;
            return isSameCity(wCity, appStore.city);
        })
        .reduce((sum, s) => sum + s.quantity, 0);

    if (localStock >= item.quantity) {
        return `В г. ${appStore.city}`;
    } else {
        return "Межгород";
    }
};
</script>

<style scoped>
.cart-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  animation: fadeIn 0.4s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

h1 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 40px;
  color: var(--text-main, #0f172a);
  font-weight: 800;
}
:global(.dark) h1 { color: #f8fafc; }

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}
:global(.dark) .glass-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

/* ТАБЛИЦА */
.cart-table-wrapper {
  overflow: hidden;
  margin-bottom: 30px;
}

.cart-table {
  width: 100%;
  border-collapse: collapse;
}

.cart-table th {
  background: rgba(0,0,0,0.02);
  padding: 15px 20px;
  text-align: left;
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-muted, #64748b);
  text-transform: uppercase;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .cart-table th { background: rgba(255,255,255,0.02); border-color: #334155; color: #94a3b8; }

.cart-table td {
  padding: 20px;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  vertical-align: middle;
}
:global(.dark) .cart-table td { border-color: #334155; }
.cart-table tr:last-child td { border-bottom: none; }

/* Колонки */
.col-product { width: 45%; }
.col-price, .col-qty, .col-total { width: 15%; text-align: center; }
.col-action { width: 10%; text-align: center; }

/* Товар */
.product-info { display: flex; align-items: center; gap: 20px; }
.img-wrap {
  width: 80px; height: 80px; flex-shrink: 0; background: #fff;
  border-radius: var(--radius-md, 8px); border: 1px solid var(--border-color, #e2e8f0);
  display: flex; align-items: center; justify-content: center; padding: 5px;
}
:global(.dark) .img-wrap { border-color: #334155; }
.img-wrap img { max-width: 100%; max-height: 100%; object-fit: contain; }

.product-name { font-size: 1rem; color: var(--text-main, #0f172a); display: block; line-height: 1.3; margin-bottom: 5px; }
:global(.dark) .product-name { color: #f8fafc; }
.product-sku { color: var(--text-muted, #64748b); font-size: 0.85rem; }

/* Цена */
.price-discount { display: flex; flex-direction: column; align-items: center; }
.discount-tag {
  background: var(--danger, #ef4444); color: white; font-size: 0.75rem;
  padding: 2px 6px; border-radius: 4px; font-weight: 700; margin-bottom: 4px;
}
.new-price { color: var(--danger, #ef4444); font-size: 1.1rem; font-weight: 700; }
.old-price { text-decoration: line-through; color: var(--text-muted, #64748b); font-size: 0.9rem; }
.regular-price { font-size: 1.1rem; color: var(--text-main, #0f172a); font-weight: 700; }
:global(.dark) .regular-price { color: #f8fafc; }

/* Количество */
.qty-control {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  background: rgba(0,0,0,0.03); padding: 5px; border-radius: var(--radius-sm, 8px);
  width: fit-content; margin: 0 auto;
}
:global(.dark) .qty-control { background: rgba(255,255,255,0.05); }

.qty-btn {
  width: 28px; height: 28px; background: var(--bg-card, #fff); border: 1px solid var(--border-color, #cbd5e1);
  border-radius: 6px; cursor: pointer; font-weight: 700; color: var(--text-main, #0f172a); transition: all 0.2s;
}
:global(.dark) .qty-btn { background: #1e293b; border-color: #475569; color: #f8fafc; }
.qty-btn:hover { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); }
.qty-value { font-weight: 700; min-width: 20px; text-align: center; color: var(--text-main, #0f172a); }
:global(.dark) .qty-value { color: #f8fafc; }

.stock-info { margin-top: 8px; font-size: 0.75rem; color: #f59e0b; font-weight: 600; }
.stock-info.local { color: var(--success, #10b981); }

/* Итого в строке */
.total-price { font-size: 1.2rem; font-weight: 700; color: var(--text-main, #0f172a); }
:global(.dark) .total-price { color: #f8fafc; }

/* Удалить */
.remove-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted, #94a3b8); cursor: pointer; transition: color 0.2s; padding: 5px; }
.remove-btn:hover { color: var(--danger, #ef4444); }

/* СВОДКА (SUMMARY) */
.cart-summary {
  display: flex; gap: 30px; padding: 30px;
}
.summary-details { flex: 1; padding-right: 30px; border-right: 1px dashed var(--border-color, #cbd5e1); }
:global(.dark) .summary-details { border-color: #475569; }

.summary-details h4 { margin: 0 0 15px 0; color: var(--text-muted, #64748b); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; }
.summary-list { max-height: 200px; overflow-y: auto; padding-right: 10px; }
.summary-list::-webkit-scrollbar { width: 4px; }
.summary-list::-webkit-scrollbar-thumb { background: var(--border-color, #cbd5e1); border-radius: 4px; }
:global(.dark) .summary-list::-webkit-scrollbar-thumb { background: #475569; }

.summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem; color: var(--text-main, #0f172a); }
:global(.dark) .summary-item { color: #e2e8f0; }
.s-qty { color: var(--text-muted, #64748b); margin-left: 5px; }

.total-weight { margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--border-color, #cbd5e1); color: var(--text-muted, #64748b); font-size: 0.9rem; }
:global(.dark) .total-weight { border-color: #475569; }

.summary-total { width: 350px; display: flex; flex-direction: column; }
.price-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 1.1rem; color: var(--text-main, #0f172a); }
:global(.dark) .price-row { color: #f8fafc; }
.discount-row { color: var(--danger, #ef4444); }

.divider { border: none; border-top: 1px solid var(--border-color, #cbd5e1); margin: 15px 0; }
:global(.dark) .divider { border-color: #475569; }

.final-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.final-total span { font-size: 1.2rem; font-weight: 700; color: var(--text-muted, #64748b); }
.total-h1 { margin: 0; font-size: 2.2rem; color: var(--success, #10b981); }

.summary-actions { display: flex; gap: 15px; margin-top: auto; }
.btn-clear {
  padding: 14px 20px; background: rgba(0,0,0,0.05); color: var(--text-muted, #64748b);
  border-radius: var(--radius-md, 8px); font-weight: 600; border: none; cursor: pointer; transition: all 0.2s;
}
:global(.dark) .btn-clear { background: rgba(255,255,255,0.05); color: #94a3b8; }
.btn-clear:hover { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }

.btn-checkout {
  flex: 1; text-align: center; padding: 14px; background: var(--success, #10b981); color: white;
  border-radius: var(--radius-md, 8px); font-weight: 700; text-decoration: none; font-size: 1.1rem;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); transition: all 0.2s;
}
.btn-checkout:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4); }

/* ПУСТАЯ КОРЗИНА */
.empty-cart { text-align: center; padding: 80px 20px; border: 2px dashed var(--border-color, #cbd5e1); }
:global(.dark) .empty-cart { border-color: #475569; }
.empty-icon { font-size: 4rem; margin-bottom: 20px; }
.empty-cart h2 { margin-bottom: 10px; color: var(--text-main, #0f172a); }
:global(.dark) .empty-cart h2 { color: #f8fafc; }
.empty-cart p { color: var(--text-muted, #64748b); margin-bottom: 30px; }

.btn-catalog {
  display: inline-block; padding: 12px 30px; background: var(--primary, #2563eb); color: white;
  border-radius: var(--radius-md, 8px); text-decoration: none; font-weight: 700; transition: all 0.2s;
}
.btn-catalog:hover { background: #1d4ed8; transform: translateY(-2px); }

/* АДАПТИВНОСТЬ */
@media (max-width: 900px) {
  .cart-summary { flex-direction: column; }
  .summary-details { border-right: none; border-bottom: 1px dashed var(--border-color, #cbd5e1); padding-right: 0; padding-bottom: 20px; }
  .summary-total { width: 100%; }
}

@media (max-width: 768px) {
  /* Мобильная таблица (превращение в карточки) */
  .cart-table thead { display: none; }
  .cart-table tbody tr {
    display: flex; flex-direction: column; border: 1px solid var(--border-color, #e2e8f0);
    border-radius: var(--radius-md, 12px); padding: 15px; margin-bottom: 20px; position: relative;
    background: rgba(0,0,0,0.02);
  }
  :global(.dark) .cart-table tbody tr { background: rgba(255,255,255,0.02); border-color: #334155; }

  .cart-table td { padding: 10px 0; border: none; width: 100%; text-align: left; }
  .col-product { padding-bottom: 15px !important; border-bottom: 1px solid var(--border-color, #e2e8f0) !important; }
  :global(.dark) .col-product { border-color: #334155 !important; }

  .col-price, .col-qty, .col-total { display: flex; justify-content: space-between; align-items: center; }

  /* Добавляем заголовки для мобильной версии через CSS */
  .col-price::before { content: 'Цена:'; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 600; }
  .col-qty::before { content: 'Количество:'; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 600; }
  .col-total::before { content: 'Итого:'; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 600; }

  .col-action { position: absolute; top: 10px; right: 10px; width: auto; padding: 0; }

  .qty-control { margin: 0; }
  .price-discount { align-items: flex-end; }
  .img-wrap { width: 60px; height: 60px; }
  
  .summary-actions { flex-direction: column-reverse; }
  .btn-clear { width: 100%; }
}
</style>