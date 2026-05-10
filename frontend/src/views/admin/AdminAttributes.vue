<template>
  <div class="admin-attributes animate-fade-in">
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
          <div class="form-group">
            <label>📂 Категория *</label>
            <select v-model="newAttr.category_id" required>
              <option :value="null" disabled>-- Выберите раздел --</option>
              <template v-for="parent in rootCategories" :key="parent.id">
                <optgroup :label="parent.name">
                  <option
                    v-for="child in getChildren(parent.id)"
                    :key="child.id"
                    :value="child.id"
                  >{{ child.name }}</option>
                </optgroup>
              </template>
            </select>
          </div>
          <div class="form-group">
            <label>🏷️ Название (Label) *</label>
            <input v-model="newAttr.label" placeholder="Напр. Ёмкость, Ач" required />
          </div>
          <div class="form-group">
            <label>💻 Код (системный) *</label>
            <input v-model="newAttr.code" placeholder="capacity_ah" required class="code-font" />
          </div>
          <div class="form-group">
            <label>📊 Тип поля</label>
            <select v-model="newAttr.type">
              <option value="range">Интервал (От-До)</option>
              <option value="checkbox">Список (Множ. выбор)</option>
              <option value="boolean">Логический (Да/Нет)</option>
              <option value="text">Текст</option>
            </select>
          </div>
          <div class="form-group">
            <label>📏 Ед. измерения</label>
            <input v-model="newAttr.unit" placeholder="шт, кг, V, Ah..." />
          </div>
          <div class="form-group">
            <label>🔢 Порядок</label>
            <input v-model.number="newAttr.sort_order" type="number" />
          </div>
        </div>

        <!-- Поле для опций (если тип checkbox) -->
        <div v-if="newAttr.type === 'checkbox'" class="options-zone glass-card">
          <label>📝 Варианты выбора (через запятую):</label>
          <textarea v-model="tempOptions" placeholder="60Ah, 70Ah, 100Ah..." rows="2"></textarea>
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
          <button type="submit" class="btn btn-primary create-btn" :disabled="loadingAction">
            <span v-if="loadingAction" class="spinner" style="width:16px;height:16px;border-width:2px;"></span>
            <span v-else>➕ Создать атрибут</span>
          </button>
        </div>
      </form>
    </section>

    <!-- 2. ФИЛЬТРЫ -->
    <section class="admin-card filter-section glass-card">
      <div class="filter-header">
        <h3 class="card-title">🔍 Поиск и фильтры</h3>
        <button @click="resetFilters" class="btn-text-link">Сбросить всё</button>
      </div>
      <div class="filter-grid">
        <div class="form-group">
          <label>🔎 Поиск по названию или коду</label>
          <input
            v-model="searchQuery"
            placeholder="Введите часть названия или кода..."
            @input="currentPage = 1"
          />
        </div>
        <div class="form-group">
          <label>📂 Категория</label>
          <!--
            ── ИСПРАВЛЕНИЕ ──────────────────────────────────────────────────
            В дропдауне фильтра показываем как родительские категории
            (выбор → охватывает все подкатегории), так и конкретные
            подкатегории. Значение родителя — отрицательное число
            (-id) чтобы отличить от реальных id подкатегорий.
            В filteredAttributes оба варианта обрабатываются корректно.
            ─────────────────────────────────────────────────────────────────
          -->
          <select v-model="categoryFilter" @change="currentPage = 1">
            <option value="all">Все категории</option>
            <template v-for="parent in rootCategories" :key="parent.id">
              <!-- Родитель: значение = 'parent:ID' -->
              <option :value="`parent:${parent.id}`">📁 {{ parent.name }}</option>
              <option
                v-for="child in getChildren(parent.id)"
                :key="child.id"
                :value="child.id"
              >&nbsp;&nbsp;&nbsp;└ {{ child.name }}</option>
            </template>
          </select>
        </div>
      </div>
    </section>

    <!-- 3. ТАБЛИЦА -->
    <div class="table-container">
      <div class="table-meta text-muted mb-2">
        Страница {{ currentPage }} из {{ totalPages || 1 }}
      </div>
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
            <tr v-for="a in paginatedAttributes" :key="a.id" class="attr-row">
              <td class="col-id">#{{ a.id }}</td>

              <td>
                <span class="cat-tag">{{ getCategoryName(a.category_id) }}</span>
              </td>

              <td>
                <input v-model="a.label" @change="updateAttr(a)" class="inline-edit bold" />
                <input v-model="a.code"  @change="updateAttr(a)" class="inline-edit mini code-font" />
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
                <button @click="deleteAttr(a.id)" class="btn btn-danger btn-sm">🗑️</button>
              </td>
            </tr>

            <tr v-if="paginatedAttributes.length === 0">
              <td colspan="7" style="text-align:center; padding:32px; color:var(--text-muted);">
                Атрибуты не найдены
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ПАГИНАЦИЯ -->
      <div v-if="totalPages > 1" class="pagination mt-3">
        <button @click="currentPage--" :disabled="currentPage === 1">←</button>
        <div class="pagination-pages">
          <button
            v-for="p in totalPages"
            :key="p"
            @click="currentPage = p"
            :class="{ active: currentPage === p }"
          >{{ p }}</button>
        </div>
        <button @click="currentPage++" :disabled="currentPage === totalPages">→</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import axios from 'axios';

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'my_super_secret_admin_123';
const config      = { headers: { 'x-admin-key': ADMIN_SECRET } };

