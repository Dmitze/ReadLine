import { Telegraf } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { registerUserHandlers } from './user';

export default (bot: Telegraf<BotContext>): void => {
  registerUserHandlers(bot);
};
