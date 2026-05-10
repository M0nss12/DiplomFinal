<template>
  <div class="auth-page">
    <section class="auth-header">
      <h1>Регистрация в <span class="highlight">ApexDrive</span></h1>
    </section>

    <div class="auth-card glass-card">
      <form @submit.prevent="handleRegister">
        
        <!-- БЛОК: ФИО -->
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

        <!-- БЛОК: ГОРОД (автодополнение) -->
        <div class="input-wrapper full-width city-autocomplete">
          <label>📍 Ваш населённый пункт *</label>
          <input 
            :value="cityInput"
            @input="onCityInput"
            @focus="showCitySuggestions = true"
            @blur="onCityBlur"
            placeholder="Начните вводить название..."
            required
            class="form-input"
            autocomplete="off"
          />
          <transition name="dropdown-fade">
            <ul v-if="showCitySuggestions && filteredCities.length" class="city-suggestions glass-card">
              <li v-for="c in filteredCities" :key="c.id" @mousedown.prevent="selectCity(c)">
                {{ c.name }}
              </li>
            </ul>
          </transition>
          <small>Это поможет нам точнее рассчитывать сроки доставки</small>
        </div>

        <!-- БЛОК: КОНТАКТЫ -->
        <div class="input-grid-2">
          <div class="input-wrapper">
            <label>📞 Номер телефона</label>
            <input :value="form.phone" type="tel" placeholder="+7 (999) 000-00-00" class="form-input" @input="onPhoneInput" />
          </div>
          <div class="input-wrapper">
            <label>✉️ Электронная почта</label>
            <input v-model="form.email" type="email" placeholder="mail@example.com" class="form-input" />
          </div>
        </div>

        <!-- БЛОК: ПАРОЛИ -->
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
          <div id="yandex-captcha"></div>
        </div>

        <button type="submit" :disabled="loading || googleLoading" class="btn-register">
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
      <button @click="socialRegister('google')" :disabled="loading || googleLoading" class="social-btn glass-btn">
        <template v-if="googleLoading">
          <span class="spinner"></span>
        </template>
        <template v-else>
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google">
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
import { ref, onMounted, reactive, computed } from 'vue';
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

const captchaSiteKey = import.meta.env.VITE_YANDEX_CAPTCHA_CLIENT_KEY;

const form = reactive({
  first_name: '', last_name: '', otchestvo: '',
  city: '', email: '', phone: '',
  password: '', confirmPassword: '',
  captchaToken: ''
});

// Google OAuth
const googleLoading = ref(false);

// Города автодополнение
const cities = ref([]);
const cityInput = ref('');
const showCitySuggestions = ref(false);
const filteredCities = computed(() => {
  const q = cityInput.value.trim().toLowerCase();
  if (!q) return [];
  return cities.value.filter(c => c.name.toLowerCase().includes(q));
});

const onCityInput = (e) => {
  cityInput.value = e.target.value;
  showCitySuggestions.value = true;
};
const selectCity = (city) => {
  cityInput.value = city.name;
  form.city = city.name;
  showCitySuggestions.value = false;
};
const onCityBlur = () => {
  setTimeout(() => {
    if (!cities.value.some(c => c.name === cityInput.value)) {
      cityInput.value = form.city || '';
    }
    showCitySuggestions.value = false;
  }, 150);
};

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

// Загрузка городов
const loadCities = async () => {
  try {
    const res = await axios.get('/api/cities');
    cities.value = res.data || [];
  } catch (e) { /* ignore */ }
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

onMounted(async () => {
  loadCities();
  if (appStore.city) {
    form.city = appStore.city;
    cityInput.value = appStore.city;
  }
  initCaptcha();

  // --- ЛОГИКА АВТОВХОДА ПОСЛЕ GOOGLE ---
  const { data: { session } } = await supabase.auth.getSession();
  if (session && !localStorage.getItem('user_id')) {
    const sbUser = session.user;
    try {
      const res = await axios.get('/api/users/profile/' + sbUser.id);
      saveSession(res.data);
    } catch (e) {
      const newUserObj = {
        id: sbUser.id,
        email: sbUser.email,
        first_name: sbUser.user_metadata?.full_name?.split(' ')[0] || sbUser.user_metadata?.first_name || 'Пользователь',
        last_name: sbUser.user_metadata?.full_name?.split(' ')[1] || '',
        avatar_url: sbUser.user_metadata?.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png',
        role: 'user'
      };
      saveSession(newUserObj);
    }
  }
});

const handleRegister = async () => {
  if (!form.email && !form.phone) return error.value = 'Укажите Email или Телефон для связи';
  if (form.password.length < 6) return error.value = 'Пароль должен быть не менее 6 символов';
  if (form.password !== form.confirmPassword) return error.value = 'Введённые пароли не совпадают';
  if (!form.city.trim()) return error.value = 'Укажите ваш город';
  if (!form.captchaToken) return error.value = 'Пожалуйста, подтвердите, что вы не робот.';

  loading.value = true;
  error.value = '';
  successMessage.value = '';

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

const socialRegister = async (provider) => {
  googleLoading.value = true;
  try {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/profile' }
    });
    if (authError) throw authError;
  } catch (err) {
    error.value = 'Ошибка Google: ' + err.message;
    googleLoading.value = false;
  }
};

