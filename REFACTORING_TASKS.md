# 🔧 ПЛАН РЕФАКТОРИНГУ ТА ВИПРАВЛЕННЯ ПОМИЛОК ReadLine

**Дата створення:** 15 листопада 2025  
**Статус проекту:** 7/10 (хороший, потребує покращень)  
**Тести:** 134/134 ✅ (100% pass rate)

---

## 📊 ЗАГАЛЬНА СТАТИСТИКА

- **TypeScript файлів:** 115
- **Строк коду:** ~15,000+
- **Використання `any`:** 59 випадків ⚠️
- **Direct process.env:** 30+ місць ⚠️
- **SQL запитів без validation:** 50+ ⚠️
- **console.log:** 12 файлів ⚠️
- **TODO/FIXME:** 0 ✅

---

## 🎯 ПРІОРИТИЗАЦІЯ ЗАВДАНЬ

### 🔴 Критичний пріоритет (1-2 дні)
Ці проблеми можуть призвести до security issues або runtime помилок.

### 🟡 Високий пріоритет (1 тиждень)
Важливі для стабільності та підтримки коду.

### 🟢 Середній пріоритет (2-4 тижні)
Покращують якість коду та developer experience.

### ⚪ Низький пріоритет (1-2 місяці)
Nice to have, не критичні.

---

## 🔴 КРИТИЧНИЙ ПРІОРИТЕТ

### ✅ Завдання 1: Виправлення memory leaks в тестах
**Статус:** ✅ ВИКОНАНО  
**Пріоритет:** 🔴 КРИТИЧНИЙ  
**Час витрачено:** 0.5 години  
**Дата завершення:** 16.11.2025

**Проблема:**
```
A worker process has failed to exit gracefully and has been force exited.
This is likely caused by tests leaking due to improper teardown.
```

**Локація:**
- `src/__tests__/integration/queue.test.ts`
- `src/__tests__/integration/database.test.ts`

**Кроки виправлення:**
- [x] 1.1. Додати `--detectOpenHandles` в jest.config.js ✅
- [x] 1.2. Перевірити всі afterAll/afterEach хуки ✅
- [x] 1.3. Додати закриття БД connections в afterAll ✅
- [x] 1.4. Додати `.unref()` для всіх timers ✅
- [x] 1.5. Перевірити закриття Redis connections ✅
- [x] 1.6. Запустити тести знову з `--detectOpenHandles` ✅

**Приклад виправлення:**
```typescript
// src/__tests__/integration/database.test.ts
afterAll(async () => {
  await db.close(); // Додати
  jest.clearAllTimers(); // Додати
});
```

---

### ✅ Завдання 2: Централізована валідація environment variables
**Статус:** ✅ ВИКОНАНО  
**Пріоритет:** 🔴 КРИТИЧНИЙ  
**Час витрачено:** 1 година  
**Дата завершення:** 16.11.2025

**Проблема:**
Прямий доступ до `process.env` в 30+ місцях може призвести до runtime помилок.

**Локація:**
- `src/utils/aiHelper.ts:259`
- `src/queue/Jobs.ts:73-74`
- `src/api/RestAPI.ts`
- Множинні інші файли

**Кроки виправлення:**
- [x] 2.1. Встановити `zod` для валідації ✅
- [x] 2.2. Створити схему валідації в `src/config/envSchema.ts` ✅
- [x] 2.3. Додати валідацію при старті в `src/index.ts` ✅
- [x] 2.4. Оновити `AppConfig` для використання validated env ✅
- [x] 2.5. Build успішний без помилок ✅
- [ ] 2.6. Оновити `.env.example` з описом всіх змінних (TODO later)

**Приклад виправлення:**
```bash
npm install zod
```

```typescript
// src/config/envSchema.ts
import { z } from 'zod';

export const envSchema = z.object({
  BOT_TOKEN: z.string().min(20),
  ADMIN_ID: z.string().regex(/^\d+$/),
  GEMINI_API_KEY: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).default('6379').transform(Number),
});

export type Env = z.infer<typeof envSchema>;
```

