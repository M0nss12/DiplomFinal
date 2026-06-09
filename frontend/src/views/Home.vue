<template>
  <div class="home-page animate-fade-in">
    <!-- ДЕКОРАТИВНЫЕ ЭЛЕМЕНТЫ -->
    <div class="gear gear-1"></div>
    <div class="gear gear-2"></div>
    <div class="sparkle-container" v-if="!isMobile">
      <div v-for="n in 30" :key="n" class="sparkle" :style="getRandomSparkleStyle()"></div>
    </div>

    <!-- КНОПКА НАВЕРХ -->
    <transition name="fade">
      <button v-if="showScrollTop" @click="scrollToTop" class="scroll-top-btn" title="Наверх">
        Наверх
      </button>
    </transition>

    <!-- 1. ГЕРОЙСКИЙ БЛОК -->
    <section class="hero-section glass-card-hero">
      <div class="hero-bg-gradient"></div>
      <div class="hero-particles"></div>
      <div class="hero-content">
        <h1 class="hero-title">
          Надёжные автозапчасти
          <span class="highlight">с доставкой по всей России</span>
        </h1>
        <p class="hero-subtitle">
          Большое количество оригинальных деталей и аналогов. Готовы отправить сегодня в ваш город.
        </p>

        <div class="hero-search-container" ref="heroSearchRef">
          <div class="hero-search-bar">
            <input
              type="text"
              v-model="searchQuery"
              placeholder="Название детали, артикул или бренд..."
              @input="handleHeroSearch"
              @focus="isHeroSearchOpen = true"
              @keyup.enter="goToSearchPage"
            />
            <button @click="goToSearchPage" class="btn btn-primary hero-search-btn">
              Найти запчасть
            </button>
          </div>

          <transition name="fade">
            <div v-if="isHeroSearchOpen && searchQuery.length >= 2" class="hero-search-dropdown glass-card">
              <div v-if="heroSearchResults.categories.length" class="hs-group">
                <div class="hs-label">Категории</div>
                <router-link v-for="c in heroSearchResults.categories" :key="c.id" :to="`/category/${c.id}`" class="hs-item">
                  {{ c.name }}
                </router-link>
              </div>

              <div v-if="heroSearchResults.products.length" class="hs-group">
                <div class="hs-label">Товары</div>
                <router-link v-for="prod in heroSearchResults.products" :key="prod.id" :to="`/product/${prod.id}`" class="hs-item hs-prod-item">
                  <img :src="prod.images && prod.images.length > 0 ? prod.images[0] : '/assets/images/no-image.png'" class="hs-img" />
                  <div class="hs-info">
                    <div class="hs-name">{{ prod.name }}</div>
                    <div class="hs-price">{{ prod.discount_price || prod.price }} ₽</div>
                  </div>
                </router-link>
              </div>

              <div v-if="noHeroResults" class="hs-none">Ничего не найдено</div>
            </div>
          </transition>
        </div>

        <div class="hero-buttons">
          <router-link to="/about" class="btn btn-primary btn-lg hero-main-btn">
            Условия доставки
          </router-link>
        </div>
      </div>
    </section>

    <!-- 2. БЛОК ПРЕИМУЩЕСТВ (фотографии стали ещё больше) -->
    <section class="features-section">
      <div
        v-for="(feature, idx) in features"
        :key="feature.title"
        class="feature-card glass-card"
        :class="{ 'feature-visible': animatedFeatures[idx] }"
        ref="featureRefs"
      >
        <img :src="feature.image" :alt="feature.title" class="feature-img" />
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
        <div class="feature-stat">
          <span class="counter" :data-target="feature.countNum">{{ animatedFeatures[idx] ? animatedCounts[idx] : 0 }}</span>
          {{ feature.countUnit }}
        </div>
        <div class="feature-glow"></div>
      </div>
    </section>

    <!-- 3. SEO-ТЕКСТ -->
    <section class="seo-description glass-card">
      <h2>Интернет-магазин автозапчастей "Автотовары"</h2>
      <p>
        Мы предлагаем более 100 000 наименований оригинальных запчастей и качественных аналогов для легковых автомобилей.
        Благодаря прямым контрактам с производителями и умной логистике, мы гарантируем низкие цены и быструю доставку в г.
        <b>{{ appStore.city }}</b>.
      </p>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const appStore = useAppStore();

