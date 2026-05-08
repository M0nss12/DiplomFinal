import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // --- НАСТРОЙКА БИЛДА В BACKEND ---
  build: {
    // Готовые файлы кладем в папку backend/public
    outDir: path.resolve(__dirname, '../backend/public'),
    emptyOutDir: true, // Очищать папку перед новой сборкой
  },
  server: {
    // Прокси, чтобы во время разработки запросы /api шли на бэкенд
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})