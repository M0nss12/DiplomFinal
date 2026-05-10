<template>
  <div class="about-page animate-fade-in">
    <!-- 1. HERO-СЕКЦИЯ -->
    <section class="hero-about glass-card">
      <div class="hero-content">
        <h1>О компании <span class="highlight">ApexDrive</span></h1>
        <p class="hero-subtitle">
          Инновационный маркетплейс автозапчастей с интеллектуальной системой логистики.
          Мы создали 100% нормализованную экосистему, которая объединяет десятки складов по всей России,
          чтобы вы получали детали максимально быстро и по честной цене.
        </p>
        <router-link to="/catalog" class="btn btn-primary btn-lg hero-cta">Перейти в каталог</router-link>
      </div>
      <div class="hero-image hidden-mobile">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
      </div>
    </section>

    <!-- 2. КАЛЬКУЛЯТОР ДОСТАВКИ -->
    <section class="calculator-section glass-card">
      <h2>🚚 Калькулятор доставки</h2>
      <p class="calc-subtitle">Узнайте примерную стоимость доставки с центрального склада (Москва) в выбранный пункт выдачи</p>

      <form @submit.prevent="calculateShipping" class="calc-form">
        <div class="calc-row">
          <div class="form-group">
            <label>🏙️ Город получения</label>
            <select v-model="calcCityId" @change="onCityChange">
              <option :value="null" disabled>-- Выберите город --</option>
              <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>📍 Пункт выдачи (ПВЗ)</label>
            <select v-model="calcWarehouseId" :disabled="!calcCityId">
              <option :value="null" disabled>-- Выберите ПВЗ --</option>
              <option v-for="w in filteredWarehouses" :key="w.id" :value="w.id">
                {{ w.address }} ({{ w.cities?.name || '' }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>⚖️ Вес заказа (кг)</label>
            <input v-model.number="calcWeight" type="number" step="0.1" min="0.1" required placeholder="Например, 4.5" />
          </div>
          <div class="form-group">
            <label>💰 Стоимость товаров (₽, для ограничения 22%)</label>
            <input v-model.number="calcItemsCost" type="number" min="0" placeholder="Необязательно" />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-lg" :disabled="calcLoading || !calcWarehouseId">
          <span v-if="calcLoading" class="spinner"></span>
          <span v-else>Рассчитать стоимость</span>
        </button>
      </form>

      <transition name="fade">
        <div v-if="calcResult" class="calc-result glass-card">
          <h3>📊 Результат расчёта</h3>
          <div class="result-grid">
            <div class="r-item">
              <span class="r-label">Город</span>
              <strong>{{ calcResult.city }}</strong>
            </div>
            <div class="r-item">
              <span class="r-label">Адрес ПВЗ</span>
              <strong>{{ calcResult.address }}</strong>
            </div>
            <div class="r-item">
              <span class="r-label">Расстояние</span>
              <strong>{{ calcResult.distance_km }} км</strong>
            </div>
            <div class="r-item">
              <span class="r-label">Тариф</span>
              <strong>{{ calcResult.formula_details.weight_kg }} кг × {{ calcResult.formula_details.distance_km }} км × {{ calcResult.formula_details.rate }} + {{ calcResult.formula_details.base }}₽</strong>
            </div>
            <div class="r-item" v-if="calcResult.max_shipping !== null">
              <span class="r-label">Ограничение (22%)</span>
              <strong>{{ calcResult.max_shipping }} ₽</strong>
            </div>
            <div class="r-item total">
              <span class="r-label">Итого к оплате</span>
              <strong class="total-price">{{ calcResult.total_shipping }} ₽</strong>
            </div>
          </div>
          <p class="calc-note">* Бесплатная доставка внутри города (если товар есть на локальном складе). Тариф применяется при межгороде.</p>
        </div>
      </transition>
    </section>

    <!-- 3. СТАТИСТИКА ПЛАТФОРМЫ -->
    <section class="stats-section">
      <div class="stat-card glass-card">
        <div class="stat-value">12+</div>
        <div class="stat-label">лет опыта</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value" :class="{'loading-text': loadingStats}">
          {{ loadingStats ? '...' : stats.totalProducts + '+' }}
        </div>
        <div class="stat-label">товаров в базе</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value" :class="{'loading-text': loadingStats}">
          {{ loadingStats ? '...' : stats.totalBrands }}
        </div>
        <div class="stat-label">официальных брендов</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-value">24/7</div>
        <div class="stat-label">поддержка клиентов</div>
      </div>
    </section>

    <!-- 4. УМНАЯ ЛОГИСТИКА -->
    <section class="logistics-section glass-card">
      <div class="logistics-info">
        <h2>📦 Умная логистика ApexDrive</h2>
        <p class="section-subtitle">Мы оптимизировали доставку так, чтобы она зависела от реального наличия товара в вашем регионе:</p>
        
        <div class="logistics-grid">
          <div class="logistics-item">
            <span class="logistics-icon">🏙️</span>
            <div>
              <strong>Внутри вашего города</strong>
              <p>Если товар есть на складе в вашем городе, перемещение в выбранный ПВЗ абсолютно <b>бесплатно</b>.</p>
            </div>
          </div>
          
          <div class="logistics-item">
            <span class="logistics-icon">🚚</span>
            <div>
              <strong>Межгород (до ПВЗ)</strong>
              <p>Если товара нет в вашем регионе, мы привезем его с ближайшего хаба. Стоимость рассчитывается по прозрачной формуле: <b>расстояние (км) × вес (кг) × коэффициент + базовая ставка</b>.</p>
            </div>
          </div>
          
          <div class="logistics-item">
            <span class="logistics-icon">⚖️</span>
            <div>
              <strong>Тяжёлые грузы</strong>
              <p>Чем тяжелее заказ, тем ниже коэффициент за килограмм‑километр. Мы не берём заоблачных сумм за крупногабарит.</p>
            </div>
          </div>
        </div>

        <div class="logistics-cta">
          <router-link to="/catalog" class="btn btn-primary btn-lg">🛒 Начать покупки</router-link>
          <p class="city-note">Наличие в <b>г. {{ appStore.city || 'вашем городе' }}</b> обновляется в реальном времени.</p>
        </div>
      </div>
    </section>

    <!-- 5. ИНТЕГРАЦИЯ API: ФИНАНСОВЫЙ РАДАР -->
    <section class="currency-radar-section glass-card">
      <div class="currency-content">
        <h2>Финансовый радар закупок</h2>
        <p>Поскольку 80% автокомпонентов импортируются, мы мониторим курсы валют ЦБ РФ в реальном времени, чтобы удерживать цены на складах максимально долго.</p>
        
        <div v-if="loadingCurrency" class="loading-state flex items-center gap-2">
          <span class="spinner"></span> Получение данных с биржи...
        </div>

        <div v-else-if="currencyData" class="currency-dashboard">
          <div class="currency-metrics">
            <div class="c-metric">
              <span class="c-flag">🇺🇸</span>
              <div class="c-val">{{ currencyData.usd }} ₽</div>
              <div class="c-lbl">USD (ЦБ РФ)</div>
            </div>
            <div class="c-metric">
              <span class="c-flag">🇪🇺</span>
              <div class="c-val">{{ currencyData.eur }} ₽</div>
              <div class="c-lbl">EUR (ЦБ РФ)</div>
            </div>
            <div class="c-metric">
              <span class="c-flag">🇨🇳</span>
              <div class="c-val">{{ currencyData.cny }} ₽</div>
              <div class="c-lbl">CNY (Китай)</div>
            </div>
          </div>

          <div class="price-index-box" :class="priceIndex.status">
            <div class="i-icon">{{ priceIndex.icon }}</div>
            <div>
              <strong>Индекс цен ApexDrive: {{ priceIndex.title }}</strong>
              <p>{{ priceIndex.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 6. НАШИ ПАРТНЕРЫ -->
    <section v-if="stats.brandsList && stats.brandsList.length" class="brands-section">
      <h2>С нами работают</h2>
      <div class="brands-grid">
        <div v-for="brand in stats.brandsList" :key="brand.name" class="brand-card glass-card">
          <img :src="brand.logo_url" :alt="brand.name" v-if="brand.logo_url" loading="lazy" />
          <div v-else class="brand-letter">{{ brand.name.charAt(0) }}</div>
          <div class="brand-name">{{ brand.name }}</div>
        </div>
      </div>
    </section>
    
    <section v-else-if="loadingStats" class="brands-section text-center">
      <h2>Загрузка партнеров...</h2>
    </section>

    <!-- 7. FAQ -->
    <section class="faq-section">
      <div class="section-header text-center">
        <h2>❓ Ответы на частые вопросы</h2>
      </div>
      
      <div class="faq-accordion">
        <div v-for="(faq, index) in faqs" :key="index" class="faq-item glass-card" :class="{ 'active': activeFaq === index }">
          <button class="faq-question" @click="toggleFaq(index)">
            {{ faq.question }}
            <span class="faq-icon" :class="{ 'rotate': activeFaq === index }">▼</span>
          </button>
          <div class="faq-answer" v-show="activeFaq === index">
            <p>{{ faq.answer }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 8. КАРТА -->
    <section class="map-section glass-card">
      <h2>Наш главный распределительный центр</h2>
      <p class="map-subtitle">Центральный хаб: г. Москва, ул. Тверская, д. 1. Отсюда осуществляются все межрегиональные отправки.</p>
      <div id="map" class="map-container"></div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const appStore = useAppStore();

// Статистика
const loadingStats = ref(true);
const stats = ref({ totalProducts: 0, totalBrands: 0, brandsList: [] });

const loadAboutData = async () => {
  loadingStats.value = true;
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/marketing/about-info`);
    stats.value = {
      totalProducts: res.data.totalProducts || 0,
      totalBrands: res.data.totalBrands || 0,
      brandsList: res.data.brandsList || []
    };
  } catch (e) {
    console.error('Ошибка загрузки статистики:', e.message);
  } finally {
    loadingStats.value = false;
  }
};

// Валютный радар
const currencyData = ref(null);
const loadingCurrency = ref(true);

const fetchCurrency = async () => {
  loadingCurrency.value = true;
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/marketing/currency`);
    currencyData.value = res.data;
  } catch (e) {
    console.error("Ошибка получения валют", e);
  } finally {
    loadingCurrency.value = false;
  }
};

const priceIndex = computed(() => {
  if (!currencyData.value) return { status: 'normal', icon: '🛡️', title: 'Ожидание данных', desc: 'Связь с ЦБ РФ...' };
  const usd = Number(currencyData.value.usd);
  if (usd > 105) return { status: 'danger', icon: '📈', title: 'Ожидается повышение', desc: 'В связи с высоким курсом закупки новые партии деталей могут подорожать. Рекомендуем покупать из наличия.' };
  if (usd < 85) return { status: 'success', icon: '📉', title: 'Благоприятный фон', desc: 'Курс валют снижается. Мы ожидаем падение цен на аналоги в ближайшие недели.' };
  return { status: 'normal', icon: '🛡️', title: 'Цены заморожены', desc: 'Мы зафиксировали цены на складские остатки. Текущий курс не влияет на детали в наличии.' };
});

// FAQ
const faqs = ref([
  { question: 'Что делать, если деталь мне не подошла?', answer: 'Мы понимаем, что подбор автозапчастей — сложный процесс. Если деталь не подошла к вашему авто, вы можете вернуть ее в любой из наших ПВЗ в течение 14 дней без объяснения причин. Средства вернутся на вашу карту.' },
  { question: 'Как работает гарантия на запчасти?', answer: 'Мы предоставляем официальную гарантию от 6 до 24 месяцев (в зависимости от производителя). При выявлении заводского брака мы бесплатно обменяем деталь или вернем деньги.' },
  { question: 'Как рассчитывается стоимость доставки из другого города?', answer: 'Стоимость доставки зависит от веса заказа и расстояния до ближайшего склада с товаром. Формула: расстояние (км) × вес (кг) × тариф (0.07–0.35) + 200 ₽. При этом итоговая сумма не может превышать 22% от стоимости товаров, которых нет в вашем городе. Если товар есть на локальном складе — доставка бесплатна.' },
  { question: 'Могу ли я оплатить заказ при получении?', answer: 'Да. При оформлении заказа выберите способ "Наличными" или "Картой в ПВЗ". Вы сможете осмотреть товар перед оплатой.' }
]);
const activeFaq = ref(null);
const toggleFaq = (index) => { activeFaq.value = activeFaq.value === index ? null : index; };

// Калькулятор доставки
const cities = ref([]);
const warehouses = ref([]);
const calcCityId = ref(null);
const calcWarehouseId = ref(null);
const calcWeight = ref(5);
const calcItemsCost = ref(0);
const calcLoading = ref(false);
const calcResult = ref(null);

const loadCities = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/cities`);
    cities.value = res.data || [];
  } catch (e) { console.warn('Не удалось загрузить города'); }
};

const loadWarehouses = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/warehouses`);
    warehouses.value = res.data || [];
  } catch (e) { console.warn('Не удалось загрузить склады'); }
};

