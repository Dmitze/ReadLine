# 🔍 ПОВНИЙ АУДИТ ПРОЄКТУ READLINE - ЗНАЙДЕНІ ПРОБЛЕМИ

**Дата аудиту:** Листопад 2025  
**Проведено:** AI Agent Amp + Oracle (GPT-5)  
**Статус:** ✅ АУДИТ ЗАВЕРШЕНО  
**Знайдено проблем:** 20

---

## 📊 SUMMARY

**Проєкт компілюється успішно**, але виявлено кілька критичних runtime проблем:
- 🔴 **3 CRITICAL** - вимагають негайного виправлення
- 🟠 **7 HIGH** - важливі для стабільності
- 🟡 **7 MEDIUM** - покращують якість
- 🟢 **3 LOW** - опціональні поліпшення

---

## 🔴 КРИТИЧНІ ПРОБЛЕМИ (CRITICAL)

### TASK 1: Settings scene використовує async API як sync + відсутні колонки БД
**Severity:** 🔴 CRITICAL  
**Files:** 
- `src/scenes/settingsScene.ts`
- `src/utils/notifications.ts`
- `src/database/models.ts`

**ПРОБЛЕМА:**
settingsScene викликає `getUserNotificationSettings()` та `setUserNotificationSettings()` БЕЗ `await` і обробляє Promise як звичайний об'єкт.

Також `notifications.ts` читає/пише колонки `notification_frequency`, `notifications_enabled`, `notification_time` які **НЕ ІСНУЮТЬ** в таблиці `users` (визначено в models.ts).

```typescript
// settingsScene.ts - ПОМИЛКА:
const settings = getUserNotificationSettings(userId); // ← Promise!
if (settings.enabled) { ... } // ← КРАХ!

// notifications.ts очікує колонки:
users.notification_frequency  // ← НЕ ІСНУЄ!
users.notifications_enabled   // ← НЕ ІСНУЄ!
users.notification_time       // ← НЕ ІСНУЄ!
```

**ВПЛИВ:**
- ❌ Користувачі не можуть налаштувати сповіщення
- ❌ Runtime помилки при відкритті Settings
- ❌ Scheduler notifications не працює коректно
- ❌ Дані не зберігаються в БД

**РІШЕННЯ:**

**1. Додати колонки в БД (models.ts):**
```sql
-- В initDatabase() після створення users:
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_frequency TEXT DEFAULT 'weekly';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_time TEXT DEFAULT '10:00';
```

**2. Виправити settingsScene.ts:**
```typescript
// БУЛО:
const settings = getUserNotificationSettings(userId);

// СТАЛО:
const settings = await getUserNotificationSettings(userId);

// Всі actions для notifications також потребують await!
```

**3. Перевірити notifications.ts:**
```typescript
// Переконатись що getUserNotificationSettings повертає Promise
// Обробляти null/undefined значення з БД
```

**ТЕСТУВАННЯ:**
- Fresh DB: `/settings` → "Сповіщення" → перевірити відображення
- Toggle налаштувань → перевірити збереження в БД
- Перевірити що scheduler не падає

---

### TASK 2: Подвійна ініціалізація БД
**Severity:** 🔴 CRITICAL  
**Files:** 
- `src/database/models.ts`
- `src/index.ts`

**ПРОБЛЕМА:**
База даних ініціалізується ДВІЧІ:

1. В кінці `models.ts`: `initDatabase();` (автоматично при імпорті модуля)
2. В `index.ts:506`: `await initDatabase();` (явно перед запуском бота)

```typescript
// models.ts (рядок 912):
export const initDatabase = (): Promise<void> => { ... };
initDatabase(); // ← ДУБЛЮВАННЯ!

// index.ts (рядок 506):
await initDatabase(); // ← ДУБЛЮВАННЯ!
```

**ВПЛИВ:**
- ⚠️ Дублювання роботи при старті
- ⚠️ Можливі race conditions при створенні індексів
- ⚠️ Незрозуміла логіка ініціалізації

