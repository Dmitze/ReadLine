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

// Встановлюємо персистентне головне меню
bot.telegram.setChatMenuButton({
  menuButton: {
    type: 'commands',
  },
});

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
      '⚙️ Налаштування',
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
      '╔═════════════════════════════════╗\n' +
      '   ⚔️ *Warrior\'s Library* ⚔️\n' +
      '   🗡️ Легендарна Бібліотека 📚\n' +
      '╚═════════════════════════════════╝\n\n' +
      `🗡️ Вітаємо, *${firstName}*!\n\n` +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '*Твоя Легенда Читача Розпочина:*\n' +
      'Найбільша колекція книг українською мовою. ' +
      'Дослідж нові світи, скупляй скарби та отримуй рекомендації від AI Мудреця!\n\n' +
      '📚 *МОЖЛИВОСТІ ТА БОЇВКИ:*\n\n' +
      '🔍 Крамниця Знань - пошук за всіма критеріями\n' +
      '⭐ Топ книги - найпопулярніші твори\n' +
      '🆕 Новинки - свіжі надходження\n' +
      '❤️ Мої Скарби - твоя персональна колекція\n' +
      '⭐ Оцінки та Відгуки - поділися враженнями\n' +
      '📥 Завантаженння - читай у будь-якому форматі\n' +
      '🎧 Аудіолегенди - слухай розповіді\n' +
      '🌐 Онлайн Читання - дослідж в браузері\n' +
      '🤖 AI Рекомендації - персональний вибір\n' +
      '📊 Воїнська Статистика - розпочунок свою славу\n\n' +
      '⚡ *КОМАНДИ ВОЇНА:*\n' +
      '/start - Головне Меню\n' +
      '/help - Доступні можливості\n' +
      '/cancel - Скасувати\n' +
      '/admin - Панель Командира\n\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
      '👇 *Обери свою першу битву:*';

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
    '╔═════════════════════════════════╗\n' +
    '  ⚔️ <b>ДОВІДКА ВОЇНА</b> 🗡️\n' +
    '╚═════════════════════════════════╝\n\n' +
    '<b>🎯 ОСНОВНІ БОЇВКИ:</b>\n\n' +
    '📚 <b>Крамниця Знань</b> - дослідь жанри\n' +
    '   ⚔️ Обери жанр\n' +
    '   ⚔️ Переглядай книги\n\n' +
    '🔍 <b>Безстрашний Пошук</b> - точна розвідка\n' +
    '   ⚔️ За назвою, автором, жанром\n' +
    '   ⚔️ Вдосконалені фільтри\n\n' +
    '⭐ <b>Топ Битв</b> - найславніші твори\n' +
    '   ⚔️ За рейтингом воїнів\n' +
    '   ⚔️ Скриня скарбів\n\n' +
    '🆕 <b>Свіжі Легенди</b> - нові завоювання\n' +
    '   ⚔️ Сучасні надходження\n' +
    '   ⚔️ Завжди цікавиці\n\n' +
    '❤️ <b>Скарбниця Воїна</b> - улюблені скарби\n' +
    '   ⚔️ Твої обрані книги\n' +
    '   ⚔️ Швидкий доступ\n\n' +
    '👤 <b>Боєва Статистика</b> - твій прогрес\n' +
    '   ⚔️ Персональні рекомендації\n' +
    '   ⚔️ Твоя слава читача\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>⚡ МАГІЧНІ БОЇВКИ:</b>\n' +
    '⚔️ Швидкий Удар - 🔍 Миттєвий пошук\n' +
    '⚔️ Улюблені - ❤️ Твої скарби\n' +
    '⚔️ Продовжити Битву - 📚 Останні книги\n' +
    '⚔️ Випадковий Супротив - 🎲 Нова битва\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>📚 ФОРМАТИ ДЛЯ ЧИТАННЯ:</b>\n' +
    '📄 PDF - завантажити легенду\n' +
    '🌐 Онлайн - читати в брамі\n' +
    '🎧 Аудіо - слухати розповідь\n\n' +
    '<b>⚔️ БОЇВКИ З КНИГОЮ:</b>\n' +
    '📥 Завантажити - отримати скарб\n' +
    '⭐ Оцінити - покажи хисність\n' +
    '❤️ Зберегти - додай в арсенал\n' +
    '📊 Виклики - читай поради\n' +
    '🔍 Схожі - знайди союзників\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '<b>⚙️ КОМАНДИ КОМАНДИРА:</b>\n' +
    '/start - Головна база\n' +
    '/help - Ця довідка\n' +
    '/settings - Налаштування бойового снаряжу\n' +
    '/admin - Панель Командира (тільки адміни)\n\n' +
    '<b>💡 СТРАТЕГІЧНІ ПІДКАЗКИ:</b>\n' +
    '⚔️ Використовуй кнопки для тактики\n' +
    '⚔️ Всі дії просте й смертоносне\n' +
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

// Глобальний обробник "Назад до меню"
bot.action('back_to_menu', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    await ctx.reply('👋 Повертаємось до головного меню', {
      reply_markup: getMainMenuKeyboard(),
    });
    logger.userAction(ctx.from!.id, 'back_to_menu');
  } catch (error) {
    logger.error(
      'Error in back_to_menu handler',
      error instanceof Error ? error : new Error(String(error))
    );
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

  // Очищаємо rate limiters
  const { cleanupRateLimiters } = await import('./middleware/rateLimit');
  cleanupRateLimiters();

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
