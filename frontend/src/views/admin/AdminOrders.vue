<template>
  <div class="admin-orders">
    <!-- ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>📦 Управление заказами</h1>
        <p class="subtitle">Интеллектуальная логистика: расчет по формуле гаверсинусов (БД RPC)</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Всего: <b>{{ filteredOrders.length }}</b>
      </div>
    </div>

    <!-- 1. КОНСТРУКТОР НОВОГО ЗАКАЗА -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Конструктор нового заказа</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createOrder" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>👤 Выберите клиента</label>
            <select v-model="newOrder.user_id" class="form-input">
              <option :value="null">-- Оформить как гостя --</option>
              <option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.last_name || '' }} {{ u.first_name }} ({{ u.email || u.phone_number }})
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>📍 Пункт выдачи (ПВЗ)</label>
            <select v-model="newOrder.warehouse_id" required class="form-input" @change="handleWarehouseChange">
              <option :value="null">-- Выберите склад/ПВЗ --</option>
              <option v-for="w in warehouses" :key="w.id" :value="w.id">
                {{ w.cities?.name || w.city_name }} — {{ w.address }}
              </option>
            </select>
          </div>

          <div class="input-group">
            <label>💳 Способ оплаты</label>
            <select v-model="newOrder.payment_method" class="form-input">
              <option value="card">Банковская карта</option>
              <option value="cash">Наличные / QR</option>
            </select>
          </div>
        </div>

        <!-- ТОВАРЫ В КОНСТРУКТОРЕ -->
        <div class="products-selector-section glass-card">
          <h4>🛒 Состав чека:</h4>
          <div v-for="(item, index) in selectedProducts" :key="index" class="selector-row-advanced glass-card">
            <div class="sel-main">
                <select v-model="item.product_id" @change="updateItemData(index)" class="form-input prod-select">
                    <option :value="null">-- Выберите товар --</option>
                    <option v-for="p in products" :key="p.id" :value="p.id">
                        {{ p.name }} | Арт: {{ p.sku }} | ({{ p.weight_kg }} кг)
                    </option>
                </select>
                <div class="item-sub-info" v-if="item.product_id">
                    <span>Вес ед.: <b>{{ item.weight }} кг</b></span>
                    <span>Цена ед.: <b>{{ item.price.toLocaleString() }} ₽</b></span>
                    <span :class="item.isLocal ? 'status-local' : 'status-intercity'">
                      {{ item.isLocal ? '📍 В наличии в городе' : `🚚 Межгород (~${item.distance || 0} км)` }}
                    </span>
                </div>
            </div>
            
            <div class="sel-qty">
                <label>Кол-во:</label>
                <input v-model.number="item.quantity" type="number" min="1" @input="autoCalcShipping" class="form-input qty-input" />
            </div>

            <div class="sel-total">
                <div class="st-price">{{ (item.price * item.quantity).toLocaleString() }} ₽</div>
                <div class="st-weight">{{ (item.weight * item.quantity).toFixed(1) }} кг</div>
            </div>

            <button type="button" @click="removeProductFromNewOrder(index)" class="btn-remove-char">✕</button>
          </div>
          
          <button type="button" @click="addProductToNewOrder" class="btn-add-prod">
            ➕ Добавить позицию
          </button>
        </div>

        <!-- ИТОГИ КОНСТРУКТОРА -->
        <div class="constructor-footer glass-card">
          <div class="summary-pills">
            <div class="pill">Общий вес: <strong>{{ totals.weight.toFixed(1) }} кг</strong></div>
            <div class="pill">Товаров на: <strong>{{ totals.itemsPrice.toLocaleString() }} ₽</strong></div>
          </div>

          <div class="shipping-adjustment">
            <label>🚚 Стоимость доставки:</label>
            <div class="ship-input-wrap">
                <input v-model.number="newOrder.shipping_cost" type="number" class="shipping-input-main" />
                <span class="currency">₽</span>
            </div>
          </div>

          <div class="grand-total">
            <label>ИТОГО К ОПЛАТЕ</label>
            <div class="total-val">{{ (totals.itemsPrice + newOrder.shipping_cost).toLocaleString() }} ₽</div>
          </div>
          
          <button type="submit" class="btn-primary-lg" :disabled="selectedProducts.length === 0 || !newOrder.warehouse_id">
            ✅ Создать заказ
          </button>
        </div>
      </form>
    </section>

    <!-- ТАБЛИЦА ЗАКАЗОВ -->
    <div class="table-container">
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">Заказ / Дата</th>
              <th>Клиент</th>
              <th>Финансы</th>
              <th>Логистика</th>
              <th>Оплата</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="order in paginatedOrders" :key="order.id">
              <tr class="order-row-main" :class="{ 'is-expanded': expandedOrder === order.id }">
                <td class="col-id">
                  <div class="order-id-badge">#{{ order.id }}</div>
                  <div class="date-sub">{{ formatDate(order.created_at) }}</div>
                </td>
                <td>
                  <div class="user-cell">
                    <strong>{{ getUserFullName(order) }}</strong>
                    <small>{{ order.customer_email || order.customer_phone }}</small>
                  </div>
                </td>
                <td>
                  <div class="price-edit-group">
                    <div class="edit-row"><span>📦 Т-ры:</span> {{ order.total_price - order.shipping_cost }} ₽</div>
                    <div class="edit-row shipping"><span>🚚 Дост:</span> {{ order.shipping_cost }} ₽</div>
                  </div>
                </td>
                <td>
                  <select v-model="order.delivery_status" @change="updateOrderStatus(order)" class="status-select" :class="order.delivery_status">
                    <option value="processing">Обработка</option>
                    <option value="shipping">В пути</option>
                    <option value="delivered">Выдан</option>
                    <option value="cancelled">Отменен</option>
                  </select>
                </td>
                <td>
                  <select v-model="order.payment_status" @change="updateOrderStatus(order)" class="status-select" :class="order.payment_status">
                    <option value="unpaid">Не оплачен</option>
                    <option value="paid">Оплачен</option>
                    <option value="refunded">Возврат</option>
                  </select>
                </td>
                <td class="text-right">
                  <div class="btn-group-row">
                    <button @click="toggleItems(order.id)" class="btn-action-circle" :class="{ 'active': expandedOrder === order.id }">
                      {{ expandedOrder === order.id ? '✕' : '👁️' }}
                    </button>
                    <button @click="deleteOrder(order.id)" class="btn-delete-small">🗑️</button>
                  </div>
                </td>
              </tr>

              <tr v-if="expandedOrder === order.id" class="expand-row">
                <td colspan="6">
                  <div class="order-detail-view glass-card">
                    <div class="detail-grid">
                      <div class="detail-column">
                        <h4 class="detail-title">👤 Получатель</h4>
                        <p><b>Имя:</b> {{ order.customer_name }}</p>
                        <p><b>Тел:</b> {{ order.customer_phone }}</p>
                        <p><b>Email:</b> {{ order.customer_email || '—' }}</p>
                      </div>
                      <div class="detail-column">
                        <h4 class="detail-title">📍 Доставка</h4>
                        <p><b>Адрес:</b> {{ order.delivery_address }}</p>
                        <p><b>Метод:</b> {{ order.payment_method }}</p>
                      </div>
                      <div class="detail-column">
                        <h4 class="detail-title">💰 Итого</h4>
                        <p><b>Сумма:</b> {{ order.total_price }} ₽</p>
                        <p><b>Доставка:</b> {{ order.shipping_cost }} ₽</p>
                      </div>
                    </div>

                    <h4 class="detail-title" style="margin-top: 20px;">🛒 Состав</h4>
                    <div class="items-grid-pro">
                      <div v-for="item in getOrderItems(order.id)" :key="item.id" class="item-row-pro glass-card">
                        <img :src="getProductData(item.product_id).images?.[0] || '/assets/images/no-photo.png'" class="ipro-img" />
                        <div class="ipro-info">
                          <div class="ipro-name">{{ getProductData(item.product_id).name }}</div>
                          <div class="ipro-meta">
                            <span class="qty-badge">{{ item.quantity }} шт.</span>
                            <span class="price-tag">× {{ item.unit_price }} ₽</span>
                          </div>
                        </div>
                        <div class="ipro-sum">{{ (item.quantity * item.unit_price).toLocaleString() }} ₽</div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';
