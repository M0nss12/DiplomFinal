<template>
  <div class="admin-orders">
    <!-- ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>📦 Управление заказами</h1>
        <p class="subtitle">Конструктор и мониторинг: авторасчет логистики (800 ₽ + перевес > 10кг).</p>
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
            <select v-model="newOrder.warehouse_id" required class="form-input" @change="updateAddressFromWarehouse">
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
            <small v-if="totals.weight > 10" class="weight-warning">
                ⚠️ Перевес {{ (totals.weight - 10).toFixed(1) }} кг (+{{ Math.ceil(totals.weight - 10) * 50 }} ₽)
            </small>
          </div>

          <div class="grand-total">
            <label>ИТОГО</label>
            <div class="total-val">{{ (totals.itemsPrice + newOrder.shipping_cost).toLocaleString() }} ₽</div>
          </div>
          
          <button type="submit" class="btn-primary-lg" :disabled="selectedProducts.length === 0 || !newOrder.warehouse_id">
            ✅ Создать заказ
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск и фильтрация</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid-pro">
        <div class="input-group">
          <label>🔎 Поиск</label>
          <input v-model="filters.query" placeholder="ФИО, № заказа, Email..." class="form-input" />
        </div>
        
        <div class="input-group">
          <label>🚚 Доставка</label>
          <select v-model="filters.deliveryStatus" class="form-input">
            <option value="all">Все статусы</option>
            <option value="processing">Обработка</option>
            <option value="shipping">В пути</option>
            <option value="delivered">Выдан</option>
            <option value="cancelled">Отменен</option>
          </select>
        </div>

        <div class="input-group">
          <label>💰 Оплата</label>
          <select v-model="filters.paymentStatus" class="form-input">
            <option value="all">Все</option>
            <option value="paid">Оплачен</option>
            <option value="unpaid">Не оплачен</option>
          </select>
        </div>

        <div class="input-group">
          <label>📊 Сортировка</label>
          <select v-model="filters.sort" class="form-input">
            <option value="new">Сначала новые</option>
            <option value="old">Сначала старые</option>
            <option value="price-desc">Дорогие сверху</option>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
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
                    <div class="edit-row"><span>📦 Т-ры:</span> <input v-model.number="order.total_price" type="number" @change="updateOrderStatus(order)" /></div>
                    <div class="edit-row shipping"><span>🚚 Дост:</span> <input v-model.number="order.shipping_cost" type="number" @change="updateOrderStatus(order)" /></div>
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
                  <div class="pay-method-small">{{ order.payment_method }}</div>
                </td>

                <td class="text-right">
                  <div class="btn-group-row">
                    <button @click="toggleItems(order.id)" class="btn-action-circle" :class="{ 'active': expandedOrder === order.id }">
                      🛒
                    </button>
                    <button @click="deleteOrder(order.id)" class="btn-delete-small">🗑️</button>
                  </div>
                </td>
              </tr>

              <!-- СОСТАВ ЗАКАЗА -->
              <tr v-if="expandedOrder === order.id" class="expand-row">
                <td colspan="6">
                  <div class="order-items-detail glass-card">
                    <h4>🛒 Перечень товаров (Заказ #{{ order.id }}):</h4>
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

    <!-- ПАГИНАЦИЯ -->
    <div v-if="totalPages > 1" class="pagination-wrapper">
        <button @click="currentPage--" :disabled="currentPage === 1" class="p-btn glass-card">←</button>
        <div class="p-numbers">
          <button v-for="page in totalPages" :key="page" @click="currentPage = page" class="glass-card" :class="{ active: currentPage === page }">{{ page }}</button>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="p-btn glass-card">→</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const orders = ref([]);
const users = ref([]);
const products = ref([]);
const warehouses = ref([]);
const orderItems = ref([]);

const expandedOrder = ref(null);
const currentPage = ref(1);
const itemsPerPage = 15;

const filters = reactive({ query: '', deliveryStatus: 'all', paymentStatus: 'all', sort: 'new' });
const selectedProducts = ref([]);
const newOrder = reactive({ user_id: null, warehouse_id: null, delivery_address: '', payment_method: 'card', shipping_cost: 800 });

// КОНСТРУКТОР
const addProductToNewOrder = () => selectedProducts.value.push({ product_id: null, quantity: 1, price: 0, weight: 0 });
const removeProductFromNewOrder = (index) => { selectedProducts.value.splice(index, 1); autoCalcShipping(); };
const updateItemData = (index) => {
    const item = selectedProducts.value[index];
    const prod = products.value.find(p => p.id === item.product_id);
    if (prod) {
        item.price = prod.discount_price || prod.price;
        item.weight = prod.weight_kg || 0;
    }
    autoCalcShipping();
};

const autoCalcShipping = () => {
    let w = 0;
    selectedProducts.value.forEach(i => w += (i.weight * i.quantity));
    let cost = 800;
    if (w > 10) cost += Math.ceil(w - 10) * 50;
    newOrder.shipping_cost = cost;
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
    const [oRes, uRes, pRes, iRes, wRes] = await Promise.all([
      axios.get(`${API_URL}/api/admin/orders`, config), 
      axios.get(`${API_URL}/api/admin/users`, config),
      axios.get(`${API_URL}/api/admin/products`, config), 
      axios.get(`${API_URL}/api/admin/order_items`, config),
      axios.get(`${API_URL}/api/admin/warehouses`, config)
    ]);
    orders.value = oRes.data; users.value = uRes.data; products.value = pRes.data;
    orderItems.value = iRes.data; warehouses.value = wRes.data;
  } catch (e) { console.error("Ошибка загрузки данных админки заказов"); }
};

