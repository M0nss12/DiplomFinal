<template>
  <div class="checkout-page">
    <h1 class="page-title">Оформление заказа</h1>

    <!-- СОСТОЯНИЕ ПУСТОЙ КОРЗИНЫ -->
    <div v-if="cartStore.items.length === 0" class="empty-cart-state glass-card">
      <div class="empty-icon">🛒</div>
      <h2>Ваша корзина пуста</h2>
      <router-link to="/catalog">
        <button class="btn-primary">В каталог</button>
      </router-link>
    </div>

    <div v-else class="checkout-layout">
      
      <div class="checkout-main">
        <!-- 1. КОНТАКТЫ И ГОРОД -->
        <section class="checkout-section glass-card">
          <h3><span class="section-icon">👤</span> Контактные данные</h3>
          
          <!-- ВЫБОР ГОРОДА -->
          <div class="input-group full-width-group">
             <label>📍 Ваш Город (населенный пункт) *</label>
             <div class="city-input-wrap">
               <input 
                 v-model="checkoutCity" 
                 @blur="updateGlobalCity"
                 @keyup.enter="updateGlobalCity"
                 placeholder="Введите ваш город для обновления списка ПВЗ..." 
               />
               <span class="city-hint">Нажмите Enter или кликните вне поля для обновления</span>
             </div>
          </div>

          <div class="form-grid">
            <div class="input-group">
              <label>Имя и Фамилия *</label>
              <input v-model="form.name" placeholder="Иван Иванов" required />
            </div>
            <div class="input-group">
              <label>Телефон *</label>
              <input v-model="form.phone" type="tel" placeholder="+7 (999) 000-00-00" required />
            </div>
            <div class="input-group">
              <label>Email *</label>
              <input v-model="form.email" type="email" placeholder="mail@example.com" required />
            </div>
          </div>
        </section>

        <!-- 2. ПВЗ -->
        <section class="checkout-section glass-card">
          <h3><span class="section-icon">📍</span> Пункт выдачи в г. {{ appStore.city }}</h3>
          
          <div v-if="localWarehouses.length > 0">
            <select v-model="selectedWarehouseId" class="warehouse-select">
              <option :value="null">-- Выберите адрес --</option>
              <option v-for="w in localWarehouses" :key="w.id" :value="w.id">
                {{ w.address }}
              </option>
            </select>
          </div>
          <div v-else class="no-warehouses-alert">
            <p>В г. <b>{{ appStore.city }}</b> нет доступных ПВЗ. Пожалуйста, укажите другой город.</p>
          </div>
        </section>

        <!-- 3. СПОСОБ ОПЛАТЫ -->
        <section class="checkout-section glass-card">
          <h3><span class="section-icon">💳</span> Способ оплаты</h3>
          <div class="payment-methods-grid">
            <label v-for="m in paymentMethods" :key="m.id" 
                   class="payment-method-card"
                   :class="{ active: form.payment_method === m.id }">
              <input type="radio" :value="m.id" v-model="form.payment_method" />
              <div class="method-icon">{{ m.icon }}</div>
              <strong>{{ m.label }}</strong>
              <small v-if="m.id === 'card'" class="method-hint">Тестовый шлюз</small>
            </label>
          </div>
        </section>

        <!-- КНОПКИ ДЕЙСТВИЯ -->
        <div class="action-footer">
          <button @click="cancelOrder" class="btn-cancel">ОТМЕНИТЬ</button>
          <button @click="handleOrderProcess" 
                  :disabled="loading || !selectedWarehouseId || !form.name || !form.phone" 
                  class="btn-submit"
                  :style="{ opacity: (loading || !selectedWarehouseId || !form.name || !form.phone) ? 0.5 : 1 }">
            <span v-if="loading" class="spinner-inline">⏳</span>
            {{ loading ? 'ОБРАБОТКА...' : (form.payment_method === 'card' ? '✔ ПЕРЕЙТИ К ОПЛАТЕ' : '✔ ПОДТВЕРДИТЬ ЗАКАЗ') }}
          </button>
        </div>
      </div>

      <!-- ПРАВАЯ ПАНЕЛЬ: ИТОГО -->
      <aside class="checkout-sidebar">
        <div class="summary-card glass-card">
          <h3>Ваш заказ</h3>
          <div class="summary-items">
            <div v-for="item in cartStore.items" :key="item?.id" class="summary-item">
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <small>{{ item.quantity }} шт. × {{ item.discount_price || item.price }} ₽</small>
              </div>
              <span class="item-total-price">{{ (item.discount_price || item.price) * item.quantity }} ₽</span>
            </div>
          </div>

          <div class="summary-totals">
            <div class="total-row">
              <span>Сумма товаров:</span>
              <span>{{ cartStore.totalPriceFinal }} ₽</span>
            </div>

            <!-- ДЕТАЛИЗАЦИЯ ДОСТАВКИ -->
            <div class="delivery-breakdown">
              <div class="total-row delivery-title">
                <span>Доставка:</span>
                <span :class="{ free: shippingBreakdown.cost === 0 }">
                  {{ shippingBreakdown.cost === 0 ? 'Бесплатно' : shippingBreakdown.cost + ' ₽' }}
                </span>
              </div>

              <!-- Если есть Межгород -->
              <div v-if="shippingBreakdown.intercityItems.length > 0" class="intercity-alert">
                <div class="alert-title">📦 Межгород (доставка со складов других регионов):</div>
                <ul class="intercity-list">
                  <li v-for="i in shippingBreakdown.intercityItems" :key="i.id">
                    {{ i.name }} — <b>{{ i.qty }} шт.</b>
                  </li>
                </ul>
              </div>

              <!-- Предупреждение о весе -->
              <div v-if="shippingBreakdown.weightSurcharge > 0" class="weight-alert">
                <span>⚖️ Общий вес межгорода: <b>{{ shippingBreakdown.intercityWeight.toFixed(1) }} кг</b></span>
                <span class="surcharge">+{{ shippingBreakdown.weightSurcharge }} ₽ (перевес)</span>
              </div>
            </div>

            <div class="final-price">
              <span>Итого:</span>
              <span class="price-val">{{ cartStore.totalPriceFinal + shippingBreakdown.cost }} ₽</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const cartStore = useCartStore();
