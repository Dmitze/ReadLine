/**
 * User Handlers
 * REFACTOR-009: Main entry point for user handlers
 *
 * Этот файл теперь использует модульную структуру из src/handlers/user/
 */

import { Telegraf } from 'telegraf';
import { BotContext } from '../types/telegraf';
import { registerUserHandlers } from './user';

/**
 * Register all user-related handlers
 * @deprecated Use registerUserHandlers from './user' directly
 */
export default (bot: Telegraf<BotContext>): void => {
  registerUserHandlers(bot);
};
