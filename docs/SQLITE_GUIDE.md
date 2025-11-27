# Документація по SQLite

Практичний гайд для роботи з SQLite базою даних через командний рядок

---

## Основні Команди

### Підключення до БД
```bash
sqlite3 database/library.db
```

Потім можете вводити SQL команди. Для виходу введіть `.quit` або `.exit`

---

### Інтерактивний Режим

```bash
# Підключитися до БД
sqlite3 database/library.db

# Всередині sqlite3:
sqlite> SELECT * FROM users;
sqlite> .quit
```

### Цілком Команда

```bash
# Виконати одну команду і вийти
sqlite3 database/library.db "SELECT COUNT(*) FROM users;"

# Виконати декілька команд
sqlite3 database/library.db "SELECT COUNT(*) FROM books; SELECT COUNT(*) FROM users;"
```

---

## Інформація про Базу Даних

### Список Таблиць
```bash
sqlite3 database/library.db ".tables"
```

**Результат:**
```
audio_chapters books book_formats book_orders promo_codes reviews 
saved_books tags users user_favorite_genres
```

---

### Структура Таблиці
```bash
# Побачити всі колони таблиці з типами
sqlite3 database/library.db "PRAGMA table_info(users);"
```

**Результат:**
```
0|id|INTEGER|0||1
1|user_id|INTEGER|1||0
2|first_name|TEXT|0||0
3|last_name|TEXT|0||0
4|username|TEXT|0||0
5|created_at|DATETIME|0|CURRENT_TIMESTAMP|0
```

---

### Інформація про Всі Таблиці
```bash
sqlite3 database/library.db "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## Перегляд Даних

### Кількість Записів у Таблиці
```bash
sqlite3 database/library.db "SELECT COUNT(*) FROM users;"
```

### Всі Записи Таблиці
```bash
sqlite3 database/library.db "SELECT * FROM users;"
```

### З Форматуванням
```bash
sqlite3 database/library.db -header -column "SELECT * FROM users LIMIT 5;"
```

---

### Конкретні Колони
```bash
sqlite3 database/library.db "SELECT user_id, first_name, username FROM users;"
```

---

### З Умовою
```bash
# Користувачі зUsername
sqlite3 database/library.db "SELECT * FROM users WHERE username IS NOT NULL;"

# Користувачі, створені після дати
sqlite3 database/library.db "SELECT * FROM users WHERE created_at > '2025-01-01';"

# Конкретний користувач
sqlite3 database/library.db "SELECT * FROM users WHERE user_id = 123456;"
```

---

## Модифікація Даних

### Додання Запису
```bash
sqlite3 database/library.db "INSERT INTO tags (name) VALUES ('нова мітка');"
```

### Оновлення Запису
```bash
# Оновити одного користувача
sqlite3 database/library.db "UPDATE users SET first_name = 'Іван' WHERE user_id = 123456;"

# Оновити багато записів
sqlite3 database/library.db "UPDATE users SET has_completed_onboarding = 1 WHERE created_at < '2025-01-01';"
```

### Видалення Запису
```bash
# Видалити одного користувача
sqlite3 database/library.db "DELETE FROM users WHERE user_id = 123456;"

# Видалити всі неактивні записи
sqlite3 database/library.db "DELETE FROM promo_codes WHERE is_active = 0;"

# Видалити ВСЕ записи в таблиці
sqlite3 database/library.db "DELETE FROM promo_codes;"
```

---

## SQL Запити

### Сортування
```bash
# За іменем
sqlite3 database/library.db "SELECT * FROM users ORDER BY first_name ASC;"

# По даті (новіші спочатку)
sqlite3 database/library.db "SELECT * FROM books ORDER BY created_at DESC LIMIT 10;"
```

---

### Ліміт
```bash
# Перші 5 записів
sqlite3 database/library.db "SELECT * FROM users LIMIT 5;"

# Записи від 10 до 20
sqlite3 database/library.db "SELECT * FROM users LIMIT 10 OFFSET 10;"
```

---

### Агрегаційні Функції
```bash
# Кількість всіх користувачів
sqlite3 database/library.db "SELECT COUNT(*) as total FROM users;"

