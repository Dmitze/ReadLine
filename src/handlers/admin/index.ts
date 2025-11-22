import { Telegraf } from 'telegraf';
import { logger } from '../../utils/logger';
import { BotContext } from '../../types/telegraf';
import menuHandlers from './menu';
import statsHandlers from './stats';
import reviewsHandlers from './reviews';
import feedbackHandlers from './feedback';
import { registerAdminBookRequestHandlers } from './bookRequests';
import bookOrdersHandlers from './bookOrders';

export default (bot: Telegraf<BotContext>) => {
  logger.info('Admin handlers registered');

  menuHandlers(bot);
  statsHandlers(bot);
  reviewsHandlers(bot);
  feedbackHandlers(bot);
  registerAdminBookRequestHandlers(bot);
  bookOrdersHandlers(bot);
};
