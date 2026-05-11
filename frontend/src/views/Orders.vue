<template>
  <div class="orders-page animate-fade-in">
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

    <!-- ЗАГРУЗКА -->
    <div v-if="loading" class="text-center py-20">
      <span class="spinner" style="width: 50px; height: 50px; border-width: 4px;"></span>
      <p class="text-muted mt-3 font-bold">Загружаем историю...</p>
    </div>

    <div v-else class="orders-list">
      <!-- ПУСТОЕ СОСТОЯНИЕ -->
      <div
        v-if="filteredOrders.length === 0"
        class="empty-state glass-card text-center p-10"
      >
        <div class="empty-state-icon">📂</div>
        <h3>Заказов в этой категории не найдено.</h3>
        <p>Попробуйте выбрать другой фильтр или оформите новый заказ.</p>
        <router-link to="/catalog" class="btn btn-primary"
          >Перейти в каталог</router-link
        >
      </div>

      <!-- КАРТОЧКА ЗАКАЗА -->
      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card glass-card"
        :class="{ 'cancelled-order': order.delivery_status === 'cancelled' }"
      >
        <div class="order-header">
          <div class="order-meta">
            <span class="order-number">Заказ №{{ order.id }}</span>
            <span class="order-date">от {{ formatDate(order.created_at) }}</span>
          </div>
          <div class="order-statuses">
            <span
              :style="getDeliveryStatusStyle(order.delivery_status)"
              class="badge"
            >
              {{ translateDelivery(order.delivery_status) }}
            </span>
            <span
              :style="getPaymentStatusStyle(order.payment_status)"
              class="badge payment-badge"
            >
              {{ translatePaymentStatus(order.payment_status) }}
            </span>
          </div>
        </div>

        <div class="order-delivery-info">
          <span class="pin-icon">📍</span>
          <b>Адрес получения:</b> {{ order.delivery_address }}
        </div>

        <!-- БЛОК ОПЛАТЫ (если не оплачен) -->
        <div
          v-if="
            order.payment_status === 'unpaid' &&
            order.delivery_status !== 'cancelled'
          "
          class="management-box"
        >
          <div class="payment-row">
            <span
              >Способ оплаты:
              <strong>{{
                order.payment_method === 'card'
                  ? 'Картой онлайн'
                  : 'При получении'
              }}</strong></span
            >
            <button
              @click="openPaymentModal(order)"
              class="btn btn-primary pay-btn"
            >
              💳 Оплатить {{ order.total_price }} ₽
            </button>
          </div>
        </div>

        <!-- СПИСОК ТОВАРОВ -->
        <div class="order-items">
          <div
            v-for="item in order.order_items"
            :key="item.id"
            class="item-row"
          >
            <router-link
              :to="'/product/' + item.product_id"
              class="item-img-link"
            >
              <img
                :src="
                  item.products?.images?.[0] ||
                  '/assets/images/no-image.png'
                "
              />
            </router-link>
            <div class="item-info">
              <router-link
                :to="'/product/' + item.product_id"
                class="item-name"
              >
                {{ item.products?.name || 'Товар удален' }}
              </router-link>
              <div class="item-details">
                {{ item.quantity }} шт. × {{ item.unit_price }} ₽
              </div>
            </div>
            <div class="item-price">
              {{ item.unit_price * item.quantity }} ₽
            </div>
          </div>
        </div>

        <!-- ФУТЕР КАРТОЧКИ -->
        <div class="order-footer">
          <div class="total-sum">
            Итого: <strong>{{ order.total_price }} ₽</strong>
          </div>
          <div class="footer-actions">
            <button @click="reorder(order)" class="btn btn-outline btn-sm">
              🔄 Повторить
            </button>

            <!-- Кнопка возврата -->
            <button
              v-if="
                order.delivery_status === 'delivered' &&
                order.payment_status === 'paid'
              "
              @click="openReturnModal(order)"
              class="btn btn-outline btn-sm text-warning"
            >
              ↩️ Возврат
            </button>

            <!-- Кнопка отмены -->
            <button
              v-if="
                ![
                  'delivered',
                  'cancelled',
                  'returned',
                  'ready_for_pickup',
                ].includes(order.delivery_status)
              "
              @click="cancelOrder(order)"
              class="btn btn-danger btn-sm"
            >
              Отменить
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- МОДАЛКА: ПОДТВЕРЖДЕНИЕ ОПЛАТЫ -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showPaymentModal"
          class="modal-overlay"
          @click.self="closePaymentModal"
        >
          <div class="modal-card glass-card">
            <button class="modal-close" @click="closePaymentModal">✕</button>
            <h2>Оплата заказа №{{ selectedOrder?.id }}</h2>
            <div class="modal-body">
              <p>
                Сумма к оплате:
                <strong>{{ selectedOrder?.total_price }} ₽</strong>
              </p>
              <p>
                Средства будут списаны с вашей карты. Подтвердить операцию?
              </p>
              <div class="modal-actions">
                <button
                  @click="confirmPayment"
                  class="btn btn-primary btn-lg"
                  :disabled="loadingPayment"
                >
                  <span
                    v-if="loadingPayment"
                    class="spinner btn-spinner"
                  ></span>
                  Подтвердить оплату
                </button>
                <button @click="closePaymentModal" class="btn btn-outline btn-lg">
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- МОДАЛКА: ОФОРМЛЕНИЕ ВОЗВРАТА -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showReturnModal"
          class="modal-overlay"
          @click.self="closeReturnModal"
        >
          <div class="modal-card glass-card">
            <button class="modal-close" @click="closeReturnModal">✕</button>
            <h2>Заявка на возврат №{{ selectedOrder?.id }}</h2>
            <div class="modal-body">
              <p class="text-muted mb-4">
                Укажите причину возврата товара. Наш менеджер свяжется с вами
                после проверки.
              </p>

              <div class="form-group">
                <label>📝 Причина возврата</label>
                <textarea
                  v-model="returnReason"
                  class="return-textarea"
                  rows="4"
                  placeholder="Опишите дефект или причину, почему товар не подошел..."
                ></textarea>
              </div>

              <div class="modal-actions">
                <button
                  @click="submitReturnRequest"
                  class="btn btn-primary btn-lg"
                  :disabled="
                    !returnReason || returnReason.length < 5 || loadingReturn
                  "
                >
                  <span
                    v-if="loadingReturn"
                    class="spinner btn-spinner"
                  ></span>
                  Отправить заявку
                </button>
                <button
                  @click="closeReturnModal"
                  class="btn btn-outline btn-lg"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useCartStore } from '@/stores/cartStore';

