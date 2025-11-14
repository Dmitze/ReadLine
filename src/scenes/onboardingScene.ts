import { Scenes, Markup } from 'telegraf';
import { getGenres } from '../database/models';
import { markOnboardingComplete } from '../database/userFunctions';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';

interface OnboardingState {
  step?: number;
  selectedGenres?: string[];
}

const onboardingScene = new Scenes.BaseScene<BotContext>('ONBOARDING_SCENE');

// Крок 1: Привітання
onboardingScene.enter(async (ctx: BotContext) => {
  const userName = ctx.from?.first_name || 'Друже';
  
  await ctx.reply(
    `👋 *Вітаємо, ${userName}!*\n\n` +
    `Я Warrior's Library - твій особистий бібліотечний помічник! 📚\n\n` +
    `Давай швидко познайомимося та налаштуємо бота під тебе.\n\n` +
    `Це займе лише 1 хвилину! ⏱️`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Почати знайомство', 'onboarding_start')],
        [Markup.button.callback('⏭️ Пропустити', 'onboarding_skip')]
      ]).reply_markup
    }
  );
});

// Початок онбордингу
onboardingScene.action('onboarding_start', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  
  await ctx.reply(
    `📚 *ЩО Я ВМІЮ:*\n\n` +
    `🔍 *Пошук книг*\n` +
    `Швидко знайду будь-яку книгу за назвою, автором або жанром\n\n` +
    `⭐ *Збережені книги*\n` +
    `Зберігай улюблені книги у свою особисту бібліотеку\n\n` +
    `🎧 *Аудіокниги*\n` +
    `Слухай книги в дорозі або перед сном\n\n` +
    `🤖 *AI-помічник*\n` +
    `Отримуй персональні рекомендації від штучного інтелекту\n\n` +
    `🏷️ *Теги та фільтри*\n` +
    `Знаходь книги за настроєм, темою або жанром`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('➡️ Далі', 'onboarding_genres')]
      ]).reply_markup
    }
  );
});

// Вибір жанрів
onboardingScene.action('onboarding_genres', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  
  const state = ctx.scene.state as OnboardingState;
  state.selectedGenres = [];
  
  // ✅ ВИПРАВЛЕНО #27: кешування жанрів
  const { cache, CACHE_KEYS, CACHE_TTL } = await import('../utils/cache');
  const genres = await cache.getOrSet(
    CACHE_KEYS.GENRES,
    getGenres,
    CACHE_TTL.LONG
  );
  
  if (genres.length === 0) {
    // Якщо жанрів немає, пропускаємо цей крок
    await ctx.reply(
      `✅ *Все готово!*\n\n` +
      `Тепер ти можеш користуватися всіма функціями бота.\n\n` +
      `Натисни кнопку нижче щоб почати! 👇`,
      {
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🎉 Почати користуватися', 'onboarding_finish')]
        ]).reply_markup
      }
    );
    return;
  }
  
  // Створюємо кнопки з жанрами (по 2 в рядок)
  const genreButtons = [];
  for (let i = 0; i < genres.length; i += 2) {
    const row = [
      Markup.button.callback(genres[i], `onboarding_genre_${genres[i]}`)
    ];
    if (i + 1 < genres.length) {
      row.push(Markup.button.callback(genres[i + 1], `onboarding_genre_${genres[i + 1]}`));
    }
    genreButtons.push(row);
  }
  
  genreButtons.push([
    Markup.button.callback('✅ Готово', 'onboarding_genres_done'),
    Markup.button.callback('⏭️ Пропустити', 'onboarding_finish')
  ]);
  
  await ctx.reply(
    `🎯 *ОБЕРИ УЛЮБЛЕНІ ЖАНРИ*\n\n` +
    `Вибери 3-5 жанрів які тобі подобаються.\n` +
    `Це допоможе мені підбирати книги саме для тебе! 📖\n\n` +
    `Обрано: 0`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(genreButtons).reply_markup
    }
  );
});

