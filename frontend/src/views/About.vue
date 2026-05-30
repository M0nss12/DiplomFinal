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
        <img src="/assets/images/about-hero.jpg" alt="ApexDrive" class="hero-img" />
      </div>
    </section>

    <!-- 2. КАЛЬКУЛЯТОР ДОСТАВКИ -->
    <section class="calculator-section glass-card">
      <h2>Калькулятор доставки</h2>
      <p class="calc-subtitle">Узнайте примерную стоимость доставки с центрального склада (Москва) в выбранный пункт выдачи</p>

      <form @submit.prevent="calculateShipping" class="calc-form">
        <div class="calc-row">
          <div class="form-group">
            <label>Город получения</label>
            <select v-model="calcCityId" @change="onCityChange">
              <option :value="null" disabled>-- Выберите город --</option>
              <option v-for="c in cities" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Пункт выдачи (ПВЗ)</label>
            <select v-model="calcWarehouseId" :disabled="!calcCityId">
              <option :value="null" disabled>-- Выберите ПВЗ --</option>
              <option v-for="w in filteredWarehouses" :key="w.id" :value="w.id">
                {{ w.address }} ({{ w.cities?.name || '' }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Вес заказа (кг)</label>
            <input v-model.number="calcWeight" type="number" step="0.1" min="0.1" required placeholder="Например, 4.5" />
          </div>
          <div class="form-group">
            <label>Стоимость товаров (руб., для ограничения 22%)</label>
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
          <h3>Результат расчёта</h3>
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

    <!-- 4. УМНАЯ ЛОГИСТИКА (3 фотографии) -->
    <section class="logistics-section glass-card">
      <div class="logistics-info">
        <h2>Умная логистика ApexDrive</h2>
        <p class="section-subtitle">Мы оптимизировали доставку так, чтобы она зависела от реального наличия товара в вашем регионе:</p>
        
        <div class="logistics-grid">
          <div class="logistics-item">
            <img src="/assets/images/about-local.jpg" alt="Локальный склад" class="logistics-img" />
            <div class="logistics-text">
              <strong>Внутри вашего города</strong>
              <p>Если товар есть на складе в вашем городе, перемещение в выбранный ПВЗ абсолютно <b>бесплатно</b>.</p>
            </div>
          </div>
          
          <div class="logistics-item">
            <img src="/assets/images/about-intercity.jpg" alt="Межгород" class="logistics-img" />
            <div class="logistics-text">
              <strong>Межгород (до ПВЗ)</strong>
              <p>Если товара нет в вашем регионе, мы привезем его с ближайшего хаба. Стоимость рассчитывается по прозрачной формуле: <b>расстояние (км) × вес (кг) × коэффициент + базовая ставка</b>.</p>
            </div>
          </div>
          
          <div class="logistics-item">
            <img src="/assets/images/about-heavy.jpg" alt="Тяжёлые грузы" class="logistics-img" />
            <div class="logistics-text">
              <strong>Тяжёлые грузы</strong>
              <p>Чем тяжелее заказ, тем ниже коэффициент за килограмм‑километр. Мы не берём заоблачных сумм за крупногабарит.</p>
            </div>
          </div>
        </div>

        <div class="logistics-cta">
          <router-link to="/catalog" class="btn btn-primary btn-lg">Начать покупки</router-link>
          <p class="city-note">Наличие в <b>г. {{ appStore.city || 'вашем городе' }}</b> обновляется в реальном времени.</p>
        </div>
      </div>
    </section>

    <!-- 5. НАША КОМАНДА (1 фотография) -->
    <section class="team-section glass-card">
      <h2>Наша команда</h2>
      <div class="team-content">
        <img src="/assets/images/about-team.jpg" alt="Команда ApexDrive" class="team-img" />
        <p class="team-text">Профессионалы с многолетним опытом, готовые помочь вам.</p>
      </div>
    </section>

    <!-- 6. FAQ -->
    <section class="faq-section">
      <div class="section-header text-center">
        <h2>Ответы на частые вопросы</h2>
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
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { useAppStore } from '@/stores/appStore';

const appStore = useAppStore();

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

const faqs = ref([
  { question: 'Что делать, если деталь мне не подошла?', answer: 'Мы понимаем, что подбор автозапчастей — сложный процесс. Если деталь не подошла к вашему авто, вы можете вернуть ее в любой из наших ПВЗ в течение 14 дней без объяснения причин. Средства вернутся на вашу карту.' },
  { question: 'Как работает гарантия на запчасти?', answer: 'Мы предоставляем официальную гарантию от 6 до 24 месяцев (в зависимости от производителя). При выявлении заводского брака мы бесплатно обменяем деталь или вернем деньги.' },
  { question: 'Как рассчитывается стоимость доставки из другого города?', answer: 'Стоимость доставки зависит от веса заказа и расстояния до ближайшего склада с товаром. Формула: расстояние (км) × вес (кг) × тариф (0.07–0.35) + 200 ₽. При этом итоговая сумма не может превышать 22% от стоимости товаров, которых нет в вашем городе. Если товар есть на локальном складе — доставка бесплатна.' },
  { question: 'Могу ли я оплатить заказ при получении?', answer: 'Да. При оформлении заказа выберите способ "Наличными" или "Картой в ПВЗ". Вы сможете осмотреть товар перед оплатой.' }
]);
const activeFaq = ref(null);
const toggleFaq = (index) => { activeFaq.value = activeFaq.value === index ? null : index; };

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

onMounted(() => {
  loadAboutData();
  loadCities();
  loadWarehouses();
});
</script>

<style scoped>
.about-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 16px 60px;
}

/* HERO — ФОТО СТАЛО ЕЩЁ БОЛЬШЕ */
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
  height: 480px; /* УВЕЛИЧЕНО с 350px до 480px */
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius-md);
}

