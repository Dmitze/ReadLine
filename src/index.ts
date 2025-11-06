// src/index.ts - Основний файл бота
import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';

// Ініціалізація змінних оточення
dotenv.config();

// Ініціалізація бази даних
import './config/database';

// Імпорт сцен
import addBookScene from './scenes/addBookScene.js';
import requestBookScene from './scenes/requestBookScene.js';
import searchScene from './scenes/searchScene.js';
import profileScene from './scenes/profileScene.js';

// Ініціалізація бота
const bot = new Telegraf(process.env.BOT_TOKEN || '');

// Middleware для логування
bot.use(async (ctx, next) => {
  console.log(`Processing update ${ctx.update.update_id}`);
  await next();
});

// Реєстрація сесій та сцен
const stage = new Scenes.Stage([addBookScene, requestBookScene, searchScene, profileScene]);
bot.use(session());
bot.use(stage.middleware() as any);

// Базові команди
bot.start((ctx) => {
  return ctx.reply('📚 Вітаємо в полковій бібліотеці!', {
    reply_markup: Markup
      .keyboard([
        ['📖 Перегляд каталогу', '🔍 Пошук книги'],
        ['📋 Мої заявки', '👤 Мій профіль'],
        ['ℹ️ Допомога']
      ])
      .resize()
      .oneTime()
      .reply_markup
  });
});

// Команда допомоги
bot.help((ctx) => {
  return ctx.reply(
    '📖 *Команди бота:*\n' +
    '/start - Головне меню\n' +
    '/help - Допомога\n' +
    '/admin - Панель адміністратора\n\n' +
    'Ви також можете використовувати кнопки для навігації.',
    { parse_mode: 'Markdown' }
  );
});

// Імпорт та реєстрація обробників
import userHandlers from './handlers/userHandlers.js';
import adminHandlers from './handlers/adminHandlers.js';

userHandlers(bot);
adminHandlers(bot);

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully`);
  bot.stop(signal);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Запуск бота
bot.launch().then(() => {
  console.log('📚 Бібліотечний бот запущений!');
  console.log('Bot username:', bot.botInfo?.username);
});