```typescript
// src/index.ts (додати на початку)
import { envSchema } from './config/envSchema';
const env = envSchema.parse(process.env);
```

---

### ✅ Завдання 3: Замінити всі `any` на proper types
**Статус:** ⏳ В ПРОЦЕСІ (40% виконано)
**Пріоритет:** 🔴 КРИТИЧНИЙ  
**Час витрачено:** 2 години  
**Залишилось:** ~6 годин

**Проблема:**
59 випадків використання `any` призводять до втрати type safety.

**Критичні місця:**
```typescript
// src/index.ts:166 - Stage registration
const stage = new Scenes.Stage([
  addBookScene as any,  // ❌ (Залишено - Telegraf issue)
  editBookScene as any, // ❌ (Залишено - Telegraf issue)
]);

// src/config/AppConfig.ts:94
provider: (env.AI_PROVIDER as any) || 'openai'  // ✅ ВИПРАВЛЕНО

// src/database/catalogFunctions.ts
db.get(countQuery, params, (err, countRow: any) => {  // ✅ ВИПРАВЛЕНО
```

**Кроки виправлення:**
- [x] 3.1. Створити proper types для SQL параметрів (SQLParameter, SQLParameters) ✅
- [x] 3.2. Типізувати БД responses (CountRow, Tag interface) ✅  
- [x] 3.3. Замінити `any[]` на `SQLParameters` в dbWrapper ✅
- [x] 3.4. Виправити BaseRepository та OptimizedRepository ✅
- [x] 3.5. Build успішний ✅
- [x] 3.6. Тести проходять (135 passing) ✅
- [ ] 3.7. Виправити решту `any` типів в utils (TODO)
- [ ] 3.8. Виправити `any` в validation та middleware (TODO)

**Приклад виправлення:**
```typescript
// src/types/telegraf.ts
import { Scenes } from 'telegraf';

export type AppScene = Scenes.BaseScene<AppContext>;

// src/index.ts
const stage = new Scenes.Stage<AppContext>([
  addBookScene,
  editBookScene,
] as AppScene[]); // ✅ Type-safe
```

```typescript
// src/database/types.ts
export interface CountRow {
  count: number;
}

// src/database/catalogFunctions.ts
db.get(countQuery, params, (err, countRow: CountRow) => { // ✅
```

---

### ✅ Завдання 4: SQL Injection захист
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🔴 КРИТИЧНИЙ  
**Часу потрібно:** 6 годин  
**Складність:** Висока

**Проблема:**
Використання db.run/db.all без підготовлених statements у 50+ місцях.

**Локація:**
- `src/database/catalogFunctions.ts:55`
- `src/database/promoCodeFunctions.ts:38`
- `src/database/userFunctions.ts`
- `src/database/tagFunctions.ts`

**Кроки виправлення:**
- [ ] 4.1. Аудит всіх SQL запитів
- [ ] 4.2. Замінити прямі запити на SafeQueryExecutor
- [ ] 4.3. Додати валідацію всіх параметрів через InputSanitizer
- [ ] 4.4. Створити SQL injection тести
- [ ] 4.5. Запустити SQL injection scanner (sqlmap або інше)
- [ ] 4.6. Документувати безпечні практики

**Приклад виправлення:**
```typescript
// ❌ НЕБЕЗПЕЧНО
db.run(`SELECT * FROM books WHERE title = '${title}'`);

// ✅ БЕЗПЕЧНО
const safeExecutor = new SafeQueryExecutor(db);
await safeExecutor.executeQuery(
  'SELECT * FROM books WHERE title = ?',
  [InputSanitizer.sanitizeForDb(title)]
);
```

---

## 🟡 ВИСОКИЙ ПРІОРИТЕТ

