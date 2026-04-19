import { Scenes } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { getBookById, updateBookInfo, isAdmin } from '../database/models';
import { Markup } from 'telegraf';
import { getBookIdText } from '../utils/helpers';

const editExtendedBookInfoScene = new Scenes.BaseScene<BotContext>('EDIT_EXTENDED_BOOK_INFO_SCENE');

const CONTENT_WARNINGS = [
  { id: 'violence', label: 'Насильство' },
  { id: 'explicit_content', label: 'Експліцитний контент' },
  { id: 'sexual_scenes', label: 'Сексуальні сцени' },
  { id: 'mature_themes', label: 'Дорослі теми' },
  { id: 'strong_language', label: 'Грубе мовлення' },
  { id: 'psychological_horror', label: 'Психологічний жах' },
  { id: 'substance_abuse', label: 'Зловживання' },
  { id: 'child_abuse', label: 'Насильство над дітьми' },
  { id: 'discrimination', label: 'Дискримінація' },
  { id: 'self_harm', label: 'Самопошкодження' },
];

async function showWarningsKeyboard(ctx: BotContext, state: any) {
  const selectedWarnings = state.selectedWarnings || [];

  const buttons = CONTENT_WARNINGS.map((warning) => {
    const isSelected = selectedWarnings.includes(warning.id);
    const icon = isSelected ? '✅' : '☑️';
    return [Markup.button.callback(`${icon} ${warning.label}`, `toggle_warning_${warning.id}`)];
  });

  buttons.push(
    [Markup.button.callback('💾 Зберегти', 'save_warnings')],
    [Markup.button.callback('❌ Скасувати', 'cancel_warnings')]
  );

  const selectedCount = selectedWarnings.length;
  const message =
    '⚠️ <b>ВИБЕРІТЬ ВАРНІНГИ ВМІСТУ</b>\n\n' +
    `Обрано: ${selectedCount} ${selectedCount === 1 ? 'варнінг' : 'варнінгів'}\n\n` +
    '💡 Натискайте на кнопки для вибору/зняття';

  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
  });
}

editExtendedBookInfoScene.enter(async (ctx) => {
  try {
    const adminCheck = await isAdmin(ctx.from!.id);
    if (!adminCheck) {
      await ctx.reply('❌ У вас немає доступу до цієї функції');
      return ctx.scene?.leave();
    }

    await ctx.reply(
      '📖 <b>РЕДАГУВАННЯ РОЗШИРЕНОЇ ІНФОРМАЦІЇ ПРО КНИГИ</b>\n\n' +
        'Введіть ID книги, для якої хочете встановити:\n' +
        '• Вікове обмеження (6+, 12+, 16+, 18+)\n' +
        '• Варнінги вмісту (насильство, експліцит, тощо)\n\n' +
        '💡 <b>Приклад:</b> <code>42</code>',
      { parse_mode: 'HTML' }
    );

    (ctx.scene as any).state.step = 'waiting_for_book_id';
  } catch (error) {
    logger.error('Error entering edit extended book info scene', error);
    await ctx.reply('❌ Помилка при завантаженні');
  }
});