// Вибір конкретного жанру
onboardingScene.action(/onboarding_genre_(.+)/, async (ctx: BotContext) => {
  const state = ctx.scene.state as OnboardingState;
  const genre = ctx.match[1];
  
  if (!state.selectedGenres) {
    state.selectedGenres = [];
  }
  
  // Перевіряємо чи жанр вже вибраний
  const index = state.selectedGenres.indexOf(genre);
  if (index > -1) {
    // Видаляємо жанр
    state.selectedGenres.splice(index, 1);
    await ctx.answerCbQuery(`❌ ${genre} видалено`);
  } else {
    // Додаємо жанр
    if (state.selectedGenres.length >= 5) {
      await ctx.answerCbQuery('⚠️ Максимум 5 жанрів');
      return;
    }
    state.selectedGenres.push(genre);
    await ctx.answerCbQuery(`✅ ${genre} додано`);
  }
  
  // Оновлюємо повідомлення
  // ✅ ВИПРАВЛЕНО #27: кешування жанрів
  const { cache, CACHE_KEYS, CACHE_TTL } = await import('../utils/cache');
  const genres = await cache.getOrSet(
    CACHE_KEYS.GENRES,
    getGenres,
    CACHE_TTL.LONG
  );
  const genreButtons = [];
  
  for (let i = 0; i < genres.length; i += 2) {
    const genre1 = genres[i];
    const isSelected1 = state.selectedGenres.includes(genre1);
    const row = [
      Markup.button.callback(
        `${isSelected1 ? '✅ ' : ''}${genre1}`,
        `onboarding_genre_${genre1}`
      )
    ];
    if (i + 1 < genres.length) {
      const genre2 = genres[i + 1];
      const isSelected2 = state.selectedGenres.includes(genre2);
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
    Markup.button.callback('✅ Готово', 'onboarding_genres_done'),
    Markup.button.callback('⏭️ Пропустити', 'onboarding_finish')
  ]);
  
  await ctx.editMessageText(
    `🎯 *ОБЕРИ УЛЮБЛЕНІ ЖАНРИ*\n\n` +
    `Вибери 3-5 жанрів які тобі подобаються.\n` +
    `Це допоможе мені підбирати книги саме для тебе! 📖\n\n` +
    `Обрано: ${state.selectedGenres.length}`,
    {
      parse_mode: 'Markdown',
      reply_markup: Markup.inlineKeyboard(genreButtons).reply_markup
    }
  ).catch(() => {});
});

// Завершення вибору жанрів
onboardingScene.action('onboarding_genres_done', async (ctx: BotContext) => {
  const state = ctx.scene.state as OnboardingState;
  const userId = ctx.from?.id;
  
  await ctx.answerCbQuery('✅ Жанри збережено!');
  
  // Зберігаємо улюблені жанри в БД та профіль
   if (userId) {
     await markOnboardingComplete(userId, state.selectedGenres || []).then(() => {
       logger.info('User completed onboarding with genres', { 
         userId, 
         selectedGenres: state.selectedGenres 
       });
     }).catch((error) => {
       logger.error('Error saving onboarding data', error instanceof Error ? error : new Error(String(error)));
     });
     
     // Додатково оновлюємо улюблені жанри в профілі
     if (state.selectedGenres && state.selectedGenres.length > 0) {
       const { updateUserFavoriteGenres } = await import('../database/userFunctions');
       await updateUserFavoriteGenres(userId, state.selectedGenres).catch((error) => {
         logger.error('Error updating favorite genres', error instanceof Error ? error : new Error(String(error)));
       });
     }
   }
  
  let message = `🎉 *ЧУДОВО!*\n\n`;
  
  if (state.selectedGenres && state.selectedGenres.length > 0) {
    message += `Ти обрав ${state.selectedGenres.length} ${state.selectedGenres.length === 1 ? 'жанр' : 'жанри'}:\n`;
    message += state.selectedGenres.map(g => `• ${g}`).join('\n');
    message += `\n\nТепер я буду рекомендувати тобі книги з цих жанрів! 📚\n\n`;
  }
  
  message += `✅ Онбординг завершено!\n\n`;
  message += `Натисни кнопку нижче щоб почати користуватися ботом 👇`;
  
  await ctx.reply(message, {
    parse_mode: 'Markdown',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Почати користуватися', 'onboarding_finish')]
    ]).reply_markup
  });
});

// Пропуск або завершення
onboardingScene.action(['onboarding_skip', 'onboarding_finish'], async (ctx: BotContext) => {
  const userId = ctx.from?.id;
  
  await ctx.answerCbQuery('👋 Вітаємо в Warrior\'s Library!');
  
  // Позначаємо онбординг як завершений навіть якщо пропустили
   if (userId) {
     await markOnboardingComplete(userId).then(() => {
       logger.info('User finished onboarding', { userId });
     }).catch((error) => {
       logger.error('Error marking onboarding complete', error instanceof Error ? error : new Error(String(error)));
     });
   }
  
  await ctx.reply(
    `🎉 *Ласкаво просимо до Warrior's Library!*\n\n` +
    `Тепер ти можеш:\n` +
    `📖 Шукати книги через каталог\n` +
    `🔍 Використовувати швидкий пошук\n` +
    `⭐ Зберігати улюблені книги\n` +
    `🎧 Слухати аудіокниги\n` +
    `🤖 Отримувати AI-рекомендації\n\n` +
    `Приємного читання! 📚`,
    {
      parse_mode: 'Markdown',
      reply_markup: getMainMenuKeyboard()
    }
  );
  
  return ctx.scene.leave();
});

export default onboardingScene;