/* КАЛЬКУЛЯТОР */
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

/* СТАТИСТИКА */
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

/* ЛОГИСТИКА — ФОТО ЕЩЁ БОЛЬШЕ */
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
  flex-direction: column;
  background: var(--bg-body);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  transition: transform 0.2s, border-color 0.2s;
  overflow: hidden;
}

.logistics-item:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
}

.logistics-img {
  width: 100%;
  height: 340px; /* УВЕЛИЧЕНО с 260px до 340px */
  object-fit: cover;
}

.logistics-text {
  padding: 1.5rem;
}

.logistics-text strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-main);
  font-size: 1.1rem;
}

.logistics-text p {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
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

/* НАША КОМАНДА */
.team-section {
  margin: 4rem 0;
  padding: 3rem;
  text-align: center;
}

.team-section h2 {
  font-size: 2.2rem;
  margin-bottom: 2rem;
  color: var(--text-main);
}

.team-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
}

.team-img {
  max-width: 800px;
  width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  object-fit: cover;
  box-shadow: var(--shadow-md);
}

.team-text {
  font-size: 1.4rem;
  font-weight: 500;
  color: var(--text-main);
  max-width: 800px;
  line-height: 1.6;
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

/* Адаптив */
@media (max-width: 950px) {
  .hero-about {
    flex-direction: column;
    padding: 2rem;
    text-align: center;
  }
  .hero-image {
    height: 300px; /* немного уменьшаем на планшетах */
  }
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  .team-img {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .hero-content h1 {
    font-size: 2.2rem;
  }
  .calculator-section,
  .logistics-section,
  .team-section {
    padding: 2rem 1.5rem;
  }
  .logistics-cta {
    align-items: center;
    text-align: center;
    width: 100%;
  }
  .logistics-img {
    height: 380px; /* на мобильных тоже очень крупные */
  }
  .hero-image {
    height: 250px;
  }
  .team-text {
    font-size: 1.2rem;
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