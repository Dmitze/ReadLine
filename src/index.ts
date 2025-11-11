// src/index.ts - Основний файл бота
import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { message } from 'telegraf/filters';
import dotenv from 'dotenv';

// Ініціалізація змінних оточення
dotenv.config();

// Імпорт utilities
import { logger } from './utils/logger';
import { rateLimitMessage, rateLimitCallback } from './middleware/rateLimit';
import { BotContext } from './types/telegraf';
import { ERRORS } from './constants';

// База даних ініціалізується автоматично при імпорті models

// Імпорт сцен
import addBookScene from './scenes/addBookScene';
import editBookScene from './scenes/editBookScene';
import manageBooksScene from './scenes/manageBooksScene';
import searchScene from './scenes/searchScene';
import profileScene from './scenes/profileScene';
import rateBookScene from './scenes/rateBookScene';
import feedbackScene from './scenes/feedbackScene';
import aiScene from './scenes/aiScene';
import audioPlayerScene from './scenes/audioPlayerScene';
import replyFeedbackScene from './scenes/replyFeedbackScene';
import onboardingScene from './scenes/onboardingScene';
import settingsScene from './scenes/settingsScene';
import aiFilterScene from './scenes/aiFilterScene';
import aiAssistantScene from './scenes/aiAssistantScene';
import promoAdminScene from './scenes/promoAdminScene';

// Перевірка наявності BOT_TOKEN
if (!process.env.BOT_TOKEN) {
  logger.error(ERRORS.BOT_TOKEN_MISSING);
  console.error('📝 Створіть .env файл в корені проекту та додайте:');
  console.error('   BOT_TOKEN=your_telegram_bot_token_here');
  console.error('');
  console.error('💡 Токен можна отримати у @BotFather в Telegram');
  process.exit(1);
}

// Ініціалізація бота
const bot = new Telegraf<BotContext>(process.env.BOT_TOKEN);

// Middleware для логування та rate limiting
bot.use(async (ctx, next) => {
  logger.info('Processing update', { updateId: ctx.update.update_id });
  await next();
});

// Rate limiting
bot.use(rateLimitMessage);
bot.on('callback_query', rateLimitCallback);

// Глобальний обробник команд /start та /cancel - працює навіть в scenes
bot.use(async (ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const text = ctx.message.text;
    
    // Якщо команда /start - виходимо зі scene та обробляємо
    if (text === '/start') {
      if (ctx.scene) {
        await ctx.scene.leave();
        logger.info('User left scene via /start', { userId: ctx.from?.id });
      }
      return next();
    }
    
    // Якщо команда /cancel або кнопка скасування - виходимо зі scene
    if (text === '/cancel' || text === '❌ Скасувати') {
      // Виходимо зі scene якщо в ньому
      if (ctx.scene) {
        try {
          await ctx.scene.leave();
          logger.info('User left scene via cancel', { userId: ctx.from?.id, command: text });
        } catch (error) {
          logger.error('Error leaving scene', error instanceof Error ? error : new Error(String(error)));
        }
      }
      
      // Очищаємо session state
      if (ctx.session) {
        ctx.session = {};
      }
      
      // Завжди показуємо головне меню після скасування
      const { getMainMenuKeyboard } = await import('./keyboards/mainKeyboards');
      await ctx.reply('❌ Операцію скасовано\n\nОберіть дію з меню:', {
        reply_markup: getMainMenuKeyboard()
      });
      return; // Не викликаємо next() - зупиняємо обробку
    }
  }
  
  return next();
});

// Глобальний обробник помилок
bot.catch((err, ctx) => {
  logger.error('Bot error', err instanceof Error ? err : new Error(String(err)), {
    updateId: ctx.update.update_id,
    userId: ctx.from?.id,
  });
  
  // Спроба повідомити користувача про помилку
  try {
    ctx.reply(
      '❌ Виникла помилка при обробці вашого запиту.\n\n' +
      'Спробуйте:\n' +
      '• Надіслати /start для перезапуску\n' +
      '• Повторити дію пізніше\n' +
      '• Зв\'язатися з адміністратором'
    );
  } catch (replyError) {
    console.error('Не вдалося відправити повідомлення про помилку:', replyError);
  }
});

