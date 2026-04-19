import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';

import { registerCatalogHandlers } from './catalog';
import { registerBookActionHandlers } from './bookActions';
import { registerLibraryHandlers } from './library';
import { registerNavigationHandlers } from './navigation';
import { registerTopAndNewHandlers } from './topAndNew';
import { registerMiscHandlers } from './misc';
import { registerPodcastHandlers } from './podcasts';
import { registerPhysicalBooksHandlers } from './physicalBooks';
import { registerBookRequestHandlers } from './bookRequests';
import { registerAIAssistantHandlers } from '../../scenes/aiAssistantScene';
import { registerProfileHandlers } from './profileHandlers';

let handlersRegistered = false;

export function registerUserHandlers(bot: Telegraf<BotContext>): void {
  if (handlersRegistered) {
    logger.warn('User handlers already registered, skipping...');
    return;
  }

  logger.info('Registering user handlers...');

  try {
    registerNavigationHandlers(bot);
    registerTopAndNewHandlers(bot);
    registerLibraryHandlers(bot);
    registerMiscHandlers(bot);
    registerCatalogHandlers(bot);
    registerBookActionHandlers(bot);
    registerPodcastHandlers(bot);
    registerPhysicalBooksHandlers(bot);
    registerBookRequestHandlers(bot);
    registerAIAssistantHandlers(bot);
    registerProfileHandlers(bot);

    handlersRegistered = true;
    logger.info('✅ All user handlers registered successfully');
  } catch (error) {
    logger.error(
      'Failed to register user handlers',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export function resetHandlersFlag(): void {
  handlersRegistered = false;
}
