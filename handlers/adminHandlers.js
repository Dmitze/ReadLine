const { isAdmin, getPendingRequests, getBookById, getAdminStats, updateRequestStatus } = require('../database/models');
const { getAdminMenuKeyboard, getRequestActionKeyboard } = require('../keyboards/adminKeyboards');

// Обробники для адміністратора
module.exports = (bot) => {
  // Команда адміністратора
  bot.command('admin', async (ctx) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      
      if (!adminCheck) {
        return ctx.reply('❌ У вас немає доступу до адмін-панелі.');
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
  });
  
  // Перегляд заявок
  bot.action('view_requests', async (ctx) => {
    try {
      const requests = await getPendingRequests();
      
      if (requests.length === 0) {
        return ctx.editMessageText('Немає активних заявок ✅');
      }
      
      for (const request of requests) {
        try {
          const book = await getBookById(request.book_id);
          await ctx.reply(
            `📋 Заявка #${request.id}
📖 ${book.title}
👤 ${request.full_name}
🎯 ${request.unit}
📞 ${request.phone}`,
            {
              reply_markup: getRequestActionKeyboard(request.id)
            }
          );
        } catch (bookError) {
          console.error('Error getting book for request:', bookError);
          await ctx.reply(`📋 Заявка #${request.id}
⚠️ Помилка отримання даних книги
👤 ${request.full_name}
🎯 ${request.unit}
📞 ${request.phone}`, {
            reply_markup: getRequestActionKeyboard(request.id)
          });
        }
      }
    } catch (error) {
      console.error('Error getting pending requests:', error);
      await ctx.reply('❌ Виникла помилка при отриманні заявок.');
    }
  });
  
  // Додати книгу
  bot.action('add_book', async (ctx) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        return ctx.reply('❌ У вас немає доступу до цієї функції.');
      }
      
      ctx.scene.enter('ADD_BOOK_SCENE');
    } catch (error) {
      console.error('Error entering add book scene:', error);
      await ctx.reply('❌ Виникла помилка при переході до додавання книги.');
    }
  });
  
  // Статистика
  bot.action('admin_stats', async (ctx) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        return ctx.reply('❌ У вас немає доступу до цієї функції.');
      }
      
      const stats = await getAdminStats();
      await ctx.reply(`📊 Статистика бібліотеки:\n\n📚 Всього книг: ${stats.totalBooks}\n⏳ Активних заявок: ${stats.pendingRequests}`);
    } catch (error) {
      console.error('Error getting admin stats:', error);
      await ctx.reply('❌ Виникла помилка при отриманні статистики.');
    }
  });
  
  // Підтвердження заявки
  bot.action(/approve_(\d+)/, async (ctx) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        return ctx.reply('❌ У вас немає доступу до цієї функції.');
      }
      
      const requestId = ctx.match[1];
      await updateRequestStatus(requestId, 'approved');
      await ctx.reply(`✅ Заявку #${requestId} підтверджено!`);
    } catch (error) {
      console.error('Error approving request:', error);
      await ctx.reply('❌ Виникла помилка при підтвердженні заявки.');
    }
  });
  
  // Відхилення заявки
  bot.action(/reject_(\d+)/, async (ctx) => {
    try {
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        return ctx.reply('❌ У вас немає доступу до цієї функції.');
      }
      
      const requestId = ctx.match[1];
      await updateRequestStatus(requestId, 'rejected');
      await ctx.reply(`❌ Заявку #${requestId} відхилено!`);
    } catch (error) {
      console.error('Error rejecting request:', error);
      await ctx.reply('❌ Виникла помилка при відхиленні заявки.');
    }
  });
};