// Обробка необроблених promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise);
  console.error('Reason:', reason);
});

// Обробка необроблених виключень
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:');
  console.error(error);
  // Не виходимо одразу, даємо можливість graceful shutdown
});

// Реєстрація сесій та сцен
const stage = new Scenes.Stage([
  addBookScene as any,
  editBookScene as any,
  manageBooksScene as any,
  searchScene as any, 
  profileScene as any,
  rateBookScene as any,
  feedbackScene as any,
  aiScene as any,
  audioPlayerScene as any,
  replyFeedbackScene as any,
  onboardingScene as any,
  settingsScene as any,
  aiFilterScene as any,
  aiAssistantScene as any,
  promoAdminScene as any
]);

// Імпорт клавіатур (потрібно для middleware)
import { getMainMenuKeyboard } from './keyboards/mainKeyboards';

bot.use(session());

// КРИТИЧНО ВАЖЛИВО: Middleware для виходу зі scene ПЕРЕД stage.middleware()
bot.use(async (ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const text = ctx.message.text;
    const menuButtons = [
      '📖 Каталог', '🏆 Топ книги', '🆕 Новинки', 
      '💾 Моя бібліотека', '👤 Профіль', '🤖 AI Помічник',
      '🎁 Отримати промокод', 'ℹ️ Допомога', '📞 Зворотній зв\'язок',
      '🏠 На головну'
    ];
    
    // Якщо натиснута кнопка головного меню і користувач в scene - виходимо
    if (menuButtons.includes(text) && ctx.scene) {
      console.log(`🚪 User pressed menu button "${text}" while in scene, leaving...`);
      
      try {
        await ctx.scene.leave();
        // Очищаємо session
        if (ctx.session) {
          ctx.session = {};
        }
        console.log('✅ Successfully left scene');
      } catch (error) {
        console.error('❌ Error leaving scene:', error);
      }
    }
  }
  return next();
});

bot.use(stage.middleware() as any);

// Імпорт user functions
import { getOrCreateUser, isNewUser } from './database/userFunctions';

// Базові команди
bot.start(async (ctx) => {
  const userId = ctx.from?.id;
  const username = ctx.from?.username;
  const firstName = ctx.from?.first_name || 'Читач';
  const lastName = ctx.from?.last_name;
  
  if (!userId) {
    await ctx.reply('❌ Не вдалося ідентифікувати користувача');
    return;
  }
  
  try {
    // Отримуємо або створюємо користувача
    await getOrCreateUser(userId, username, firstName, lastName);
    
    // Перевіряємо чи користувач новий
    const isNew = await isNewUser(userId);
    
    if (isNew) {
      // Новий користувач - запускаємо онбординг
      logger.info('New user detected, starting onboarding', { userId, username });
      return ctx.scene?.enter('ONBOARDING_SCENE');
    }
    
    // Існуючий користувач - показуємо звичайне привітання
    const welcomeMessage = 
      '╔═══════════════════════════╗\n' +
      '   📚 *ReadLine Бібліотека* 📚\n' +
      '╚═══════════════════════════╝\n\n' +
      `Вітаємо, *${firstName}*! 👋\n\n` +
      '🎯 *Про ReadLine:*\n' +
      'Ваша особиста електронна бібліотека з тисячами книг українською мовою. ' +
      'Читайте, слухайте, зберігайте улюблені книги та отримуйте персональні рекомендації!\n\n' +
      '📚 *Що ви можете робити:*\n\n' +
      '📖 Переглядати каталог книг за жанрами\n' +
      '🔍 Шукати книги (назва, автор, жанр)\n' +
      '🏆 Дивитися топ книг за рейтингом\n' +
      '🆕 Знаходити нові надходження\n' +
      '💾 Зберігати улюблені книги\n' +
      '⭐ Оцінювати та залишати відгуки\n' +
      '📥 Завантажувати книги (PDF, EPUB, FB2...)\n' +
      '🎧 Слухати аудіокниги\n' +
      '🌐 Читати онлайн\n' +
      '💡 Отримувати персональні рекомендації\n\n' +
      '⚙️ *Доступні команди:*\n' +
      '/start - Головне меню\n' +
      '/help - Довідка по боту\n' +
      '/cancel - Скасувати поточну дію\n' +
      '/admin - Панель адміністратора\n\n' +
      '⚡ *Швидкі дії:*\n' +
      '• Швидкий пошук\n' +
      '• Мої улюблені\n' +
      '• Випадкова книга\n\n' +
      '👇 *Оберіть дію з меню нижче:*';
      
    return ctx.reply(welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard()
    });
  } catch (error) {
    logger.error('Error in start command', error instanceof Error ? error : new Error(String(error)), { userId });
    await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
  }
});