# Кількість активних користувачів
sqlite3 database/library.db "SELECT COUNT(*) FROM users WHERE has_completed_onboarding = 1;"

# Мінімум, максимум, середнє
sqlite3 database/library.db "SELECT MIN(id), MAX(id), AVG(id) FROM books;"
```

---

### Об'єднання Таблиць (JOIN)
```bash
# Користувачі та їхні збережені книги
sqlite3 database/library.db "
  SELECT u.first_name, b.title 
  FROM users u 
  LEFT JOIN saved_books sb ON u.id = sb.user_id 
  LEFT JOIN books b ON sb.book_id = b.id 
  LIMIT 10;
"
```

---

### Групування
```bash
# Кількість книг по жанрам
sqlite3 database/library.db "
  SELECT promo_type, COUNT(*) as count 
  FROM promo_codes 
  GROUP BY promo_type;
"
```

---

## Резервне Копіювання

### Експорт БД в Файл
```bash
# Простий backup
sqlite3 database/library.db ".backup backups/library_backup.db"

# Або просто скопіювати файл
cp database/library.db backups/library_$(date +%Y%m%d_%H%M%S).db
```

---

### Експорт в CSV
```bash
sqlite3 -header -csv database/library.db "SELECT * FROM users;" > users.csv
```

---

### Експорт в JSON
```bash
sqlite3 -json database/library.db "SELECT * FROM users;" > users.json
```

---

### Експорт SQL Скрипту
```bash
sqlite3 database/library.db ".dump" > backup.sql
```

---

## Оптимізація Бази Даних

### Перевірка Цілісності
```bash
sqlite3 database/library.db "PRAGMA integrity_check;"
```

**Результат:** `ok` або список помилок

---

### Аналіз Таблиці
```bash
sqlite3 database/library.db "ANALYZE;"
```

---

### Вакуум (Очищення, Оптимізація)
```bash
sqlite3 database/library.db "VACUUM;"
```

---

### Розмір БД
```bash
ls -lh database/library.db
```

---

### Статистика БД
```bash
sqlite3 database/library.db "
  SELECT 
    name,
    COUNT(*) as records
  FROM sqlite_master 
  WHERE type='table' 
  GROUP BY name;
"
```

---

## Індекси

### Список Індексів
```bash
sqlite3 database/library.db "SELECT name FROM sqlite_master WHERE type='index';"
```

---

### Створити Індекс
```bash
sqlite3 database/library.db "CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);"
```

---

### Видалити Індекс
```bash
sqlite3 database/library.db "DROP INDEX idx_users_user_id;"
```

---

## Параметри SQLite

### Режим Виведення

```bash
# Стовпцями з заголовками
sqlite3 -header -column database/library.db "SELECT * FROM users LIMIT 3;"

# JSON формат
sqlite3 -json database/library.db "SELECT * FROM users LIMIT 3;"

# CSV формат
sqlite3 -csv database/library.db "SELECT * FROM users LIMIT 3;"

# Список
sqlite3 -list database/library.db "SELECT * FROM users LIMIT 3;"
```

---

### Встановити Роздільник Полів
```bash
sqlite3 -separator ";" database/library.db "SELECT * FROM users;"
```

---

### Інформаційні Команди

```bash
sqlite3 database/library.db
sqlite> .help              # Список всіх команд
sqlite> .tables            # Список таблиць
sqlite> .schema            # Вся схема БД
sqlite> .schema users      # Схема таблиці users
sqlite> .databases         # Список баз даних
sqlite> .mode              # Поточний режим
sqlite> .separator         # Роздільник
```

---

## Практичні Приклади

### Очистити Все в Таблиці
```bash
sqlite3 database/library.db "DELETE FROM promo_codes; VACUUM;"
```

---

### Видалити Записи Старші за Дату
```bash
sqlite3 database/library.db "DELETE FROM reviews WHERE created_at < '2024-01-01';"
```

---

### Перевести ВСІХ Користувачів у Статус "Завершено Онбординг"
```bash
sqlite3 database/library.db "UPDATE users SET has_completed_onboarding = 1;"
```

---

### Отримати Всіх Адмінів
```bash
# Потрібно знати роль адміна в БД
sqlite3 database/library.db "SELECT * FROM users WHERE role = 'admin';"
```

---

### Найпопулярніші Книги
```bash
sqlite3 database/library.db "
  SELECT b.id, b.title, COUNT(sb.id) as saves
  FROM books b
  LEFT JOIN saved_books sb ON b.id = sb.book_id
  GROUP BY b.id
  ORDER BY saves DESC
  LIMIT 10;