### ✅ Завдання 5: Виправити error handling (порожні catch блоки)
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟡 ВИСОКИЙ  
**Часу потрібно:** 4 години  
**Складність:** Середня

**Проблема:**
Порожні catch блоки та ігнорування помилок ускладнюють debugging.

**Локація:**
- `src/scenes/aiScene.ts:77`
- `src/scenes/addBookScene.ts:1018`
- `src/scenes/onboardingScene.ts:214`
- Множинні інші місця

**Кроки виправлення:**
- [ ] 5.1. Знайти всі `.catch(() => {})` через grep
- [ ] 5.2. Додати логування для кожного catch
- [ ] 5.3. Використовувати Result<T> pattern де потрібно
- [ ] 5.4. Додати error boundaries
- [ ] 5.5. Створити централізований error handler
- [ ] 5.6. Оновити документацію з error handling practices

**Приклад виправлення:**
```typescript
// ❌ ПОГАНО
await ctx.deleteMessage(thinkingMsg.message_id).catch(() => {});

// ✅ ДОБРЕ
await ctx.deleteMessage(thinkingMsg.message_id).catch((error) => {
  logger.warn('Failed to delete message', { 
    error, 
    messageId: thinkingMsg.message_id 
  });
});
```

---

### ✅ Завдання 6: Додати proper transaction handling
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟡 ВИСОКИЙ  
**Часу потрібно:** 5 годин  
**Складність:** Висока

**Проблема:**
Відсутність proper transaction handling може призвести до race conditions.

**Локація:**
- `src/database/dbWrapper.ts:79`
- `src/database/models.ts`

**Кроки виправлення:**
- [ ] 6.1. Аудит всіх місць де потрібні транзакції
- [ ] 6.2. Виправити async handling в dbWrapper.transaction
- [ ] 6.3. Додати proper locking mechanisms
- [ ] 6.4. Створити helper методи для common transactions
- [ ] 6.5. Додати тести для concurrent операцій
- [ ] 6.6. Документувати transaction patterns

**Приклад виправлення:**
```typescript
// src/database/dbWrapper.ts
async transaction<T>(callback: () => Promise<T>): Promise<T> {
  await this.run('BEGIN TRANSACTION');
  try {
    const result = await callback();
    await this.run('COMMIT');
    return result;
  } catch (error) {
    await this.run('ROLLBACK');
    throw error;
  }
}
```

---

### ✅ Завдання 7: Замінити всі console.* на logger
**Статус:** ✅ ВИКОНАНО  
**Пріоритет:** 🟡 ВИСОКИЙ  
**Час витрачено:** 0.5 години  
**Дата завершення:** 16.11.2025

**Проблема:**
console.log в продакшн коді виглядає непрофесійно.

**Локація:**
- `scripts/migrate.ts:17`
- `src/api/RestAPI.ts:6`
- `src/queue/Queue.ts:4`
- `src/queue/Jobs.ts:6`
- `src/utils/aiHelper.ts:1`
- Ще 7 файлів

**Кроки виправлення:**
- [x] 7.1. Знайти всі console.* через grep ✅
- [x] 7.2. Замінити на logger.debug/info/warn/error ✅
- [x] 7.3. Додати proper context для кожного log ✅
- [x] 7.4. Перевірити log levels ✅
- [x] 7.5. Запустити тести ✅ (135 passing)
- [ ] 7.6. Додати ESLint rule для заборони console.* (TODO later)

**Grep команда:**
```bash
grep -r "console\." src/ --include="*.ts"
```

**Приклад виправлення:**
```typescript
// ❌ ПОГАНО
console.log('User logged in:', userId);

// ✅ ДОБРЕ
logger.info('User logged in', { userId });
```

**ESLint rule:**
```json
// .eslintrc.json
{
  "rules": {
    "no-console": "error"
  }
}
```

---

### ✅ Завдання 8: Використання ServiceContainer всюди
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟡 ВИСОКИЙ  
**Часу потрібно:** 6 годин  
**Складність:** Середня

