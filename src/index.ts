// src/index.ts - Основний файл бота
import { Telegraf, session } from 'telegraf';
import { BotContext } from './types/telegraf';
import { logger } from './utils/logger';
import { setupEnvironment } from './bootstrap/environmentSetup';
import { setupMiddleware } from './bootstrap/middlewareSetup';
import { createStage } from './bootstrap/sceneSetup';
import { getContainer, bootstrapContainer } from './core/ContainerBootstrap';
import { db } from './database/models';

const env = setupEnvironment();

const container = getContainer();
bootstrapContainer(container).catch((error) => {
  logger.error('Failed to bootstrap container', error);
  process.exit(1);
});

const bot = new Telegraf<BotContext>(env.BOT_TOKEN);

setupMiddleware(bot);

bot.catch(async (err, ctx) => {
  logger.error('Bot error', err instanceof Error ? err : new Error(String(err)), {
    updateId: ctx.update.update_id,
    userId: ctx.from?.id,
  });

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCbQuery('❌ Виникла помилка');
    } catch (cbError) {
      logger.error(
        'Failed to answer callback query',
        cbError instanceof Error ? cbError : new Error(String(cbError))
      );
    }
  }

  try {
    await ctx.reply(
      '❌ Виникла помилка при обробці вашого запиту.\n\n' +
        'Спробуйте:\n' +
        '• Надіслати /start для перезапуску\n' +
        '• Повторити дію пізніше\n' +
        "• Зв'язатися з адміністратором"
    );
  } catch (replyError) {
    logger.error(
      'Failed to send error message to user',
      replyError instanceof Error ? replyError : new Error(String(replyError))
    );
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection', new Error(String(reason)), {
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error instanceof Error ? error : new Error(String(error)));
});

const stage = createStage();

// Імпорт клавіатур (потрібно для middleware)
import { getMainMenuKeyboard } from './keyboards/mainKeyboards';

bot.use(session());

// КРИТИЧНО ВАЖЛИВО: Middleware для виходу зі scene ПЕРЕД stage.middleware()
bot.use(async (ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const text = ctx.message.text;
    const menuButtons = [
      '📖 Каталог',
      '🏆 Топ книги',
      '🆕 Новинки',
      '💾 Моя бібліотека',
      '👤 Профіль',
      '🤖 AI Помічник',
      '🎁 Отримати промокод',
      'ℹ️ Допомога',
      "📞 Зворотній зв'язок",
      '🏠 На головну',
    ];

    // Якщо натиснута кнопка головного меню і користувач в scene - виходимо
    if (menuButtons.includes(text) && ctx.scene) {
      logger.info('User pressed menu button while in scene', { text, userId: ctx.from?.id });

      try {
        await ctx.scene.leave();
        // Очищаємо session
        if (ctx.session) {
          ctx.session = {};
        }
        logger.info('Successfully left scene', { userId: ctx.from?.id });
      } catch (error) {
        logger.error(
          'Error leaving scene',
          error instanceof Error ? error : new Error(String(error)),
          { userId: ctx.from?.id }
        );
      }
    }
  }
  return next();
});

bot.use(stage.middleware());

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
      if (ctx.scene) {
        return ctx.scene.enter('ONBOARDING_SCENE');
      } else {
        logger.error('Scene context not available for onboarding', { userId });
      }
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
      parse_mode: 'HTML',
      reply_markup: getMainMenuKeyboard(),
    });
  } catch (error) {
    logger.error(
      'Error in start command',
      error instanceof Error ? error : new Error(String(error)),
      { userId }
    );
    await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
  }
});

