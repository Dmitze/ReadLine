# Онбординг Flow - Де використовуються дані

## 📊 Схема використання даних онбордингу

```
┌─────────────────────────────────────────────────────────────────┐
│               ONBOARDING SCENE (Нові користувачі)               │
│  Збирає: favorite_genres[] + content_types[]                    │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  │                               │
          ┌───────▼────────┐           ┌─────────▼──────┐
          │ Зберігання DB  │           │  Кешування    │
          │  users table   │           │  (CACHE_KEYS) │
          └───────┬────────┘           └────────────────┘
                  │
        ┌─────────▼──────────┐
        │ favorite_genres    │
        │ (JSON: string)     │
        └──────────┬─────────┘
                   │
        ┌──────────┴────────────────────────────┐
        │                                       │
        │      ВИКОРИСТОВУЄТЬСЯ В:              │
        │                                       │
        ├─ 📚 КАТАЛОГ (каталог.ts)            ├─ 🤖 AI РЕКОМЕНДАЦІЇ     
        ├─ 🏆 ТОП КНИГИ                       ├─ 👤 ПРОФІЛЬ КОРИСТУВАЧА
        ├─ 🔍 ПОШУК З ФІЛЬТРАМИ               ├─ 📊 СТАТИСТИКА
        └─ 🎙️ ПОДКАСТИ ФІЛЬТР                 └─ ⚙️ НАЛАШТУВАННЯ
```

---

## 🔗 Детальне використання в кожній функції

### 1️⃣ **КАТАЛОГ БІБЛІОТЕКИ** (`src/handlers/user/catalog.ts`)

**Файл:** `src/database/catalogFunctions.ts::getBooksWithFilters()`

```typescript
// Користувач натискає "📖 Каталог"
// ↓
// Система показує рекомендовані книги з favorite_genres:

const { getRecommendedBooks } = require('../database/recommendationFunctions');
const recommendedBooks = await getRecommendedBooks(userId);
// ↓ Повертає книги, що містять улюблені жанри:
// - Якщо обрав "Фантастика, Детектив" → показує саме ці книги
// - Сортує за рейтингом, популярністю, новизною
```

---

### 2️⃣ **РЕКОМЕНДАЦІЙНА СИСТЕМА** (`src/utils/aiRecommendations.ts`)

**Функція:** `getPersonalizedRecommendations(userId)`

```typescript
// Використовує favorite_genres для AI рекомендацій:
const favoriteGenres = await getUserFavoriteGenres(userId);
// ↓
const aiPrompt = `Рекомендуй книги для користувача з жанрами: ${favoriteGenres.join(', ')}`;
// ↓
// AI (Google Gemini) генерує персональні рекомендації
```

**Файл:** `src/database/recommendationFunctions.ts::getSmartRecommendations()`

Комбінує:
- **40%** - Поведінкові рекомендації (на основі улюблених жанрів)
- **30%** - Колаборативна фільтрація (схожі користувачі)
- **30%** - Контекстуальні (час доби, новинки)

---

### 3️⃣ **ПРОФІЛЬ КОРИСТУВАЧА** (`src/scenes/profileScene.ts`)

**Де показуються favorite_genres:**

```typescript
// src/services/UserManagementService.ts::getUserProfile()
↓
// Показує в профілі:
"👤 ТВІЙ ПРОФІЛЬ
⚔️ Улюблені жанри: Фантастика, Детектив, Історія
📚 Прочитано книг: 15
⭐ Середній рейтинг: 4.5
🏆 Рівень: Воїн-читець"
```

---

### 4️⃣ **ПОШУК З ФІЛЬТРАМИ** (`src/scenes/searchScene.ts`)

**Функція:** `getBooksWithFilters()`

```typescript
// Користувач вибирає "🔍 Пошук"
// ↓
// Система пропонує швидкий фільтр по favorite_genres:

const filters = {
  genres: userFavoriteGenres, // ← Із онбордингу!
  rating: 4.0,
  audioAvailable: contentTypes.includes('audio'),
  limit: 10
};

const books = await getBooksWithFilters(filters);
```

---

### 5️⃣ **AI ПОМІЧНИК** (`src/scenes/aiAssistantScene.ts`)

