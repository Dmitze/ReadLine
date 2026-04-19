import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import {
  createBookRequest,
  BookRequestStatus,
  BookRequestPriority,
} from '../database/tables/bookRequests';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';

interface CreateRequestState {
  book_title?: string;
  book_author?: string;
  book_genre?: string;
  comment?: string;
  step?: string;
}

const createBookRequestScene = new Scenes.BaseScene<BotContext>('CREATE_BOOK_REQUEST_SCENE');

createBookRequestScene.enter(async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as CreateRequestState;
  state.step = 'title';

  await ctx.reply(
    '📚 <b>НОВА ЗАЯВКА НА КНИГУ</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      '📝 <b>Крок 1/4: Назва книги</b>\n\n' +
      'Введіть назву книги, яку хочете замовити:\n\n' +
      '💡 <i>Приклад: "Кобзар"</i>',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    }
  );

  logger.userAction(ctx.from?.id || 0, 'start_create_request');
});

createBookRequestScene.on('text', async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as CreateRequestState;
  const text = ctx.message.text.trim();

  if (text === '❌ Скасувати') {
    await ctx.reply('❌ Створення заявки скасовано.', {
      reply_markup: getMainMenuKeyboard(),
    });
    return ctx.scene.leave();
  }

  if (state.step === 'title') {
    if (text.length < 2) {
      await ctx.reply('❌ Назва занадто коротка. Мінімум 2 символи. Спробуйте ще раз:');
      return;
    }

    state.book_title = text;
    state.step = 'author';

    await ctx.reply(
      '✅ Назва збережена!\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📝 <b>Крок 2/4: Автор книги</b>\n\n' +
        'Введіть автора книги:\n\n' +
        '💡 <i>Приклад: "Тарас Шевченко"</i>',
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (state.step === 'author') {
    if (text.length < 2) {
      await ctx.reply("❌ Ім'я автора занадто коротке. Мінімум 2 символи. Спробуйте ще раз:");
      return;
    }

    state.book_author = text;
    state.step = 'genre';

    await ctx.reply(
      '✅ Автор збережений!\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📝 <b>Крок 3/4: Жанр книги</b>\n\n' +
        'Введіть жанр книги або натисніть "Пропустити":\n\n' +
        '💡 <i>Приклад: "Поезія", "Роман", "Фантастика"</i>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([['⏭️ Пропустити'], ['❌ Скасувати']]).resize().reply_markup,
      }
    );
    return;
  }

  if (state.step === 'genre') {
    if (text === '⏭️ Пропустити') {
      state.book_genre = undefined;
    } else {
      state.book_genre = text;
    }

    state.step = 'comment';

    await ctx.reply(
      '✅ Жанр збережено!\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📝 <b>Крок 4/4: Коментар</b>\n\n' +
        'Додайте коментар до заявки або натисніть "Пропустити":\n\n' +
        '💡 <i>Наприклад, вкажіть видання, рік випуску, чи інші деталі</i>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([['⏭️ Пропустити'], ['❌ Скасувати']]).resize().reply_markup,
      }
    );
    return;
  }

  if (state.step === 'comment') {
    if (text === '⏭️ Пропустити') {
      state.comment = undefined;
    } else {
      state.comment = text;
    }

    await showConfirmation(ctx, state);
    return;
  }
});

async function showConfirmation(ctx: BotContext, state: CreateRequestState) {
  let message = '📋 <b>ПІДТВЕРДЖЕННЯ ЗАЯВКИ</b>\n\n';
  message += '━━━━━━━━━━━━━━━━━━━\n\n';
  message += `📖 <b>Книга:</b> ${state.book_title}\n`;
  message += `✍️ <b>Автор:</b> ${state.book_author}\n`;

  if (state.book_genre) {
    message += `🏷️ <b>Жанр:</b> ${state.book_genre}\n`;
  }

  if (state.comment) {
    message += `\n💬 <b>Коментар:</b>\n${state.comment}\n`;
  }

  message += '\n━━━━━━━━━━━━━━━━━━━\n\n';
  message += '✅ Все вірно? Створити заявку?';

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('✅ Підтвердити', 'confirm_create_request')],
      [Markup.button.callback('❌ Скасувати', 'cancel_create_request')],
    ]).reply_markup,
  });

  state.step = 'confirmation';
}

createBookRequestScene.action('confirm_create_request', async (ctx: BotContext) => {
  try {
    await ctx.answerCbQuery('📤 Створення заявки...');

    const state = (ctx.scene as any).state as CreateRequestState;
    const userId = ctx.from?.id;

    if (!userId || !state.book_title || !state.book_author) {
      await ctx.reply('❌ Помилка: не всі дані заповнені. Спробуйте ще раз.');
      return ctx.scene.reenter();
    }

    const requestId = await createBookRequest({
      user_id: userId,
      book_title: state.book_title,
      book_author: state.book_author,
      book_genre: state.book_genre,
      comment: state.comment,
      status: BookRequestStatus.PENDING,
      priority: BookRequestPriority.MEDIUM,
    });

    await ctx.editMessageText(
      '✅ <b>ЗАЯВКУ СТВОРЕНО!</b>\n\n' +
        `🆔 <b>Номер заявки:</b> #${requestId}\n\n` +
        `📖 <b>Книга:</b> ${state.book_title}\n` +
        `✍️ <b>Автор:</b> ${state.book_author}\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '⏳ <b>Статус:</b> На розгляді\n\n' +
        'Адміністратор перевірить наявність книги і повідомить вас про результат.\n\n' +
        '📱 Ви отримаєте сповіщення, коли статус заявки зміниться.',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📋 Мої заявки', 'my_book_requests')],
          [Markup.button.callback('🏠 На головну', 'home')],
        ]).reply_markup,
      }
    );

    logger.userAction(userId, 'create_request', { requestId, title: state.book_title });

    await ctx.reply('Виберіть дію:', {
      reply_markup: getMainMenuKeyboard(),
    });

    return ctx.scene.leave();
  } catch (error) {
    logger.error('Error creating request', error, { userId: ctx.from?.id });
    await ctx.reply('❌ Помилка при створенні заявки. Спробуйте пізніше.');
    return ctx.scene.leave();
  }
});

createBookRequestScene.action('cancel_create_request', async (ctx: BotContext) => {
  await ctx.answerCbQuery('❌ Скасовано');
  await ctx.editMessageText('❌ Створення заявки скасовано.');
  await ctx.reply('Виберіть дію:', {
    reply_markup: getMainMenuKeyboard(),
  });
  return ctx.scene.leave();
});

export default createBookRequestScene;