**РІШЕННЯ:**
```typescript
// models.ts - ВИДАЛИТИ рядок 912:
// initDatabase(); ← ВИДАЛИТИ ЦЕЙ ВИКЛИК!

// Залишити тільки явну ініціалізацію в index.ts
```

**ТЕСТУВАННЯ:**
- Перезапустити бота
- Перевірити що БД ініціалізується один раз
- Перевірити логи - має бути одне повідомлення "Database initialized"

---

### TASK 3: console.* замість logger в багатьох місцях
**Severity:** 🔴 CRITICAL (для моніторингу)  
**Files:** 
- `src/database/recommendationFunctions.ts`
- `src/database/models.ts`
- `src/handlers/adminHandlers.ts`

**ПРОБЛЕМА:**
В проєкті є централізований `logger`, але в деяких місцях все ще використовується `console.error`, `console.warn`, `console.log`.

```typescript
// recommendationFunctions.ts (рядок 18):
console.error('❌ Error getting random book:', err); // ← ПОГАНО!

// models.ts (рядок 260):
console.warn(`Warning: Failed to create ai_selections table`); // ← ПОГАНО!

// adminHandlers.ts:
console.error(...) // ← ПОГАНО!
```

**ВПЛИВ:**
- ❌ Неконсистентне логування
- ❌ Важко дебагити в production
- ❌ Втрачається контекст та structured logging

**РІШЕННЯ:**
```typescript
// Замінити всі console.* на logger.*:

// БУЛО:
console.error('❌ Error getting random book:', err);

// СТАЛО:
logger.error('Error getting random book', err instanceof Error ? err : new Error(String(err)));

// БУЛО:
console.warn(`Warning: Failed to create ai_selections table: ${err.message}`);

// СТАЛО:
logger.warn('Failed to create ai_selections table', { error: err.message });
```

**ТЕСТУВАННЯ:**
- Grep по всьому коду: `grep -r "console\." src/`
- Має бути 0 результатів (окрім logger.ts)

---

## 🟠 ВИСОКИЙ ПРІОРИТЕТ (HIGH)

### TASK 4: Змішаний parse_mode (HTML vs Markdown)
**Severity:** 🟠 HIGH  
**Files:** 
- `src/index.ts`
- `src/handlers/adminHandlers.ts`
- `src/handlers/userHandlers.ts`
- `src/scenes/searchScene.ts`
- `src/scenes/feedbackScene.ts`
- `src/scenes/settingsScene.ts`
- `src/scenes/aiScene.ts`

**ПРОБЛЕМА:**
По всьому коду змішано `parse_mode: 'HTML'` та `parse_mode: 'Markdown'`:
- Повідомлення з `parse_mode: 'HTML'` містять Markdown синтаксис `*текст*`
- Повідомлення з `parse_mode: 'Markdown'` містять HTML теги `<b>текст</b>`

```typescript
// ПРИКЛАД ПОМИЛКИ:
await ctx.reply(
  '🤖 *AI-ПОМІЧНИК АКТИВОВАНО*\n\n' +  // ← Markdown *
  'Я можу допомогти вам з:\n',
  { parse_mode: 'Markdown' }  // ← Правильно
);

// АЛЕ В ІНШОМУ МІСЦІ:
await ctx.reply(
  '📚 <b>Персональна підбірка</b>',  // ← HTML <b>
  { parse_mode: 'Markdown' }  // ← НЕПРАВИЛЬНО!
);
```

**ВПЛИВ:**
- 😕 Поганий UX - текст не форматується
- 😕 Зірочки відображаються як текст
- 😕 HTML теги показуються як текст

**РІШЕННЯ:**

**Вибрати ОДИН стандарт - HTML:**
```typescript
// Замінити всі повідомлення на HTML:

// БУЛО (Markdown):
'*Назва книги*'

// СТАЛО (HTML):
'<b>Назва книги</b>'

// Використовувати parse_mode: 'HTML' СКРІЗЬ
```

