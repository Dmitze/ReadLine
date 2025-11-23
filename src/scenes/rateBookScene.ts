import { Scenes, Markup } from 'telegraf';
import { addReview, getBookById } from '../database/models';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';
import { validateReviewData } from '../utils/validation';
import { handleResult } from '../utils/resultHandler';
import { getBookIdText, safeParseInt } from '../utils/helpers';

const rateBookScene = new Scenes.WizardScene(
  'RATE_BOOK_SCENE',
  // Крок 1: Вибір рейтингу
  async (ctx: BotContext) => {
    // Отримуємо bookId з різних можливих джерел
    const bookId =
      ctx.session?.bookToRate ||
      (ctx.scene?.state as any)?.bookId ||
      (ctx.wizard?.state as any)?.bookId;

    if (!bookId) {
      logger.error('Rate book scene: bookId not found', new Error('Missing bookId'), {
        session: ctx.session,
        sceneState: ctx.scene?.state,
        wizardState: ctx.wizard?.state,
      });
      await ctx.reply('❌ Помилка: книга не знайдена. Спробуйте ще раз.');
      return ctx.scene?.leave();
    }

    // Зберігаємо bookId в wizard state для наступних кроків
    if (ctx.wizard?.state) {
      (ctx.wizard.state as any).bookId = bookId;
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
              Markup.button.callback('⭐⭐⭐', 'rating_3'),
            ],
            [
              Markup.button.callback('⭐⭐⭐⭐', 'rating_4'),
              Markup.button.callback('⭐⭐⭐⭐⭐', 'rating_5'),
            ],
            [Markup.button.callback('❌ Скасувати', 'rating_cancel')],
          ],
        },
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

    // ✅ Валідація rating з safeParseInt
    const rating = safeParseInt(action.replace('rating_', ''), 1);
    if (rating < 1 || rating > 5) {
      await ctx.answerCbQuery('❌ Некоректний рейтинг');
      return;
    }
    (ctx.wizard?.state as any).rating = rating;

    await ctx.editMessageText(
      `✅ Ви обрали: ${'⭐'.repeat(rating)}\n\n` +
        '💬 Хочете додати коментар? (опціонально)\n\n' +
        'Напишіть ваш відгук або натисніть "Пропустити"',
      {
        reply_markup: {
          inline_keyboard: [[Markup.button.callback('⏭️ Пропустити', 'skip_comment')]],
        },
      }
    );

    return ctx.wizard.next();
  },
  // Крок 3: Збереження відгуку
  async (ctx: BotContext) => {
    const bookId =
      (ctx.wizard?.state as any)?.bookId ||
      ctx.session?.bookToRate ||
      (ctx.scene?.state as any)?.bookId;
    const rating = (ctx.wizard?.state as any)?.rating;
    let comment = null;

    if (
      ctx.callbackQuery &&
      'data' in ctx.callbackQuery &&
      ctx.callbackQuery.data === 'skip_comment'
    ) {
      comment = null;
    } else if (ctx.message && 'text' in ctx.message) {
      comment = ctx.message.text;
    } else {
      await ctx.reply('❌ Будь ласка, надішліть текст або натисніть "Пропустити".');
      return;
    }

    if (!bookId || !rating) {
      logger.error('Rate book scene: missing bookId or rating', new Error('Missing data'), {
        bookId,
        rating,
        wizardState: ctx.wizard?.state,
      });
      await ctx.reply('❌ Помилка: не вдалося зберегти відгук. Спробуйте ще раз.');
      return ctx.scene?.leave();
    }

    const reviewData = {
      book_id: bookId,
      user_id: ctx.from!.id,
      user_name: ctx.from!.first_name || 'Користувач',
      rating: rating,
      comment: comment,
      is_published: false, // Модерація адміном
    };

    // Валідація даних
    const validation = validateReviewData(reviewData);
    if (!validation.isValid) {
      await ctx.reply(
        '❌ *Помилка валідації:*\n\n' +
          validation.errors.join('\n') +
          '\n\nСпробуйте оцінити книгу ще раз.',
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