const attributes   = ref([]);
const categories   = ref([]);
const loadingAction = ref(false);
const categoryFilter = ref('all');   // 'all' | number (sub-id) | 'parent:N' (root-id)
const searchQuery    = ref('');
const tempOptions    = ref('');
const currentPage    = ref(1);
const itemsPerPage   = 20;

const newAttr = reactive({
  category_id:  null,
  code:         '',
  label:        '',
  type:         'text',
  unit:         '',
  sort_order:   0,
  is_filterable: true,
  is_required:   false,
  options_json:  []
});

// ── Загрузка ─────────────────────────────────────────────────────────────────
const loadData = async () => {
  try {
    const [aRes, cRes] = await Promise.all([
      axios.get('/api/admin/category_attributes', config),
      axios.get('/api/admin/categories', config)
    ]);
    attributes.value = aRes.data;
    categories.value = cRes.data;
  } catch (e) {
    console.error('Ошибка загрузки данных атрибутов', e);
  }
};

// ── Хелперы категорий ────────────────────────────────────────────────────────

/** Только корневые категории (parent_id === null) */
const rootCategories = computed(() =>
  categories.value.filter(c => c.parent_id === null)
);

/** Дочерние категории заданного родителя */
const getChildren = (parentId) =>
  categories.value.filter(c => c.parent_id === parentId);

/** Название категории по id */
const getCategoryName = (id) =>
  categories.value.find(c => c.id === id)?.name || '---';

// ── CRUD ─────────────────────────────────────────────────────────────────────
const createAttribute = async () => {
  loadingAction.value = true;
  try {
    if (newAttr.type === 'checkbox' && tempOptions.value) {
      newAttr.options_json = tempOptions.value.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      newAttr.options_json = [];
    }

    const res = await axios.post('/api/admin/category_attributes', newAttr, config);
    attributes.value.unshift(res.data);

    Object.assign(newAttr, {
      category_id: null, code: '', label: '', type: 'text',
      unit: '', sort_order: 0, options_json: []
    });
    tempOptions.value = '';
    alert('Атрибут добавлен');
  } catch (e) {
    alert('Ошибка при создании (возможно, такой код уже есть в этой категории)');
  } finally {
    loadingAction.value = false;
  }
};

const updateAttr = async (a) => {
  try {
    await axios.put(`/api/admin/category_attributes/${a.id}`, a, config);
  } catch (e) {
    console.error('Ошибка обновления', e);
  }
};

const deleteAttr = async (id) => {
  if (!confirm('Удалить этот атрибут? Он исчезнет из всех товаров этой категории!')) return;
  try {
    await axios.delete(`/api/admin/category_attributes/${id}`, config);
    attributes.value = attributes.value.filter(a => a.id !== id);
  } catch (e) {
    alert('Ошибка при удалении');
  }
};

const resetFilters = () => {
  searchQuery.value    = '';
  categoryFilter.value = 'all';
  currentPage.value    = 1;
};

// ── ФИЛЬТРАЦИЯ (исправленная) ─────────────────────────────────────────────────
/*
  Ранее: фильтр сравнивал a.category_id только с выбранным id.
  Атрибуты привязаны к ПОДКАТЕГОРИЯМ, а пользователь мог выбрать
  РОДИТЕЛЬСКУЮ категорию → результат всегда был пустым.

  Теперь:
  - Если выбрано 'parent:N' → собираем id всех дочерних категорий этого родителя
    и фильтруем по ним.
  - Если выбран конкретный числовой id (подкатегория) → фильтруем только по нему.
*/
const filteredAttributes = computed(() => {
  let res = [...attributes.value];

  if (categoryFilter.value !== 'all') {
    const val = categoryFilter.value;

    if (typeof val === 'string' && val.startsWith('parent:')) {
      // Выбрана родительская категория — берём все её дочерние id
      const parentId = Number(val.replace('parent:', ''));
      const childIds = getChildren(parentId).map(c => c.id);
      res = res.filter(a => childIds.includes(a.category_id));
    } else {
      // Выбрана конкретная подкатегория
      const subId = Number(val);
      if (!isNaN(subId)) {
        res = res.filter(a => a.category_id === subId);
      }
    }
  }

  // Текстовый поиск
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    res = res.filter(a =>
      (a.label && a.label.toLowerCase().includes(q)) ||
      (a.code  && a.code.toLowerCase().includes(q))
    );
  }

  return res.sort((a, b) => a.sort_order - b.sort_order);
});

