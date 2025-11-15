import { Scenes, Markup } from 'telegraf';
import { addReview, getBookById } from '../database/models';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { validateReviewData } from '../utils/validation';
import { handleResult } from '../utils/resultHandler';
import { getBookIdText } from '../utils/helpers';

const rateBookScene = new Scenes.WizardScene(
  'RATE_BOOK_SCENE',
  // Крок 1: Вибір рейтингу
  async (ctx: BotContext) => {
    const bookId = (ctx.scene?.state as any)?.bookId;
    
    if (!bookId) {
      await ctx.reply('❌ Помилка: книга не знайдена.');
      return ctx.scene?.leave();
    }
    
    const book = await getBookById(bookId);
    if (!book) {
      await ctx.reply('❌ Помилка: книга не знайдена.');
      return ctx.scene?.leave();
    }
    
    await ctx.reply(
      `⭐ <b>Оцініть книгу</b>\n\n📖 ${book.title}${getBookIdText(book.id)}\n👤 ${book.author}\n\nОберіть рейтинг (1-5 зірок):`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              Markup.button.callback('⭐', 'rating_1'),
              Markup.button.callback('⭐⭐', 'rating_2'),
              Markup.button.callback('⭐⭐⭐', 'rating_3')
            ],
            [
              Markup.button.callback('⭐⭐⭐⭐', 'rating_4'),
              Markup.button.callback('⭐⭐⭐⭐⭐', 'rating_5')
            ],
            [Markup.button.callback('❌ Скасувати', 'rating_cancel')]
          ]
        }
      }
    );
    
    return ctx.wizard.next();
  },
  // Крок 2: Коментар (опціонально)
  async (ctx: BotContext) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    
    const action = ctx.callbackQuery.data;
    
    if (action === 'rating_cancel') {
      await ctx.editMessageText('❌ Оцінювання скасовано.');
      return ctx.scene?.leave();
    }
    
    const rating = parseInt(action.replace('rating_', ''));
    (ctx.wizard?.state as any).rating = rating;
    
    await ctx.editMessageText(
      `✅ Ви обрали: ${'⭐'.repeat(rating)}\n\n` +
      '💬 Хочете додати коментар? (опціонально)\n\n' +
      'Напишіть ваш відгук або натисніть "Пропустити"',
      {
        reply_markup: {
          inline_keyboard: [
            [Markup.button.callback('⏭️ Пропустити', 'skip_comment')]
          ]
        }
      }
    );
    
    return ctx.wizard.next();
  },
  // Крок 3: Збереження відгуку
  async (ctx: BotContext) => {
    const bookId = (ctx.scene?.state as any)?.bookId;
    const rating = (ctx.wizard?.state as any)?.rating;
    let comment = null;
    
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery && ctx.callbackQuery.data === 'skip_comment') {
      comment = null;
    } else if (ctx.message && 'text' in ctx.message) {
      comment = ctx.message.text;
    } else {
      await ctx.reply('❌ Будь ласка, надішліть текст або натисніть "Пропустити".');
      return;
    }
    
    const reviewData = {
      book_id: bookId,
      user_id: ctx.from!.id,
      user_name: ctx.from!.first_name || 'Користувач',
      rating: rating,
      comment: comment,
      is_published: false // Модерація адміном
    };
    
    // Валідація даних
    const validation = validateReviewData(reviewData);
    if (!validation.isValid) {
      await ctx.reply(
        '❌ *Помилка валідації:*\n\n' + validation.errors.join('\n') + '\n\nСпробуйте оцінити книгу ще раз.',
        { parse_mode: 'Markdown' }
      );
      return ctx.scene?.leave();
    }
    
    await addReview(reviewData);
    
    await ctx.reply(
      '✅ *Дякуємо за відгук!*\n\n' +
      `⭐ Ваша оцінка: ${'⭐'.repeat(rating)}\n` +
      `💬 Коментар: ${comment || 'без коментаря'}\n\n` +
      '📝 Відгук буде опублікований після модерації адміністратором.',
      { parse_mode: 'Markdown' }
    );
    
    return ctx.scene?.leave();
  }
);

export default rateBookScene;
