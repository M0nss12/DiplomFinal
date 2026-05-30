<template>
  <main class="contacts-page animate-fade-in" aria-labelledby="contacts-heading">
    <!-- ГЕРОЙ-БЛОК с увеличенным изображением -->
    <section class="hero-contacts glass-card">
      <div class="hero-content">
        <h1>
          Связь с поддержкой 
          <span class="highlight">ApexDrive</span>
        </h1>
        <p class="hero-subtitle">
          Мы всегда на связи, чтобы помочь вам с выбором или решить любую проблему.
          Наша команда экспертов отвечает быстро, профессионально и с заботой о каждом клиенте.
        </p>
        <button @click="scrollToForm" class="btn btn-primary btn-lg hero-cta">
          Написать в поддержку
        </button>
      </div>
      <div class="hero-image">
        <img 
          src="/assets/images/contacts-hero.jpg" 
          alt="Служба поддержки ApexDrive" 
          class="hero-img"
          loading="eager"
        />
      </div>
    </section>

    <!-- БЛОК КЛЮЧЕВЫХ ПОКАЗАТЕЛЕЙ -->
    <section class="support-stats-grid" aria-label="Показатели качества поддержки">
      <div class="stat-card glass-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-value">4.9 / 5</div>
        <div class="stat-label">Рейтинг поддержки</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">⚡</div>
        <div class="stat-value">&lt; 2 мин</div>
        <div class="stat-label">Среднее время ответа</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">🏆</div>
        <div class="stat-value">99%</div>
        <div class="stat-label">Решенных обращений</div>
      </div>
      <div class="stat-card glass-card">
        <div class="stat-icon">🕒</div>
        <div class="stat-value">24/7</div>
        <div class="stat-label">Онлайн-чат</div>
      </div>
    </section>

    <!-- ТОСТ-УВЕДОМЛЕНИЯ -->
    <transition name="toast-fade">
      <div v-if="toast.show" class="toast" :class="toast.type" role="alert" aria-live="polite">
        {{ toast.message }}
      </div>
    </transition>

    <!-- 1. ОСНОВНЫЕ КОНТАКТЫ – фото увеличены -->
    <section class="contacts-info-grid" aria-label="Основные контакты">
      <article class="contact-item glass-card">
        <div class="contact-photo-wrapper">
          <img src="/assets/images/contacts-office.jpg" alt="Центральный офис" class="contact-photo" />
        </div>
        <h3>Центральный офис</h3>
        <address class="contact-address">
          <p>г. Москва, ул. Тверская, д. 1</p>
        </address>
        <a href="https://yandex.ru/maps/-/CCUZZM~6~A" target="_blank" class="map-link" rel="noopener noreferrer">Показать на карте →</a>
      </article>

      <article class="contact-item glass-card">
        <div class="contact-photo-wrapper">
          <img src="/assets/images/contacts-phone.jpg" alt="Горячая линия" class="contact-photo" />
        </div>
        <h3>Горячая линия</h3>
        <p class="copy-trigger" @click="copyToClipboard('+79991234567')">
          +7 (999) 123-45-67
          <span class="tooltip" ref="phoneTooltip">Скопировать</span>
        </p>
        <small>Ежедневно с 09:00 до 21:00</small>
      </article>

      <article class="contact-item glass-card">
        <div class="contact-photo-wrapper">
          <img src="/assets/images/contacts-email.jpg" alt="Электронная почта" class="contact-photo" />
        </div>
        <h3>Общая почта</h3>
        <p class="copy-trigger" @click="copyToClipboard('monsschogath@gmail.com')">
          monsschogath@gmail.com
          <span class="tooltip" ref="emailTooltip">Скопировать</span>
        </p>
        <small>Отвечаем в течение 15 минут</small>
      </article>

      <article class="contact-item glass-card">
        <div class="contact-photo-wrapper">
          <img src="/assets/images/contacts-hours.jpg" alt="Режим работы" class="contact-photo" />
        </div>
        <h3>Текущее время</h3>
        <div class="status-indicator" :class="isStoreOpen ? 'status-open' : 'status-closed'">
          <span class="dot"></span>
          {{ isStoreOpen ? 'Сейчас мы работаем' : 'Сейчас мы закрыты' }}
        </div>
        <small>Ваше местное время: {{ currentTime }}</small>
      </article>
    </section>

    <!-- 2. СПРАВОЧНИК ОТДЕЛОВ (фото отдела увеличено) -->
    <section class="departments-section" aria-labelledby="departments-heading">
      <h2 id="departments-heading" class="section-title">Выберите нужный отдел</h2>
      
      <div class="dept-tabs" role="tablist" aria-label="Список отделов">
        <button 
          v-for="dept in departments" 
          :key="dept.id" 
          @click="activeDept = dept"
          class="btn btn-outline dept-tab-btn"
          :class="{ active: activeDept.id === dept.id }"
          :aria-selected="activeDept.id === dept.id"
          role="tab"
        >
          {{ dept.name }}
        </button>
      </div>

      <transition name="fade" mode="out-in">
        <div class="dept-info-card glass-card" :key="activeDept.id" role="tabpanel" :aria-label="activeDept.name">
          <div class="dept-details">
            <h3>{{ activeDept.name }}</h3>
            <p>{{ activeDept.desc }}</p>
            <div class="dept-contacts">
              <div class="dc-item">
                <span>Прямой телефон:</span>
                <a :href="'tel:' + activeDept.phoneDigits" class="phone-link"><b>{{ activeDept.phone }}</b></a>
              </div>
              <div class="dc-item">
                <span>Email отдела:</span>
                <b>{{ activeDept.email }}</b>
              </div>
            </div>
            <div class="dept-messengers">
              <a v-if="activeDept.telegram" :href="'https://t.me/' + activeDept.telegram" target="_blank" class="msg-link telegram" aria-label="Написать в Telegram">
                Telegram ↗
              </a>
              <a v-if="activeDept.whatsapp" :href="'https://wa.me/' + activeDept.whatsapp" target="_blank" class="msg-link whatsapp" aria-label="Написать в WhatsApp">
                WhatsApp ↗
              </a>
            </div>
          </div>
          <div class="dept-hours">
            <span>Режим работы:</span>
            <div class="hours-badge">{{ activeDept.hours }}</div>
            <div class="dept-status" :class="isDeptOpen(activeDept) ? 'open' : 'closed'">
              {{ isDeptOpen(activeDept) ? 'Открыто' : 'Закрыто' }}
            </div>
          </div>
          <div class="department-photo-wrapper">
            <img src="/assets/images/contacts-department.jpg" alt="Отдел поддержки" class="department-photo" />
          </div>
        </div>
      </transition>
    </section>

    <hr class="section-divider" />

    <!-- 3. ФОРМА И СОЦСЕТИ -->
    <div class="support-split-section">
      <section class="feedback-form-container" aria-labelledby="feedback-heading" ref="formContainerRef">
        <h2 id="feedback-heading">Написать письмо</h2>
        <p class="section-desc">Для сложных вопросов, требующих детального разбора.</p>
        
        <form @submit.prevent="submitFeedback" class="feedback-form glass-card" novalidate>
          <div class="form-group">
            <label for="fb-name">Ваше имя</label>
            <input id="fb-name" v-model="feedback.name" placeholder="Иван Иванов" required />
          </div>
          
          <div class="form-group">
            <label for="fb-email">Email для ответа</label>
            <input id="fb-email" v-model="feedback.contact" type="email" placeholder="ivan@example.com" required :class="{ invalid: !emailValid && feedback.contact.length > 0 }" @blur="validateEmail" />
            <small v-if="!emailValid && feedback.contact.length > 0" class="error-hint">Введите корректный email</small>
          </div>
          
          <div class="form-group">
            <label for="fb-message">Сообщение</label>
            <textarea id="fb-message" v-model="feedback.message" placeholder="Опишите вашу проблему..." rows="5" required></textarea>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" :disabled="loading || !emailValid">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Отправка...' : 'Отправить сообщение' }}
          </button>
        </form>
      </section>

      <section class="social-links-container" aria-labelledby="social-heading">
        <h2 id="social-heading">Мы в соцсетях</h2>
        <p class="section-desc">Подпишитесь, чтобы следить за новостями, или напишите нам в личные сообщения.</p>

        <div class="social-grid">
          <a href="https://vk.com/mr.monss" target="_blank" class="social-card vk glass-card" rel="noopener noreferrer" aria-label="Группа ВКонтакте">
            <div class="social-info">
              <strong>ВКонтакте</strong>
              <span>Новости и акции</span>
            </div>
          </a>

          <a href="https://t.me/M0nss" target="_blank" class="social-card tg glass-card" rel="noopener noreferrer" aria-label="Telegram канал">
            <div class="social-info">
              <strong>Telegram</strong>
              <span>Быстрая поддержка</span>
            </div>
          </a>
        </div>

        <div class="support-hint glass-card">
          <span>⚡ Самый быстрый ответ — в <b>Telegram</b>. Время ожидания: ~2 минуты.</span>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue';
