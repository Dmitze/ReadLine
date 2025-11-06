// index.js - Основний файл бота
const { Telegraf, Scenes, session } = require('telegraf');
const { message } = require('telegraf/filters');
require('dotenv').config();

// Ініціалізація бази даних
require('./config/database');

// Імпорт сцен
const addBookScene = require('./scenes/addBookScene');
const requestBookScene = require('./scenes/requestBookScene');
const searchScene = require('./scenes/searchScene');

// Ініціалізація бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// Реєстрація сесій та сцен
const stage = new Scenes.Stage([addBookScene, requestBookScene, searchScene]);
bot.use(session());
bot.use(stage.middleware());

// Базові команди
bot.start((ctx) => {
  return ctx.reply('📚 Вітаємо в полковій бібліотеці!', {
    reply_markup: {
      keyboard: [
        ['📖 Перегляд каталогу', '🔍 Пошук книги'],
        ['📋 Мої заявки', 'ℹ️ Допомога']
      ],
      resize_keyboard: true
    }
  });
});

// Імпорт та реєстрація обробників
const userHandlers = require('./handlers/userHandlers');
const adminHandlers = require('./handlers/adminHandlers');

userHandlers(bot);
adminHandlers(bot);

// Запуск бота
bot.launch().then(() => {
  console.log('📚 Бібліотечний бот запущений!');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));