<template>
  <div class="auth-page animate-fade-in">
    <section class="auth-header">
      <h1>Регистрация в <span class="highlight">"Автотовары"</span></h1>
    </section>

    <div class="auth-card glass-card">
      <form @submit.prevent="handleRegister">
        <!-- ФИО -->
        <div class="input-grid-2">
          <div class="input-group">
            <label>Фамилия</label>
            <input v-model="form.last_name" placeholder="Иванов" />
          </div>
          <div class="input-group">
            <label>Имя *</label>
            <input v-model="form.first_name" placeholder="Иван" required />
          </div>
        </div>

        <!-- КОНТАКТЫ -->
        <div class="input-grid-2">
          <div class="input-group">
            <label>📞 Номер телефона</label>
            <input :value="form.phone" type="tel" placeholder="+7 (999) 000-00-00" @input="onPhoneInput" />
          </div>
          <div class="input-group">
            <label>✉️ Электронная почта</label>
            <input v-model="form.email" type="email" placeholder="mail@example.com" />
          </div>
        </div>

        <!-- ПАРОЛИ -->
        <div class="input-grid-2">
          <div class="input-group password-box">
            <label>Придумайте пароль *</label>
            <div class="pass-input-wrap">
              <input :type="showP ? 'text' : 'password'" v-model="form.password" required placeholder="••••••" />
              <button type="button" class="eye-btn" @click="showP = !showP">{{ showP ? '🙈' : '👁️' }}</button>
            </div>
          </div>
          <div class="input-group password-box">
            <label>Повторите пароль *</label>
            <div class="pass-input-wrap">
              <input :type="showCP ? 'text' : 'password'" v-model="form.confirmPassword" required placeholder="••••••" />
              <button type="button" class="eye-btn" @click="showCP = !showCP">{{ showCP ? '🙈' : '👁️' }}</button>
            </div>
          </div>
        </div>

        <!-- ЯНДЕКС КАПЧА -->
        <div class="captcha-container">
          <div id="yandex-captcha"></div>
        </div>

        <button type="submit" class="btn btn-success btn-lg btn-block register-btn" :disabled="loading || googleLoading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Создание профиля...' : 'ЗАРЕГИСТРИРОВАТЬСЯ' }}
        </button>
      </form>

      <!-- УВЕДОМЛЕНИЯ -->
      <transition name="fade">
        <div v-if="error" class="alert alert-error mt-3">
          ⚠️ {{ error }}
        </div>
      </transition>
      <transition name="fade">
        <div v-if="successMessage" class="alert alert-success mt-3">
          ✅ {{ successMessage }}
        </div>
      </transition>

      <!-- РАЗДЕЛИТЕЛЬ -->
      <div class="separator"><span>или</span></div>

      <!-- GOOGLE РЕГИСТРАЦИЯ -->
      <button @click="socialRegister('google')" :disabled="loading || googleLoading" class="btn btn-outline btn-lg btn-block google-btn">
        <template v-if="googleLoading">
          <span class="spinner"></span>
        </template>
        <template v-else>
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" class="google-icon" />
          <span>Быстрая регистрация через Google</span>
        </template>
      </button>

      <p class="auth-footer">
        Уже есть аккаунт? <router-link to="/login">Войти в систему</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { supabase } from '@/supabase';

const router = useRouter();
const route = useRoute();

const loading = ref(false);
const error = ref('');
const successMessage = ref('');
const showP = ref(false);
const showCP = ref(false);

const captchaSiteKey = import.meta.env.VITE_YANDEX_CAPTCHA_CLIENT_KEY;

const form = reactive({
  first_name: '', last_name: '',
  email: '', phone: '',
  password: '', confirmPassword: '',
  captchaToken: ''
});

const googleLoading = ref(false);
let authListener = null;

// Маска телефона
const onPhoneInput = (e) => {
  let value = e.target.value.replace(/[^\d]/g, '');
  if (value.startsWith('7') || value.startsWith('8')) value = value.substring(1);
  let formatted = '+7';
  if (value.length > 0) formatted += ' (' + value.substring(0, 3);
  if (value.length >= 4) formatted += ') ' + value.substring(3, 6);
  if (value.length >= 7) formatted += '-' + value.substring(6, 8);
  if (value.length >= 9) formatted += '-' + value.substring(8, 10);
  form.phone = formatted;
  e.target.value = formatted;
};

// Капча
const initCaptcha = () => {
  if (window.smartCaptcha) {
    window.smartCaptcha.render('yandex-captcha', {
      sitekey: captchaSiteKey,
      callback: (token) => { form.captchaToken = token; error.value = ''; }
    });
  } else {
    setTimeout(initCaptcha, 500);
  }
};

