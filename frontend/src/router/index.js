import { createRouter, createWebHistory } from 'vue-router'

// Импортируем Home сразу (для быстрой загрузки главной), остальные — лениво
import Home from '@/views/Home.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  
  // Плавная прокрутка наверх при переходах
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },

  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/catalog/:id?', 
      name: 'catalog',
      component: () => import('@/views/Catalog.vue')
    },
    {
      path: '/category/:id', 
      name: 'categoryproducts',
      component: () => import('@/views/CategoryProducts.vue')
    },
    {
      path: '/product/:id',
      name: 'product-detail',
      component: () => import('@/views/ProductDetail.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/About.vue')
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('@/views/Contacts.vue')
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('@/views/Cart.vue')
    },
    {
      path: '/checkout',
      name: 'checkout',
      component: () => import('@/views/Checkout.vue')
    },
    {
      path: '/order-success',
      name: 'order-success',
      component: () => import('@/views/OrderSuccess.vue')
    },

    // --- АВТОРИЗАЦИЯ И ПРОФИЛЬ ---
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/Register.vue')
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue')
    },
    {
      path: '/reset-password-confirm',
      name: 'reset-password-confirm',
      component: () => import('@/views/ResetPasswordConfirm.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/Profile.vue')
    },
    {
      path: '/garage', // Новая страница гаража для юзера
      name: 'garage',
      component: () => import('@/views/Garage.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/Settings.vue')
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('@/views/Orders.vue')
    },
    {
      path: '/wishlist',
      name: 'wishlist',
      component: () => import('@/views/Wishlist.vue')
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('@/views/Notifications.vue')
    },

    // --- АДМИН-ПАНЕЛЬ (РАСШИРЕННАЯ) ---
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      beforeEnter: (to, from, next) => {
        const role = localStorage.getItem('role'); 
        if (role === 'admin') {
          next();
        } else {
          next('/login');
        }
      },
      children: [
        { path: '', redirect: '/admin/orders' },
        
        // 🛍️ Магазин
        { path: 'orders', component: () => import('@/views/admin/AdminOrders.vue') },
        { path: 'products', component: () => import('@/views/admin/AdminProducts.vue') },
        { path: 'categories', component: () => import('@/views/admin/AdminCategories.vue') },
        { path: 'brands', component: () => import('@/views/admin/AdminBrands.vue') },
        { path: 'reviews', component: () => import('@/views/admin/AdminReviews.vue') },

        // 🚚 Логистика
        { path: 'stocks', component: () => import('@/views/admin/AdminStocks.vue') },
        { path: 'cities', component: () => import('@/views/admin/AdminCities.vue') },

        // 👥 Клиенты
        { path: 'users', component: () => import('@/views/admin/AdminUsers.vue') },
        { path: 'notifications', component: () => import('@/views/admin/AdminNotifications.vue') },
        
        // 🛡️ Система
        { path: 'logs', component: () => import('@/views/admin/AdminLogs.vue') },
      ]
    },

    // 404 Страница (Всегда в конце)
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue')
    }
  ]
})

export default router