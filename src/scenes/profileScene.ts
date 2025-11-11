import { Scenes } from 'telegraf';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { escapeHtml } from '../utils/helpers';
import { 
  getSmartRecommendations, 
  getUserReadingStats 
} from '../database/recommendationFunctions';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';

const profileScene = new Scenes.BaseScene('PROFILE_SCENE');

profileScene.enter(async (ctx: BotContext) => {
  try {
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
        [{ text: '💡 Вам може сподобатися', callback_data: 'show_recommendations' }],
        [{ text: '📚 Персональна підбірка (AI)', callback_data: 'show_personal_collection' }],
        [{ text: '📊 Моя статистика', callback_data: 'show_stats' }],
        [{ text: '⬅️ Назад', callback_data: 'profile_back' }]
      ]).reply_markup
    });
    
    logger.userAction(userId, 'view_profile');
  } catch (error) {
    logger.error('Error in profile scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
    await ctx.reply('❌ Виникла помилка при отриманні профілю.');
  }
});

// Показати рекомендації
profileScene.action('show_recommendations', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    if (!userId) return;
    
    const { formatBookCaption } = await import('../utils/helpers');
    const { isBookSaved, getTopBooks, getNewestBooks } = await import('../database/models');
    
    // ✅ ВИПРАВЛЕНО #30: видалено дублювання - getUserFavoriteGenres викликається всередині getSmartRecommendations
    let recommendations = await getSmartRecommendations(userId, 5);
    
    // Якщо немає персональних рекомендацій - показуємо топ книги
    if (recommendations.length === 0) {
      console.log('⚠️ No personal recommendations, showing top books');
      
      // Спробуємо показати топ книги
      const topBooks = await getTopBooks(5);
      
      if (topBooks.length > 0) {
        await ctx.reply(
          '💡 *Рекомендації для вас*\n\n' +
          'У вас ще немає збережених книг, тому ми підібрали найкращі книги з нашого каталогу:\n\n' +
          '⭐ Топ книги за рейтингом',
          { parse_mode: 'Markdown' }
        );
        recommendations = topBooks;
      } else {
        // Якщо навіть топ книг немає - показуємо новинки
        const newBooks = await getNewestBooks(5);
        
        if (newBooks.length > 0) {
          await ctx.reply(
            '💡 *Рекомендації для вас*\n\n' +
            'Ось найновіші книги в нашому каталозі:',
            { parse_mode: 'Markdown' }
          );
          recommendations = newBooks;
        } else {
          await ctx.reply(
            '💡 *Рекомендації для вас*\n\n' +
            'Поки що немає книг в каталозі.\n\n' +
            '💾 Зберігайте книги, щоб отримувати персоналізовані рекомендації!',
            { parse_mode: 'Markdown' }
          );
          return;
        }
      }
    }
    
    // Отримуємо улюблені жанри для відображення
    const { getUserFavoriteGenres } = await import('../database/recommendationFunctions');
    const favoriteGenres = await getUserFavoriteGenres(userId, 3);
    
    let text = '💡 *Вам може сподобатися*\n\n';
    if (favoriteGenres.length > 0) {
      text += `На основі ваших улюблених жанрів: ${favoriteGenres.join(', ')}\n\n`;
    }
    text += `Знайдено ${recommendations.length} ${recommendations.length === 1 ? 'книга' : 'книг'}:`;
    
    await ctx.reply(text, { parse_mode: 'Markdown' });
    
    for (const book of recommendations) {
      const caption = await formatBookCaption(book);
      const isSaved = await isBookSaved(userId, book.id!);
      const keyboard = getEnhancedBookKeyboard(book, isSaved);
      
      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
        await ctx.replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(caption, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      }
    }
    
    logger.userAction(userId, 'view_recommendations');
  } catch (error) {
    logger.error('Error showing recommendations', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
    await ctx.answerCbQuery('❌ Помилка при отриманні рекомендацій');
  }
});

