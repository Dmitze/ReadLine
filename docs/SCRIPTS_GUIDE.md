# Документація по Скриптам

Повний опис всіх скриптів в папці `scripts/`

---

## Таблиця Скриптів

| Скрипт | Тип | Мета |
|--------|-----|------|
| add-audio-tables.js | Міграція | Додання системи аудіокниг |
| add-book-orders-table.js | Міграція | Додання системи замовлення фізичних книг |
| add-has-completed-onboarding-column.js | Міграція | Додання поля для онбордингу |
| add-indexes.js | Міграція | Додання індексів БД для оптимізації |
| add-keyboard-type-column.js | Міграція | Додання поля для типу клавіатури |
| add-last-active-at-column.js | Міграція | Додання поля останньої активності користувача |
| add-multiformat-fields.js | Міграція | Додання полів для мультиформатів |
| add-multiple-formats.js | Міграція | Додання таблиці форматів книг |
| add-notification-columns.js | Міграція | Додання полів для сповіщень |
| add-promo-codes-tables.js | Міграція | Додання системи промо-кодів |
| add-tags-tables.js | Міграція | Додання системи тегів |
| add-users-table.js | Міграція | Додання таблиці користувачів |
| backup-db.js | Утиліта | Ручне резервне копіювання БД |
| backup.sh | Утиліта | Автоматичне резервне копіювання (Linux) |
| check-tags.js | Діагностика | Перевірка цілісності тегів |
| clean-books.ps1 | Утиліта | Очистка книг і перезапуск (Windows) |
| clean-db.ps1 | Утиліта | Очистка БД (Windows) |
| clean-start.ps1 | Утиліта | Чистий старт проекту (Windows) |
| dev.sh | Розробка | Запуск в режимі розробки з тестами (Linux) |
| fix-tags-migration.js | Міграція | Виправлення проблем з тегами |
| get-my-user-id.js | Діагностика | Отримання ID адміністратора |
| init.sh | Ініціалізація | Першочергова настройка проекту (Linux) |
| migrate.ts | Міграція | CLI для управління міграціями |
| optimize-db.ts | Оптимізація | Оптимізація BД (индекси, аналіз, вакуум) |
| repair-database.js | Утиліта | Відновлення пошкодженої БД |
| verify-users-table.js | Діагностика | Перевірка структури таблиці користувачів |

---

## Деталь Кожного Скрипту

### 🔄 Скрипти Міграції

#### add-audio-tables.js
```bash
node scripts/add-audio-tables.js
```
**Мета:** Додає таблиці для системи аудіокниг
**Створює:**
- Таблиця `audio_chapters` - розділи аудіокниг
- Таблиця `listening_progress` - прогрес слухання користувача
- Поле `narrator` до таблиці `books`
- Індекси для швидкого пошуку

---

#### add-book-orders-table.js
```bash
node scripts/add-book-orders-table.js
```
**Мета:** Додає систему замовлення фізичних книг
**Створює:**
- Таблиця `book_orders` - замовлення фізичних книг
- Поле `is_physically_available` до таблиці `books`
- Індекси для пошуку замовлень

---

#### add-has-completed-onboarding-column.js
```bash
node scripts/add-has-completed-onboarding-column.js
```
**Мета:** Додає поле для відстеження завершення онбордингу користувача

---

#### add-indexes.js
```bash
node scripts/add-indexes.js
```
**Мета:** Додає індекси для оптимізації швидкості БД

---

#### add-keyboard-type-column.js
```bash
node scripts/add-keyboard-type-column.js
```
**Мета:** Додає поле для збереження переважаного типу клавіатури

---

#### add-last-active-at-column.js
```bash
node scripts/add-last-active-at-column.js
```
**Мета:** Додає поле для відстеження останньої активності користувача

---

#### add-multiformat-fields.js
```bash
node scripts/add-multiformat-fields.js
```
**Мета:** Додає поля для підтримки книг в різних форматах

---

#### add-multiple-formats.js
```bash
node scripts/add-multiple-formats.js
```
**Мета:** Додає таблицю `book_formats` для управління форматами книг

---