// Команда допомоги
bot.help((ctx) => {
  const helpMessage =
    '╔═══════════════════════════╗\n' +
    '      ℹ️ <b>ДОВІДКА ПО БОТУ</b> ℹ️\n' +
    '╚═══════════════════════════╝\n\n' +
    '<b>🎯 ОСНОВНІ ФУНКЦІЇ:</b>\n\n' +
    '📖 <b>Каталог</b> - перегляд книг за жанрами\n' +
    '   • Оберіть жанр зі списку\n' +
    '   • Показується до 5 книг за раз\n\n' +
    '🔍 <b>Пошук</b> - розширений пошук\n' +
    '   • За назвою, автором або жанром\n' +
    '   • Фільтри для точного пошуку\n' +
    '   • Мінімум 2 символи\n\n' +
    '🏆 <b>Топ книги</b> - найкращі за рейтингом\n' +
    '   • Книги з найвищими оцінками\n' +
    '   • Оновлюється автоматично\n\n' +
    '🆕 <b>Новинки</b> - останні надходження\n' +
    '   • 10 останніх додань\n' +
    '   • Завжди свіжі книги\n\n' +
    '💾 <b>Моя бібліотека</b> - збережені книги\n' +
    '   • Ваші улюблені книги\n' +
    '   • Швидкий доступ\n\n' +
    '👤 <b>Профіль</b> - ваша статистика\n' +
    '   • Персональні рекомендації\n' +
    '   • Статистика прослуховування\n' +
    '   • Улюблені жанри\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>⚡ ШВИДКІ ДІЇ:</b>\n' +
    '• ⚡ Швидкий пошук - миттєвий пошук\n' +
    '• ⭐ Мої улюблені - збережені книги\n' +
    '• 📚 Продовжити читати - останні книги\n' +
    '• 🎲 Випадкова книга - відкрийте нове\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>📚 ФОРМАТИ КНИГ:</b>\n' +
    '• 📄 PDF - завантажити файл\n' +
    '• 🌐 Онлайн - читати в браузері\n' +
    '• 🎧 Аудіо - слухати аудіокнигу\n\n' +
    '<b>🎬 ДІЇ З КНИГОЮ:</b>\n' +
    '• 📥 Завантажити - отримати файл\n' +
    '• ⭐ Оцінити - залишити відгук\n' +
    '• 💾 Зберегти - додати в улюблені\n' +
    '• 📊 Відгуки - читати коментарі\n' +
    '• 🔍 Схожі - знайти подібні\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>⚙️ КОМАНДИ:</b>\n' +
    '/start - Головне меню\n' +
    '/help - Ця довідка\n' +
    '/settings - Налаштування бота\n' +
    '/admin - Панель адміністратора (тільки для адмінів)\n\n' +
    '<b>💡 ПІДКАЗКИ:</b>\n' +
    '• Використовуйте кнопки для навігації\n' +
    '• Всі дії інтуїтивні та зрозумілі\n' +
    '• При помилці бот підкаже що робити\n\n' +
    '❓ Питання? Звертайтеся до адміністратора!';

  return ctx.reply(helpMessage, { parse_mode: 'HTML' });
});

// Команда /settings - налаштування бота (Завдання 30)
bot.command('settings', async (ctx) => {
  logger.userAction(ctx.from.id, 'settings_command');
  return ctx.scene.enter('SETTINGS_SCENE');
});

// Імпорт та реєстрація обробників
import userHandlers from './handlers/userHandlers';
import adminHandlers from './handlers/adminHandlers';

logger.info('Registering handlers...');

// Реєструємо adminHandlers ПЕРЕД userHandlers
// щоб команди оброблялися першими
adminHandlers(bot);
logger.info('Admin handlers registered');

userHandlers(bot);
logger.info('User handlers registered');

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
  const { getRandomBook } = await import('./database/recommendationFunctions');
  const book = await getRandomBook();

  if (book) {
    const { formatBookCaption } = await import('./utils/helpers');
    const { getEnhancedBookKeyboard } = await import('./keyboards/mainKeyboards');
    const caption = await formatBookCaption(book);

    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
      await ctx.replyWithPhoto(book.photo_file_id, {
        caption,
        parse_mode: 'HTML',
        reply_markup: getEnhancedBookKeyboard(book),
      });
    } else {
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: getEnhancedBookKeyboard(book),
      });
    }
  } else {
    await ctx.reply('❌ На жаль, зараз немає доступних книг');
  }
});

