<template>
  <div class="admin-attributes">
    <!-- ЗАГОЛОВОК -->
    <div class="header-row">
      <div class="header-left">
        <h1>⚙️ Динамические фильтры</h1>
        <p class="subtitle">Настройка характеристик для каждой категории товаров</p>
      </div>
      <div class="stats-badge glass-card">
        <span class="stats-icon">🔧</span>
        Атрибутов: <b>{{ filteredAttributes.length }}</b>
      </div>
    </div>

    <!-- 1. ФОРМА СОЗДАНИЯ -->
    <section class="admin-card create-card glass-card">
      <div class="card-header">
        <h3 class="card-title">✨ Добавить атрибут категории</h3>
        <div class="card-decoration"></div>
      </div>
      <form @submit.prevent="createAttribute" class="admin-form">
        <div class="input-grid">
          <div class="input-group">
            <label>📂 Категория *</label>
            <select v-model="newAttr.category_id" required class="form-input">
              <option :value="null" disabled>-- Выберите раздел --</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="input-group">
            <label>🏷️ Название (Label) *</label>
            <input v-model="newAttr.label" placeholder="Напр. Емкость, Ач" required class="form-input" />
          </div>
          <div class="input-group">
            <label>💻 Код (системный) *</label>
            <input v-model="newAttr.code" placeholder="capacity_ah" required class="form-input code-font" />
          </div>
          <div class="input-group">
            <label>📊 Тип поля</label>
            <select v-model="newAttr.type" class="form-input">
              <option value="range">Интервал (От-До)</option>
              <option value="checkbox">Список (Множ. выбор)</option>
              <option value="boolean">Логический (Да/Нет)</option>
              <option value="text">Текст</option>
            </select>
          </div>
          <div class="input-group">
            <label>📏 Ед. измерения</label>
            <input v-model="newAttr.unit" placeholder="шт, кг, V, Ah..." class="form-input" />
          </div>
          <div class="input-group">
            <label>🔢 Порядок</label>
            <input v-model.number="newAttr.sort_order" type="number" class="form-input" />
          </div>
        </div>

        <!-- Поле для опций (если тип checkbox) -->
        <div v-if="newAttr.type === 'checkbox'" class="options-zone glass-card">
          <label>📝 Варианты выбора (через запятую):</label>
          <textarea v-model="tempOptions" placeholder="60Ah, 70Ah, 100Ah..." class="form-input" rows="2"></textarea>
          <small>Эти значения пользователь увидит в фильтрах.</small>
        </div>

        <div class="form-footer">
          <div class="toggles">
            <label class="custom-checkbox">
              <input type="checkbox" v-model="newAttr.is_filterable" />
              <span class="checkmark"></span>
              <span>Показывать в фильтрах</span>
            </label>
            <label class="custom-checkbox">
              <input type="checkbox" v-model="newAttr.is_required" />
              <span class="checkmark"></span>
              <span>Обязателен для товара</span>
            </label>
          </div>
          <button type="submit" class="btn-primary" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner-small"></span>
            <span v-else>➕ Создать атрибут</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТР СПИСКА -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Просмотр атрибутов</h3>
      </div>
      <div class="input-group">
        <label>Фильтр по категории:</label>
        <select v-model="categoryFilter" class="form-input">
          <option value="all">Показать все категории</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="admin-table-wrapper glass-card">
        <table class="admin-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th>Категория</th>
              <th>Код / Название</th>
              <th>Тип / Ед. изм.</th>
              <th class="text-center">Фильтр</th>
              <th class="text-center">Обяз.</th>
              <th class="text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in filteredAttributes" :key="a.id" class="attr-row">
              <td class="col-id">#{{ a.id }}</td>
              
              <td>
                <span class="cat-tag">{{ getCategoryName(a.category_id) }}</span>
              </td>

              <td>
                <input v-model="a.label" @change="updateAttr(a)" class="inline-edit bold" />
                <input v-model="a.code" @change="updateAttr(a)" class="inline-edit mini code-font" />
              </td>

              <td>
                <select v-model="a.type" @change="updateAttr(a)" class="table-select">
                  <option value="range">range</option>
                  <option value="checkbox">checkbox</option>
                  <option value="boolean">boolean</option>
                  <option value="text">text</option>
                </select>
                <input v-model="a.unit" @change="updateAttr(a)" class="inline-edit mini" placeholder="Ед.изм" />
              </td>

              <td class="text-center">
                <label class="custom-checkbox no-text">
                  <input type="checkbox" v-model="a.is_filterable" @change="updateAttr(a)" />
                  <span class="checkmark"></span>
                </label>
              </td>

              <td class="text-center">
                <label class="custom-checkbox no-text">
                  <input type="checkbox" v-model="a.is_required" @change="updateAttr(a)" />
                  <span class="checkmark"></span>
                </label>
              </td>

              <td class="text-right">
                <button @click="deleteAttr(a.id)" class="btn-delete-small">🗑️</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed, watch } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const API_URL = import.meta.env.VITE_API_URL || '';
