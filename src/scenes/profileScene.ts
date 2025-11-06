import { Scenes } from 'telegraf';
import { getUserRequests } from '../database/models';

const profileScene = new Scenes.BaseScene('PROFILE_SCENE');

profileScene.enter(async (ctx: any) => {
  try {
    if (!ctx.from?.id) {
      await ctx.reply('❌ Не вдалося ідентифікувати користувача.');
      return ctx.scene?.leave();
    }
    
    const userId = ctx.from.id;
    const requests = await getUserRequests(userId);
    
    let profileText = `👤 *Ваш профіль*\n\n`;
    profileText += `🆔 ID: ${userId}\n`;
    profileText += `📝 Ім'я: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''}\n`;
    profileText += `🔖 Username: @${ctx.from.username || 'не встановлено'}\n\n`;
    profileText += `📊 *Статистика*\n`;
    profileText += `📋 Всього заявок: ${requests.length}\n\n`;
    
    if (requests.length > 0) {
      profileText += `📚 *Останні заявки:*\n\n`;
      
      // Show only last 5 requests
      const recentRequests = requests.slice(0, 5);
      
      for (const request of recentRequests) {
        const statusEmoji = 
          request.status === 'approved' ? '✅' : 
          request.status === 'rejected' ? '❌' : 
          '⏳';
          
        profileText += `${statusEmoji} *Заявка #${request.id}*\n`;
        profileText += `📖 Книга: ${request.book_title || 'Невідома'}\n`;
        profileText += `📅 Дата: ${request.created_at ? new Date(request.created_at).toLocaleDateString('uk-UA') : 'Невідомо'}\n`;
        profileText += `📊 Статус: ${request.status || 'очікує'}\n\n`;
      }
      
      if (requests.length > 5) {
        profileText += `... і ще ${requests.length - 5} заявок\n\n`;
      }
    } else {
      profileText += `📭 У вас ще немає заявок.\n`;
      profileText += `📖 Використовуйте кнопку "📖 Перегляд каталогу" для пошуку книг!`;
    }
    
    await ctx.reply(profileText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in profile scene:', error);
    await ctx.reply('❌ Виникла помилка при отриманні профілю.');
  }
  
  return ctx.scene?.leave();
});

export default profileScene;