"
```

---

### Статистика Користувачів
```bash
sqlite3 database/library.db "
  SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN has_completed_onboarding = 1 THEN 1 ELSE 0 END) as completed_onboarding,
    SUM(CASE WHEN has_completed_onboarding = 0 THEN 1 ELSE 0 END) as pending_onboarding
  FROM users;
"
```

---

## На Облаці (Сервері)

### SSH + SQLite Команда
```bash
ssh root@69.169.108.180 "cd /opt/ReadLine && sqlite3 database/library.db 'SELECT COUNT(*) FROM users;'"
```

---

### Скопіювати БД з Облака
```bash
scp root@69.169.108.180:/opt/ReadLine/database/library.db ./database/library_backup.db
```

---

### Завантажити БД на Облако
```bash
scp ./database/library.db root@69.169.108.180:/opt/ReadLine/database/
```

---

## Швидкі Команди для Бота

### Кількість Користувачів
```bash
sqlite3 database/library.db "SELECT COUNT(*) FROM users;"
```

---

### Кількість Книг
```bash
sqlite3 database/library.db "SELECT COUNT(*) FROM books;"
```

---

### Остатній Користувач
```bash
sqlite3 database/library.db "SELECT * FROM users ORDER BY created_at DESC LIMIT 1;"
```

---

### Активні Користувачі (сьогодні)
```bash
sqlite3 database/library.db "
  SELECT COUNT(*) FROM users 
  WHERE last_active_at > date('now');
"
```

---

### Видалити Тестового Користувача
```bash
sqlite3 database/library.db "DELETE FROM users WHERE username = 'testuser';"
```

---

## Видалення Книг

### Сніт: Отримати ID Книги
```bash
# Пошук книги по назві
sqlite3 -header -column database/library.db "SELECT id, title, author FROM books WHERE title LIKE '%назва%';"

# Всі книги (лімітовано)
sqlite3 -header -column database/library.db "SELECT id, title, author FROM books LIMIT 20;"
```

---

### Простий Спосіб - Видалити Книгу по ID
```bash
# Видалити книгу з ID = 5
sqlite3 database/library.db "DELETE FROM books WHERE id = 5;"

# Видалити книгу по назві
sqlite3 database/library.db "DELETE FROM books WHERE title = 'Точна назва книги';"
```

---

### Безпечніший Спосіб - Перевірити Спочатку
```bash
# 1. Знайти книгу
sqlite3 -header -column database/library.db "SELECT id, title, author, created_at FROM books WHERE id = 5;"

# 2. Перевірити статистику
sqlite3 -header -column database/library.db "
  SELECT 
    'Отзиви' as type, COUNT(*) as count FROM reviews WHERE book_id = 5
  UNION ALL
  SELECT 'Сохранено', COUNT(*) FROM saved_books WHERE book_id = 5
  UNION ALL
  SELECT 'Тераги', COUNT(*) FROM book_tags WHERE book_id = 5
  UNION ALL
  SELECT 'Замовлення', COUNT(*) FROM book_orders WHERE book_id = 5;
"

# 3. Видалити книгу
sqlite3 database/library.db "DELETE FROM books WHERE id = 5;"
```

---

### Що Автоматично Видалиться

Коли ви видаляєте книгу, **автоматично видалятися**:
- ✅ Теги (book_tags)
- ✅ Замовлення фізичних книг (book_orders)
- ✅ Аудіокниги (audio_books)
- ✅ Прогрес слухання (listening_progress)
- ✅ Запити на книги (book_requests)

**Залишаться** (потребують ручного видалення):
- ⚠️ Відзиви (reviews)
- ⚠️ Збережені книги (saved_books)
- ⚠️ Статистика рейтингу (book_rating_stats)
- ⚠️ Прогрес слухання користувача (audio_progress)

---

### Повне Видалення (Включно з Відзивами)
```bash
# Видалити книгу та всі пов'язані дані
BOOK_ID=5