editExtendedBookInfoScene.on('message', async (ctx) => {
  try {
    const state = (ctx.scene as any).state;
    const message = (ctx.message as any).text;

    if (!message) {
      await ctx.reply('❌ Будь ласка, введіть текст');
      return;
    }

    if (state.step === 'waiting_for_book_id') {
      const bookId = parseInt(message);

      if (isNaN(bookId)) {
        await ctx.reply('❌ ID повинен бути числом. Спробуйте ще раз:');
        return;
      }

      const book = await getBookById(bookId);

      if (!book) {
        await ctx.reply(`❌ Книга з ID ${bookId} не знайдена. Спробуйте ще раз:`, {
          parse_mode: 'HTML',
        });
        return;
      }

      state.bookId = bookId;
      state.book = book;
      state.step = 'selecting_action';

      await ctx.reply(
        `✅ Знайшли книгу: <b>${book.title}</b>${getBookIdText(book.id)}\n` +
          `👤 Автор: ${book.author}\n\n` +
          'Що хочете редагувати?',
        {
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('🔞 Вікове обмеження', 'edit_age')],
            [Markup.button.callback('⚠️ Варнінги вмісту', 'edit_warnings')],
            [Markup.button.callback('📊 Перегляд поточних', 'view_current')],
            [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
          ]).reply_markup,
        }
      );
      return;
    }

    if (state.step === 'waiting_for_warnings') {
      let warnings: string[] = [];

      if (typeof message === 'string' && message !== '-' && message.toLowerCase() !== 'none') {
        const validWarnings = [
          'violence',
          'explicit_content',
          'sexual_scenes',
          'mature_themes',
          'strong_language',
          'psychological_horror',
          'substance_abuse',
          'child_abuse',
          'discrimination',
          'self_harm',
        ];

        warnings = message
          .split(',')
          .map((w) => w.trim())
          .filter(Boolean);

        const invalidWarnings = warnings.filter((w) => !validWarnings.includes(w));
        if (invalidWarnings.length > 0) {
          await ctx.reply(
            `❌ Невідомі варнінги: ${invalidWarnings.join(', ')}\n\n` +
              'Спробуйте ще раз або напишіть "-" без варнінгів'
          );
          return;
        }
      }

      state.contentWarnings = warnings;

      await updateBookInfo(state.bookId, 'recommended_age', state.recommendedAge);
      await updateBookInfo(
        state.bookId,
        'content_warnings',
        warnings.length > 0 ? JSON.stringify(warnings) : null
      );

      const ageLabels: { [key: number]: string } = {
        0: '✅ Для всіх',
        6: '🟢 6+',
        12: '🟡 12+',
        16: '🟠 16+',
        18: '🔴 18+',
      };

      const warningLabels: { [key: string]: string } = {
        violence: 'Насильство',
        explicit_content: 'Експліцитний контент',
        sexual_scenes: 'Сексуальні сцени',
        mature_themes: 'Дорослі теми',
        strong_language: 'Грубе мовлення',
        psychological_horror: 'Психологічний жах',
        substance_abuse: 'Зловживання',
        child_abuse: 'Насильство над дітьми',
        discrimination: 'Дискримінація',
        self_harm: 'Самозалік',
      };

      let successMsg = '✅ <b>Успішно оновлено!</b>\n\n';
      successMsg += `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n`;
      successMsg += `🔞 <b>Вік:</b> ${ageLabels[state.recommendedAge]}\n`;

      if (warnings.length > 0) {
        successMsg += `⚠️ <b>Варнінги:</b> ${warnings.map((w) => warningLabels[w]).join(', ')}\n`;
      } else {
        successMsg += '⚠️ <b>Варнінги:</b> Немає\n';
      }

      await ctx.reply(successMsg, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📖 Редагувати іншу книгу', 'edit_another')],
          [Markup.button.callback('⬅️ Назад до меню', 'back_to_menu')],
        ]).reply_markup,
      });

      state.step = 'done';
      return;
    }
  } catch (error) {
    logger.error('Error processing input in edit extended book info scene', error);
    await ctx.reply('❌ Помилка при обробці. Спробуйте ще раз');
  }
});

editExtendedBookInfoScene.action('edit_age', async (ctx) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state;

  const ageLabels: { [key: number]: string } = {
    0: 'Для всіх',
    6: '6+',
    12: '12+',
    16: '16+',
    18: '18+',
  };

  const currentAge = state.book?.recommended_age || 0;

  await ctx.editMessageText(
    `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n` +
      `Поточний вік: <b>${ageLabels[currentAge]}</b>\n\n` +
      '🔞 <b>ВСТАНОВЛЕННЯ ВІКОВОГО ОБМЕЖЕННЯ</b>\n\n' +
      'Виберіть один з варіантів:',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('✅ 0 - Для всіх', 'set_age_0')],
        [Markup.button.callback('🟢 6 - 6+', 'set_age_6')],
        [Markup.button.callback('🟡 12 - 12+', 'set_age_12')],
        [Markup.button.callback('🟠 16 - 16+', 'set_age_16')],
        [Markup.button.callback('🔴 18 - 18+', 'set_age_18')],
        [Markup.button.callback('⬅️ Назад', 'back_to_selection')],
      ]).reply_markup,
    }
  );

  state.step = 'selecting_age';
});

