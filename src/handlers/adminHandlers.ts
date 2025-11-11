import { Telegraf, Markup } from 'telegraf';
import { 
  isAdmin, 
  getBookById, 
  getAdminStats, 
  db, 
  getPendingReviews, 
  publishReview, 
  deleteReview, 
  getPendingFeedbackMessages, 
  getAllFeedbackMessages, 
  updateFeedbackStatus 
} from '../database/models';
import { getAdminMenuKeyboard, getReviewModerationKeyboard, getFeedbackActionKeyboard } from '../keyboards/adminKeyboards';
import { logger } from '../utils/logger';
import { BotContext } from '../types/telegraf';

// Обробники для адміністратора
export default (bot: Telegraf<BotContext>) => {
  console.log('✅ Admin handlers registered');
  
  // Команда адміністратора
  bot.command('admin', async (ctx) => {
    console.log('📝 /admin command received from user:', ctx.from?.id);
    try {
      // Перевіряємо чи є користувач
      if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return;
      }
      
      const adminCheck = await isAdmin(ctx.from.id);
      
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до адмін-панелі.');
        return;
      }
      
      const stats = await getAdminStats();
      
      // Отримуємо кількість відгуків на модерацію
      const pendingReviews = await getPendingReviews();
      
      // Отримуємо кількість непрочитаних повідомлень зворотного зв'язку
      const pendingFeedback = await getPendingFeedbackMessages();
        
      const reviewsAlert = pendingReviews.length > 0
        ? `📝 Відгуків на модерацію: *${pendingReviews.length}* 🔔`
        : '✅ Всі відгуки оброблені';
        
      const feedbackAlert = pendingFeedback.length > 0
        ? `📞 Нових повідомлень: *${pendingFeedback.length}* 🔔`
        : '✅ Всі повідомлення прочитані';
      
      await ctx.reply(
        `🛠️ *Панель адміністратора*\n\n` +
        `📊 *Статистика:*\n` +
        `📚 Книг в каталозі: ${stats.totalBooks}\n` +
        `${reviewsAlert}\n` +
        `${feedbackAlert}`,
        {
          parse_mode: 'Markdown',
          reply_markup: getAdminMenuKeyboard(0, pendingReviews.length, pendingFeedback.length)
        }
      );
    } catch (error) {
      logger.error('Error in admin command', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при отриманні даних адміністратора.');
    }
    return;
  });
  
  // Перегляд заявок видалено - більше не використовуємо фізичні книги
  
  // Додати книгу
  bot.action('add_book', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('Відкриваємо форму додавання книги...');
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      ctx.scene.enter('ADD_BOOK_SCENE');
    } catch (error) {
      logger.error('Error entering add book scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при переході до додавання книги.');
    }
    return;
  });
  
  // Управління книгами
  bot.action('manage_books', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('Завантаження списку книг...');
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      ctx.scene.enter('MANAGE_BOOKS_SCENE');
    } catch (error) {
      logger.error('Error entering manage books scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при переході до управління книгами.');
    }
    return;
  });
  
  // Керування промокодами
  bot.action('manage_promo_codes', async (ctx: BotContext) => {
    try {
      await ctx.answerCbQuery('Завантаження системи промокодів...');
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      ctx.scene.enter('PROMO_ADMIN_SCENE');
    } catch (error) {
      logger.error('Error entering promo admin scene', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при переході до керування промокодами.');
    }
    return;
  });
  
  // Статистика
  bot.action('admin_stats', async (ctx) => {
    try {
      await ctx.answerCbQuery('Завантаження статистики...');
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const stats = await getAdminStats();
      const pendingReviews = await getPendingReviews();
      
      await ctx.reply(
        `📊 *Статистика бібліотеки:*\n\n` +
        `📚 Всього книг: ${stats.totalBooks}\n` +
        `📝 Відгуків на модерацію: ${pendingReviews.length}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      logger.error('Error getting admin stats', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при отриманні статистики.');
    }
    return;
  });
  
  // Обробники approve/reject видалені - більше не використовуємо фізичні книги
  
  // Модерація відгуків
  bot.action('moderate_reviews', async (ctx) => {
    try {
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
          
          // ✅ ВИПРАВЛЕНО #17: використовуємо HTML замість Markdown для безпечного екранування
          const escapeHtml = (text: string) => {
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          };
          
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
            reviewText += `💬 Коментар: <i>(відсутній)</i>\n\n`;
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
    } catch (error) {
      logger.error('Error showing pending reviews', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply('❌ Виникла помилка при отриманні відгуків.');
    }
    return;
  });
  
  // Публікація відгуку
  bot.action(/publish_review_(\d+)/, async (ctx: BotContext) => {
    try {
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
      const { publishReview } = await import('../database/models');
      
      const result = await publishReview(reviewId);
      
      if (result > 0) {
        const message = ctx.callbackQuery?.message;
        const messageText = message && 'text' in message ? message.text : 'Відгук';
        await ctx.editMessageText(
          messageText + '\n\n✅ *ОПУБЛІКОВАНО*',
          { parse_mode: 'Markdown' }
        );
        await ctx.answerCbQuery('✅ Відгук опубліковано!');
      } else {
        await ctx.answerCbQuery('⚠️ Відгук не знайдено');
      }
    } catch (error) {
      logger.error('Error publishing review', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при публікації відгуку');
    }
    return;
  });
  
  // Видалення відгуку
  bot.action(/delete_review_(\d+)/, async (ctx: BotContext) => {
    try {
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
      const { deleteReview } = await import('../database/models');
      
      const result = await deleteReview(reviewId);
      
      if (result > 0) {
        const message = ctx.callbackQuery?.message;
        const messageText = message && 'text' in message ? message.text : 'Відгук';
        await ctx.editMessageText(
          messageText + '\n\n❌ *ВИДАЛЕНО*',
          { parse_mode: 'Markdown' }
        );
        await ctx.answerCbQuery('✅ Відгук видалено!');
      } else {
        await ctx.answerCbQuery('⚠️ Відгук не знайдено');
      }
    } catch (error) {
      logger.error('Error deleting review', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при видаленні відгуку');
    }
    return;
  });
  
  // Перегляд повідомлень зворотного зв'язку
  bot.action('view_feedback', async (ctx) => {
    try {
      await ctx.answerCbQuery('Завантаження повідомлень...');
      
      const adminCheck = await isAdmin(ctx.from!.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const messages = await getAllFeedbackMessages();
      
      console.log(`📞 Feedback messages loaded: ${messages.length}`);
      
      if (messages.length === 0) {
        await ctx.reply(
          '✅ *Немає повідомлень*\n\n' +
          'Всі повідомлення зворотного зв\'язку оброблені.\n\n' +
          '💡 Користувачі можуть надіслати повідомлення через:\n' +
          'Головне меню → 📞 Зворотній зв\'язок',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      await ctx.reply(
        `📞 *Повідомлення зворотного зв'язку*\n\n` +
        `Всього: ${messages.length}\n` +
        `Нових: ${messages.filter(m => m.status === 'pending').length}`,
        { parse_mode: 'Markdown' }
      );
      
      for (const msg of messages) {
        try {
          // Перевіряємо чи є текст повідомлення
          if (!msg.message || msg.message.trim() === '') {
            console.warn(`⚠️ Empty feedback message #${msg.id}`);
            await ctx.reply(
              `⚠️ *Повідомлення #${msg.id}*\n\n` +
              `❌ Текст повідомлення відсутній або пошкоджений.\n\n` +
              `👤 Від: ${msg.user_name || 'Користувач'}\n` +
              `🆔 User ID: \`${msg.user_id}\``,
              { parse_mode: 'Markdown' }
            );
            continue;
          }
          
          const statusEmoji = msg.status === 'pending' ? '🔔 НОВЕ' : 
                             msg.status === 'read' ? '✅ Прочитано' : 
                             '💬 Відповіли';
          
          // ✅ ВИПРАВЛЕНО #17: використовуємо HTML замість Markdown для безпечного екранування
          const escapeHtml = (text: string) => {
            return text
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          };
          
          const safeName = escapeHtml(msg.user_name || 'Користувач');
          const safeUsername = msg.user_username ? escapeHtml(msg.user_username) : '';
          const safeMessage = escapeHtml(msg.message);
          const safeCreatedAt = escapeHtml(new Date(msg.created_at!).toLocaleString('uk-UA'));
          const safeReadAt = msg.read_at ? escapeHtml(new Date(msg.read_at).toLocaleString('uk-UA')) : '';
          
          let feedbackText = `📞 <b>Повідомлення #${msg.id}</b> ${statusEmoji}\n\n`;
          feedbackText += `👤 Від: ${safeName}\n`;
          feedbackText += `🆔 User ID: <code>${msg.user_id}</code>\n`;
          
          if (msg.user_username) {
            feedbackText += `📱 Username: @${safeUsername}\n`;
          }
          
          feedbackText += `\n💬 <b>Повідомлення:</b>\n"${safeMessage}"\n\n`;
          feedbackText += `📅 Дата: ${safeCreatedAt}`;
          
          if (msg.read_at) {
            feedbackText += `\n👁️ Прочитано: ${safeReadAt}`;
          }
          
          await ctx.reply(feedbackText, {
            parse_mode: 'HTML',
            reply_markup: getFeedbackActionKeyboard(msg.id!, msg.user_id)
          });
          
          // Невелика затримка щоб не флудити
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (msgError) {
          logger.error('Error displaying feedback message', msgError instanceof Error ? msgError : new Error(String(msgError)), { feedbackId: msg.id });
          
          // Показуємо помилку адміну
          await ctx.reply(
            `❌ Помилка при відображенні повідомлення #${msg.id}\n` +
            `Деталі: ${msgError instanceof Error ? msgError.message : String(msgError)}`
          );
        }
      }
      
      await ctx.reply(
        '✅ Всі повідомлення завантажено',
        {
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔄 Оновити', 'view_feedback')],
            [Markup.button.callback('🏠 Головна', 'home')]
          ]).reply_markup
        }
      );
      
    } catch (error) {
      logger.error('Error showing feedback messages', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.reply(
        '❌ Виникла помилка при отриманні повідомлень.\n\n' +
        `Деталі: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    return;
  });
  
  // Відповісти на повідомлення
  bot.action(/reply_feedback_(\d+)/, async (ctx: BotContext) => {
    try {
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
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID повідомлення.');
        return;
      }
      const feedbackId = parseInt(match[1]);
      
      // Отримуємо повідомлення з БД
      const allMessages = await getAllFeedbackMessages();
      const message = allMessages.find(m => m.id === feedbackId);
      
      if (!message) {
        await ctx.answerCbQuery('❌ Повідомлення не знайдено');
        return;
      }
      
      await ctx.answerCbQuery('✉️ Відкриваю форму відповіді...');
      
      // Входимо в scene для відповіді
      await ctx.scene.enter('REPLY_FEEDBACK_SCENE', {
        feedbackId: message.id,
        userId: message.user_id,
        userName: message.user_name || 'Користувач',
        originalMessage: message.message
      });
      
    } catch (error) {
      logger.error('Error opening reply form', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при відкритті форми відповіді');
    }
    return;
  });
  
  // Позначити повідомлення прочитаним
  bot.action(/mark_feedback_read_(\d+)/, async (ctx: BotContext) => {
    try {
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
        await ctx.answerCbQuery('❌ Помилка: не вдалося отримати ID повідомлення.');
        return;
      }
      const feedbackId = parseInt(match[1]);
      
      await updateFeedbackStatus(feedbackId, 'read');
      
      // Безпечне оновлення повідомлення без Markdown
      const message = ctx.callbackQuery?.message;
      if (message && 'text' in message) {
        try {
          // Екрануємо спецсимволи для безпечного Markdown
          const escapeMarkdown = (text: string) => {
            return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
          };
          
          const safeText = escapeMarkdown(message.text.replace('🔔 НОВЕ', '✅ Прочитано'));
          await ctx.editMessageText(safeText, { parse_mode: 'Markdown' });
        } catch (editError) {
          // Якщо не вдалося відредагувати - просто відповідаємо
          console.log('Could not edit message, sending new one');
        }
      }
      
      await ctx.answerCbQuery('✅ Позначено прочитаним!');
    } catch (error) {
      logger.error('Error marking feedback as read', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      await ctx.answerCbQuery('❌ Помилка при оновленні статусу');
    }
    return;
  });
};