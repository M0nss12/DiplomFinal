<template>
  <div class="orders-page">
    <div class="header-section">
      <h1>📦 Мои заказы</h1>
      <router-link to="/profile" class="back-link">
        <span class="back-icon">←</span> Вернуться в профиль
      </router-link>
    </div>

    <!-- ТАБЫ (ФИЛЬТРЫ) -->
    <div class="status-tabs glass-card">
      <button 
        v-for="tab in tabs" 
        :key="tab.id" 
        @click="activeTab = tab.id" 
        :class="{ active: activeTab === tab.id }"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loader-container glass-card">
      <div class="loader"></div>
      <p>Загружаем историю...</p>
    </div>

    <div v-else class="orders-list">
      <div v-if="filteredOrders.length === 0" class="empty-orders glass-card">
        <div class="empty-icon">📂</div>
        <p>Заказов в этой категории не найдено.</p>
        <router-link to="/catalog" class="btn-catalog">Перейти в каталог</router-link>
      </div>

      <div v-for="order in filteredOrders" :key="order.id" class="order-card glass-card" :class="{ 'cancelled-order': order.delivery_status === 'cancelled' }">
        
        <div class="order-header">
          <div class="order-meta">
            <span class="order-number">Заказ №{{ order.id }}</span>
            <span class="order-date">от {{ formatDate(order.created_at) }}</span>
          </div>
          <div class="order-statuses">
            <span :style="getDeliveryStatusStyle(order.delivery_status)" class="badge">
              {{ translateDelivery(order.delivery_status) }}
            </span>
            <span :style="getPaymentStatusStyle(order.payment_status)" class="badge payment-badge">
              {{ translatePaymentStatus(order.payment_status) }}
            </span>
          </div>
        </div>

        <div class="order-delivery-info">
          <span class="pin-icon">📍</span> <b>Доставка ({{ order.delivery_type === 'courier' ? 'Курьер' : 'ПВЗ' }}):</b> {{ order.delivery_address }}
        </div>

        <!-- БЛОК УПРАВЛЕНИЯ ОПЛАТОЙ -->
        <div v-if="order.payment_status === 'unpaid' && order.delivery_status !== 'cancelled'" class="management-box">
          <div class="info-row">
            <div class="method-select-group">
              <label>Способ оплаты:</label>
              <select :value="order.payment_method" @change="changePaymentMethod(order, $event.target.value)" class="modern-select">
                <option value="card">Картой онлайн</option>
                <option value="cash">При получении</option>
              </select>
            </div>
            
            <button v-if="order.payment_method === 'card'" @click="initPayment(order)" class="pay-btn" :disabled="loadingPayment === order.id">
              <span v-if="loadingPayment === order.id" class="spinner-small"></span>
              {{ loadingPayment === order.id ? 'Перенаправление...' : `💳 Оплатить ${order.total_price} ₽` }}
            </button>
          </div>
        </div>

        <!-- СПИСОК ТОВАРОВ -->
        <div class="order-items">
            <div v-for="item in order.order_items" :key="item.id" class="item-row">
                <router-link :to="'/product/' + item.product_id" class="item-img-link">
                  <!-- Адаптация картинки под новую БД (массив images) -->
                  <img :src="item.products?.images && item.products.images.length > 0 ? item.products.images[0] : '/assets/images/no-image.png'" />
                </router-link>

                <div class="item-info">
                    <router-link :to="'/product/' + item.product_id" class="item-name">
                      {{ item.products?.name || 'Товар удален' }}
                    </router-link>
                    <div class="item-details">{{ item.quantity }} шт. × {{ item.unit_price }} ₽</div>
                </div>

                <div class="item-price">{{ item.unit_price * item.quantity }} ₽</div>
            </div>
        </div>

        <div class="order-footer">
          <div class="total-sum">Итого: <strong>{{ order.total_price }} ₽</strong></div>
          <div class="footer-actions">
            <button @click="reorder(order)" class="reorder-btn">Повторить заказ</button>
            <button v-if="!['delivered', 'cancelled', 'returned'].includes(order.delivery_status)" @click="cancelOrder(order)" class="cancel-order-btn">Отменить</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';