const cartStore = useCartStore();
const orders = ref([]);
const loading = ref(true);
const activeTab = ref('all');

const showPaymentModal = ref(false);
const showReturnModal = ref(false);
const selectedOrder = ref(null);
const returnReason = ref('');
const loadingPayment = ref(false);
const loadingReturn = ref(false);

const tabs = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'В работе' },
  { id: 'completed', label: 'Выданы' },
  { id: 'unpaid', label: 'Оплата' },
  { id: 'cancelled', label: 'Отмена/Возврат' },
];

const loadOrders = async () => {
  const userId = localStorage.getItem('user_id');
  if (!userId) {
    loading.value = false;
    return;
  }
  try {
    const res = await axios.get(
      `${import.meta.env.VITE_API_URL || ''}/api/orders/${userId}`
    );
    orders.value = res.data;
  } catch (e) {
    console.error('Ошибка загрузки заказов:', e);
  } finally {
    loading.value = false;
  }
};

const openPaymentModal = (order) => {
  selectedOrder.value = order;
  showPaymentModal.value = true;
};
const closePaymentModal = () => {
  showPaymentModal.value = false;
  selectedOrder.value = null;
  loadingPayment.value = false;
};
const confirmPayment = async () => {
  loadingPayment.value = true;
  try {
    await axios.post(
      `${import.meta.env.VITE_API_URL || ''}/api/payment/confirm`,
      {
        orderId: selectedOrder.value.id,
      }
    );
    selectedOrder.value.payment_status = 'paid';
    selectedOrder.value.payment_method = 'card';
    closePaymentModal();
    alert('Заказ успешно оплачен!');
  } catch (e) {
    alert(
      'Ошибка: ' +
        (e.response?.data?.error || 'Не удалось провести оплату')
    );
  } finally {
    loadingPayment.value = false;
  }
};