import { supabase } from '@/supabase';

const appStore = useAppStore();

const API_URL = import.meta.env.VITE_API_URL || ''; 

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const orders = ref([]);
const users = ref([]);
const products = ref([]);
const warehouses = ref([]);
const orderItems = ref([]);
const productStocks = ref([]);

const expandedOrder = ref(null);
const currentPage = ref(1);
const itemsPerPage = 15;

const filters = reactive({ query: '', deliveryStatus: 'all', paymentStatus: 'all', sort: 'new' });
const selectedProducts = ref([]);
const newOrder = reactive({ user_id: null, warehouse_id: null, delivery_address: '', payment_method: 'card', shipping_cost: 0 });

const handleWarehouseChange = () => {
  updateAddressFromWarehouse();
  autoCalcShipping(); 
};

const addProductToNewOrder = () => selectedProducts.value.push({ product_id: null, quantity: 1, price: 0, weight: 0, isLocal: true, distance: 0 });
const removeProductFromNewOrder = (index) => { selectedProducts.value.splice(index, 1); autoCalcShipping(); };

const updateItemData = (index) => {
    const item = selectedProducts.value[index];
    const prod = products.value.find(p => p.id === item.product_id);
    if (prod) {
        item.price = prod.discount_price || prod.price;
        item.weight = Number(prod.weight_kg) || 0;
    }
    autoCalcShipping();
};

