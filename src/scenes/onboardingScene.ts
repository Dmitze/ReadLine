import { Scenes, Markup } from 'telegraf';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';
import { ALL_GENRES } from '../constants/genres';

interface OnboardingState {
  step?: number;
  selectedGenres?: string[];
  selectedContentTypes?: string[];
  userName?: string;
}

const onboardingScene = new Scenes.BaseScene<BotContext>('ONBOARDING_SCENE');

onboardingScene.enter(async (ctx: BotContext) => {
  const userName = ctx.from?.first_name || 'Воїне';
  const state = ctx.scene.state as OnboardingState;
  state.userName = userName;

  await ctx.reply(
    `⚔️ *ВІТАЄМО, ${userName.toUpperCase()}!*\n\n` +
      '═══════════════════════════════════════\n\n' +
      "🏰 Це *Warrior's Library* ⚔️\n" +
      '_Твоя легендарна фортеця з книг, подкастів і мудрості_\n\n' +
      '═══════════════════════════════════════\n\n' +
      '📚 *Що тебе чекає:*\n' +
      '• 75,000+ книг всіх жанрів\n' +
      '• Подкасти про саморозвиток та історію\n' +
      '• AI рекомендації саме для тебе\n' +
      '• Персональна статистика читання\n' +
      '• Синхронізація прогресу\n\n' +
      '⏱️ _Настройка займе 2 хвилини..._',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🚀 РОЗПОЧАТИ ПРИГОДУ', 'onboarding_step1_start')],
        [Markup.button.callback('⏭️ Пропустити налаштування', 'onboarding_skip')],
      ]).reply_markup,
    }
  );
});

onboardingScene.action('onboarding_step1_start', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🛡️準備 арсенал...');
  const state = ctx.scene.state as OnboardingState;
  state.selectedContentTypes = [];

  await ctx.reply(
    '📖 *КРОК 1: ВИБІР ФОРМАТІВ КОНТЕНТУ*\n\n' +
      '_(Прогрес: 1/3)_\n\n' +
      'Які формати тебе цікавлять? Можна вибрати кілька! 👇\n\n' +
      '📕 *Читання* - традиційні книги\n' +
      '🎧 *Аудіокниги* - слухай на ходу\n' +
      "🎙️ *Подкасти* - інтерв'ю, лекції, історії\n\n" +
      '_Ти завжди зможеш змінити це в налаштуваннях_ ⚙️',
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [
          Markup.button.callback('📕 Книги', 'onboarding_content_books'),
          Markup.button.callback('🎧 Аудіо', 'onboarding_content_audio'),
        ],
        [
          Markup.button.callback('🎙️ Подкасти', 'onboarding_content_podcasts'),
          Markup.button.callback('📌 Все разом', 'onboarding_content_all'),
        ],
        [Markup.button.callback('➡️ Далі', 'onboarding_step2_genres')],
        [Markup.button.callback('⏭️ Пропустити', 'onboarding_skip')],
      ]).reply_markup,
    }
  );
});

onboardingScene.action(/onboarding_content_(.+)/, async (ctx: BotContext) => {
  try {
    const state = ctx.scene.state as OnboardingState;
    const contentType = ctx.match[1];

    if (!state.selectedContentTypes) {
      state.selectedContentTypes = [];
    }

    const contentMap: { [key: string]: string } = {
      books: '📕 Книги',
      audio: '🎧 Аудіокниги',
      podcasts: '🎙️ Подкасти',
      all: '📚 Все разом',
    };

    if (contentType === 'all') {
      state.selectedContentTypes = ['books', 'audio', 'podcasts'];
      await ctx.answerCbQuery('✅ Все формати увімкнені!');
    } else {
      const index = state.selectedContentTypes.indexOf(contentType);
      if (index > -1) {
        state.selectedContentTypes.splice(index, 1);
        await ctx.answerCbQuery(`❌ ${contentMap[contentType]} видалено`);
      } else {
        state.selectedContentTypes.push(contentType);
        await ctx.answerCbQuery(`✅ ${contentMap[contentType]} додано`);
      }
    }

    const selectedText =
      state.selectedContentTypes.length > 0
        ? '\n\n✅ ' + state.selectedContentTypes.map((t) => contentMap[t]).join(' + ')
        : '';

    await ctx.editMessageText(
      '📖 *КРОК 1: ВИБІР ФОРМАТІВ КОНТЕНТУ*\n\n' +
        '_(Прогрес: 1/3)_\n\n' +
        'Які формати тебе цікавлять? Можна вибрати кілька! 👇\n\n' +
        '📕 *Читання* - традиційні книги\n' +
        '🎧 *Аудіокниги* - слухай на ходу\n' +
        "🎙️ *Подкасти* - інтерв'ю, лекції, історії\n\n" +
        '_Ти завжди зможеш змінити це в налаштуваннях_ ⚙️' +
        selectedText,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [
            Markup.button.callback('📕 Книги', 'onboarding_content_books'),
            Markup.button.callback('🎧 Аудіо', 'onboarding_content_audio'),
          ],
          [
            Markup.button.callback('🎙️ Подкасти', 'onboarding_content_podcasts'),
            Markup.button.callback('📌 Все разом', 'onboarding_content_all'),
          ],
          [Markup.button.callback('➡️ Далі', 'onboarding_step2_genres')],
          [Markup.button.callback('⏭️ Пропустити', 'onboarding_skip')],
        ]).reply_markup,
      }
    );
  } catch (error) {
    logger.error('Error in onboarding content selection', error);
    await ctx.answerCbQuery('❌ Помилка при виборі формату');
  }
});

