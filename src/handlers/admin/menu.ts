import { Telegraf, Markup } from 'telegraf';
import {
  isAdmin,
  getExtendedAdminStats,
  getAdminStats,
  getPendingReviews,
  getPendingFeedbackMessages,
} from '../../database/models';
import { getAdminMenuKeyboard } from '../../keyboards/adminKeyboards';
import { logger } from '../../utils/logger';
import { BotContext } from '../../types/telegraf';

export default (bot: Telegraf<BotContext>) => {
  bot.command('admin', async (ctx) => {
    logger.info('/admin command received', { userId: ctx.from?.id });
    (async () => {
      if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return;
      }

      const adminCheck = await isAdmin(ctx.from.id);

      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return;
      }

      try {
        const stats = await getExtendedAdminStats();
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

        let panelText = '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n';
        panelText += '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
        panelText += '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n';
        panelText += `📚 Скарбів у колекції: <b>${stats.totalBooks}</b>\n`;
        panelText += `👥 Воїнів в армії: <b>${stats.totalUsers}</b>\n`;
        panelText += `⭐ Слава книг: <b>${stats.avgRating}</b>\n\n`;
        panelText += `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        panelText += `${reviewsAlert}\n`;
        panelText += `${feedbackAlert}`;

        await ctx.reply(panelText, {
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        });
      } catch (error) {
        logger.error(
          'Error in admin command',
          error instanceof Error ? error : new Error(String(error)),
          { userId: ctx.from?.id }
        );

        const basicStats = await getAdminStats();
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

        await ctx.reply(
          '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
            '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n' +
            `📚 Скарбів у колекції: <b>${basicStats.totalBooks}</b>\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${reviewsAlert}\n` +
            `${feedbackAlert}`,
          {
            parse_mode: 'HTML',
            reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
          }
        );
      }
    })().catch((error) => {
      logger.error(
        'Error in admin command',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при отриманні даних адміністратора.');
    });
    return;
  });

  bot.action('add_book', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Відкриваємо форму додавання книги...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('ADD_BOOK_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering add book scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до додавання книги.');
    });
    return;
  });

  bot.action('add_podcast', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Відкриваємо форму додавання підкасту...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('ADD_PODCAST_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering add podcast scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до додавання підкасту.');
    });
    return;
  });

  bot.action('manage_books', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження списку книг...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('MANAGE_BOOKS_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering manage books scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до управління книгами.');
    });
    return;
  });

  bot.action('manage_promo_codes', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження системи промокодів...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('PROMO_ADMIN_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering promo admin scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до керування промокодами.');
    });
    return;
  });

  bot.action('manage_extended_book_info', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження керування інформацією про книги...');

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      ctx.scene.enter('EDIT_EXTENDED_BOOK_INFO_SCENE');
    })().catch((error) => {
      logger.error(
        'Error entering edit extended book info scene',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.reply('❌ Виникла помилка при переході до редагування інформації про книги.');
    });
    return;
  });

  bot.action('admin_back', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery();

      const adminCheck = await isAdmin(ctx.from.id);
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

      await ctx.editMessageText(
        '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n' +
          `📚 Скарбів у колекції: <b>${stats.totalBooks}</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${reviewsAlert}\n` +
          `${feedbackAlert}`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        }
      );
    })().catch((error) => {
      logger.error(
        'Error returning to admin panel',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  bot.action('promo_back', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery();
      await ctx.scene.leave();

      const adminCheck = await isAdmin(ctx.from.id);
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

      await ctx.reply(
        '⚔️ <b>ПАНЕЛЬ КОМАНДИРА</b>\n\n' +
          '━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
          '📊 <b>ВОЇНСЬКА СТАТИСТИКА:</b>\n' +
          `📚 Скарбів у колекції: <b>${stats.totalBooks}</b>\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `${reviewsAlert}\n` +
          `${feedbackAlert}`,
        {
          parse_mode: 'HTML',
          reply_markup: getAdminMenuKeyboard(pendingReviews.length, pendingFeedback.length),
        }
      );
    })().catch((error) => {
      logger.error(
        'Error returning to admin panel from promo',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  // Інструкції для адміністратора
  bot.action('admin_help', async (ctx: BotContext) => {
    (async () => {
      await ctx.answerCbQuery();

      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }

      const helpMessage =
        '╔════════════════════════════════════════╗\n' +
        '  ⚔️ <b>ПАНЕЛЬ КОМАНДИРА - ІНСТРУКЦІЇ</b> 🗡️\n' +
        '╚════════════════════════════════════════╝\n\n' +
        'Виберіть розділ для детальної інформації:\n\n' +
        '📚 Управління контентом\n' +
        '🎁 Промокоди та замовлення\n' +
        '📊 Модерація та відгуки\n' +
        '📈 Статистика\n' +
        '💡 Поради для адміністраторів\n\n' +
        'Натискай кнопки внизу 👇';

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📚 Контент', 'admin_help_content')],
        [Markup.button.callback('🎁 Промокоди', 'admin_help_promo')],
        [Markup.button.callback('📊 Модерація', 'admin_help_moderation')],
        [Markup.button.callback('📈 Статистика', 'admin_help_stats')],
        [Markup.button.callback('💡 Поради', 'admin_help_tips')],
        [Markup.button.callback('← Назад в меню', 'admin_back')],
      ]);

      return ctx.editMessageText(helpMessage, { ...keyboard, parse_mode: 'HTML' });
    })().catch((error) => {
      logger.error(
        'Error in admin help',
        error instanceof Error ? error : new Error(String(error)),
        { userId: ctx.from?.id }
      );
      ctx.answerCbQuery('❌ Помилка');
    });
    return;
  });

  // Розділ: Управління контентом
  bot.action('admin_help_content', async (ctx: BotContext) => {
    const message =
      '<b>📚 УПРАВЛІННЯ КОНТЕНТОМ</b>\n\n' +
      '<b>➕ ДОДАТИ КНИГУ</b>\n' +
      '  Крок 1: Натисни "➕ Додати книгу"\n' +
      '  Крок 2: Заповни форму:\n' +
      '    • Назва книги\n' +
      '    • Автор\n' +
      '    • Жанр (виберіть зі списку або новий)\n' +
      '    • Опис (для користувачів)\n' +
      '    • Файл (PDF, EPUB, FB2, MOBI)\n' +
      '  Крок 3: Підтвердіть додавання\n\n' +
      '<b>🎙️ ДОДАТИ ПОДКАСТ</b>\n' +
      '  Крок 1: Натисни "🎙️ Підкаст"\n' +
      '  Крок 2: Заповни форму:\n' +
      '    • Назва подкасту\n' +
      '    • Автор\n' +
      '    • Опис\n' +
      '    • Аудіофайл або посилання\n' +
      '  Крок 3: Додавання завершено\n\n' +
      '<b>📚 РЕДАГУВАННЯ КНИГ</b>\n' +
      '  Натисни "📚 Редагування"\n' +
      '  • Шукай книгу за ID або назвою\n' +
      '  • Редагуй інформацію\n' +
      '  • Видаляй застарілі книги\n\n' +
      '<b>✨ ДЕТАЛІ (РОЗШИРЕНІ ДАНІ)</b>\n' +
      '  Натисни "✨ Деталі"\n' +
      '  Додавай/редагуй додаткову інформацію:\n' +
      '    • Рівень читання\n' +
      '    • Вік аудиторії\n' +
      '    • Позначки та теги\n' +
      '    • Синопсис детальний\n\n' +
      '<i>← Назад в меню інструкцій</i>';

    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('← Назад в меню', 'admin_help'),
      Markup.button.callback('В головне меню', 'admin_back'),
    ]);

    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
  });

  // Розділ: Промокоди та замовлення
  bot.action('admin_help_promo', async (ctx: BotContext) => {
    const message =
      '<b>🎁 ПРОМОКОДИ ТА ЗАМОВЛЕННЯ</b>\n\n' +
      '<b>🎁 УПРАВЛІННЯ ПРОМОКОДАМИ</b>\n' +
      '  Натисни "🎁 Промокоди"\n\n' +
      '  <b>Додавання промокодів:</b>\n' +
      '    1. Натисни "➕ Додати промокоди"\n' +
      '    2. Вгорі вкажи кількість кодів\n' +
      '    3. Коди генеруються автоматично\n' +
      '    4. Скопіюй список та поділись\n\n' +
      '  <b>Видалення / Переносення кодів:</b>\n' +
      '    1. Натисни "❌ Видалити" для коду\n' +
      '    2. Або дай промокод користувачу вручну\n\n' +
      '  <b>Перегляд активних кодів:</b>\n' +
      '    1. Натисни "📊 Статистика промокодів"\n' +
      '    2. Дивися яких кодів залишилось\n' +
      '    3. Коли мало - додай нових\n\n' +
      '<b>📋 ЗАМОВЛЕННЯ (ЯКАБУ ПЕРЕКАЗ)</b>\n' +
      '  Натисни "📋 Замовлення"\n\n' +
      '  <b>Що це?</b>\n' +
      '    • Користувачі можуть замовити\n' +
      '    • фізичну копію книги від Yakaboo\n' +
      '    • Заявки приходять у адмін-панель\n\n' +
      '  <b>Управління заявками:</b>\n' +
      '    1. Натисни "📋 Замовлення"\n' +
      '    2. Переглядай мову замовлень\n' +
      '    3. Помічай як оброблені\n' +
      '    4. Зв\'яжись з користувачем\n\n' +
      '<i>← Назад в меню інструкцій</i>';

    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('← Назад в меню', 'admin_help'),
      Markup.button.callback('В головне меню', 'admin_back'),
    ]);

    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
  });

  // Розділ: Модерація
  bot.action('admin_help_moderation', async (ctx: BotContext) => {
    const message =
      '<b>📊 МОДЕРАЦІЯ ТА ВІДГУКИ</b>\n\n' +
      '<b>📝 МОДЕРАЦІЯ ВІДГУКІВ</b>\n' +
      '  Натисни "📝 Модерація"\n\n' +
      '  <b>Що тут?</b>\n' +
      '    • Всі нові рецензії від користувачів\n' +
      '    • Очікують на перевірку\n' +
      '    • Лічільник невиконаних завдань\n\n' +
      '  <b>Як модерувати?</b>\n' +
      '    1. Прочитай рецензію\n' +
      '    2. ✅ Опублікувати - вона видима всім\n' +
      '    3. ❌ Видалити - якщо спам/образа\n' +
      '    4. Готово! Наступна рецензія\n\n' +
      '  <b>Поради:</b>\n' +
      '    • Модерируй регулярно - не накопичуй\n' +
      '    • Видаляй рецензии с бранью\n' +
      '    • Поверни спам-повідомлення\n\n' +
      '<b>💬 ЗВОРОТНІЙ ЗВ\'ЯЗОК (ПОВІДОМЛЕННЯ)</b>\n' +
      '  Натисни "💬 Повідомлення"\n\n' +
      '  <b>Що це?</b>\n' +
      '    • Помилки з боту\n' +
      '    • Скарги користувачів\n' +
      '    • Пропозиції покращень\n' +
      '    • Питання про функціонал\n\n' +
      '  <b>Управління:</b>\n' +
      '    1. Виберіть непрочитане повідомлення\n' +
      '    2. ✉️ Відповісти - напиши відповідь\n' +
      '    3. ✅ Прочитано - позначь як розібраним\n' +
      '    4. 👤 Профіль - перейди до користувача\n\n' +
      '<i>← Назад в меню інструкцій</i>';

    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('← Назад в меню', 'admin_help'),
      Markup.button.callback('В головне меню', 'admin_back'),
    ]);

    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
  });

  // Розділ: Статистика
  bot.action('admin_help_stats', async (ctx: BotContext) => {
    const message =
      '<b>📈 СТАТИСТИКА БОТА</b>\n\n' +
      '<b>📊 ЩО ПОКАЗУЄ СТАТИСТИКА</b>\n\n' +
      '  📚 <b>Скарбів у колекції</b>\n' +
      '    Загальна кількість книг та подкастів\n' +
      '    в системі (всіх видань)\n\n' +
      '  👥 <b>Воїнів в армії</b>\n' +
      '    Кількість зареєстрованих користувачів\n' +
      '    Активні та неактивні юзери\n\n' +
      '  💾 <b>Збережено книг</b>\n' +
      '    Скільки разів користувачі зберегли\n' +
      '    книги в улюблені\n\n' +
      '  ⭐ <b>Слава книг (рейтинг)</b>\n' +
      '    Середній рейтинг всіх книг\n' +
      '    від 1 до 5 зірок\n\n' +
      '  🎁 <b>Дійсних промокодів</b>\n' +
      '    Скільки активних кодів залишилось\n' +
      '    Скільки використано\n\n' +
      '  📥 <b>Завантажень</b>\n' +
      '    Скільки користувачів скачали файли\n\n' +
      '<b>КОРИСТЬ СТАТИСТИКИ</b>\n\n' +
      '  ✓ Бачиш популярність контенту\n' +
      '  ✓ Перевіряєш скільки активних юзерів\n' +
      '  ✓ Дізнаєшся коли додавати контент\n' +
      '  ✓ Контролюєш кількість промокодів\n' +
      '  ✓ Оцінюєш ефективність модерації\n\n' +
      '<i>← Назад в меню інструкцій</i>';

    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('← Назад в меню', 'admin_help'),
      Markup.button.callback('В головне меню', 'admin_back'),
    ]);

    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
  });

  // Розділ: Поради для адміністраторів
  bot.action('admin_help_tips', async (ctx: BotContext) => {
    const message =
      '<b>💡 ПОРАДИ ДЛЯ АДМІНІСТРАТОРІВ</b>\n\n' +
      '<b>УПРАВЛІННЯ КОНТЕНТОМ</b>\n' +
      '  ✓ Додавай книги регулярно\n' +
      '    • Щодня 2-3 нові видання\n' +
      '    • Сортуй по жанрам\n' +
      '    • Пиши опис цікаво\n\n' +
      '  ✓ Редагуй застарілі записи\n' +
      '    • Удаляй дублі\n' +
      '    • Поправляй помилки в назвах\n' +
      '    • Оновлюй посилання на файли\n\n' +
      '  ✓ Слідкуй за якістю\n' +
      '    • Тестуй завантаження файлів\n' +
      '    • Перевіряй читабельність\n' +
      '    • Видаляй порушені завантаження\n\n' +
      '<b>МОДЕРАЦІЯ</b>\n' +
      '  ✓ Модерируй РЕГУЛЯРНО\n' +
      '    • Кожен день перевіряй відгуки\n' +
      '    • Не чекай накопичення\n' +
      '    • Швидко реагуй на скарги\n\n' +
      '  ✓ Будь справедливий\n' +
      '    • Видаляй тільки явний спам\n' +
      '    • Зберігай конструктивну критику\n' +
      '    • Не видаляй через незгоду\n\n' +
      '  ✓ Відповідай користувачам\n' +
      '    • Дякуй за рецензії\n' +
      '    • Вирішуй питання швидко\n' +
      '    • Будь ввічливий\n\n' +
      '<b>ПРОМОКОДИ</b>\n' +
      '  ✓ Слідкуй за кількістю\n' +
      '    • Коли мало - додавай нові\n' +
      '    • Розповсюджуй справедливо\n' +
      '    • Не давай одному багато\n\n' +
      '  ✓ Роби бекап списків\n' +
      '    • Копіюй активні коди\n' +
      '    • Зберігай в безпечному місці\n\n' +
      '<b>ЗАГАЛЬНІ ПРАВИЛА</b>\n' +
      '  ✓ Будь системним\n' +
      '    • Плануй свої дії\n' +
      '    • Щодня перевіряй сповіщення\n' +
      '    • Роби звіти про стан\n\n' +
      '  ✓ Спілкуйся з користувачами\n' +
      '    • Привітай нових користувачів\n' +
      '    • Відповідай на запитання\n' +
      '    • Слухай пропозиції\n\n' +
      '  ✓ Розвивайся\n' +
      '    • Дізнавайся нові функції\n' +
      '    • Вивчай тренди у книгах\n' +
      '    • Поширюй корисну інформацію\n\n' +
      '<i>← Назад в меню інструкцій</i>';

    const backButton = Markup.inlineKeyboard([
      Markup.button.callback('← Назад в меню', 'admin_help'),
      Markup.button.callback('В головне меню', 'admin_back'),
    ]);

    return ctx.editMessageText(message, { ...backButton, parse_mode: 'HTML' });
  });
};
