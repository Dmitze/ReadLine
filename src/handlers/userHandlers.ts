import { Telegraf } from 'telegraf';
import { getGenres, getBooksByGenre } from '../database/models';
import { getGenreKeyboard, getBookOrderKeyboard } from '../keyboards/mainKeyboards';

// Обробники для звичайних користувачів
export default (bot: Telegraf<any>) => {
  // Перегляд каталогу
  bot.hears('📖 Перегляд каталогу', async (ctx) => {
    try {
      const genres = await getGenres();
      const keyboard = getGenreKeyboard(genres);
      
      await ctx.reply('📚 Оберіть жанр:', {
        reply_markup: keyboard
      });
    } catch (error) {
      console.error('Error getting genres:', error);
      await ctx.reply('❌ Виникла помилка при отриманні жанрів.');
    }
  });
  
  // Пошук книги
  bot.hears('🔍 Пошук книги', async (ctx: any) => {
    ctx.scene.enter('SEARCH_SCENE');
    return;
  });
  
  // Профіль користувача
  bot.hears('👤 Мій профіль', async (ctx: any) => {
    ctx.scene.enter('PROFILE_SCENE');
    return;
  });
  
  // Мої заявки
  bot.hears('📋 Мої заявки', async (ctx: any) => {
    ctx.scene.enter('PROFILE_SCENE', { isMyRequests: true });
    return;
  });
  
  // Показ книг за жанром
  bot.on('message', async (ctx: any) => {
    // Перевіряємо чи є текст в повідомленні
    if (!ctx.message?.text) return;
    
    const messageText = ctx.message.text;
    
    try {
      const genres = await getGenres();
      
      if (genres.includes(messageText)) {
        const books = await getBooksByGenre(messageText);
        
        if (books.length === 0) {
          await ctx.reply('📭 На жаль, в цьому жанрі ще немає книг.');
          return;
        }
        
        for (const book of books) {
          await ctx.replyWithPhoto(book.photo_file_id, {
            caption: `📖 *${book.title}*
👤 Автор: ${book.author}
📚 Жанр: ${book.genre}
📝 Опис: ${book.description}
📍 Статус: ${book.is_available ? 'Доступна' : 'Недоступна'}`,
            parse_mode: 'Markdown',
            reply_markup: getBookOrderKeyboard(book.id!)
          });
        }
      }
    } catch (error) {
      console.error('Error getting books by genre:', error);
      await ctx.reply('❌ Виникла помилка при отриманні книг.');
    }
    return;
  });
  
  // Обробка кнопки "Замовити"
  bot.action(/order_(\d+)/, async (ctx: any) => {
    const bookId = ctx.match[1];
    ctx.scene.enter('REQUEST_BOOK_SCENE', { bookId });
    return;
  });
};