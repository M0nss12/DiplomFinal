<template>
  <div class="login-page">
    <div class="login-card glass-card">
      
      <!-- ЗАГОЛОВОК -->
      <section class="login-header">
        <h1>Вход в <span class="highlight">ApexDrive</span></h1>
        <p>Добро пожаловать! Войдите в свой профиль через почту или Google.</p>
      </section>

      <!-- УВЕДОМЛЕНИЕ О ПОДТВЕРЖДЕНИИ ПОЧТЫ (Если перешли с email) -->
      <div v-if="emailVerifiedMessage" class="success-box">
        ✅ {{ emailVerifiedMessage }}
      </div>

      <!-- ФОРМА ВХОДА (ОБЫЧНАЯ) -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label>Логин (Email или Телефон)</label>
          <input 
            v-model="form.login" 
            type="text" 
            placeholder="example@mail.com или +7..." 
            required 
            class="form-input"
          />
        </div>

        <div class="input-group">
          <div class="password-label-row">
            <label>Пароль</label>
            <button type="button" @click="showResetModal = true" class="forgot-btn">Забыли пароль?</button>
          </div>
          <div class="password-wrapper">
            <input 
              v-model="form.password" 
              :type="isPasswordVisible ? 'text' : 'password'" 
              placeholder="••••••••" 
              required 
              class="form-input"
            />
            <button type="button" class="eye-btn" @click="isPasswordVisible = !isPasswordVisible">
              {{ isPasswordVisible ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button type="submit" :disabled="loading || googleLoading" class="btn-submit">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Проверка...' : 'Войти в аккаунт' }}
        </button>
      </form>

      <!-- РАЗДЕЛИТЕЛЬ -->
      <div class="separator">
        <span>или</span>
      </div>

      <!-- СОЦИАЛЬНЫЙ ВХОД (GOOGLE) -->
      <div class="social-login">
        <button 
          @click="socialAuth('google')" 
          class="social-btn glass-btn" 
          :disabled="googleLoading"
          title="Войти через Google"
        >
          <template v-if="googleLoading">
            <span class="spinner"></span>
          </template>
          <template v-else>
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google">
            <span>Войти через Google Account</span>
          </template>
        </button>
        <div v-if="googleError" class="error-box" style="margin-top: 8px;">
          {{ googleError }}
        </div>
      </div>

      <p class="auth-footer">
        Нет аккаунта? 
        <router-link to="/register">Зарегистрироваться</router-link>
      </p>

      <!-- ОШИБКИ -->
      <transition name="fade">
        <div v-if="error" class="error-box">
          ⚠️ {{ error }}
        </div>
      </transition>
    </div>

    <!-- МОДАЛЬНОЕ ОКНО СБРОСА ПАРОЛЯ -->
    <div v-if="showResetModal" class="modal-overlay" @click.self="closeResetModal">
      <div class="modal-content glass-card">
        <button class="modal-close" @click="closeResetModal">&times;</button>
        <h2>Восстановление пароля</h2>
        <p class="modal-desc">Введите Email, указанный при регистрации. Мы отправим вам ссылку для сброса пароля.</p>
        
        <form @submit.prevent="handlePasswordReset" class="reset-form">
          <input 
            v-model="resetEmail" 
            type="email" 
            placeholder="Ваш Email" 
            required 
            class="form-input"
          />
          <button type="submit" :disabled="resetLoading" class="btn-submit">
            <span v-if="resetLoading" class="spinner"></span>
            {{ resetLoading ? 'Отправка...' : 'Отправить письмо' }}
          </button>
        </form>

        <transition name="fade">
          <div v-if="resetMessage" class="success-box" style="margin-top: 15px;">
            {{ resetMessage }}
          </div>
        </transition>
        <transition name="fade">
          <div v-if="resetError" class="error-box" style="margin-top: 15px;">
            {{ resetError }}
          </div>
        </transition>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import axios from 'axios';
import { supabase } from '@/supabase';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();

const loading = ref(false);
const error = ref('');
const isPasswordVisible = ref(false);
const emailVerifiedMessage = ref('');
const form = ref({ login: '', password: '' });

// Состояния для Google OAuth
const googleLoading = ref(false);
const googleError = ref('');

// Модалка сброса пароля
const showResetModal = ref(false);
const resetEmail = ref('');
const resetLoading = ref(false);
const resetMessage = ref('');
const resetError = ref('');

let authListener = null;

// 1. СОХРАНЕНИЕ СЕССИИ (localStorage)
const saveSession = (user) => {
    localStorage.setItem('user_id', user.id);
    localStorage.setItem('role', user.role || 'user');
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
    localStorage.setItem('user_name', fullName || user.email || 'Пользователь');
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
  console.log("✅ Google вернул пользователя:", sbUser.email);

  try {
    // Ждем 1 секунду, чтобы триггер БД точно успел отработать
    await new Promise(r => setTimeout(r, 1000));
    const res = await axios.get(`/api/users/profile/${sbUser.id}`);
    console.log("✅ Профиль найден в БД. Выполняю вход.");
    saveSession(res.data);
  } catch (e) {
    console.warn("⚠️ Профиля еще нет в БД, создаю локальную сессию.");
    saveSession({
      id: sbUser.id, 
      email: sbUser.email,
      first_name: sbUser.user_metadata?.full_name?.split(' ')[0] || sbUser.user_metadata?.first_name || 'Пользователь',
      last_name: sbUser.user_metadata?.full_name?.split(' ')[1] || '',
      avatar_url: sbUser.user_metadata?.avatar_url, 
      role: 'user'
    });
  }
};

// 3. ОБЫЧНЫЙ ВХОД
const handleLogin = async () => {
  error.value = ''; loading.value = true;
  try {
    const res = await axios.post('/api/users/login', form.value);
    saveSession(res.data);
  } catch (err) {
    error.value = err.response?.data?.error || 'Неверный логин или пароль';
  } finally { loading.value = false; }
};

// 4. СБРОС ПАРОЛЯ
const handlePasswordReset = async () => {
  resetError.value = '';
  resetMessage.value = '';
  resetLoading.value = true;
  try {
    await axios.post('/api/users/request-password-reset', { email: resetEmail.value });
    resetMessage.value = 'Письмо отправлено! Проверьте папку "Входящие" или "Спам".';
    resetEmail.value = '';
  } catch (err) {
    resetError.value = err.response?.data?.error || 'Ошибка при отправке письма.';
  } finally {
    resetLoading.value = false;
  }
};

const closeResetModal = () => {
  showResetModal.value = false;
  resetEmail.value = '';
  resetError.value = '';
  resetMessage.value = '';
};

// 5. ВХОД ЧЕРЕЗ GOOGLE (КЛИК ПО КНОПКЕ)
const socialAuth = async (provider) => {
  googleLoading.value = true; googleError.value = '';
  try {
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: window.location.origin + route.path },
    });
    if (authError) throw authError;
  } catch (err) {
    googleError.value = `Ошибка Google: ${err.message}`;
    googleLoading.value = false;
  }
};