onboardingScene.action('onboarding_step2_genres', async (ctx: BotContext) => {
  await ctx.answerCbQuery();

  const state = ctx.scene.state as OnboardingState;
  state.selectedGenres = [];

  try {
    const genres = ALL_GENRES;

    const genreButtons = [];
    for (let i = 0; i < genres.length; i += 2) {
      const row = [Markup.button.callback(genres[i], `onboarding_genre_${genres[i]}`)];
      if (i + 1 < genres.length) {
        row.push(Markup.button.callback(genres[i + 1], `onboarding_genre_${genres[i + 1]}`));
      }
      genreButtons.push(row);
    }

    genreButtons.push([
      Markup.button.callback('✅ ГОТОВО', 'onboarding_step3_finish'),
      Markup.button.callback('⏭️ Пропустити', 'onboarding_skip'),
    ]);

    const text =
      '⚔️ *КРОК 2: ОБЕРИ БИТВИ (ЖАНРИ)*\n\n' +
      '_(Прогрес: 2/3)_\n\n' +
      'Вибери 3-5 жанрів, щоб я міг рекомендувати книги саме для тебе! 🎯\n\n' +
      `Всього доступно: ${genres.length} жанрів\n\n` +
      '✨ *Обрано:* 0 жанрів\n\n' +
      '💡 _Змінювати можна завжди в налаштуваннях!_';

    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(genreButtons).reply_markup,
    });
  } catch (error) {
    logger.error(
      'Error in onboarding genre selection',
      error instanceof Error ? error : new Error(String(error))
    );
    await ctx.reply('⚠️ Помилка при завантаженні жанрів. Спробуйте пізніше.');
    await ctx.scene.leave();
  }
});

