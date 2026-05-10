<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      
      <!-- ЗАГОЛОВОК -->
      <section class="auth-header">
        <h1>Новый <span class="highlight">пароль</span></h1>
        <p v-if="!isSuccess">Придумайте сложный пароль для защиты вашего аккаунта.</p>
        <p v-else>Ваш пароль успешно изменён. Используйте его для входа.</p>
      </section>

      <!-- ФОРМА СМЕНЫ ПАРОЛЯ -->
      <form v-if="!isSuccess" @submit.prevent="handleReset">
        <div class="input-wrapper">
          <label>Новый пароль</label>
          <div class="pass-input-wrap">
            <input 
              :type="showP ? 'text' : 'password'" 
              v-model="password" 
              required 
              placeholder="Минимум 6 символов" 
              class="form-input"
            />
            <button type="button" class="eye-btn" @click="showP = !showP">
              {{ showP ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="input-wrapper">
          <label>Повторите пароль</label>
          <div class="pass-input-wrap">
            <input 
              :type="showCP ? 'text' : 'password'" 
              v-model="confirmPassword" 
              required 
              placeholder="Введите пароль ещё раз" 
              class="form-input"
            />
            <button type="button" class="eye-btn" @click="showCP = !showCP">
              {{ showCP ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button type="submit" :disabled="loading" class="btn-primary">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Сохранение...' : '💾 Сохранить пароль' }}
        </button>
      </form>

      <!-- СООБЩЕНИЕ ОБ УСПЕХЕ -->
      <div v-else class="success-state">
        <div class="success-icon">✔</div>
        <h2>Пароль изменён!</h2>
        <router-link to="/login" class="btn-primary" style="text-decoration: none; margin-top: 20px; display: inline-flex;">
          🔑 Перейти к входу
        </router-link>
      </div>

      <!-- ОШИБКИ -->
      <transition name="fade">
        <div v-if="error" class="error-box">⚠️ {{ error }}</div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';

const route = useRoute();

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const isSuccess = ref(false);
const showP = ref(false);
const showCP = ref(false);

const handleReset = async () => {
  error.value = '';

  if (password.value.length < 6) {
    error.value = 'Пароль должен содержать минимум 6 символов';
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Пароли не совпадают';
    return;
  }

  const token = route.query.token;
  if (!token) {
    error.value = 'Токен отсутствует. Запросите сброс пароля заново.';
    return;
  }

  loading.value = true;

  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    await axios.post(`${API_URL}/api/users/reset-password`, {
      token,
      newPassword: password.value
    });
    isSuccess.value = true;
  } catch (err) {
    error.value = err.response?.data?.error || 'Ссылка устарела или недействительна.';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* ==========================================================================
   ОБЩИЕ СТИЛИ (ПОДДЕРЖКА СВЕТЛОЙ/ТЕМНОЙ ТЕМЫ)
   ========================================================================== */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(25px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeSlideUp 0.5s ease-out;
}

.glass-card {
  background: var(--bg-card, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}
:global(.dark) .glass-card {
  background: #1e293b;
  border-color: #334155;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
}

.auth-card {
  width: 100%;
  max-width: 480px;
  padding: 48px 40px;
  text-align: center;
  animation: fadeSlideUp 0.6s ease-out;
}

.auth-header {
  margin-bottom: 35px;
}

.auth-header h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 12px;
  color: var(--text-main, #0f172a);
}
:global(.dark) .auth-header h1 { color: #f8fafc; }

.highlight {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-header p {
  color: var(--text-muted, #64748b);
  font-size: 1rem;
  line-height: 1.5;
}
:global(.dark) .auth-header p { color: #94a3b8; }

/* ИНПУТЫ */
.input-wrapper {
  margin-bottom: 20px;
  text-align: left;
}

.input-wrapper label {
  display: block;
  font-weight: 800;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 8px;
  color: var(--text-muted, #64748b);
}
:global(.dark) .input-wrapper label { color: #94a3b8; }

.form-input {
  width: 100%;
  height: 50px;
  padding: 12px 16px;
  border-radius: var(--radius-sm, 8px);
  background: rgba(0,0,0,0.02);
  border: 1.5px solid var(--border-color, #cbd5e1);
  font-size: 0.95rem;
  color: var(--text-main, #0f172a);
  transition: all 0.3s;
  box-sizing: border-box;
}
:global(.dark) .form-input {
  background: rgba(255,255,255,0.02);
  border-color: #475569;
  color: #f8fafc;
}
.form-input:focus {
  border-color: var(--primary, #2563eb);
  background: transparent;
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pass-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pass-input-wrap input {
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
  transition: all 0.2s;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.eye-btn:hover { opacity: 1; transform: scale(1.1); }

/* КНОПКА */
.btn-primary {
  width: 100%;
  height: 52px;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  color: white;
  border: none;
  border-radius: var(--radius-md, 8px);
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 1px;
  margin-top: 8px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}
.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* УСПЕХ */
.success-state {
  padding: 20px 0;
}

.success-icon {
  width: 60px;
  height: 60px;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  margin: 0 auto 20px;
}

.success-state h2 {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main, #0f172a);
  margin-bottom: 10px;
}
:global(.dark) .success-state h2 { color: #f8fafc; }

.success-state p {
  color: var(--text-muted, #64748b);
  margin-bottom: 10px;
}

/* ОШИБКИ */
.error-box {
  margin-top: 24px;
  padding: 14px 18px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger, #ef4444);
  border-radius: var(--radius-md, 8px);
  font-size: 0.9rem;
  font-weight: 700;
  border: 1px solid rgba(239, 68, 68, 0.3);
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* АНИМАЦИИ */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* АДАПТИВНОСТЬ */
@media (max-width: 480px) {
  .auth-card { padding: 32px 24px; }
  .auth-header h1 { font-size: 1.8rem; }
  .btn-primary, .form-input { height: 48px; }
}
</style>