// 1. СОХРАНЕНИЕ СЕССИИ (localStorage)
const saveSession = (user) => {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('role', user.role || 'user');
    localStorage.setItem('user_name', [user.last_name, user.first_name].filter(Boolean).join(' ') || 'Пользователь');
    localStorage.setItem('user_first_name', user.first_name || '');
    localStorage.setItem('user_avatar', user.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png');
    
    router.push('/');
    setTimeout(() => window.location.reload(), 100);
};

// 2. ОБРАБОТКА ВОЗВРАТА ОТ GOOGLE
const processGoogleLogin = async (session) => {
  if (!session || !session.user) return;
  googleLoading.value = true;
  
  const sbUser = session.user;
  try {
    await new Promise(r => setTimeout(r, 1000));
    const res = await axios.get(`/api/users/profile/${sbUser.id}`);
    saveSession(res.data);
  } catch (e) {
    saveSession({
      id: sbUser.id, email: sbUser.email,
      first_name: sbUser.user_metadata?.full_name?.split(' ')[0] || 'Пользователь',
      last_name: sbUser.user_metadata?.full_name?.split(' ')[1] || '',
      avatar_url: sbUser.user_metadata?.avatar_url, role: 'user'
    });
  }
};

// 3. ОБЫЧНАЯ РЕГИСТРАЦИЯ
const handleRegister = async () => {
  if (!form.email && !form.phone) return error.value = 'Укажите Email или Телефон для связи';
  if (form.password.length < 6) return error.value = 'Пароль должен быть не менее 6 символов';
  if (form.password !== form.confirmPassword) return error.value = 'Введённые пароли не совпадают';
  
  if (!form.captchaToken && !import.meta.env.DEV) return error.value = 'Пожалуйста, подтвердите, что вы не робот.';

  loading.value = true; error.value = ''; successMessage.value = '';

  try {
    const res = await axios.post('/api/users/register', form);
    if (form.email) {
      successMessage.value = 'Регистрация успешна! Проверьте почту для подтверждения.';
      setTimeout(() => router.push('/login'), 5000);
    } else {
      saveSession(res.data.user || res.data);
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'Ошибка регистрации.';
    if (window.smartCaptcha) window.smartCaptcha.reset();
  } finally {
    loading.value = false;
  }
};

// 4. РЕГИСТРАЦИЯ ЧЕРЕЗ GOOGLE
const socialRegister = async (provider) => {
  googleLoading.value = true;
  try {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + route.path }
    });
    if (authError) throw authError;
  } catch (err) {
    error.value = 'Ошибка Google: ' + err.message;
    googleLoading.value = false;
  }
};

// 5. ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ
onMounted(async () => {
  initCaptcha();

  const { data: { session } } = await supabase.auth.getSession();
  if (session && !localStorage.getItem('user_id')) {
    await processGoogleLogin(session);
  }

  const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if (event === 'SIGNED_IN' && currentSession) {
      if (localStorage.getItem('user_id') === currentSession.user.id) return;
      await processGoogleLogin(currentSession);
    }
  });
  authListener = data.subscription;
});

onUnmounted(() => {
  if (authListener) authListener.unsubscribe();
});
</script>

<style scoped>
/* ==========================================================================
   ТОЛЬКО УНИКАЛЬНЫЕ СТИЛИ (глобальный CSS уже содержит всё необходимое)
   ========================================================================== */

.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
}

.auth-header {
  text-align: center;
  margin-bottom: 35px;
}

.auth-header h1 {
  font-size: 2.5rem;
  font-weight: 900;
  color: var(--text-main);
}

.highlight {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-card {
  width: 100%;
  max-width: 700px;
  padding: 48px;
  position: relative;
  backdrop-filter: blur(8px);
}

/* Сетки */
.input-grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

/* Группа ввода – использует глобальные стили input, label */
.input-group {
  margin-bottom: 0;
}

/* Обёртка для пароля с глазиком */
.pass-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.eye-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
  padding: 4px;
  transition: opacity 0.2s, transform 0.2s;
}
.eye-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Капча */
.captcha-container {
  display: flex;
  justify-content: center;
  margin: 20px 0;
  min-height: 100px;
}

/* Кнопка регистрации */
.register-btn {
  background: linear-gradient(135deg, var(--success), #059669);
  border: none;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
}
.register-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #059669, var(--success));
}

/* Разделитель "или" */
.separator {
  margin: 32px 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.separator::before {
  content: "";
  position: absolute;
  width: 100%;
  height: 1px;
  background: var(--border-color);
}
.separator span {
  position: relative;
  background: var(--bg-card);
  padding: 0 20px;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* Google-кнопка */
.google-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.google-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* Футер */
.auth-footer {
  margin-top: 32px;
  font-size: 0.95rem;
  text-align: center;
  color: var(--text-muted);
}
.auth-footer a {
  font-weight: 800;
  color: var(--primary);
  text-decoration: none;
}

/* Дополнительные отступы */
.mt-3 { margin-top: 24px; }

/* Адаптив */
@media (max-width: 768px) {
  .auth-card {
    padding: 28px 20px;
  }
  .input-grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>