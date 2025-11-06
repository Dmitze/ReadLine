# 📚 Telegram-бот для полкової бібліотеки

![Telegram Bot](https://img.shields.io/badge/Telegram-Bot-blue?style=flat-square&logo=telegram)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=flat-square&logo=node.js)
![SQLite](https://img.shields.io/badge/SQLite-Database-lightgrey?style=flat-square&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

Сучасна цифрова система управління полковою бібліотекою на основі Telegram-бота, яка дозволить автоматизувати процес обліку книг, обробки заявок та взаємодії з читачами.

## 📋 Огляд проекту

Це Telegram-бот для управління полковою бібліотекою, створений з використанням фреймворку Telegraf для Node.js. Бот дозволяє військовослужбовцям переглядати каталог книг, замовляти книги, а адміністраторам - управляти каталогом та обробляти заявки.

## 🚀 Встановлення та запуск

1. Клонуйте репозиторій:
   ```bash
   git clone <repository-url>
   cd library-bot
   ```

2. Встановіть залежності:
   ```bash
   npm install
   ```

3. Налаштуйте змінні оточення:
   Скопіюйте файл `.env.example` в `.env` та заповніть необхідні значення:
   ```env
   BOT_TOKEN=your_telegram_bot_token_here
   ADMIN_ID=your_telegram_user_id
   DB_PATH=./database/library.db
   ```

4. Запустіть бота:
   ```bash
   npm start
   ```

## 🎯 Основні функції

### Для читачів (військовослужбовців):

- 📚 Перегляд каталогу книг за жанрами
- 🔍 Пошук книг за назвою або автором
- 🎯 Замовлення книг через інтерактивні форми
- 📋 Перегляд статусу своїх заявок

### Для адміністратора:

- 🛠️ Адмін-панель з командою `/admin`
- ➕ Додавання нових книг через інтерактивні сцени
- 📋 Перегляд та обробка заявок на книги
- 📊 Статистика бібліотеки

## 🏗️ Архітектура проекту

```
library-bot/
├── package.json
├── .env
├── index.js (основний файл)
├── config/
│   └── database.js
├── handlers/
│   ├── userHandlers.js
│   └── adminHandlers.js
├── scenes/
│   ├── addBookScene.js
│   ├── requestBookScene.js
│   └── searchScene.js
├── keyboards/
│   ├── mainKeyboards.js
│   └── adminKeyboards.js
├── database/
│   └── models.js
└── utils/
    └── helpers.js
```

## ⚙️ Технології

- **Node.js** - середовище виконання
- **Telegraf** - фреймворк для створення Telegram-ботів
- **SQLite** - легкова база даних
- **dotenv** - для управління змінними оточення

## 📄 Ліцензія

Цей проект ліцензовано за ліцензією MIT.