**4-кроковий процес:**

```
КРОК 1: Інтерес → Запитує про жанр
  (Может запропонувати вже обрані улюблені)
  
  "Який жанр тебе цікавить?"
  [Автоматично пропонує: Фантастика, Детектив...]
  
КРОК 2: Формат → Запитує тип контенту
  (Використовує обраний у онбордингу!)
  
  "Хочеш читати чи слухати?"
  [Книга, Аудіокнига, Подкаст - по пропозиціям]

КРОК 3: Настрій → Уточнює
  "Який у тебе настрій?"
  [Розслаблюючий, напружений, пригодницький...]

КРОК 4: Рекомендації
  ↓
  AI генерує список книг з фильтрами:
  - Жанр: як обрав + інтерес
  - Формат: як обрав (книга/аудіо/подкаст)
  - Настрій: від КРОК 3
```

---

### 6️⃣ **ТОП КНИГИ** (`src/handlers/user/topBooks.ts`)

```typescript
// Користувач натискає "🏆 Топ книги"
// ↓
// Система фільтрує по улюблених жанрах:

const topBooks = await getHighRatedBooks({
  genres: userFavoriteGenres, // ← Із онбордингу!
  minRating: 4.5,
  limit: 10
});
```

---

### 7️⃣ **НОВИНКИ** (`src/handlers/user/novelties.ts`)

```typescript
// Користувач натискає "🆕 Новинки"
// ↓
// Показує нові книги із улюблених жанрів:

const newBooks = await getNewestBooksWithPagination({
  genres: userFavoriteGenres, // ← Із онбордингу!
  limit: 10,
  offset: 0
});
```

---

### 8️⃣ **ПОДКАСТИ** (`src/handlers/user/podcasts.ts`)

```typescript
// Користувач натискає "🎙️ Подкасти"
// ↓
// Фільтрує подкасти за обраними типами контенту:

const podcasts = await getPodcastsByFilters({
  contentType: userContentTypes.includes('podcasts'),
  genres: userFavoriteGenres, // ← Можливо теж!
  limit: 10
});
```

---

### 9️⃣ **УВЕДОМЛЕННЯ** (`src/utils/notifications.ts`)

```typescript
// Щоденні сповіщення про нові книги:
// "📬 Нова книга в твоїх жанрах! Прочитати?"

for (const user of users) {
  const favoriteGenres = await getUserFavoriteGenres(user.id);
  const newBooks = await getNewestBooks({
    genres: favoriteGenres, // ← Із онбордингу!
    createdAfter: yesterday,
    limit: 1
  });
  
  if (newBooks.length > 0) {
    sendNotification(user.id, 
      `📬 Нова книга в жанрі ${newBooks[0].genre}!`);
  }
}
```

---

## 📋 Таблиця БД: Де зберігаються дані

### Таблиця `users`

| Колона | Тип | Значення | Де використовується |
|--------|-----|---------|-------------------|
| `id` | INTEGER | 1 | Всюди |
| `telegram_id` | INTEGER | 906087418 | ID користувача |
| `username` | TEXT | @dmitz | Профіль |
| `first_name` | TEXT | Дмитро | Привітання |
| `favorite_genres` | TEXT (JSON) | `["Фантастика","Детектив"]` | 📚 Каталог, 🔍 Пошук, 🤖 AI, 🏆 Топ |
| `preferences` | TEXT (JSON) | `{"keyboard":"mobile"}` | ⚙️ Налаштування |
| `is_completed_onboarding` | BOOLEAN | 1 | Показати онбординг чи ні |
| `created_at` | DATETIME | 2025-11-24... | Статистика |

### Приклад JSON:

```json
{
  "favorite_genres": ["Фантастика", "Детектив", "Історія"],
  "content_types": ["books", "audio", "podcasts"],
  "keyboard_type": "mobile",
  "notifications_enabled": true
}
```

---

## 🔄 Flow діаграма: Від онбордингу до рекомендацій

