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
          parse_mode: 'HTML'
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
            [Markup.button.callback('❌ Скасувати', 'cancel_edit')]
          ]).reply_markup
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
      state.step = 'waiting_for_warnings';

      await ctx.reply(
        '✅ Встановили вікове обмеження\n\n' +
        '⚠️ <b>ВАРНІНГИ ВМІСТУ</b>\n\n' +
        'Введіть варнінги (через кому, без пробілів):\n\n' +
        '<b>Доступні варнінги:</b>\n' +
        '• violence (насильство)\n' +
        '• explicit_content (експліцит)\n' +
        '• sexual_scenes (сексуальні сцени)\n' +
        '• mature_themes (дорослі теми)\n' +
        '• strong_language (грубе мовлення)\n' +
        '• psychological_horror (психо жах)\n' +
        '• substance_abuse (зловживання)\n' +
        '• child_abuse (насильство над дітьми)\n' +
        '• discrimination (дискримінація)\n' +
        '• self_harm (самозалік)\n\n' +
        '<b>Приклади:</b>\n' +
        '• <code>violence,mature_themes</code>\n' +
        '• <code>explicit_content,sexual_scenes</code>\n' +
        '• <code>-</code> або <code>none</code> (без варнінгів)',
        { parse_mode: 'HTML' }
      );
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
          'self_harm'
        ];

        warnings = message.split(',').map(w => w.trim());

        // Перевіряємо кожен варнінг
        const invalidWarnings = warnings.filter(w => !validWarnings.includes(w));
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
      await updateBookInfo(state.bookId, state.recommendedAge, warnings.length > 0 ? warnings : undefined);

      const ageLabels: { [key: number]: string } = {
        0: '✅ Для всіх',
        6: '🟢 6+',
        12: '🟡 12+',
        16: '🟠 16+',
        18: '🔴 18+'
      };

      const warningLabels: { [key: string]: string } = {
        'violence': 'Насильство',
        'explicit_content': 'Експліцитний контент',
        'sexual_scenes': 'Сексуальні сцени',
        'mature_themes': 'Дорослі теми',
        'strong_language': 'Грубе мовлення',
        'psychological_horror': 'Психологічний жах',
        'substance_abuse': 'Зловживання',
        'child_abuse': 'Насильство над дітьми',
        'discrimination': 'Дискримінація',
        'self_harm': 'Самозалік'
      };

      let successMsg = `✅ <b>Успішно оновлено!</b>\n\n`;
      successMsg += `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}\n`;
      successMsg += `🔞 <b>Вік:</b> ${ageLabels[state.recommendedAge]}\n`;

      if (warnings.length > 0) {
        successMsg += `⚠️ <b>Варнінги:</b> ${warnings.map(w => warningLabels[w]).join(', ')}\n`;
      } else {
        successMsg += `⚠️ <b>Варнінги:</b> Немає\n`;
      }

      await ctx.reply(successMsg, {
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
          [Markup.button.callback('📖 Редагувати іншу книгу', 'edit_another')],
          [Markup.button.callback('⬅️ Назад до меню', 'back_to_menu')]
        ]).reply_markup
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
      18: '18+'
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
  let currentWarnings = '';

  if (book?.content_warnings) {
    const warnings = typeof book.content_warnings === 'string' 
      ? JSON.parse(book.content_warnings) 
      : book.content_warnings;
    currentWarnings = `\nПоточні варнінги: ${Array.isArray(warnings) ? warnings.join(', ') : 'Немає'}`;
  }

  await ctx.editMessageText(
    `📖 <b>${state.book.title}</b>${getBookIdText(state.book.id)}${currentWarnings}\n\n` +
    '⚠️ <b>РЕДАГУВАННЯ ВАРНІНГІВ ВМІСТУ</b>\n\n' +
    'Введіть варнінги (через кому):\n\n' +
    'violence, explicit_content, sexual_scenes,\n' +
    'mature_themes, strong_language,\n' +
    'psychological_horror, substance_abuse,\n' +
    'child_abuse, discrimination, self_harm\n\n' +
    'Або напишіть "-" без варнінгів',
    { parse_mode: 'HTML' }
  );

  state.step = 'waiting_for_warnings';
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
    18: '🔴 18+'
  };

  let msg = `📖 <b>${book.title}</b>${getBookIdText(book.id)}\n\n`;
  msg += `🔞 <b>Вік:</b> ${ageLabels[book.recommended_age || 0]}\n`;

  if (book.content_warnings) {
    try {
      const warnings = typeof book.content_warnings === 'string' 
        ? JSON.parse(book.content_warnings) 
        : book.content_warnings;
      
      const warningLabels: { [key: string]: string } = {
        'violence': 'Насильство',
        'explicit_content': 'Експліцитний контент',
        'sexual_scenes': 'Сексуальні сцени',
        'mature_themes': 'Дорослі теми',
        'strong_language': 'Грубе мовлення',
        'psychological_horror': 'Психологічний жах',
        'substance_abuse': 'Зловживання',
        'child_abuse': 'Насильство над дітьми',
        'discrimination': 'Дискримінація',
        'self_harm': 'Самозалік'
      };

      if (Array.isArray(warnings) && warnings.length > 0) {
        msg += `⚠️ <b>Варнінги:</b> ${warnings.map((w: string) => warningLabels[w] || w).join(', ')}\n`;
      } else {
        msg += `⚠️ <b>Варнінги:</b> Немає\n`;
      }
    } catch (error) {
      msg += `⚠️ <b>Варнінги:</b> Не вдалося прочитати\n`;
    }
  } else {
    msg += `⚠️ <b>Варнінги:</b> Немає\n`;
  }

  await ctx.editMessageText(msg, {
    parse_mode: 'HTML',
    reply_markup: Markup.inlineKeyboard([
      [Markup.button.callback('🔞 Змінити вік', 'edit_age')],
      [Markup.button.callback('⚠️ Змінити варнінги', 'edit_warnings')],
      [Markup.button.callback('⬅️ Назад', 'back_to_selection')]
    ]).reply_markup
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
        [Markup.button.callback('❌ Скасувати', 'cancel_edit')]
      ]).reply_markup
    }
  );
});

export default editExtendedBookInfoScene;