// Команда допомоги
bot.help((ctx) => {
  const helpMessage =
    '╔═══════════════════════════╗\n' +
    '      ℹ️ *ДОВІДКА ПО БОТУ* ℹ️\n' +
    '╚═══════════════════════════╝\n\n' +
    
    '🎯 *ОСНОВНІ ФУНКЦІЇ:*\n\n' +
    
    '📖 *Каталог* - перегляд книг за жанрами\n' +
    '   • Оберіть жанр зі списку\n' +
    '   • Показується до 5 книг за раз\n\n' +
    
    '🔍 *Пошук* - розширений пошук\n' +
    '   • За назвою, автором або жанром\n' +
    '   • Фільтри для точного пошуку\n' +
    '   • Мінімум 2 символи\n\n' +
    
    '🏆 *Топ книги* - найкращі за рейтингом\n' +
    '   • Книги з найвищими оцінками\n' +
    '   • Оновлюється автоматично\n\n' +
    
    '🆕 *Новинки* - останні надходження\n' +
    '   • 10 останніх додань\n' +
    '   • Завжди свіжі книги\n\n' +
    
    '💾 *Моя бібліотека* - збережені книги\n' +
    '   • Ваші улюблені книги\n' +
    '   • Швидкий доступ\n\n' +
    
    '👤 *Профіль* - ваша статистика\n' +
    '   • Персональні рекомендації\n' +
    '   • Статистика прослуховування\n' +
    '   • Улюблені жанри\n\n' +
    
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    
    '⚡ *ШВИДКІ ДІЇ:*\n' +
    '• ⚡ Швидкий пошук - миттєвий пошук\n' +
    '• ⭐ Мої улюблені - збережені книги\n' +
    '• 📚 Продовжити читати - останні книги\n' +
    '• 🎲 Випадкова книга - відкрийте нове\n\n' +
    
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    
    '📚 *ФОРМАТИ КНИГ:*\n' +
    '• 📄 PDF - завантажити файл\n' +
    '• 🌐 Онлайн - читати в браузері\n' +
    '• 🎧 Аудіо - слухати аудіокнигу\n\n' +
    
    '🎬 *ДІЇ З КНИГОЮ:*\n' +
    '• 📥 Завантажити - отримати файл\n' +
    '• ⭐ Оцінити - залишити відгук\n' +
    '• 💾 Зберегти - додати в улюблені\n' +
    '• 📊 Відгуки - читати коментарі\n' +
    '• 🔍 Схожі - знайти подібні\n\n' +
    
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    
    '⚙️ *КОМАНДИ:*\n' +
    '/start - Головне меню\n' +
    '/help - Ця довідка\n' +
    '/settings - Налаштування бота\n' +
    '/admin - Панель адміністратора (тільки для адмінів)\n\n' +
    
    '💡 *ПІДКАЗКИ:*\n' +
    '• Використовуйте кнопки для навігації\n' +
    '• Всі дії інтуїтивні та зрозумілі\n' +
    '• При помилці бот підкаже що робити\n\n' +
    
    '❓ Питання? Звертайтеся до адміністратора!';
    
  return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Команда /settings - налаштування бота (Завдання 30)
bot.command('settings', async (ctx) => {
  logger.userAction(ctx.from.id, 'settings_command');
  return ctx.scene.enter('SETTINGS_SCENE');
});

// Імпорт та реєстрація обробників
import userHandlers from './handlers/userHandlers';
import adminHandlers from './handlers/adminHandlers';

console.log('📝 Registering handlers...');

// Реєструємо adminHandlers ПЕРЕД userHandlers
// щоб команди оброблялися першими
adminHandlers(bot);
console.log('✅ Admin handlers called');

userHandlers(bot);
console.log('✅ User handlers called');

// Обробники для сповіщень (Завдання 31)
bot.action('notification_settings', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene.enter('SETTINGS_SCENE');
});

bot.action('view_new_books', async (ctx) => {
  await ctx.answerCbQuery('📚 Показую новинки');
  // Тут можна додати логіку показу новинок
  await ctx.reply('📚 Новинки будуть тут незабаром!');
});

bot.action('random_book', async (ctx) => {
  await ctx.answerCbQuery('🎲 Вибираю випадкову книгу');
  // Викликаємо обробник випадкової книги
  const { getRandomBook } = require('./database/recommendationFunctions');
  const book = await getRandomBook();
  
  if (book) {
    const { formatBookCaption } = require('./utils/helpers');
    const { getEnhancedBookKeyboard } = require('./keyboards/mainKeyboards');
    const caption = await formatBookCaption(book);
    
    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
      await ctx.replyWithPhoto(book.photo_file_id, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: getEnhancedBookKeyboard(book)
      });
    } else {
      await ctx.reply(caption, {
        parse_mode: 'Markdown',
        reply_markup: getEnhancedBookKeyboard(book)
      });
    }
  } else {
    await ctx.reply('❌ На жаль, зараз немає доступних книг');
  }
});