#### add-notification-columns.js
```bash
node scripts/add-notification-columns.js
```
**Мета:** Додає поля для системи сповіщень

---

#### add-promo-codes-tables.js
```bash
node scripts/add-promo-codes-tables.js
```
**Мета:** Додає таблицю для управління промо-кодами

---

#### add-tags-tables.js
```bash
node scripts/add-tags-tables.js
```
**Мета:** Додає таблицю тегів та зв'язків книг з тегами

---

#### add-users-table.js
```bash
node scripts/add-users-table.js
```
**Мета:** Додає основну таблицю користувачів з усіма необхідними полями

---

#### migrate.ts
```bash
npm run migrate                    # Запустити всі незавершені міграції
npm run migrate rollback [version] # Відкотити міграцію
npm run migrate status            # Показати статус міграцій
npm run migrate reset             # Обнулити БД (тільки dev)
npm run migrate fresh             # Обнулити та перемігрувати (тільки dev)
npm run migrate validate          # Перевірити цілісність міграцій
npm run migrate run <version>     # Запустити конкретну міграцію
```
**Мета:** CLI для управління всіма міграціями БД

---

#### fix-tags-migration.js
```bash
node scripts/fix-tags-migration.js
```
**Мета:** Виправляє проблеми з тегами (якщо вони виникли під час міграції)

---

### 🔧 Утиліти і Інструменти

#### backup-db.js
```bash
node scripts/backup-db.js
```
**Мета:** Створює резервну копію БД SQLite
**Результат:** `backups/library-backup-[timestamp].db`
**Інструкції для відновлення:**
```bash
pm2 stop telegram-bot
cp backups/library-backup-[timestamp].db database/library.db
pm2 start telegram-bot
```

---

#### backup.sh (Linux)
```bash
bash scripts/backup.sh
```
**Мета:** Автоматичне резервне копіювання на Linux
**Можливості:**
- Автоматична компресія архіву
- Видалення старих бекапів (старше 30 днів)
- Список поточних бекапів
- Підтримка завантаження в хмарне сховище (AWS S3, Google Cloud, Dropbox)

---

#### clean-db.ps1 (Windows)
```powershell
.\scripts\clean-db.ps1
```
**Мета:** Очищення БД і перезапуск бота на Windows
**Виконує:**
1. Закриває всі Node.js процеси
2. Видаляє файли БД
3. Перезапускає бота (БД створюється заново)

---

#### clean-books.ps1 (Windows)
```powershell
.\scripts\clean-books.ps1
```
**Мета:** Очищення всіх книг і подкастів на Windows
**Виконує:**
1. Зупиняє PM2
2. Видаляє БД
3. Перезапускає через PM2

---

#### clean-start.ps1 (Windows)
```powershell
.\scripts\clean-start.ps1
```
**Мета:** Чистий старт проекту на Windows
**Виконує:**
1. Закриває всі Node процеси
2. Видаляє БД та WAL файли
3. Видаляє dist папку
4. Компілює TypeScript
5. Запускає бота

---

#### optimize-db.ts
```bash
npm run optimize-db
```
**Мета:** Оптимізація БД для підвищення продуктивності
**Виконує:**
- Створює всі необхідні індекси
- Аналізує таблиці
- Виконує вакуум (звільнює місце)
- Показує вдосконалення

---

#### repair-database.js
```bash
node scripts/repair-database.js
```
**Мета:** Відновлення пошкодженої БД SQLite
**Результати:**
- `library_backup.db` - резервна копія оригіналу
- `library_recovered.db` - відновлена база
- `library_old.db` - стара пошкоджена база

---

### 📊 Діагностичні Скрипти

#### check-tags.js
```bash
node scripts/check-tags.js
```
**Мета:** Перевірка цілісності системи тегів
**Показує:**
- Загальна кількість тегів
- Теги з помилками (наприклад, з пробілами)
- Список всіх тегів в БД

---

#### get-my-user-id.js
```bash
node scripts/get-my-user-id.js
```
**Мета:** Отримання ID адміністратора з БД
**Показує:**
- User ID
- Ім'я та username
- Статус онбордингу