const cartStore = useCartStore();
const orders = ref([]);
const loading = ref(true);
const loadingPayment = ref(null);
const activeTab = ref('all');

const tabs = [
  { id: 'all', label: 'Все заказы' }, 
  { id: 'active', label: 'В работе' }, 
  { id: 'paid', label: 'Оплаченные' }, 
  { id: 'unpaid', label: 'Ждут оплаты' },
  { id: 'completed', label: 'Завершенные' },
  { id: 'cancelled', label: 'Отмененные' }
];

const loadOrders = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) return;
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/orders/${userId}`);
    orders.value = res.data;
  } catch (e) { 
    console.error("Ошибка загрузки заказов:", e); 
  } finally { 
    loading.value = false; 
  }
};

const changePaymentMethod = async (order, newMethod) => {
    try {
        const res = await axios.patch(`${import.meta.env.VITE_API_URL || ''}/api/orders/${order.id}`, { payment_method: newMethod });
        order.payment_method = res.data[0]?.payment_method || newMethod;
    } catch (e) { 
        alert("Ошибка изменения метода оплаты"); 
    }
};

// --- НОВАЯ ЛОГИКА ОПЛАТЫ ЧЕРЕЗ ШЛЮЗ ---
const initPayment = async (order) => {
    loadingPayment.value = order.id;
    try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/payment/tinkoff-init`, { orderId: order.id });
        // Перенаправляем пользователя на ссылку подтверждения оплаты (вебхук)
        window.location.href = res.data.confirmation_url;
    } catch (e) {
        alert("Ошибка инициализации платежа");
        loadingPayment.value = null;
    }
};

const reorder = (order) => {
  if (!order || !order.order_items) return;
  order.order_items.forEach(item => {
    if (item.products) {
      // Имитируем наличие, чтобы можно было добавить в корзину (потом корзина сама проверит остатки)
      cartStore.addToCart({ ...item.products, price: item.unit_price, stock_quantity: 999 });
    }
  });
  alert('Товары добавлены в корзину.');
};

const cancelOrder = async (order) => {
    if (!confirm("Вы уверены, что хотите отменить заказ?")) return;
    try {
        await axios.patch(`${import.meta.env.VITE_API_URL || ''}/api/orders/${order.id}`, { delivery_status: 'cancelled' });
        order.delivery_status = 'cancelled';
    } catch (e) { 
        alert("Ошибка отмены заказа"); 
    }
};

const formatDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Новые статусы БД
const translateDelivery = (s) => ({ 
  'processing': 'Обработка', 
  'shipping': 'В пути', 
  'delivered': 'Доставлен / Выдан', 
  'cancelled': 'Отменен',
  'returned': 'Возврат'
}[s] || 'Неизвестно');

const translatePaymentStatus = (s) => ({ 
  'paid': 'Оплачен ✅', 
  'unpaid': 'Не оплачен', 
  'refunded': 'Средства возвращены' 
}[s] || 'Ожидание');

