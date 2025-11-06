const { Scenes } = require('telegraf');
const { getAllBooks } = require('../database/models');
const { getBookOrderKeyboard } = require('../keyboards/mainKeyboards');

const searchScene = new Scenes.BaseScene('SEARCH_SCENE');

searchScene.enter(async (ctx) => {
  await ctx.reply('🔍 Введіть назву книги або автора для пошуку:');
});

searchScene.on('text', async (ctx) => {
  const searchTerm = ctx.message.text.toLowerCase();
  
  try {
    const books = await getAllBooks();
    const matchingBooks = books.filter(book => 
      book.title.toLowerCase().includes(searchTerm) || 
      book.author.toLowerCase().includes(searchTerm)
    );
    
    if (matchingBooks.length === 0) {
      await ctx.reply('📭 За вашим запитом нічого не знайдено. Спробуйте інший пошуковий запит.');
      return ctx.scene.leave();
    }
    
    await ctx.reply(`🔍 Результати пошуку (${matchingBooks.length} знайдено):`);
    
    for (const book of matchingBooks) {
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
  } catch (error) {
    console.error('Error searching books:', error);
    await ctx.reply('❌ Виникла помилка при пошуку книг.');
  }
  
  return ctx.scene.leave();
});

module.exports = searchScene;