# 🚀 Quick Start - Швидкий старт ReadLine

## Налаштування за 5 хвилин

### 1. Отримайте токен бота

1. Перейдіть до [@BotFather](https://t.me/botfather) в Telegram
2. Надішліть команду `/newbot`
3. Слідуйте інструкціям (ім'я, username)
4. Скопіюйте отриманий токен

### 2. Отримайте User ID адміністраторів

1. Перейдіть до [@userinfobot](https://t.me/userinfobot) в Telegram
2. Надішліть `/start`
3. Скопіюйте ваш User ID (і ID інших адмінів, якщо потрібно)

### 3. Налаштуйте .env

```bash
# Клонуйте репозиторій
git clone https://github.com/Dmitze/ReadLine.git
cd ReadLine

# Скопіюйте приклад конфігурації
cp .env.example .env

# Відредагуйте файл (VS Code, nano, тощо)
code .env
# Або
nano .env
```

Встановіть ці значення:

```env
BOT_TOKEN=your_token_from_BotFather          # 👈 Вставте тут токен
ADMIN_ID=906087418,547751718                 # 👈 Вставте ваш ID та ID інших адмінів
NODE_ENV=development                         # development або production
```

### 4. Установка та запуск

```bash
# Встановіть залежності
npm install

# Побудуйте TypeScript
npm run build

# Ініціалізуйте адміністраторів
npm run init-admin

# Запустіть бота
npm start
```

### 5. Тестування

Напишіть боту в Telegram:
- `/start` — головне меню
- `/admin` — адмін-панель (тільки для адмінів)
- `/help` — довідка

---

## 🐳 Docker запуск (рекомендовано)

### Docker Compose

```bash
# Запустіть Redis + Bot разом
docker-compose up -d

# Перевірте статус
docker ps
```

### Docker Build

```bash
# Побудуйте образ
docker build -t readline:latest .

# Запустіть контейнер
docker run \
  -e BOT_TOKEN=your_token \
  -e ADMIN_ID=906087418 \
  -v $(pwd)/database:/app/database \
  readline:latest
```

---

## 🔧 Поширені команди

```bash
# Development з auto-reload
npm run dev:watch

# Запуск тестів
npm test

# Перевірка коду
npm run lint
npm run format

# Production білда
npm run build
npm start
```

---

## 📱 Функціонал для користувачів

### Головне меню

```
📖 КАТАЛОГ              — Перегляд книг
🏆 ТОП КНИГИ            — Найкраще оцінені
🆕 НОВИНКИ              — Нові книги
💾 МОЯ БІБЛІОТЕКА       — Улюблені
👤 ПРОФІЛЬ              — Моя статистика
🤖 AI ПОМІЧНИК          — AI рекомендації
💬 ЗВОРОТНІЙ ЗВ'ЯЗОК    — Повідомити адміну
ℹ️ ДОПОМОГА             — Документація
```

### Дії з книгою

- 📥 **Завантажити** — Скачати е-книгу
- 🌐 **Читати онлайн** — Повідомлення у браузері
- 🎧 **Слухати** — Аудіокнига з прогресом
- ⭐ **Оцінити** — Залишити відгук
- 💾 **Зберегти** — До улюблених
- 📊 **Відгуки** — Читати рецензії інших
- 🔍 **Схожі** — AI пошук схожих книг

---

## 🛠️ Адміністративні команди

```
/admin              — Адмін-панель
/settings           — Налаштування
/help               — Довідка
/cancel             — Скасування дії
```

### Адмін-функції

- ➕ **Додати книгу** — 9-крокова форма
- 📞 **Feedback** — Повідомлення від користувачів
- 📊 **Статистика** — Аналітика
- ✅ **Модерація** — Затвердження відгуків

---

## ⚙️ Налаштування

### Розмір клавіатури

Команда `/settings` → **📱 Тип клавіатури**
- 📱 Мобільний — 2 кнопки в ряд
- 📲 Планшет — 3 кнопки в ряд
- 💻 Десктоп — 4 кнопки в ряд

### Сповіщення

Команда `/settings` → **🔔 Сповіщення**
- Увімкнути/вимкнути
- Вибір частоти (щодня, раз на тиждень)
- Встановлення часу

### Кешування та оптимізація

Дивіться `src/config/AppConfig.ts`:
```typescript
CACHE_TTL_BOOKS: 300,        // 5 хвилин
CACHE_TTL_TOP: 600,          // 10 хвилин
REQUEST_LIMIT_MESSAGE: 5,    // 5 вісь / 10 сек
```

---

## 🐛 Розв'язання проблем

### Бот не запускається

```bash
# Перевірте .env
cat .env

# Переконайтесь в наявності BOT_TOKEN
echo $BOT_TOKEN

# Побудуйте проект заново
npm run clean
npm run build

# Запустіть з більшим логуванням
LOG_LEVEL=debug npm start
```

### Redis не з'єднується

```bash
# Перевірте чи Redis працює
docker ps | grep redis

# Або запустіть Redis
docker run -d -p 6379:6379 --name readline-redis redis:latest

# Тестування з'єднання
redis-cli ping
# Повинна вивести: PONG
```

### Помилка: "ADMIN_ID must be numeric"

Виправте .env. Правильні формати:
```env
ADMIN_ID=906087418                      # Один адмін
ADMIN_ID=906087418,547751718            # Кілька адмінів
```

---

## 📊 Моніторинг

### Логове файли

```
logs/
├── error.log      — Тільки помилки
├── info.log       — Основні операції
└── combined.log   — Все разом
```

### Перевірка здоров'я

```bash
# Поточні логи
tail -f logs/combined.log

# Помилки
tail -f logs/error.log

# Статистика
npm run stats
```

---

## 🚀 Production Deployment

### Railway / Heroku

1. Загрузіть на GitHub
2. Підключіть репозиторій до Railway/Heroku
3. Встановіть змінні оточення (BOT_TOKEN, ADMIN_ID)
4. Запустіть:
```bash
npm run build && npm start
```

### ВЛВServer (VPS)

```bash
# SSH на сервер
ssh user@your_server_ip

# Клонуйте та налаштуйте
git clone https://github.com/Dmitze/ReadLine.git
cd ReadLine
cp .env.example .env
# Редагуйте .env...

# Встановіть Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Встановіть Redis
sudo apt-get install -y redis-server

# Запустіть бота в фоні
npm install
npm run build
nohup npm start > bot.log 2>&1 &

# Перевірте статус
tail -f bot.log
```

### PM2 (для управління процесом)

```bash
# Встановіть PM2
npm install -g pm2

# Запустіть бота
pm2 start dist/index.js --name "readline-bot"

# Логи
pm2 logs readline-bot

# Перезапуск при помилці
pm2 restart readline-bot
pm2 save
pm2 startup
```

---

## 📚 Додаткові ресурси

- ✅ [Статус налаштування](./SETUP_COMPLETE.md)
- 📖 [Повна документація](./README.md)
- 🔐 [Налаштування адмінів](./ADMIN_SETUP.md)
- 🤝 [Contribution guide](./CONTRIBUTING.md)
- 🔒 [Security policy](./SECURITY.md)

---

## 💡 Поради для розробників

### Development режим з auto-reload

```bash
npm run dev:watch
```

### Запуск тестів

```bash
npm test              # Всі тести
npm run test:watch    # Watch режим
npm run test:coverage # Coverage report
```

### TypeScript контроль

```bash
npm run lint          # ESLint
npm run format        # Prettier
```

---

## 🆘 Потрібна допомога?

- 📧 Email: dmitze_shivachov@outlook.com
- 💬 Telegram: [@Dmitry_Shiva](https://t.me/Dmitry_Shiva)
- 🐛 Issues: [GitHub Issues](https://github.com/Dmitze/ReadLine/issues)

---

*Остання оновлення: 24 листопада 2025*
