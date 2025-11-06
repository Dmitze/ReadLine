import { Scenes, Markup } from 'telegraf';
import { addBook } from '../database/models';
import { formatBookCaption } from '../utils/helpers';

const addBookScene = new Scenes.WizardScene(
  'ADD_BOOK_SCENE',
  // Крок 1: Назва книги
  async (ctx) => {
    await ctx.reply('📖 Введіть назву книги:');
    return ctx.wizard.next();
  },
  // Крок 2: Автор
  async (ctx) => {
    ctx.wizard.state.title = ctx.message.text;
    await ctx.reply('👤 Введіть автора книги:');
    return ctx.wizard.next();
  },
  // Крок 3: Жанр (з кнопками)
  async (ctx) => {
    ctx.wizard.state.author = ctx.message.text;
    const genres = ['Художня', 'Військова', 'Історична', 'Технічна', 'Психологія', 'Біографія'];
    
    await ctx.reply('📚 Оберіть жанр книги:', {
      reply_markup: Markup
        .keyboard(genres.map(genre => [genre]))
        .oneTime()
        .resize()
        .reply_markup
    });
    return ctx.wizard.next();
  },
  // Крок 4: Опис
  async (ctx) => {
    ctx.wizard.state.genre = ctx.message.text;
    await ctx.reply('📝 Введіть короткий опис книги:');
    return ctx.wizard.next();
  },
  // Крок 5: Фото
  async (ctx) => {
    ctx.wizard.state.description = ctx.message.text;
    await ctx.reply('🖼️ Завантажте фото обкладинки книги:');
    return ctx.wizard.next();
  },
  // Крок 6: Збереження
  async (ctx: any) => {
    if (ctx.message?.photo) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      ctx.wizard.state.photoFileId = photo.file_id;
      
      // Збереження в базу даних
      const bookData = {
        title: ctx.wizard.state.title,
        author: ctx.wizard.state.author,
        genre: ctx.wizard.state.genre,
        description: ctx.wizard.state.description,
        photo_file_id: ctx.wizard.state.photoFileId
      };
      
      try {
        const bookId = await addBook(bookData);
        
        await ctx.reply('✅ Книга успішно додана до бібліотеки!', {
          reply_markup: Markup.removeKeyboard().reply_markup
        });
        
        // Показати додану книгу
        await ctx.replyWithPhoto(photo.file_id, {
          caption: formatBookCaption({...bookData, id: bookId, is_available: true}),
          parse_mode: 'Markdown'
        });
      } catch (error) {
        console.error('Error saving book:', error);
        await ctx.reply('❌ Виникла помилка при додаванні книги. Спробуйте ще раз.', {
          reply_markup: Markup.removeKeyboard().reply_markup
        });
      }
    } else {
      await ctx.reply('❌ Будь ласка, завантажте фото обкладинки.');
      return;
    }
    return ctx.scene.leave();
  }
);

export default addBookScene;