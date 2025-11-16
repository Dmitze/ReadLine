/**
 * Book Actions Handlers
 * REFACTOR-009: Split userHandlers.ts
 * 
 * Обработчики действий с книгами (save, view, download, reviews, rating)
 */

import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { ERRORS } from '../../constants';
import {
  getBookById,
  saveBook,
  unsaveBook,
  isBookSaved,
  incrementDownloads,
  getBookReviews
} from '../../database/models';
import { getEnhancedBookKeyboard } from '../../keyboards/mainKeyboards';
import { formatBookCaption } from '../../utils/helpers';
import { LIMITS, TIMEOUTS } from '../../constants';

/**
 * Register book action handlers
 */
export function registerBookActionHandlers(bot: Telegraf<BotContext>): void {
  
  // Сохранить/удалить книгу
  bot.action(/save_(\d+)/, async (ctx: BotContext) => {
    const { retryOperation, sendErrorToUser } = await import('../../utils/errorHandler');
    
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1], 10);
      const userId = ctx.from?.id;
      
      if (!userId) {
        await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача');
        return;
      }
      
      await retryOperation(async () => {
        const isSaved = await isBookSaved(userId, bookId);
        
        if (isSaved) {
          await unsaveBook(userId, bookId);
          await ctx.answerCbQuery('💔 Видалено зі збережених', { show_alert: false });
        } else {
          await saveBook(userId, bookId);
          
          // Добавляем жанр книги в избранные
          const book = await getBookById(bookId);
          if (book && book.genre) {
            const { getUserFavoriteGenres, updateUserFavoriteGenres } = await import('../../database/userFunctions');
            const currentGenres = await getUserFavoriteGenres(userId);
            
            if (!currentGenres.includes(book.genre)) {
              const updatedGenres = [...currentGenres, book.genre];
              await updateUserFavoriteGenres(userId, updatedGenres);
              logger.info('Added genre to user favorites', { userId, genre: book.genre });
            }
          }
          
          await ctx.answerCbQuery('❤️ Збережено!', { show_alert: false });
        }
      }, 2, TIMEOUTS.MESSAGE_SEND_DELAY);
    })().catch((error) => {
      logger.error('Error saving book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      sendErrorToUser(ctx, error, '❌ Помилка при збереженні. Спробуйте ще раз.');
    });
    return;
  });
  
  // Просмотр сохраненной книги
  bot.action(/view_saved_book_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1], 10);
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
      
      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > LIMITS.FILE_ID_MIN) {
        await ctx.replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(caption, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
      
      logger.userAction(userId, 'view_saved_book', { bookId });
    })().catch((error) => {
      logger.error('Error viewing saved book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.GENERIC);
    });
    return;
  });
  
  // Просмотр книги
  bot.action(/view_book_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      const bookId = parseInt(match[1], 10);
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
      
      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover' && book.photo_file_id.length > LIMITS.FILE_ID_MIN) {
        await ctx.replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      } else {
        await ctx.reply(caption, {
          parse_mode: 'HTML',
          reply_markup: keyboard
        });
      }
      
      logger.userAction(userId, 'view_book', { bookId });
    })().catch((error) => {
      logger.error('Error viewing book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.GENERIC);
    });
    return;
  });
  
  // Скачать PDF
  bot.action(/download_pdf_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      
      await ctx.answerCbQuery('Завантаження PDF...');
      
      const bookId = parseInt(match[1], 10);
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.reply('❌ Книга не знайдена');
        return;
      }
      
      if (!book.pdf_file_id && !book.file_url) {
        await ctx.reply('❌ PDF файл недоступний для цієї книги');
        return;
      }
      
      await incrementDownloads(bookId);
      
      if (book.pdf_file_id) {
        await ctx.replyWithDocument(book.pdf_file_id, {
          caption: `📄 ${book.title} - ${book.author}`
        });
      } else if (book.file_url) {
        await ctx.reply(
          `📥 Посилання для завантаження:\n${book.file_url}`,
          { disable_web_page_preview: false }
        );
      }
      
      logger.userAction(ctx.from!.id, 'download_pdf', { bookId });
    })().catch((error) => {
      logger.error('Error downloading PDF', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.DOWNLOAD_ERROR);
    });
    return;
  });
  
  // Скачать аудио
  bot.action(/download_audio_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      
      await ctx.answerCbQuery('Завантаження аудіо...');
      
      const bookId = parseInt(match[1], 10);
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.reply('❌ Книга не знайдена');
        return;
      }
      
      if (!book.audio_file_id && !book.audio_external_link) {
        await ctx.reply('❌ Аудіо недоступне для цієї книги');
        return;
      }
      
      await incrementDownloads(bookId);
      
      if (book.audio_file_id) {
        await ctx.replyWithAudio(book.audio_file_id, {
          caption: `🎧 ${book.title} - ${book.author}`,
          performer: book.narrator || book.author,
          title: book.title
        });
      } else if (book.audio_external_link) {
        let message = `🎧 <b>Аудіокнига</b>\n\n`;
        message += `📖 ${book.title}\n`;
        message += `✍️ ${book.author}\n`;
        if (book.narrator) {
          message += `🎙️ Диктор: ${book.narrator}\n`;
        }
        message += `\n🔗 Посилання: ${book.audio_external_link}`;
        
        await ctx.reply(message, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
      }
      
      logger.userAction(ctx.from!.id, 'download_audio', { bookId });
    })().catch((error) => {
      logger.error('Error downloading audio', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.DOWNLOAD_ERROR);
    });
    return;
  });
  
  // Отзывы
  bot.action(/reviews_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      
      await ctx.answerCbQuery('Завантаження відгуків...');
      
      const bookId = parseInt(match[1], 10);
      const allReviews = await getBookReviews(bookId);
      const reviews = allReviews.slice(0, 5);
      
      if (reviews.length === 0) {
        await ctx.reply('📭 Відгуків поки немає. Будьте першим!');
        return;
      }
      
      let message = '📝 <b>ВІДГУКИ</b>\n\n';
      reviews.forEach((review, index) => {
        message += `${index + 1}. ${review.rating ? '⭐'.repeat(review.rating) : ''}\n`;
        message += `   ${review.comment || 'Без коментаря'}\n`;
        message += `   — від користувача ${review.user_id}\n\n`;
      });
      
      await ctx.reply(message, { parse_mode: 'HTML' });
      
      logger.userAction(ctx.from!.id, 'view_reviews', { bookId });
    })().catch((error) => {
      logger.error('Error showing reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.REVIEW_ERROR);
    });
    return;
  });
  
  // Похожие книги
  bot.action(/similar_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      
      await ctx.answerCbQuery('Пошук схожих книг...');
      
      const bookId = parseInt(match[1], 10);
      const book = await getBookById(bookId);
      
      if (!book) {
        await ctx.reply('❌ Книга не знайдена');
        return;
      }
      
      const { getBooksByGenre } = await import('../../database/models');
      const allSimilarBooks = await getBooksByGenre(book.genre);
      const filteredBooks = allSimilarBooks.filter(b => b.id !== bookId).slice(0, 5);
      
      if (filteredBooks.length === 0) {
        await ctx.reply('📭 Схожих книг не знайдено');
        return;
      }
      
      let message = `📚 <b>Схожі книги (${book.genre})</b>\n\n`;
      filteredBooks.forEach((b, index) => {
        message += `${index + 1}. <b>${b.title}</b> - ${b.author}\n`;
      });
      
      const { Markup } = await import('telegraf');
      await ctx.reply(message, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard(
          filteredBooks.map(b => [
            Markup.button.callback(`📖 ${b.title}`, `view_book_${b.id}`)
          ])
        ).reply_markup
      });
      
      logger.userAction(ctx.from!.id, 'view_similar_books', { bookId, genre: book.genre });
    })().catch((error) => {
      logger.error('Error showing similar books', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.GENERIC);
    });
    return;
  });
  
  // Оценить книгу
  bot.action(/rate_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID книги');
        return;
      }
      
      await ctx.answerCbQuery('Відкриття сцени оцінки...');
      
      const bookId = parseInt(match[1], 10);
      ctx.session = ctx.session || {};
      ctx.session.bookToRate = bookId;
      
      await ctx.scene.enter('RATE_BOOK_SCENE');
      
      logger.userAction(ctx.from!.id, 'start_rate_book', { bookId });
    })().catch((error) => {
      logger.error('Error starting rate book', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply(ERRORS.GENERIC);
    });
    return;
  });
}
