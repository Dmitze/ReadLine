import { Telegraf } from 'telegraf';
import { BotContext } from '../types/telegraf';
import adminHandlers from './admin';

export default (bot: Telegraf<BotContext>) => {
  adminHandlers(bot);
};
