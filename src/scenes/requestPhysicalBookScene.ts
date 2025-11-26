/**
 * Request Physical Book Scene
 * Сценарій заявки на отримання фізичної книги
 */

import { Scenes, Markup } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { createRequest, PhysicalBookRequest } from '../database/tables/physicalBooks';
import { ERRORS } from '../constants';
import { getMainMenuKeyboard } from '../keyboards/mainKeyboards';

interface RequestState {
  step?: string;
  book_title?: string;
  book_author?: string;
  book_genre?: string;
  book_description?: string;
  notes?: string;
}

const requestPhysicalBookScene = new Scenes.BaseScene<BotContext>('REQUEST_PHYSICAL_BOOK_SCENE');

// ==========================================
// SCENE ENTRY
// ==========================================

requestPhysicalBookScene.enter(async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as RequestState;
  state.step = 'title';

  await ctx.reply(
    '📚 <b>ЗАЯВКА НА ФІЗИЧНУ КНИГУ</b>\n\n' +
      '━━━━━━━━━━━━━━━━━━━\n\n' +
      '📖 <b>Крок 1/4: Назва книги</b>\n\n' +
      'Введіть назву книги, яку ви хочете отримати:\n\n' +
      '💡 <i>Наприклад: "Кобзар"</i>',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    }
  );

  logger.userAction(ctx.from?.id || 0, 'start_physical_book_request');
});

// ==========================================
// TEXT HANDLER
// ==========================================

requestPhysicalBookScene.on('text', async (ctx: BotContext) => {
  const state = (ctx.scene as any).state as RequestState;
  const text = ctx.message.text.trim();

  // Скасування
  if (text === '❌ Скасувати') {
    await ctx.reply('❌ Заявку скасовано.', {
      reply_markup: getMainMenuKeyboard(),
    });
    return ctx.scene.leave();
  }

  // Крок 1: Назва книги
  if (state.step === 'title') {
    if (text.length < 2) {
      await ctx.reply('❌ Назва книги занадто коротка. Мінімум 2 символи. Спробуйте ще раз:');
      return;
    }

    state.book_title = text;
    state.step = 'author';

    await ctx.reply(
      '✅ Назва збережена!\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '✍️ <b>Крок 2/4: Автор книги</b>\n\n' +
        'Введіть автора книги:\n\n' +
        '💡 <i>Наприклад: "Тарас Шевченко"</i>',
      { parse_mode: 'HTML' }
    );
    return;
  }

  // Крок 2: Автор
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
        '🎭 <b>Крок 3/4: Жанр книги</b>\n\n' +
        'Введіть жанр книги або натисніть "Пропустити":\n\n' +
        '💡 <i>Наприклад: "Поезія", "Роман", "Науково-популярна"</i>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([['⏭️ Пропустити'], ['❌ Скасувати']]).resize().reply_markup,
      }
    );
    return;
  }

  // Крок 3: Жанр
  if (state.step === 'genre') {
    if (text === '⏭️ Пропустити') {
      state.book_genre = undefined;
    } else {
      state.book_genre = text;
    }

    state.step = 'notes';

    await ctx.reply(
      '✅ Жанр збережений!\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📝 <b>Крок 4/4: Додаткові примітки</b>\n\n' +
        'Додайте коментар до заявки (наприклад, чому саме ця книга) або натисніть "Пропустити":\n\n' +
        '💡 <i>Це допоможе адміністратору зрозуміти вашу потребу</i>',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.keyboard([['⏭️ Пропустити'], ['❌ Скасувати']]).resize().reply_markup,
      }
    );
    return;
  }

  // Крок 4: Примітки
  if (state.step === 'notes') {
    if (text === '⏭️ Пропустити') {
      state.notes = undefined;
    } else {
      state.notes = text;
    }

    // Показуємо підтвердження
    await showConfirmation(ctx, state);
    return;
  }
});