// ---- Функция расчёта доставки через RPC с обновлением isLocal/distance ----
const autoCalcShipping = async () => {
    if (!newOrder.warehouse_id || selectedProducts.value.length === 0) {
        newOrder.shipping_cost = 0;
        return;
    }

    const itemsForRpc = selectedProducts.value
        .filter(item => item.product_id)
        .map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));

    if (itemsForRpc.length === 0) {
        newOrder.shipping_cost = 0;
        return;
    }

    try {
        // Вызов через сервер, чтобы обойти права анонимного ключа
        const res = await axios.post(`${API_URL}/api/calculate-shipping`, {
            warehouse_id: newOrder.warehouse_id,
            items: itemsForRpc
        }, config);

        const result = res.data;   // { total: 6780.2, details: [...] }

        newOrder.shipping_cost = result.total;

        // Обновляем флаги и дистанции позиций
        let detailIndex = 0;
        selectedProducts.value.forEach(item => {
            if (!item.product_id) return;
            const detail = result.details[detailIndex];
            if (detail) {
                item.distance = detail.distance_km || 0;
                item.isLocal = item.distance === 0;
            }
            detailIndex++;
        });
    } catch (e) {
        console.error('Ошибка расчёта доставки:', e);
        newOrder.shipping_cost = 0;
    }
};

const updateAddressFromWarehouse = () => {
  const wh = warehouses.value.find(w => w.id === newOrder.warehouse_id);
  if (wh) newOrder.delivery_address = `${wh.cities?.name || wh.city_name}, ${wh.address}`;
};

const totals = computed(() => {
    let itemsPrice = 0; let weight = 0;
    selectedProducts.value.forEach(item => { itemsPrice += item.price * item.quantity; weight += item.weight * item.quantity; });
    return { itemsPrice, weight };
});

const loadData = async () => {
  try {
    const [oRes, uRes, pRes, iRes, wRes, sRes] = await Promise.all([
      axios.get(`/api/admin/orders`, config), 
      axios.get(`/api/admin/users`, config),
      axios.get(`/api/admin/products`, config), 
      axios.get(`/api/admin/order_items`, config),
      axios.get(`/api/admin/warehouses`, config),
      axios.get(`/api/admin/product_stocks`, config)
    ]);
    orders.value = oRes.data; users.value = uRes.data; products.value = pRes.data;
    orderItems.value = iRes.data; warehouses.value = wRes.data;
    productStocks.value = sRes.data;
  } catch (e) { console.error("Ошибка загрузки данных"); }
};

const getUserFullName = (order) => {
    const u = users.value.find(user => user.id === order.user_id);
    return u ? `${u.last_name || ''} ${u.first_name}`.trim() : (order.customer_name || 'Гость');
};
const getProductData = (id) => products.value.find(p => p.id === id) || {};
const getOrderItems = (orderId) => orderItems.value.filter(item => item.order_id === orderId);

const createOrder = async () => {
  try {
    const user = users.value.find(u => u.id === newOrder.user_id) || {};
    const itemsForServer = selectedProducts.value.map(item => ({ product_id: item.product_id, quantity: item.quantity }));
    const payload = { 
        ...newOrder, 
        customer_name: `${user.last_name || ''} ${user.first_name || 'Гость'}`.trim(),
        customer_phone: user.phone_number || 'не указан',
        customer_email: user.email || '',
        customer_city: appStore.city,
        items: itemsForServer,
        total_price: totals.value.itemsPrice + newOrder.shipping_cost
    };
    const res = await axios.post(`/api/orders`, payload, config);
    alert(`Заказ №${res.data.orderId} создан!`);
    selectedProducts.value = [];
    await loadData();
  } catch (e) { alert('Ошибка: ' + (e.response?.data?.error || e.message)); }
};