// ХЕЛПЕРЫ
const getUserFullName = (order) => {
    if (order.customer_name) return order.customer_name;
    const u = users.value.find(user => user.id === order.user_id);
    return u ? `${u.last_name || ''} ${u.first_name}`.trim() : 'Гость';
};
const getProductData = (id) => products.value.find(p => p.id === id) || {};
const getOrderItems = (orderId) => orderItems.value.filter(item => item.order_id === orderId);

// API ДЕЙСТВИЯ
const createOrder = async () => {
  try {
    const user = users.value.find(u => u.id === newOrder.user_id) || {};
    const payload = { 
        ...newOrder, 
        customer_name: `${user.last_name || ''} ${user.first_name || 'Гость'}`.trim(),
        customer_phone: user.phone_number || 'не указан',
        customer_email: user.email || '',
        total_price: totals.value.itemsPrice + newOrder.shipping_cost, 
        payment_status: 'unpaid', 
        delivery_status: 'processing'
    };
    const res = await axios.post(`${API_URL}/api/orders`, payload, config);
    const orderId = res.data.orderId;
    
    // Добавляем товары через order_items (в реальности лучше делать это одним запросом, но следуем логике файла)
    for (const item of selectedProducts.value) {
        await axios.post(`${API_URL}/api/admin/order_items`, { order_id: orderId, product_id: item.product_id, quantity: item.quantity, unit_price: item.price }, config);
    }
    alert('Заказ создан!');
    await loadData();
    selectedProducts.value = [];
  } catch (e) { alert('Ошибка при создании заказа'); }
};

const updateOrderStatus = async (order) => {
    try {
        // Используем специальный эндпоинт для смены статуса (который шлет уведомления)
        await axios.patch(`${API_URL}/api/admin/orders/${order.id}/status`, {
            delivery_status: order.delivery_status,
            payment_status: order.payment_status
        }, config);
    } catch (e) { alert("Ошибка обновления статуса"); }
};

const deleteOrder = async (id) => {
  if (confirm('Удалить заказ навсегда?')) {
    try {
        await axios.delete(`${API_URL}/api/admin/orders/${id}`, config);
        orders.value = orders.value.filter(o => o.id !== id);
    } catch (e) { alert("Ошибка при удалении"); }
  }
};

const formatDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const toggleItems = (id) => expandedOrder.value = expandedOrder.value === id ? null : id;
const resetFilters = () => { filters.query = ''; filters.deliveryStatus = 'all'; filters.paymentStatus = 'all'; filters.sort = 'new'; };