onboardingScene.action(/onboarding_genre_(.+)/, async (ctx: BotContext) => {
  const state = ctx.scene.state as OnboardingState;
  const genre = ctx.match[1];

  if (!state.selectedGenres) {
    state.selectedGenres = [];
  }

  const index = state.selectedGenres.indexOf(genre);
  if (index > -1) {
    state.selectedGenres.splice(index, 1);
    await ctx.answerCbQuery(`❌ ${genre} видалено`);
  } else {
    if (state.selectedGenres.length >= 5) {
      await ctx.answerCbQuery('⚠️ Максимум 5 жанрів', { show_alert: false });
      return;
    }
    state.selectedGenres.push(genre);
    await ctx.answerCbQuery(`✅ ${genre} додано`);
  }

  try {
    const genres = ALL_GENRES;
    const genreButtons = [];

    for (let i = 0; i < genres.length; i += 2) {
      const genre1 = genres[i];
      const isSelected1 = state.selectedGenres?.includes(genre1) || false;
      const row = [
        Markup.button.callback(
          `${isSelected1 ? '✅ ' : ''}${genre1}`,
          `onboarding_genre_${genre1}`
        ),
      ];
      if (i + 1 < genres.length) {
        const genre2 = genres[i + 1];
        const isSelected2 = state.selectedGenres?.includes(genre2) || false;
        row.push(
          Markup.button.callback(
            `${isSelected2 ? '✅ ' : ''}${genre2}`,
            `onboarding_genre_${genre2}`
          )
        );
      }
      genreButtons.push(row);
    }

    genreButtons.push([
      Markup.button.callback('✅ ГОТОВО', 'onboarding_step3_finish'),
      Markup.button.callback('⏭️ Пропустити', 'onboarding_skip'),
    ]);

    await ctx
      .editMessageText(
        '⚔️ *КРОК 2: ОБЕРИ БИТВИ (ЖАНРИ)*\n\n' +
          '_(Прогрес: 2/3)_\n\n' +
          'Вибери 3-5 жанрів, щоб я міг рекомендувати книги саме для тебе! 🎯\n\n' +
          `✨ *Обрано:* ${state.selectedGenres?.length || 0} жанрів\n\n` +
          '💡 _Змінювати можна завжди в налаштуваннях!_',
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(genreButtons).reply_markup,
        }
      )
      .catch((error: unknown) => {
        logger.debug('Failed to edit message', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  } catch (error) {
    logger.error(
      'Error updating genres display',
      error instanceof Error ? error : new Error(String(error))
    );
  }
});

onboardingScene.action('onboarding_step3_finish', async (ctx: BotContext) => {
  const state = ctx.scene.state as OnboardingState;
  const userId = ctx.from?.id;

  await ctx.answerCbQuery('🛡️ Збереження налаштувань...');

  if (userId) {
    try {
      const { markOnboardingComplete } = await import('../database/userFunctions');
      const { updateUserFavoriteGenres } = await import('../database/userFunctions');

      await markOnboardingComplete(userId, state.selectedGenres || []);

      if (state.selectedGenres && state.selectedGenres.length > 0) {
        await updateUserFavoriteGenres(userId, state.selectedGenres);
      }

      logger.info('User completed onboarding', {
        userId,
        selectedGenres: state.selectedGenres,
        selectedContentTypes: state.selectedContentTypes,
      });
    } catch (error) {
      logger.error(
        'Error saving onboarding data',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  let message = '🏰 *ВОЇН ГОТОВИЙ ДО БИТВИ!*\n\n';
  message += '═══════════════════════════════════════\n\n';

  if (state.selectedGenres && state.selectedGenres.length > 0) {
    message += `📚 *Твої улюблені жанри (${state.selectedGenres.length}):*\n`;
    message += state.selectedGenres.map((g) => `⚔️ ${g}`).join('\n');
    message += '\n\n';
  }

  if (state.selectedContentTypes && state.selectedContentTypes.length > 0) {
    message += '*Обрані формати:*\n';
    if (state.selectedContentTypes.includes('books')) message += '📕 Книги\n';
    if (state.selectedContentTypes.includes('audio')) message += '🎧 Аудіокниги\n';
    if (state.selectedContentTypes.includes('podcasts')) message += '🎙️ Подкасти\n';
    message += '\n';
  }

  message +=
    '═══════════════════════════════════════\n\n' +
    '✨ *Твої суперсили:*\n' +
    '🔍 Безстрашний пошук (75K+ творів)\n' +
    '💾 Персональна бібліотека (до 20 книг)\n' +
    '⭐ Оцінювання та рецензії\n' +
    '🤖 AI рекомендації на основі смаку\n' +
    '📊 Статистика читання та досягнення\n' +
    '🎁 Промокоди для розширення доступу\n\n' +
    '═══════════════════════════════════════\n\n' +
    '🚀 *Твоя легенда розпочалась!*\n' +
    '_Приємного читання! Сподіваємось, ти знайдеш свою улюблену книгу 📖_';

  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🚀 ПЕРЕЙТИ В БІБЛІОТЕКУ', 'onboarding_finish')],
    ]).reply_markup,
  });
});

onboardingScene.action(['onboarding_skip', 'onboarding_finish'], async (ctx: BotContext) => {
  const userId = ctx.from?.id;

  await ctx.answerCbQuery("👋 Вітаємо в Warrior's Library!");

  if (userId) {
    try {
      const { markOnboardingComplete } = await import('../database/userFunctions');
      await markOnboardingComplete(userId);
      logger.info('User finished onboarding', { userId });
    } catch (error) {
      logger.error(
        'Error marking onboarding complete',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  await ctx.reply(
    "⚔️ *ЛАСКАВО ПРОСИМО У WARRIOR'S LIBRARY!*\n\n" +
      '═══════════════════════════════════════\n\n' +
      '🗡️ *Що ти можеш робити:*\n\n' +
      '📚 *Каталог* - 75K+ книг, подкастів, аудіо\n' +
      '🔍 *Пошук* - по назві, автору, жанру, AI\n' +
      '📥 *Завантажити* - PDF, EPUB, FB2, MOBI\n' +
      '🎧 *Слухати* - аудіокниги та подкасти\n' +
      '❤️ *Зберігати* - булівайня 20 улюблених\n' +
      '⭐ *Оцінювати* - рецензії та рейтинги\n' +
      '🤖 *AI Допомога* - розумні рекомендації\n' +
      '🏆 *Рейтинги* - топ книг та авторів\n' +
      '🎁 *Промокоди* - розширення доступу\n' +
      '📊 *Профіль* - твоя статистика та досягнення\n' +
      '🎙️ *Подкасти* - спеціальні аудіопрограми\n\n' +
      '═══════════════════════════════════════\n\n' +
      '💡 _Натисни кнопку нижче для старту!_',
    {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard(),
    }
  );

  return ctx.scene.leave();
});

export default onboardingScene;
