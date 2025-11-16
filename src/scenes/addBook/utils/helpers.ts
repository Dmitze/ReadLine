import { BotContext, WizardState } from '../../../types/telegraf';
import { logger } from '../../../utils/logger';

export function logUserAction(ctx: BotContext, action: string, data?: any): void {
  logger.info('User action', {
    userId: ctx.from?.id,
    username: ctx.from?.username,
    action,
    step: ctx.wizard?.cursor,
    data,
    timestamp: new Date().toISOString()
  });
}

export async function handleFileUpload(
  ctx: BotContext,
  operation: () => Promise<void>
): Promise<boolean> {
  return await operation()
    .then(() => true)
    .catch((error) => {
      if (error instanceof Error && error.message.includes('file')) {
        ctx.reply('❌ Помилка при завантаженні файлу. Спробуйте інший файл.');
        return false;
      } else {
        throw error;
      }
    });
}

export function autoSaveState(state: WizardState): void {
  (state as any).lastActivity = Date.now();
  (state as any).autoSaveData = {
    title: state.title,
    author: state.author,
    genre: state.genre,
    description: state.description,
    photoFileId: state.photoFileId,
    bookFile: state.bookFile,
    bookAudio: state.bookAudio,
    bookLink: state.bookLink
  };
  logger.debug('State autosaved');
}
