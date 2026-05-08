<template>
  <div class="auth-page">
    <section class="auth-header">
      <h1>Регистрация в <span class="highlight">ApexDrive</span></h1>
    </section>

    <div class="auth-card glass-card">
      <form @submit.prevent="handleRegister">
        
        <!-- БЛОК: ФИО (Сетка 3 колонки) -->
        <div class="input-grid-3">
          <div class="input-wrapper">
            <label>Фамилия</label>
            <input v-model="form.last_name" placeholder="Иванов" class="form-input" />
          </div>
          <div class="input-wrapper">
            <label>Имя *</label>
            <input v-model="form.first_name" placeholder="Иван" required class="form-input" />
          </div>
          <div class="input-wrapper">
            <label>Отчество</label>
            <input v-model="form.otchestvo" placeholder="Иванович" class="form-input" />
          </div>
        </div>

        <!-- БЛОК: ГОРОД -->
        <div class="input-wrapper full-width">
          <label>📍 Ваш населенный пункт *</label>
          <input v-model="form.city" placeholder="Напр. Москва" required class="form-input" />
          <small>Это поможет нам точнее рассчитывать сроки доставки</small>
        </div>

        <!-- БЛОК: КОНТАКТЫ (Сетка 2 колонки) -->
        <div class="input-grid-2">
          <div class="input-wrapper">
            <label>📞 Номер телефона</label>
            <input v-model="form.phone" type="tel" placeholder="+7 999 000-00-00" class="form-input" />
          </div>
          <div class="input-wrapper">
            <label>✉️ Электронная почта</label>
            <input v-model="form.email" type="email" placeholder="mail@example.com" class="form-input" />
          </div>
        </div>

        <!-- БЛОК: ПАРОЛИ (Сетка 2 колонки) -->
        <div class="input-grid-2">
          <div class="input-wrapper password-box">
            <label>Придумайте пароль *</label>
            <div class="pass-input-wrap">
              <input :type="showP ? 'text' : 'password'" v-model="form.password" required placeholder="••••••" class="form-input" />
              <button type="button" class="eye-btn" @click="showP = !showP">{{ showP ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="input-wrapper password-box">
            <label>Повторите пароль *</label>
            <div class="pass-input-wrap">
              <input :type="showCP ? 'text' : 'password'" v-model="form.confirmPassword" required placeholder="••••••" class="form-input" />
              <button type="button" class="eye-btn" @click="showCP = !showCP">{{ showCP ? '🙈' : '👁️' }}</button>
            </div>
          </div>
        </div>

        <!-- YANDEX SMART CAPTCHA -->
        <div class="captcha-container">
          <div 
            id="yandex-captcha" 
            class="smart-captcha" 
            :data-sitekey="captchaSiteKey"
          ></div>
        </div>

        <button type="submit" :disabled="loading" class="btn-register">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Создание профиля...' : 'ЗАРЕГИСТРИРОВАТЬСЯ' }}
        </button>
      </form>

      <!-- ОШИБКИ ИЛИ УСПЕХ -->
      <transition name="fade">
        <div v-if="error" class="error-box">⚠️ {{ error }}</div>
      </transition>
      <transition name="fade">
        <div v-if="successMessage" class="success-box">✅ {{ successMessage }}</div>
      </transition>

      <!-- РАЗДЕЛИТЕЛЬ -->
      <div class="separator"><span>или</span></div>

      <!-- GOOGLE РЕГИСТРАЦИЯ -->
      <button @click="socialRegister('google')" class="social-btn glass-btn">
        <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google">
        <span>Быстрая регистрация через Google</span>
      </button>

      <p class="auth-footer">
        Уже есть аккаунт? <router-link to="/login">Войти в систему</router-link>
      </p>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import { supabase } from '@/supabase';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const appStore = useAppStore();

const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const showP = ref(false);
const showCP = ref(false);

const captchaSiteKey = import.meta.env.VITE_YANDEX_CAPTCHA_CLIENT_KEY || 'cw_test_client_key_here';

const form = reactive({
  first_name: '', last_name: '', otchestvo: '',
  city: '', email: '', phone: '',
  password: '', confirmPassword: ''
});

onMounted(() => { 
  if (appStore.city) form.city = appStore.city; 
  
  // Функция для отрисовки капчи
  const initCaptcha = () => {
    if (window.smartCaptcha) {
      window.smartCaptcha.render('yandex-captcha', {
        sitekey: captchaSiteKey,
        callback: (token) => { form.captchaToken = token; }
      });
    } else {
      // Если скрипт еще не загрузился, попробуем через 500мс
      setTimeout(initCaptcha, 500);
    }
  };

  initCaptcha();
});

const handleRegister = async () => {
  if (!form.email && !form.phone) return error.value = 'Укажите Email или Телефон для связи';
  if (form.password.length < 6) return error.value = 'Пароль должен быть не менее 6 символов';
  if (form.password !== form.confirmPassword) return error.value = 'Введенные пароли не совпадают';
  
  // Проверка капчи (токен генерируется Yandex скриптом и записывается в form.captchaToken)
  if (!form.captchaToken && !import.meta.env.DEV) {
    return error.value = 'Пожалуйста, пройдите проверку на робота.';
  }

  loading.value = true;
  error.value = '';
  successMessage.value = '';

  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    const res = await axios.post(`${API_URL}/api/users/register`, form);
    
    // Если пользователь зарегистрировался через email, показываем сообщение о подтверждении
    if (form.email) {
      successMessage.value = res.data.message || 'Регистрация успешна! Проверьте почту.';
      // Даем пользователю время прочитать сообщение
      setTimeout(() => router.push('/login'), 4000);
    } else {
      // Регистрация по телефону (без почты) - сразу логиним
      saveSession(res.data.user || res.data);
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Ошибка при создании аккаунта. Возможно, почта уже занята.';
    // Сброс капчи при ошибке
    if (window.smartCaptcha) window.smartCaptcha.reset();
  } finally {
    loading.value = false;
  }
};

const socialRegister = async (provider) => {
    loading.value = true;
    const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { 
            redirectTo: window.location.origin + '/login' 
        }
    });
    if (authError) {
        error.value = authError.message;
        loading.value = false;
    }
};