```
┌──────────────────────┐
│  КОРИСТУВАЧ         │
│  (новий)            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────────────────┐
│  ONBOARDING SCENE               │
│  1. Вибір форматів              │
│  2. Вибір жанрів                │
│  3. Фіналізація                 │
└──────────┬───────────────────────┘
           │
           ▼ markOnboardingComplete()
┌──────────────────────────────────┐
│  БД: users table                 │
│  favorite_genres JSON            │
│  content_types JSON              │
└──────────┬───────────────────────┘
           │
     ┌─────┴──────────────────┐
     │                        │
     ▼ (при кожному запиту)  ▼ (кешується)
 
┌────────────────────┐    ┌──────────────────┐
│ getRecommended     │    │ CACHE_KEYS.      │
│ Books()            │    │ USER_PREFERENCES │
│                    │    │ (TTL: 1 час)     │
│ Повертає книги     │    │                  │
│ із улюблених       │    │ Швидкий доступ  │
│ жанрів             │    │ без запиту БД    │
└────────┬───────────┘    └──────────────────┘
         │
    ┌────┴────────────────────┐
    │                         │
    ▼ Показує в:            ▼ Використовує в:
    
📚 Каталог             🤖 AI рекомендації
🏆 Топ Книги           👤 Профіль
🔍 Пошук               📊 Статистика
🎙️ Подкасти           📬 Уведомлення
🆕 Новинки             ⚙️ Налаштування
```

---

## 💾 SQL запити для отримання даних

### Отримати favorite_genres:

```sql
SELECT favorite_genres FROM users WHERE telegram_id = 906087418;
-- Повертає: '["Фантастика","Детектив","Історія"]'
```

### Книги із улюблених жанрів:

```sql
SELECT * FROM books 
WHERE genre IN ('Фантастика', 'Детектив', 'Історія')
ORDER BY rating DESC
LIMIT 10;
```

### Рекомендації для користувача:

```sql
-- Комбінована рекомендація (40% поведінка, 30% колаб, 30% контекст)
SELECT b.* FROM books b
JOIN (
  -- 40%: Книги з улюблених жанрів з високим рейтингом
  SELECT id, rating * 0.4 as score FROM books 
  WHERE genre IN (SELECT favorite_genres FROM users WHERE id = ?)
) behavior ON b.id = behavior.id
ORDER BY score DESC
LIMIT 10;
```

---

## ⚡ Як все работает при запиту "📖 Каталог"

```
1. Користувач натискає кнопку "📖 Каталог"
   │
   ├─→ handlers/user/catalog.ts::handleCatalogCommand()
   │
   ├─→ Отримати userId з контексту
   │
   ├─→ getRecommendedBooks(userId)
   │   └─→ getUserFavoriteGenres(userId)
   │       └─→ SELECT favorite_genres FROM users...
   │       └─→ Повертає: ["Фантастика", "Детектив"]
   │
   ├─→ getBooksWithFilters({
   │     genres: ["Фантастика", "Детектив"],
   │     rating: 4.0,
   │     limit: 10
   │   })
   │   └─→ SELECT * FROM books WHERE genre IN (...)
   │       ORDER BY rating DESC...
   │
   ├─→ Форматизувати результати у повідомлення
   │
   └─→ Показати кнопки для кожної книги:
       [📥 Завант.] [⭐ Оцін.] [❤️ Зберег.]
```

---

## 🎯 Итог

**Дані онбордингу (`favorite_genres` + `content_types`) використовуються в 9+ місцях по всій системі:**

| Функція | Використання | Файл |
|---------|-------------|------|
| 📚 Каталог | Фільтр за жанром | catalogFunctions.ts |
| 🤖 AI Помічник | Підказка в першому кроці | aiAssistantScene.ts |
| 🏆 Топ Книги | Фільтр рейтингу за жанром | topBooks.ts |
| 🔍 Пошук | Швидкий фільтр | searchScene.ts |
| 🎙️ Подкасти | Фільтр контенту | podcasts.ts |
| 🆕 Новинки | Нові книги в жанрах | novelties.ts |
| 👤 Профіль | Показ в профілі | profileScene.ts |
| 📬 Уведомлення | Цільові сповіщення | notifications.ts |
| 📊 Статистика | Аналіз смаку | statistics.ts |

**Все пов'язано! Один вибір в онбордингу впливає на ВСЮ систему рекомендацій! 🎯**