const filteredWarehouses = computed(() => {
  if (!calcCityId.value) return [];
  return warehouses.value.filter(w => w.city_id === calcCityId.value);
});

const onCityChange = () => {
  calcWarehouseId.value = null;
};

const calculateShipping = async () => {
  if (!calcWarehouseId.value || !calcWeight.value) return;
  calcLoading.value = true;
  calcResult.value = null;
  try {
    const res = await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/shipping-calculator`, {
      warehouse_id: calcWarehouseId.value,
      weight_kg: calcWeight.value,
      items_cost: calcItemsCost.value || 0
    });
    calcResult.value = res.data;
  } catch (e) {
    alert('Ошибка расчёта: ' + (e.response?.data?.error || e.message));
  } finally {
    calcLoading.value = false;
  }
};

// Яндекс-карта
const initMap = () => {
  if (window.ymaps) {
    window.ymaps.ready(() => {
      const map = new window.ymaps.Map('map', { center: [55.7558, 37.6173], zoom: 13, controls: ['zoomControl'] });
      map.geoObjects.add(new window.ymaps.Placemark([55.7558, 37.6173], { balloonContent: 'Главный склад ApexDrive' }));
    });
  } else {
    const script = document.createElement('script');
    const apiKey = import.meta.env.VITE_YANDEX_API_KEY || '37b759c1-0a59-4439-bb59-f6607a62ed50';
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
    script.onload = () => {
      window.ymaps.ready(() => {
        const map = new window.ymaps.Map('map', { center: [55.7558, 37.6173], zoom: 13, controls: ['zoomControl'] });
        map.geoObjects.add(new window.ymaps.Placemark([55.7558, 37.6173], { balloonContent: 'ApexDrive Hub' }));
      });
    };
    document.head.appendChild(script);
  }
};

onMounted(() => {
  loadAboutData();
  fetchCurrency();
  initMap();
  loadCities();
  loadWarehouses();
});
</script>

<style scoped>
/* Общие анимации и уникальные стили страницы, совместимые с глобальной темой */
.about-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 16px 60px;
}

/* Hero */
.hero-about {
  display: flex;
  align-items: center;
  gap: 3rem;
  margin-bottom: 4rem;
  padding: 4rem 3rem;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 100%);
}

.hero-content {
  flex: 1.5;
  z-index: 2;
}

.hero-content h1 {
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 900;
  line-height: 1.2;
  margin-bottom: 1rem;
  color: var(--text-main);
}

.highlight {
  background: linear-gradient(120deg, var(--primary) 0%, var(--accent) 80%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-cta {
  display: inline-block;
  text-decoration: none;
}

.hero-image {
  flex: 1;
  position: relative;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
}

.shape-1 {
  width: 300px;
  height: 300px;
  background: var(--primary);
  top: -50px;
  right: -50px;
}

.shape-2 {
  width: 150px;
  height: 150px;
  background: var(--accent);
  bottom: 0;
  left: 0;
}

/* Калькулятор */
.calculator-section {
  margin: 4rem 0;
  padding: 3rem;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--primary-light) 30%);
}

.calculator-section h2 {
  margin-bottom: 0.5rem;
  font-size: 2.2rem;
  color: var(--text-main);
}

.calc-subtitle {
  color: var(--text-muted);
  margin-bottom: 2rem;
  font-size: 1.1rem;
}

.calc-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.calc-result {
  margin-top: 30px;
  padding: 20px;
  background: var(--success-light);
  border: 1px solid var(--success);
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.r-item {
  background: var(--bg-card);
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.r-item.total {
  background: var(--primary-light);
  border-color: var(--primary);
}

.r-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--text-muted);
  display: block;
  margin-bottom: 5px;
}

.total-price {
  font-size: 1.8rem;
  color: var(--primary);
}

.calc-note {
  margin-top: 15px;
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Статистика */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 2rem;
  margin: 4rem 0;
}

.stat-card {
  text-align: center;
  padding: 30px;
}

.stat-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary);
}

.stat-value {
  font-size: 2.8rem;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  margin-top: 8px;
}

/* Логистика */
.logistics-section {
  margin: 4rem 0;
  padding: 3rem;
}

.logistics-info h2 {
  font-size: 2.2rem;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.section-subtitle {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.logistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.logistics-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background: var(--bg-body);
  padding: 1.5rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: transform 0.2s, border-color 0.2s;
}

.logistics-item:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
}

.logistics-icon {
  font-size: 2.2rem;
  line-height: 1;
}

.logistics-item strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-main);
  font-size: 1.1rem;
}

.logistics-item p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.logistics-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.city-note {
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Валютный радар (акцентный блок) */
.currency-radar-section {
  margin: 4rem 0;
  padding: 3rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: white;
  border-color: #334155;
}

:global(.dark) .currency-radar-section {
  background: linear-gradient(135deg, #020617 0%, #0f172a 100%);
}

.currency-content h2 {
  color: white !important;
  margin-bottom: 10px;
  font-size: 2.2rem;
  font-weight: 800;
}

.currency-content p {
  color: #94a3b8;
  margin-bottom: 30px;
  font-size: 1.1rem;
  max-width: 800px;
}

.currency-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.c-metric {
  background: rgba(255,255,255,0.05);
  padding: 20px;
  border-radius: var(--radius-md);
  text-align: center;
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.2s, background 0.2s;
}

.c-metric:hover {
  background: rgba(255,255,255,0.1);
  transform: translateY(-3px);
}

.c-flag {
  font-size: 2.2rem;
  display: block;
  margin-bottom: 10px;
}

.c-val {
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
}

.c-lbl {
  font-size: 0.85rem;
  color: #94a3b8;
  text-transform: uppercase;
  margin-top: 5px;
  font-weight: 700;
}

.price-index-box {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 20px;
  border-radius: var(--radius-md);
  margin-top: 10px;
}

.price-index-box.normal {
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.4);
}

.price-index-box.normal strong {
  color: #60a5fa;
}

.price-index-box.danger {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.price-index-box.danger strong {
  color: #fb7185;
}

.price-index-box.success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.price-index-box.success strong {
  color: #34d399;
}

.i-icon {
  font-size: 2.5rem;
  line-height: 1;
}

.price-index-box p {
  margin: 5px 0 0 0;
  font-size: 0.95rem;
  color: #cbd5e1;
  line-height: 1.5;
}

/* Бренды */
.brands-section {
  margin: 4rem 0;
  text-align: center;
}

.brands-section h2 {
  margin-bottom: 30px;
  font-size: 2.2rem;
  color: var(--text-main);
}

.brands-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}

.brand-card {
  width: 140px;
  height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

.brand-card:hover {
  border-color: var(--primary);
  transform: translateY(-3px);
}

.brand-card img {
  max-width: 80%;
  max-height: 45px;
  object-fit: contain;
  margin-bottom: 8px;
  filter: grayscale(1) opacity(0.7);
  transition: filter 0.3s;
}

:global(.dark) .brand-card img {
  filter: grayscale(1) opacity(0.7) invert(1);
}

.brand-card:hover img {
  filter: grayscale(0) opacity(1);
}

:global(.dark) .brand-card:hover img {
  filter: grayscale(0) opacity(1) invert(0);
  background: #fff;
  border-radius: 4px;
  padding: 2px;
}

.brand-letter {
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 5px;
}

.brand-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.1;
}

/* FAQ */
.faq-section {
  margin: 5rem auto;
  max-width: 800px;
}

.section-header h2 {
  font-size: 2.2rem;
  margin-bottom: 30px;
  color: var(--text-main);
}

.faq-accordion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.faq-item.active {
  border-color: var(--primary);
}

.faq-question {
  width: 100%;
  padding: 20px;
  background: transparent;
  border: none;
  text-align: left;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text-main);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.faq-icon {
  font-size: 0.8rem;
  color: var(--primary);
  transition: transform 0.2s;
}

.faq-icon.rotate {
  transform: rotate(180deg);
}

.faq-answer {
  padding: 0 20px 20px 20px;
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
  border-top: 1px solid var(--border-color);
  margin-top: 10px;
  padding-top: 20px;
}

/* Карта */
.map-section {
  margin: 4rem 0;
  padding: 2rem;
}

.map-section h2 {
  margin-bottom: 10px;
  color: var(--text-main);
}

.map-subtitle {
  color: var(--text-muted);
  margin-bottom: 20px;
}

.map-container {
  width: 100%;
  height: 450px;
  background: var(--bg-body);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border-color);
  filter: grayscale(0.2);
  transition: filter 0.3s;
}

.map-container:hover {
  filter: grayscale(0);
}

:global(.dark) .map-container {
  filter: invert(0.9) hue-rotate(180deg) grayscale(0.5);
}

:global(.dark) .map-container:hover {
  filter: invert(0.9) hue-rotate(180deg) grayscale(0.2);
}

/* Адаптивность */
@media (max-width: 950px) {
  .hero-about {
    flex-direction: column;
    padding: 2rem;
    text-align: center;
  }
  .hero-image {
    height: 200px;
  }
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2.2rem;
  }
  .calculator-section,
  .logistics-section,
  .currency-radar-section {
    padding: 2rem 1.5rem;
  }
  .currency-metrics {
    grid-template-columns: 1fr;
  }
  .price-index-box {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }
  .logistics-cta {
    align-items: center;
    text-align: center;
    width: 100%;
  }
  .map-container {
    height: 300px;
  }
}

@media (max-width: 480px) {
  .stats-section {
    grid-template-columns: 1fr;
  }
  .faq-question {
    font-size: 0.95rem;
  }
  .calc-row {
    grid-template-columns: 1fr;
  }
}
</style>