/**
 * Language & ISBN Selection Step
 * Крок для вибору мови та ISBN (опціонально)
 */

import { Markup } from 'telegraf';
import { BotContext, WizardState } from '../../types/telegraf';
import { logger } from '../../utils/logger';
import { getProgress, logUserAction, autoSaveState } from './utils';

// Популярні мови
export const popularLanguages = [
  'Українська',
  'Російська',
  'Англійська',
  'Німецька',
  'Французька',
];

export const otherLanguages = [
  'Іспанська',
  'Італійська',
  'Португальська',
  'Польська',
  'Чеська',
  'Угорська',
  'Румунська',
  'Болгарська',
  'Сербська',
  'Японська',
  'Китайська',
  'Корейська',
];

/**
 * Показити меню для вибору мови
 */
export async function showLanguageMenu(ctx: BotContext, state: WizardState): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  const keyboard = [];
  
  // Популярні мови
  for (let i = 0; i < popularLanguages.length; i += 2) {
    const row = [];
    row.push({ text: popularLanguages[i], callback_data: `lang_popular_${i}_${userId}` });
    if (i + 1 < popularLanguages.length) {
      row.push({ text: popularLanguages[i + 1], callback_data: `lang_popular_${i + 1}_${userId}` });
    }
    keyboard.push(row);
  }

  keyboard.push([{ text: '📚 Інші мови', callback_data: `show_all_languages_${userId}` }]);

  await ctx.reply(
    `${getProgress(7)}\n\n🌍 <b>ВИБЕРІТЬ МОВУ КНИГИ:</b>`,
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }
  );
}

/**
 * Показити всі мови
 */
export async function showAllLanguages(ctx: BotContext): Promise<void> {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Помилка: користувач не ідентифікований');
    return;
  }

  const allLanguages = [...popularLanguages, ...otherLanguages];
  const keyboard = [];

  for (let i = 0; i < allLanguages.length; i += 2) {
    const row = [];
    row.push({ text: allLanguages[i], callback_data: `lang_all_${i}_${userId}` });
    if (i + 1 < allLanguages.length) {
      row.push({ text: allLanguages[i + 1], callback_data: `lang_all_${i + 1}_${userId}` });
    }
    keyboard.push(row);
  }

  keyboard.push([{ text: '✅ Назад', callback_data: `lang_back_${userId}` }]);

  await ctx.editMessageText(
    `${getProgress(7)}\n\n🌍 <b>ВИБЕРІТЬ МОВУ КНИГИ:</b>`,
    {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    }
  );
}

/**
 * Показити поле для вводу ISBN
 */
export async function showISBNInput(ctx: BotContext): Promise<void> {
  await ctx.reply(
    `${getProgress(6)}\n\n📚 <b>ISBN (опціонально)</b>\n\n` +
    'ISBN - унікальний ідентифікатор книги. Якщо не знаєте, напишіть "Пропустити".\n\n' +
    'Приклад: 978-3-16-148410-0',
    {
      parse_mode: 'HTML',
      reply_markup: Markup.inlineKeyboard([
        [{ text: '⏭️ Пропустити', callback_data: `skip_isbn_${ctx.from?.id}` }],
      ]).reply_markup,
    }
  );
}