**Проблема:**
ServiceContainer реалізований, але використовується тільки в RestAPI.

**Кроки виправлення:**
- [ ] 8.1. Зареєструвати всі сервіси в ServiceContainer
- [ ] 8.2. Зареєструвати всі репозиторії
- [ ] 8.3. Оновити handlers для використання DI
- [ ] 8.4. Оновити scenes для використання DI
- [ ] 8.5. Видалити прямі imports сервісів
- [ ] 8.6. Додати тести для DI
- [ ] 8.7. Документувати DI patterns

**Приклад виправлення:**
```typescript
// src/index.ts - Реєстрація сервісів
const container = ServiceContainer.getInstance();

// Repositories
container.registerSingleton('BookRepository', () => new BookRepository(db));
container.registerSingleton('UserRepository', () => new UserRepository(db));

// Services
container.registerSingleton('BookService', () => 
  new BookService(
    container.resolve('BookRepository'),
    container.resolve('ReviewRepository')
  )
);

// src/handlers/userHandlers.ts - Використання DI
const bookService = container.resolve<BookService>('BookService');
const books = await bookService.getTopRated(10);
```

---

## 🟢 СЕРЕДНІЙ ПРІОРИТЕТ

### ✅ Завдання 9: Рефакторинг великих файлів
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟢 СЕРЕДНІЙ  
**Часу потрібно:** 12 годин  
**Складність:** Висока

**Проблема:**
Великі файли важко підтримувати і тестувати.

**Файли:**
- `src/index.ts` - 548 рядків (рекомендовано <300)
- `src/scenes/addBookScene.ts` - 1000+ рядків
- `src/database/models.ts` - 1240+ рядків
- `src/handlers/userHandlers.ts` - 1258 рядків
- `src/handlers/adminHandlers.ts` - 805 рядків

**Кроки виправлення:**
- [ ] 9.1. Розбити `models.ts` на окремі файли по таблицям
  - [ ] 9.1.1. Створити `src/database/tables/books.ts`
  - [ ] 9.1.2. Створити `src/database/tables/users.ts`
  - [ ] 9.1.3. Створити `src/database/tables/reviews.ts`
  - [ ] 9.1.4. І так далі для всіх таблиць
  - [ ] 9.1.5. Оновити imports
- [ ] 9.2. Розбити `userHandlers.ts` на модулі
  - [ ] 9.2.1. `handlers/user/catalog.ts`
  - [ ] 9.2.2. `handlers/user/library.ts`
  - [ ] 9.2.3. `handlers/user/profile.ts`
  - [ ] 9.2.4. `handlers/user/ai.ts`
  - [ ] 9.2.5. Створити index.ts для експорту
- [ ] 9.3. Розбити `addBookScene.ts` на кроки
  - [ ] 9.3.1. `scenes/addBook/steps/title.ts`
  - [ ] 9.3.2. `scenes/addBook/steps/genre.ts`
  - [ ] 9.3.3. І так далі для кожного кроку
- [ ] 9.4. Запустити тести після кожного рефакторингу
- [ ] 9.5. Оновити документацію

**Структура після рефакторингу:**
```
src/
├── database/
│   └── tables/
│       ├── books.ts (200 рядків)
│       ├── users.ts (150 рядків)
│       ├── reviews.ts (100 рядків)
│       └── ... інші таблиці
├── handlers/
│   ├── user/
│   │   ├── index.ts
│   │   ├── catalog.ts (250 рядків)
│   │   ├── library.ts (200 рядків)
│   │   ├── profile.ts (150 рядків)
│   │   └── ai.ts (200 рядків)
│   └── admin/
│       ├── index.ts
│       ├── books.ts (300 рядків)
│       ├── reviews.ts (200 рядків)
│       └── stats.ts (150 рядків)
```

---

### ✅ Завдання 10: Додати міграції БД з rollback
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟢 СЕРЕДНІЙ  
**Часу потрібно:** 8 годин  
**Складність:** Висока

