import { Scenes } from 'telegraf';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { escapeHtml } from '../utils/helpers';
import { 
  getSmartRecommendations
} from '../database/recommendationFunctions';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { handleResult } from '../utils/resultHandler';

const profileScene = new Scenes.BaseScene('PROFILE_SCENE');

profileScene.enter(async (ctx: BotContext) => {
  if (!ctx.from?.id) {
    await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
    return ctx.scene?.leave();
  }
  
  const userId = ctx.from.id;

  const firstName = escapeHtml(ctx.from.first_name || '');
  const lastName = escapeHtml(ctx.from.last_name || '');
  const username = ctx.from.username ? `@${escapeHtml(ctx.from.username)}` : 'не встановлено';

  // Отримуємо статистику користувача
  const { getUserDetailedStats } = await import('../database/userFunctions');
  const stats = await getUserDetailedStats(userId);
  
  let profileText = '<b>👤 Ваш профіль</b>\n\n';
  profileText += `🆔 ID: ${userId}\n`;
  profileText += `👤 Ім'я: ${firstName} ${lastName}\n`;
  profileText += `🔖 Username: ${username}\n\n`;
  profileText += '<b>📊 Статистика</b>\n';
  profileText += `💾 Збережених книг: ${stats.savedBooksCount}\n`;
  profileText += `⭐ Залишено відгуків: ${stats.reviewsCount}\n`;
  
  // Час прослуховування
  const hours = Math.floor(stats.totalListeningTime / 3600);
  const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
  profileText += `🎧 Прослухано: ${hours}г ${minutes}хв\n`;
  
  // Отримуємо збережені книги для аналізу жанрів
  const { getSavedBooks } = await import('../database/models');
  const { getBookTags } = await import('../database/tagFunctions');
  const savedBooks = await getSavedBooks(userId);
  
  // Збираємо жанри зі збережених книг
  const genresFromBooks = new Set<string>();
  savedBooks.forEach(book => {
    if (book.genre) {
      genresFromBooks.add(book.genre);
    }
  });
  
  // Об'єднуємо з улюбленими жанрами
  const allGenres = [...new Set([...stats.favoriteGenres, ...Array.from(genresFromBooks)])];
  
  if (allGenres.length > 0) {
    profileText += `\n<b>📚 Улюблені жанри:</b>\n`;
    allGenres.slice(0, 5).forEach((genre, i) => {
      profileText += `${i + 1}. ${genre}\n`;
    });
  } else {
    profileText += `\n<i>📚 Улюблені жанри ще не встановлені</i>\n`;
  }
  
  if (savedBooks.length > 0) {
    const allUserTags = new Set<string>();
    for (const book of savedBooks) {
      const bookTags = await getBookTags(book.id!);
      bookTags.forEach(tag => allUserTags.add(tag.name));
    }
    
    if (allUserTags.size > 0) {
      profileText += `\n<b>🏷️ Ваші інтереси (теги):</b>\n`;
      const tagsArray = Array.from(allUserTags).slice(0, 10);
      profileText += tagsArray.map(tag => `#${tag}`).join(' ') + '\n';
    }
  }
  profileText += '\n<i>💡 Продовжуйте читати та залишати відгуки!</i>';

  const { Markup } = await import('telegraf');
  
  await ctx.reply(profileText, { 
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [{ text: '🤖 Персональні рекомендації', callback_data: 'show_personal_collection' }],
      [{ text: '🎯 AI Підбір книги', callback_data: 'start_ai_assistant' }],
      [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
      [{ text: '⬅️ Назад', callback_data: 'profile_back' }]
    ]).reply_markup
  });
  
  logger.userAction(userId, 'view_profile');
});

