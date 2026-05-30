<template>
  <div class="admin-orders-dashboard animate-fade-in">
    <!-- ГЛОБАЛЬНАЯ ШАПКА -->
    <div class="header-row">
      <div class="header-left">
        <h1>📦 Управление заказами и логистикой</h1>
        <p class="subtitle">Полный цикл: от создания заказа до возвратов и аналитики</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">📊</span>
        Активных заказов: <b>{{ orders.filter(o => !['delivered','cancelled','returned'].includes(o.delivery_status)).length }}</b>
      </div>
    </div>

    <!-- НАВИГАЦИЯ ПО ВКЛАДКАМ -->
    <div class="admin-tabs glass-card">
      <button :class="{ active: currentTab === 'orders' }" @click="currentTab = 'orders'">📝 Заказы</button>
      <button :class="{ active: currentTab === 'sales' }" @click="currentTab = 'sales'">💰 Продажи (Позиции)</button>
      <button :class="{ active: currentTab === 'returns' }" @click="currentTab = 'returns'">📦 Возвраты ({{ pendingReturnsCount }})</button>
      <button :class="{ active: currentTab === 'history' }" @click="currentTab = 'history'">⏳ История статусов</button>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 1: ЗАКАЗЫ (Конструктор и таблица) — прежняя, без изменений -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'orders'">
      <!-- КОНСТРУКТОР НОВОГО ЗАКАЗА -->
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Конструктор нового заказа</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createOrder" class="admin-form">
          <div class="input-grid">
            <div class="form-group">
              <label>👤 Выберите клиента</label>
              <select v-model="newOrder.user_id">
                <option :value="null">-- Оформить как гостя --</option>
                <option v-for="u in users" :key="u.id" :value="u.id">
                  {{ u.last_name || '' }} {{ u.first_name }} ({{ u.email || u.phone_number }})
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>📍 Пункт выдачи (ПВЗ)</label>
              <select v-model="newOrder.warehouse_id" required @change="handleWarehouseChange">
                <option :value="null">-- Выберите склад/ПВЗ --</option>
                <option v-for="w in warehouses" :key="w.id" :value="w.id">
                  {{ w.cities?.name || w.city_name }} — {{ w.address }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>💳 Способ оплаты</label>
              <select v-model="newOrder.payment_method">
                <option value="card">Банковская карта</option>
                <option value="cash">Наличные / QR</option>
              </select>
            </div>
          </div>

          <div class="products-selector-section glass-card">
            <h4>🛒 Состав чека:</h4>
            <div v-for="(item, index) in selectedProducts" :key="index" class="selector-row-advanced glass-card">
              <div class="sel-main">
                <select v-model="item.product_id" @change="updateItemData(index)" class="prod-select">
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
                <input v-model.number="item.quantity" type="number" min="1" @input="autoCalcShipping" class="qty-input" />
              </div>
              <div class="sel-total">
                <div class="st-price">{{ (item.price * item.quantity).toLocaleString() }} ₽</div>
                <div class="st-weight">{{ (item.weight * item.quantity).toFixed(1) }} кг</div>
              </div>
              <button type="button" @click="removeProductFromNewOrder(index)" class="btn-remove-char">✕</button>
            </div>
            <button type="button" @click="addProductToNewOrder" class="btn btn-outline btn-sm mt-2">
              ➕ Добавить позицию
            </button>
          </div>

          <div class="constructor-footer glass-card">
            <div class="summary-pills">
              <div class="pill">Общий вес: <strong>{{ orderTotals.weight.toFixed(1) }} кг</strong></div>
              <div class="pill">Товаров на: <strong>{{ orderTotals.itemsPrice.toLocaleString() }} ₽</strong></div>
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
              <div class="total-val">{{ (orderTotals.itemsPrice + newOrder.shipping_cost).toLocaleString() }} ₽</div>
            </div>
            <button type="submit" class="btn btn-primary btn-lg" :disabled="selectedProducts.length === 0 || !newOrder.warehouse_id">
              ✅ Создать заказ
            </button>
          </div>
        </form>
      </section>

      <!-- ФИЛЬТРЫ И ТАБЛИЦА ЗАКАЗОВ -->
      <section class="admin-card filter-section glass-card">
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr 1fr;">
          <div class="form-group">
            <label>🔎 Поиск (Заказ или Клиент)</label>
            <input v-model="ordersFilters.query" placeholder="Введите ID или имя..." />
          </div>
          <div class="form-group">
            <label>🚚 Статус доставки</label>
            <select v-model="ordersFilters.deliveryStatus">
              <option value="all">Все</option>
              <option value="processing">Обработка</option>
              <option value="shipping">В пути</option>
              <option value="ready_for_pickup">Готов к выдаче</option>
              <option value="delivered">Выдан</option>
              <option value="cancelled">Отменен</option>
            </select>
          </div>
          <div class="form-group">
            <label>💳 Оплата</label>
            <select v-model="ordersFilters.paymentStatus">
              <option value="all">Все</option>
              <option value="unpaid">Не оплачен</option>
              <option value="paid">Оплачен</option>
              <option value="refunded">Возврат</option>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Показано {{ paginatedOrders.length }} из {{ filteredOrders.length }} заказов
        </div>
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
                    <div class="date-sub">{{ formatDateTime(order.created_at) }}</div>
                  </td>
                  <td>
                    <div class="user-cell">
                      <div class="user-name-row">
                        <strong>{{ getUserInfo(order).fullName }}</strong>
                      </div>
                      <div class="user-contacts">
                        <small v-if="getUserInfo(order).email">{{ getUserInfo(order).email }}</small>
                        <small v-if="getUserInfo(order).phone">{{ getUserInfo(order).phone }}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="price-edit-group">
                      <div class="edit-row"><span>📦 Т-ры:</span> {{ (order.total_price - order.shipping_cost) }} ₽</div>
                      <div class="edit-row shipping"><span>🚚 Дост:</span> {{ order.shipping_cost }} ₽</div>
                    </div>
                  </td>
                  <td>
                    <select v-model="order.delivery_status" @change="updateOrderStatus(order)" class="status-select" :class="order.delivery_status">
                      <option value="processing">Обработка</option>
                      <option value="shipping">В пути</option>
                      <option value="ready_for_pickup">Готов к выдаче</option>
                      <option value="delivered">Выдан</option>
                      <option value="cancelled">Отменен</option>
                      <option value="returned">Возврат</option>
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
                      <button @click="deleteOrder(order.id)" class="btn btn-danger btn-sm">🗑️</button>
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
                          <img :src="getProductImage(item)" class="ipro-img" @error="onImgError($event)" />
                          <div class="ipro-info">
                            <div class="ipro-name">{{ getProductData(item.product_id).name }}</div>
                            <div class="ipro-meta">
                              <span class="badge">{{ item.quantity }} шт.</span>
                              <span class="price-tag">× {{ item.unit_price }} ₽</span>
                            </div>
                            <div class="ipro-warehouse" v-if="item.warehouse_id">
                              📦 Отправлен со склада: <b>{{ getWarehouseAddress(item.warehouse_id) }}</b>
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
        <div v-if="ordersTotalPages > 1" class="pagination mt-3">
          <button @click="ordersPage--" :disabled="ordersPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in ordersTotalPages" :key="p" @click="ordersPage = p" :class="{ active: ordersPage === p }">{{ p }}</button>
          </div>
          <button @click="ordersPage++" :disabled="ordersPage === ordersTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 2: ПРОДАЖИ (Все позиции) — ПОЛНОСТЬЮ ПЕРЕРАБОТАНА -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'sales'">
      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Журнал продаж</h3>
          <div class="header-summary">
            <span class="badge badge-success">Выручка: {{ totalRevenue.toLocaleString() }} ₽</span>
            <span class="badge">Найдено: {{ filteredSales.length }} поз.</span>
          </div>
          <button @click="salesSearchQuery=''; salesDateFilter='all'; salesPage=1;" class="btn-text-link">Сбросить</button>
        </div>
        <div class="filter-grid" style="grid-template-columns: 2fr 1fr;">
          <div class="form-group">
            <label>🔎 Поиск (Товар, SKU или № заказа)</label>
            <input v-model="salesSearchQuery" placeholder="Введите название или артикул..." />
          </div>
          <div class="form-group">
            <label>📅 Период</label>
            <select v-model="salesDateFilter">
              <option value="all">За всё время</option>
              <option value="today">За сегодня</option>
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Показано {{ paginatedSales.length }} из {{ filteredSales.length }} позиций
        </div>
        <div class="admin-table-wrapper glass-card">
          <table class="admin-table">
            <thead>
              <tr>
                <th class="col-id">ID</th>
                <th>Заказ</th>
                <th>Товар / Артикул</th>
                <th class="text-center">Кол-во</th>
                <th>Цена ед.</th>
                <th>Сумма</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in paginatedSales" :key="item.id" class="item-row">
                <td class="col-id">#{{ item.id }}</td>
                <td><span class="order-link">📦 Заказ #{{ item.order_id }}</span></td>
                <td>
                  <div class="product-cell">
                    <div class="thumb-wrap glass-card">
                      <img :src="getProductImage(item)" class="mini-thumb" @error="onImgError($event)" />
                    </div>
                    <div class="p-info">
                      <strong>{{ item.products?.name || 'Товар удалён' }}</strong>
                      <code class="sku-tag">{{ item.products?.sku || '---' }}</code>
                    </div>
                  </div>
                </td>
                <td class="text-center"><span class="badge">{{ item.quantity }} шт.</span></td>
                <td>{{ Number(item.unit_price).toLocaleString() }} ₽</td>
                <td><strong class="total-cell">{{ (Number(item.unit_price) * item.quantity).toLocaleString() }} ₽</strong></td>
                <td class="text-right">
                  <button @click="deleteSaleItem(item.id)" class="btn btn-danger btn-sm" title="Удалить позицию">🗑️</button>
                </td>
              </tr>
              <tr v-if="paginatedSales.length === 0">
                <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">Нет данных по заданным фильтрам</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="salesTotalPages > 1" class="pagination mt-3">
          <button @click="salesPage--" :disabled="salesPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in salesTotalPages" :key="p" @click="salesPage = p" :class="{ active: salesPage === p }">{{ p }}</button>
          </div>
          <button @click="salesPage++" :disabled="salesPage === salesTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 3: ВОЗВРАТЫ — ПОЛНОСТЬЮ ПЕРЕРАБОТАНА -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'returns'">
      <section class="admin-card create-card glass-card">
        <div class="card-header">
          <h3 class="card-title">✨ Создать новый возврат</h3>
          <div class="card-decoration"></div>
        </div>
        <form @submit.prevent="createReturnRequest" class="admin-form">
          <div class="form-group autocomplete-wrapper">
            <label>📦 Заказ #</label>
            <input
              v-model="orderSearch"
              type="text"
              placeholder="Введите номер заказа"
              @input="showOrderSuggestions = true"
              @focus="showOrderSuggestions = true"
              @blur="hideOrderSuggestions"
            />
            <ul v-if="showOrderSuggestions && returnsFilteredOrders.length" class="suggestions glass-card">
              <li v-for="o in returnsFilteredOrders" :key="o.id" @mousedown.prevent="selectReturnOrder(o)">
                Заказ #{{ o.id }} — {{ o.customer_name || 'Гость' }} ({{ o.total_price }} ₽)
              </li>
            </ul>
          </div>
          <div v-if="selectedReturnOrder" class="form-group">
            <label>👤 Клиент</label>
            <div class="user-display glass-card">
              <strong>{{ getUserName(selectedReturnOrder.user_id) }}</strong>
              <small>{{ selectedReturnOrder.customer_email || selectedReturnOrder.customer_phone || '' }}</small>
            </div>
          </div>
          <div class="form-group full-width">
            <label>📝 Причина возврата</label>
            <textarea v-model="newReturnRequest.reason" placeholder="Опишите причину..." required rows="3"></textarea>
          </div>
          <div class="form-footer">
            <button type="submit" class="btn btn-primary create-btn">📩 Отправить заявку</button>
          </div>
        </form>
      </section>

      <section class="admin-card filter-section glass-card">
        <div class="filter-header">
          <h3 class="card-title">🔍 Фильтрация заявок</h3>
          <button @click="returnsSearchQuery=''; returnsStatusFilter='all'; returnsPage=1;" class="btn-text-link">Сбросить</button>
        </div>
        <div class="filter-grid">
          <div class="form-group">
            <label>🔎 Поиск (Заказ #, User ID или причина)</label>
            <input v-model="returnsSearchQuery" placeholder="Введите данные..." />
          </div>
          <div class="form-group">
            <label>📌 Статус заявки</label>
            <select v-model="returnsStatusFilter">
              <option value="all">Все заявки</option>
              <option value="pending">⏳ На рассмотрении</option>
              <option value="approved">✅ Одобрено</option>
              <option value="rejected">❌ Отклонено</option>
            </select>
          </div>
        </div>
      </section>

      <div class="table-container">
        <div class="table-meta text-muted mb-2">
          Показано {{ paginatedReturns.length }} из {{ filteredReturns.length }} заявок
        </div>
        <div v-if="paginatedReturns.length > 0" class="returns-list">
          <div v-for="req in paginatedReturns" :key="req.id" class="return-card glass-card" :class="req.status">
            <div class="return-header">
              <div class="req-id">Заявка #{{ req.id }} (Заказ #{{ req.order_id }})</div>
              <div class="req-date">{{ formatDateTime(req.created_at) }}</div>
              <div class="status-badge-wrap">
                <span class="badge" :class="getReturnStatusClass(req.status)">{{ translateReturnStatus(req.status) }}</span>
              </div>
            </div>
            <div class="return-body">
              <div class="info-block">
                <div class="info-item">
                  <span class="label">Клиент:</span>
                  <div class="user-info">
                    <strong>{{ getUserName(req.user_id) }}</strong>
                    <small v-if="req.user_id">ID: {{ req.user_id.substring(0, 8) }}...</small>
                  </div>
                </div>
              </div>
              <div class="reason-block glass-card">
                <span class="label">📝 Причина возврата:</span>
                <p class="reason-text">{{ req.reason }}</p>
              </div>
            </div>
            <div class="return-footer">
              <div class="action-buttons" v-if="req.status === 'pending'">
                <button @click="updateReturnStatus(req.id, 'approved')" class="btn btn-success btn-sm">✔️ Одобрить</button>
                <button @click="updateReturnStatus(req.id, 'rejected')" class="btn btn-outline btn-sm text-danger">✕ Отклонить</button>
              </div>
              <div class="archive-actions">
                <button @click="deleteReturnRequest(req)" class="btn btn-outline btn-sm text-muted">🗑️ Удалить</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state glass-card">
          <div class="empty-state-icon">📂</div>
          <h3>Заявок не найдено</h3>
        </div>
        <div v-if="returnsTotalPages > 1" class="pagination mt-3">
          <button @click="returnsPage--" :disabled="returnsPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in returnsTotalPages" :key="p" @click="returnsPage = p" :class="{ active: returnsPage === p }">{{ p }}</button>
          </div>
          <button @click="returnsPage++" :disabled="returnsPage === returnsTotalPages">→</button>
        </div>
      </div>
    </div>

    <!-- ======================================================= -->
    <!-- ВКЛАДКА 4: ИСТОРИЯ — УЛУЧШЕНА -->
    <!-- ======================================================= -->
    <div v-show="currentTab === 'history'">
      <section class="admin-card filter-section glass-card">
        <div class="filter-grid" style="grid-template-columns: 1fr 1fr 1fr;">
          <div class="form-group">
            <label>📦 Номер заказа (ID)</label>
            <input v-model="historyFilters.orderId" placeholder="Напр. 125" />
          </div>
          <div class="form-group">
            <label>👨‍💼 Кто изменил (Admin ID)</label>
            <input v-model="historyFilters.changedBy" placeholder="ID администратора..." />
          </div>
          <div class="form-group">
            <label>🚚 Статус доставки</label>
            <select v-model="historyFilters.delivery">
              <option value="all">Все</option>
              <option value="processing">Обработка</option>
              <option value="shipping">В пути</option>
              <option value="delivered">Выдан</option>
              <option value="cancelled">Отменен</option>
            </select>
          </div>
        </div>
      </section>

      <div class="timeline-container">
        <div v-if="paginatedHistory.length > 0" class="timeline">
          <div v-for="log in paginatedHistory" :key="log.id" class="timeline-item glass-card">
            <div class="timeline-left">
              <div class="order-num-tag">Заказ #{{ log.order_id }}</div>
              <div class="time-stamp">{{ formatDateTime(log.created_at) }}</div>
            </div>
            <div class="timeline-content">
              <div class="status-path">
                <div class="path-segment">
                  <span class="path-label">Доставка:</span>
                  <span class="status-badge-mini" :class="log.delivery_status">{{ translateHistoryStatus(log.delivery_status) }}</span>
                </div>
                <div class="path-divider"></div>
                <div class="path-segment">
                  <span class="path-label">Оплата:</span>
                  <span class="status-badge-mini" :class="log.payment_status">{{ translateHistoryPayment(log.payment_status) }}</span>
                </div>
              </div>
              <div v-if="log.comment" class="log-comment">
                <span class="quote-icon">"</span>{{ log.comment }}
              </div>
              <div class="log-footer">
                <span class="author-tag">👤 Изменил: <b>{{ log.changed_by || 'Автоматика / Система' }}</b></span>
                <button @click="goToOrder(log.order_id)" class="btn-text-link">К заказу →</button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state glass-card">
          <div class="empty-state-icon">🕳️</div>
          <h3>История пуста</h3>
        </div>
        <div v-if="historyTotalPages > 1" class="pagination mt-3">
          <button @click="historyPage--" :disabled="historyPage === 1">←</button>
          <div class="pagination-pages">
            <button v-for="p in historyTotalPages" :key="p" @click="historyPage = p" :class="{ active: historyPage === p }">{{ p }}</button>
          </div>
          <button @click="historyPage++" :disabled="historyPage === historyTotalPages">→</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const appStore = useAppStore();
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };
const FALLBACK_IMG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDUiIGhlaWdodD0iNDUiIHZpZXdCb3g9IjAgMCA0NSA0NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDUiIGhlaWdodD0iNDUiIHJ4PSI4IiBmaWxsPSIjRjFGNUY5Ii8+PHRleHQgeD0iNTAlIiB5PSI1NCUiIGZvbnQtc2l6ZT0iMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5NEEzQjgiPvCfk7g8L3RleHQ+PC9zdmc+';

// Глобальные состояния
const currentTab = ref('orders');
const itemsPerPage = 20;

// Общие данные БД
const orders = ref([]);
const users = ref([]);
const products = ref([]);
const warehouses = ref([]);
const orderItems = ref([]);
const returnRequests = ref([]);
const historyLogs = ref([]);

const loadAllData = async () => {
  try {
    const results = await Promise.allSettled([
      axios.get(`/api/admin/orders`, config),
      axios.get(`/api/admin/users`, config),
      axios.get(`/api/admin/products`, config),
      axios.get(`/api/admin/order_items`, config),
      axios.get(`/api/admin/warehouses`, config),
      axios.get(`/api/admin/return_requests`, config),
      axios.get(`/api/admin/order_status_history`, config)
    ]);
    if (results[0].status === 'fulfilled') orders.value = results[0].value.data;
    if (results[1].status === 'fulfilled') users.value = results[1].value.data;
    if (results[2].status === 'fulfilled') products.value = results[2].value.data;
    if (results[3].status === 'fulfilled') orderItems.value = results[3].value.data;
    if (results[4].status === 'fulfilled') warehouses.value = results[4].value.data;
    if (results[5].status === 'fulfilled') returnRequests.value = results[5].value.data;
    if (results[6].status === 'fulfilled') historyLogs.value = results[6].value.data;
  } catch (e) { console.error("Ошибка глобальной загрузки данных логистики", e); }
};

// УТИЛИТЫ
const formatDateTime = (iso) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const getUserName = (id) => {
  if (!id) return 'Гость';
  const u = users.value.find(user => user.id === id);
  return u ? `${u.last_name || ''} ${u.first_name || ''}`.trim() : 'Гость';
};
const getProductImage = (item) => {
  const raw = item.products?.images;
  if (!raw) return FALLBACK_IMG;
  if (Array.isArray(raw) && raw.length > 0) return raw[0];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw.replace(/^\{/, '[').replace(/\}$/, ']'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
    } catch {
      if (raw.startsWith('http')) return raw;
    }
  }
  return FALLBACK_IMG;
};
const onImgError = (e) => { if (e.target.src !== FALLBACK_IMG) e.target.src = FALLBACK_IMG; };

