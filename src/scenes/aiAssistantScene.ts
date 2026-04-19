import { Scenes, Markup } from 'telegraf';
import { BotContext, WizardState } from '../types/telegraf';
import { interactiveBookSelection } from '../utils/aiHelper';
import { logger } from '../utils/logger';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';

const aiAssistantScene = new Scenes.WizardScene(
  'AI_ASSISTANT_SCENE',

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
            [{ text: '❌ Скасувати', callback_data: 'cancel' }],
          ],
        },
      }
    );
    return ctx.wizard.next();
  },

  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('❌ Будь ласка, оберіть варіант за допомогою кнопок');
      return;
    }

    const data = ctx.callbackQuery.data;

    if (data === 'cancel') {
      await ctx.answerCbQuery('❌ Скасовано');
      await ctx.reply('❌ Підбір скасовано', {
        reply_markup: getMainMenuKeyboard(),
      });
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
            [{ text: '⬅️ Назад', callback_data: 'back' }],
          ],
        },
      }
    );
    return ctx.wizard.next();
  },

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
            [{ text: '⬅️ Назад', callback_data: 'back' }],
          ],
        },
      }
    );
    return ctx.wizard.next();
  },

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

    const { getAllAvailableBooks } = await import('../database/models');
    const allBooks = await getAllAvailableBooks();

    if (allBooks.length === 0) {
      await ctx.reply('📭 На жаль, в бібліотеці поки немає книг', {
        reply_markup: getMainMenuKeyboard(),
      });
      return ctx.scene.leave();
    }

    const books = await interactiveBookSelection(
      {
        interest: state.aiInterest || 'interest_any',
        format: state.aiFormat || 'format_any',
        mood: state.aiMood || 'mood_any',
      },
      allBooks
    );

    if (books.length === 0) {
      await ctx.reply(
        '😔 Не вдалося підібрати книги за вашими критеріями. Спробуйте інші параметри.',
        {
          reply_markup: getMainMenuKeyboard(),
        }
      );
      return ctx.scene.leave();
    }

    const booksPerPage = 5;
    const page = 0;
    const paginatedBooks = books.slice(page * booksPerPage, (page + 1) * booksPerPage);
    const totalPages = Math.ceil(books.length / booksPerPage);

    let messageText = `<b>✨ Знайшов ${books.length} ідеальних ${books.length === 1 ? 'варіант' : 'варіанти'}!</b>\n\n`;
    messageText += '<b>Рекомендовано на основі ваших вподобань та настрою:</b>\n\n';
    messageText += `Сторінка 1 з ${totalPages}\n\n`;

    paginatedBooks.forEach((book, index) => {
      const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
      messageText += `${index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
    });

    const keyboard = paginatedBooks.map((book) => [
      Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`),
    ]);

    const navButtons = [];
    if (totalPages > 1) {
      navButtons.push(Markup.button.callback('Вперед ➡️', 'ai_result_page_1'));
    }
    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }

    keyboard.push([Markup.button.callback('⬅️ До меню', 'leave_ai_assistant')]);

    await ctx.reply(messageText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });

    if (!(ctx as any).session) {
      (ctx as any).session = {};
    }

    (ctx as any).session.aiResultBooks = books;

    logger.userAction(ctx.from?.id || 0, 'ai_assistant_selection', {
      interest: state.aiInterest,
      format: state.aiFormat,
      mood: state.aiMood,
      booksFound: books.length,
    });

    return ctx.scene.leave();
  }
);

export function registerAIAssistantHandlers(bot: any): void {
  bot.action(/ai_result_page_(\d+)/, async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    const page = parseInt(ctx.match?.[1] || '0', 10);

    const allBooks = (ctx as any).session?.aiResultBooks || [];

    if (!allBooks || allBooks.length === 0) {
      await ctx.answerCbQuery('❌ Помилка при завантаженні даних', { show_alert: true });
      return;
    }

    const booksPerPage = 5;
    const paginatedBooks = allBooks.slice(page * booksPerPage, (page + 1) * booksPerPage);
    const totalPages = Math.ceil(allBooks.length / booksPerPage);

    let messageText = '<b>✨ Результати пошуку</b>\n\n';
    messageText += '<b>Рекомендовано на основі ваших вподобань та настрою:</b>\n\n';
    messageText += `Сторінка ${page + 1} з ${totalPages}\n\n`;

    paginatedBooks.forEach((book: (typeof allBooks)[0], index: number) => {
      const rating = book.rating ? `⭐${book.rating.toFixed(1)}` : '';
      messageText += `${page * booksPerPage + index + 1}. <b>${book.title}</b> - ${book.author}${rating ? ` ${rating}` : ''}\n`;
    });

    const keyboard = paginatedBooks.map((book: (typeof allBooks)[0]) => [
      Markup.button.callback(`📖 ${book.title}`, `view_book_${book.id}`),
    ]);

    const navButtons = [];
    if (page > 0) {
      navButtons.push(Markup.button.callback('⬅️ Назад', `ai_result_page_${page - 1}`));
    }
    if (page + 1 < totalPages) {
      navButtons.push(Markup.button.callback('Вперед ➡️', `ai_result_page_${page + 1}`));
    }

    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }

    keyboard.push([Markup.button.callback('⬅️ До меню', 'leave_ai_assistant')]);

    await ctx.editMessageText(messageText, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard(keyboard).reply_markup,
    });
  });

  bot.action('leave_ai_assistant', async (ctx: BotContext) => {
    await ctx.answerCbQuery();
    await ctx.reply('Виберіть дію:', {
      reply_markup: getMainMenuKeyboard(),
    });
    await ctx.scene.leave();
  });
}

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