**Проблема:**
Відсутність rollback для деяких міграцій та proper версійний контроль.

**Локація:**
- `src/database/migrations.ts:209`
- `src/database/MigrationManager.ts`

**Кроки виправлення:**
- [ ] 10.1. Аудит всіх міграцій
- [ ] 10.2. Додати rollback для кожної міграції
- [ ] 10.3. Створити backup перед кожною міграцією
- [ ] 10.4. Додати версійний контроль схеми
- [ ] 10.5. Створити CLI для міграцій (up/down/status)
- [ ] 10.6. Додати тести для міграцій
- [ ] 10.7. Документувати процес міграцій

**Приклад виправлення:**
```typescript
// src/database/migrations.ts
export const migrations: Migration[] = [
  {
    version: 1,
    name: 'add_language_code_to_users',
    up: async (db: DatabaseWrapper) => {
      await db.run('ALTER TABLE users ADD COLUMN language_code TEXT DEFAULT "uk"');
    },
    down: async (db: DatabaseWrapper) => {
      // Rollback
      await db.run('ALTER TABLE users DROP COLUMN language_code');
    }
  },
];

// CLI
npm run migrate:up     # Застосувати всі міграції
npm run migrate:down   # Відкотити останню міграцію
npm run migrate:status # Перевірити статус міграцій
```

---

### ✅ Завдання 11: Створити константи для magic numbers
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟢 СЕРЕДНІЙ  
**Часу потрібно:** 3 години  
**Складність:** Низька

**Проблема:**
Magic numbers розкидані по коду (20, 3000, 5000 мс).

**Локація:**
- `src/index.ts:40-47`
- Multiple timeout values
- Pagination limits
- Rate limiting values

**Кроки виправлення:**
- [ ] 11.1. Створити `src/constants/timeouts.ts`
- [ ] 11.2. Створити `src/constants/limits.ts`
- [ ] 11.3. Створити `src/constants/validation.ts`
- [ ] 11.4. Замінити всі magic numbers на константи
- [ ] 11.5. Експортувати з `src/constants/index.ts`
- [ ] 11.6. Оновити AppConfig для використання констант

**Приклад виправлення:**
```typescript
// src/constants/timeouts.ts
export const TIMEOUTS = {
  MESSAGE_DELETE: 3000,
  AI_REQUEST: 30000,
  DATABASE_QUERY: 5000,
  CACHE_TTL: 300000,
} as const;

// src/constants/limits.ts
export const LIMITS = {
  BOOKS_PER_PAGE: 5,
  SAVED_BOOKS_MAX: 20,
  REVIEW_MAX_LENGTH: 500,
  BOT_TOKEN_MIN_LENGTH: 20,
} as const;

// Використання
if (process.env.BOT_TOKEN.length < LIMITS.BOT_TOKEN_MIN_LENGTH) {
  throw new Error('Invalid BOT_TOKEN');
}
```

---

### ✅ Завдання 12: Покращити test coverage до 90%+
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** 🟢 СЕРЕДНІЙ  
**Часу потрібно:** 16 годин  
**Складність:** Висока

**Проблема:**
Поточне покриття 70.21%, потрібно 90%+.

**Некриті модулі:**
- handlers (0% coverage)
- scenes (0% coverage)
- api/RestAPI (0% coverage)
- Деякі утиліти

**Кроки виправлення:**
- [ ] 12.1. Додати тести для userHandlers
  - [ ] 12.1.1. Catalog handlers
  - [ ] 12.1.2. Library handlers
  - [ ] 12.1.3. Profile handlers
  - [ ] 12.1.4. AI handlers
- [ ] 12.2. Додати тести для adminHandlers
  - [ ] 12.2.1. Book management
  - [ ] 12.2.2. Review moderation
  - [ ] 12.2.3. Stats
