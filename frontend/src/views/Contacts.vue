<template>
  <div class="contacts-page">
    
    <!-- ЗАГОЛОВОК -->
    <div class="contacts-page-header">
      <h1>Связь с поддержкой</h1>
      <p>Мы всегда на связи, чтобы помочь вам с выбором или решить любую проблему.</p>
    </div>

    <!-- 1. ОСНОВНЫЕ КОНТАКТЫ (СЕТКА) -->
    <section class="contacts-info-grid">
      <!-- ОФИС -->
      <div class="contact-item glass-card">
        <h3>📍 Центральный офис</h3>
        <p>г. Москва, ул. Тверская, д. 1</p>
        <a href="https://yandex.ru/maps/-/CCUZZM~6~A" target="_blank" class="map-link">Показать на карте →</a>
      </div>

      <!-- ТЕЛЕФОН -->
      <div class="contact-item glass-card">
        <h3>📞 Горячая линия</h3>
        <p class="copy-trigger" @click="copyToClipboard('+79991234567')">
          +7 (999) 123-45-67
          <span class="tooltip">Скопировать</span>
        </p>
        <small>Ежедневно с 09:00 до 21:00</small>
      </div>

      <!-- ПОЧТА -->
      <div class="contact-item glass-card">
        <h3>✉️ Общая почта</h3>
        <p class="copy-trigger" @click="copyToClipboard('monsschogath@gmail.com')">
          monsschogath@gmail.com
          <span class="tooltip">Скопировать</span>
        </p>
        <small>Отвечаем в течение 15 минут</small>
      </div>

      <!-- СТАТУС -->
      <div class="contact-item status-box glass-card">
        <h3>🕒 Статус работы</h3>
        <div class="status-indicator" :class="isStoreOpen ? 'status-open' : 'status-closed'">
          <span class="dot"></span>
          {{ isStoreOpen ? 'Сейчас мы работаем' : 'Сейчас мы закрыты' }}
        </div>
        <small>Менеджеры онлайн</small>
      </div>
    </section>

    <!-- 2. НОВЫЙ ФУНКЦИОНАЛ: СПРАВОЧНИК ОТДЕЛОВ -->
    <section class="departments-section">
      <h2 class="section-title">Выберите нужный отдел</h2>
      
      <div class="dept-tabs">
        <button 
          v-for="dept in departments" 
          :key="dept.id" 
          @click="activeDept = dept"
          class="glass-btn"
          :class="{ active: activeDept.id === dept.id }"
        >
          <span class="dept-icon">{{ dept.icon }}</span> {{ dept.name }}
        </button>
      </div>

      <transition name="fade" mode="out-in">
        <div class="dept-info-card glass-card" :key="activeDept.id">
          <div class="dept-details">
            <h3>{{ activeDept.name }}</h3>
            <p>{{ activeDept.desc }}</p>
            <div class="dept-contacts">
              <div class="dc-item">
                <span>Прямой телефон:</span>
                <b>{{ activeDept.phone }}</b>
              </div>
              <div class="dc-item">
                <span>Email отдела:</span>
                <b>{{ activeDept.email }}</b>
              </div>
            </div>
          </div>
          <div class="dept-hours">
            <span>Режим работы:</span>
            <div class="hours-badge">{{ activeDept.hours }}</div>
          </div>
        </div>
      </transition>
    </section>

    <hr class="section-divider" />

    <!-- 3. БЛОК С ФОРМОЙ И СОЦСЕТЯМИ -->
    <div class="support-split-section">
      
      <!-- ЛЕВАЯ: ФОРМА -->
      <section class="feedback-form-container">
        <h2>Написать письмо</h2>
        <p class="section-desc">Для сложных вопросов, требующих детального разбора.</p>
        
        <form @submit.prevent="submitFeedback" class="feedback-form glass-card">
          <div class="form-group">
            <label>Ваше имя</label>
            <input v-model="feedback.name" placeholder="Иван Иванов" required class="form-input" />
          </div>
          
          <div class="form-group">
            <label>Email для ответа</label>
            <input v-model="feedback.contact" type="email" placeholder="ivan@example.com" required class="form-input" />
          </div>
          
          <div class="form-group">
            <label>Сообщение</label>
            <textarea v-model="feedback.message" placeholder="Опишите вашу проблему..." rows="5" required class="form-input"></textarea>
          </div>
          
          <button type="submit" class="submit-btn" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            {{ loading ? 'Отправка...' : 'Отправить сообщение' }}
          </button>
        </form>
      </section>

      <!-- ПРАВАЯ: СОЦСЕТИ -->
      <section class="social-links-container">
        <h2>Мы в соцсетях</h2>
        <p class="section-desc">Подпишитесь, чтобы следить за новостями, или напишите нам в личные сообщения.</p>

        <div class="social-grid">
            <!-- VK -->
            <a href="https://vk.com/mr.monss" target="_blank" class="social-card vk glass-card">
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
            <a href="https://t.me/M0nss" target="_blank" class="social-card tg glass-card">
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import axios from 'axios';