editExtendedBookInfoScene.action('edit_warnings', async (ctx) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state;

  const book = await getBookById(state.bookId);
  state.selectedWarnings = [];

  if (book?.content_warnings) {
    const warnings =
      typeof book.content_warnings === 'string'
        ? JSON.parse(book.content_warnings)
        : book.content_warnings;
    if (Array.isArray(warnings)) {
      state.selectedWarnings = warnings;
    }
  }

  state.step = 'selecting_warnings';

  try {
    await ctx.deleteMessage();
  } catch (e) {}

  await showWarningsKeyboard(ctx, state);
});

CONTENT_WARNINGS.forEach((warning) => {
  editExtendedBookInfoScene.action(`toggle_warning_${warning.id}`, async (ctx) => {
    await ctx.answerCbQuery();
    const state = (ctx.scene as any).state;

    if (!state.selectedWarnings) {
      state.selectedWarnings = [];
    }

    const index = state.selectedWarnings.indexOf(warning.id);
    if (index > -1) {
      state.selectedWarnings.splice(index, 1);
    } else {
      state.selectedWarnings.push(warning.id);
    }

    try {
      await ctx.deleteMessage();
    } catch (e) {}

    await showWarningsKeyboard(ctx, state);
  });
});

editExtendedBookInfoScene.action('save_warnings', async (ctx) => {
  try {
    await ctx.answerCbQuery('Збереження...');
    const state = (ctx.scene as any).state;

    const warnings = state.selectedWarnings || [];

    if (state.recommendedAge !== undefined) {
      await updateBookInfo(state.bookId, 'recommended_age', state.recommendedAge);

      await updateBookInfo(
        state.bookId,
        'content_warnings',
        warnings.length > 0 ? JSON.stringify(warnings) : null
      );

      const ageLabels: { [key: number]: string } = {
        0: '✅ Для всіх',
        6: '🟢 6+',
        12: '🟡 12+',
        16: '🟠 16+',
        18: '🔴 18+',
      };

      const warningLabels: { [key: string]: string } = {
        violence: 'Насильство',
        explicit_content: 'Експліцитний контент',
        sexual_scenes: 'Сексуальні сцени',
        mature_themes: 'Дорослі теми',
        strong_language: 'Грубе мовлення',
        psychological_horror: 'Психологічний жах',
        substance_abuse: 'Зловживання',
        child_abuse: 'Насильство над дітьми',
        discrimination: 'Дискримінація',
        self_harm: 'Самопошкодження',
      };

      let successMsg = '✅ <b>Успішно оновлено!</b>\n\n';
      successMsg += `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n`;
      successMsg += `🔞 <b>Вік:</b> ${ageLabels[state.recommendedAge]}\n`;

      if (warnings.length > 0) {
        successMsg += `⚠️ <b>Варнінги:</b> ${warnings.map((w: string) => warningLabels[w]).join(', ')}\n`;
      } else {
        successMsg += '⚠️ <b>Варнінги:</b> Немає\n';
      }

      try {
        await ctx.deleteMessage();
      } catch (e) {}

      await ctx.reply(successMsg, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📖 Редагувати іншу книгу', 'edit_another')],
          [Markup.button.callback('⬅️ Назад до меню', 'back_to_menu')],
        ]).reply_markup,
      });

      state.step = 'done';
    } else {
      await updateBookInfo(
        state.bookId,
        'content_warnings',
        warnings.length > 0 ? JSON.stringify(warnings) : null
      );

      try {
        await ctx.deleteMessage();
      } catch (e) {}

      await ctx.reply('✅ Варнінги успішно оновлено!', {
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📖 Редагувати іншу книгу', 'edit_another')],
          [Markup.button.callback('⬅️ Назад до меню', 'back_to_menu')],
        ]).reply_markup,
      });

      state.step = 'done';
    }
  } catch (error) {
    logger.error('Error saving warnings', error);
    await ctx.reply('❌ Помилка при збереженні. Спробуйте ще раз.');
  }
});

editExtendedBookInfoScene.action('cancel_warnings', async (ctx) => {
  await ctx.answerCbQuery('Скасовано');
  const state = (ctx.scene as any).state;

  try {
    await ctx.deleteMessage();
  } catch (e) {}

  await ctx.reply(
    `✅ Знайшли книгу: <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n` +
      `👤 Автор: ${state.book.author}\n\n` +
      'Що хочете редагувати?',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔞 Вікове обмеження', 'edit_age')],
        [Markup.button.callback('⚠️ Варнінги вмісту', 'edit_warnings')],
        [Markup.button.callback('📊 Перегляд поточних', 'view_current')],
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
      ]).reply_markup,
    }
  );

  state.step = 'selecting_action';
});

