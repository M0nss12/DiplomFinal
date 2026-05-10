<template>
  <div class="auth-page animate-fade-in">
    <div class="auth-card glass-card">
      
      <!-- ЗАГОЛОВОК -->
      <section class="auth-header">
        <h1>Новый <span class="highlight">пароль</span></h1>
        <p v-if="!isSuccess">Придумайте сложный пароль для защиты вашего аккаунта.</p>
        <p v-else>Ваш пароль успешно изменён. Используйте его для входа.</p>
      </section>

      <!-- ФОРМА СМЕНЫ ПАРОЛЯ -->
      <form v-if="!isSuccess" @submit.prevent="handleReset">
        <div class="form-group">
          <label>Новый пароль</label>
          <div class="pass-input-wrap">
            <input 
              :type="showP ? 'text' : 'password'" 
              v-model="password" 
              required 
              placeholder="Минимум 6 символов" 
            />
            <button type="button" class="eye-btn" @click="showP = !showP">
              {{ showP ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label>Повторите пароль</label>
          <div class="pass-input-wrap">
            <input 
              :type="showCP ? 'text' : 'password'" 
              v-model="confirmPassword" 
              required 
              placeholder="Введите пароль ещё раз" 
            />
            <button type="button" class="eye-btn" @click="showCP = !showCP">
              {{ showCP ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary btn-lg btn-block reset-btn" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Сохранение...' : '💾 Сохранить пароль' }}
        </button>
      </form>

      <!-- СООБЩЕНИЕ ОБ УСПЕХЕ -->
      <div v-else class="success-state">
        <div class="success-icon">✔</div>
        <h2>Пароль изменён!</h2>
        <router-link to="/login" class="btn btn-primary btn-lg" style="margin-top: 20px; display: inline-flex;">
          🔑 Перейти к входу
        </router-link>
      </div>

      <!-- ОШИБКИ -->
      <transition name="fade">
        <div v-if="error" class="alert alert-error mt-3">
          ⚠️ {{ error }}
        </div>
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
   УНИКАЛЬНЫЕ СТИЛИ СТРАНИЦЫ СБРОСА ПАРОЛЯ (глобальный CSS используется)
   ========================================================================== */

/* Страница-центровка */
.auth-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Карточка (используется глобальный .glass-card) */
.auth-card {
  width: 100%;
  max-width: 480px;
  padding: 48px 40px;
  text-align: center;
}

/* Заголовок с градиентным словом */
.auth-header {
  margin-bottom: 35px;
}

.auth-header h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin-bottom: 12px;
  color: var(--text-main);
}

.highlight {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.auth-header p {
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.5;
}

/* Группа полей (глобальный .form-group используется) */
.form-group {
  margin-bottom: 20px;
  text-align: left;
}

/* Контейнер для поля с глазиком */
.pass-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pass-input-wrap input {
  padding-right: 50px;
}

/* Кнопка глазика (кастомная) */
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
.eye-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

/* Кнопка отправки (глобальный .btn .btn-primary .btn-lg .btn-block + градиент) */
.reset-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  height: 52px;
  margin-top: 8px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.reset-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}

/* Иконка успеха */
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
  color: var(--text-main);
  margin-bottom: 10px;
}

.success-state p {
  color: var(--text-muted);
  margin-bottom: 10px;
}

/* Дополнительный отступ */
.mt-3 { margin-top: 24px; }

/* Анимации (глобальная .animate-fade-in уже добавлена, доопределяем fade) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 480px) {
  .auth-card {
    padding: 32px 24px;
  }
  .auth-header h1 {
    font-size: 1.8rem;
  }
}
</style>