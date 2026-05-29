<template>
  <main class="contacts-page animate-fade-in" aria-labelledby="contacts-heading">
    <!-- ЗАГОЛОВОК -->
    <header class="contacts-page-header">
      <h1 id="contacts-heading">Связь с поддержкой</h1>
      <p>Мы всегда на связи, чтобы помочь вам с выбором или решить любую проблему.</p>
    </header>

    <!-- ТОСТ-УВЕДОМЛЕНИЯ -->
    <transition name="toast-fade">
      <div v-if="toast.show" class="toast" :class="toast.type" role="alert" aria-live="polite">
        {{ toast.message }}
      </div>
    </transition>

    <!-- 1. ОСНОВНЫЕ КОНТАКТЫ (СЕТКА) -->
    <section class="contacts-info-grid" aria-label="Основные контакты">
      <!-- ОФИС -->
      <article class="contact-item glass-card">
        <h3>📍 Центральный офис</h3>
        <address class="contact-address">
          <p>г. Москва, ул. Тверская, д. 1</p>
        </address>
        <a href="https://yandex.ru/maps/-/CCUZZM~6~A" target="_blank" class="map-link" rel="noopener noreferrer">Показать на карте →</a>
      </article>

      <!-- ТЕЛЕФОН -->
      <article class="contact-item glass-card">
        <h3>📞 Горячая линия</h3>
        <p class="copy-trigger" @click="copyToClipboard('+79991234567')">
          +7 (999) 123-45-67
          <span class="tooltip" ref="phoneTooltip">Скопировать</span>
        </p>
        <small>Ежедневно с 09:00 до 21:00</small>
      </article>

      <!-- ПОЧТА -->
      <article class="contact-item glass-card">
        <h3>✉️ Общая почта</h3>
        <p class="copy-trigger" @click="copyToClipboard('monsschogath@gmail.com')">
          monsschogath@gmail.com
          <span class="tooltip" ref="emailTooltip">Скопировать</span>
        </p>
        <small>Отвечаем в течение 15 минут</small>
      </article>

      <!-- СТАТУС -->
      <article class="contact-item status-box glass-card">
        <h3>🕒 Текущее время</h3>
        <div class="status-indicator" :class="isStoreOpen ? 'status-open' : 'status-closed'">
          <span class="dot"></span>
          {{ isStoreOpen ? 'Сейчас мы работаем' : 'Сейчас мы закрыты' }}
        </div>
        <small>Ваше местное время: {{ currentTime }}</small>
      </article>
    </section>

    <!-- 2. СПРАВОЧНИК ОТДЕЛОВ -->
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
          <span class="dept-icon">{{ dept.icon }}</span> {{ dept.name }}
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
                <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="Telegram" class="msg-icon"> Telegram
              </a>
              <a v-if="activeDept.whatsapp" :href="'https://wa.me/' + activeDept.whatsapp" target="_blank" class="msg-link whatsapp" aria-label="Написать в WhatsApp">
                <span class="msg-icon">💬</span> WhatsApp
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
        </div>
      </transition>
    </section>

    <hr class="section-divider" />

    <!-- 3. БЛОК С ФОРМОЙ И СОЦСЕТЯМИ -->
    <div class="support-split-section">
      <!-- ЛЕВАЯ: ФОРМА -->
      <section class="feedback-form-container" aria-labelledby="feedback-heading">
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

      <!-- ПРАВАЯ: СОЦСЕТИ -->
      <section class="social-links-container" aria-labelledby="social-heading">
        <h2 id="social-heading">Мы в соцсетях</h2>
        <p class="section-desc">Подпишитесь, чтобы следить за новостями, или напишите нам в личные сообщения.</p>

        <div class="social-grid">
          <!-- VK -->
          <a href="https://vk.com/mr.monss" target="_blank" class="social-card vk glass-card" rel="noopener noreferrer" aria-label="Группа ВКонтакте">
            <div class="social-icon">
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/21/VK.com-logo.svg" alt="VK">
            </div>
            <div class="social-info">
              <strong>ВКонтакте</strong>
              <span>Новости и акции</span>
            </div>
            <div class="social-arrow">↗</div>
          </a>

          <!-- TELEGRAM -->
          <a href="https://t.me/M0nss" target="_blank" class="social-card tg glass-card" rel="noopener noreferrer" aria-label="Telegram канал">
            <div class="social-icon">
              <img src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg" alt="TG">
            </div>
            <div class="social-info">
              <strong>Telegram</strong>
              <span>Быстрая поддержка</span>
            </div>
            <div class="social-arrow">↗</div>
          </a>
        </div>

        <div class="support-hint glass-card">
          <span class="hint-icon">💡</span>
          <span>Самый быстрый ответ — в <b>Telegram</b>. Время ожидания: ~2 минуты.</span>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
