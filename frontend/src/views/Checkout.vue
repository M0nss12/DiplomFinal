<template>
  <div class="checkout-page animate-fade-in">
    <h1 class="page-title">Оформление заказа</h1>

    <!-- ПУСТАЯ КОРЗИНА -->
    <div v-if="cartStore.items.length === 0" class="empty-cart-state card">
      <div class="empty-icon">🛒</div>
      <h2>Ваша корзина пуста</h2>
      <router-link to="/catalog">
        <button class="button-primary">В каталог</button>
      </router-link>
    </div>

    <div v-else class="checkout-layout">
      <div class="checkout-main">
        <!-- 1. КОНТАКТЫ И ГОРОД -->
        <section class="checkout-section card">
          <h3><span class="section-icon">👤</span> Контактные данные</h3>

          <!-- ГОРОД (автодополнение) -->
          <div class="input-group full-width-group">
            <label>📍 Ваш Город (населённый пункт) *</label>
            <div class="city-autocomplete">
              <input
                :value="cityInput"
                @input="onCityInput"
                @focus="showCitySuggestions = true"
                @blur="onCityBlur"
                placeholder="Начните вводить название города..."
                autocomplete="off"
              />
              <transition name="dropdown-fade">
                <ul
                  v-if="showCitySuggestions && filteredCities.length"
                  class="city-suggestions card"
                >
                  <li
                    v-for="c in filteredCities"
                    :key="c.id"
                    @mousedown.prevent="selectCity(c)"
                    :class="{ active: appStore.city === c.name }"
                  >
                    {{ c.name }}
                  </li>
                </ul>
              </transition>
            </div>
            <span class="city-hint" v-if="citiesLoading">Загрузка городов...</span>
            <span class="city-hint" v-else>Выберите город из выпадающего списка.</span>
          </div>

          <div class="form-grid">
            <div class="input-group">
              <label>Имя *</label>
              <input v-model="form.name" placeholder="Иван" required />
            </div>
            <div class="input-group">
              <label>Телефон</label>
              <input :value="form.phone" type="tel" placeholder="+7 (999) 000-00-00" @input="onPhoneInput" />
            </div>
            <div class="input-group">
              <label>Email</label>
              <input v-model="form.email" type="email" placeholder="mail@example.com" @blur="validateEmail" />
              <small v-if="!emailValid && form.email.length > 0" class="error-hint">Введите корректный email</small>
            </div>
          </div>
          <p class="hint-note">* Телефон или email должны быть заполнены (хотя бы одно)</p>
        </section>

        <!-- 2. ПВЗ -->
        <section class="checkout-section card">
          <h3><span class="section-icon">📍</span> Пункт выдачи в г. {{ appStore.city || '…' }}</h3>

          <div v-if="localWarehouses.length > 0">
            <select v-model="selectedWarehouseId" class="warehouse-select" @change="refreshShipping">
              <option :value="null">-- Выберите адрес --</option>
              <option v-for="w in localWarehouses" :key="w.id" :value="w.id">
                {{ w.address }}
              </option>
            </select>
          </div>
          <div v-else class="no-warehouses-alert">
            <p><b>В г. {{ appStore.city || '…' }}</b> нет доступных ПВЗ. Пожалуйста, укажите другой город.</p>
          </div>
        </section>

        <!-- 3. СПОСОБ ОПЛАТЫ -->
        <section class="checkout-section card">
          <h3><span class="section-icon">💳</span> Способ оплаты</h3>
          <div class="payment-methods-grid">
            <label
              v-for="m in paymentMethods"
              :key="m.id"
              class="payment-method-card"
              :class="{ active: form.payment_method === m.id }"
            >
              <input type="radio" :value="m.id" v-model="form.payment_method" />
              <div class="method-icon">{{ m.icon }}</div>
              <strong>{{ m.label }}</strong>
              <small v-if="m.id === 'card'" class="method-hint">Тестовый шлюз</small>
            </label>
          </div>
        </section>

        <!-- КНОПКИ ДЕЙСТВИЯ -->
        <div class="action-footer">
          <button @click="cancelOrder" class="button-cancel">ОТМЕНИТЬ</button>
          <button
            @click="onSubmitClick"
            :disabled="isSubmitDisabled"
            class="button-submit"
            :style="{ opacity: isSubmitDisabled ? 0.5 : 1 }"
          >
            <span v-if="loading" class="spinner-inline">⏳</span>
            {{ loading ? 'ОБРАБОТКА...' : submitButtonText }}
          </button>
        </div>
      </div>

      <!-- ПРАВАЯ ПАНЕЛЬ: ИТОГО -->
      <aside class="checkout-sidebar">
        <div class="summary-card card">
          <h3>Ваш заказ</h3>
          <div class="summary-items">
            <div v-for="item in cartStore.items" :key="item.id" class="summary-line">
              <div class="item-info">
                <span class="item-name">{{ item.name }}</span>
                <small>{{ item.quantity }} шт. × {{ item.discount_price || item.price }} ₽</small>
              </div>
              <span class="item-total-price">{{ ((item.discount_price || item.price) * item.quantity).toFixed(2) }} ₽</span>
            </div>
          </div>

          <div class="summary-totals">
            <div class="total-row">
              <span>Сумма товаров:</span>
              <span>{{ cartTotalGoods }} ₽</span>
            </div>

            <div class="total-row delivery-title">
              <span>Доставка:</span>
              <span v-if="!selectedWarehouseId">—</span>
              <span v-else-if="loadingShipping" class="loading-text">Расчёт...</span>
              <span v-else :class="{ free: shippingData.total === 0 }">
                {{ shippingData.total === 0 ? 'Бесплатно' : shippingData.total + ' ₽' }}
              </span>
            </div>

            <div v-if="shippingData.details && shippingData.details.some(d => !d.in_stock)" class="intercity-alert">
              <div class="alert-title">🚚 Часть товаров поедет межгородом</div>
              <ul class="intercity-list">
                <li v-for="d in shippingData.details.filter(x => !x.in_stock)" :key="d.product_id">
                  {{ getProductName(d.product_id) }} ({{ d.quantity }} шт.) — расстояние {{ d.distance_km }} км, {{ d.shipping_cost }} ₽
                </li>
              </ul>
            </div>

            <div class="final-price">
              <span>Итого к оплате:</span>
              <span class="price-val">{{ finalTotal }} ₽</span>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ ОПЛАТЫ (ТОЛЬКО ДЛЯ КАРТЫ) -->
    <div v-if="showPaymentModal" class="modal-overlay" @click.self="closePaymentModal">
      <div class="modal-content card">
        <button class="modal-close" @click="closePaymentModal">&times;</button>
        <h2>Подтверждение заказа</h2>
        <p>Вы собираетесь оплатить <strong>{{ finalTotal }} ₽</strong> банковской картой.</p>
        <p class="modal-hint">Тестовый платёж — средства не списываются.</p>
        <div class="modal-actions">
          <button @click="closePaymentModal" class="button-cancel">ОТМЕНА</button>
          <button @click="confirmAndCreateOrder" :disabled="loading" class="button-submit">
            <span v-if="loading" class="spinner-inline">⏳</span>
            {{ loading ? 'ОБРАБОТКА...' : 'ОПЛАТИТЬ' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const cartStore = useCartStore();
const appStore = useAppStore();

const loading = ref(false);
const loadingShipping = ref(false);
const warehouses = ref([]);
const selectedWarehouseId = ref(null);

// ---- ГОРОД (автодополнение) ----
const cities = ref([]);
const citiesLoading = ref(true);
const cityInput = ref('');
const showCitySuggestions = ref(false);
const filteredCities = computed(() => {
  const q = cityInput.value.trim().toLowerCase();
  if (!q) return [];
  return cities.value.filter(c => c.name.toLowerCase().includes(q));
});

const onCityInput = (event) => {
  cityInput.value = event.target.value;
  showCitySuggestions.value = true;
};

const selectCity = async (city) => {
  cityInput.value = city.name;
  showCitySuggestions.value = false;
  await appStore.setCity(city.name);
  selectedWarehouseId.value = null;
  const uid = localStorage.getItem('user_id');
  if (uid) {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${uid}`, { city: city.name });
    } catch (e) { console.error("Ошибка сохранения города", e); }
  }
};

const onCityBlur = () => {
  setTimeout(() => {
    if (!cities.value.some(c => c.name === cityInput.value)) {
      cityInput.value = appStore.city || '';
    }
    showCitySuggestions.value = false;
  }, 150);
};

// ---- КОНТАКТЫ ----
const form = ref({ name: '', phone: '', email: '', payment_method: 'card' });
const emailValid = ref(true);

const validateEmail = () => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (form.value.email.length === 0) {
    emailValid.value = true;
    return;
  }
  emailValid.value = re.test(form.value.email);
};

const onPhoneInput = (event) => {
  let value = event.target.value.replace(/[^\d]/g, '');
  if (value.startsWith('7') || value.startsWith('8')) value = value.substring(1);
  if (value.length === 0) {
    form.value.phone = '';
    event.target.value = '';
    return;
  }
  let formatted = '+7';
  if (value.length > 0) formatted += ' (' + value.substring(0, 3);
  if (value.length >= 4) formatted += ') ' + value.substring(3, 6);
  if (value.length >= 7) formatted += '-' + value.substring(6, 8);
  if (value.length >= 9) formatted += '-' + value.substring(8, 10);
  form.value.phone = formatted;
  event.target.value = formatted;
};

const paymentMethods = [
  { id: 'card', label: 'Оплата онлайн', icon: '💳' },
  { id: 'cash', label: 'При получении', icon: '📦' }
];

const isSameCity = (c1, c2) => c1?.trim().toLowerCase() === c2?.trim().toLowerCase();

const isSubmitDisabled = computed(() => {
  const hasContact = form.value.phone.trim() || form.value.email.trim();
  const hasCity = appStore.city && selectedWarehouseId.value;
  return !form.value.name.trim() || !hasContact || !hasCity || loading.value || !emailValid.value;
});

const submitButtonText = computed(() => {
  return form.value.payment_method === 'card' ? '✔ ПЕРЕЙТИ К ОПЛАТЕ' : '✔ ПОДТВЕРДИТЬ ЗАКАЗ';
});

// ---- ПВЗ ----
const localWarehouses = computed(() => {
  return warehouses.value.filter(w => {
    const wCity = w.cities?.name || w.city_name;
    return isSameCity(wCity, appStore.city) && w.is_pickup_point;
  });
});

// ---- ДОСТАВКА ----
const shippingData = ref({ total: 0, details: [] });
const refreshShipping = async () => {
  if (!selectedWarehouseId.value || cartStore.items.length === 0) {
    shippingData.value = { total: 0, details: [] };
    return;
  }
  loadingShipping.value = true;
  try {
    const itemsForRequest = cartStore.items.map(i => ({
      product_id: i.id,
      quantity: i.quantity
    }));
    const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/public/shipping-estimate`, {
      warehouse_id: selectedWarehouseId.value,
      items: itemsForRequest
    });
    shippingData.value = res.data;
  } catch (e) {
    console.error('Ошибка расчёта доставки:', e);
    shippingData.value = { total: 0, details: [] };
  } finally {
    loadingShipping.value = false;
  }
};

const cartTotalGoods = computed(() => {
  return cartStore.items.reduce((sum, item) => {
    return sum + (item.discount_price || item.price) * (item.quantity || 1);
  }, 0).toFixed(2);
});

const finalTotal = computed(() => {
  const goods = parseFloat(cartTotalGoods.value);
  const shipping = shippingData.value.total || 0;
  return (goods + shipping).toFixed(2);
});

const getProductName = (id) => {
  const item = cartStore.items.find(i => i.id === id);
  return item ? item.name : 'Товар';
};

// ---- МОДАЛЬНОЕ ОКНО (ТОЛЬКО ДЛЯ КАРТЫ) ----
const showPaymentModal = ref(false);

const onSubmitClick = () => {
  if (isSubmitDisabled.value) return;
  if (form.value.payment_method === 'card') {
    showPaymentModal.value = true;
  } else {
    createOrderAndRedirect('cash');
  }
};

const closePaymentModal = () => {
  showPaymentModal.value = false;
};

const confirmAndCreateOrder = async () => {
  await createOrderAndRedirect('card');
  showPaymentModal.value = false;
};

// ---- СОЗДАНИЕ ЗАКАЗА И РЕДИРЕКТ ----
const createOrderAndRedirect = async (paymentMethod) => {
  loading.value = true;
  try {
    const orderPayload = {
      customer_name: form.value.name,
      customer_phone: form.value.phone,
      customer_email: form.value.email,
      customer_city: appStore.city,
      warehouse_id: selectedWarehouseId.value,
      payment_method: paymentMethod,
      shipping_cost: shippingData.value.total,
      items: cartStore.items.map(i => ({ product_id: i.id, quantity: i.quantity }))
    };

    const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/orders`, orderPayload);
    const orderId = res.data.orderId;

    // Очищаем корзину сразу после успешного создания заказа
    cartStore.clearCart();

    // Переходим на страницу успеха
    router.push(`/order-success?orderId=${orderId}`);
  } catch (e) {
    alert(e.response?.data?.error || 'Ошибка при создании заказа');
  } finally {
    loading.value = false;
  }
};

const cancelOrder = () => router.push('/cart');

// ---- ИНИЦИАЛИЗАЦИЯ ----
onMounted(async () => {
  try {
    citiesLoading.value = true;
    const cRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/cities`);
    cities.value = cRes.data || [];
  } catch (e) {
    console.warn('Не удалось загрузить города');
  } finally {
    citiesLoading.value = false;
  }

  cityInput.value = appStore.city || '';
  const uid = localStorage.getItem('user_id');

  try {
    const wRes = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/admin/warehouses`, {
      headers: { 'x-admin-key': import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123' }
    });
    warehouses.value = wRes.data;

    if (uid) {
      const u = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/users/profile/${uid}`);
      form.value.name = u.data.first_name || '';
      form.value.phone = u.data.phone_number || '';
      form.value.email = u.data.email || '';
    }
  } catch (e) { console.error("Ошибка инициализации чекаута", e); }
});