// Глобальний обробник "Назад до адмін-панелі"
bot.action('back_to_admin', async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const { isAdmin, getAdminStats, getPendingReviews, getPendingFeedbackMessages } = await import(
      './database/models'
    );
    const { getAdminMenuKeyboard } = await import('./keyboards/adminKeyboards');

    const adminCheck = await isAdmin(ctx.from!.id);
    if (!adminCheck) {
      await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
      return;
    }

    const stats = await getAdminStats();
    const pendingReviews = await getPendingReviews();
    const pendingFeedback = await getPendingFeedbackMessages();

    const reviewsAlert =
      pendingReviews.length > 0
        ? `📝 Відгуків на модерацію: <b>${pendingReviews.length}</b> 🔔`
        : '✅ Всі відгуки оброблені';

    const feedbackAlert =
      pendingFeedback.length > 0
        ? `📞 Нових повідомлень: <b>${pendingFeedback.length}</b> 🔔`
        : '✅ Всі повідомлення прочитані';

    // Видаляємо попереднє повідомлення
    try {
      await ctx.deleteMessage();
    } catch (error) {
      // Ігноруємо помилку
    }

    // Спочатку прибираємо reply клавіатуру
    await ctx.reply('🔄 Повертаємось до адмін-панелі...', {
      reply_markup: { remove_keyboard: true },
    });

    // Потім показуємо адмін-панель з inline клавіатурою
    await ctx.reply(
      '🛠️ <b>Панель адміністратора</b>\n\n' +
        '📊 <b>Статистика:</b>\n' +
        `📚 Книг в каталозі: ${stats.totalBooks}\n` +
        `${reviewsAlert}\n` +
        `${feedbackAlert}`,
      {
        parse_mode: 'HTML',
        reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
      }
    );
  } catch (error) {
    logger.error(
      'Error in back_to_admin handler',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('❌ Помилка при поверненні до адмін-панелі');
  }
});

// Graceful shutdown
let notificationScheduler: NodeJS.Timeout | null = null;

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);

  // Зупиняємо планувальник сповіщень
  if (notificationScheduler) {
    const { stopNotificationScheduler } = await import('./utils/notifications');
    stopNotificationScheduler(notificationScheduler);
  }

  // ✅ ВИПРАВЛЕНО: Закриваємо БД перед виходом
  try {
    await new Promise<void>((resolve, reject) => {
      db.close((err) => {
        if (err) {
          logger.error('Error closing database', err);
          reject(err);
        } else {
          logger.info('Database closed successfully');
          resolve();
        }
      });
    });
  } catch (error) {
    logger.error(
      'Failed to close database',
      error instanceof Error ? error : new Error(String(error))
    );
  }

  bot.stop(signal);
  process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

// Запуск бота
logger.info('Starting bot launch');
// ✅ ВИПРАВЛЕНО #14: видалено дублювання логів (вже логуються в handlers)

// Асинхронний запуск без блокування
(async () => {
  try {
    // ✅ ВИПРАВЛЕНО #1: Ініціалізація БД перед запуском бота
    logger.info('Initializing database...');
    const { initDatabase } = await import('./database/models');
    await initDatabase();
    logger.info('Database initialized successfully');

    logger.info('Launching bot...');
    await bot.launch({
      dropPendingUpdates: true,
    });
    logger.info('Bot launched successfully', { username: bot.botInfo?.username });

    // Запускаємо планувальник сповіщень (Завдання 31)
    const { startNotificationScheduler } = await import('./utils/notifications');
    notificationScheduler = startNotificationScheduler(bot);
    logger.info('Notification scheduler started');

    // ✅ ВИПРАВЛЕНО #70: запускаємо автоматичний backup
    const { startAutoBackup } = await import('./utils/autoBackup');
    startAutoBackup();
    logger.info('Automatic backup scheduler started');
  } catch (error) {
    logger.error('Bot launch error', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
})();