const config = { headers: { 'x-admin-key': ADMIN_SECRET } };

const attributes = ref([]);
const categories = ref([]);
const loadingAction = ref(false);
const categoryFilter = ref('all');
const tempOptions = ref('');

const newAttr = reactive({
  category_id: null,
  code: '',
  label: '',
  type: 'text',
  unit: '',
  sort_order: 0,
  is_filterable: true,
  is_required: false,
  options_json: []
});

const loadData = async () => {
  try {
    const [aRes, cRes] = await Promise.all([
      axios.get(`/api/admin/category_attributes`, config),
      axios.get(`/api/admin/categories`, config)
    ]);
    attributes.value = aRes.data;
    categories.value = cRes.data;
  } catch (e) { console.error('Ошибка загрузки данных атрибутов'); }
};

const getCategoryName = (id) => categories.value.find(c => c.id === id)?.name || '---';

// CRUD
const createAttribute = async () => {
  loadingAction.value = true;
  try {
    // Превращаем строку опций в массив для JSONB
    if (newAttr.type === 'checkbox' && tempOptions.value) {
      newAttr.options_json = tempOptions.value.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      newAttr.options_json = [];
    }

    const res = await axios.post(`/api/admin/category_attributes`, newAttr, config);
    attributes.value.unshift(res.data);
    
    // Сброс
    Object.assign(newAttr, { code: '', label: '', type: 'text', unit: '', sort_order: 0, options_json: [] });
    tempOptions.value = '';
    alert('Атрибут добавлен');
  } catch (e) { 
    alert('Ошибка при создании (возможно, такой код уже есть в этой категории)'); 
  } finally { loadingAction.value = false; }
};

const updateAttr = async (a) => {
  try {
    await axios.put(`/api/admin/category_attributes/${a.id}`, a, config);
  } catch (e) { console.error('Ошибка обновления'); }
};

const deleteAttr = async (id) => {
  if (!confirm('Удалить этот атрибут? Он исчезнет из всех товаров этой категории!')) return;
  try {
    await axios.delete(`/api/admin/category_attributes/${id}`, config);
    attributes.value = attributes.value.filter(a => a.id !== id);
  } catch (e) { alert('Ошибка при удалении'); }
};

const filteredAttributes = computed(() => {
  let res = [...attributes.value];
  if (categoryFilter.value !== 'all') {
    res = res.filter(a => a.category_id === categoryFilter.value);
  }
  return res.sort((a, b) => a.sort_order - b.sort_order);
});

onMounted(loadData);
</script>

<style scoped>
/* ==========================================================================
   АДМИНКА: АТРИБУТЫ (GLASSMORPHISM & DARK MODE)
   ========================================================================== */