// ==========================================
// CONFIRMATION
// ==========================================

async function showConfirmation(ctx: BotContext, state: RequestState) {
  const message =
    '📋 <b>ПІДТВЕРДЖЕННЯ ЗАЯВКИ</b>\n\n' +
    '━━━━━━━━━━━━━━━━━━━\n\n' +
    `📖 <b>Назва:</b> ${state.book_title}\n` +
    `✍️ <b>Автор:</b> ${state.book_author}\n` +
    `${state.book_genre ? `🎭 <b>Жанр:</b> ${state.book_genre}\n` : ''}` +
    `${state.notes ? `📝 <b>Примітки:</b> ${state.notes}\n` : ''}` +
    '\n━━━━━━━━━━━━━━━━━━━\n\n' +
    '✅ Відправити заявку адміністратору?';

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('✅ Так, відправити', 'confirm_request')],
      [Markup.button.callback('❌ Ні, скасувати', 'cancel_request')],
    ]).reply_markup,
  });

  state.step = 'confirmation';
}

// ==========================================
// ACTIONS
// ==========================================

requestPhysicalBookScene.action('confirm_request', async (ctx: BotContext) => {
  await ctx.answerCbQuery('📤 Відправка заявки...');

  const state = (ctx.scene as any).state as RequestState;
  const userId = ctx.from?.id;

  if (!userId || !state.book_title || !state.book_author) {
    await ctx.editMessageText('❌ Помилка: не всі дані заповнені. Спробуйте ще раз.');
    return ctx.scene.leave();
  }

  try {
    const request: PhysicalBookRequest = {
      user_id: userId,
      book_title: state.book_title,
      book_author: state.book_author,
      book_genre: state.book_genre,
      notes: state.notes,
      status: 'pending',
    };

    const requestId = await createRequest(request);

    await ctx.editMessageText(
      '✅ <b>ЗАЯВКУ ВІДПРАВЛЕНО!</b>\n\n' +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        `📖 <b>Книга:</b> ${request.book_title}\n` +
        `✍️ <b>Автор:</b> ${request.book_author}\n\n` +
        `🆔 <b>Номер заявки:</b> #${requestId}\n\n` +
        '━━━━━━━━━━━━━━━━━━━\n\n' +
        '📬 Ваша заявка надіслана адміністратору на розгляд.\n\n' +
        '🔔 Ви отримаєте повідомлення, коли адміністратор розгляне вашу заявку.\n\n' +
        '📊 Переглянути статус можна в розділі "Мої заявки".',
      {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📋 Мої заявки', 'my_requests')],
          [Markup.button.callback('🏠 На головну', 'home')],
        ]).reply_markup,
      }
    );

    logger.userAction(userId, 'create_physical_book_request', {
      requestId,
      title: request.book_title,
      author: request.book_author,
    });

    // Показуємо головне меню
    await ctx.reply('Виберіть дію:', {
      reply_markup: getMainMenuKeyboard(),
    });

    return ctx.scene.leave();
  } catch (error) {
    logger.error('Error creating physical book request', error, { userId });
    await ctx.editMessageText('❌ Помилка при створенні заявки. Спробуйте пізніше.');
    return ctx.scene.leave();
  }
});

requestPhysicalBookScene.action('cancel_request', async (ctx: BotContext) => {
  await ctx.answerCbQuery('❌ Скасовано');
  await ctx.editMessageText('❌ Заявку скасовано.');
  await ctx.reply('Виберіть дію:', {
    reply_markup: getMainMenuKeyboard(),
  });
  return ctx.scene.leave();
});

// ==========================================
// LEAVE HANDLER
// ==========================================

requestPhysicalBookScene.leave(async (ctx: BotContext) => {
  // Cleanup якщо потрібно
  const state = (ctx.scene as any).state as RequestState;
  Object.keys(state).forEach((key) => delete state[key as keyof RequestState]);
});

export default requestPhysicalBookScene;
