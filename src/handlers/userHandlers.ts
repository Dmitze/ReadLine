import { Telegraf, Markup } from 'telegraf';
import { 
  Book,
  getGenres, 
  getBooksByGenre, 
  getBooksByGenreWithPagination,
  getTopBooks,
  getNewestBooks,
  getSavedBooks,
  saveBook,
  unsaveBook,
  isBookSaved,
  incrementDownloads,
  getBookById,
  getBookReviews,
  getMostDownloadedBooks
} from '../database/models';
import {
  getRandomBook,
  getRecentlyViewedBooks,
  getRecommendedBooks
} from '../database/recommendationFunctions';
import {
  getAllTags,
  searchBooksByTag
} from '../database/tagFunctions';
import {
  getBooksWithFilters,
  getBooksWithAudio,
  getHighRatedBooks,
  getBooksSortedByTitle
} from '../database/catalogFunctions';
import { 
  getGenreKeyboard, 
  getEnhancedBookKeyboard,
  getMainMenuKeyboard
} from '../keyboards/mainKeyboards';
import { formatBookCaption } from '../utils/helpers';
import { 
  displayTopBooks, 
  displayNewBooks, 
  displaySavedBooks 
} from '../utils/bookDisplay';
import { logger } from '../utils/logger';
import { BUTTONS, ERRORS, CONFIG } from '../constants';
import { cache, CACHE_KEYS, CACHE_TTL } from '../utils/cache';
import { BotContext } from '../types/telegraf';
import { validateUserId, checkUserIdOrReply } from '../utils/userValidation';

// ✅ ВИПРАВЛЕНО #11: видаляємо старі handlers при рестарті
let handlersRegistered = false;