import axios from 'axios';

// --- toast уведомления ---
const toast = reactive({
  show: false,
  message: '',
  type: 'success'
});

const showToast = (msg, type = 'success') => {
  toast.message = msg;
  toast.type = type;
  toast.show = true;
  setTimeout(() => { toast.show = false; }, 3000);
};

// --- форма обратной связи ---
const feedback = reactive({
  name: '',
  contact: '',
  message: ''
});
const loading = ref(false);
const emailValid = ref(true);

const validateEmail = () => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  emailValid.value = re.test(feedback.contact || '');
};

const submitFeedback = async () => {
  if (!emailValid.value) return showToast('Пожалуйста, укажите корректный email', 'error');
  if (!feedback.name || !feedback.contact || !feedback.message) {
    return showToast('Заполните все поля', 'error');
  }
  loading.value = true;
  try {
    await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/feedback/send`, {
      name: feedback.name,
      contact: feedback.contact,
      message: feedback.message
    });
    showToast('Сообщение успешно отправлено! Мы ответим вам на почту.');
    feedback.name = '';
    feedback.contact = '';
    feedback.message = '';
    emailValid.value = true;
  } catch (e) {
    console.error("Ошибка формы обратной связи:", e);
    showToast('Не удалось отправить сообщение. Попробуйте позже.', 'error');
  } finally {
    loading.value = false;
  }
};

// --- копирование в буфер ---
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    const targetEl = event?.target?.closest('.copy-trigger');
    if (targetEl) {
      const tooltipSpan = targetEl.querySelector('.tooltip');
      if (tooltipSpan) {
        tooltipSpan.textContent = 'Скопировано!';
        tooltipSpan.classList.add('copied');
        setTimeout(() => {
          tooltipSpan.textContent = 'Скопировать';
          tooltipSpan.classList.remove('copied');
        }, 2000);
      }
    }
    showToast(`Скопировано: ${text}`);
  } catch (err) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Скопировано');
  }
};

// --- текущее время ---
const currentTime = ref('');
let timer = null;

const updateTime = () => {
  const d = new Date();
  currentTime.value = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
updateTime();
timer = setInterval(updateTime, 1000);

onUnmounted(() => clearInterval(timer));

// --- статус магазина ---
const isStoreOpen = computed(() => {
  const h = new Date().getHours();
  return h >= 9 && h < 21;
});

// --- справочник отделов ---
const departments = [
  { 
    id: 'sales', 
    name: 'Отдел продаж', 
    desc: 'Консультации по подбору запчастей, оформление заказов и вопросы оплаты.',
    phone: '+7 (999) 123-45-67 (доб. 1)',
    phoneDigits: '+79991234567',
    email: 'sales@apexdrive.ru',
    hours: '09:00 — 21:00',
    schedule: { open: 9, close: 21, days: [0,1,2,3,4,5,6] },
    telegram: 'apexdrive_sales',
    whatsapp: ''
  },
  { 
    id: 'warranty', 
    name: 'Возврат и Гарантия', 
    desc: 'Вопросы по возврату товаров, гарантийным случаям и претензиям.',
    phone: '+7 (999) 123-45-67 (доб. 2)',
    phoneDigits: '+79991234567',
    email: 'warranty@apexdrive.ru',
    hours: '10:00 — 19:00 (Пн-Пт)',
    schedule: { open: 10, close: 19, days: [1,2,3,4,5] },
    telegram: 'apexdrive_warranty',
    whatsapp: '79991234567'
  },
  { 
    id: 'b2b', 
    name: 'Оптовый отдел', 
    desc: 'Сотрудничество с СТО, таксопарками и магазинами. Оптовые прайс-листы.',
    phone: '+7 (999) 123-45-67 (доб. 3)',
    phoneDigits: '+79991234567',
    email: 'b2b@apexdrive.ru',
    hours: '09:00 — 18:00 (Пн-Пт)',
    schedule: { open: 9, close: 18, days: [1,2,3,4,5] },
    telegram: '',
    whatsapp: '79991234567'
  }
];

const activeDept = ref(departments[0]);

const isDeptOpen = (dept) => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;
  const openMinutes = dept.schedule.open * 60;
  const closeMinutes = dept.schedule.close * 60;
  return dept.schedule.days.includes(day) && currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

// --- плавный скролл к форме ---
const formContainerRef = ref(null);
const scrollToForm = () => {
  formContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<style scoped>
.contacts-page {
  padding-top: 40px;
  padding-bottom: 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 96%;
}

/* ГЕРОЙ-БЛОК */
.hero-contacts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 50px;
  padding: 50px 50px;
  margin-bottom: 60px;
  background: var(--bg-glass);
  backdrop-filter: blur(2px);
  border-radius: 40px;
  transition: all 0.3s;
}
.hero-content {
  flex: 1;
}
.hero-content h1 {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 20px;
  color: var(--text-main);
}
.highlight {
  background: linear-gradient(135deg, var(--primary), #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.5;
  color: var(--text-muted);
  margin-bottom: 30px;
  max-width: 90%;
}
.hero-cta {
  padding: 14px 36px;
  font-weight: 700;
  font-size: 1.05rem;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
}
.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
}
.hero-img {
  width: 100%;
  max-width: 600px;
  height: auto;
  border-radius: 32px;
  object-fit: cover;
  box-shadow: 0 30px 45px -12px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s ease;
}
.hero-img:hover {
  transform: scale(1.02);
}

/* Статистика */
.support-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 28px;
  margin-bottom: 70px;
}
.stat-card {
  padding: 24px 16px;
  text-align: center;
  border-radius: 32px;
  transition: transform 0.2s, background 0.2s;
}
.stat-card:hover {
  transform: translateY(-6px);
}
.stat-icon {
  font-size: 2.8rem;
  margin-bottom: 14px;
}
.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 6px;
}
.stat-label {
  font-size: 1rem;
  color: var(--text-muted);
}

/* Основные контакты */
.contacts-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  margin-bottom: 70px;
}
.contact-item {
  padding: 24px 20px 28px;
  text-align: center;
  border-radius: 32px;
  transition: all 0.25s;
}
.contact-item:hover {
  transform: translateY(-8px);
  border-color: var(--primary);
  box-shadow: 0 20px 30px -12px rgba(0, 0, 0, 0.15);
}
.contact-photo-wrapper {
  overflow: hidden;
  border-radius: 24px;
  margin-bottom: 20px;
}
.contact-photo {
  width: 100%;
  height: 360px;
  object-fit: cover;
  transition: transform 0.4s ease;
  border-radius: 24px;
}
.contact-item:hover .contact-photo {
  transform: scale(1.04);
}
.contact-item h3 {
  font-size: 1.3rem;
  margin-bottom: 12px;
  font-weight: 700;
}
.contact-address p {
  font-style: normal;
  font-weight: 500;
}
.map-link {
  display: inline-block;
  margin-top: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.map-link:hover {
  text-decoration: underline;
}
.copy-trigger {
  position: relative;
  display: inline-block;
  cursor: pointer;
  font-weight: 800;
  font-size: 1.2rem;
  transition: color 0.2s;
}
.copy-trigger:hover {
  color: var(--primary);
}
.tooltip {
  visibility: hidden;
  background-color: var(--text-main);
  color: var(--bg-card);
  padding: 8px 14px;
  border-radius: 12px;
  position: absolute;
  bottom: 130%;
  left: 50%;
  transform: translateX(-50%) translateY(5px);
  font-size: 0.8rem;
  white-space: nowrap;
  opacity: 0;
  transition: 0.2s;
}
.copy-trigger:hover .tooltip {
  visibility: visible;
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.tooltip.copied {
  visibility: visible;
  opacity: 1;
  background-color: var(--success);
  color: white;
}
.contact-item small {
  display: block;
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.status-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 50px;
  font-weight: 800;
  margin: 10px 0;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}
.status-open {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}
.status-closed {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

/* Отделы */
.section-title {
  text-align: center;
  font-size: 2.2rem;
  font-weight: 800;
  margin-bottom: 35px;
}
.dept-tabs {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}
.dept-tab-btn {
  border-radius: 60px;
  font-weight: 700;
  padding: 12px 32px;
  font-size: 1.05rem;
  transition: all 0.25s;
}
.dept-tab-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.4);
}
.dept-info-card {
  padding: 45px 40px;
  display: flex;
  flex-wrap: wrap;
  gap: 45px;
  border-radius: 40px;
  border-top: 4px solid var(--primary);
  align-items: center;
  justify-content: center;
}
.dept-details {
  flex: 2;
  min-width: 240px;
}
.dept-details h3 {
  font-size: 1.8rem;
  margin-bottom: 15px;
}
.dept-details p {
  font-size: 1.1rem;
  margin-bottom: 25px;
  color: var(--text-muted);
}
.dept-contacts {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.dc-item {
  display: flex;
  flex-direction: column;
}
.dc-item span {
  font-size: 0.85rem;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--text-muted);
}
.dc-item b {
  font-size: 1.3rem;
  color: var(--primary);
  margin-top: 5px;
}
.phone-link {
  text-decoration: none;
  color: inherit;
}
.dept-messengers {
  display: flex;
  gap: 15px;
  margin-top: 15px;
}
.msg-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 40px;
  background: rgba(0,0,0,0.03);
  border: 1px solid var(--border-color);
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.msg-link:hover {
  transform: translateY(-2px);
}
.telegram:hover {
  background: #24A1DE;
  color: white;
  border-color: #24A1DE;
}
.whatsapp:hover {
  background: #25D366;
  color: white;
  border-color: #25D366;
}
.dept-hours {
  text-align: center;
  min-width: 180px;
}
.dept-hours span {
  display: block;
  font-size: 0.85rem;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 8px;
}
.hours-badge {
  background: rgba(0,0,0,0.03);
  padding: 14px 28px;
  border-radius: 40px;
  font-weight: 800;
  font-size: 1.1rem;
  border: 1px solid var(--border-color);
  margin-bottom: 12px;
}
.dept-status {
  font-weight: 800;
  font-size: 1rem;
}
.dept-status.open {
  color: var(--success);
}
.dept-status.closed {
  color: var(--danger);
}
.department-photo-wrapper {
  flex: 1;
  display: flex;
  justify-content: center;
}
.department-photo {
  width: 380px;
  height: 380px;
  object-fit: cover;
  border-radius: 32px;
  box-shadow: 0 20px 30px rgba(0,0,0,0.15);
  transition: transform 0.3s;
}
.department-photo:hover {
  transform: scale(1.03);
}

/* Форма и соцсети */
.section-divider {
  border: 0;
  border-top: 1px solid var(--border-color);
  margin: 60px 0;
}
.support-split-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
}
.feedback-form-container h2,
.social-links-container h2 {
  font-size: 2rem;
  margin-bottom: 10px;
  font-weight: 800;
}
.section-desc {
  color: var(--text-muted);
  margin-bottom: 25px;
  font-size: 1.05rem;
}
.feedback-form {
  padding: 38px;
  border-radius: 36px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-weight: 700;
  margin-bottom: 8px;
}
.form-group input.invalid {
  border-color: var(--danger);
}
.error-hint {
  color: var(--danger);
  font-size: 0.85rem;
  margin-top: 5px;
}
.btn-block {
  width: 100%;
}
.social-grid {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.social-card {
  display: flex;
  align-items: center;
  padding: 20px 28px;
  text-decoration: none;
  color: var(--text-main);
  border-radius: 28px;
  transition: transform 0.2s, border 0.2s;
}
.social-card:hover {
  transform: translateX(10px);
}
.social-info {
  flex: 1;
}
.social-info strong {
  font-size: 1.15rem;
  font-weight: 800;
}
.social-info span {
  font-size: 0.9rem;
  color: var(--text-muted);
}
.vk:hover {
  color: #0077FF;
  border-color: #0077FF;
}
.tg:hover {
  color: #24A1DE;
  border-color: #24A1DE;
}
.support-hint {
  margin-top: 30px;
  padding: 22px;
  border-radius: 28px;
  background: rgba(37, 99, 235, 0.05);
  border-left: 4px solid var(--primary);
  font-size: 1rem;
}

/* Тост */
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  padding: 16px 28px;
  border-radius: 60px;
  backdrop-filter: blur(12px);
  font-weight: 600;
  box-shadow: 0 12px 28px rgba(0,0,0,0.2);
}
.toast.success {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}
.toast.error {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}
.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Адаптивность */
@media (max-width: 1000px) {
  .hero-contacts {
    flex-direction: column;
    text-align: center;
    padding: 40px 30px;
  }
  .hero-subtitle {
    max-width: 100%;
  }
  .hero-img {
    max-width: 500px;
  }
  .contact-photo {
    height: 300px;
  }
  .department-photo {
    width: 320px;
    height: 320px;
  }
  .support-split-section {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 700px) {
  .contacts-info-grid {
    grid-template-columns: 1fr;
  }
  .contact-photo {
    height: 280px;
  }
  .department-photo {
    width: 280px;
    height: 280px;
  }
  .hero-img {
    max-width: 100%;
  }
  .hero-content h1 {
    font-size: 2.4rem;
  }
  .dept-info-card {
    padding: 30px 20px;
  }
  .dept-details h3 {
    font-size: 1.5rem;
  }
}
</style>