// ФИЛЬТРАЦИЯ
const filteredOrders = computed(() => {
    let res = [...orders.value];
    if (filters.query) {
        const q = filters.query.toLowerCase();
        res = res.filter(o => o.id.toString() === q || (o.customer_name && o.customer_name.toLowerCase().includes(q)) || (o.customer_email && o.customer_email.toLowerCase().includes(q)));
    }
    if (filters.deliveryStatus !== 'all') res = res.filter(o => o.delivery_status === filters.deliveryStatus);
    if (filters.paymentStatus !== 'all') res = res.filter(o => o.payment_status === filters.paymentStatus);
    
    if (filters.sort === 'new') res.sort((a, b) => b.id - a.id);
    else if (filters.sort === 'price-desc') res.sort((a, b) => b.total_price - a.total_price);
    return res;
});

const totalPages = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage));
const paginatedOrders = computed(() => filteredOrders.value.slice((currentPage.value - 1) * itemsPerPage, currentPage.value * itemsPerPage));

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: ЗАКАЗЫ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */

@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-orders { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-orders { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; font-weight: 500; margin-top: 5px; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; }

/* ФОРМА */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 28px; }
.input-group { display: flex; flex-direction: column; gap: 8px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted, #64748b); }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }

/* КОНСТРУКТОР ТОВАРОВ */
.products-selector-section { background: rgba(0,0,0,0.01); padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.selector-row-advanced { display: flex; gap: 15px; align-items: center; padding: 15px; background: var(--bg-card, #fff); margin-bottom: 12px; }
.sel-main { flex: 1; }
.item-sub-info { font-size: 11px; color: var(--text-muted, #94a3b8); display: flex; gap: 15px; margin-top: 5px; }
.sel-qty { width: 80px; }
.sel-total { width: 110px; text-align: right; }
.st-price { font-weight: 800; color: var(--primary, #2563eb); }
.st-weight { font-size: 11px; color: var(--text-muted, #94a3b8); }

.btn-remove-char { background: rgba(239, 68, 68, 0.1); border: none; width: 32px; height: 32px; border-radius: 8px; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-remove-char:hover { background: var(--danger, #ef4444); color: white; }

.btn-add-prod { background: transparent; border: 2px dashed var(--primary, #2563eb); padding: 12px; border-radius: 8px; font-weight: 800; color: var(--primary, #2563eb); cursor: pointer; width: 100%; transition: 0.2s; }
.btn-add-prod:hover { background: rgba(37, 99, 235, 0.05); transform: translateY(-2px); }

/* ИТОГИ КОНСТРУКТОРА */
.constructor-footer { display: grid; grid-template-columns: 1fr 1.5fr 1fr auto; gap: 30px; align-items: center; padding: 25px; background: rgba(0,0,0,0.02); }
.summary-pills { display: flex; flex-direction: column; gap: 8px; }
.pill { padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 8px; font-size: 13px; font-weight: 600; border: 1px solid var(--border-color, #e2e8f0); }
.ship-input-wrap { position: relative; width: 120px; }
.shipping-input-main { width: 100%; padding: 10px; font-size: 1.2rem; font-weight: 900; border-radius: 8px; border: 2px solid var(--primary, #2563eb); background: var(--bg-card, #fff); color: var(--text-main, #0f172a); }
:global(.dark) .shipping-input-main { color: #f8fafc; }
.total-val { font-size: 2rem; font-weight: 900; color: var(--primary, #2563eb); }

.btn-primary-lg { background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none; padding: 16px 32px; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.btn-primary-lg:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1100px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.order-row-main:hover td { background: rgba(37, 99, 235, 0.02); }
.order-id-badge { background: var(--primary, #2563eb); color: white; padding: 4px 10px; border-radius: 30px; font-weight: 900; font-size: 0.8rem; }
.date-sub { font-size: 0.7rem; color: var(--text-muted, #94a3b8); margin-top: 5px; font-weight: 600; }

.user-cell strong { font-size: 0.95rem; display: block; color: var(--text-main, #0f172a); }
:global(.dark) .user-cell strong { color: #f8fafc; }
.user-cell small { color: var(--text-muted, #64748b); font-size: 0.8rem; }

.price-edit-group { display: flex; flex-direction: column; gap: 5px; }
.edit-row { font-size: 0.75rem; display: flex; align-items: center; gap: 8px; }
.edit-row input { width: 85px; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color, #cbd5e1); background: rgba(0,0,0,0.02); font-weight: 800; color: var(--text-main, #0f172a); }
:global(.dark) .edit-row input { background: rgba(255,255,255,0.05); color: #f8fafc; border-color: #475569; }

/* СТАТУСЫ */
.status-select { padding: 8px 14px; border-radius: 30px; font-weight: 800; font-size: 0.7rem; text-transform: uppercase; border: 1px solid transparent; cursor: pointer; transition: 0.2s; }
.status-select.processing { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.status-select.shipping { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.status-select.delivered { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-select.cancelled { background: rgba(239, 68, 68, 0.1); color: #dc2626; }
.status-select.paid { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid #10b981; }
.status-select.unpaid { background: rgba(239, 68, 68, 0.1); color: #dc2626; border: 1px solid #ef4444; }

.pay-method-small { font-size: 0.65rem; color: var(--text-muted, #94a3b8); margin-top: 5px; font-weight: 800; text-align: center; }

.btn-action-circle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); cursor: pointer; transition: 0.2s; display: inline-flex; align-items: center; justify-content: center; font-size: 1.1rem; }
:global(.dark) .btn-action-circle { background: #1e293b; border-color: #475569; }
.btn-action-circle.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: none; width: 36px; height: 36px; border-radius: 50%; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; font-size: 1.1rem; margin-left: 8px; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; }

/* СОСТАВ ЗАКАЗА В ТАБЛИЦЕ */
.expand-row td { background: rgba(0,0,0,0.01); padding: 20px !important; }
.order-items-detail { padding: 25px; border-top: 3px solid var(--primary, #2563eb); }
.items-grid-pro { display: flex; flex-direction: column; gap: 12px; }
.item-row-pro { display: flex; align-items: center; gap: 20px; padding: 12px 20px; background: rgba(255,255,255,0.5); }
:global(.dark) .item-row-pro { background: rgba(15, 23, 42, 0.5); }
.ipro-img { width: 50px; height: 50px; object-fit: contain; background: #fff; border-radius: 8px; padding: 4px; border: 1px solid var(--border-color, #e2e8f0); }
.ipro-name { font-weight: 800; font-size: 0.95rem; color: var(--text-main, #0f172a); }
:global(.dark) .ipro-name { color: #f8fafc; }
.ipro-meta { display: flex; gap: 15px; font-size: 0.75rem; color: var(--text-muted, #94a3b8); font-weight: 600; margin-top: 5px; }
.qty-badge { color: var(--primary, #2563eb); }
.ipro-sum { font-weight: 900; color: var(--text-main, #0f172a); font-size: 1.1rem; }
:global(.dark) .ipro-sum { color: #f8fafc; }

/* ПАГИНАЦИЯ */
.pagination-wrapper { display: flex; justify-content: center; align-items: center; gap: 15px; margin-top: 40px; }
.p-btn { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; cursor: pointer; font-size: 1.2rem; font-weight: 900; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card, #fff); color: var(--text-main, #0f172a); }
:global(.dark) .p-btn { background: #1e293b; border-color: #334155; color: #f8fafc; }
.p-btn:hover:not(:disabled) { border-color: var(--primary, #2563eb); color: var(--primary, #2563eb); background: rgba(37, 99, 235, 0.05); }

.p-numbers button { width: 44px; height: 44px; border-radius: 12px; font-weight: 800; cursor: pointer; transition: 0.2s; border: 1px solid var(--border-color, #cbd5e1); background: var(--bg-card, #fff); color: var(--text-muted, #64748b); }
:global(.dark) .p-numbers button { background: #1e293b; border-color: #334155; color: #94a3b8; }
.p-numbers button.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

/* АДАПТИВНОСТЬ */
@media (max-width: 1200px) { .filter-grid-pro { grid-template-columns: 1fr 1fr; } .constructor-footer { grid-template-columns: 1fr 1fr; } }
@media (max-width: 768px) {
  .admin-orders { padding: 24px 16px; }
  .header-row { flex-direction: column; align-items: flex-start; }
  .constructor-footer { grid-template-columns: 1fr; }
  .selector-row-advanced { flex-wrap: wrap; }
}
</style>