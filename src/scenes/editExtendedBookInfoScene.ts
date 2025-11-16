/**
 * Edit Extended Book Info Scene - сцена редагування розширеної інформації про книги
 * Дозволяє адміністраторам встановлювати вікові обмеження та варнінги вмісту
 */

import { Scenes } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { logger } from '../utils/logger';
import { getBookById, updateBookInfo, isAdmin } from '../database/models';
import { Markup } from 'telegraf';
import { getBookIdText } from '../utils/helpers';

const editExtendedBookInfoScene = new Scenes.BaseScene<BotContext>('EDIT_EXTENDED_BOOK_INFO_SCENE');

// Список всіх варнінгів
const CONTENT_WARNINGS = [
  { id: 'violence', label: 'Насильство' },
  { id: 'explicit_content', label: 'Експліцитний контент' },
  { id: 'sexual_scenes', label: 'Сексуальні сцени' },
  { id: 'mature_themes', label: 'Дорослі теми' },
  { id:'strong_language', label: 'Грубе мовлення' },
  { id: 'psychological_horror', label: 'Психологічний жах' },
  { id: 'substance_abuse', label: 'Зловживання' },
  { id: 'child_abuse', label: 'Насильство над дітьми' },
  { id: 'discrimination', label: 'Дискримінація' },
  { id: 'self_harm', label: 'Самопошкодження' },
];

// Функція показу клавіатури варнінгів
async function showWarningsKeyboard(ctx: BotContext, state: any) {
  const selectedWarnings = state.selectedWarnings || [];
  
  const buttons = CONTENT_WARNINGS.map(warning => {
    const isSelected = selectedWarnings.includes(warning.id);
    const icon = isSelected ? '✅' : '☑️';
    return [Markup.button.callback(`${icon} ${warning.label}`, `toggle_warning_${warning.id}`)];
  });
  
  // Додаємо кнопки керування
  buttons.push(
    [Markup.button.callback('💾 Зберегти', 'save_warnings')],
    [Markup.button.callback('❌ Скасувати', 'cancel_warnings')]
  );
  
  const selectedCount = selectedWarnings.length;
  const message = `⚠️ <b>ВИБЕРІТЬ ВАРНІНГИ ВМІСТУ</b>\n\n` +
    `Обрано: ${selectedCount} ${selectedCount === 1 ? 'варнінг' : 'варнінгів'}\n\n` +
    `💡 Натискайте на кнопки для вибору/зняття`;
  
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard(buttons).reply_markup,
  });
}