const updateOrderStatus = async (order) => {
    try {
        await axios.patch(`/api/admin/orders/${order.id}/status`, {
            delivery_status: order.delivery_status,
            payment_status: order.payment_status
        }, config);
    } catch (e) { alert("Ошибка обновления"); }
};

const deleteOrder = async (id) => {
  if (confirm('Удалить заказ?')) {
    try {
        await axios.delete(`/api/admin/orders/${id}`, config);
        orders.value = orders.value.filter(o => o.id !== id);
    } catch (e) { alert("Ошибка при удалении"); }
  }
};

const formatDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const toggleItems = (id) => expandedOrder.value = expandedOrder.value === id ? null : id;

const filteredOrders = computed(() => {
    let res = [...orders.value];
    if (filters.query) {
        const q = filters.query.toLowerCase();
        res = res.filter(o => o.id.toString() === q || (o.customer_name && o.customer_name.toLowerCase().includes(q)));
    }
    if (filters.deliveryStatus !== 'all') res = res.filter(o => o.delivery_status === filters.deliveryStatus);
    if (filters.paymentStatus !== 'all') res = res.filter(o => o.payment_status === filters.paymentStatus);
    if (filters.sort === 'new') res.sort((a, b) => b.id - a.id);
    return res;
});

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage));
const paginatedOrders = computed(() => filteredOrders.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

onMounted(loadData);
</script>

<style scoped>
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-orders { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-orders { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 { font-size: 2.2rem; font-weight: 900; background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.glass-card { background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); backdrop-filter: blur(8px); }
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; }

.admin-card { padding: 28px; margin-bottom: 32px; }
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 28px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); margin-bottom: 8px; display: block; }

.form-input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); transition: all 0.3s; box-sizing: border-box; }
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }

.products-selector-section { background: rgba(0,0,0,0.02); padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.selector-row-advanced { display: flex; gap: 15px; align-items: center; padding: 15px; background: var(--bg-card, #fff); margin-bottom: 12px; }
.item-sub-info { font-size: 11px; color: var(--text-muted, #94a3b8); display: flex; gap: 15px; margin-top: 5px; }
.status-local { color: var(--success, #10b981); font-weight: 700; }
.status-intercity { color: var(--warning, #f59e0b); font-weight: 700; }

.constructor-footer { display: grid; grid-template-columns: 1fr 1.5fr 1fr auto; gap: 30px; align-items: center; padding: 25px; background: rgba(0,0,0,0.02); }
.pill { padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid var(--border-color); }
.total-val { font-size: 2rem; font-weight: 900; color: var(--primary, #2563eb); }

.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }

.order-detail-view { padding: 25px; border-top: 4px solid var(--primary, #2563eb); margin: 15px 25px 30px; }
.detail-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
.detail-title { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; color: var(--primary, #2563eb); margin-bottom: 15px; }
.detail-column p { font-size: 0.9rem; margin-bottom: 8px; }

.item-row-pro { display: flex; align-items: center; gap: 20px; padding: 15px; margin-bottom: 10px; background: rgba(0,0,0,0.02); }
.ipro-img { width: 50px; height: 50px; object-fit: contain; background: #fff; border-radius: 8px; padding: 4px; }
.ipro-name { font-weight: 800; font-size: 0.95rem; }
.ipro-meta { display: flex; gap: 15px; font-size: 0.75rem; color: var(--text-muted); margin-top: 5px; }
.ipro-sum { font-weight: 900; font-size: 1.1rem; color: var(--primary); }

.status-select { padding: 8px 14px; border-radius: 30px; font-weight: 800; font-size: 0.7rem; border: none; cursor: pointer; }
.status-select.processing { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.status-select.shipping { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.status-select.delivered { background: rgba(16, 185, 129, 0.1); color: #059669; }

.btn-primary-lg { background: var(--primary); color: white; border: none; padding: 16px 32px; border-radius: 8px; font-weight: 800; cursor: pointer; }
.btn-action-circle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color); background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-delete-small { color: var(--danger); background: none; border: none; font-size: 1.2rem; cursor: pointer; }

@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } .constructor-footer { grid-template-columns: 1fr; } }
</style>