const totalPages = computed(() =>
  Math.ceil(filteredAttributes.value.length / itemsPerPage)
);
const paginatedAttributes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredAttributes.value.slice(start, start + itemsPerPage);
});

onMounted(loadData);
</script>

<style scoped>
.admin-attributes { padding: 40px 24px; }

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
}
.header-left h1 {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle { color: var(--text-muted); font-size: 0.95rem; }

.stats-badge {
  padding: 10px 20px;
  border-radius: 60px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.95rem;
}

.admin-card { padding: 28px; margin-bottom: 32px; }
.card-title { font-size: 1.35rem; font-weight: 900; margin: 0; }
.card-decoration {
  width: 50px;
  height: 4px;
  background: linear-gradient(90deg, var(--primary), var(--accent));
  border-radius: 4px;
  margin-top: 5px;
}

.input-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.code-font {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  color: var(--primary);
}

.options-zone {
  padding: 20px;
  background: rgba(0,0,0,0.02);
  margin-bottom: 24px;
  border-style: dashed;
}
.options-zone label {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--primary);
  margin-bottom: 10px;
  display: block;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding-top: 20px;
  border-top: 1px dashed var(--border-color);
}
.toggles { display: flex; gap: 30px; }

.create-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none;
  box-shadow: 0 4px 12px rgba(37,99,235,0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.create-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37,99,235,0.4);
}

.filter-section { background: rgba(0,0,0,0.01); border-style: dashed; }
.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: flex-end;
}
.btn-text-link {
  background: none;
  border: none;
  color: var(--primary);
  font-weight: 800;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.9rem;
}

.table-container { margin-top: 20px; }
.admin-table-wrapper { overflow-x: auto; }
.admin-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 1000px;
}
.admin-table th {
  padding: 16px 20px;
  text-align: left;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  border-bottom: 2px solid var(--border-color);
}
.admin-table td {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  vertical-align: middle;
}
.attr-row:hover td { background: rgba(37,99,235,0.02); }

.cat-tag {
  background: rgba(37,99,235,0.1);
  color: var(--primary);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  white-space: nowrap;
}

.inline-edit {
  background: transparent;
  border: 1px solid transparent;
  padding: 6px;
  border-radius: 6px;
  color: var(--text-main);
  width: 100%;
  font-weight: 500;
  transition: 0.2s;
  font-size: inherit;
}
.inline-edit:hover { background: rgba(0,0,0,0.03); border-color: var(--border-color); }
.inline-edit:focus { border-color: var(--primary); background: var(--bg-card); outline: none; }
.inline-edit.mini  { font-size: 0.8rem; color: var(--text-muted); }

.table-select {
  background: transparent;
  border: none;
  font-weight: 800;
  color: var(--accent);
  cursor: pointer;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.custom-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-main);
}
.custom-checkbox input { display: none; }
.checkmark {
  width: 20px;
  height: 20px;
  background: transparent;
  border: 2px solid var(--border-color);
  border-radius: 6px;
  position: relative;
  transition: all 0.2s;
}
:global(.dark) .checkmark { border-color: #475569; }
.custom-checkbox input:checked + .checkmark { background: var(--primary); border-color: var(--primary); }
.custom-checkbox input:checked + .checkmark::after {
  content: '✓';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  color: white;
  font-size: 12px;
  font-weight: bold;
}

.text-center  { text-align: center; }
.text-right   { text-align: right; }
.col-id       { width: 60px; }
.table-meta   { font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }

.pagination-pages { display: flex; gap: 8px; }
.pagination-pages button {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.pagination-pages button:hover   { background: var(--primary-light); border-color: var(--primary); }
.pagination-pages button.active  { background: var(--primary); color: white; border-color: var(--primary); }

@media (max-width: 768px) {
  .header-row      { flex-direction: column; align-items: flex-start; }
  .input-grid      { grid-template-columns: 1fr; }
  .filter-grid     { grid-template-columns: 1fr; }
  .toggles         { flex-direction: column; gap: 10px; }
  .form-footer     { flex-direction: column; align-items: stretch; }
}
</style>