---

#### verify-users-table.js
```bash
node scripts/verify-users-table.js
```
**Мета:** Перевірка структури таблиці користувачів
**Показує:**
- Список всіх колон в таблиці
- Їхні типи даних
- Відсутні необхідні колони (якщо є)

---

### 🚀 Скрипти Розробки

#### init.sh (Linux)
```bash
bash scripts/init.sh
bash scripts/init.sh --skip-tests    # Пропустити тести
bash scripts/init.sh --skip-admin    # Пропустити інціалізацію адміна
```
**Мета:** Першочергова настройка проекту на Linux
**Перевіряє:**
- Node.js >= 18
- npm
- Redis
- SQLite
**Установлює:**
- npm залежності
- .env файл
- Необхідні папки
**Запускає:**
- Тести
- Міграції БД

---

#### dev.sh (Linux)
```bash
bash scripts/dev.sh                  # З перевіркою (линт, тести)
bash scripts/dev.sh --skip-checks    # Без перевірки
```
**Мета:** Запуск в режимі розробки на Linux
**Виконує:**
- Перевіряє Redis
- Запускає ESLint
- Перевіряє типи TypeScript
- Запускає тести
- Запускає бота в watch режимі (автоперезагрузка при змінах)

---

## Порядок Виконання

### Перша Настройка
```bash
# Linux
bash scripts/init.sh

# Windows
.\scripts\clean-start.ps1
```

### Щодня Розробка
```bash
# Linux
bash scripts/dev.sh

# Windows
npm run dev
```

### Резервне Копіювання
```bash
# Ручне копіювання
node scripts/backup-db.js

# Автоматичне на Linux (через cron)
# 0 2 * * * /path/to/project/scripts/backup.sh
```

### Якщо БД Пошкоджена
```bash
node scripts/repair-database.js
```

### Оптимізація БД
```bash
npm run optimize-db
```

### На Облаці (сервері)
```bash
# Перевірка тегів
node scripts/check-tags.js

# Отримання ID адміна
node scripts/get-my-user-id.js

# Перевірка таблиці користувачів
node scripts/verify-users-table.js
```

---

## Переменні Оточення

### DB_PATH
```bash
export DB_PATH=./database/library.db
```
Шлях до файлу БД (за замовчуванням: `./database/library.db`)

### LOG_LEVEL
```bash
export LOG_LEVEL=debug
```
Рівень логування для скриптів

### NODE_ENV
```bash
export NODE_ENV=development
```
Середовище виконання (development/production)

### KEEP_DAYS (для backup.sh)
```bash
export KEEP_DAYS=30
```
Кількість днів для збереження бекапів (за замовчуванням: 30)

### BACKUP_DIR
```bash
export BACKUP_DIR=./backups
```
Папка для зберігання резервних копій

---

## Рекомендацій

### ✅ Добрі Практики
- Регулярно робіть резервні копії
- Запускайте `optimize-db` один раз на місяць
- Перевіряйте статус миграцій перед оновленням
- На облаці перевіряйте логи після нових деплоїв

### ❌ Чого Уникати
- Не запускайте `migrate reset` на продакшені
- Не видаляйте БД вручну - використовуйте скрипти
- Не запускайте два скрипти міграції одночасно
- На Windows не закриває терміналь під час виконання скрипту

---

## Розв'язання Проблем

### Помилка: "Database locked"
```bash
node scripts/repair-database.js
```

### Помилка: "PRAGMA statements failed"
```bash
node scripts/check-tags.js
node scripts/verify-users-table.js
```

### Помилка: "Tables not found"
```bash
npm run migrate
```

### Великий розмір БД
```bash
npm run optimize-db
node scripts/backup-db.js
```

---

## Контакти і Допомога

Якщо виникли проблеми:
1. Перевірте логи: `npm run logs` або `pm2 logs telegram-bot`
2. Запустіть діагностичні скрипти: `check-tags.js`, `verify-users-table.js`
3. Створіть резервну копію: `node scripts/backup-db.js`
4. Напишіть в Issues з описом проблеми

---

**Останнє оновлення:** 2025-11-27