- [ ] 12.3. Додати тести для scenes
  - [ ] 12.3.1. addBookScene
  - [ ] 12.3.2. editBookScene
  - [ ] 12.3.3. searchScene
  - [ ] 12.3.4. Інші сцени
- [ ] 12.4. Додати тести для RestAPI
- [ ] 12.5. Досягти 90%+ coverage
- [ ] 12.6. Налаштувати CI для перевірки coverage

**Приклад тесту:**
```typescript
// src/__tests__/handlers/userHandlers.test.ts
describe('userHandlers', () => {
  describe('handleCatalog', () => {
    it('should show catalog menu', async () => {
      const ctx = createMockContext();
      await handleCatalog(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Каталог'),
        expect.any(Object)
      );
    });
  });
});
```

---

## ⚪ НИЗЬКИЙ ПРІОРИТЕТ

### ✅ Завдання 13: Додати JSDoc коментарі
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** ⚪ НИЗЬКИЙ  
**Часу потрібно:** 12 годин  
**Складність:** Низька

**Проблема:**
Відсутність документації для публічних методів.

**Кроки виправлення:**
- [ ] 13.1. Додати JSDoc для всіх public методів сервісів
- [ ] 13.2. Додати JSDoc для всіх public методів репозиторіїв
- [ ] 13.3. Додати JSDoc для всіх утиліт
- [ ] 13.4. Додати приклади використання
- [ ] 13.5. Генерувати API документацію (TypeDoc)
- [ ] 13.6. Додати в CI перевірку JSDoc

**Приклад:**
```typescript
/**
 * Отримує топ-N книг за рейтингом
 * 
 * @param limit - Кількість книг для повернення (default: 10)
 * @returns Promise з Result об'єктом, що містить масив книг
 * 
 * @example
 * ```typescript
 * const result = await bookService.getTopRated(5);
 * if (result.isOk()) {
 *   const books = result.value;
 *   console.log(books);
 * }
 * ```
 */
async getTopRated(limit: number = 10): Promise<Result<Book[], Error>> {
  // ...
}
```

---

### ✅ Завдання 14: Непослідовне іменування
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** ⚪ НИЗЬКИЙ  
**Часу потрібно:** 6 годин  
**Складність:** Середня

**Проблема:**
Деякі функції camelCase, інші snake_case.

**Кроки виправлення:**
- [ ] 14.1. Аудит всіх function names
- [ ] 14.2. Вибрати єдиний стиль (camelCase рекомендується)
- [ ] 14.3. Rename functions
- [ ] 14.4. Оновити всі imports
- [ ] 14.5. Запустити тести
- [ ] 14.6. Додати ESLint rule для naming conventions

**ESLint rule:**
```json
{
  "rules": {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        "selector": "function",
        "format": ["camelCase"]
      }
    ]
  }
}
```

---

### ✅ Завдання 15: Додати GraphQL API
**Статус:** ❌ НЕ ВИКОНАНО  
**Пріоритет:** ⚪ НИЗЬКИЙ  
**Часу потрібно:** 24 години  
**Складність:** Дуже висока

**Проблема:**
REST API є, але GraphQL буде більш гнучким.

**Кроки виправлення:**
- [ ] 15.1. Встановити Apollo Server
- [ ] 15.2. Створити GraphQL schema
- [ ] 15.3. Створити resolvers
- [ ] 15.4. Додати authentication
- [ ] 15.5. Додати rate limiting
- [ ] 15.6. Створити GraphQL playground
- [ ] 15.7. Написати документацію
- [ ] 15.8. Додати тести

**Приклад:**
```bash
npm install apollo-server-express graphql
```

```typescript
// src/api/graphql/schema.ts
const typeDefs = gql`
  type Book {
    id: ID!
    title: String!
    author: String!
    rating: Float
  }

  type Query {
    books(limit: Int, offset: Int): [Book!]!
    book(id: ID!): Book
  }
`;
```

---

## 📊 ПРОГРЕС ВИКОНАННЯ