const getDeliveryStatusStyle = (s) => {
  if (['cancelled', 'returned'].includes(s)) return { background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' };
  if (s === 'delivered') return { background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' };
  return { background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' };
};
const getPaymentStatusStyle = (s) => s === 'paid' ? { color: 'var(--success)' } : { color: 'var(--warning)' };

const filteredOrders = computed(() => {
  if (activeTab.value === 'active') return orders.value.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.delivery_status));
  if (activeTab.value === 'completed') return orders.value.filter(o => o.delivery_status === 'delivered');
  if (activeTab.value === 'cancelled') return orders.value.filter(o => ['cancelled', 'returned'].includes(o.delivery_status));
  if (activeTab.value === 'paid') return orders.value.filter(o => o.payment_status === 'paid');
  if (activeTab.value === 'unpaid') return orders.value.filter(o => o.payment_status === 'unpaid');
  return orders.value;
});

onMounted(loadOrders);
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.orders-page {
  max-width: 1200px; margin: 0 auto; padding: 40px 24px; animation: fadeSlideUp 0.6s ease-out;
}

/* Стеклянные карточки */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

/* ШАПКА */
.header-section {
  display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 20px; margin-bottom: 32px;
}
.header-section h1 {
  font-size: 2.2rem; font-weight: 800; margin: 0; color: var(--text-main, #0f172a);
}
:global(.dark) .header-section h1 { color: #f8fafc; }

.back-link {
  display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-weight: 600; color: var(--primary, #2563eb); transition: all 0.2s;
}
.back-link:hover { transform: translateX(-6px); text-decoration: underline; }

/* ТАБЫ */
.status-tabs {
  display: flex; gap: 10px; padding: 8px; margin-bottom: 32px; overflow-x: auto; scrollbar-width: thin;
}
.status-tabs::-webkit-scrollbar { height: 4px; }

.status-tabs button {
  white-space: nowrap; border: none; padding: 10px 20px; border-radius: var(--radius-md, 8px);
  background: transparent; color: var(--text-muted, #64748b); font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;
}
:global(.dark) .status-tabs button { color: #94a3b8; }
.status-tabs button:hover { background: rgba(37, 99, 235, 0.05); color: var(--primary, #2563eb); transform: translateY(-2px); }
.status-tabs button.active { background: var(--primary, #2563eb); color: white; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2); }

/* ЛОАДЕР */
.loader-container { text-align: center; padding: 60px; color: var(--text-muted, #64748b); font-weight: 600; }
.loader { width: 50px; height: 50px; border: 3px solid var(--border-color, #e2e8f0); border-top-color: var(--primary, #2563eb); border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 20px; }
:global(.dark) .loader { border-color: #334155; border-top-color: #3b82f6; }

/* КАРТОЧКА ЗАКАЗА */
.order-card { padding: 28px; margin-bottom: 28px; transition: transform 0.2s, box-shadow 0.2s; }
.order-card:hover { transform: translateY(-4px); box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1); border-color: var(--primary, #2563eb); }
:global(.dark) .order-card:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5); }

.order-card.cancelled-order { opacity: 0.7; background: rgba(239, 68, 68, 0.03); border-left: 4px solid var(--danger, #ef4444); }
:global(.dark) .order-card.cancelled-order { background: rgba(239, 68, 68, 0.05); }

/* ЗАГОЛОВОК ЗАКАЗА */
.order-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; margin-bottom: 20px; }
.order-number { display: block; font-weight: 800; font-size: 1.25rem; color: var(--text-main, #0f172a); letter-spacing: -0.3px; }
:global(.dark) .order-number { color: #f8fafc; }
.order-date { font-size: 0.85rem; color: var(--text-muted, #64748b); margin-left: 12px; font-weight: 500;}

.order-statuses { display: flex; gap: 10px; flex-wrap: wrap; }
.badge { padding: 6px 14px; border-radius: 40px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.payment-badge { border: 1px solid currentColor; background: transparent !important; }

/* АДРЕС ДОСТАВКИ */
.order-delivery-info {
  font-size: 0.95rem; padding: 12px 18px; background: rgba(0,0,0,0.02); border-radius: var(--radius-md, 8px);
  margin-bottom: 24px; color: var(--text-main, #0f172a); border: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; gap: 8px;
}
:global(.dark) .order-delivery-info { background: rgba(255,255,255,0.02); border-color: #334155; color: #e2e8f0; }
.pin-icon { font-size: 1.1rem; }

/* БЛОК УПРАВЛЕНИЯ ОПЛАТОЙ */
.management-box {
  background: rgba(245, 158, 11, 0.05); padding: 20px; border-radius: var(--radius-md, 8px);
  margin-bottom: 24px; border: 1px solid rgba(245, 158, 11, 0.3); transition: all 0.3s;
}
:global(.dark) .management-box { background: rgba(245, 158, 11, 0.1); }
.info-row { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; }

.method-select-group label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--warning, #f59e0b); margin-bottom: 6px; }
.modern-select {
  padding: 10px 16px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1);
  background: var(--bg-card, #fff); color: var(--text-main, #0f172a); font-weight: 600; cursor: pointer; transition: all 0.2s;
}
:global(.dark) .modern-select { background: #1e293b; border-color: #475569; color: #f8fafc; }
.modern-select:focus { border-color: var(--primary, #2563eb); outline: none; }

.pay-btn {
  background: var(--primary, #2563eb); color: white; padding: 12px 24px; border-radius: 40px;
  font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.pay-btn:hover:not(:disabled) { transform: translateY(-2px); background: var(--primary-hover, #1d4ed8); }
.pay-btn:disabled { opacity: 0.7; cursor: not-allowed; }
.spinner-small { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

/* ТОВАРЫ В ЗАКАЗЕ */
.order-items { margin: 20px 0; }
.item-row { display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border-color, #e2e8f0); transition: background 0.2s; }
:global(.dark) .item-row { border-color: #334155; }
.item-row:last-child { border-bottom: none; }

.item-img-link { position: relative; display: block; flex-shrink: 0; }
.item-row img {
  width: 60px; height: 60px; object-fit: contain; background: white;
  border: 1px solid var(--border-color, #e2e8f0); border-radius: var(--radius-sm, 8px); padding: 4px; transition: transform 0.3s;
}
:global(.dark) .item-row img { border-color: #334155; }
.item-row img:hover { transform: scale(1.1); border-color: var(--primary, #2563eb); }

.item-info { flex: 1; }
.item-name { display: inline-block; font-weight: 700; color: var(--text-main, #0f172a); text-decoration: none; font-size: 1rem; transition: color 0.2s; }
:global(.dark) .item-name { color: #f8fafc; }
.item-name:hover { color: var(--primary, #2563eb); text-decoration: underline; }
.item-details { font-size: 0.85rem; color: var(--text-muted, #64748b); margin-top: 4px; font-weight: 500;}

.item-price { font-weight: 800; font-size: 1rem; color: var(--text-main, #0f172a); white-space: nowrap; }
:global(.dark) .item-price { color: #f8fafc; }

/* ФУТЕР ЗАКАЗА */
.order-footer {
  margin-top: 20px; padding-top: 20px; border-top: 2px dashed var(--border-color, #cbd5e1);
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
}
:global(.dark) .order-footer { border-color: #475569; }

.total-sum { font-size: 1rem; font-weight: 600; color: var(--text-muted, #64748b); }
.total-sum strong { font-size: 1.6rem; font-weight: 900; color: var(--primary, #2563eb); margin-left: 8px; }
:global(.dark) .total-sum strong { color: #60a5fa; }

.footer-actions { display: flex; gap: 12px; }
.reorder-btn, .cancel-order-btn {
  padding: 10px 20px; border-radius: 40px; font-weight: 700; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; border: none;
}
.reorder-btn { background: rgba(0,0,0,0.05); color: var(--text-main, #0f172a); }
:global(.dark) .reorder-btn { background: rgba(255,255,255,0.05); color: #e2e8f0; }
.reorder-btn:hover { background: rgba(37, 99, 235, 0.1); color: var(--primary, #2563eb); transform: translateY(-2px); }

.cancel-order-btn { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }
.cancel-order-btn:hover { background: var(--danger, #ef4444); color: white; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3); }

/* ПУСТОЕ СОСТОЯНИЕ */
.empty-orders { text-align: center; padding: 80px 20px; color: var(--text-muted, #64748b); font-weight: 600;}
.empty-icon { font-size: 4rem; margin-bottom: 20px; opacity: 0.8; }
.btn-catalog { display: inline-block; margin-top: 15px; padding: 10px 24px; background: var(--primary, #2563eb); color: white; border-radius: 40px; text-decoration: none; font-weight: 700; transition: transform 0.2s; }
.btn-catalog:hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(37,99,235,0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 768px) {
  .orders-page { padding: 24px 16px; }
  .header-section { flex-direction: column; align-items: flex-start; }
  .info-row { flex-direction: column; align-items: stretch; }
  .pay-btn { text-align: center; }
  .order-footer { flex-direction: column; align-items: stretch; }
  .footer-actions { flex-direction: column; }
  .reorder-btn, .cancel-order-btn { width: 100%; text-align: center; }
  .item-row { flex-wrap: wrap; }
  .item-price { margin-left: auto; }
}
</style>