// 6. ИНИЦИАЛИЗАЦИЯ И СЛУШАТЕЛИ
onMounted(async () => {
  if (route.query.verified === 'true') {
    emailVerifiedMessage.value = 'Ваша почта успешно подтверждена! Теперь вы можете войти.';
  }

  // Принудительная проверка сессии при загрузке (если редирект был быстрым)
  const { data: { session } } = await supabase.auth.getSession();
  if (session && !localStorage.getItem('user_id')) {
    console.log("🔍 Найдена активная сессия при загрузке!");
    await processGoogleLogin(session);
  }

  // Слушатель изменения состояния авторизации
  const { data } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
    if (event === 'SIGNED_IN' && currentSession) {
      if (localStorage.getItem('user_id') === currentSession.user.id) return; 
      console.log("🔍 Сработало событие SIGNED_IN!");
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
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.login-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
}
:global(.dark) .glass-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.login-card {
  width: 100%; max-width: 480px; padding: 48px 40px; text-align: center;
  animation: fadeIn 0.5s ease-out; transition: transform 0.3s, box-shadow 0.3s;
}
.login-card:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1); }
:global(.dark) .login-card:hover { box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.5); }

.login-header h1 { font-size: 2.2rem; margin-bottom: 12px; font-weight: 900; color: var(--text-main, #0f172a); }
:global(.dark) .login-header h1 { color: #f8fafc; }

.highlight {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; padding: 0 4px;
}

.login-header p { color: var(--text-muted, #64748b); font-size: 1rem; line-height: 1.5; }
:global(.dark) .login-header p { color: #94a3b8; }

.login-form { margin-top: 35px; text-align: left; }
.input-group { margin-bottom: 24px; }
.input-group label { display: block; font-weight: 800; font-size: 0.75rem; margin-bottom: 8px; color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: 0.8px; }
:global(.dark) .input-group label { color: #94a3b8; }

.password-label-row { display: flex; justify-content: space-between; align-items: center; }
.forgot-btn { background: none; border: none; font-size: 0.75rem; font-weight: 700; color: var(--primary, #2563eb); cursor: pointer; padding: 0; margin-bottom: 8px; transition: color 0.2s; }
.forgot-btn:hover { color: var(--primary-hover, #1d4ed8); text-decoration: underline; }

.form-input {
  width: 100%; height: 52px; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
  background: rgba(0,0,0,0.02); border: 1.5px solid var(--border-color, #cbd5e1);
  font-size: 0.95rem; color: var(--text-main, #0f172a); transition: all 0.3s; box-sizing: border-box;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); outline: none; }

.password-wrapper { position: relative; display: flex; align-items: center; }
.password-wrapper input { padding-right: 50px; }
.eye-btn {
  position: absolute; right: 14px; background: none; border: none; font-size: 1.3rem; cursor: pointer;
  opacity: 0.6; transition: all 0.2s; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
}
.eye-btn:hover { opacity: 1; transform: scale(1.1); }

.btn-submit {
  width: 100%; height: 52px; background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  color: white; border-radius: var(--radius-md, 8px); font-size: 1rem; font-weight: 800; letter-spacing: 1px;
  margin-top: 8px; cursor: pointer; transition: all 0.3s; border: none; display: flex; align-items: center; justify-content: center; gap: 10px;
}
.btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3); }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }
.spinner { width: 20px; height: 20px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite; }

.separator { margin: 32px 0; position: relative; display: flex; align-items: center; justify-content: center; }
.separator::before { content: ""; position: absolute; width: 100%; height: 1px; background: linear-gradient(90deg, transparent, var(--border-color, #e2e8f0), transparent); }
:global(.dark) .separator::before { background: linear-gradient(90deg, transparent, #334155, transparent); }
.separator span { position: relative; background: var(--bg-card, #fff); padding: 0 20px; color: var(--text-muted, #64748b); font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }
:global(.dark) .separator span { background: #1e293b; color: #94a3b8; }

.social-login { display: flex; flex-direction: column; }
.glass-btn {
  width: 100%; height: 52px; display: flex; align-items: center; justify-content: center; gap: 14px;
  border-radius: var(--radius-md, 8px); background: rgba(0,0,0,0.02); border: 1px solid var(--border-color, #cbd5e1);
  color: var(--text-main, #0f172a); font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.3s;
}
:global(.dark) .glass-btn { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.glass-btn img { width: 22px; height: 22px; object-fit: contain; }
.glass-btn:hover:not(:disabled) { border-color: var(--primary, #2563eb); transform: translateY(-2px); background: rgba(37, 99, 235, 0.05); }

.auth-footer { margin-top: 32px; font-size: 0.95rem; color: var(--text-muted, #64748b); }
:global(.dark) .auth-footer { color: #94a3b8; }
.auth-footer a { font-weight: 800; color: var(--primary, #2563eb); text-decoration: none; transition: all 0.2s; }
.auth-footer a:hover { text-decoration: underline; }

.error-box { margin-top: 24px; padding: 14px 18px; background: rgba(239, 68, 68, 0.1); color: var(--danger, #ef4444); border-radius: var(--radius-md, 8px); font-size: 0.9rem; font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3); animation: shake 0.4s ease-in-out; }
.success-box { margin-bottom: 20px; padding: 14px 18px; background: rgba(16, 185, 129, 0.1); color: var(--success, #10b981); border-radius: var(--radius-md, 8px); font-size: 0.9rem; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.3); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 2000; animation: fadeSlideUp 0.2s ease-out; }
.modal-content { width: 90%; max-width: 450px; padding: 40px 30px; position: relative; text-align: center; }
.modal-close { position: absolute; top: 15px; right: 15px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.05); border: none; font-size: 24px; cursor: pointer; transition: all 0.2s; color: var(--text-main, #0f172a); display: flex; align-items: center; justify-content: center; }
:global(.dark) .modal-close { background: rgba(255,255,255,0.05); color: #f8fafc; }
.modal-close:hover { background: rgba(239,68,68,0.1); color: var(--danger, #ef4444); transform: rotate(90deg); }
.modal-content h2 { color: var(--text-main, #0f172a); font-weight: 800; margin-bottom: 10px; font-size: 1.6rem; }
:global(.dark) .modal-content h2 { color: #f8fafc; }
.modal-desc { color: var(--text-muted, #64748b); font-size: 0.95rem; margin-bottom: 25px; line-height: 1.5; }
.reset-form { text-align: left; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 480px) {
  .login-card { padding: 32px 24px; }
  .login-header h1 { font-size: 1.8rem; }
  .btn-submit, .social-btn, .form-input { height: 48px; }
  .eye-btn { font-size: 1.2rem; }
}
</style>