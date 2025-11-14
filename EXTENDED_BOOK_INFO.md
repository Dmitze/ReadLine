# Розширена інформація про книги

## Огляд

Модуль реалізує детальну інформацію про книги, включаючи:
- Розподіл рейтингів (кількість та відсоток оцінок 1-5 зірок)
- Кількість читачів сервісу (користувачів, які зберегли книгу)
- Популярні цитати з рецензій
- Рекомендована вікова група
- Тригери вмісту (попередження про насильство, 18+, тощо)

## Архітектура

### Структура бази даних

#### Таблиця `books` (розширення)
```sql
ALTER TABLE books ADD COLUMN recommended_age INTEGER DEFAULT 0;
ALTER TABLE books ADD COLUMN content_warnings TEXT;
```

Поля:
- `recommended_age` (INTEGER): Рекомендована вікова група
  - 0 = всім (за замовчуванням)
  - 6 = 6+
  - 12 = 12+
  - 16 = 16+
  - 18 = 18+
- `content_warnings` (TEXT): JSON масив тригерів вмісту
  - Приклад: `["violence", "explicit_content", "mature_themes"]`

#### Таблиця `book_rating_stats` (кешування)
```sql
CREATE TABLE IF NOT EXISTS book_rating_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL UNIQUE,
  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  readers_count INTEGER DEFAULT 0,
  popular_quotes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

## API Endpoints

### GET /api/books/:id/details

Отримати детальну інформацію про книгу з розподілом рейтингів.

**Параметри:**
- `id` (path parameter, required): ID книги

**Приклад запиту:**
```bash
curl http://localhost:3000/api/books/1/details
```

**Приклад успішної відповіді (200):**
```json
{
  "success": true,
  "data": {
    "book": {
      "id": 1,
      "title": "Гра престолів",
      "author": "Джордж Мартін",
      "genre": "Фантастика,Драма",
      "description": "Епічна історія про боротьбу за трон...",
      "rating": 4.5,
      "reviews_count": 150,
      "downloads_count": 500,
      "recommended_age": 16,
      "content_warnings": ["violence", "mature_themes", "explicit_content"],
      "created_at": "2025-01-10T12:00:00Z"
    },
    "rating_distribution": {
      "counts": {
        "rating_1": 5,
        "rating_2": 8,
        "rating_3": 20,
        "rating_4": 60,
        "rating_5": 57,
        "total_reviews": 150
      },
      "percentages": {
        "rating_1_percent": 3.3,
        "rating_2_percent": 5.3,
        "rating_3_percent": 13.3,
        "rating_4_percent": 40,
        "rating_5_percent": 38
      }
    },
    "readers_count": 350,
    "popular_quotes": [
      "Неймовірна книга! Не можна оторватися від сторінок",
      "Мастерство розповіді на найвищому рівні",
      "Найкращий фентезі, що я коли-либо читав",
      "Глибокі персонажі та складні сюжетні розвороти"
    ],
    "content_warnings": ["violence", "mature_themes", "explicit_content"]
  }
}
```

**Приклад помилки (404):**
```json
{
  "success": false,
  "error": "Book with id 999 not found"
}
```

### PUT /api/books/:id/extended-info

Оновити розширену інформацію про книгу (рекомендована вікова група та тригери вмісту).

**Параметри:**
- `id` (path parameter, required): ID книги

**Тіло запиту:**
```json
{
  "recommended_age": 14,
  "content_warnings": ["violence", "mild_language"]
}
```

**Приклад запиту:**
```bash
curl -X PUT http://localhost:3000/api/books/1/extended-info \
  -H "Content-Type: application/json" \
  -d '{
    "recommended_age": 14,
    "content_warnings": ["violence", "mild_language"]
  }'
```

**Приклад успішної відповіді (200):**
```json
{
  "success": true,
  "message": "Book extended information updated successfully"
}
```

**Приклад помилки (400):**
```json
{
  "success": false,
  "error": "Book with id 999 not found"
}
```

## Функції в BookService

### getDetailedBookInfo(bookId: number)

Отримати детальну інформацію про книгу.

```typescript
const bookService = await serviceContainer.getBookService();
const result = await bookService.getDetailedBookInfo(1);

if (result.isOk()) {
  console.log(result.value); // Детальна інформація про книгу
} else {
  console.error(result.error);
}
```

### updateBookExtendedInfo(bookId, recommendedAge?, contentWarnings?)

Оновити розширену інформацію про книгу.

```typescript
const bookService = await serviceContainer.getBookService();
const result = await bookService.updateBookExtendedInfo(
  1,
  12, // рекомендована вікова група
  ["violence", "strong_language"] // тригери вмісту
);

if (result.isOk()) {
  console.log('Інформація оновлена успішно');
} else {
  console.error(result.error);
}
```

## Функції в database/models.ts

### getBookDetailedStats(bookId: number)

Отримати детальну статистику книги (розподіл рейтингів, читачі, цитати).

```typescript
import { getBookDetailedStats } from './database/models';

const stats = await getBookDetailedStats(1);
console.log(stats);
/*
{
  book: { ... },
  rating_distribution: { ... },
  readers_count: 350,
  popular_quotes: [ ... ],
  recommended_age: 16,
  content_warnings: [ ... ]
}
*/
```

### updateBookInfo(bookId, recommendedAge?, contentWarnings?)

Оновити розширену інформацію про книгу.

```typescript
import { updateBookInfo } from './database/models';