const saveSession = (user) => {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('role', user.role || 'user');
    localStorage.setItem('user_name', [user.last_name, user.first_name].filter(Boolean).join(' ') || 'Пользователь');
    localStorage.setItem('user_first_name', user.first_name || '');
    localStorage.setItem('user_avatar', user.avatar_url || 'https://gptwjxibdxovggkfmfpl.supabase.co/storage/v1/object/public/avatars/1.png');
    
    router.push('/profile');
    setTimeout(() => window.location.reload(), 100);
};
</script>

<style scoped>
/* ---------- базовые стили как у вас, плюс стили для автодополнения ---------- */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes shake { 0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)} }
@keyframes spin { to { transform: rotate(360deg); } }

.auth-page {
  min-height: calc(100vh - 80px);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px 20px; animation: fadeIn 0.5s ease-out;
}
.auth-header { text-align: center; margin-bottom: 35px; animation: fadeSlideUp 0.6s ease-out; }
.auth-header h1 { font-size: 2.5rem; font-weight: 900; color: var(--text-main, #0f172a); }
:global(.dark) .auth-header h1 { color: #f8fafc; }
.highlight {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.auth-card { width: 100%; max-width: 700px; padding: 48px; position: relative; }

.input-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px; }
.input-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
.input-wrapper label { display: block; font-weight: 800; font-size: 0.75rem; color: var(--text-muted, #64748b); text-transform: uppercase; margin-bottom: 8px; }
:global(.dark) .input-wrapper label { color: #94a3b8; }

.form-input {
  width: 100%; height: 46px; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
  background: rgba(0,0,0,0.02); border: 1.5px solid var(--border-color, #cbd5e1);
  font-size: 0.95rem; color: var(--text-main, #0f172a); transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.pass-input-wrap { position: relative; display: flex; align-items: center; }
.eye-btn { position: absolute; right: 12px; background: none; border: none; font-size: 1.2rem; cursor: pointer; opacity: 0.6; padding: 4px; }

/* автодополнение города */
.city-autocomplete { position: relative; }
.city-suggestions {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
  max-height: 220px; overflow-y: auto; list-style: none; padding: 0; margin-top: 4px;
  border-radius: var(--radius-md, 12px); background: var(--bg-card, #fff);
  border: 1px solid var(--border-color, #e2e8f0); box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}
:global(.dark) .city-suggestions { background: #1e293b; border-color: #334155; }
.city-suggestions li {
  padding: 12px 18px; cursor: pointer; color: var(--text-main, #0f172a);
  border-bottom: 1px solid var(--border-color, #e2e8f0);
}
:global(.dark) .city-suggestions li { color: #f8fafc; border-color: #334155; }
.city-suggestions li:hover { background: rgba(37,99,235,0.05); }

.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-8px); }

.captcha-container { display: flex; justify-content: center; margin: 20px 0; min-height: 100px; }

.btn-register {
  width: 100%; padding: 16px; background: linear-gradient(135deg, var(--success, #10b981), #059669);
  color: white; border: none; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: all 0.3s;
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3); display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-register:hover:not(:disabled) { transform: translateY(-2px); }
.spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.error-box { margin-top: 24px; padding: 14px 18px; background: rgba(239,68,68,0.1); color: var(--danger, #ef4444); border-radius: var(--radius-md, 8px); text-align: center; font-weight: 700; border: 1px solid rgba(239,68,68,0.3); animation: shake 0.4s ease-in-out; }
.success-box { margin-top: 24px; padding: 14px 18px; background: rgba(16,185,129,0.1); color: var(--success, #10b981); border-radius: var(--radius-md, 8px); text-align: center; font-weight: 700; border: 1px solid rgba(16,185,129,0.3); }

.separator { margin: 32px 0; position: relative; display: flex; align-items: center; justify-content: center; }
.separator::before { content: ""; position: absolute; width: 100%; height: 1px; background: var(--border-color, #e2e8f0); }
.separator span { position: relative; background: var(--bg-card, #fff); padding: 0 20px; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }
:global(.dark) .separator span { background: #1e293b; }

.social-btn {
  width: 100%; padding: 14px; display: flex; align-items: center; justify-content: center; gap: 14px;
  border-radius: var(--radius-md, 8px); background: rgba(0,0,0,0.02); border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-main, #0f172a); font-weight: 700; cursor: pointer; transition: all 0.3s;
}
:global(.dark) .social-btn { background: rgba(255,255,255,0.02); color: #f8fafc; border-color: #475569; }
.social-btn img { width: 22px; height: 22px; }

.auth-footer { margin-top: 32px; font-size: 0.95rem; color: var(--text-muted, #64748b); text-align: center; }
.auth-footer a { font-weight: 800; color: var(--primary, #2563eb); text-decoration: none; }

@media (max-width: 768px) {
  .auth-card { padding: 28px 20px; }
  .input-grid-3, .input-grid-2 { grid-template-columns: 1fr; }
}
</style>