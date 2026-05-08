import { defineStore } from 'pinia';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const useCartStore = defineStore('cart', {
  state: () => ({
    // Загружаем корзину из памяти браузера или создаем пустую
    items: JSON.parse(localStorage.getItem('cart_items')) || []
  }),

  getters: {
    // Общее количество товаров (для иконки в шапке)
    totalItems: (state) => state.items.reduce((sum, i) => sum + Number(i.quantity), 0),
    
    // Общий вес (для расчета доставки, если понадобится)
    totalWeight: (state) => {
      const weight = state.items.reduce((sum, i) => sum + (Number(i.weight_kg || 0) * i.quantity), 0);
      return parseFloat(weight.toFixed(2));
    },

    // Сумма без скидок (зачеркнутая цена)
    totalPriceOriginal: (state) => state.items.reduce((sum, i) => sum + (Number(i.price) * i.quantity), 0),

    // Общая скидка (выгода)
    totalDiscount: (state) => state.items.reduce((sum, i) => {
        const discount = i.discount_price ? (Number(i.price) - Number(i.discount_price)) : 0;
        return sum + (discount * i.quantity);
    }, 0),

    // Итоговая сумма к оплате
    totalPriceFinal: (state) => state.items.reduce((sum, i) => {
        const actualPrice = i.discount_price ? Number(i.discount_price) : Number(i.price);
        return sum + (actualPrice * i.quantity);
    }, 0)
  },

  actions: {
    // ==========================================
    // БЛОК: СИНХРОНИЗАЦИЯ С НОВОЙ БД
    // ==========================================
    
    // Вызывать при успешном логине (чтобы подтянуть корзину с сервера)
    async syncCartFromDB() {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;

      try {
        const res = await axios.get(`${API_URL}/api/users/profile/${userId}`);
        const dbCart = res.data.cart;
        
        if (dbCart && Array.isArray(dbCart) && dbCart.length > 0) {
          // Если в БД есть корзина, берем её (можно сделать сложное слияние, но пока берем с сервера)
          this.items = dbCart;
          localStorage.setItem('cart_items', JSON.stringify(this.items));
        } else if (this.items.length > 0) {
          // Если на сервере пусто, а локально что-то есть - отправляем локальную на сервер
          this.saveToDB();
        }
      } catch (e) {
        console.error('Ошибка синхронизации корзины с БД:', e.message);
      }
    },

    async saveToDB() {
      const userId = localStorage.getItem('user_id');
      if (userId) {
        try {
          // Сохраняем в поле cart (JSONB) новой таблицы users
          await axios.put(`${API_URL}/api/users/profile/${userId}`, { cart: this.items });
        } catch (e) {
          console.error('Ошибка сохранения корзины в БД:', e.message);
        }
      }
    },

    // Главная функция сохранения
    save() {
      // Всегда пишем локально
      localStorage.setItem('cart_items', JSON.stringify(this.items));
      // И дублируем в БД, если авторизован
      this.saveToDB();
    },

    // ==========================================
    // БЛОК: УПРАВЛЕНИЕ ТОВАРАМИ
    // ==========================================

    addToCart(product) {
      // 1. ЖЕСТКИЙ РАСЧЕТ ОСТАТКА
      let availableStock = 0;
      if (product.product_stocks && Array.isArray(product.product_stocks)) {
          availableStock = product.product_stocks.reduce((sum, s) => sum + Number(s.quantity), 0);
      } else if (product.stock_quantity !== undefined) {
          availableStock = Number(product.stock_quantity);
      }

      if (availableStock <= 0) {
          // Замени alert на систему красивых уведомлений (toast), когда дойдешь до UI
          alert("Товара нет в наличии ни на одном складе.");
          return;
      }

      const existing = this.items.find(i => Number(i.id) === Number(product.id));
      
      if (existing) {
        if (existing.quantity < availableStock) {
            existing.quantity++;
            existing.max_stock = availableStock; 
        } else {
            alert(`Доступно всего ${availableStock} шт. Вы не можете добавить больше.`);
        }
      } else {
        // ДОБАВЛЯЕМ НОВЫЙ
        // Адаптация под новую БД: images - это массив. Берем первый элемент или null
        const productImage = (product.images && product.images.length > 0) ? product.images[0] : null;

        this.items.push({
          id: Number(product.id),
          name: product.name,
          sku: product.sku,
          image: productImage, // Изменено с image_url на image
          price: Number(product.price),
          discount_price: product.discount_price ? Number(product.discount_price) : null,
          weight_kg: Number(product.weight_kg || 0),
          
          max_stock: availableStock, 
          product_stocks: product.product_stocks || [], 
          quantity: 1
        });
      }
      this.save();
    },

    updateQuantity(productId, step) {
      const item = this.items.find(i => Number(i.id) === Number(productId));
      
      if (item) {
        const newQty = item.quantity + step;
        const maxAvailable = Number(item.max_stock);

        if (newQty >= 1 && newQty <= maxAvailable) {
          item.quantity = newQty;
        } else if (newQty > maxAvailable) {
          alert(`Превышен доступный остаток. Максимум: ${maxAvailable} шт.`);
        } else if (newQty < 1) {
          // Раскомментируй, если хочешь, чтобы товар удалялся при нуле
          // this.removeFromCart(productId);
        }
      }
      this.save();
    },

    removeFromCart(productId) {
      this.items = this.items.filter(i => Number(i.id) !== Number(productId));
      this.save();
    },

    clearCart() {
      this.items = [];
      this.save();
    }
  }
});