const searchQuery = ref('');
const isHeroSearchOpen = ref(false);
const heroSearchRef = ref(null);
const heroSearchResults = ref({ products: [], categories: [] });
let heroSearchTimer = null;

const isMobile = ref(false);
const showScrollTop = ref(false);

// Анимации для преимуществ
const featureRefs = ref([]);
const animatedFeatures = ref([false, false, false]);
const animatedCounts = ref([0, 0, 0]);

// Три фотографии для преимуществ
const features = ref([
  {
    image: '/assets/images/logistics.jpg',
    title: 'Умная логистика',
    description: 'Бесплатное перемещение товаров между складами вашего города.',
    countNum: 24,
    countUnit: 'часа'
  },
  {
    image: '/assets/images/original.jpg',
    title: '100% Оригинал',
    description: 'Прямые контракты с производителями.',
    countNum: 100,
    countUnit: '%'
  },
  {
    image: '/assets/images/return.jpg',
    title: 'Легкий возврат',
    description: 'Не подошла деталь? Вернем деньги без лишних вопросов в течение 14 дней.',
    countNum: 14,
    countUnit: 'дней'
  }
]);

// Поиск в герое
const handleHeroSearch = () => {
  clearTimeout(heroSearchTimer);
  if (searchQuery.value.length < 2) {
    heroSearchResults.value = { products: [], categories: [] };
    return;
  }
  heroSearchTimer = setTimeout(async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/global-search?q=${searchQuery.value}`);
      heroSearchResults.value = res.data;
    } catch (e) {
      console.error('Hero search error:', e);
    }
  }, 300);
};

const goToSearchPage = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/catalog', query: { q: searchQuery.value } });
  }
};

const noHeroResults = computed(() => {
  return searchQuery.value.length >= 2 &&
    heroSearchResults.value.products.length === 0 &&
    heroSearchResults.value.categories.length === 0;
});

const handleClickOutside = (event) => {
  if (heroSearchRef.value && !heroSearchRef.value.contains(event.target)) {
    isHeroSearchOpen.value = false;
  }
};

// Счётчики в преимуществах
const animateCounter = (el, target, index) => {
  let start = 0;
  const duration = 1500;
  const step = (timestamp) => {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const value = Math.floor(progress * target);
    animatedCounts.value[index] = value;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      animatedCounts.value[index] = target;
    }
  };
  requestAnimationFrame(step);
};

const setupObservers = () => {
  const featureElements = document.querySelectorAll('.feature-card');
  const countObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const idx = Array.from(featureElements).indexOf(entry.target);
        if (!animatedFeatures.value[idx]) {
          animatedFeatures.value[idx] = true;
          const target = features.value[idx].countNum;
          animateCounter(entry.target, target, idx);
          countObserver.unobserve(entry.target);
        }
      }
    });
  }, { threshold: 0.5 });
  featureElements.forEach(el => countObserver.observe(el));
};

// Декоративные искры
const getRandomSparkleStyle = () => {
  return {
    left: Math.random() * 100 + '%',
    animationDelay: Math.random() * 10 + 's',
    width: Math.random() * 4 + 2 + 'px',
    height: Math.random() * 4 + 2 + 'px',
    opacity: Math.random() * 0.5 + 0.2,
  };
};

// Адаптив и кнопка наверх
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleScroll = () => {
  showScrollTop.value = window.pageYOffset > 600;
};

onMounted(() => {
  window.addEventListener('click', handleClickOutside);
  window.addEventListener('scroll', handleScroll);
  checkMobile();
  window.addEventListener('resize', checkMobile);
  nextTick(() => {
    setupObservers();
  });
});

onUnmounted(() => {
  clearInterval(heroSearchTimer);
  window.removeEventListener('click', handleClickOutside);
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', checkMobile);
});
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ
   ========================================================================== */
.glass-card {
  backdrop-filter: blur(10px);
}

.home-page {
  padding-bottom: 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 96%;
}

/* Декоративные шестерёнки */
.gear {
  position: fixed; width: 80px; height: 80px;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H5.78a1.65 1.65 0 0 0-1.51 1 1.65 1.65 0 0 0 .33 1.82l.07.08A10 10 0 0 0 12 18a10 10 0 0 0 6.26-2.22z"/><path d="M5.52 10.5a10 10 0 0 1 12.96 0"/></svg>') center/contain no-repeat;
  opacity: 0.08; pointer-events: none; z-index: -1; animation: spin 20s linear infinite; color: var(--text-main);
}
:global(.dark) .gear { color: #f8fafc; opacity: 0.05; }
.gear-1 { top: 10%; left: 5%; width: 100px; height: 100px; animation-duration: 25s; }
.gear-2 { bottom: 10%; right: 5%; width: 70px; height: 70px; animation-duration: 18s; animation-direction: reverse; }

.sparkle-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: -1; overflow: hidden; }
.sparkle { position: absolute; background: radial-gradient(circle, var(--primary) 0%, transparent 80%); border-radius: 50%; animation: sparkle 8s linear infinite; }

.scroll-top-btn {
  position: fixed; bottom: 30px; right: 30px; width: 48px; height: 48px;
  border-radius: 50%; background: var(--primary); color: white;
  display: flex; align-items: center; justify-content: center; font-size: 0.9rem; font-weight: bold;
  cursor: pointer; z-index: 900; box-shadow: 0 4px 12px rgba(37,99,235,0.3);
  transition: transform 0.2s, background 0.2s;
  border: none;
}
.scroll-top-btn:hover { transform: translateY(-3px); background: var(--accent); }

/* ГЕРОЙ */
.hero-section {
  position: relative; border-radius: var(--radius-lg); margin: 40px 0 60px 0;
  overflow: visible !important; box-shadow: var(--shadow-md);
}
.glass-card-hero {
  background: var(--bg-card); border: 1px solid var(--border-color);
}
:global(.dark) .glass-card-hero { background: #1e293b; border-color: #334155; }

.hero-bg-gradient {
  position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
  background: linear-gradient(125deg, rgba(255,255,255,0) 0%, rgba(37,99,235,0.05) 30%, rgba(14,165,233,0.05) 70%, rgba(255,255,255,0) 100%);
  background-size: 200% 200%; animation: gradientShift 12s ease infinite; z-index: 0; pointer-events: none; border-radius: inherit;
}
:global(.dark) .hero-bg-gradient { background: linear-gradient(125deg, rgba(30,41,59,0) 0%, rgba(37,99,235,0.1) 30%, rgba(14,165,233,0.1) 70%, rgba(30,41,59,0) 100%); }

.hero-content { position: relative; z-index: 2; max-width: 800px; margin: 0 auto; text-align: center; padding: 70px 40px; }

.hero-title { font-size: 3.2rem; line-height: 1.2; font-weight: 900; margin-bottom: 20px; color: var(--text-main); }
.highlight { background: linear-gradient(135deg, var(--primary), var(--accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; display: inline-block; }

.hero-subtitle { font-size: 1.2rem; color: var(--text-muted); margin-bottom: 30px; }

/* Поисковая строка */
.hero-search-container { max-width: 650px; margin: 0 auto 40px; position: relative; z-index: 100; }
.hero-search-bar {
  display: flex; align-items: center; background: var(--bg-card); border-radius: 60px;
  padding: 6px 6px 6px 20px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); border: 1px solid var(--border-color); transition: all 0.3s;
}
:global(.dark) .hero-search-bar { background: #0f172a; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
.hero-search-bar:focus-within { box-shadow: 0 0 0 4px rgba(37,99,235,0.15), 0 10px 25px -5px rgba(0,0,0,0.1); transform: scale(1.01); border-color: var(--primary); }
.hero-search-bar input { flex: 1; border: none; background: transparent; padding: 14px 0; font-size: 1rem; outline: none; color: var(--text-main); }

.hero-search-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  padding: 12px 32px;
  border-radius: 50px;
  color: white;
  font-weight: 700;
  transition: transform 0.2s;
}
.hero-search-btn:hover { transform: scale(1.02); }

.hero-search-dropdown {
  position: absolute; top: calc(100% + 12px); left: 0; right: 0;
  max-height: min(480px, 50vh); overflow-y: auto; overscroll-behavior: contain; z-index: 1000; padding: 8px 0; text-align: left;
}
.hs-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: var(--text-muted); padding: 8px 20px; background: rgba(0,0,0,0.02); position: sticky; top: 0; backdrop-filter: blur(4px); z-index: 2; }
:global(.dark) .hs-label { background: rgba(255,255,255,0.02); color: #94a3b8; }
.hs-item { display: flex; align-items: center; gap: 15px; padding: 10px 20px; text-decoration: none; color: var(--text-main); transition: background 0.2s; cursor: pointer; }
:global(.dark) .hs-item { color: #f8fafc; }
.hs-item:hover { background: var(--primary-light); }
.hs-img { width: 44px; height: 44px; object-fit: contain; background: #fff; border-radius: var(--radius-sm); padding: 4px; border: 1px solid var(--border-color); }
.hs-info { flex: 1; }
.hs-name { font-weight: 600; font-size: 0.9rem; line-height: 1.2; }
.hs-price { color: var(--success); font-weight: 700; font-size: 0.85rem; margin-top: 2px; }
.hs-none { padding: 20px; text-align: center; color: var(--text-muted); font-weight: 500; }

/* Кнопки героя */
.hero-buttons { display: flex; gap: 20px; justify-content: center; }
.hero-main-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent)); color: white; box-shadow: 0 10px 20px rgba(37,99,235, 0.3);
  padding: 14px 32px; border-radius: 40px; font-size: 1rem;
}
.hero-main-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(37,99,235, 0.5); }
.hero-secondary-btn {
  background: rgba(0,0,0,0.02); border: 2px solid var(--border-color); padding: 14px 32px; border-radius: 40px;
}
:global(.dark) .hero-secondary-btn { background: rgba(255,255,255,0.02); border-color: #334155; }
.hero-secondary-btn:hover { border-color: var(--primary); color: var(--primary); transform: translateY(-3px); background: var(--bg-card); }

/* ПРЕИМУЩЕСТВА — ФОТО СТАЛИ ЕЩЁ БОЛЬШЕ */
.features-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-bottom: 60px; }
.feature-card { position: relative; padding: 30px 20px; text-align: center; overflow: hidden; }
.feature-card:hover { transform: translateY(-8px); border-color: var(--primary); }
.feature-img {
  width: 100%;
  height: 380px; /* было 240px, увеличено */
  object-fit: cover;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  transition: transform 0.3s;
}
.feature-card:hover .feature-img { transform: scale(1.03); }
.feature-card h3 { color: var(--text-main); font-weight: 800; font-size: 1.2rem; margin-bottom: 10px; }
.feature-card p { color: var(--text-muted); font-size: 0.95rem; line-height: 1.5; }
.feature-stat { font-size: 1.3rem; font-weight: 800; color: var(--primary); margin-top: 15px; }
.counter { font-size: 2.2rem; display: inline-block; min-width: 60px; }
.feature-glow { position: absolute; bottom: -2px; left: 0; width: 100%; height: 3px; background: linear-gradient(90deg, transparent, var(--primary), transparent); opacity: 0; transition: opacity 0.3s; }
.feature-card:hover .feature-glow { opacity: 1; }

/* SEO */
.seo-description { padding: 40px; margin-bottom: 40px; text-align: center; }
.seo-description h2 { color: var(--text-main); margin-bottom: 15px; font-weight: 800; }
.seo-description p { color: var(--text-muted); line-height: 1.6; font-size: 1.05rem; max-width: 800px; margin: 0 auto; }

/* АНИМАЦИИ */
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes sparkle { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(100vh) rotate(360deg); opacity: 0; } }

/* АДАПТИВ */
@media (max-width: 1024px) {
  .hero-title { font-size: 2.5rem; }
  .features-section { gap: 20px; }
}
@media (max-width: 768px) {
  .hero-content { padding: 40px 20px; }
  .hero-title { font-size: 1.8rem; }
  .hero-search-bar { flex-direction: column; border-radius: 28px; padding: 15px; }
  .hero-search-btn { width: 100%; margin-top: 10px; }
  .hero-buttons { flex-direction: column; gap: 12px; }
  .features-section { grid-template-columns: 1fr; }
  .feature-img { height: 420px; } /* ещё больше на мобильных */
  .gear, .sparkle-container { display: none; }
}
</style>