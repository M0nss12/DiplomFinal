<template>
  <div class="auth-page">
    <div class="auth-card glass-card">
      <section class="auth-header">
        <h1>Новый <span class="highlight">пароль</span></h1>
        <p>Придумайте сложный пароль для защиты вашего аккаунта.</p>
      </section>

      <form v-if="!isSuccess" @submit.prevent="handleReset">
        <div class="input-wrapper">
          <label>Новый пароль</label>
          <div class="pass-input-wrap">
            <input :type="showP ? 'text' : 'password'" v-model="password" required placeholder="••••••" class="form-input" />
            <button type="button" class="eye-btn" @click="showP = !showP">{{ showP ? '🙈' : '👁️' }}</button>
          </div>
        </div>

        <div class="input-wrapper" style="margin-top: 20px;">
          <label>Повторите пароль</label>
          <div class="pass-input-wrap">
            <input :type="showCP ? 'text' : 'password'" v-model="confirmPassword" required placeholder="••••••" class="form-input" />
            <button type="button" class="eye-btn" @click="showCP = !showCP">{{ showCP ? '🙈' : '👁️' }}</button>
          </div>
        </div>

        <button type="submit" :disabled="loading" class="btn-primary">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? 'Обновление...' : 'СОХРАНИТЬ ПАРОЛЬ' }}
        </button>
      </form>

      <div v-else class="success-state">
        <div class="success-icon">✔</div>
        <h2>Пароль изменен!</h2>
        <p>Теперь вы можете войти в свой аккаунт, используя новый пароль.</p>
        <router-link to="/login" class="btn-primary" style="text-decoration: none;">Перейти к входу</router-link>
      </div>

      <transition name="fade">
        <div v-if="error" class="error-box">⚠️ {{ error }}</div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const isSuccess = ref(false);
const showP = ref(false);
const showCP = ref(false);

const handleReset = async () => {
  if (password.value.length < 6) return error.value = 'Пароль слишком короткий';
  if (password.value !== confirmPassword.value) return error.value = 'Пароли не совпадают';

  const token = route.query.token;
  if (!token) return error.value = 'Токен отсутствует. Запросите сброс заново.';

  loading.value = true;
  error.value = '';

  try {
    const API_URL = import.meta.env.VITE_API_URL || '';
    await axios.post(`/api/users/reset-password`, {
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
/* Используем стили из Register.vue для единообразия */
.auth-page { min-height: calc(100vh - 80px); display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { width: 100%; max-width: 450px; padding: 40px; text-align: center; }
.highlight { background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.form-input { width: 100%; height: 50px; padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-color, #cbd5e1); background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 1rem; box-sizing: border-box; }
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.pass-input-wrap { position: relative; }
.eye-btn { position: absolute; right: 12px; top: 12px; background: none; border: none; cursor: pointer; font-size: 1.2rem; opacity: 0.6; }
.btn-primary { width: 100%; padding: 16px; background: var(--primary, #2563eb); color: white; border: none; border-radius: 8px; font-weight: 800; cursor: pointer; margin-top: 25px; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 10px; }
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
.success-icon { width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px; }
.error-box { margin-top: 20px; color: #ef4444; font-weight: 700; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 8px; }
</style>