const openReturnModal = (order) => {
  selectedOrder.value = order;
  showReturnModal.value = true;
};
const closeReturnModal = () => {
  showReturnModal.value = false;
  returnReason.value = '';
  loadingReturn.value = false;
};
const submitReturnRequest = async () => {
  loadingReturn.value = true;
  const userId = localStorage.getItem('user_id');
  try {
    await axios.post(
      `${import.meta.env.VITE_API_URL || ''}/api/orders/${selectedOrder.value.id}/return`,
      { reason: returnReason.value },
      { headers: { 'x-user-id': userId } }
    );
    alert('Заявка на возврат создана. Следите за статусом в уведомлениях.');
    closeReturnModal();
    loadOrders();
  } catch (e) {
    alert(e.response?.data?.error || 'Ошибка при создании заявки');
  } finally {
    loadingReturn.value = false;
  }
};

const cancelOrder = async (order) => {
  if (!confirm('Вы уверены, что хотите отменить заказ?')) return;
  const userId = localStorage.getItem('user_id');
  try {
    await axios.patch(
      `${import.meta.env.VITE_API_URL || ''}/api/orders/${order.id}`,
      { delivery_status: 'cancelled' },
      { headers: { 'x-user-id': userId } }
    );
    order.delivery_status = 'cancelled';
    alert('Заказ отменен');
  } catch (e) {
    alert(e.response?.data?.error || 'Ошибка отмены');
  }
};

const reorder = (order) => {
  order.order_items.forEach((item) => {
    if (item.products) {
      cartStore.addToCart({ ...item.products, price: item.unit_price });
    }
  });
  alert('Товары добавлены в корзину');
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const translateDelivery = (s) =>
  ({
    processing: 'В обработке',
    shipping: 'Доставляется',
    ready_for_pickup: 'Готов к выдаче',
    delivered: 'Получен',
    cancelled: 'Отменен',
    returned: 'Возврат',
  }[s] || s);

const translatePaymentStatus = (s) =>
  ({
    paid: 'Оплачен ✅',
    unpaid: 'Ожидает оплаты',
    refunded: 'Возврат средств',
  }[s] || s);

const getDeliveryStatusStyle = (s) => {
  if (['cancelled', 'returned'].includes(s))
    return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
  if (s === 'delivered')
    return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
  if (s === 'ready_for_pickup')
    return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' };
  return { background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' };
};

const getPaymentStatusStyle = (s) =>
  s === 'paid'
    ? { color: '#10b981' }
    : { color: '#f59e0b' };

const filteredOrders = computed(() => {
  const list = orders.value;
  if (activeTab.value === 'active')
    return list.filter(
      (o) => !['delivered', 'cancelled', 'returned'].includes(o.delivery_status)
    );
  if (activeTab.value === 'completed')
    return list.filter((o) => o.delivery_status === 'delivered');
  if (activeTab.value === 'unpaid')
    return list.filter(
      (o) =>
        o.payment_status === 'unpaid' && o.delivery_status !== 'cancelled'
    );
  if (activeTab.value === 'cancelled')
    return list.filter((o) =>
      ['cancelled', 'returned'].includes(o.delivery_status)
    );
  return list;
});

onMounted(loadOrders);
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ ЗАКАЗОВ (глобальный CSS используется)
   ========================================================================== */

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  position: relative;
  max-width: 480px;
  width: 90%;
  padding: 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1));
}
.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-muted);
}
.modal-body p {
  margin-bottom: 1rem;
}
.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 1.5rem;
}

/* Анимация модалки */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.orders-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px;
}

/* Шапка */
.header-section {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}
.header-section h1 {
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-main);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  font-weight: 600;
  color: var(--primary);
  transition: all 0.2s;
}
.back-link:hover {
  transform: translateX(-6px);
  text-decoration: underline;
}

