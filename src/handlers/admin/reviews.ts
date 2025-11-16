import { Telegraf } from 'telegraf';
import { isAdmin, getBookById, getPendingReviews } from '../../database/models';
import { getReviewModerationKeyboard } from '../../keyboards/adminKeyboards';
import { logger } from '../../utils/logger';
import { BotContext } from '../../types/telegraf';

const escapeHtml = (text: string) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

export default (bot: Telegraf<BotContext>) => {
  bot.action('moderate_reviews', async (ctx) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження відгуків...');
      
      const adminCheck = await isAdmin(ctx.from!.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const reviews = await getPendingReviews();
      
      if (reviews.length === 0) {
        await ctx.reply('✅ Немає відгуків на модерацію');
        return;
      }
      
      await ctx.reply(`📝 Відгуків на модерацію: ${reviews.length}`);
      
      for (const review of reviews) {
        try {
          const book = await getBookById(review.book_id);
          
          const safeTitle = escapeHtml(book?.title || 'Невідома');
          const safeName = escapeHtml(review.user_name || 'Анонім');
          const safeComment = review.comment ? escapeHtml(review.comment) : '';
          const safeDate = escapeHtml(review.created_at || '');
          
          let reviewText = `📝 <b>Відгук на модерацію #${review.id}</b>\n\n`;
          reviewText += `📖 Книга: <b>${safeTitle}</b>\n`;
          reviewText += `👤 Користувач: ${safeName}\n`;
          reviewText += `⭐ Оцінка: ${'⭐'.repeat(review.rating)} (${review.rating}/5)\n\n`;
          
          if (review.comment) {
            reviewText += `💬 Коментар:\n"${safeComment}"\n\n`;
          } else {
            reviewText += '💬 Коментар: <i>(відсутній)</i>\n\n';
          }
          
          reviewText += `📅 Дата: ${safeDate}`;
          
          await ctx.reply(reviewText, {
            parse_mode: 'HTML',
            reply_markup: getReviewModerationKeyboard(review.id!)
          });
        } catch (bookError) {
          logger.error('Error getting book for review', bookError instanceof Error ? bookError : new Error(String(bookError)), { reviewId: review.id });
        }
      }
    })().catch((error) => {
      logger.error('Error showing pending reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply('❌ Виникла помилка при отриманні відгуків.');
    });
    return;
  });
  
  bot.action(/publish_review_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      if (!ctx.from?.id) {
        await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
        return;
      }
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID відгуку.');
        return;
      }
      const reviewId = parseInt(match[1]);
      const { publishReview } = await import('../../database/models');
      
      const result = await publishReview(reviewId);
      
      if (result > 0) {
        const message = ctx.callbackQuery?.message;
        const messageText = message && 'text' in message ? message.text : 'Відгук';
        await ctx.editMessageText(
          messageText + '\n\n✅ <b>ОПУБЛІКОВАНО</b>',
          { parse_mode: 'Markdown' }
        );
        await ctx.answerCbQuery('✅ Відгук опубліковано!');
      } else {
        await ctx.answerCbQuery('⚠️ Відгук не знайдено');
      }
    })().catch((error) => {
      logger.error('Error publishing review', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.answerCbQuery('❌ Помилка при публікації відгуку');
    });
    return;
  });
  
  bot.action(/delete_review_(\d+)/, async (ctx: BotContext) => {
    (async () => {
      if (!ctx.from?.id) {
        await ctx.answerCbQuery('❌ Не вдалося ідентифікувати користувача.');
        return;
      }
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.answerCbQuery('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const match = ctx.match;
      if (!match || !match[1]) {
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID відгуку.');
        return;
      }
      const reviewId = parseInt(match[1]);
      const { deleteReview } = await import('../../database/models');
      
      const result = await deleteReview(reviewId);
      
      if (result > 0) {
        const message = ctx.callbackQuery?.message;
        const messageText = message && 'text' in message ? message.text : 'Відгук';
        await ctx.editMessageText(
          messageText + '\n\n❌ <b>ВИДАЛЕНО</b>',
          { parse_mode: 'Markdown' }
        );
        await ctx.answerCbQuery('✅ Відгук видалено!');
      } else {
        await ctx.answerCbQuery('⚠️ Відгук не знайдено');
      }
    })().catch((error) => {
      logger.error('Error deleting review', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.answerCbQuery('❌ Помилка при видаленні відгуку');
    });
    return;
  });
};
