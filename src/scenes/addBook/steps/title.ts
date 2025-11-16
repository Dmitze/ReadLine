import { Markup } from 'telegraf';
import { BotContext, WizardState } from '../../../types/telegraf';
import { getProgress, examples, logUserAction, autoSaveState } from '../utils';

export async function enterTitleStep(ctx: BotContext) {
  logUserAction(ctx, 'start_add_book');
  await ctx.reply(
    `${getProgress(0)}\n📖 Введіть назву книги:\n\n` +
      `${examples.title}\n\n` +
      '💡 Або натисніть /cancel для скасування',
    {
      reply_markup: Markup.keyboard([['❌ Скасувати']]).resize().reply_markup,
    }
  );
  return ctx.wizard.next();
}

export async function processTitleStep(ctx: BotContext) {
  if (ctx.message && 'text' in ctx.message && ctx.message.text === '❌ Скасувати') {
    await ctx.reply('❌ Додавання книги скасовано');
    return ctx.scene?.leave();
  }

  if (!ctx.message || !('text' in ctx.message)) {
    await ctx.reply('❌ Будь ласка, надішліть текст (назву книги).');
    return;
  }

  const title = ctx.message.text.trim();

  const { VALIDATION } = await import('../../../constants');
  if (title.length < VALIDATION.TITLE_MIN) {
    await ctx.reply(`❌ Назва занадто коротка. Мінімум ${VALIDATION.TITLE_MIN} символи.`);
    return;
  }

  if (title.length > VALIDATION.TITLE_MAX) {
    await ctx.reply(`❌ Назва занадто довга. Максимум ${VALIDATION.TITLE_MAX} символів.`);
    return;
  }

  const state = ctx.wizard?.state as WizardState;
  state.title = title;
  autoSaveState(state);
  logUserAction(ctx, 'entered_title', { title });

  return ctx.wizard.next();
}