const changes = await updateBookInfo(1, 12, ["violence"]);
console.log(changes); // Кількість оновлених рядків
```

## Приклади використання

### Приклад 1: Отримання детальної інформації

```typescript
async function displayBookDetails(bookId: number) {
  const result = await bookService.getDetailedBookInfo(bookId);
  
  if (result.isErr()) {
    console.log('Книга не знайдена');
    return;
  }
  
  const { book, rating_distribution, readers_count, popular_quotes } = result.value;
  
  console.log(`📚 ${book.title} - ${book.author}`);
  console.log(`⭐ Рейтинг: ${book.rating}/5 (${book.reviews_count} рецензій)`);
  console.log(`👥 Читачів: ${readers_count}`);
  console.log(`🔞 Рекомендована вікова група: ${book.recommended_age}+`);
  
  console.log(`\n📊 Розподіл рейтингів:`);
  console.log(`  5⭐ ${rating_distribution.percentages.rating_5_percent}%`);
  console.log(`  4⭐ ${rating_distribution.percentages.rating_4_percent}%`);
  console.log(`  3⭐ ${rating_distribution.percentages.rating_3_percent}%`);
  console.log(`  2⭐ ${rating_distribution.percentages.rating_2_percent}%`);
  console.log(`  1⭐ ${rating_distribution.percentages.rating_1_percent}%`);
  
  if (popular_quotes.length > 0) {
    console.log(`\n💬 Популярні цитати:`);
    popular_quotes.forEach((quote, i) => {
      console.log(`  ${i + 1}. "${quote}"`);
    });
  }
  
  if (book.content_warnings && book.content_warnings.length > 0) {
    console.log(`\n⚠️  Тригери вмісту:`, book.content_warnings.join(', '));
  }
}
```

### Приклад 2: Оновлення інформації про книгу

```typescript
async function setBookAgeRestriction(bookId: number) {
  const result = await bookService.updateBookExtendedInfo(
    bookId,
    18, // Рекомендовано для дорослих
    ["violence", "explicit_content", "sexual_scenes"]
  );
  
  if (result.isErr()) {
    console.error('Помилка при оновленні:', result.error.message);
    return;
  }
  
  console.log('✅ Інформація про книгу успішно оновлена');
}
```

### Приклад 3: Визначення порубки за віком

```typescript
function getAgeRating(recommendedAge: number): string {
  const ratings = {
    0: '✅ Для всіх',
    6: '🟢 6+',
    12: '🟡 12+',
    16: '🟠 16+',
    18: '🔴 18+'
  };
  
  return ratings[recommendedAge as keyof typeof ratings] || 'Невідомо';
}
```

## Міграція бази даних

Міграція автоматично створює всі необхідні таблиці та поля при запуску.

Версія: `007_20251115_add_extended_book_info`

Щоб вручну запустити міграцію:

```typescript
import { MigrationRunner } from './database/Migration';
import { allMigrations } from './database/migrations';
import { db } from './database/models';

const runner = new MigrationRunner(db);
allMigrations.forEach(m => runner.register(m));
await runner.runPending();
```

## Типи даних

### BookRatingStats

```typescript
interface BookRatingStats {
  id?: number;
  book_id: number;
  rating_1_count: number;  // Кількість оцінок 1⭐
  rating_2_count: number;  // Кількість оцінок 2⭐
  rating_3_count: number;  // Кількість оцінок 3⭐
  rating_4_count: number;  // Кількість оцінок 4⭐
  rating_5_count: number;  // Кількість оцінок 5⭐
  readers_count: number;   // Кількість читачів, які зберегли книгу
  popular_quotes?: string; // JSON масив популярних цитат
  updated_at?: string;     // Час останнього оновлення
}
```

### Розширені поля Book

```typescript
interface Book {
  // ... інші поля ...
  recommended_age?: number;      // 0, 6, 12, 16, 18
  content_warnings?: string;     // JSON масив тригерів вмісту
}
```

## Тригери вмісту (Content Warnings)

Рекомендовані значення для `content_warnings`:

- `violence` - Насильство
- `explicit_content` - Експліцитний контент
- `sexual_scenes` - Сексуальні сцени
- `mature_themes` - Дорослі теми
- `strong_language` - Грубе мовлення
- `psychological_horror` - Психологічний жах
- `substance_abuse` - Зловживання речовинами
- `child_abuse` - Насильство над дітьми
- `discrimination` - Дискримінація
- `self_harm` - Самозалік

## Тестування

### Тест 1: Отримання інформації про книгу

```bash
# Отримати інформацію про книгу ID 1
curl http://localhost:3000/api/books/1/details
```

### Тест 2: Оновлення інформації

```bash
# Оновити інформацію про книгу
curl -X PUT http://localhost:3000/api/books/1/extended-info \
  -H "Content-Type: application/json" \
  -d '{
    "recommended_age": 16,
    "content_warnings": ["violence", "mature_themes"]
  }'
```

### Тест 3: Помилка при неіснуючій книзі

```bash
# Отримати інформацію про неіснуючу книгу
curl http://localhost:3000/api/books/99999/details
# Повинна повернути 404 з повідомленням про помилку
```

## Перформанс

- Функція `getBookDetailedStats()` кешує результати в таблиці `book_rating_stats`
- Використовуються індекси для швидкого доступу до даних
- Популярні цитати обмежені до 5 цитат для оптимізації

## TODO (Майбутній розвиток)

- [ ] Додати автоматичне оновлення кешу статистики
- [ ] Реалізувати можливість фільтрації за віком та тригерами
- [ ] Додати рекомендації на основі вікової групи
- [ ] Реалізувати поділення тригерів на рівні серйозності
- [ ] Додати локалізацію тригерів для різних мов