// Показати статистику
profileScene.action('show_stats', async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  if (!userId) return;
  
  try {
    const { getUserDetailedStats } = await import('../database/userFunctions');
    
    // Використовуємо нову функцію для отримання статистики
    const stats = await getUserDetailedStats(userId);
    
    const hours = Math.floor(stats.totalListeningTime / 3600);
    const minutes = Math.floor((stats.totalListeningTime % 3600) / 60);
    
    let statsText = '📊 *Ваша детальна статистика*\n\n';
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
    
    await ctx.reply(statsText, { parse_mode: 'Markdown' });
    logger.userAction(userId, 'view_stats');
  } catch (error) {
    logger.error('Error showing stats', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
    await ctx.answerCbQuery('❌ Помилка при отриманні статистики');
  }
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

// Обробник персональної підбірки (AI)
profileScene.action('show_personal_collection', async (ctx: BotContext) => {
  await ctx.answerCbQuery('🤖 Генерую персональну підбірку...');
  
  try {
    const userId = ctx.from?.id;
    if (!userId) {
      await ctx.reply('❌ Помилка ідентифікації користувача');
      return;
    }

    await ctx.reply('🤖 Аналізую ваші вподобання та створюю персональну підбірку...');

    // Використовуємо розумні рекомендації
    const { getUserDetailedStats } = await import('../database/userFunctions');
    const { getTopBooks, getNewestBooks, isBookSaved } = await import('../database/models');
    
    console.log('📊 Getting user stats for personal collection...');
    const stats = await getUserDetailedStats(userId);
    console.log('📊 User stats:', stats);
    
    let collection = await getSmartRecommendations(userId, 5);
    console.log('🤖 Smart recommendations:', collection.length);

    if (collection.length === 0) {
      console.log('⚠️ No smart recommendations, trying fallback...');
      
      // Fallback до топ книг
      const topBooks = await getTopBooks(3);
      console.log('🏆 Top books fallback:', topBooks.length);
      
      if (topBooks.length > 0) {
        collection = topBooks;
        await ctx.reply(
          '📚 *Персональна підбірка для вас*\n\n' +
          '🤖 На основі найкращих книг каталогу\n' +
          `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`,
          { parse_mode: 'Markdown' }
        );
      } else {
        // Якщо навіть топ книг немає - пробуємо новинки
        const newBooks = await getNewestBooks(3);
        console.log('🆕 New books fallback:', newBooks.length);
        
        if (newBooks.length > 0) {
          collection = newBooks;
          await ctx.reply(
            '📚 *Персональна підбірка для вас*\n\n' +
            '🤖 Найновіші книги каталогу\n' +
            `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await ctx.reply('😔 Не вдалося створити персональну підбірку. В каталозі поки немає книг.');
          return;
        }
      }
    } else {
      await ctx.reply(
        `📚 *Персональна підбірка для вас*\n\n` +
        `🤖 Створено на основі ваших вподобань\n` +
        `📖 Знайдено ${collection.length} ${collection.length === 1 ? 'книгу' : 'книг'}`,
        { parse_mode: 'Markdown' }
      );
    }

    // Показуємо книги
    const { formatBookCaption } = await import('../utils/helpers');
    
    for (const book of collection) {
      try {
        const caption = await formatBookCaption(book);
        const isSaved = await isBookSaved(userId, book.id!);
        const keyboard = getEnhancedBookKeyboard(book, isSaved);

        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
          try {
            await ctx.replyWithPhoto(book.photo_file_id, {
              caption,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } catch (photoError) {
            console.log('⚠️ Photo error, sending as text');
            await ctx.reply(caption, {
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          }
        } else {
          await ctx.reply(caption, {
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        }

        // Затримка між повідомленнями
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (bookError) {
        // ✅ ВИПРАВЛЕНО #43: logger замість console.error
        logger.error('Error showing book', bookError instanceof Error ? bookError : new Error(String(bookError)));
        // Продовжуємо з наступною книгою
      }
    }

    logger.userAction(userId, 'personal_collection', { booksFound: collection.length });

  } catch (error) {
    // ✅ ВИПРАВЛЕНО #43: вже є logger.error нижче, видаляємо дублювання
    logger.error('Error generating personal collection', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('😔 Не вдалося створити персональну підбірку. Спробуйте пізніше.');
  }
});

export default profileScene;