// ==========================================
// ЛОГИКА: ВКЛАДКА "ЗАКАЗЫ"
// ==========================================
const expandedOrder = ref(null);
const ordersPage = ref(1);
const ordersFilters = reactive({ query: '', deliveryStatus: 'all', paymentStatus: 'all' });
const selectedProducts = ref([]);
const newOrder = reactive({ user_id: null, warehouse_id: null, delivery_address: '', payment_method: 'card', shipping_cost: 0 });

const handleWarehouseChange = () => {
  const wh = warehouses.value.find(w => w.id === newOrder.warehouse_id);
  if (wh) newOrder.delivery_address = `${wh.cities?.name || wh.city_name}, ${wh.address}`;
  autoCalcShipping();
};
const addProductToNewOrder = () => selectedProducts.value.push({ product_id: null, quantity: 1, price: 0, weight: 0, isLocal: true, distance: 0 });
const removeProductFromNewOrder = (index) => { selectedProducts.value.splice(index, 1); autoCalcShipping(); };
const updateItemData = (index) => {
  const item = selectedProducts.value[index];
  const prod = products.value.find(p => p.id === item.product_id);
  if (prod) { item.price = prod.discount_price || prod.price; item.weight = Number(prod.weight_kg) || 0; }
  autoCalcShipping();
};
const autoCalcShipping = async () => {
  if (!newOrder.warehouse_id || selectedProducts.value.length === 0) { newOrder.shipping_cost = 0; return; }
  const itemsForRpc = selectedProducts.value.filter(i => i.product_id).map(i => ({ product_id: i.product_id, quantity: i.quantity }));
  if (itemsForRpc.length === 0) { newOrder.shipping_cost = 0; return; }
  try {
    const res = await axios.post(`${API_URL}/api/calculate-shipping`, { warehouse_id: newOrder.warehouse_id, items: itemsForRpc }, config);
    newOrder.shipping_cost = res.data.total;
    let idx = 0;
    selectedProducts.value.forEach(item => {
      if (!item.product_id) return;
      const det = res.data.details[idx++];
      if (det) { item.distance = det.distance_km || 0; item.isLocal = item.distance === 0; }
    });
  } catch (e) { newOrder.shipping_cost = 0; }
};
const orderTotals = computed(() => {
  let itemsPrice = 0; let weight = 0;
  selectedProducts.value.forEach(i => { itemsPrice += i.price * i.quantity; weight += i.weight * i.quantity; });
  return { itemsPrice, weight };
});
const createOrder = async () => {
  try {
    const user = users.value.find(u => u.id === newOrder.user_id) || {};
    const itemsForServer = selectedProducts.value.map(i => ({ product_id: i.product_id, quantity: i.quantity }));
    const payload = {
      ...newOrder,
      customer_name: `${user.last_name || ''} ${user.first_name || 'Гость'}`.trim(),
      customer_phone: user.phone_number || 'не указан',
      customer_email: user.email || '',
      customer_city: appStore.city,
      items: itemsForServer,
      total_price: orderTotals.value.itemsPrice + newOrder.shipping_cost
    };
    const res = await axios.post(`/api/orders`, payload, config);
    alert(`Заказ №${res.data.orderId} создан!`);
    selectedProducts.value = [];
    await loadAllData();
  } catch (e) { alert('Ошибка: ' + (e.response?.data?.error || e.message)); }
};
const updateOrderStatus = async (order) => {
  try { await axios.patch(`/api/admin/orders/${order.id}/status`, { delivery_status: order.delivery_status, payment_status: order.payment_status }, config); }
  catch (e) { alert("Ошибка обновления"); }
};
const deleteOrder = async (id) => {
  if (confirm('Удалить заказ? Остатки вернутся на склады.')) {
    try {
      await axios.delete(`/api/admin/orders/${id}`, config);
      orders.value = orders.value.filter(o => o.id !== id);
      orderItems.value = orderItems.value.filter(i => i.order_id !== id);
    } catch (e) { alert('Ошибка при удалении'); }
  }
};
const getUserInfo = (order) => {
  const u = users.value.find(user => user.id === order.user_id);
  if (u) return { fullName: [u.last_name, u.first_name].filter(Boolean).join(' ') || 'Без имени', email: u.email, phone: u.phone_number };
  return { fullName: order.customer_name || 'Гость', email: order.customer_email, phone: order.customer_phone };
};
const getProductData = (id) => products.value.find(p => p.id === id) || {};
const getOrderItems = (orderId) => orderItems.value.filter(item => item.order_id === orderId);
const getWarehouseAddress = (whId) => {
  const wh = warehouses.value.find(w => w.id === whId);
  return wh ? `${wh.cities?.name || wh.city_name}, ${wh.address}` : `Склад #${whId}`;
};
const toggleItems = (id) => expandedOrder.value = expandedOrder.value === id ? null : id;

