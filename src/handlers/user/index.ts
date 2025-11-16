/**
 * User Handlers Index
 * REFACTOR-009: Split userHandlers.ts
 * 
 * Централізований експорт усіх user handlers
 */

import { Telegraf } from 'telegraf';
import { BotContext } from '../../types/telegraf';
import { logger } from '../../utils/logger';

import { registerCatalogHandlers } from './catalog';
import { registerBookActionHandlers } from './bookActions';
import { registerLibraryHandlers } from './library';
import { registerNavigationHandlers } from './navigation';
import { registerTopAndNewHandlers } from './topAndNew';
import { registerMiscHandlers } from './misc';

// Флаг для предотвращения повторной регистрации
let handlersRegistered = false;

/**
 * Register all user handlers
 */
export function registerUserHandlers(bot: Telegraf<BotContext>): void {
  if (handlersRegistered) {
    logger.warn('User handlers already registered, skipping...');
    return;
  }
  
  logger.info('Registering user handlers...');
  
  try {
    // Регистрируем модули
    registerNavigationHandlers(bot);
    registerTopAndNewHandlers(bot);
    registerLibraryHandlers(bot);
    registerMiscHandlers(bot);
    registerCatalogHandlers(bot);
    registerBookActionHandlers(bot);
    
    handlersRegistered = true;
    logger.info('✅ All user handlers registered successfully');
  } catch (error) {
    logger.error('Failed to register user handlers', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Reset handlers registration flag (для тестов)
 */
export function resetHandlersFlag(): void {
  handlersRegistered = false;
}