// Обробники для звичайних користувачів
export default (bot: Telegraf<BotContext>) => {
  // Запобігаємо повторній реєстрації handlers
  if (handlersRegistered) {
    console.log('⚠️ User handlers already registered, skipping...');
    return;
  }
  handlersRegistered = true;
  console.log('✅ User handlers registering...');
  
  // ==================== ПРОМОКОДИ (ПРІОРИТЕТ) ====================
  bot.hears('🎁 Отримати промокод', async (ctx: BotContext) => {
    try {
      logger.info('Promo code button pressed', { userId: ctx.from?.id });
      
      const userId = ctx.from?.id;
      if (!userId) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача');
        return;
      }
      
      const {
        hasUserReceivedPromoCode,
        getAvailablePromoCodesCount,
        getAvailablePromoCode,
        markPromoCodeAsUsed
      } = await import('../database/promoCodeFunctions');
      
      // Перевірка чи вже отримував промокод
      logger.info('Checking if user already received promo code', { userId });
      const hasReceived = await hasUserReceivedPromoCode(userId);
      logger.info('User promo code check result', { userId, hasReceived });
      
      if (hasReceived) {
        await ctx.reply(
          '❌ *Ви вже отримували промокод*\n\n' +
          'Кожен користувач може отримати промокод лише один раз.\n\n' +
          '💡 Використайте отриманий промокод при замовленні на сайті Yakaboo.ua\n\n' +
          '🌐 https://www.yakaboo.ua',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Перевірка наявності промокодів
      logger.info('Checking available promo codes count', { userId });
      const availableCount = await getAvailablePromoCodesCount();
      logger.info('Available promo codes count', { userId, availableCount });
      
      if (availableCount === 0) {
        await ctx.reply(
          '😔 *Наразі промокодів немає в наявності*\n\n' +
          '🔄 Будь ласка, спробуйте пізніше.\n\n' +
          '📚 А поки що можете ознайомитися з нашим каталогом книг!',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Отримуємо промокод для користувача
      logger.info('Getting available promo code for user', { userId });
      const promoCode = await getAvailablePromoCode(userId);
      logger.info('Got promo code', { userId, promoCode: promoCode ? promoCode.code : null });
      
      if (!promoCode) {
        logger.error('No promo code available for user', new Error('No promo code'), { userId });
        await ctx.reply('❌ Сталася помилка при отриманні промокоду. Спробуйте пізніше.');
        return;
      }
      
      // Позначаємо як використаний
      logger.info('Marking promo code as used', { userId, promoCodeId: promoCode.id });
      await markPromoCodeAsUsed(userId, promoCode.id!);
      
      // Відправляємо промокод
      await ctx.reply(
        `🎉 *ВІТАЄМО! ВАШ ПРОМОКОД:*\n\n` +
        `🎫 \`${promoCode.code}\`\n\n` +
        `💾 *Збережіть цей код!* Використовуйте його при замовленні на сайті Yakaboo.ua\n\n` +
        `🌐 *Посилання:* https://www.yakaboo.ua`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Перейти на Yakaboo.ua', url: 'https://www.yakaboo.ua' }],
              [{ text: '🏠 На головну', callback_data: 'home' }]
            ]
          }
        }
      );
      
      logger.userAction(userId, 'received_promo_code', { code: promoCode.code, promoId: promoCode.id });
      
    } catch (error) {
      logger.error('Error getting promo code', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
    }
  });
  
  // Перегляд каталогу з фільтрами
  bot.hears([BUTTONS.CATALOG_OLD, BUTTONS.CATALOG], async (ctx) => {
    try {
      await ctx.reply(
        '📚 *КАТАЛОГ КНИГ*\n\n' +
        'Оберіть спосіб перегляду:',
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard([
            [
              Markup.button.callback('📖 За жанрами', 'catalog_genres'),
              Markup.button.callback('⭐ За рейтингом', 'catalog_rating')
            ],
            [
              Markup.button.callback('🆕 Новинки', 'catalog_new'),
              Markup.button.callback('🔤 За алфавітом', 'catalog_alpha')
            ],
            [
              Markup.button.callback('🎧 З аудіо', 'catalog_audio'),
              Markup.button.callback('📥 За завантаженнями', 'catalog_downloads')
            ],
            [
              Markup.button.callback('🏷️ За тегами', 'catalog_tags')
            ],
            [
              Markup.button.callback('🤖 AI-підбір', 'catalog_ai')
            ]
          ]).reply_markup
        }
      );
      
      logger.userAction(ctx.from!.id, 'view_catalog');
    } catch (error) {
      logger.error('Error showing catalog', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.GENERIC);
    }
  });
  
  // Обробка кнопки "Назад" з каталогу
  bot.hears('⬅️ Назад', async (ctx) => {
    await ctx.reply('👋 Повертаємось до головного меню', {
      reply_markup: getMainMenuKeyboard()
    });
  });
  

  
  // Топ книги
  bot.hears(['🏆 Топ книги', BUTTONS.TOP_BOOKS], async (ctx) => {
    try {
      const topBooks = await cache.getOrSet(
        CACHE_KEYS.TOP_BOOKS,
        () => getTopBooks(CONFIG.MAX_TOP_BOOKS),
        CACHE_TTL.MEDIUM
      );
      
      await displayTopBooks(ctx, topBooks);
      logger.userAction(ctx.from!.id, 'view_top_books');
    } catch (error) {
      logger.error('Error showing top books', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.NO_TOP_BOOKS);
    }
  });
  
  // Новинки - показуємо останні 5 книг
  bot.hears(BUTTONS.NEW_BOOKS, async (ctx) => {
    try {
      const newBooks = await getNewestBooks(5);
      
      if (newBooks.length === 0) {
        await ctx.reply('📭 В бібліотеці поки що немає книг.');
        return;
      }
      
      await displayNewBooks(ctx, newBooks, 5);
      logger.userAction(ctx.from!.id, 'view_new_books');
    } catch (error) {
      logger.error('Error showing new books', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.NO_NEW_BOOKS);
    }
  });
  
  // Моя бібліотека
  bot.hears(BUTTONS.MY_LIBRARY, async (ctx) => {
    try {
      // ✅ ВИПРАВЛЕНО: використовуємо utility для валідації
      if (!(await checkUserIdOrReply(ctx))) return;
      const userId = validateUserId(ctx)!;
      
      const savedBooks = await getSavedBooks(userId);
      await displaySavedBooks(ctx, savedBooks);
      logger.userAction(userId, 'view_library');
    } catch (error) {
      logger.error('Error showing saved books', error, { userId: ctx.from?.id });
      await ctx.reply(ERRORS.NO_SAVED_BOOKS);
    }
  });
  
  // Профіль користувача
  bot.hears([BUTTONS.PROFILE_OLD, BUTTONS.PROFILE], async (ctx: BotContext) => {
    ctx.scene?.enter('PROFILE_SCENE');
    logger.userAction(ctx.from!.id, 'enter_profile');
    return;
  });
  
  // "Мої заявки" видалено - більше не використовуємо фізичні книги
  
  // Зворотній зв'язок
  bot.hears(BUTTONS.FEEDBACK, async (ctx: BotContext) => {
    ctx.scene?.enter('FEEDBACK_SCENE');
    logger.userAction(ctx.from!.id, 'enter_feedback');
    return;
  });
  
  // AI Помічник
  bot.hears(BUTTONS.AI_ASSISTANT, async (ctx: BotContext) => {
    ctx.scene?.enter('AI_SCENE');
    logger.userAction(ctx.from!.id, 'enter_ai');
    return;
  });
  
  // Допомога
  bot.hears(BUTTONS.HELP, async (ctx) => {
    logger.userAction(ctx.from!.id, 'view_help');
    // Викликаємо /help
    return ctx.reply(
      '📖 *ДОВІДКА ПО БОТУ*\n\n' +
      
      '🎯 *ОСНОВНІ ФУНКЦІЇ:*\n\n' +
      
      '📖 *Каталог* - перегляд книг за жанрами\n' +
      '🔍 *Пошук* - швидкий пошук книг\n' +
      '⭐ *Топ книги* - найкращі книги за рейтингом\n' +
      '🆕 *Новинки* - останні додані книги\n' +
      '💾 *Моя бібліотека* - збережені книги\n' +
      '👤 *Профіль* - ваша статистика\n' +
      '📞 *Зворотній зв\'язок* - зв\'язок з адміном\n\n' +
      
      '⚙️ *КОМАНДИ:*\n' +
      '/start - Головне меню\n' +
      '/help - Ця довідка\n' +
      '/admin - Панель адміністратора\n\n' +
      
      '💡 Використовуйте кнопки для навігації!',
      { parse_mode: 'Markdown' }
    );
  });
  
  // Показ книг за жанром
  bot.on('message', async (ctx: BotContext) => {
    // Перевіряємо чи є текст в повідомленні
    if (!ctx.message || !('text' in ctx.message)) return;
    
    const messageText = ctx.message.text;
    
    // Ігноруємо команди (текст що починається з /)
    if (messageText.startsWith('/')) return;
    
    try {
      // ✅ ВИПРАВЛЕНО #27: кешування жанрів
      const genres = await cache.getOrSet(
        CACHE_KEYS.GENRES,
        getGenres,
        CACHE_TTL.LONG
      );
      
      if (genres.includes(messageText)) {
        // Використовуємо пагінацію щоб не флудити
        const BOOKS_PER_PAGE = 5;
        const { books, total } = await getBooksByGenreWithPagination(messageText, BOOKS_PER_PAGE, 0);
        
        if (books.length === 0) {
          await ctx.reply('📭 На жаль, в цьому жанрі ще немає книг.');
          return;
        }
        
        // Повідомляємо користувача скільки книг знайдено
        await ctx.reply(
          `📚 Знайдено ${total} ${total === 1 ? 'книгу' : 'книг'} в жанрі "${messageText}".\n` +
          `Показано перші ${books.length}:`
        );
        
        for (const book of books) {
          const caption = `📖 *${book.title}*
👤 Автор: ${book.author}
� Жванр: ${book.genre}
� Опис:  ${book.description}
� Статус: b${book.is_available ? 'Доступна' : 'Недоступна'}`;

          // Перевіряємо чи є валідний photo_file_id
          if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
            try {
              await ctx.replyWithPhoto(book.photo_file_id, {
                caption,
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book, false)
              });
            } catch (error) {
              // Якщо помилка з фото - відправляємо текстом
              await ctx.reply(caption, {
                parse_mode: 'Markdown',
                reply_markup: getEnhancedBookKeyboard(book, false)
              });
            }
          } else {
            // Якщо немає фото - відправляємо текстом
            await ctx.reply(caption, {
              parse_mode: 'Markdown',
              reply_markup: getEnhancedBookKeyboard(book, false)
            });
          }
        }
        
        // Якщо книг більше ніж показано, підказуємо використати пошук
        if (total > BOOKS_PER_PAGE) {
          await ctx.reply(
            `ℹ️ Показано ${books.length} з ${total} книг.\n\n` +
            `Для перегляду інших книг використайте:\n` +
            `🔍 Пошук книги - пошук за назвою або автором`
          );
        }
      }
    } catch (error) {
      logger.error('Error getting books by genre', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при отриманні книг.');
    }
    return;
  });
  
  // Кнопка "Замовити" видалена - більше не використовуємо фізичні книги
  
  // Обробка кнопки "Зберегти"
  bot.action(/save_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
        return;
      }
      
      const isSaved = await isBookSaved(userId, bookId);
      
      if (isSaved) {
        // Видаляємо зі збережених
        await unsaveBook(userId, bookId);
        await ctx.answerCbQuery('💔 Видалено зі збережених', { show_alert: false });
      } else {
        // Зберігаємо
        await saveBook(userId, bookId);
        
        // Додаємо жанр книги в улюблені жанри користувача
        const book = await getBookById(bookId);
        if (book && book.genre) {
          const { getUserFavoriteGenres, updateUserFavoriteGenres } = await import('../database/userFunctions');
          const currentGenres = await getUserFavoriteGenres(userId);
          
          if (!currentGenres.includes(book.genre)) {
            const updatedGenres = [...currentGenres, book.genre];
            await updateUserFavoriteGenres(userId, updatedGenres);
            logger.info('Added genre to user favorites', { userId, genre: book.genre });
          }
        }
        
        await ctx.answerCbQuery('❤️ Збережено!', { show_alert: false });
      }
      
      // Оновлюємо кнопки (опціонально)
      // Можна оновити markup щоб змінити текст кнопки
    } catch (error) {
      logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при збереженні');
    }
    return;
  });
  
  // Обробка перегляду збереженої книги
  bot.action(/view_saved_book_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
        return;
      }
      
      await ctx.answerCbQuery('Завантаження...');
      
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.reply('❌ Книга не знайдена');
        return;
      }
      
      const caption = await formatBookCaption(book);
      const isSaved = await isBookSaved(userId, bookId);
      const keyboard = getEnhancedBookKeyboard(book, isSaved);
      
      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
        try {
          await ctx.replyWithPhoto(book.photo_file_id, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } catch (photoError) {
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
      
      logger.userAction(userId, 'view_saved_book', { bookId });
    } catch (error) {
      logger.error('Error viewing saved book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при завантаженні');
    }
    return;
  });
  
  // Обробка перегляду книги з компактного списку
  bot.action(/view_book_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      const userId = ctx.from?.id;
      
      await ctx.answerCbQuery('Завантаження...');
      
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.reply('❌ Книга не знайдена');
        return;
      }
      
      const caption = await formatBookCaption(book);
      const isSaved = userId ? await isBookSaved(userId, bookId) : false;
      const keyboard = getEnhancedBookKeyboard(book, isSaved);
      
      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > 20) {
        try {
          await ctx.replyWithPhoto(book.photo_file_id, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: keyboard
          });
        } catch (photoError) {
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
      
      logger.userAction(userId || 0, 'view_book_from_list', { bookId });
    } catch (error) {
      logger.error('Error viewing book from list', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при завантаженні');
    }
    return;
  });
  
  // Обробка кнопки "Завантажити PDF"
  bot.action(/download_pdf_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      
      await incrementDownloads(bookId);
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.answerCbQuery('❌ Книга не знайдена');
        return;
      }
      
      const pdfFileId = (book as any).pdf_file_id || (book.file_type === 'file' ? book.file_url : null);
      
      if (pdfFileId) {
        // Відправляємо файл
        await ctx.telegram.sendDocument(ctx.from!.id, pdfFileId, {
          caption: `📥 ${book.title}\n👤 ${book.author}\n\n✅ PDF файл завантажено!`
        });
        await ctx.answerCbQuery('📥 PDF надіслано вам у приватні повідомлення');
      } else {
        await ctx.answerCbQuery('❌ PDF файл недоступний');
      }
    } catch (error) {
      logger.error('Error downloading PDF', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при завантаженні');
    }
    return;
  });
  
  // Обробка кнопки "Завантажити Аудіо" - відкриває audio player
  bot.action(/download_audio_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      
      await incrementDownloads(bookId);
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.answerCbQuery('❌ Книга не знайдена');
        return;
      }
      
      if ((book as any).audio_file_id) {
        // Відкриваємо audio player scene
        await ctx.answerCbQuery('🎧 Завантаження аудіоплеєра...');
        (ctx.scene as any).state = { bookId };
        await ctx.scene?.enter('AUDIO_PLAYER_SCENE');
      } else {
        await ctx.answerCbQuery('❌ Аудіокнига недоступна');
      }
    } catch (error) {
      logger.error('Error opening audio player', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при завантаженні');
    }
    return;
  });
  
  // Обробка кнопки "Відгуки"
  bot.action(/reviews_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      
      const book = await getBookById(bookId);
      const reviews = await getBookReviews(bookId);
      
      if (!book) {
        await ctx.answerCbQuery('❌ Книга не знайдена');
        return;
      }
      
      if (reviews.length === 0) {
        await ctx.answerCbQuery('📝 Поки що немає відгуків', { show_alert: true });
        return;
      }
      
      let reviewsText = `📊 *Відгуки про книгу*\n\n📖 ${book.title}\n👤 ${book.author}\n`;
      reviewsText += `⭐ Середній рейтинг: ${book.rating?.toFixed(1) || 0}/5\n\n`;
      
      reviews.slice(0, 5).forEach((review, index) => {
        reviewsText += `${index + 1}. ${'⭐'.repeat(review.rating)} - ${review.user_name || 'Користувач'}\n`;
        if (review.comment) {
          reviewsText += `   💬 "${review.comment}"\n`;
        }
        reviewsText += `\n`;
      });
      
      if (reviews.length > 5) {
        reviewsText += `\n...та ще ${reviews.length - 5} відгуків`;
      }
      
      await ctx.reply(reviewsText, { parse_mode: 'Markdown' });
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('Error showing reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при отриманні відгуків');
    }
    return;
  });
  
  // Обробка кнопки "Схожі книги"
  bot.action(/similar_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1]);
      
      const book = await getBookById(bookId);
      if (!book) {
        await ctx.answerCbQuery('❌ Книга не знайдена');
        return;
      }
      
      const similarBooks = await getBooksByGenre(book.genre);
      const filtered = similarBooks.filter(b => b.id !== bookId).slice(0, 3);
      
      if (filtered.length === 0) {
        await ctx.answerCbQuery('📭 Схожих книг не знайдено', { show_alert: true });
        return;
      }
      
      await ctx.reply(
        `🔍 *Схожі книги* (жанр: ${book.genre}):\n\n` +
        filtered.map((b, i) => `${i + 1}. 📖 ${b.title}\n   👤 ${b.author}`).join('\n\n'),
        { parse_mode: 'Markdown' }
      );
      
      await ctx.answerCbQuery();
    } catch (error) {
      logger.error('Error showing similar books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при пошуку схожих книг');
    }
    return;
  });
  
  // Обробка кнопки "Оцінити"
  bot.action(/rate_(\d+)/, async (ctx: BotContext) => {
    const match = ctx.match;
    if (!match || !match[1]) {
      await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
      return;
    }
    const bookId = parseInt(match[1]);
    ctx.scene?.enter('RATE_BOOK_SCENE', { bookId });
    await ctx.answerCbQuery();
    return;
  });

 
 
  // Кнопка "На головну"
  bot.hears('🏠 На головну', async (ctx) => {
    await ctx.reply('🏠 Повертаємось на головну', {
      reply_markup: getMainMenuKeyboard()
    });
    logger.userAction(ctx.from!.id, 'home');
    return;
  });
  
  // Callback для кнопки "На головну" (inline)
  bot.action('home', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('🏠 Повертаємось на головну', {
      reply_markup: getMainMenuKeyboard()
    });
    logger.userAction(ctx.from!.id, 'home_inline');
    return;
  });
  
  // Обробники фільтрів каталогу
  bot.action('catalog_genres', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const genres = await cache.getOrSet(
        CACHE_KEYS.GENRES,
        () => getGenres(),
        CACHE_TTL.LONG // 15 хвилин - жанри рідко змінюються
      );
      const keyboard = getGenreKeyboard(genres);
      
      await ctx.reply('📚 Оберіть жанр:', {
        reply_markup: keyboard
      });
    } catch (error) {
      logger.error('Error showing genres', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  bot.action('catalog_rating', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('⭐ Завантаження книг з високим рейтингом...');
      
      const books = await getHighRatedBooks(4, 10);
      
      if (books.length === 0) {
        await ctx.reply('📭 Поки що немає книг з рейтингом 4+ зірки.');
        return;
      }
      
      await ctx.reply(
        `⭐ *КНИГИ З ВИСОКИМ РЕЙТИНГОМ*\n\n` +
        `Знайдено ${books.length} ${books.length === 1 ? 'книга' : 'книг'} з рейтингом 4+ зірки:`,
        { parse_mode: 'Markdown' }
      );
      
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      logger.userAction(ctx.from!.id, 'catalog_rating');
    } catch (error) {
      logger.error('Error showing high rated books', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  bot.action('catalog_new', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('🆕 Завантаження новинок...');
      
      const books = await cache.getOrSet(
        CACHE_KEYS.NEW_BOOKS,
        () => getNewestBooks(10),
        CACHE_TTL.SHORT // 1 хвилина - новинки часто додаються
      );
      
      if (books.length === 0) {
        await ctx.reply('📭 Книг ще немає в бібліотеці.');
        return;
      }
      
      await ctx.reply(
        `🆕 *НОВИНКИ БІБЛІОТЕКИ*\n\n` +
        `Останні ${books.length} додані ${books.length === 1 ? 'книга' : 'книг'}:`,
        { parse_mode: 'Markdown' }
      );
      
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      logger.userAction(ctx.from!.id, 'catalog_new');
    } catch (error) {
      logger.error('Error showing new books', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  bot.action('catalog_tags', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery();
      const allTags = await getAllTags();
      
      if (allTags.length === 0) {
        await ctx.reply('🏷️ Теги ще не додані до системи.');
        return;
      }
      
      // Створюємо кнопки з тегами (по 2 в рядок)
      const tagButtons = [];
      for (let i = 0; i < allTags.length; i += 2) {
        const row = [
          Markup.button.callback(allTags[i].name, `view_tag_${allTags[i].id}`)
        ];
        if (i + 1 < allTags.length) {
          row.push(Markup.button.callback(allTags[i + 1].name, `view_tag_${allTags[i + 1].id}`));
        }
        tagButtons.push(row);
      }
      
      await ctx.reply(
        '🏷️ *КАТАЛОГ ЗА ТЕГАМИ*\n\n' +
        'Оберіть тег для перегляду книг:',
        {
          parse_mode: 'Markdown',
          reply_markup: Markup.inlineKeyboard(tagButtons).reply_markup
        }
      );
      
      logger.userAction(ctx.from!.id, 'catalog_tags');
    } catch (error) {
      logger.error('Error showing tags catalog', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  bot.action('catalog_alpha', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('🔤 Завантаження книг за алфавітом...');
      
      const { books, total } = await getBooksSortedByTitle(10, 0);
      
      if (books.length === 0) {
        await ctx.reply('📭 Книг ще немає в бібліотеці.');
        return;
      }
      
      await ctx.reply(
        `🔤 *КНИГИ ЗА АЛФАВІТОМ*\n\n` +
        `Показано ${books.length} з ${total} ${total === 1 ? 'книги' : 'книг'}:`,
        { parse_mode: 'Markdown' }
      );
      
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      if (total > 10) {
        await ctx.reply(`ℹ️ Показано 10 з ${total} книг. Використовуйте пошук для інших книг.`);
      }
      
      logger.userAction(ctx.from!.id, 'catalog_alpha');
    } catch (error) {
      logger.error('Error showing books by title', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  bot.action('catalog_audio', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('🎧 Завантаження аудіокниг...');
      
      const books = await getBooksWithAudio(10);
      
      if (books.length === 0) {
        await ctx.reply('📭 Поки що немає аудіокниг в бібліотеці.');
        return;
      }
      
      await ctx.reply(
        `🎧 *АУДІОКНИГИ*\n\n` +
        `Знайдено ${books.length} ${books.length === 1 ? 'аудіокнига' : 'аудіокниг'}:`,
        { parse_mode: 'Markdown' }
      );
      
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      logger.userAction(ctx.from!.id, 'catalog_audio');
    } catch (error) {
      logger.error('Error showing audio books', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  bot.action('catalog_downloads', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('📥 Завантаження популярних книг...');
      
      const books = await getMostDownloadedBooks(10);
      
      if (books.length === 0) {
        await ctx.reply('📭 Поки що немає завантажених книг.');
        return;
      }
      
      await ctx.reply(
        `📥 *НАЙПОПУЛЯРНІШІ КНИГИ*\n\n` +
        `Топ ${books.length} найбільш завантажуваних ${books.length === 1 ? 'книга' : 'книг'}:`,
        { parse_mode: 'Markdown' }
      );
      
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      logger.userAction(ctx.from!.id, 'catalog_downloads');
    } catch (error) {
      logger.error('Error showing most downloaded books', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  // Обробка перегляду книг за тегом з каталогу
  bot.action(/view_tag_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
      }
      
      const tagId = parseInt(match[1]);
      const allTags = await getAllTags();
      const tag = allTags.find(t => t.id === tagId);
      
      if (!tag) {
        await ctx.answerCbQuery('❌ Тег не знайдено');
        return;
      }
      
      await ctx.answerCbQuery(`🏷️ Завантаження книг з тегом: ${tag.name}`);
      
      // Шукаємо книги за тегом
      const books = await searchBooksByTag(tag.name, 10);
      
      if (books.length === 0) {
        await ctx.reply(`🏷️ Книг з тегом "${tag.name}" поки що немає.`);
        return;
      }
      
      await ctx.reply(
        `🏷️ *Книги з тегом "${tag.name}"*\n\n` +
        `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:`,
        { parse_mode: 'Markdown' }
      );
      
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      logger.userAction(ctx.from!.id, 'view_tag', { tagId, tagName: tag.name });
    } catch (error) {
      logger.error('Error showing books by tag', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });
  
  // Обробка пошуку за тегом
  bot.action(/search_tag_(\d+)/, async (ctx: BotContext) => {
    try {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка');
        return;
      }
      
      const tagId = parseInt(match[1]);
      const allTags = await getAllTags();
      const tag = allTags.find(t => t.id === tagId);
      
      if (!tag) {
        await ctx.answerCbQuery('❌ Тег не знайдено');
        return;
      }
      
      await ctx.answerCbQuery(`🔍 Шукаємо за тегом: ${tag.name}`);
      
      // Шукаємо книги за тегом
      const books = await searchBooksByTag(tag.name, 10);
      
      if (books.length === 0) {
        await ctx.reply(
          `📭 *Книг з тегом "${tag.name}" не знайдено*\n\n` +
          'Спробуйте інший тег або використайте звичайний пошук.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      await ctx.reply(
        `🏷️ *Книги з тегом "${tag.name}"*\n\n` +
        `Знайдено ${books.length} ${books.length === 1 ? 'книга' : books.length < 5 ? 'книги' : 'книг'}:`,
        { parse_mode: 'Markdown' }
      );
      
      // Показуємо книги
      for (const book of books) {
        const caption = await formatBookCaption(book);
        const userId = ctx.from?.id;
        const isSaved = userId ? await isBookSaved(userId, book.id!) : false;
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
      
      logger.userAction(ctx.from!.id, 'search_by_tag', { tagName: tag.name, resultsCount: books.length });
    } catch (error) {
      logger.error('Error searching by tag', error);
      await ctx.answerCbQuery('❌ Помилка пошуку');
      await ctx.reply(ERRORS.GENERIC);
    }
  });

  // AI-підбір в каталозі (Завдання 32)
  bot.action('catalog_ai', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('🤖 Запускаю AI-підбір...');
      return ctx.scene.enter('AI_FILTER_SCENE');
    } catch (error) {
      logger.error('Error starting AI filter', error);
      await ctx.answerCbQuery('❌ Помилка');
    }
  });


  console.log('✅ User handlers registered (including AI features and promo codes)');
};