# 1. Видалити відзиви
sqlite3 database/library.db "DELETE FROM reviews WHERE book_id = $BOOK_ID;"

# 2. Видалити збережені ссилки
sqlite3 database/library.db "DELETE FROM saved_books WHERE book_id = $BOOK_ID;"

# 3. Видалити статистику
sqlite3 database/library.db "DELETE FROM book_rating_stats WHERE book_id = $BOOK_ID;"
sqlite3 database/library.db "DELETE FROM audio_progress WHERE book_id = $BOOK_ID;"

# 4. Видалити саму книгу (це видалить теги, замовлення, аудіокниги)
sqlite3 database/library.db "DELETE FROM books WHERE id = $BOOK_ID;"
```

---

### На Облаці (Сервері)

```bash
# Підключитись на сервер
ssh root@69.169.108.180

# Знайти книгу
cd /opt/ReadLine
sqlite3 database/library.db "SELECT id, title FROM books WHERE title LIKE '%назва%';"

# Видалити книгу (ID замініть на реальний)
sqlite3 database/library.db "DELETE FROM books WHERE id = 5;"

# Перезагрузити бота
pm2 restart telegram-bot
pm2 logs telegram-bot --lines 10
```

---

### Одна Команда для Видалення
```bash
# Видалити з ноутбука на облако напряму
ssh root@69.169.108.180 "cd /opt/ReadLine && sqlite3 database/library.db 'DELETE FROM books WHERE id = 5;' && pm2 restart telegram-bot"
```

---

## Поради та Трюки

### ✅ Добре
- Завжди робіть backup перед видаленням
- Використовуйте LIMIT при великих таблицях
- Перевіряйте цілісність БД регулярно
- Оптимізуйте БД один раз на місяць

### ❌ Погано
- Не запускайте `DELETE` без умови на production
- Не видаляйте БД вручну - використовуйте скрипти
- Не редагуйте БД з двох місць одночасно
- Не забувайте робити VACUUM після видалення

---

## Помилки та Розв'язання

### Помилка: "database is locked"
```bash
# База даних заблокована
# Рішення: зупиніть бота та спробуйте знову
pm2 stop telegram-bot
sleep 5
sqlite3 database/library.db "VACUUM;"
pm2 start telegram-bot
```

---

### Помилка: "syntax error"
```bash
# Перевірте SQL синтаксис
# Примітка: текстові значення в одинарних лапках 'значення'
```

---

### Помилка: "no such table"
```bash
# Таблиця не існує
sqlite3 database/library.db ".tables"  # Перевірте назву
```

---

### Помилка: "no such column"
```bash
# Колона не існує
sqlite3 database/library.db "PRAGMA table_info(таблиця);" # Перевірте колони
```

---

## Корисні Посилання

- [SQLite Docs](https://www.sqlite.org/docs.html)
- [SQL Tutorial](https://www.w3schools.com/sql/)

---

## Команди Для Швидкої Довідки

```bash
# Інформація
sqlite3 db.db ".tables"                    # Список таблиць
sqlite3 db.db "PRAGMA table_info(table);"  # Структура таблиці
sqlite3 db.db "SELECT COUNT(*) FROM t;"   # Кількість записів

# Перегляд
sqlite3 -header -column db.db "SELECT * FROM t LIMIT 5;"
sqlite3 -json db.db "SELECT * FROM t;"

# Модифікація
sqlite3 db.db "INSERT INTO t (col) VALUES ('val');"
sqlite3 db.db "UPDATE t SET col = 'val' WHERE id = 1;"
sqlite3 db.db "DELETE FROM t WHERE id = 1;"

# Резервне копіювання
sqlite3 db.db ".backup backup.db"
cp db.db db_backup.db

# Оптимізація
sqlite3 db.db "PRAGMA integrity_check;"
sqlite3 db.db "VACUUM;"
sqlite3 db.db "ANALYZE;"
```

---

**Останнє оновлення:** 2025-11-27