const appStore = useAppStore();

const loading = ref(false);
const warehouses = ref([]);
const selectedWarehouseId = ref(null);

const checkoutCity = ref('');
const form = ref({ name: '', phone: '', email: '', payment_method: 'card' });

const paymentMethods = [
  { id: 'card', label: 'Оплата онлайн', icon: '💳' },
  { id: 'cash', label: 'При получении', icon: '📦' }
];

const isSameCity = (c1, c2) => c1?.trim().toLowerCase() === c2?.trim().toLowerCase();

const updateGlobalCity = async () => {
    if (!checkoutCity.value.trim()) return;
    
    const newCity = checkoutCity.value.trim();
    appStore.setCity(newCity);
    
    const uid = localStorage.getItem('user_id');
    if (uid) {
        try {
            await axios.put(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${uid}`, { city: newCity });
        } catch (e) { console.error("Ошибка сохранения города", e); }
    }
    selectedWarehouseId.value = null;
};

// Фильтрация ПВЗ по городу (Новая структура БД: warehouses.cities.name)
const localWarehouses = computed(() => {
    return warehouses.value.filter(w => {
        const wCity = w.cities?.name || w.city_name; // Поддержка обоих вариантов
        return isSameCity(wCity, appStore.city) && w.is_pickup_point;
    });
});

// --- ЛОГИКА ОСТАТКОВ (МЕЖГОРОД И ВЕС) ---
const getStockInCity = (item) => {
    if (!item?.product_stocks) return 0;
    let totalInCity = 0;
    
    item.product_stocks.forEach(stockRecord => {
        const wh = warehouses.value.find(hw => hw.id === stockRecord.warehouse_id);
        const wCity = wh?.cities?.name || wh?.city_name;
        if (wh && isSameCity(wCity, appStore.city)) {
            totalInCity += Number(stockRecord.quantity) || 0;
        }
    });
    return totalInCity;
};

const shippingBreakdown = computed(() => {
    if (!selectedWarehouseId.value) return { cost: 0, intercityItems: [], weightSurcharge: 0, intercityWeight: 0 };
    // Если заказ больше 50к - доставка полностью бесплатная
    if (cartStore.totalPriceFinal > 50000) return { cost: 0, intercityItems: [], weightSurcharge: 0, intercityWeight: 0 };
    
    let intercityItems = [];
    let intercityTotalWeight = 0;
    
    cartStore.items.forEach(item => { 
      const cityStock = getStockInCity(item);
      const neededQty = item.quantity;
      
      if (neededQty > cityStock) {
        const intercityQty = neededQty - cityStock;
        intercityItems.push({ name: item.name, id: item.id, qty: intercityQty });
        const itemWeight = Number(item.weight_kg) || 0;
        intercityTotalWeight += (itemWeight * intercityQty);
      }
    });
    
    if (intercityItems.length === 0) {
      return { cost: 0, intercityItems: [], weightSurcharge: 0, intercityWeight: 0 };
    }

    const baseCost = 800;
    let weightSurcharge = 0;
    const roundedWeight = Math.ceil(intercityTotalWeight);
    
    if (roundedWeight > 10) {
        weightSurcharge = (roundedWeight - 10) * 50;
    }
    
    return { 
        cost: baseCost + weightSurcharge, 
        intercityItems, 
        weightSurcharge, 
        intercityWeight: intercityTotalWeight
    };
});

onMounted(async () => {
    checkoutCity.value = appStore.city;
    const uid = localStorage.getItem('user_id');
    
    try {
        const wRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/admin/warehouses`, { 
            headers: {'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123'} 
        });
        warehouses.value = wRes.data;

        if (uid) {
            const u = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${uid}`);
            // Собираем имя из новой БД (first_name + last_name)
            const firstName = u.data.first_name || '';
            const lastName = u.data.last_name || '';
            form.value.name = `${firstName} ${lastName}`.trim();
            form.value.phone = u.data.phone_number || '';
            form.value.email = u.data.email || '';
        }
    } catch (e) { console.error("Ошибка инициализации чекаута", e); }
});

const handleOrderProcess = async () => {
    loading.value = true;
    try {
        // 1. Создаем заказ в БД (статус unpaid)
        const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/orders`, {
            ...form.value, 
            customer_name: form.value.name, 
            customer_phone: form.value.phone,
            customer_email: form.value.email, 
            customer_city: appStore.city,
            warehouse_id: selectedWarehouseId.value,
            delivery_type: 'pickup', // Согласно новой БД
            payment_method: form.value.payment_method, // card или cash
            shipping_cost: shippingBreakdown.value.cost, 
            items: cartStore.items.map(i => ({ product_id: i.id, quantity: i.quantity }))
        });

        const orderId = res.data.orderId;

        // 2. Логика оплаты
        if (form.value.payment_method === 'card') {
            // Тестовая инициализация оплаты
            const payRes = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/payment/tinkoff-init`, { orderId });
            // Сервер вернет ссылку на вебхук, который переведет статус в paid и вернет на фронт
            cartStore.clearCart(); 
            window.location.href = payRes.data.confirmation_url; 
        } else {
            // Оплата при получении
            cartStore.clearCart();
            router.push(`/order-success?orderId=${orderId}`);
        }
    } catch (e) { 
        alert(e.response?.data?.error || "Ошибка при оформлении заказа"); 
        loading.value = false;
    } 
};

const cancelOrder = () => router.push('/cart');
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ И АНИМАЦИИ
   ========================================================================== */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.checkout-page {
  padding: 40px 20px;
  animation: fadeSlideUp 0.5s ease-out;
}

.page-title {
  text-align: center;
  font-size: 2.8rem;
  font-weight: 900;
  margin-bottom: 40px;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

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

.checkout-layout {
  display: flex;
  gap: 40px;
  align-items: flex-start;
  max-width: 1400px;
  margin: 0 auto;
}

.checkout-main { flex: 2; }

/* СЕКЦИИ ЧЕКАУТА */
.checkout-section {
  padding: 30px;
  margin-bottom: 28px;
}
.checkout-section:hover {
  transform: translateY(-2px);
  border-color: var(--primary, #2563eb);
}

.checkout-section h3 {
  margin-top: 0;
  font-size: 1.4rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 25px;
  color: var(--text-main, #0f172a);
}
:global(.dark) .checkout-section h3 { color: #f8fafc; }

.section-icon { font-size: 1.8rem; }

/* ФОРМЫ */
.full-width-group {
  margin-bottom: 25px;
  background: rgba(0,0,0,0.02);
  padding: 20px;
  border-radius: var(--radius-md, 12px);
  border: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .full-width-group { background: rgba(255,255,255,0.02); border-color: #334155; }

.city-input-wrap { position: relative; }
.city-input-wrap input {
  width: 100%; padding: 14px 18px; font-size: 1.1rem; font-weight: 600;
  border-radius: var(--radius-sm, 8px); border: 2px solid var(--border-color, #cbd5e1);
  background: var(--bg-card, #fff); color: var(--text-main, #0f172a); transition: all 0.3s;
}
:global(.dark) .city-input-wrap input { background: #0f172a; border-color: #475569; color: #f8fafc; }
.city-input-wrap input:focus { border-color: var(--primary, #2563eb); outline: none; }
.city-hint { display: block; font-size: 0.75rem; color: var(--text-muted, #64748b); margin-top: 8px; }

.form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }

.input-group label {
  display: block; font-size: 0.8rem; font-weight: 800; text-transform: uppercase;
  color: var(--text-muted, #64748b); margin-bottom: 8px;
}
.input-group input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
  border: 1px solid var(--border-color, #cbd5e1); background: rgba(0,0,0,0.02);
  color: var(--text-main, #0f172a); transition: all 0.3s;
}
:global(.dark) .input-group input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.input-group input:focus { border-color: var(--primary, #2563eb); outline: none; background: transparent; }

/* ПВЗ */
.warehouse-select {
  width: 100%; padding: 14px 18px; border-radius: var(--radius-sm, 8px);
  border: 2px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff);
  color: var(--text-main, #0f172a); font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s;
}
:global(.dark) .warehouse-select { background: #0f172a; border-color: #475569; color: #f8fafc; }
.warehouse-select:focus { border-color: var(--primary, #2563eb); outline: none; }

.no-warehouses-alert {
  background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning, #f59e0b);
  padding: 18px; border-radius: var(--radius-md, 8px); color: var(--warning, #d97706); font-weight: 600;
}

/* ОПЛАТА */
.payment-methods-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.payment-method-card {
  background: rgba(0,0,0,0.02); border: 2px solid transparent; padding: 20px;
  border-radius: var(--radius-md, 12px); cursor: pointer; text-align: center;
  transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
:global(.dark) .payment-method-card { background: rgba(255,255,255,0.02); color: #f8fafc; }
.payment-method-card input { display: none; }
.payment-method-card.active {
  background: rgba(37, 99, 235, 0.05); border-color: var(--primary, #2563eb); transform: translateY(-3px);
}
.method-icon { font-size: 2.2rem; transition: transform 0.3s; }
.payment-method-card:hover .method-icon { transform: scale(1.1); }
.method-hint { font-size: 0.75rem; color: var(--success, #10b981); font-weight: 700; }

/* КНОПКИ */
.action-footer { display: flex; gap: 20px; margin-top: 30px; }
.btn-cancel {
  flex: 1; background: transparent; color: var(--danger, #ef4444); border: 2px solid var(--danger, #ef4444);
  padding: 16px; border-radius: var(--radius-md, 12px); font-weight: 800; font-size: 1rem; cursor: pointer; transition: all 0.3s;
}
.btn-cancel:hover { background: rgba(239, 68, 68, 0.1); transform: translateY(-2px); }

.btn-submit {
  flex: 2; background: var(--success, #10b981); color: white; border: none;
  padding: 16px; border-radius: var(--radius-md, 12px); font-weight: 800; font-size: 1rem;
  cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-submit:hover:not(:disabled) { background: #059669; transform: translateY(-2px); box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); }
.spinner-inline { animation: spin 1s linear infinite; display: inline-block; }

/* САЙДБАР (ИТОГО) */
.checkout-sidebar { flex: 1; position: sticky; top: 100px; }
.summary-card { padding: 28px; }
.summary-card h3 {
  font-size: 1.5rem; font-weight: 900; margin-bottom: 20px; text-align: center;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

.summary-items { max-height: 320px; overflow-y: auto; margin-bottom: 20px; padding-right: 8px; }
.summary-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color, #e2e8f0); }
:global(.dark) .summary-item { border-color: #334155; }
.item-info { display: flex; flex-direction: column; max-width: 70%; }
.item-name { font-size: 0.9rem; font-weight: 700; color: var(--text-main, #0f172a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:global(.dark) .item-name { color: #f8fafc; }
.item-info small { font-size: 0.8rem; color: var(--text-muted, #64748b); }
.item-total-price { font-weight: 800; color: var(--primary, #2563eb); }
:global(.dark) .item-total-price { color: #60a5fa; }

.summary-totals { border-top: 2px dashed var(--border-color, #cbd5e1); padding-top: 20px; }
:global(.dark) .summary-totals { border-color: #475569; }
.total-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: var(--text-muted, #64748b); font-size: 0.95rem; }
.delivery-title { font-weight: 800; color: var(--text-main, #0f172a); font-size: 1rem; }
:global(.dark) .delivery-title { color: #f8fafc; }
.free { color: var(--success, #10b981); font-weight: 800; }

.intercity-alert {
  background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger, #ef4444);
  padding: 12px 14px; border-radius: var(--radius-sm, 8px); margin: 15px 0; font-size: 0.85rem; color: var(--text-main, #0f172a);
}
:global(.dark) .intercity-alert { color: #f8fafc; }
.alert-title { color: var(--danger, #ef4444); font-weight: 800; margin-bottom: 8px; font-size: 0.85rem; }
.intercity-list { list-style: none; padding: 0; margin: 0; }
.intercity-list li { padding: 4px 0; font-size: 0.8rem; }

.weight-alert {
  background: rgba(0,0,0,0.02); padding: 10px 14px; border-radius: var(--radius-sm, 8px);
  display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 15px; border: 1px solid var(--border-color, #e2e8f0); color: var(--text-main, #0f172a);
}
:global(.dark) .weight-alert { background: rgba(255,255,255,0.02); border-color: #334155; color: #f8fafc; }
.surcharge { color: var(--danger, #ef4444); font-weight: 800; }

.final-price {
  display: flex; justify-content: space-between; align-items: baseline; margin-top: 20px;
  padding-top: 20px; border-top: 2px solid var(--border-color, #cbd5e1); font-size: 1.5rem; font-weight: 800; color: var(--text-main, #0f172a);
}
:global(.dark) .final-price { border-color: #475569; color: #f8fafc; }
.price-val { font-size: 1.8rem; color: var(--primary, #2563eb); }

/* ПУСТАЯ КОРЗИНА */
.empty-cart-state { text-align: center; padding: 80px 20px; max-width: 500px; margin: 0 auto; border: 2px dashed var(--border-color, #cbd5e1); }
:global(.dark) .empty-cart-state { border-color: #475569; }
.empty-icon { font-size: 5rem; margin-bottom: 20px; opacity: 0.6; }
.empty-cart-state h2 { color: var(--text-main, #0f172a); }
:global(.dark) .empty-cart-state h2 { color: #f8fafc; }
.btn-primary { background: var(--primary, #2563eb); color: white; padding: 14px 32px; border-radius: 40px; font-weight: 800; border: none; margin-top: 20px; cursor: pointer; transition: transform 0.2s; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

/* Адаптивность */
@media (max-width: 992px) {
  .checkout-layout { flex-direction: column; }
  .checkout-sidebar { width: 100%; position: static; }
}
@media (max-width: 768px) {
  .checkout-page { padding: 20px 15px; }
  .page-title { font-size: 2rem; }
  .form-grid { grid-template-columns: 1fr; }
  .payment-methods-grid { grid-template-columns: 1fr; }
  .action-footer { flex-direction: column; }
  .btn-cancel, .btn-submit { width: 100%; }
}
</style>