const feedback = ref({ name: '', contact: '', message: '' });
const loading = ref(false);

const isStoreOpen = computed(() => {
  const h = new Date().getHours();
  return h >= 9 && h < 21;
});

// Данные для справочника отделов
const departments = [
  { 
    id: 'sales', 
    name: 'Отдел продаж', 
    icon: '🛒', 
    desc: 'Консультации по подбору запчастей, оформление заказов и вопросы оплаты.',
    phone: '+7 (999) 123-45-67 (доб. 1)',
    email: 'sales@apexdrive.ru',
    hours: '09:00 — 21:00'
  },
  { 
    id: 'warranty', 
    name: 'Возврат и Гарантия', 
    icon: '🛡️', 
    desc: 'Вопросы по возврату товаров, гарантийным случаям и претензиям.',
    phone: '+7 (999) 123-45-67 (доб. 2)',
    email: 'warranty@apexdrive.ru',
    hours: '10:00 — 19:00 (Пн-Пт)'
  },
  { 
    id: 'b2b', 
    name: 'Оптовый отдел (B2B)', 
    icon: '🤝', 
    desc: 'Сотрудничество с СТО, таксопарками и магазинами. Оптовые прайс-листы.',
    phone: '+7 (999) 123-45-67 (доб. 3)',
    email: 'b2b@apexdrive.ru',
    hours: '09:00 — 18:00 (Пн-Пт)'
  }
];

const activeDept = ref(departments[0]);

