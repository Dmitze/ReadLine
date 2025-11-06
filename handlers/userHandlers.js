const { getGenres, getBooksByGenre } = require('../database/models');
const { getGenreKeyboard, getBookOrderKeyboard } = require('../keyboards/mainKeyboards');

// Обробники для звичайних користувачів
module.exports = (bot) => {
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
  bot.hears('🔍 Пошук книги', async (ctx) => {
    ctx.scene.enter('SEARCH_SCENE');
  });
  
  // Показ книг за жанром
  bot.on('message', async (ctx) => {
    const messageText = ctx.message.text;
    
    try {
      const genres = await getGenres();
      
      if (genres.includes(messageText)) {
        const books = await getBooksByGenre(messageText);
        
        if (books.length === 0) {
          return ctx.reply('📭 На жаль, в цьому жанрі ще немає книг.');
        }
        
        for (const book of books) {
          await ctx.replyWithPhoto(book.photo_file_id, {
            caption: `📖 *${book.title}*
👤 Автор: ${book.author}
📚 Жанр: ${book.genre}
📝 Опис: ${book.description}
📍 Статус: ${book.is_available ? 'Доступна' : 'Недоступна'}`,
            parse_mode: 'Markdown',
            reply_markup: getBookOrderKeyboard(book.id)
          });
        }
      }
    } catch (error) {
      console.error('Error getting books by genre:', error);
      await ctx.reply('❌ Виникла помилка при отриманні книг.');
    }
  });
  
  // Обробка кнопки "Замовити"
  bot.action(/order_(\d+)/, async (ctx) => {
    const bookId = ctx.match[1];
    ctx.scene.enter('REQUEST_BOOK_SCENE', { bookId });
  });
};