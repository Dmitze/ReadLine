import { Telegraf, Markup } from 'telegraf';
import { isAdmin, getExtendedAdminStats } from '../../database/models';
import { logger } from '../../utils/logger';
import { BotContext } from '../../types/telegraf';

export default (bot: Telegraf<BotContext>) => {
  bot.action('admin_stats', async (ctx) => {
    (async () => {
      await ctx.answerCbQuery('Завантаження розширеної статистики...');
      
      const adminCheck = await isAdmin(ctx.from.id);
      if (!adminCheck) {
        await ctx.reply('❌ У вас немає доступу до цієї функції.');
        return;
      }
      
      const stats = await getExtendedAdminStats();
      
      let statsText = '📊 <b>РОЗШИРЕНА СТАТИСТИКА БІБЛІОТЕКИ</b>\n\n';
      
      // Основна статистика
      statsText += '📈 <b>Основні показники:</b>\n';
      statsText += `📚 Всього книг: ${stats.totalBooks}\n`;
      statsText += `👥 Унікальних користувачів: ${stats.totalUsers}\n`;
      statsText += `💾 Збережено книг: ${stats.totalSavedBooks}\n`;
      statsText += `⭐ Середня оцінка: ${stats.avgRating}\n\n`;
      
      // Відгуки та зворотний зв'язок
      statsText += '📝 <b>Контент:</b>\n';
      statsText += `💬 Всього відгуків: ${stats.totalReviews}\n`;
      statsText += `❌ На модерацію: ${stats.pendingReviews}\n`;
      statsText += `📞 Повідомлень зворотного зв'язку: ${stats.totalFeedback}\n`;
      statsText += `🔔 Нових повідомлень: ${stats.pendingFeedback}\n\n`;
      
      // Активність за період
      statsText += '📅 <b>Активність:</b>\n';
      statsText += `🆕 Нових користувачів сьогодні: ${stats.newUsersToday}\n`;
      statsText += `📖 Нових книг цього місяця: ${stats.newBooksThisMonth}\n`;
      statsText += `✅ Активних користувачів (30 днів): ${stats.activeUsersThisMonth}\n\n`;
      
      // Топ жанри
      if (stats.topGenres.length > 0) {
        statsText += '📂 <b>Топ жанри:</b>\n';
        stats.topGenres.forEach((g, i) => {
          statsText += `${i + 1}. ${g.genre} (${g.count} книг)\n`;
        });
        statsText += '\n';
      }
      
      // Топ-рейтингові книги
      if (stats.topRatedBooks.length > 0 && stats.topRatedBooks.some(b => b.rating)) {
        statsText += '⭐ <b>Топ книги за рейтингом:</b>\n';
        stats.topRatedBooks.forEach((b, i) => {
          if (b.rating) {
            statsText += `${i + 1}. ${b.title} (${b.rating}/5) - ${b.author}\n`;
          }
        });
      }
      
      await ctx.reply(statsText, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('🔄 Оновити', 'admin_stats')],
          [Markup.button.callback('🏠 Назад до адмін-панелі', 'admin_back')]
        ]).reply_markup
      });
    })().catch((error) => {
      logger.error('Error getting admin stats', error instanceof Error ? error : new Error(String(error)), { userId: ctx.from?.id });
      ctx.reply('❌ Виникла помилка при отриманні статистики.');
    });
    return;
  });
};