### Загальний прогрес: 3.5/15 (23%)

| Завдання | Пріоритет | Статус | Прогрес |
|----------|-----------|--------|---------|
| 1. Memory leaks в тестах | 🔴 | ✅ | 6/6 |
| 2. Environment validation | 🔴 | ✅ | 5/6 |
| 3. Замінити `any` на types | 🔴 | ⏳ | 6/8 (75%)|
| 4. SQL Injection захист | 🔴 | ❌ | 0/6 |
| 5. Error handling | 🟡 | ❌ | 0/6 |
| 6. Transaction handling | 🟡 | ❌ | 0/6 |
| 7. Замінити console.* | 🟡 | ✅ | 5/6 |
| 8. ServiceContainer всюди | 🟡 | ❌ | 0/7 |
| 9. Рефакторинг файлів | 🟢 | ❌ | 0/5 |
| 10. Міграції з rollback | 🟢 | ❌ | 0/7 |
| 11. Константи для numbers | 🟢 | ❌ | 0/6 |
| 12. Test coverage 90%+ | 🟢 | ❌ | 0/6 |
| 13. JSDoc коментарі | ⚪ | ❌ | 0/6 |
| 14. Naming conventions | ⚪ | ❌ | 0/6 |
| 15. GraphQL API | ⚪ | ❌ | 0/8 |

---

## 🎯 РЕКОМЕНДОВАНИЙ ПОРЯДОК ВИКОНАННЯ

### Тиждень 1 (40 годин)
1. ✅ Завдання 2: Environment validation (3 год)
2. ✅ Завдання 1: Memory leaks (2 год)
3. ✅ Завдання 7: Замінити console.* (2 год)
4. ✅ Завдання 4: SQL Injection (6 год)
5. ✅ Завдання 3: Замінити `any` (8 год)
6. ✅ Завдання 5: Error handling (4 год)
7. ✅ Завдання 11: Константи (3 год)
8. ✅ Завдання 6: Transactions (5 год)
9. Тестування та фікси (7 год)

### Тиждень 2 (40 годин)
10. ✅ Завдання 8: ServiceContainer (6 год)
11. ✅ Завдання 9: Рефакторинг файлів (12 год)
12. ✅ Завдання 10: Міграції (8 год)
13. ✅ Завдання 12: Test coverage (16 год) - початок

### Тиждень 3-4 (80 годин)
14. ✅ Завдання 12: Test coverage (продовження)
15. ✅ Завдання 13: JSDoc
16. ✅ Завдання 14: Naming conventions
17. ✅ Завдання 15: GraphQL API (опціонально)

---

## 📝 ФОРМАТ ОНОВЛЕННЯ ПРОГРЕСУ

Коли завершуєте підзадачу, оновіть статус:

```markdown
- [x] 2.1. Встановити `zod` для валідації ✅
- [x] 2.2. Створити схему валідації ✅
- [ ] 2.3. Додати валідацію при старті
```

Коли завершуєте всю задачу:

```markdown
### ✅ Завдання 2: Централізована валідація environment variables
**Статус:** ✅ ВИКОНАНО  
**Час витрачено:** 2.5 години  
**Дата завершення:** 16.11.2025
```

---

## 🚀 КОМАНДИ ДЛЯ ПЕРЕВІРКИ

Після кожного завдання запускайте:

```bash
# Компіляція TypeScript
npm run build

# Запуск всіх тестів
npm test

# Перевірка coverage
npm run test:coverage

# Linting
npm run lint

# Форматування
npm run format:check
```

---

## 📞 ПОТРІБНА ДОПОМОГА?

Якщо застрягли на якомусь завданні:
1. Перечитайте приклади виправлення
2. Перегляньте існуючий код для patterns
3. Запитайте в GitHub Issue
4. Зверніться до команди розробки

---

**Створено:** GitHub Copilot CLI  
**Версія:** 1.0  
**Останнє оновлення:** 15.11.2025 21:41 UTC