watch([selectedWarehouseId, () => cartStore.items.map(i => i.quantity).join(',')], () => {
  refreshShipping();
}, { immediate: true });
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ (БЕЗ ГЛОБАЛЬНЫХ КЛАССОВ)
   ========================================================================== */

/* Анимация появления */
.animate-fade-in {
  animation: fadeInUp 0.3s ease-out;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.checkout-page {
  padding: 40px 20px;
}

.page-title {
  text-align: center;
  font-size: clamp(2rem, 5vw, 2.8rem);
  font-weight: 900;
  margin-bottom: 40px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Карточка (замена glass-card) */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card:hover {
  box-shadow: var(--shadow-md);
}
:global(.dark) .card,
:global(.dark-theme) .card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

/* Основной контейнер */
.checkout-layout {
  display: flex;
  gap: 40px;
  align-items: flex-start;
  max-width: 1400px;
  margin: 0 auto;
}

.checkout-main { flex: 2; }

/* Секции */
.checkout-section {
  padding: 30px;
  margin-bottom: 28px;
}
.checkout-section:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}

.checkout-section h3 {
  margin-top: 0;
  font-size: 1.4rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 25px;
  color: var(--text-main);
}
:global(.dark) .checkout-section h3 { color: #f8fafc; }

.section-icon { font-size: 1.8rem; }

/* Формы */
.full-width-group {
  margin-bottom: 25px;
  background: rgba(0,0,0,0.02);
  padding: 20px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}
:global(.dark) .full-width-group {
  background: rgba(255,255,255,0.02);
  border-color: #334155;
}

.city-autocomplete { position: relative; }
.city-autocomplete input {
  width: 100%;
  padding: 14px 18px;
  font-size: 1.1rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  transition: border-color 0.2s;
}
:global(.dark) .city-autocomplete input {
  background: #0f172a;
  border-color: #475569;
  color: #f8fafc;
}
.city-autocomplete input:focus {
  border-color: var(--primary);
  outline: none;
}

.city-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  max-height: 220px;
  overflow-y: auto;
  list-style: none;
  padding: 0;
  margin-top: 4px;
}
.city-suggestions li {
  padding: 12px 18px;
  cursor: pointer;
  font-size: 0.95rem;
  color: var(--text-main);
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}
:global(.dark) .city-suggestions li { color: #f8fafc; border-color: #334155; }
.city-suggestions li:hover,
.city-suggestions li.active {
  background: var(--primary-light);
  color: var(--primary);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.city-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.input-group label {
  display: block;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.input-group input {
  width: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  color: var(--text-main);
  transition: border-color 0.2s, box-shadow 0.2s;
}
:global(.dark) .input-group input {
  background: #1e293b;
  border-color: #475569;
  color: #f8fafc;
}
.input-group input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
  background: transparent;
}

.error-hint { color: var(--danger); font-size: 0.8rem; margin-top: 5px; }
.hint-note { color: var(--text-muted); font-size: 0.85rem; margin-top: 15px; }

/* ПВЗ */
.warehouse-select {
  width: 100%;
  padding: 14px 18px;
  border-radius: var(--radius-sm);
  border: 2px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s;
}
:global(.dark) .warehouse-select {
  background: #0f172a;
  border-color: #475569;
  color: #f8fafc;
}
.warehouse-select:focus {
  border-color: var(--primary);
  outline: none;
}

.no-warehouses-alert {
  background: var(--warning-light);
  border-left: 4px solid var(--warning);
  padding: 18px;
  border-radius: var(--radius-md);
  color: var(--warning);
  font-weight: 600;
}

/* Способы оплаты */
.payment-methods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.payment-method-card {
  background: var(--bg-body);
  border: 2px solid var(--border-color);
  padding: 20px;
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, transform 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.payment-method-card input { display: none; }
.payment-method-card.active {
  border-color: var(--primary);
  background: var(--primary-light);
  transform: translateY(-3px);
}
.method-icon { font-size: 2.2rem; }
.method-hint { font-size: 0.75rem; color: var(--success); font-weight: 700; }

/* Кнопки действий */
.action-footer {
  display: flex;
  gap: 20px;
  margin-top: 30px;
}

.button-cancel {
  flex: 1;
  background: transparent;
  color: var(--danger);
  border: 2px solid var(--danger);
  padding: 16px;
  border-radius: var(--radius-md);
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}
.button-cancel:hover {
  background: rgba(239, 68, 68, 0.1);
  transform: translateY(-2px);
}

.button-submit {
  flex: 2;
  background: var(--success);
  color: white;
  border: none;
  padding: 16px;
  border-radius: var(--radius-md);
  font-weight: 800;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.button-submit:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
}
.button-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-inline {
  animation: spin 1s linear infinite;
  display: inline-block;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Сайдбар (итоговая корзина) */
.checkout-sidebar {
  flex: 1;
  position: sticky;
  top: 100px;
}

.summary-card {
  padding: 28px;
}
.summary-card h3 {
  font-size: 1.5rem;
  font-weight: 900;
  margin-bottom: 20px;
  text-align: center;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.summary-items {
  max-height: 320px;
  overflow-y: auto;
  margin-bottom: 20px;
  padding-right: 8px;
}
.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-color);
}
:global(.dark) .summary-line { border-color: #334155; }

.item-info {
  display: flex;
  flex-direction: column;
  max-width: 70%;
}
.item-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:global(.dark) .item-name { color: #f8fafc; }
.item-info small {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.item-total-price {
  font-weight: 800;
  color: var(--primary);
}

.summary-totals {
  border-top: 2px dashed var(--border-color);
  padding-top: 20px;
}
:global(.dark) .summary-totals { border-color: #475569; }

.total-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  color: var(--text-muted);
  font-size: 0.95rem;
}
.delivery-title {
  font-weight: 800;
  color: var(--text-main);
  font-size: 1rem;
}
:global(.dark) .delivery-title { color: #f8fafc; }
.free { color: var(--success); font-weight: 800; }

.intercity-alert {
  background: var(--danger-light);
  border-left: 4px solid var(--danger);
  padding: 12px 14px;
  border-radius: var(--radius-sm);
  margin: 15px 0;
  font-size: 0.85rem;
  color: var(--text-main);
}
:global(.dark) .intercity-alert { color: #f8fafc; }
.alert-title { color: var(--danger); font-weight: 800; margin-bottom: 8px; font-size: 0.85rem; }
.intercity-list { list-style: none; padding: 0; margin: 0; }
.intercity-list li { padding: 4px 0; font-size: 0.8rem; }

.final-price {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid var(--border-color);
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
}
:global(.dark) .final-price { border-color: #475569; color: #f8fafc; }
.price-val { font-size: 1.8rem; color: var(--primary); }

/* Пустая корзина */
.empty-cart-state {
  text-align: center;
  padding: 80px 20px;
  max-width: 500px;
  margin: 0 auto;
  border-style: dashed;
}
.empty-icon { font-size: 5rem; margin-bottom: 20px; opacity: 0.6; }
.empty-cart-state h2 { color: var(--text-main); }
:global(.dark) .empty-cart-state h2 { color: #f8fafc; }

.button-primary {
  background: var(--primary);
  color: white;
  padding: 14px 32px;
  border-radius: 40px;
  font-weight: 800;
  border: none;
  margin-top: 20px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--primary-light);
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  width: 90%;
  max-width: 480px;
  padding: 30px;
  position: relative;
  text-align: center;
}
.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  border: none;
  font-size: 24px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.2s;
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-close:hover {
  background: rgba(239,68,68,0.1);
  color: var(--danger);
  transform: rotate(90deg);
}
.modal-content h2 { color: var(--text-main); margin-bottom: 15px; }
:global(.dark) .modal-content h2 { color: #f8fafc; }
.modal-content p { color: var(--text-muted); margin-bottom: 10px; }
.modal-hint { font-size: 0.85rem; color: var(--primary); }
.modal-actions {
  display: flex;
  gap: 15px;
  margin-top: 25px;
  justify-content: center;
}

/* Адаптивность */
@media (max-width: 992px) {
  .checkout-layout {
    flex-direction: column;
  }
  .checkout-sidebar {
    width: 100%;
    position: static;
  }
}
@media (max-width: 768px) {
  .checkout-page { padding: 20px 15px; }
  .page-title { font-size: 2rem; }
  .form-grid { grid-template-columns: 1fr; }
  .payment-methods-grid { grid-template-columns: 1fr; }
  .action-footer { flex-direction: column; }
  .button-cancel, .button-submit { width: 100%; }
}
</style>