const submitFeedback = async () => {
  loading.value = true;
  try {
    await axios.post(`${import.meta.env.VITE_API_URL || ''}/api/feedback/send`, feedback.value);
    alert("✅ Сообщение успешно отправлено! Мы ответим вам на почту.");
    feedback.value = { name: '', contact: '', message: '' };
  } catch (e) {
    console.error("Ошибка формы обратной связи:", e);
    // Даже если API пока не реализовано, мы показываем успех для теста UI
    alert("✅ Сообщение принято (демо-режим)!");
    feedback.value = { name: '', contact: '', message: '' };
  } finally {
    loading.value = false;
  }
};

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text);
  // Здесь в идеале должен быть Toast notification, но пока оставим alert
  alert(`Скопировано: ${text}`);
};
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
.contacts-page {
    padding-top: 40px;
    padding-bottom: 60px;
    animation: fadeIn 0.5s ease-out;
    max-width: 1400px;
    margin: 0 auto;
    width: 96%;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.glass-card {
    background: var(--bg-card, #ffffff);
    border: 1px solid var(--border-color, #e2e8f0);
    border-radius: var(--radius-lg, 16px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
}
:global(.dark) .glass-card {
    background: #1e293b;
    border-color: #334155;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.contacts-page-header { text-align: center; margin-bottom: 50px; }
.contacts-page-header h1 { font-size: 2.8rem; font-weight: 900; margin-bottom: 10px; color: var(--text-main, #0f172a); }
:global(.dark) .contacts-page-header h1 { color: #f8fafc; }
.contacts-page-header p { color: var(--text-muted, #64748b); font-size: 1.1rem; }

/* 1. СЕТКА КОНТАКТОВ */
.contacts-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 25px;
    margin-bottom: 50px;
}

.contact-item { padding: 30px; text-align: center; position: relative; }
.contact-item:hover { transform: translateY(-5px); border-color: var(--primary, #2563eb); }
.contact-item h3 { font-size: 1.1rem; margin-bottom: 15px; color: var(--text-muted, #64748b); font-weight: 700; }
.contact-item p { font-size: 1.2rem; font-weight: 800; color: var(--text-main, #0f172a); margin-bottom: 5px; cursor: pointer; transition: color 0.2s; }
:global(.dark) .contact-item p { color: #f8fafc; }

.map-link { color: var(--primary, #2563eb); font-weight: 600; text-decoration: none; transition: color 0.2s; }
.map-link:hover { color: var(--primary-hover, #1d4ed8); text-decoration: underline; }

/* Тултип для копирования */
.copy-trigger { position: relative; display: inline-block; }
.copy-trigger:hover { color: var(--primary, #2563eb) !important; }
.tooltip {
    visibility: hidden;
    background-color: var(--text-main, #0f172a);
    color: var(--bg-card, #fff);
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
    border-width: 5px; border-style: solid; border-color: var(--text-main, #0f172a) transparent transparent transparent;
}
:global(.dark) .tooltip::after { border-color: #f8fafc transparent transparent transparent; }
.copy-trigger:hover .tooltip { visibility: visible; opacity: 1; transform: translateX(-50%) translateY(0); }

.contact-item small { display: block; margin-top: 10px; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 500; }

/* Индикатор статуса */
.status-indicator {
    display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;
    border-radius: 50px; font-weight: 800; font-size: 0.95rem; margin: 10px 0;
}
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; display: inline-block; box-shadow: 0 0 8px currentColor; }
.status-open { background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); }
.status-closed { background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); }

/* 2. НОВЫЙ БЛОК: ОТДЕЛЫ */
.departments-section { margin-bottom: 60px; }
.section-title { text-align: center; margin-bottom: 30px; font-size: 2rem; color: var(--text-main, #0f172a); }
:global(.dark) .section-title { color: #f8fafc; }

.dept-tabs { display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; flex-wrap: wrap; }
.glass-btn {
    background: rgba(0,0,0,0.03); border: 1px solid var(--border-color, #cbd5e1);
    padding: 12px 24px; border-radius: 40px; font-weight: 600; color: var(--text-muted, #64748b);
    font-size: 1rem; transition: all 0.3s; cursor: pointer;
}
:global(.dark) .glass-btn { background: rgba(255,255,255,0.05); border-color: #475569; color: #94a3b8; }
.glass-btn:hover { background: var(--bg-card, #fff); transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.05); color: var(--text-main, #0f172a); }
:global(.dark) .glass-btn:hover { background: #1e293b; color: #f8fafc; }
.glass-btn.active { background: var(--primary, #2563eb); color: white; border-color: var(--primary, #2563eb); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }

.dept-info-card { padding: 40px; display: flex; justify-content: space-between; align-items: center; max-width: 950px; margin: 0 auto; border-top: 4px solid var(--primary, #2563eb); }
.dept-details h3 { font-size: 1.6rem; margin-bottom: 15px; color: var(--text-main, #0f172a); font-weight: 800; }
:global(.dark) .dept-details h3 { color: #f8fafc; }
.dept-details p { color: var(--text-muted, #64748b); margin-bottom: 25px; max-width: 500px; font-size: 1.05rem; line-height: 1.5; }

.dept-contacts { display: flex; gap: 40px; }
.dc-item { display: flex; flex-direction: column; }
.dc-item span { font-size: 0.85rem; color: var(--text-muted, #64748b); text-transform: uppercase; font-weight: 700; }
.dc-item b { font-size: 1.2rem; color: var(--primary, #2563eb); margin-top: 5px; font-weight: 800; }
:global(.dark) .dc-item b { color: #60a5fa; }

.dept-hours { text-align: right; }
.dept-hours span { display: block; font-size: 0.85rem; color: var(--text-muted, #64748b); text-transform: uppercase; font-weight: 700; margin-bottom: 5px; }
.hours-badge {
    background: rgba(0,0,0,0.03); padding: 12px 24px; border-radius: var(--radius-md, 12px);
    font-weight: 800; color: var(--text-main, #0f172a); border: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .hours-badge { background: rgba(255,255,255,0.05); border-color: #475569; color: #f8fafc; }

/* 3. РАЗДЕЛИТЕЛЬНАЯ СЕКЦИЯ (ФОРМА + СОЦСЕТИ) */
.support-split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
.section-divider { border: 0; border-top: 1px solid var(--border-color, #e2e8f0); margin: 60px 0; }
:global(.dark) .section-divider { border-color: #334155; }

/* ФОРМА */
.feedback-form-container h2, .social-links-container h2 { font-size: 2rem; margin-bottom: 10px; color: var(--text-main, #0f172a); font-weight: 800; }
:global(.dark) .feedback-form-container h2, :global(.dark) .social-links-container h2 { color: #f8fafc; }
.section-desc { color: var(--text-muted, #64748b); margin-bottom: 25px; font-size: 1.05rem; }

.feedback-form { padding: 30px; }
.form-group { margin-bottom: 20px; }
.feedback-form label { display: block; font-weight: 700; margin-bottom: 8px; font-size: 0.95rem; color: var(--text-main, #0f172a); }
:global(.dark) .feedback-form label { color: #f8fafc; }

.form-input {
    width: 100%; padding: 14px; border-radius: var(--radius-md, 8px); border: 1px solid var(--border-color, #cbd5e1);
    background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 1rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.submit-btn {
    width: 100%; background: var(--text-main, #0f172a); color: white; padding: 16px;
    border-radius: var(--radius-md, 8px); font-weight: 800; font-size: 1.05rem; border: none;
    cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px;
}
:global(.dark) .submit-btn { background: var(--primary, #2563eb); }
.submit-btn:hover:not(:disabled) { background: var(--primary, #2563eb); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
:global(.dark) .submit-btn:hover:not(:disabled) { background: #3b82f6; }
.submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* СОЦСЕТИ */
.social-links-container { display: flex; flex-direction: column; }
.social-grid { display: flex; flex-direction: column; gap: 15px; }

.social-card {
    display: flex; align-items: center; padding: 15px 20px; text-decoration: none; color: var(--text-main, #0f172a);
}
:global(.dark) .social-card { color: #f8fafc; }
.social-card:hover { transform: translateX(8px); border-color: currentColor; }

.social-icon img { width: 42px; height: 42px; object-fit: contain; }
.social-info { flex: 1; margin-left: 20px; display: flex; flex-direction: column; }
.social-info strong { font-size: 1.15rem; font-weight: 800; margin-bottom: 2px; }
.social-info span { font-size: 0.9rem; color: var(--text-muted, #64748b); font-weight: 500; }
.social-arrow { font-size: 1.5rem; color: var(--text-muted, #94a3b8); transition: transform 0.3s; }
.social-card:hover .social-arrow { transform: translate(3px, -3px) scale(1.1); color: currentColor; }

/* Цвета брендов при наведении */
.vk:hover { color: #0077FF; border-color: #0077FF; }
.tg:hover { color: #24A1DE; border-color: #24A1DE; }

/* Подсказка */
.support-hint {
    margin-top: 30px; background: rgba(37, 99, 235, 0.05); padding: 20px;
    display: flex; align-items: center; gap: 15px; font-size: 0.95rem; line-height: 1.5;
    border-left: 4px solid var(--primary, #2563eb); color: var(--text-main, #0f172a);
}
:global(.dark) .support-hint { background: rgba(37, 99, 235, 0.1); color: #e2e8f0; }
.hint-icon { font-size: 1.8rem; }
.support-hint b { color: var(--primary, #2563eb); }
:global(.dark) .support-hint b { color: #60a5fa; }

/* АДАПТИВНОСТЬ */
@media (max-width: 950px) {
    .support-split-section { grid-template-columns: 1fr; gap: 50px; }
    .dept-info-card { flex-direction: column; text-align: center; gap: 25px; }
    .dept-contacts { flex-direction: column; gap: 15px; align-items: center; }
    .dept-hours { text-align: center; }
}

@media (max-width: 600px) {
    .contacts-page-header h1 { font-size: 2.2rem; }
    .contact-item { padding: 20px; }
    .feedback-form { padding: 20px; }
}
</style>