// (скрипт без изменений, приведён полностью для копирования)
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

// ---------- ТОСТ ----------
const toast = reactive({
  show: false,
  message: '',
  type: 'success' // 'success' / 'error'
});

const showToast = (msg, type = 'success') => {
  toast.message = msg;
  toast.type = type;
  toast.show = true;
  setTimeout(() => { toast.show = false; }, 3000);
};

// ---------- ОБРАТНАЯ СВЯЗЬ ----------
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
    showToast('✅ Сообщение успешно отправлено! Мы ответим вам на почту.');
    feedback.name = '';
    feedback.contact = '';
    feedback.message = '';
    emailValid.value = true;
  } catch (e) {
    console.error("Ошибка формы обратной связи:", e);
    showToast('❌ Не удалось отправить сообщение. Попробуйте позже.', 'error');
  } finally {
    loading.value = false;
  }
};

// ---------- КОПИРОВАНИЕ ----------
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
    showToast('Скопировано (устаревший метод)');
  }
};

// ---------- ВРЕМЯ РАБОТЫ ----------
const currentTime = ref('');
let timer = null;

const updateTime = () => {
  const d = new Date();
  currentTime.value = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};
updateTime();
timer = setInterval(updateTime, 1000);

onUnmounted(() => clearInterval(timer));

const isStoreOpen = computed(() => {
  const h = new Date().getHours();
  return h >= 9 && h < 21;
});

// ---------- ОТДЕЛЫ ----------
const departments = [
  { 
    id: 'sales', 
    name: 'Отдел продаж', 
    icon: '🛒', 
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
    icon: '🛡️', 
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
    icon: '🤝', 
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
</script>

<style scoped>
/* ==========================================================================
   УНИКАЛЬНЫЕ СТИЛИ (всё общее убрано, используется глобальный CSS)
   ========================================================================== */
.contacts-page {
  padding-top: 40px;
  padding-bottom: 60px;
  max-width: 1400px;
  margin: 0 auto;
  width: 96%;
}

/* Заголовок */
.contacts-page-header { text-align: center; margin-bottom: 50px; }
.contacts-page-header h1 { font-size: 2.8rem; font-weight: 900; margin-bottom: 10px; color: var(--text-main); }
.contacts-page-header p { color: var(--text-muted); font-size: 1.1rem; }

/* Сетка контактов */
.contacts-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 25px;
  margin-bottom: 50px;
}

.contact-item {
  padding: 30px;
  text-align: center;
  position: relative;
}
.contact-item:hover {
  transform: translateY(-5px);
  border-color: var(--primary);
}
.contact-item h3 { font-size: 1.1rem; margin-bottom: 15px; color: var(--text-muted); font-weight: 700; }
.contact-item p { font-size: 1.2rem; font-weight: 800; color: var(--text-main); margin-bottom: 5px; }
.contact-address p { cursor: default; font-style: normal; }

.map-link { color: var(--primary); font-weight: 600; text-decoration: none; transition: color 0.2s; }
.map-link:hover { color: var(--primary-hover); text-decoration: underline; }

/* Копирование */
.copy-trigger { position: relative; display: inline-block; cursor: pointer; }
.copy-trigger:hover { color: var(--primary); }
.tooltip {
  visibility: hidden;
  background-color: var(--text-main);
  color: var(--bg-card);
  text-align: center;
  padding: 6px 12px;
  border-radius: 6px;
  position: absolute;
  z-index: 10;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%) translateY(5px);
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}
:global(.dark) .tooltip { background-color: #f8fafc; color: #0f172a; }
.tooltip::after {
  content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px;
  border-width: 5px; border-style: solid; border-color: var(--text-main) transparent transparent transparent;
}
:global(.dark) .tooltip::after { border-color: #f8fafc transparent transparent transparent; }
.copy-trigger:hover .tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); }
.tooltip.copied { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); background-color: var(--success); color: white; }
.tooltip.copied::after { border-color: var(--success) transparent transparent transparent; }

