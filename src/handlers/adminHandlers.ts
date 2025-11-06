import { Telegraf } from 'telegraf';
import { isAdmin, getPendingRequests, getBookById, getAdminStats, updateRequestStatus } from '../database/models';
import { getAdminMenuKeyboard, getRequestActionKeyboard } from '../keyboards/adminKeyboards';

// Обробники для адміністратора
export default (bot: Telegraf<any>) => {
  // Команда адміністратора
  bot.command('admin', async (ctx) => {
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
      
      await ctx.reply(`🛠️ Панель адміністратора

📊 Статистика:
📚 Книг: ${stats.totalBooks}
⏳ Заявок: ${stats.pendingRequests}`, {
        reply_markup: getAdminMenuKeyboard()
      });
    } catch (error) {
      console.error('Error in admin command:', error);
      await ctx.reply('❌ Виникла помилка при отриманні даних адміністратора.');
    }
    return;
  });
  
  // Перегляд заявок
  bot.action('view_requests', async (ctx) => {
    try {
      const requests = await getPendingRequests();
      
      if (requests.length === 0) {
        await ctx.editMessageText('Немає активних заявок ✅');
        return;
      }
      
      for (const request of requests) {
        try {
          const book = await getBookById(request.book_id);
          await ctx.reply(
            `📋 Заявка #${request.id}
📖 ${book?.title}
👤 ${request.full_name}
🎯 ${request.unit}
📞 ${request.phone}`,
            {
              reply_markup: getRequestActionKeyboard(request.id!)
            }
          );
        } catch (bookError) {
          console.error('Error getting book for request:', bookError);
          await ctx.reply(`📋 Заявка #${request.id}
⚠️ Помилка отримання даних книги
👤 ${request.full_name}
🎯 ${request.unit}
📞 ${request.phone}`, {
            reply_markup: getRequestActionKeyboard(request.id!)
          });
        }
      }
    } catch (error) {
      console.error('Error getting pending requests:', error);
      await ctx.reply('❌ Виникла помилка при отриманні заявок.');
    }
    return;
  });
  
  // Додати книгу
  bot.action('add_book', async (ctx: any) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      ctx.scene.enter('ADD_BOOK_SCENE');
    } catch (error) {
      console.error('Error entering add book scene:', error);
      await ctx.reply('❌ Виникла помилка при переході до додавання книги.');
    }
    return;
  });
  
  // Статистика
  bot.action('admin_stats', async (ctx) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const stats = await getAdminStats();
      await ctx.reply(`📊 Статистика бібліотеки:\n\n📚 Всього книг: ${stats.totalBooks}\n⏳ Активних заявок: ${stats.pendingRequests}`);
    } catch (error) {
      console.error('Error getting admin stats:', error);
      await ctx.reply('❌ Виникла помилка при отриманні статистики.');
    }
    return;
  });
  
  // Підтвердження заявки
  bot.action(/approve_(\d+)/, async (ctx) => {
    try {
      // Перевіряємо чи є користувач
      if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return;
      }
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const requestId = parseInt(ctx.match[1]);
      const result = await updateRequestStatus(requestId, 'approved');
      
      if (result > 0) {
        await ctx.reply(`✅ Заявку #${requestId} підтверджено!`);
      } else {
        await ctx.reply(`⚠️ Заявку #${requestId} не знайдено або вже оброблено.`);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      await ctx.reply('❌ Виникла помилка при підтвердженні заявки.');
    }
    return;
  });
  
  // Відхилення заявки
  bot.action(/reject_(\d+)/, async (ctx) => {
    try {
      // Перевіряємо чи є користувач
      if (!ctx.from?.id) {
        await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
        return;
      }
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const requestId = parseInt(ctx.match[1]);
      const result = await updateRequestStatus(requestId, 'rejected');
      
      if (result > 0) {
        await ctx.reply(`❌ Заявку #${requestId} відхилено!`);
      } else {
        await ctx.reply(`⚠️ Заявку #${requestId} не знайдено або вже оброблено.`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      await ctx.reply('❌ Виникла помилка при відхиленні заявки.');
    }
    return;
  });
};