const saveSession = (user) => {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('role', user.role || 'user');
    
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    localStorage.setItem('user_name', fullName || user.email || 'Пользователь');
    localStorage.setItem('user_first_name', user.first_name || '');
    localStorage.setItem('user_avatar', user.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png');
    
    if (user.saved_city_id) {
      // appStore.syncCity() сам подтянет город
    }
    
    router.push('/');
    setTimeout(() => window.location.reload(), 100);
};
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes spin { to { transform: rotate(360deg); } }

.auth-page {
  min-height: calc(100vh - 80px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 20px; animation: fadeIn 0.5s ease-out;
}

/* ЗАГОЛОВОК */
.auth-header { text-align: center; margin-bottom: 35px; animation: fadeSlideUp 0.6s ease-out; }
.auth-header h1 {
  font-size: 2.5rem; margin-bottom: 12px; font-weight: 900; color: var(--text-main, #0f172a);
}
:global(.dark) .auth-header h1 { color: #f8fafc; }

.highlight {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; padding: 0 4px;
}

/* Стеклянная карточка */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: transform 0.3s, box-shadow 0.3s;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.auth-card {
  width: 100%; max-width: 700px; padding: 48px;
  animation: fadeSlideUp 0.7s ease-out;
}
.auth-card:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1); }
:global(.dark) .auth-card:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5); }

/* СЕТКИ ДЛЯ ВЫРАВНИВАНИЯ */
.input-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; align-items: start; }
.input-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; align-items: start; }
.full-width { margin-bottom: 24px; }