.contact-item small { display: block; margin-top: 10px; color: var(--text-muted); font-size: 0.85rem; font-weight: 500; }

/* Индикатор статуса */
.status-indicator {
  display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
  border-radius: 50px; font-weight: 800; font-size: 0.95rem; margin: 10px 0;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; display: inline-block; box-shadow: 0 0 8px currentColor; }
.status-open { background: rgba(16, 185, 129, 0.1); color: var(--success); }
.status-closed { background: rgba(239, 68, 68, 0.1); color: var(--danger); }

/* Тост */
.toast {
  position: fixed; top: 20px; right: 20px; z-index: 9999; padding: 16px 24px;
  border-radius: var(--radius-md); font-weight: 600; display: flex; align-items: center; gap: 10px;
  backdrop-filter: blur(10px); box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}
.toast.success { background: rgba(16, 185, 129, 0.9); color: white; }
.toast.error { background: rgba(239, 68, 68, 0.9); color: white; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(30px); }

/* Отделы */
.section-title { text-align: center; margin-bottom: 30px; font-size: 2rem; color: var(--text-main); }

.dept-tabs { display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }

/* Кнопка таба отделов */
.dept-tab-btn {
  border-radius: 40px;
  font-weight: 600;
  padding: 12px 24px;
  font-size: 1rem;
  transition: all 0.3s;
}
.dept-tab-btn:hover {
  transform: translateY(-2px);
}
.dept-tab-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.dept-icon { margin-right: 6px; }

/* Карточка информации отдела */
.dept-info-card {
  padding: 40px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: 950px;
  margin: 0 auto;
  border-top: 4px solid var(--primary);
  flex-wrap: wrap;
  gap: 25px;
}

.dept-details { flex: 1; }
.dept-details h3 { font-size: 1.6rem; margin-bottom: 15px; color: var(--text-main); font-weight: 800; }
.dept-details p { color: var(--text-muted); margin-bottom: 25px; max-width: 500px; font-size: 1.05rem; line-height: 1.5; }