// Вхід в сцену
editExtendedBookInfoScene.enter(async (ctx) => {
  try {
    // Перевіряємо чи користувач админ
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

// Обробка вводу
editExtendedBookInfoScene.on('message', async (ctx) => {
  try {
    const state = (ctx.scene as any).state;
    const message = (ctx.message as any).text;

    if (!message) {
      await ctx.reply('❌ Будь ласка, введіть текст');
      return;
    }

    // Крок 1: Очікуємо ID книги
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

    // Крок 2: Встановлення вікового обмеження
    if (state.step === 'waiting_for_age') {
      const age = parseInt(message);
      const validAges = [0, 6, 12, 16, 18];

      if (!validAges.includes(age)) {
        await ctx.reply(
          '❌ Невірне значення. Виберіть один з варіантів:\n' +
            '• 0 - Для всіх\n' +
            '• 6 - 6+\n' +
            '• 12 - 12+\n' +
            '• 16 - 16+\n' +
            '• 18 - 18+\n\n' +
            'Спробуйте ще раз:'
        );
        return;
      }

      state.recommendedAge = age;
      state.step = 'selecting_warnings';
      state.selectedWarnings = [];

      await showWarningsKeyboard(ctx, state);
      return;
    }

    // Крок 3: Встановлення варнінгів
    if (state.step === 'waiting_for_warnings') {
      let warnings: string[] = [];

      if (message !== '-' && message.toLowerCase() !== 'none') {
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

        warnings = message.split(',').map((w) => w.trim());

        // Перевіряємо кожен варнінг
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

      // Збереження
      await updateBookInfo(
        state.bookId,
        state.recommendedAge,
        warnings.length > 0 ? warnings : undefined
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

// Кнопка: Редагувати вік
editExtendedBookInfoScene.action('edit_age', async (ctx) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state;

  if (state.book?.recommended_age) {
    const ageLabels: { [key: number]: string } = {
      0: 'Для всіх',
      6: '6+',
      12: '12+',
      16: '16+',
      18: '18+',
    };
    await ctx.editMessageText(
      `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n` +
        `Поточний вік: <b>${ageLabels[state.book.recommended_age] || 'Не встановлено'}</b>\n\n` +
        '🔞 <b>ВСТАНОВЛЕННЯ ВІКОВОГО ОБМЕЖЕННЯ</b>\n\n' +
        'Введіть один з варіантів:\n' +
        '• 0 - Для всіх\n' +
        '• 6 - 6+\n' +
        '• 12 - 12+\n' +
        '• 16 - 16+\n' +
        '• 18 - 18+',
      { parse_mode: 'HTML' }
    );
  } else {
    await ctx.editMessageText(
      `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n` +
        'Поточний вік: Не встановлено\n\n' +
        '🔞 <b>ВСТАНОВЛЕННЯ ВІКОВОГО ОБМЕЖЕННЯ</b>\n\n' +
        'Введіть один з варіантів:\n' +
        '• 0 - Для всіх\n' +
        '• 6 - 6+\n' +
        '• 12 - 12+\n' +
        '• 16 - 16+\n' +
        '• 18 - 18+',
      { parse_mode: 'HTML' }
    );
  }

  state.step = 'waiting_for_age';
});

// Кнопка: Редагувати варнінги
editExtendedBookInfoScene.action('edit_warnings', async (ctx) => {
  await ctx.answerCbQuery();
  const state = (ctx.scene as any).state;

  // Отримуємо поточні варнінги з бази
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
  } catch (e) {
    // Ігноруємо помилку видалення
  }
  
  await showWarningsKeyboard(ctx, state);
});

// Обробники toggle варнінгів
CONTENT_WARNINGS.forEach(warning => {
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
    } catch (e) {
      // Ігноруємо
    }
    
    await showWarningsKeyboard(ctx, state);
  });
});

// Кнопка: Зберегти варнінги
editExtendedBookInfoScene.action('save_warnings', async (ctx) => {
  await ctx.answerCbQuery('Збереження...');
  const state = (ctx.scene as any).state;
  
  const warnings = state.selectedWarnings || [];
  
  // Якщо ми вже встановили вік раніше - зберігаємо все
  if (state.recommendedAge !== undefined) {
    await updateBookInfo(
      state.bookId,
      state.recommendedAge,
      warnings.length > 0 ? warnings : undefined
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
    } catch (e) {
      // Ігноруємо
    }
    
    await ctx.reply(successMsg, {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📖 Редагувати іншу книгу', 'edit_another')],
        [Markup.button.callback('⬅️ Назад до меню', 'back_to_menu')],
      ]).reply_markup,
    });
    
    state.step = 'done';
  } else {
    // Якщо тільки варнінги - просто зберігаємо їх
    const book = await getBookById(state.bookId);
    await updateBookInfo(
      state.bookId,
      book?.recommended_age || 0,
      warnings.length > 0 ? warnings : undefined
    );
    
    try {
      await ctx.deleteMessage();
    } catch (e) {
      // Ігноруємо
    }
    
    await ctx.reply('✅ Варнінги успішно оновлено!', {
      reply_markup: Markup.inlineKeyboard([
        [Markup.button.callback('📖 Редагувати іншу книгу', 'edit_another')],
        [Markup.button.callback('⬅️ Назад до меню', 'back_to_menu')],
      ]).reply_markup,
    });
    
    state.step = 'done';
  }
});

// Кнопка: Скасувати варнінги
editExtendedBookInfoScene.action('cancel_warnings', async (ctx) => {
  await ctx.answerCbQuery('Скасовано');
  const state = (ctx.scene as any).state;
  
  try {
    await ctx.deleteMessage();
  } catch (e) {
    // Ігноруємо
  }
  
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

// Кнопка: Перегляд поточних значень
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

// Кнопка: Скасувати
editExtendedBookInfoScene.action('cancel_edit', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('❌ Скасовано');
  return ctx.scene?.leave();
});

// Кнопка: Редагувати іншу книгу
editExtendedBookInfoScene.action('edit_another', async (ctx) => {
  await ctx.answerCbQuery();
  (ctx.scene as any).state = {};
  return ctx.scene?.reenter();
});

// Кнопка: Назад до меню
editExtendedBookInfoScene.action('back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.scene?.leave();
});

// Кнопка: Назад до вибору дії
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

export default editExtendedBookInfoScene;