// Graceful shutdown
let notificationScheduler: NodeJS.Timeout | null = null;

const shutdown = (signal: string) => {
  console.log(`Received ${signal}, shutting down gracefully`);
  
  // Зупиняємо планувальник сповіщень
  if (notificationScheduler) {
    const { stopNotificationScheduler } = require('./utils/notifications');
    stopNotificationScheduler(notificationScheduler);
  }
  
  bot.stop(signal);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Запуск бота
console.log('🚀 Starting bot launch...');
console.log('✅ User handlers registered');
console.log('✅ Admin handlers registered');

// Асинхронний запуск без блокування
(async () => {
  try {
    // ✅ ВИПРАВЛЕНО #1: Ініціалізація БД перед запуском бота
    console.log('🔄 Initializing database...');
    const { initDatabase } = await import('./database/models');
    await initDatabase();
    console.log('✅ Database initialized successfully');
    
    console.log('🔄 Launching bot...');
    await bot.launch({
      dropPendingUpdates: true
    });
    console.log('📚 Бібліотечний бот запущений!');
    console.log('Bot username:', bot.botInfo?.username);
    console.log('✅ Bot is ready to receive messages');
    
    // Запускаємо планувальник сповіщень (Завдання 31)
    const { startNotificationScheduler } = require('./utils/notifications');
    notificationScheduler = startNotificationScheduler(bot);
    console.log('🔔 Notification scheduler started');
    
    // ✅ ВИПРАВЛЕНО #70: запускаємо автоматичний backup
    const { startAutoBackup } = require('./utils/autoBackup');
    const backupScheduler = startAutoBackup();
    console.log('💾 Automatic backup scheduler started');
    
  } catch (error) {
    console.error('❌ Помилка запуску бота:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    process.exit(1);
  }
})();