@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.admin-attributes { padding: 40px 24px; animation: fadeSlideUp 0.5s ease-out; color: var(--text-main, #0f172a); }
:global(.dark) .admin-attributes { color: #f8fafc; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 32px; }
.header-left h1 {
  font-size: 2.2rem; font-weight: 900; margin: 0;
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9));
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted, #64748b); font-size: 0.95rem; }

.stats-badge { padding: 10px 20px; border-radius: 60px; font-weight: 800; display: flex; align-items: center; gap: 10px; font-size: 0.95rem; }

/* КАРТОЧКИ */
.glass-card {
  background: var(--bg-card, #ffffff); border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 16px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(8px); transition: all 0.3s ease;
}
:global(.dark) .glass-card { background: #1e293b; border-color: #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration { width: 50px; height: 4px; background: linear-gradient(90deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); border-radius: 4px; margin-top: 5px; }

/* ФОРМА */
.input-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 24px; }
.input-group label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); display: block; margin-bottom: 8px; }

.form-input {
  width: 100%; padding: 12px 16px; border-radius: var(--radius-sm, 8px); border: 1.5px solid var(--border-color, #cbd5e1);
  background: rgba(0,0,0,0.02); color: var(--text-main, #0f172a); font-size: 0.95rem; transition: all 0.3s;
}
:global(.dark) .form-input { background: rgba(255,255,255,0.02); border-color: #475569; color: #f8fafc; }
.form-input:focus { border-color: var(--primary, #2563eb); background: transparent; outline: none; }

.code-font { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--primary, #2563eb); }

.options-zone { padding: 20px; background: rgba(0,0,0,0.02); margin-bottom: 24px; border-style: dashed; }
.options-zone label { font-size: 0.8rem; font-weight: 800; color: var(--primary, #2563eb); margin-bottom: 10px; display: block; }

.form-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; padding-top: 20px; border-top: 1px dashed var(--border-color, #e2e8f0); }
.toggles { display: flex; gap: 30px; }

.btn-primary {
  background: linear-gradient(135deg, var(--primary, #2563eb), var(--accent, #0ea5e9)); color: white; border: none;
  padding: 12px 30px; border-radius: var(--radius-md, 8px); font-weight: 800; cursor: pointer; transition: 0.3s;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4); }

/* ТАБЛИЦА */
.table-container { margin-top: 20px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table { width: 100%; border-collapse: collapse; min-width: 1000px; }
.admin-table th { padding: 16px 20px; text-align: left; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: var(--text-muted, #64748b); border-bottom: 2px solid var(--border-color, #e2e8f0); }
:global(.dark) .admin-table th { border-color: #334155; }
.admin-table td { padding: 16px 20px; border-bottom: 1px solid var(--border-color, #e2e8f0); vertical-align: middle; }
:global(.dark) .admin-table td { border-color: #334155; }

.attr-row:hover td { background: rgba(37, 99, 235, 0.02); }

.cat-tag { background: rgba(37, 99, 235, 0.1); color: var(--primary, #2563eb); padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: 800; }

.inline-edit { background: transparent; border: 1px solid transparent; padding: 6px; border-radius: 6px; color: var(--text-main, #0f172a); width: 100%; font-weight: 500; transition: 0.2s; }
:global(.dark) .inline-edit { color: #f8fafc; }
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color, #cbd5e1); }
.inline-edit:focus { border-color: var(--primary, #2563eb); background: var(--bg-card, #fff); outline: none; }
.inline-edit.mini { font-size: 0.8rem; color: var(--text-muted, #94a3b8); }

.table-select { background: transparent; border: none; font-weight: 800; color: var(--accent, #0ea5e9); cursor: pointer; text-transform: uppercase; font-size: 0.8rem; }

.btn-delete-small { background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.1); padding: 8px 12px; border-radius: 30px; font-weight: 800; color: var(--danger, #ef4444); cursor: pointer; transition: 0.2s; }
.btn-delete-small:hover { background: var(--danger, #ef4444); color: white; }

/* ЧЕКБОКСЫ */
.custom-checkbox { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; font-weight: 700; font-size: 0.85rem; }
.custom-checkbox input { display: none; }
.checkmark { width: 20px; height: 20px; background: transparent; border: 2px solid var(--border-color, #cbd5e1); border-radius: 6px; position: relative; transition: all 0.2s; }
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--primary, #2563eb); border-color: var(--primary, #2563eb); }
.custom-checkbox input:checked + .checkmark::after { content: '✓'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 12px; font-weight: bold; }

@media (max-width: 768px) {
  .header-row { flex-direction: column; align-items: flex-start; }
  .input-grid { grid-template-columns: 1fr; }
  .toggles { flex-direction: column; gap: 10px; }
  .form-footer { flex-direction: column; align-items: stretch; }
}
</style>