<template>
  <div class="login-page animate-fade-in">
    <div class="login-card glass-card">
      <!-- ЗАГОЛОВОК -->
      <section class="login-header">
        <h1>Вход в <span class="highlight">ApexDrive</span></h1>
        <p>Добро пожаловать! Войдите в свой профиль через почту или Google.</p>
      </section>

      <!-- УВЕДОМЛЕНИЕ О ПОДТВЕРЖДЕНИИ ПОЧТЫ -->
      <div v-if="emailVerifiedMessage" class="alert alert-success">
        ✅ {{ emailVerifiedMessage }}
      </div>

      <!-- ФОРМА ВХОДА -->
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>Логин (Email или Телефон)</label>
          <input v-model="form.login" type="text" placeholder="example@mail.com или +7..." required />
        </div>

        <div class="form-group">
          <div class="password-label-row">
            <label>Пароль</label>
            <button type="button" @click="showResetModal = true" class="forgot-btn">Забыли пароль?</button>
          </div>
          <div class="password-wrapper">
            <input v-model="form.password" :type="isPasswordVisible ? 'text' : 'password'" placeholder="••••••••" required />
            <button type="button" class="eye-btn" @click="isPasswordVisible = !isPasswordVisible">
              {{ isPasswordVisible ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block login-btn" :disabled="loading || googleLoading">
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
        <button @click="socialAuth('google')" class="btn btn-outline btn-lg btn-block google-btn" :disabled="googleLoading" title="Войти через Google">
          <template v-if="googleLoading">
            <span class="spinner"></span>
          </template>
          <template v-else>
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" class="google-icon" />
            <span>Войти через Google Account</span>
          </template>
        </button>
        <div v-if="googleError" class="alert alert-error mt-2">{{ googleError }}</div>
      </div>

      <p class="auth-footer">
        Нет аккаунта?
        <router-link to="/register">Зарегистрироваться</router-link>
      </p>

      <!-- ОШИБКИ -->
      <transition name="fade">
        <div v-if="error" class="alert alert-error mt-2">
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
          <div class="form-group">
            <input v-model="resetEmail" type="email" placeholder="Ваш Email" required />
          </div>
          <button type="submit" class="btn btn-primary btn-block" :disabled="resetLoading">
            <span v-if="resetLoading" class="spinner"></span>
            {{ resetLoading ? 'Отправка...' : 'Отправить письмо' }}
          </button>
        </form>

        <transition name="fade">
          <div v-if="resetMessage" class="alert alert-success mt-3">
            {{ resetMessage }}
          </div>
        </transition>
        <transition name="fade">
          <div v-if="resetError" class="alert alert-error mt-3">
            {{ resetError }}
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
// (логика без изменений)
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

const googleLoading = ref(false);
const googleError = ref('');

const showResetModal = ref(false);
const resetEmail = ref('');
const resetLoading = ref(false);
const resetMessage = ref('');
const resetError = ref('');

let authListener = null;

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
      id: sbUser.id,
      email: sbUser.email,
      first_name: sbUser.user_metadata?.full_name?.split(' ')[0] || sbUser.user_metadata?.first_name || 'Пользователь',
      last_name: sbUser.user_metadata?.full_name?.split(' ')[1] || '',
      avatar_url: sbUser.user_metadata?.avatar_url,
      role: 'user'
    });
  }
};

const handleLogin = async () => {
  error.value = '';
  loading.value = true;
  try {
    const res = await axios.post('/api/users/login', form.value);
    saveSession(res.data);
  } catch (err) {
    error.value = err.response?.data?.error || 'Неверный логин или пароль';
  } finally {
    loading.value = false;
  }
};

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

const socialAuth = async (provider) => {
  googleLoading.value = true;
  googleError.value = '';
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

onMounted(async () => {
  if (route.query.verified === 'true') {
    emailVerifiedMessage.value = 'Ваша почта успешно подтверждена! Теперь вы можете войти.';
  }

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
   ТОЛЬКО УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ (глобальные уже присутствуют)
   ========================================================================== */

/* Структура страницы */
.login-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Карточка с дополнительным эффектом стекла */
.login-card {
  width: 100%;
  max-width: 480px;
  padding: 48px 40px;
  text-align: center;
  backdrop-filter: blur(8px); /* лёгкий блюр поверх глобальной glass-card */
}

/* Заголовок */
.login-header h1 {
  font-size: 2.2rem;
  margin-bottom: 12px;
  font-weight: 900;
  color: var(--text-main);
}
.highlight {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.login-header p {
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.5;
}

/* Форма */
.login-form {
  margin-top: 35px;
  text-align: left;
}

/* Группа полей */
.form-group {
  margin-bottom: 24px;
}
.form-group label {
  display: block;
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 8px;
}

/* Строка с паролем и кнопкой "Забыли?" */
.password-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.forgot-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  padding: 0 0 8px 0;
  transition: color 0.2s;
}
.forgot-btn:hover {
  color: var(--primary-hover);
  text-decoration: underline;
}

/* Обёртка для поля ввода пароля с глазиком */
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.password-wrapper input {
  padding-right: 50px;
}
.eye-btn {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s, transform 0.2s;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.eye-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Кнопка входа (поверх глобального .btn добавляем градиент и высоту) */
.login-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  height: 52px;
  margin-top: 8px;
}
.login-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--primary-hover), var(--accent));
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
  background: linear-gradient(90deg, transparent, var(--border-color), transparent);
}
:global(.dark) .separator::before {
  background: linear-gradient(90deg, transparent, #334155, transparent);
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

/* Социальная кнопка Google */
.social-login {
  display: flex;
  flex-direction: column;
}
.google-btn {
  height: 52px;
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
  color: var(--text-muted);
}
.auth-footer a {
  font-weight: 800;
  color: var(--primary);
  text-decoration: none;
}
.auth-footer a:hover {
  text-decoration: underline;
}

/* Модальное окно сброса пароля */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.modal-content {
  width: 90%;
  max-width: 450px;
  padding: 40px 30px;
  position: relative;
  text-align: center;
}
.modal-close {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0,0,0,0.05);
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-main);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s, transform 0.2s;
}
:global(.dark) .modal-close {
  background: rgba(255,255,255,0.05);
  color: #f8fafc;
}
.modal-close:hover {
  background: var(--danger-light);
  color: var(--danger);
  transform: rotate(90deg);
}
.modal-content h2 {
  color: var(--text-main);
  font-weight: 800;
  margin-bottom: 10px;
  font-size: 1.6rem;
}
.modal-desc {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 25px;
  line-height: 1.5;
}

/* Вспомогательные отступы */
.mt-2 { margin-top: 16px; }
.mt-3 { margin-top: 24px; }

/* Анимации */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Адаптив */
@media (max-width: 480px) {
  .login-card {
    padding: 32px 24px;
  }
  .login-header h1 {
    font-size: 1.8rem;
  }
  .login-btn,
  .google-btn {
    height: 48px;
  }
}
</style>