.dept-contacts { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 20px; }
.dc-item { display: flex; flex-direction: column; }
.dc-item span { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; }
.dc-item b { font-size: 1.2rem; color: var(--primary); margin-top: 5px; font-weight: 800; }
:global(.dark) .dc-item b { color: #60a5fa; }
.phone-link { text-decoration: none; color: inherit; }

.dept-messengers { display: flex; gap: 15px; margin-top: 15px; }
.msg-link {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 30px;
  background: rgba(0,0,0,0.03); border: 1px solid var(--border-color);
  font-weight: 600; font-size: 0.95rem; color: var(--text-main); text-decoration: none;
  transition: all 0.2s;
}
:global(.dark) .msg-link { background: rgba(255,255,255,0.05); border-color: #475569; color: #f8fafc; }
.msg-link:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
.msg-icon { width: 20px; height: 20px; object-fit: contain; }
.telegram:hover { background: #24A1DE; color: white; border-color: #24A1DE; }
.whatsapp:hover { background: #25D366; color: white; border-color: #25D366; }

.dept-hours { text-align: right; min-width: 200px; }
.dept-hours span { display: block; font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; margin-bottom: 5px; }
.hours-badge {
  background: rgba(0,0,0,0.03); padding: 12px 24px; border-radius: var(--radius-md);
  font-weight: 800; color: var(--text-main); border: 1px solid var(--border-color);
  margin-bottom: 10px;
}
:global(.dark) .hours-badge { background: rgba(255,255,255,0.05); border-color: #475569; color: #f8fafc; }
.dept-status { font-weight: 800; font-size: 0.9rem; }
.dept-status.open { color: var(--success); }
.dept-status.closed { color: var(--danger); }

/* Форма и соцсети */
.support-split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
.section-divider { border: 0; border-top: 1px solid var(--border-color); margin: 60px 0; }

.feedback-form-container h2, .social-links-container h2 { font-size: 2rem; margin-bottom: 10px; color: var(--text-main); font-weight: 800; }
.section-desc { color: var(--text-muted); margin-bottom: 25px; font-size: 1.05rem; }

.feedback-form { padding: 30px; }

/* Поля формы используют глобальные стили, только подсветка ошибки */
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: 700; margin-bottom: 8px; font-size: 0.95rem; color: var(--text-main); }
.form-group input.invalid, .form-group textarea.invalid { border-color: var(--danger); }
.error-hint { color: var(--danger); font-size: 0.85rem; margin-top: 5px; display: block; font-weight: 500; }

/* Кнопка отправки формы – глобальный .btn .btn-primary .btn-block */
/* (стилизация находится в глобальном CSS) */

/* Соцсети */
.social-links-container { display: flex; flex-direction: column; }
.social-grid { display: flex; flex-direction: column; gap: 15px; }

.social-card {
  display: flex; align-items: center; padding: 15px 20px; text-decoration: none; color: var(--text-main);
}
.social-card:hover { transform: translateX(8px); border-color: currentColor; }

.social-icon img { width: 42px; height: 42px; object-fit: contain; }
.social-info { flex: 1; margin-left: 20px; display: flex; flex-direction: column; }
.social-info strong { font-size: 1.15rem; font-weight: 800; margin-bottom: 2px; }
.social-info span { font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
.social-arrow { font-size: 1.5rem; color: var(--text-muted); transition: transform 0.3s; }
.social-card:hover .social-arrow { transform: translate(3px, -3px) scale(1.1); color: currentColor; }

.vk:hover { color: #0077FF; border-color: #0077FF; }
.tg:hover { color: #24A1DE; border-color: #24A1DE; }

.support-hint {
  margin-top: 30px;
  background: rgba(37, 99, 235, 0.05);
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 0.95rem;
  line-height: 1.5;
  border-left: 4px solid var(--primary);
  color: var(--text-main);
}
:global(.dark) .support-hint { background: rgba(37, 99, 235, 0.1); color: #e2e8f0; }
.hint-icon { font-size: 1.8rem; }
.support-hint b { color: var(--primary); }
:global(.dark) .support-hint b { color: #60a5fa; }

/* Адаптивность */
@media (max-width: 950px) {
  .support-split-section { grid-template-columns: 1fr; gap: 50px; }
  .dept-info-card { flex-direction: column; text-align: center; gap: 25px; }
  .dept-contacts { flex-direction: column; gap: 15px; align-items: center; }
  .dept-hours { text-align: center; }
  .dept-messengers { justify-content: center; }
}

@media (max-width: 600px) {
  .contacts-page-header h1 { font-size: 2.2rem; }
  .contact-item { padding: 20px; }
  .feedback-form { padding: 20px; }
}
</style>