**Або використовувати `escapeHtml()` з helpers:**
```typescript
import { escapeHtml } from '../utils/helpers';

const title = escapeHtml(book.title);
await ctx.reply(`<b>${title}</b>`, { parse_mode: 'HTML' });
```

**ТЕСТУВАННЯ:**
- Перевірити /start, /help, Каталог, Профіль, Пошук
- Всі заголовки мають бути жирними
- Немає зірочок або HTML тегів в тексті

---

### TASK 5: Друкарська помилка в caption
**Severity:** 🟠 HIGH (user-facing)  
**Files:** `src/handlers/userHandlers.ts`

**ПРОБЛЕМА:**
В рядку 334 є зайва літера "b" перед статусом книги:

```typescript
// Рядок 334:
const caption = `📖 *${book.title}*
👤 Автор: ${book.author}
🎭 Жанр: ${book.genre}
📖 Опис:  ${book.description}
✅ Статус: b${book.is_available ? 'Доступна' : 'Недоступна'}`; // ← "b" ТУТ!
```

**ВПЛИВ:**
- 😕 Користувачі бачать "✅ Статус: bДоступна"
- 😕 Виглядає непрофесійно

**РІШЕННЯ:**
```typescript
// ВИДАЛИТИ літеру "b":
✅ Статус: ${book.is_available ? 'Доступна' : 'Недоступна'}
```

**ТЕСТУВАННЯ:**
- Вибрати будь-який жанр в каталозі
- Перевірити що статус відображається як "✅ Статус: Доступна"

---

### TASK 6: Відсутні індекси для пошуку по title/author
**Severity:** 🟠 HIGH  
**Files:** `src/database/models.ts`

**ПРОБЛЕМА:**
Функція `searchBooks()` використовує запит:
```sql
SELECT * FROM books 
WHERE LOWER(title) LIKE LOWER(?) 
   OR LOWER(author) LIKE LOWER(?)
   OR LOWER(genre) LIKE LOWER(?)
```

Але **немає індексів** для `title` та `author`, і `LOWER()` **унеможливлює використання індексів**.

**ВПЛИВ:**
- 🐌 Повільний пошук при великому каталозі (>1000 книг)
- 🐌 Full table scan для кожного пошукового запиту
- 🐌 Погіршення продуктивності зі зростанням БД

**РІШЕННЯ:**

**Варіант А (Простий):**
```sql
-- Додати індекси:
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);

-- Прибрати LOWER(...) з обох боків (SQLite LIKE case-insensitive за замовчуванням для ASCII):
SELECT * FROM books 
WHERE title LIKE ? 
   OR author LIKE ?
   OR genre LIKE ?
```

**Варіант Б (Кращий):**
```sql
-- Створити FTS5 virtual table для full-text search:
CREATE VIRTUAL TABLE books_fts USING fts5(title, author, genre, content=books);
```

**РІШЕННЯ (РЕКОМЕНДОВАНЕ):** Варіант А (простіший, достатній для <10k книг)

**ТЕСТУВАННЯ:**
- Додати 1000+ книг
- Виміряти час пошуку до/після
- Очікуваний результат: <100ms для запиту

---

### TASK 7: Відсутність PRAGMA для SQLite
**Severity:** 🟠 HIGH  
**Files:** `src/database/models.ts`

**ПРОБЛЕМА:**
SQLite потребує **явного включення** foreign keys та інших оптимізацій:

```typescript
// models.ts - ВІДСУТНІ PRAGMA:
export const db = new sqlite3.Database(dbPath);
// ← Тут треба PRAGMA!
```

**ВПЛИВ:**
- ❌ Foreign key constraints НЕ працюють (можливі orphan rows)
- ⚠️ SQLITE_BUSY помилки при concurrent writes
- 🐌 Повільніша робота без оптимізацій

