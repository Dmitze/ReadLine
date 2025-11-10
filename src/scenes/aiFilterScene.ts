// AI-фільтр для каталогу (Завдання 32)
import { Scenes, Markup } from 'telegraf';
import { BotContext, WizardState } from '../types/telegraf';
import { getMoodBasedBooks } from '../utils/aiHelper';
import { formatBookCaption } from '../utils/helpers';
import { getEnhancedBookKeyboard } from '../keyboards/mainKeyboards';
import { logger } from '../utils/logger';

const aiFilterScene = new Scenes.WizardScene(
  'AI_FILTER_SCENE',
  
  // Крок 1: Вибір настрою
  async (ctx) => {
    await ctx.reply(
      '🤖 *AI-підбір книг*\n\n' +
      'Який настрій сьогодні?',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '😊 Веселий', callback_data: 'mood_happy' }],
            [{ text: '😌 Спокійний', callback_data: 'mood_calm' }],
            [{ text: '🏃 Пригодницький', callback_data: 'mood_adventure' }],
            [{ text: '💕 Романтичний', callback_data: 'mood_romantic' }],
            [{ text: '🤔 Філософський', callback_data: 'mood_philosophical' }],
            [{ text: '✍️ Описати своїми словами', callback_data: 'mood_custom' }],
            [{ text: '❌ Скасувати', callback_data: 'cancel' }]
          ]
        }
      }
    );
    return ctx.wizard.next();
  },
  
  // Крок 2: Обробка вибору
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, оберіть настрій за допомогою кнопок');
      return;
    }

    const data = ctx.callbackQuery.data;
    
    if (data === 'cancel') {
      await ctx.answerCbQuery('❌ Скасовано');
      await ctx.reply('❌ AI-підбір скасовано');
      return ctx.scene.leave();
    }

    if (data === 'mood_custom') {
      await ctx.answerCbQuery('✍️ Опишіть настрій');
      await ctx.editMessageText(
        '✍️ Опишіть свій настрій або що хочете почитати:\n\n' +
        'Наприклад:\n' +
        '• "Хочу щось легке для відпочинку"\n' +
        '• "Потрібно щось мотивуюче"\n' +
        '• "Хочу посміятися"'
      );
      
      const state = ctx.wizard.state as WizardState;
      state.waitingForCustomMood = true;
      return;
    }

    // Стандартний настрій
    const mood = data.replace('mood_', '');
    await ctx.answerCbQuery('🤖 Шукаю книги...');
    await ctx.editMessageText('🤖 Аналізую ваш настрій та підбираю книги...');

    try {
      // Отримуємо всі доступні книги
      const { getAllAvailableBooks } = await import('../database/models');
      const allBooks = await getAllAvailableBooks();
      
      if (allBooks.length === 0) {
        await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
        return ctx.scene.leave();
      }

      // AI підбирає книги
      const books = await getMoodBasedBooks(mood, allBooks);

      if (books.length === 0) {
        await ctx.reply('😔 Не вдалося підібрати книги для вашого настрою. Спробуйте інший настрій.');
        return ctx.scene.leave();
      }

      await ctx.reply(
        `✨ Знайшов ${books.length} ${books.length === 1 ? 'книгу' : 'книги'} для вашого настрою!\n\n` +
        'Ось чому саме ці книги:'
      );

      // Показуємо книги з поясненнями
      for (const book of books) {
        const caption = 
          `📖 *${book.title}*\n` +
          `👤 ${book.author}\n` +
          `📚 ${book.genre}\n\n` +
          `🤖 Підібрано за вашим настроєм`;

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

      logger.userAction(ctx.from?.id || 0, 'ai_filter_mood', { mood, booksFound: books.length });

    } catch (error) {
      logger.error('Error in AI filter', error instanceof Error ? error : new Error(String(error)));
      await ctx.reply('❌ Виникла помилка при підборі книг. Спробуйте ще раз.');
    }

    return ctx.scene.leave();
  }
);

// Обробка кастомного настрою
aiFilterScene.on('text', async (ctx) => {
  const state = ctx.wizard.state as WizardState;
  
  if (!state.waitingForCustomMood) {
    return;
  }

  const customMood = ctx.message.text;
  await ctx.reply('🤖 Аналізую ваш запит та підбираю книги...');

  try {
    const { getAllAvailableBooks } = await import('../database/models');
    const allBooks = await getAllAvailableBooks();
    
    if (allBooks.length === 0) {
      await ctx.reply('📭 На жаль, в бібліотеці поки немає книг');
      return ctx.scene.leave();
    }

    const books = await getMoodBasedBooks(customMood, allBooks);

    if (books.length === 0) {
      await ctx.reply('😔 Не вдалося підібрати книги. Спробуйте описати інакше.');
      return ctx.scene.leave();
    }

    await ctx.reply(`✨ Знайшов ${books.length} ${books.length === 1 ? 'книгу' : 'книги'} для вас!`);

    for (const book of books) {
      const caption = 
        `📖 *${book.title}*\n` +
        `👤 ${book.author}\n` +
        `📚 ${book.genre}\n\n` +
        `🤖 Відповідає вашому запиту`;

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

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    logger.userAction(ctx.from?.id || 0, 'ai_filter_custom', { mood: customMood, booksFound: books.length });

  } catch (error) {
    logger.error('Error in custom AI filter', error instanceof Error ? error : new Error(String(error)));
    await ctx.reply('❌ Виникла помилка. Спробуйте ще раз.');
  }

  return ctx.scene.leave();
});

export default aiFilterScene;
