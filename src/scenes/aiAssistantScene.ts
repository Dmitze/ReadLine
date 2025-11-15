// AI-помічник для підбору книг (Завдання 35)
import { Scenes, Markup } from 'telegraf';
import { BotContext, WizardState } from '../types/telegraf';
import { interactiveBookSelection } from '../utils/aiHelper';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';
import { getBookIdText } from '../utils/helpers';

const aiAssistantScene = new Scenes.WizardScene(
  'AI_ASSISTANT_SCENE',
  
  // Крок 1: Що цікавить?
  async (ctx) => {
    await ctx.reply(
      '<b>🤖 AI-ПОМІЧНИК</b>\n\n' +
      '<b>Давай знайдемо ідеальну книгу!</b>\n\n' +
      'Цей помічник допоможе вам знайти ідеальну книгу на основі ваших вподобань та настрою. ' +
      'Відповідайте на кілька простих запитань, і я підберу для вас найкращі рекомендації.\n\n' +
      '<b>Що тебе цікавить сьогодні?</b>',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎭 Художня література', callback_data: 'interest_fiction' }],
            [{ text: '📚 Нон-фікшн', callback_data: 'interest_nonfiction' }],
            [{ text: '🎓 Навчальна', callback_data: 'interest_educational' }],
            [{ text: '🤷 Будь-що цікаве', callback_data: 'interest_any' }],
            [{ text: '❌ Скасувати', callback_data: 'cancel' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  
  // Крок 2: Як хочеш користуватися книгою?
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
      return;
    }

    const data = ctx.callbackQuery.data;
    
    if (data === 'cancel') {
      await ctx.answerCbQuery('❌ Скасовано');
      await ctx.reply('❌ Підбір скасовано');
      return ctx.scene.leave();
    }

    const state = ctx.wizard.state as WizardState;
    state.aiInterest = data;

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '<b>📱 Як ти хочеш користуватися книгою?</b>\n\n' +
      'В телеграмі книгу можна скачати, прослухати як аудіокнигу або перейти по посиланню:',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⬇️ Скачати', callback_data: 'format_download' }],
            [{ text: '🎧 Прослухати', callback_data: 'format_audio' }],
            [{ text: '🔗 Посилання', callback_data: 'format_link' }],
            [{ text: '🤷 Будь-що', callback_data: 'format_any' }],
            [{ text: '⬅️ Назад', callback_data: 'back' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  
  // Крок 3: Настрій?
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
      return;
    }

    const data = ctx.callbackQuery.data;
    
    if (data === 'back') {
      await ctx.answerCbQuery('⬅️ Повертаємось');
      return ctx.wizard.selectStep(0);
    }

    const state = ctx.wizard.state as WizardState;
    state.aiFormat = data;

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '<b>😊 Який ваш настрій сьогодні?</b>\n\n' +
      'Це допоможе мені підібрати книгу, яка ідеально вам підійде:',
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '😊 Веселий', callback_data: 'mood_happy' }],
            [{ text: '😌 Спокійний', callback_data: 'mood_calm' }],
            [{ text: '🤔 Задумливий', callback_data: 'mood_thoughtful' }],
            [{ text: '🏃 Енергійний', callback_data: 'mood_energetic' }],
            [{ text: '🤷 Будь-який', callback_data: 'mood_any' }],
            [{ text: '⬅️ Назад', callback_data: 'back' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  
  // Крок 4: AI підбирає книги
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
      return;
    }

    const data = ctx.callbackQuery.data;
    
    if (data === 'back') {
      await ctx.answerCbQuery('⬅️ Повертаємось');
      return ctx.wizard.selectStep(1);
    }

    const state = ctx.wizard.state as WizardState;
    state.aiMood = data;

    await ctx.answerCbQuery('🤖 Шукаю ідеальні книги...');
    await ctx.editMessageText('🤖 Аналізую твої вподобання та шукаю ідеальні книги...');

    // Отримуємо всі доступні книги
    const { getAllAvailableBooks } = await import('../database/models');
    const allBooks = await getAllAvailableBooks();
    
    if (allBooks.length === 0) {
      await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
      return ctx.scene.leave();
    }

    // AI підбирає книги
    const books = await interactiveBookSelection({
      interest: state.aiInterest || 'interest_any',
      format: state.aiFormat || 'format_any',
      mood: state.aiMood || 'mood_any'
    }, allBooks);

    if (books.length === 0) {
      await ctx.reply('😔 Не вдалося підібрати книги за вашими критеріями. Спробуйте інші параметри.');
      return ctx.scene.leave();
    }

    await ctx.reply(
      `<b>✨ Знайшов ${books.length} ідеальних ${books.length === 1 ? 'варіант' : 'варіанти'}!</b>\n\n` +
      '<b>Ось чому саме ці книги вам будуть цікаві:</b>',
      { parse_mode: 'HTML' }
    );

    // Показуємо книги з поясненнями
    for (const book of books) {
      const caption = 
        `<b>📖 ${book.title}</b>${getBookIdText(book.id)}\n` +
        `<b>Автор:</b> ${book.author}\n` +
        `<b>Жанр:</b> ${book.genre}\n\n` +
        `🤖 <i>Рекомендовано на основі ваших вподобань та настрою</i>`;

      if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
        await ctx.replyWithPhoto(book.photo_file_id, {
          caption,
          parse_mode: 'HTML',
          reply_markup: getEnhancedBookKeyboard(book)
        });
      } else {
        await ctx.reply(caption, {
          parse_mode: 'HTML',
          reply_markup: getEnhancedBookKeyboard(book)
        });
      }

      // Затримка між повідомленнями
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.userAction(ctx.from?.id || 0, 'ai_assistant_selection', {
      interest: state.aiInterest,
      format: state.aiFormat,
      mood: state.aiMood,
      booksFound: books.length
    });

    return ctx.scene.leave();
  }
);

// Cleanup при виході зі сцени
aiAssistantScene.leave((ctx) => {
  const state = ctx.wizard?.state as WizardState;
  if (state) {
    delete state.aiInterest;
    delete state.aiFormat;
    delete state.aiMood;
  }
  logger.debug('AIAssistantScene cleanup completed', { userId: ctx.from?.id });
});

export default aiAssistantScene;