const filteredOrders = computed(() => {
  let res = [...orders.value];
  if (ordersFilters.query) {
    const q = ordersFilters.query.toLowerCase();
    res = res.filter(o => o.id.toString() === q || (o.customer_name && o.customer_name.toLowerCase().includes(q)));
  }
  if (ordersFilters.deliveryStatus !== 'all') res = res.filter(o => o.delivery_status === ordersFilters.deliveryStatus);
  if (ordersFilters.paymentStatus !== 'all') res = res.filter(o => o.payment_status === ordersFilters.paymentStatus);
  return res.sort((a, b) => b.id - a.id);
});
const ordersTotalPages = computed(() => Math.ceil(filteredOrders.value.length / itemsPerPage));
const paginatedOrders = computed(() => filteredOrders.value.slice((ordersPage.value - 1) * itemsPerPage, ordersPage.value * itemsPerPage));
watch(ordersFilters, () => ordersPage.value = 1);

// ==========================================
// ЛОГИКА: ВКЛАДКА "ПРОДАЖИ" (ITEMS)
// ==========================================
const salesPage = ref(1);
const salesSearchQuery = ref('');
const salesDateFilter = ref('all');

const deleteSaleItem = async (id) => {
  if (!confirm('Вы уверены? Это изменит только запись состава заказа, но не итоговую сумму в самом заказе!')) return;
  try {
    await axios.delete(`/api/admin/order_items/${id}`, config);
    orderItems.value = orderItems.value.filter(i => i.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const filteredSales = computed(() => {
  let res = [...orderItems.value];
  if (salesSearchQuery.value.trim()) {
    const q = salesSearchQuery.value.toLowerCase().trim();
    res = res.filter(i => (i.products?.name || '').toLowerCase().includes(q) || (i.products?.sku || '').toLowerCase().includes(q) || String(i.order_id) === q);
  }
  if (salesDateFilter.value !== 'all') {
    const now = new Date();
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = startOf(now);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setMonth(monthAgo.getMonth() - 1);
    res = res.filter(i => {
      const o = orders.value.find(ord => ord.id === i.order_id);
      const d = o ? new Date(o.created_at) : null;
      if (!d) return true;
      if (salesDateFilter.value === 'today') return d >= today;
      if (salesDateFilter.value === 'week') return d >= weekAgo;
      if (salesDateFilter.value === 'month') return d >= monthAgo;
      return true;
    });
  }
  return res.sort((a, b) => b.id - a.id);
});
const totalRevenue = computed(() => filteredSales.value.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0));
const salesTotalPages = computed(() => Math.ceil(filteredSales.value.length / itemsPerPage));
const paginatedSales = computed(() => filteredSales.value.slice((salesPage.value - 1) * itemsPerPage, salesPage.value * itemsPerPage));
watch([salesSearchQuery, salesDateFilter], () => salesPage.value = 1);

// ==========================================
// ЛОГИКА: ВКЛАДКА "ВОЗВРАТЫ"
// ==========================================
const returnsPage = ref(1);
const returnsSearchQuery = ref('');
const returnsStatusFilter = ref('all');
const orderSearch = ref('');
const showOrderSuggestions = ref(false);
const selectedReturnOrder = ref(null);
const newReturnRequest = reactive({ order_id: null, user_id: null, reason: '' });

const returnsFilteredOrders = computed(() => {
  const q = orderSearch.value.trim();
  if (!q) return [];
  return orders.value.filter(o => o.id.toString().includes(q));
});
const selectReturnOrder = (order) => {
  selectedReturnOrder.value = order;
  newReturnRequest.order_id = order.id;
  newReturnRequest.user_id = order.user_id;
  orderSearch.value = `#${order.id}`;
  showOrderSuggestions.value = false;
};
const hideOrderSuggestions = () => { setTimeout(() => { showOrderSuggestions.value = false; }, 150); };

const createReturnRequest = async () => {
  if (!newReturnRequest.order_id || !newReturnRequest.reason.trim()) return;
  const hasActive = returnRequests.value.find(r => r.order_id === newReturnRequest.order_id && (r.status === 'pending' || r.status === 'approved'));
  if (hasActive) { alert(`Ошибка: Для заказа #${newReturnRequest.order_id} уже есть активная заявка.`); return; }
  try {
    const res = await axios.post(`/api/admin/return_requests`, { order_id: newReturnRequest.order_id, user_id: newReturnRequest.user_id, reason: newReturnRequest.reason.trim() }, config);
    returnRequests.value.unshift(res.data);
    Object.assign(newReturnRequest, { order_id: null, user_id: null, reason: '' });
    orderSearch.value = ''; selectedReturnOrder.value = null;
    alert('Заявка создана');
  } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
};

const updateReturnStatus = async (id, newStatus) => {
  if (!confirm(newStatus === 'approved' ? 'Одобрить возврат? ТОВАР БУДЕТ ВЕРНУТ НА СКЛАД!' : 'Отклонить заявку?')) return;
  try {
    const res = await axios.put(`/api/admin/return_requests/${id}`, { status: newStatus }, config);
    const idx = returnRequests.value.findIndex(r => r.id === id);
    if (idx !== -1) returnRequests.value[idx] = res.data;
  } catch (e) { alert(e.response?.data?.error || 'Ошибка'); }
};

const deleteReturnRequest = async (req) => {
  if (!confirm('Удалить запись о возврате?')) return;
  try {
    await axios.delete(`/api/admin/return_requests/${req.id}`, config);
    returnRequests.value = returnRequests.value.filter(r => r.id !== req.id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const translateReturnStatus = (s) => ({ pending: 'Ожидает', approved: 'Одобрено', rejected: 'Отклонено' }[s] || s);
const getReturnStatusClass = (status) => ({ 'approved': 'badge-success', 'pending': 'badge-warning', 'rejected': 'badge-danger' }[status] || '');

const filteredReturns = computed(() => {
  let res = [...returnRequests.value];
  if (returnsStatusFilter.value !== 'all') res = res.filter(r => r.status === returnsStatusFilter.value);
  if (returnsSearchQuery.value.trim()) {
    const q = returnsSearchQuery.value.toLowerCase();
    res = res.filter(r => r.reason.toLowerCase().includes(q) || r.order_id.toString() === q || getUserName(r.user_id).toLowerCase().includes(q));
  }
  return res.sort((a, b) => b.id - a.id);
});
const pendingReturnsCount = computed(() => returnRequests.value.filter(r => r.status === 'pending').length);
const returnsTotalPages = computed(() => Math.ceil(filteredReturns.value.length / itemsPerPage));
const paginatedReturns = computed(() => filteredReturns.value.slice((returnsPage.value - 1) * itemsPerPage, returnsPage.value * itemsPerPage));
watch([returnsSearchQuery, returnsStatusFilter], () => returnsPage.value = 1);

// ==========================================
// ЛОГИКА: ВКЛАДКА "ИСТОРИЯ"
// ==========================================
const historyPage = ref(1);
const historyFilters = reactive({ orderId: '', changedBy: '', delivery: 'all' });

const translateHistoryStatus = (s) => ({ 'processing': 'Обработка', 'shipping': 'В пути', 'delivered': 'Выдан', 'cancelled': 'Отменен', 'ready_for_pickup': 'Готов' }[s] || s);
const translateHistoryPayment = (p) => ({ 'paid': 'Оплачен', 'unpaid': 'Не оплачен', 'refunded': 'Возврат' }[p] || p);
const goToOrder = (id) => { currentTab.value = 'orders'; ordersFilters.query = String(id); };

const filteredHistory = computed(() => {
  let res = [...historyLogs.value];
  if (historyFilters.orderId) res = res.filter(l => l.order_id.toString().includes(historyFilters.orderId));
  if (historyFilters.changedBy) res = res.filter(l => l.changed_by?.toLowerCase().includes(historyFilters.changedBy.toLowerCase()));
  if (historyFilters.delivery !== 'all') res = res.filter(l => l.delivery_status === historyFilters.delivery);
  return res.sort((a, b) => b.id - a.id);
});
const historyTotalPages = computed(() => Math.ceil(filteredHistory.value.length / itemsPerPage));
const paginatedHistory = computed(() => filteredHistory.value.slice((historyPage.value - 1) * itemsPerPage, historyPage.value * itemsPerPage));
watch(historyFilters, () => historyPage.value = 1);

onMounted(loadAllData);
</script>

<style scoped>
/* ==========================================================================
   УЛУЧШЕННЫЕ СТИЛИ
   ========================================================================== */
.admin-orders-dashboard { padding: 40px 24px; }
.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 24px; }
.header-left h1 { font-size: 2.2rem; font-weight: 900; margin: 0; background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.subtitle { color: var(--text-muted); font-size: 0.95rem; }
.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* Tabs */
.admin-tabs { display: flex; gap: 10px; padding: 10px; margin-bottom: 30px; border-radius: 12px; overflow-x: auto; }
.admin-tabs button { padding: 12px 24px; border: none; background: transparent; color: var(--text-muted); font-weight: 800; border-radius: 8px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.admin-tabs button:hover { background: rgba(0,0,0,0.05); }
.admin-tabs button.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); }
:global(.dark) .admin-tabs button:hover { background: rgba(255,255,255,0.05); }

/* Common Cards */
.admin-card { padding: 25px; margin-bottom: 30px; }
.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-title { font-size: 1.25rem; font-weight: 900; margin: 0; }
.filter-grid { display: grid; gap: 20px; align-items: flex-end; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
.btn-text-link { background: none; border: none; color: var(--primary); font-weight: 800; cursor: pointer; text-decoration: underline; font-size: 0.9rem; }

/* Tables */
.table-container { margin-top: 20px; }
.table-meta { font-size: 0.85rem; font-weight: 600; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.75rem; font-weight: 800; color: var(--text-muted); border-bottom: 2px solid var(--border-color); text-transform: uppercase; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.col-id { font-weight: 800; color: var(--primary); }

/* Pagination */
.pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; }
.pagination-pages { display: flex; gap: 8px; }
.pagination button, .pagination-pages button { width: 40px; height: 40px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-weight: 600; cursor: pointer; transition: background 0.2s; }
.pagination button:hover:not(:disabled), .pagination-pages button:hover { background: var(--primary-light); border-color: var(--primary); }
.pagination-pages button.active { background: var(--primary); color: white; border-color: var(--primary); }

/* ==========================================================================
   ИСТОРИЯ СТАТУСОВ
   ========================================================================== */
.timeline-container { margin-top: 20px; }
.timeline { display: flex; flex-direction: column; gap: 18px; position: relative; padding-left: 30px; }
.timeline::before { content: ''; position: absolute; left: 18px; top: 8px; bottom: 8px; width: 2px; background: var(--border-color); }
.timeline-item { display: flex; gap: 20px; padding: 18px 20px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border-color); position: relative; transition: transform 0.2s; }
.timeline-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.timeline-left { width: 130px; flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; padding-right: 15px; }
.order-num-tag { font-weight: 900; font-size: 0.95rem; color: var(--primary); white-space: nowrap; }
.time-stamp { font-size: 0.7rem; color: var(--text-muted); margin-top: 4px; font-weight: 600; }
.timeline-content { flex: 1; }
.status-path { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
.path-segment { display: flex; align-items: center; gap: 6px; }
.path-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted); }
.path-divider { width: 1px; height: 16px; background: var(--border-color); margin: 0 4px; }
.status-badge-mini { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 800; background: rgba(0,0,0,0.06); color: var(--text-main); }
.status-badge-mini.processing { background: #dbeafe; color: #1e40af; }
.status-badge-mini.shipping { background: #fef3c7; color: #92400e; }
.status-badge-mini.delivered, .status-badge-mini.ready_for_pickup { background: #d1fae5; color: #065f46; }
.status-badge-mini.cancelled { background: #fee2e2; color: #991b1b; }
.status-badge-mini.paid { background: #d1fae5; color: #065f46; border: 1px solid currentColor; }
.status-badge-mini.unpaid { background: #fee2e2; color: #991b1b; }
.status-badge-mini.refunded { background: #e0e7ff; color: #3730a3; }
.log-comment { background: rgba(0,0,0,0.02); padding: 10px 14px; border-radius: 8px; font-style: italic; margin-bottom: 12px; position: relative; font-size: 0.9rem; }
:global(.dark) .log-comment { background: rgba(255,255,255,0.05); }
.quote-icon { position: absolute; left: -10px; top: -12px; font-size: 2rem; opacity: 0.15; color: var(--primary); font-style: normal; }
.log-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 10px; font-size: 0.8rem; }
.author-tag { color: var(--text-muted); }
.author-tag b { color: var(--text-main); }

/* ==========================================================================
   ПРОДАЖИ И ВОЗВРАТЫ
   ========================================================================== */
.header-summary { display: flex; gap: 10px; align-items: center; }
.order-link { color: var(--primary); text-decoration: none; font-weight: 800; padding: 6px 12px; background: var(--primary-light); border-radius: 20px; font-size: 0.85rem; white-space: nowrap; cursor: pointer; }
.order-link:hover { background: var(--primary); color: white; }
.product-cell { display: flex; align-items: center; gap: 14px; }
.thumb-wrap { width: 48px; height: 48px; border-radius: 10px; overflow: hidden; background: #fff; display: flex; align-items: center; justify-content: center; padding: 4px; }
.mini-thumb { width: 100%; height: 100%; object-fit: contain; }
.p-info { display: flex; flex-direction: column; gap: 3px; }
.sku-tag { font-size: 0.7rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; }
.total-cell { color: var(--primary); font-size: 1.05rem; }
.returns-list { display: flex; flex-direction: column; gap: 20px; }
.return-card { padding: 30px; border-left: 6px solid var(--border-color); }
.return-card.pending { border-left-color: var(--warning); }
.return-card.approved { border-left-color: var(--success); }
.return-card.rejected { border-left-color: var(--danger); }
.return-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
.req-id { font-weight: 900; font-size: 1.2rem; color: var(--primary); }
.return-body { display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px; }
.info-block { display: flex; flex-direction: column; gap: 15px; }
.label { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; display: block; }
.reason-block { padding: 15px 20px; background: rgba(0,0,0,0.02); }
.return-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; border-top: 1px dashed var(--border-color); padding-top: 20px; }

/* Конструктор (оставлено) */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 28px; }
.products-selector-section { background: rgba(0,0,0,0.02); padding: 20px; border-radius: 12px; margin-bottom: 24px; }
.selector-row-advanced { display: flex; gap: 15px; align-items: center; padding: 15px; background: var(--bg-card); margin-bottom: 12px; border-radius: 12px; }
.item-sub-info { font-size: 0.7rem; color: var(--text-muted); display: flex; gap: 15px; margin-top: 5px; }
.status-local { color: var(--success); font-weight: 700; }
.status-intercity { color: var(--warning); font-weight: 700; }
.qty-input { width: 80px; }
.btn-remove-char { background: var(--danger-light); color: var(--danger); border: none; width: 28px; height: 28px; border-radius: 50%; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.btn-remove-char:hover { background: var(--danger); color: white; }
.constructor-footer { display: grid; grid-template-columns: 1fr 1.5fr 1fr auto; gap: 30px; align-items: center; padding: 25px; background: rgba(0,0,0,0.02); }
.pill { padding: 8px 12px; background: var(--bg-card); border-radius: 8px; font-size: 0.85rem; font-weight: 700; border: 1px solid var(--border-color); }
.total-val { font-size: 2rem; font-weight: 900; color: var(--primary); }
.status-select { padding: 8px 14px; border-radius: 30px; font-weight: 800; font-size: 0.7rem; border: none; cursor: pointer; background: var(--bg-input); color: var(--text-main); }
.status-select.processing { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.status-select.shipping { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.status-select.delivered { background: rgba(16, 185, 129, 0.1); color: #059669; }
.btn-action-circle { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-card); cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.btn-group-row { display: flex; gap: 8px; align-items: center; justify-content: flex-end; }

/* Адаптивность */
@media (max-width: 900px) {
  .constructor-footer, .detail-grid, .return-body { grid-template-columns: 1fr; }
  .filter-grid { grid-template-columns: 1fr !important; }
  .timeline { padding-left: 20px; }
  .timeline-item { flex-direction: column; gap: 12px; }
  .timeline-left { width: 100%; align-items: flex-start; padding-right: 0; }
}

/* ==========================================================================
   ДЕТАЛИ ЗАКАЗА (РАСКРЫВАЮЩАЯСЯ СТРОКА)
   ========================================================================== */
.order-detail-view {
  padding: 24px;
  background: var(--bg-glass);
  border-radius: 20px;
  margin: 12px 0 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border-color);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px dashed var(--border-color);
}

.detail-column {
  background: rgba(0, 0, 0, 0.02);
  padding: 16px 20px;
  border-radius: 16px;
  transition: all 0.2s;
}
:global(.dark) .detail-column {
  background: rgba(255, 255, 255, 0.03);
}
.detail-column:hover {
  transform: translateY(-2px);
  background: rgba(0, 0, 0, 0.04);
}
.detail-title {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--primary);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.detail-title::before {
  content: "▸";
  font-size: 0.8rem;
}
.detail-column p {
  margin: 8px 0;
  font-size: 0.9rem;
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-column p b {
  min-width: 70px;
  color: var(--text-muted);
  font-weight: 600;
}

/* Состав заказа – улучшенные карточки товаров */
.items-grid-pro {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 12px;
}
.item-row-pro {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--bg-card);
  padding: 16px 20px;
  border-radius: 20px;
  transition: all 0.2s;
  border: 1px solid var(--border-color);
}
.item-row-pro:hover {
  transform: translateX(4px);
  border-left: 4px solid var(--primary);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}
.ipro-img {
  width: 70px;
  height: 70px;
  object-fit: contain;
  background: white;
  border-radius: 16px;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}
.ipro-info {
  flex: 1;
}
.ipro-name {
  font-weight: 800;
  font-size: 1rem;
  color: var(--text-main);
  margin-bottom: 6px;
}
.ipro-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.ipro-meta .badge {
  background: var(--primary-light);
  color: var(--primary);
  padding: 4px 12px;
  border-radius: 30px;
  font-size: 0.75rem;
  font-weight: 700;
}
.price-tag {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-muted);
}
.ipro-warehouse {
  font-size: 0.75rem;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.02);
  padding: 4px 10px;
  border-radius: 20px;
}
.ipro-warehouse b {
  color: var(--primary);
}
.ipro-sum {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--primary);
  background: rgba(37, 99, 235, 0.08);
  padding: 8px 16px;
  border-radius: 40px;
  white-space: nowrap;
  text-align: center;
  min-width: 100px;
}

/* Дополнительные иконки для контактных данных */
.detail-column p:nth-child(1)::before {
  content: "👤";
  margin-right: 8px;
  opacity: 0.7;
}
.detail-column p:nth-child(2)::before {
  content: "📞";
  margin-right: 8px;
  opacity: 0.7;
}
.detail-column p:nth-child(3)::before {
  content: "✉️";
  margin-right: 8px;
  opacity: 0.7;
}
.detail-column:last-child p:nth-child(1)::before {
  content: "💰";
}
.detail-column:last-child p:nth-child(2)::before {
  content: "🚚";
}

/* Адаптивность для деталей */
@media (max-width: 900px) {
  .detail-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .item-row-pro {
    flex-direction: column;
    text-align: center;
  }
  .ipro-img {
    width: 90px;
    height: 90px;
  }
  .ipro-sum {
    margin-top: 8px;
    width: 100%;
  }
  .ipro-meta {
    justify-content: center;
  }
}
</style>