editExtendedBookInfoScene.action('view_current', async (ctx) => {
  await ctx.answerCbQuery('Завантаження...');
  const state = (ctx.scene as any).state;
  const book = await getBookById(state.bookId);

  if (!book) {
    await ctx.answerCbQuery('❌ Книга не знайдена');
    return;
  }

  const ageLabels: { [key: number]: string } = {
    0: '✅ Для всіх',
    6: '🟢 6+',
    12: '🟡 12+',
    16: '🟠 16+',
    18: '🔴 18+',
  };

  let msg = `📖 <b>${book.title}</b>${getBookIdText(book.id)}\n\n`;
  msg += `🔞 <b>Вік:</b> ${ageLabels[book.recommended_age || 0]}\n`;

  if (book.content_warnings) {
    try {
      const warnings =
        typeof book.content_warnings === 'string'
          ? JSON.parse(book.content_warnings)
          : book.content_warnings;

      const warningLabels: { [key: string]: string } = {
        violence: 'Насильство',
        explicit_content: 'Експліцитний контент',
        sexual_scenes: 'Сексуальні сцени',
        mature_themes: 'Дорослі теми',
        strong_language: 'Грубе мовлення',
        psychological_horror: 'Психологічний жах',
        substance_abuse: 'Зловживання',
        child_abuse: 'Насильство над дітьми',
        discrimination: 'Дискримінація',
        self_harm: 'Самозалік',
      };

      if (Array.isArray(warnings) && warnings.length > 0) {
        msg += `⚠️ <b>Варнінги:</b> ${warnings.map((w: string) => warningLabels[w] || w).join(', ')}\n`;
      } else {
        msg += '⚠️ <b>Варнінги:</b> Немає\n';
      }
    } catch (error) {
      msg += '⚠️ <b>Варнінги:</b> Не вдалося прочитати\n';
    }
  } else {
    msg += '⚠️ <b>Варнінги:</b> Немає\n';
  }

  await ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🔞 Змінити вік', 'edit_age')],
      [Markup.button.callback('⚠️ Змінити варнінги', 'edit_warnings')],
      [Markup.button.callback('⬅️ Назад', 'back_to_selection')],
    ]).reply_markup,
  });
});

editExtendedBookInfoScene.action('cancel_edit', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('❌ Скасовано');
  return ctx.scene?.leave();
});

editExtendedBookInfoScene.action('edit_another', async (ctx) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state = {};
  return ctx.scene?.reenter();
});

editExtendedBookInfoScene.action('back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene?.leave();
});

editExtendedBookInfoScene.action('back_to_selection', async (ctx) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state;
  const book = state.book;

  await ctx.editMessageText(
    `✅ Знайшли книгу: <b>${book.title}</b>${getBookIdText(book.id)}\n` +
      `👤 Автор: ${book.author}\n\n` +
      'Що хочете редагувати?',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('🔞 Вікове обмеження', 'edit_age')],
        [Markup.button.callback('⚠️ Варнінги вмісту', 'edit_warnings')],
        [Markup.button.callback('📊 Перегляд поточних', 'view_current')],
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')],
      ]).reply_markup,
    }
  );
});

const ageOptions = [
  { id: 'set_age_0', age: 0, label: 'Для всіх' },
  { id: 'set_age_6', age: 6, label: '6+' },
  { id: 'set_age_12', age: 12, label: '12+' },
  { id: 'set_age_16', age: 16, label: '16+' },
  { id: 'set_age_18', age: 18, label: '18+' },
];

ageOptions.forEach((option) => {
  editExtendedBookInfoScene.action(option.id, async (ctx) => {
    await ctx.answerCbQuery(`Вибрано: ${option.label}`);
    const state = (ctx.scene as any).state;

    state.recommendedAge = option.age;
    state.step = 'selecting_warnings';
    state.selectedWarnings = [];

    try {
      await ctx.deleteMessage();
    } catch (e) {}

    await showWarningsKeyboard(ctx, state);
  });
});

export default editExtendedBookInfoScene;