**РІШЕННЯ:**
```typescript
// models.ts - ДОДАТИ після створення БД:
export const db = new sqlite3.Database(dbPath);

// Включити foreign keys та оптимізації:
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 3000;
  PRAGMA journal_mode = WAL;
`);

logger.info('SQLite PRAGMA configured', { 
  foreign_keys: 'ON', 
  busy_timeout: 3000,
  journal_mode: 'WAL'
});
```

**Пояснення:**
- `PRAGMA foreign_keys = ON` - включає FK constraints
- `PRAGMA busy_timeout = 3000` - чекає 3с при SQLITE_BUSY
- `PRAGMA journal_mode = WAL` - краща concurrent performance

**ТЕСТУВАННЯ:**
- Спробувати видалити книгу з залежними відгуками → має бути помилка FK
- Перевірити що SQLITE_BUSY не виникає при навантаженні

---

## 🟠 ВИСОКИЙ ПРІОРИТЕТ (HIGH) - продовження

### TASK 8: updateBook може генерувати невалідний SQL
**Severity:** 🟠 HIGH  
**Files:** `src/database/models.ts`

**ПРОБЛЕМА:**
```typescript
// models.ts (рядок 575):
export const updateBook = (
  bookId: number, 
  updates: Partial<Omit<Book, 'id' | 'created_at'>>
): Promise<number> => {
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  
  const query = `UPDATE books SET ${fields} WHERE id = ?`; // ← ЯКЩО updates = {} ???
```

Якщо `updates` порожній об'єкт → SQL: `UPDATE books SET  WHERE id = ?` ❌

**ВПЛИВ:**
- ❌ SQL синтаксична помилка
- ❌ Крах при спробі оновити книгу без змін

**РІШЕННЯ:**
```typescript
export const updateBook = (
  bookId: number, 
  updates: Partial<Omit<Book, 'id' | 'created_at'>>
): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Перевірка на порожні зміни:
    if (Object.keys(updates).length === 0) {
      resolve(0); // Нічого не змінено
      return;
    }
    
    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);
    
    const query = `UPDATE books SET ${fields} WHERE id = ?`;
    
    db.run(query, [...values, bookId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
};
```

**ТЕСТУВАННЯ:**
```typescript
// В тестах:
const result = await updateBook(123, {}); // Має повернути 0
expect(result).toBe(0);
```

---

### TASK 9: Змішане використання require() та import в TypeScript
**Severity:** 🟠 HIGH  
**Files:** 
- `src/index.ts`
- `src/database/tagFunctions.ts`
- `src/keyboards/mainKeyboards.ts`

**ПРОБЛЕМА:**
В TypeScript файлах використовується старий `require()` замість `import`:

```typescript
// index.ts (рядок 402):
const { getRandomBook } = require('./database/recommendationFunctions'); // ← ПОГАНО!

// index.ts (рядок 517):
const { startNotificationScheduler } = require('./utils/notifications'); // ← ПОГАНО!

// tagFunctions.ts:
const { sanitizeInput } = require('../utils/sanitization'); // ← ПОГАНО!

// mainKeyboards.ts:
const { getKeyboardType } = require('../utils/userPreferences'); // ← ПОГАНО!
```

**ВПЛИВ:**
- ❌ Втрата type safety
- ❌ Проблеми з bundling
- ❌ Неконсистентний код

**РІШЕННЯ:**
```typescript
// Замінити на dynamic import:

// БУЛО:
const { getRandomBook } = require('./database/recommendationFunctions');

// СТАЛО:
const { getRandomBook } = await import('./database/recommendationFunctions');

// АБО top-level import:
import { getRandomBook } from './database/recommendationFunctions';
```

**ТЕСТУВАННЯ:**
- Перевірити TypeScript компіляцію
- Перевірити що функції працюють після заміни

---

## 🟡 СЕРЕДНІЙ ПРІОРИТЕТ (MEDIUM)

### TASK 10: favorite_genres - CSV vs JSON inconsistency
**Severity:** 🟡 MEDIUM  
**Files:** 
- `src/utils/notifications.ts`
- `src/database/userFunctions.ts`

**ПРОБЛЕМА:**
**userFunctions** зберігає `favorite_genres` як **JSON array**:
```typescript
// userFunctions.ts:
JSON.stringify(favoriteGenres) // → '["Фантастика","Детектив"]'
```

**notifications.ts** парсить як **CSV string**:
```typescript
// notifications.ts:
const genres = user.favorite_genres?.split(',') || []; // ← НЕПРАВИЛЬНО!
```

**ВПЛИВ:**
- ❌ Неправильний парсинг жанрів
- ❌ Персоналізовані сповіщення не працюють коректно
- ❌ SQL запит з ("[", "]") символами

**РІШЕННЯ:**
```typescript
// notifications.ts - ВИПРАВИТИ:
const genres = user.favorite_genres 
  ? JSON.parse(user.favorite_genres) 
  : [];

// З обробкою помилок:
let genres: string[] = [];
try {
  genres = user.favorite_genres ? JSON.parse(user.favorite_genres) : [];
} catch (error) {
  logger.warn('Failed to parse favorite_genres', { userId: user.user_id, error });
  genres = [];
}
```

**ТЕСТУВАННЯ:**
- Встановити улюблені жанри через онбординг
- Перевірити що сповіщення згадують правильні жанри

---

### TASK 11: AI rate limit глобальний (не per-user)
**Severity:** 🟡 MEDIUM  
**Files:** `src/utils/aiHelper.ts`

**ПРОБЛЕМА:**
Rate limiting для AI запитів **глобальний для всього процесу**, а не для окремих користувачів:

```typescript
// aiHelper.ts (рядок 386):
const aiRequestTimestamps: number[] = []; // ← ГЛОБАЛЬНИЙ МАСИВ!
const AI_RATE_LIMIT = 10; // запитів
const AI_RATE_WINDOW = 60000; // за хвилину

// Один активний користувач може заблокувати AI для всіх!
```

**ВПЛИВ:**
- 😕 Один користувач може вичерпати ліміт для всіх
- 😕 Плутаний UX - користувач не розуміє чому відмова

**РІШЕННЯ:**
```typescript
// Per-user rate limiting:
const aiRequestsByUser = new Map<number, number[]>();

function checkAiRateLimitPerUser(userId: number): boolean {
  const now = Date.now();
  const userTimestamps = aiRequestsByUser.get(userId) || [];
  
  // Очищаємо старі
  const recent = userTimestamps.filter(t => t > now - AI_RATE_WINDOW);
  
  if (recent.length >= AI_RATE_LIMIT) {
    return false;
  }
  
  recent.push(now);
  aiRequestsByUser.set(userId, recent);
  return true;
}

// В askAI додати userId параметр:
export async function askAI(question: string, userId: number): Promise<string> {
  if (!checkAiRateLimitPerUser(userId)) {
    throw new Error('Занадто багато запитів. Спробуйте через хвилину.');
  }
  // ...
}
```

**ТЕСТУВАННЯ:**
- 2 користувачі одночасно роблять AI запити
- Один не має блокувати іншого

---

### TASK 12: Відсутня валідація URL та файлів в addBookScene
**Severity:** 🟡 MEDIUM  
**Files:** 
- `src/scenes/addBookScene.ts`
- `src/utils/fileValidation.ts`
- `src/utils/inputValidation.ts`

**ПРОБЛЕМА:**
При додаванні книги приймаються посилання та файли **без валідації**:
- Немає перевірки формату URL
- Немає перевірки розміру файлу
- Немає перевірки типу файлу

**ВПЛИВ:**
- ❌ Невалідні посилання в каталозі
- ❌ Кнопки не працюють (broken links)
- ⚠️ Можливе завантаження небезпечних файлів

**РІШЕННЯ:**
```typescript
// В addBookScene.ts - додати валідацію:

// Для посилань:
import { isValidUrl } from '../utils/inputValidation';

if (state.bookLink && !isValidUrl(state.bookLink)) {
  await ctx.reply('❌ Невалідний URL. Введіть коректне посилання.');
  return;
}

// Для файлів:
import { validateFileSize, validateFileType } from '../utils/fileValidation';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (Telegram ліміт)
if (fileSize > MAX_FILE_SIZE) {
  await ctx.reply('❌ Файл занадто великий. Максимум 50MB.');
  return;
}
```

**ТЕСТУВАННЯ:**
- Ввести невалідний URL → має бути відхилено
- Завантажити файл >50MB → має бути відхилено

---

### TASK 13: Неконсистентна обробка помилок в recommendationFunctions
**Severity:** 🟡 MEDIUM  
**Files:** `src/database/recommendationFunctions.ts`

**ПРОБЛЕМА:**
Використовується `console.error` та `console.warn` замість `logger`:

```typescript
// recommendationFunctions.ts (рядок 18):
console.error('❌ Error getting random book:', err);

// recommendationFunctions.ts (рядок 28):
console.warn('⚠️ No available books in database');
```

**ВПЛИВ:**
- ❌ Неконсистентні логи
- ❌ Важко дебагити

**РІШЕННЯ:**
```typescript
// Замінити на logger:
logger.error('Error getting random book', err instanceof Error ? err : new Error(String(err)));
logger.warn('No available books in database');
```

**ТЕСТУВАННЯ:**
- Перевірити що логи працюють через logger

---

## 🟡 СЕРЕДНІЙ ПРІОРИТЕТ (MEDIUM) - продовження

### TASK 14: Дублювання логів в index.ts
**Severity:** 🟡 MEDIUM  
**Files:** `src/index.ts`

**ПРОБЛЕМА:**
Дублюються повідомлення логів:

```typescript
// index.ts:
logger.info('Starting bot launch');        // Рядок 497
logger.info('User handlers registered');   // Рядок 498
logger.info('Admin handlers registered');  // Рядок 499

// АЛЕ раніше вже було:
logger.info('User handlers registered');   // Рядок 384 (в userHandlers)
logger.info('Admin handlers registered');  // Рядок 382 (в adminHandlers)
```

**ВПЛИВ:**
- 😕 Шум в логах
- 😕 Плутанина при дебагу

**РІШЕННЯ:**
```typescript
// Видалити дублювання в index.ts (рядки 498-499):
logger.info('Starting bot launch');
// logger.info('User handlers registered');   ← ВИДАЛИТИ
// logger.info('Admin handlers registered');  ← ВИДАЛИТИ
```

**ТЕСТУВАННЯ:**
- Запустити бота
- Перевірити що кожне повідомлення з'являється один раз

---

### TASK 15: Відсутній rate limiting для команд
**Severity:** 🟡 MEDIUM  
**Files:** 
- `src/index.ts`
- `src/middleware/rateLimit.ts`

**ПРОБЛЕМА:**
В `rateLimit.ts` визначено `rateLimitCommand`, але він **НЕ встановлений**:

```typescript
// rateLimit.ts визначає:
export const rateLimitCommand = async (ctx: Context, next: () => Promise<void>) => { ... };

// АЛЕ в index.ts:
bot.use(rateLimitMessage);                    // ← Встановлено
bot.on('callback_query', rateLimitCallback);  // ← Встановлено
// rateLimitCommand ???                       // ← НЕ ВСТАНОВЛЕНО!
```

**ВПЛИВ:**
- ⚠️ Можливий spam команд `/start`, `/help`, `/settings`
- ⚠️ Перевантаження бота

**РІШЕННЯ:**
```typescript
// index.ts - ДОДАТИ:
bot.use(rateLimitMessage);
bot.use(rateLimitCommand);  // ← ДОДАТИ ЦЕЙ РЯДОК!
bot.on('callback_query', rateLimitCallback);
```

**ТЕСТУВАННЯ:**
- Швидко натиснути /start 10 разів
- Має з'явитись повідомлення про rate limit

---

### TASK 16: Застарілі поля в helpers та keyboards
**Severity:** 🟡 MEDIUM  
**Files:** 
- `src/utils/helpers.ts`
- `src/keyboards/mainKeyboards.ts`

**ПРОБЛЕМА:**
Код посилається на legacy поля які **відсутні в поточній схемі БД**:
- `pdf_file_id`
- `file_format`
- `external_link`
- `audio_external_link`
- `narrator`
- `audio_duration`

Доступ через `(book as any).field` → код не падає, але є мертвим вагою.

**ВПЛИВ:**
- 😕 Code rot - незрозумілий код
- 😕 Важче підтримувати

**РІШЕННЯ:**

**Варіант А:** Додати міграцію з цими полями
**Варіант Б:** Видалити посилання на ці поля

**РЕКОМЕНДАЦІЯ:** Варіант Б (спростити)

```typescript
// Перевірити які поля РЕАЛЬНО є в схемі:
// books: title, author, genre, description, photo_file_id, 
//        file_url, audio_file_id, online_link, file_type, file_name

// Використовувати тільки ці поля
```

**ТЕСТУВАННЯ:**
- Перевірити що caption та кнопки відображаються коректно
- Немає undefined полів

---

## 🟢 НИЗЬКИЙ ПРІОРИТЕТ (LOW)

### TASK 17: Scenes typed "as any" в index.ts
**Severity:** 🟢 LOW  
**Files:** `src/index.ts`

**ПРОБЛЕМА:**
```typescript
const stage = new Scenes.Stage([
  addBookScene as any,    // ← any!
  editBookScene as any,   // ← any!
  // ... всі сцени як any
]);
```

**ВПЛИВ:**
- ⚠️ Втрата type safety
- ⚠️ Важче рефакторити

**РІШЕННЯ:**
```typescript
// Типізувати сцени:
const stage = new Scenes.Stage<BotContext>([
  addBookScene,
  editBookScene,
  // ...
]);
```

Можливо потрібно виправити типи в scene files.

**ТЕСТУВАННЯ:**
- TypeScript компіляція без as any

---

### TASK 18: TypeScript Strict Mode вимкнений
**Severity:** 🟢 LOW  
**Files:** `tsconfig.json`

**ПРОБЛЕМА:**
```json
{
  "strict": false,
  "noImplicitAny": false,
  "strictNullChecks": false,
  "strictFunctionTypes": false
}
```

**ВПЛИВ:**
- ⚠️ Можливі runtime помилки через неперевірені типи
- ⚠️ Багато `any` в коді

**РІШЕННЯ:**
**Поступово включати по одному check:**

```json
// Крок 1:
"strictNullChecks": true,

// Крок 2 (через місяць):
"noImplicitAny": true,

// Крок 3:
"strict": true
```

**ТЕСТУВАННЯ:**
- Після кожного кроку - виправити помилки компіляції

---

### TASK 19: Неконсистентне await для ctx.scene?.enter()
**Severity:** 🟢 LOW  
**Files:** Various scenes

**ПРОБЛЕМА:**
В деяких місцях `ctx.scene?.enter()` викликається з `await`, в інших без.

**ВПЛИВ:**
- 😕 Неконсистентний стиль коду

**РІШЕННЯ:**
Стандартизувати - завжди `return ctx.scene?.enter(...)` без await (pattern вже використовується).

---

### TASK 20: WizardState типізація неповна
**Severity:** 🟢 LOW  
**Files:** 
- `src/types/telegraf.ts`
- `src/scenes/addBookScene.ts`
- `src/scenes/aiAssistantScene.ts`

**ПРОБЛЕМА:**
Деякі поля в `ctx.wizard.state` не описані в `WizardState` інтерфейсі:
- `bookFile`
- `bookLink`
- `addingAdditionalFormat`
- `aiInterest`, `aiLength`, `aiMood`

**ВПЛИВ:**
- ⚠️ Зменшена type safety

**РІШЕННЯ:**
Розширити `WizardState` інтерфейс з цими полями (вони вже є, але перевірити повноту).

---

## 📋 ДОДАТКОВІ ВИЯВЛЕНІ ПРОБЛЕМИ

### TASK 21: Відсутні DB constraints для унікальності
**Severity:** 🟢 LOW  
**Files:** `src/database/models.ts`

**ПРОБЛЕМА:**
- Книги можуть дублюватися (немає UNIQUE на title+author)
- Відгуки можуть дублюватися (немає UNIQUE на user_id+book_id)

**РІШЕННЯ:** (опціонально)
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_review ON reviews(user_id, book_id);
```

---

## 🎯 ПРІОРИТИЗАЦІЯ ВИПРАВЛЕНЬ

### 🔥 НЕГАЙНО (CRITICAL):
1. ✅ TASK 1 - Settings/Notifications schema mismatch
2. ✅ TASK 2 - Подвійна ініціалізація БД
3. ✅ TASK 3 - console.* замість logger

### ⚡ ДУЖЕ ВАЖЛИВО (HIGH):
4. ✅ TASK 4 - Parse mode consistency
5. ✅ TASK 5 - Друкарська помилка (typo "b")
6. ✅ TASK 6 - Індекси для пошуку
7. ✅ TASK 7 - SQLite PRAGMA
8. ✅ TASK 8 - updateBook empty updates
9. ✅ TASK 9 - require() → import

### 📊 ВАЖЛИВО (MEDIUM):
10. ✅ TASK 10 - favorite_genres parsing
11. ✅ TASK 11 - AI rate limit per-user
12. ✅ TASK 12 - URL/file validation
13. ✅ TASK 13 - recommendationFunctions logging
14. ✅ TASK 14 - Дублювання логів
15. ✅ TASK 15 - Rate limiting команд

### 💡 ОПЦІОНАЛЬНО (LOW):
16. TASK 17 - Scene types
17. TASK 18 - TypeScript Strict Mode
18. TASK 19 - ctx.scene?.enter() consistency
19. TASK 20 - WizardState типізація
20. TASK 21 - DB constraints

---

## 📈 СТАТИСТИКА АУДИТУ

**Проаналізовано файлів:** 50+  
**Знайдено проблем:** 20  
**Критичних:** 3  
**Високий пріоритет:** 6  
**Середній пріоритет:** 8  
**Низький пріоритет:** 3

**Розподіл за типами:**
- Баги та помилки: 8
- Проблеми продуктивності: 3
- Проблеми безпеки: 2
- Якість коду: 7

---

## ✅ ПЛАН ВИПРАВЛЕНЬ

### Фаза 1: Критичні виправлення (1-2 дні)
```bash
1. Додати колонки notifications в БД
2. Виправити settingsScene (await)
3. Видалити подвійну ініціалізацію
4. Замінити console.* на logger.*
```

### Фаза 2: Високий пріоритет (2-3 дні)
```bash
5. Нормалізувати parse_mode на HTML
6. Виправити typo "b"
7. Додати індекси для пошуку
8. Налаштувати SQLite PRAGMA
9. Додати guard в updateBook
10. Замінити require() на import
```

### Фаза 3: Середній пріоритет (3-5 днів)
```bash
11-15. Виправлення MEDIUM проблем
```

### Фаза 4: Опціональні поліпшення (за бажанням)
```bash
16-20. Виправлення LOW проблем
```

---

## 🎯 ВИСНОВОК

Проєкт в **ДОБРОМУ СТАНІ**, але потребує виправлення **3 критичних помилок** для стабільної роботи:

1. 🔴 Settings/Notifications не працюють (schema mismatch)
2. 🔴 Подвійна ініціалізація БД
3. 🔴 Неконсистентне логування

Після виправлення критичних - проєкт буде готовий до production! 🚀

---

**Створив:** AI Agent Amp + Oracle  
**Дата:** Листопад 2025  
**Версія:** 1.0