// Показати статистику
profileScene.action('show_stats', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  
  const { getUserDetailedStats } = await import('../database/userFunctions');
  
  // Використовуємо нову функцію для отримання статистики
  const stats = await getUserDetailedStats(userId);
  
  const hours = Math.floor(stats.totalListeningTime / 3600);
  const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
  
  let statsText = '📊 <b>Ваша детальна статистика</b>\n\n';
  statsText += `💾 Збережено книг: ${stats.savedBooksCount}\n`;
  statsText += `⭐ Залишено відгуків: ${stats.reviewsCount}\n`;
  statsText += `🎧 Прослухано: ${hours}г ${minutes}хв\n\n`;
  
  if (stats.favoriteGenres.length > 0) {
    statsText += `📚 *Улюблені жанри:*\n`;
    stats.favoriteGenres.forEach((genre, index) => {
      statsText += `${index + 1}. ${genre}\n`;
    });
    statsText += `\n`;
  } else {
    statsText += `📚 *Улюблені жанри:* не встановлені\n\n`;
  }
  
  statsText += `💡 Продовжуйте читати та слухати!`;
  
  await ctx.reply(statsText, { parse_mode: 'HTML' });
  logger.userAction(userId, 'view_stats');
});

// Запуск AI Підбору
profileScene.action('start_ai_assistant', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🤖 Запускаю AI Підбір...');
  logger.userAction(ctx.from!.id, 'start_ai_assistant_from_profile');
  await ctx.scene?.leave();
  return ctx.scene?.enter('AI_ASSISTANT_SCENE');
});

// Назад
profileScene.action('profile_back', async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.scene?.leave();
  const { getMainMenuKeyboard } = await import('../keyboards/mainKeyboards');
  await ctx.reply('👋 Повертаємось до головного меню', {
    reply_markup: getMainMenuKeyboard()
  });
});

// Обробник персональної підбірки (AI) - використовує розумні алгоритми
profileScene.action('show_personal_collection', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🤖 Генерую персональну підбірку...');
  
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка ідентифікації користувача');
    return;
  }

  await ctx.reply('🤖 Аналізую ваші вподобання та створюю персональну підбірку...');

  // Використовуємо розумні рекомендації з урахуванням тегів, рейтингів та історії
  const { isBookSaved, getTopBooks, getNewestBooks } = await import('../database/models');
  
  let collection = await getSmartRecommendations(userId, 5);

  if (collection.length === 0) {
    // Fallback до топ книг
    const topBooks = await getTopBooks(3);
    
    if (topBooks.length > 0) {
      collection = topBooks;
      await ctx.reply(
        '📚 <b>Персональна підбірка для вас</b>\n\n' +
        '🤖 На основі найкращих книг каталогу\n' +
        `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`,
        { parse_mode: 'HTML' }
      );
    } else {
      // Якщо навіть топ книг немає - пробуємо новинки
      const newBooks = await getNewestBooks(3);
      
      if (newBooks.length > 0) {
        collection = newBooks;
        await ctx.reply(
          '📚 <b>Персональна підбірка для вас</b>\n\n' +
          '🤖 Найновіші книги каталогу\n' +
          `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`,
          { parse_mode: 'HTML' }
        );
      } else {
        await ctx.reply('😔 Не вдалося створити персональну підбірку. В каталозі поки немає книг.');
        return;
      }
    }
  } else {
    await ctx.reply(
      `📚 <b>Персональна підбірка для вас</b>\n\n` +
      `🤖 Створено на основі ваших вподобань, тегів та рейтингів\n` +
      `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`,
      { parse_mode: 'HTML' }
    );
  }

  // Показуємо книги
  const { formatBookCaption } = await import('../utils/helpers');
  
  for (const book of collection) {
    const caption = await formatBookCaption(book);
    const isSaved = await isBookSaved(userId, book.id!);
    const keyboard = getEnhancedBookKeyboard(book, isSaved);

    if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
       await ctx.replyWithPhoto(book.photo_file_id, {
         caption,
         parse_mode: 'HTML',
         reply_markup: keyboard
       }).catch((photoError) => {
         logger.debug('Photo error, sending as text');
         ctx.reply(caption, {
           parse_mode: 'HTML',
           reply_markup: keyboard
         });
       });
     } else {
      await ctx.reply(caption, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    }

    // Затримка між повідомленнями
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  logger.userAction(userId, 'ai_personal_collection', { booksFound: collection.length });
});

// Cleanup при виході зі сцени
profileScene.leave((ctx: BotContext) => {
  logger.debug('ProfileScene cleanup completed', { userId: ctx.from?.id });
});

export default profileScene;