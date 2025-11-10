// AI-помічник для підбору книг (Завдання 35)
import { Scenes, Markup } from 'telegraf';
import { BotContext, WizardState } from '../types/telegraf';
import { interactiveBookSelection } from '../utils/aiHelper';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';

const aiAssistantScene = new Scenes.WizardScene(
  'AI_ASSISTANT_SCENE',
  
  // Крок 1: Що цікавить?
  async (ctx) => {
    await ctx.reply(
      '🤖 *Давай знайдемо ідеальну книгу!*\n\n' +
      'Що тебе цікавить сьогодні?',
      {
        parse_mode: 'Markdown',
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
  
  // Крок 2: Скільки часу?
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
      '⏰ *Скільки часу маєш на читання?*',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📖 Коротка (< 200 стор)', callback_data: 'length_short' }],
            [{ text: '📚 Середня (200-400 стор)', callback_data: 'length_medium' }],
            [{ text: '📕 Довга (> 400 стор)', callback_data: 'length_long' }],
            [{ text: '🤷 Не важливо', callback_data: 'length_any' }],
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
    state.aiLength = data;

    await ctx.answerCbQuery();
    await ctx.editMessageText(
      '😊 *Який настрій?*',
      {
        parse_mode: 'Markdown',
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

    try {
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
        length: state.aiLength || 'length_any',
        mood: state.aiMood || 'mood_any'
      }, allBooks);

      if (books.length === 0) {
        await ctx.reply('😔 Не вдалося підібрати книги за вашими критеріями. Спробуйте інші параметри.');
        return ctx.scene.leave();
      }

      await ctx.reply(
        `✨ *Знайшов ${books.length} ідеальних ${books.length === 1 ? 'варіант' : 'варіанти'}!*\n\n` +
        'Ось чому саме ці книги:',
        { parse_mode: 'Markdown' }
      );

      // Показуємо книги з поясненнями
      for (const book of books) {
        const caption = 
          `📖 *${book.title}*\n` +
          `👤 ${book.author}\n` +
          `📚 ${book.genre}\n\n` +
          `🤖 Рекомендовано на основі ваших вподобань`;

        if (book.photo_file_id && book.photo_file_id !== 'default_book_cover') {
          await ctx.replyWithPhoto(book.photo_file_id, {
            caption,
            parse_mode: 'Markdown',
            reply_markup: getEnhancedBookKeyboard(book)
          });
        } else {
          await ctx.reply(caption, {
            parse_mode: 'Markdown',
            reply_markup: getEnhancedBookKeyboard(book)
          });
        }

        // Затримка між повідомленнями
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      logger.userAction(ctx.from?.id || 0, 'ai_assistant_selection', {
        interest: state.aiInterest,
        length: state.aiLength,
        mood: state.aiMood,
        booksFound: books.length
      });

    } catch (error) {
      logger.error('Error in AI assistant', error instanceof Error ? error : new Error(String(error)));
      await ctx.reply('❌ Виникла помилка при підборі книг. Спробуйте ще раз.');
    }

    return ctx.scene.leave();
  }
);

export default aiAssistantScene;