/* ОБЁРТКИ ПОЛЕЙ */
.input-wrapper { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.input-wrapper label { font-weight: 800; font-size: 0.75rem; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.8px; }
:global(.dark) .input-wrapper label { color: #94a3b8; }

.form-input {
  width: 100%; height: 46px; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
  background: rgba(0,0,0,0.02); border: 1.5px solid var(--border-color, #cbd5e1);
  font-size: 0.95rem; color: var(--text-main, #0f172a); box-sizing: border-box; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); outline: none; }

/* ПАРОЛЬ С ГЛАЗКОМ */
.pass-input-wrap { position: relative; display: flex; align-items: center; width: 100%; }
.pass-input-wrap .form-input { flex: 1; padding-right: 45px; }
.eye-btn {
  position: absolute; right: 12px; background: none; border: none; font-size: 1.2rem; cursor: pointer;
  opacity: 0.6; transition: all 0.2s; padding: 4px; z-index: 2;
}
.eye-btn:hover { opacity: 1; transform: scale(1.1); }

/* ПОДСКАЗКИ */
small { display: block; margin-top: 6px; font-size: 0.75rem; color: var(--text-muted, #64748b); font-weight: 500;}

/* CAPTCHA */
.captcha-container { display: flex; justify-content: center; margin-bottom: 24px; min-height: 78px;}

/* КНОПКА РЕГИСТРАЦИИ */
.btn-register {
  width: 100%; padding: 16px; background: linear-gradient(135deg, var(--success, #10b981), #059669);
  color: white; border: none; border-radius: var(--radius-md, 8px); font-size: 1rem; font-weight: 800; letter-spacing: 1px;
  cursor: pointer; transition: all 0.3s; box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-register:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(16, 185, 129, 0.45); }
.btn-register:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

/* СООБЩЕНИЯ */
.error-box { margin-top: 24px; padding: 14px 18px; background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); border-radius: var(--radius-md, 8px); text-align: center; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3); animation: shake 0.4s ease-in-out; }
.success-box { margin-top: 24px; padding: 14px 18px; background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); border-radius: var(--radius-md, 8px); text-align: center; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3); }

/* РАЗДЕЛИТЕЛЬ */
.separator { margin: 32px 0; position: relative; display: flex; align-items: center; justify-content: center; }
.separator::before { content: ""; position: absolute; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, var(--border-color, #e2e8f0), transparent); }
:global(.dark) .separator::before { background: linear-gradient(90deg, transparent, #334155, transparent); }
.separator span { position: relative; background: var(--bg-card, #fff); padding: 0 20px; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }
:global(.dark) .separator span { background: #1e293b; color: #94a3b8; }

/* СОЦИАЛЬНАЯ КНОПКА */
.glass-btn {
  width: 100%; padding: 14px; display: flex; align-items: center; justify-content: center; gap: 14px;
  border-radius: var(--radius-md, 8px); background: rgba(0,0,0,0.02); border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-main, #0f172a); font-weight: 700; cursor: pointer; transition: all 0.3s;
}
:global(.dark) .glass-btn { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.glass-btn:hover { border-color: var(--primary, #2563eb); transform: translateY(-2px); background: rgba(37, 99, 235, 0.05); }
.glass-btn img { width: 22px; height: 22px; }

/* ФУТЕР ССЫЛКА */
.auth-footer { margin-top: 32px; font-size: 0.95rem; color: var(--text-muted, #64748b); text-align: center; }
:global(.dark) .auth-footer { color: #94a3b8; }
.auth-footer a { font-weight: 800; color: var(--primary, #2563eb); text-decoration: none; transition: all 0.2s; }
.auth-footer a:hover { text-decoration: underline; }

/* АНИМАЦИИ ДЛЯ ПЕРЕХОДОВ */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* АДАПТИВНОСТЬ */
@media (max-width: 768px) {
  .auth-page { padding: 30px 16px; }
  .auth-header h1 { font-size: 2rem; }
  .auth-card { padding: 28px 20px; }
  .input-grid-3, .input-grid-2 { grid-template-columns: 1fr; gap: 16px; }
}
</style>