/* Табы */
.status-tabs {
  display: flex;
  gap: 10px;
  padding: 8px;
  margin-bottom: 32px;
  overflow-x: auto;
  scrollbar-width: thin;
}
.status-tabs::-webkit-scrollbar {
  height: 4px;
}
.status-tabs button {
  white-space: nowrap;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.status-tabs button:hover {
  background: var(--primary-light);
  color: var(--primary);
  transform: translateY(-2px);
}
.status-tabs button.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);
}

/* Карточка заказа */
.order-card {
  padding: 28px;
  margin-bottom: 28px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.order-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
}
.order-card.cancelled-order {
  opacity: 0.7;
  background: rgba(239, 68, 68, 0.03);
  border-left: 4px solid var(--danger);
}
:global(.dark) .order-card.cancelled-order {
  background: rgba(239, 68, 68, 0.05);
}

/* Заголовок заказа */
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}
.order-number {
  display: block;
  font-weight: 800;
  font-size: 1.25rem;
  color: var(--text-main);
  letter-spacing: -0.3px;
}
.order-date {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-left: 12px;
  font-weight: 500;
}

.order-statuses {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* Бейджи статусов (используем глобальный .badge с переопределением фона) */
.badge {
  padding: 6px 14px;
  border-radius: 40px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.payment-badge {
  border: 1px solid currentColor;
  background: transparent !important;
}

/* Информация о доставке */
.order-delivery-info {
  font-size: 0.95rem;
  padding: 12px 18px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  color: var(--text-main);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 8px;
}
:global(.dark) .order-delivery-info {
  background: rgba(255, 255, 255, 0.02);
  border-color: #334155;
  color: #e2e8f0;
}
.pin-icon {
  font-size: 1.1rem;
}

/* Блок управления оплатой */
.management-box {
  background: rgba(245, 158, 11, 0.05);
  padding: 16px 20px;
  border-radius: var(--radius-md);
  margin-bottom: 24px;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
:global(.dark) .management-box {
  background: rgba(245, 158, 11, 0.1);
}

.payment-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.payment-row strong {
  color: var(--text-main);
  font-size: 1rem;
}

.pay-btn {
  padding: 12px 24px;
  border-radius: 40px;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  white-space: nowrap;
}

/* Товары в заказе */
.order-items {
  margin: 20px 0;
}
.item-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.2s;
}
:global(.dark) .item-row {
  border-color: #334155;
}
.item-row:last-child {
  border-bottom: none;
}

.item-img-link img {
  width: 60px;
  height: 60px;
  object-fit: contain;
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 4px;
  transition: transform 0.3s;
}
:global(.dark) .item-img-link img {
  border-color: #334155;
}
.item-img-link img:hover {
  transform: scale(1.1);
  border-color: var(--primary);
}

.item-info {
  flex: 1;
}
.item-name {
  display: inline-block;
  font-weight: 700;
  color: var(--text-main);
  text-decoration: none;
  font-size: 1rem;
  transition: color 0.2s;
}
.item-name:hover {
  color: var(--primary);
  text-decoration: underline;
}
.item-details {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
  font-weight: 500;
}

.item-price {
  font-weight: 800;
  font-size: 1rem;
  color: var(--text-main);
  white-space: nowrap;
}

/* Футер заказа */
.order-footer {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px dashed var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}
:global(.dark) .order-footer {
  border-color: #475569;
}

.total-sum {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-muted);
}
.total-sum strong {
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--primary);
  margin-left: 8px;
}
:global(.dark) .total-sum strong {
  color: #60a5fa;
}

.footer-actions {
  display: flex;
  gap: 12px;
}

/* Возврат и модалки */
.return-textarea {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-input);
  margin-top: 10px;
  resize: none;
  color: var(--text-main);
}

/* Цвет оплачен в тёмной теме */
:global(.dark) .payment-badge {
  color: #4ade80 !important;
  border-color: #4ade80 !important;
}

@media (max-width: 768px) {
  .orders-page {
    padding: 24px 16px;
  }
  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }
  .payment-row {
    flex-direction: column;
    align-items: stretch;
  }
  .order-footer {
    flex-direction: column;
    align-items: stretch;
  }
  .footer-actions {
    flex-direction: column;
  }
}
</style>