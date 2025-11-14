import { BotContext } from '../types/telegraf';
import { ILogger } from '../core/types';
import { Result } from '../core/Result';

export class ErrorHandler {
  constructor(private logger: ILogger) {}

  async handleSceneError(ctx: BotContext, error: Error | Result<any, Error>): Promise<void> {
    const actualError = error instanceof Error ? error : (error as any).error || new Error('Unknown error');

    this.logger.error('Scene error', actualError);

    const errorMessage = this.getErrorMessage(actualError instanceof Error ? actualError : new Error(String(actualError)));
    try {
      await ctx.reply(`❌ ${errorMessage}`);
    } catch (sendError) {
      this.logger.error('Failed to send error message', sendError);
    }
  }

  private getErrorMessage(error: Error): string {
    // Handle specific error types
    if (error.message.includes('not found')) {
      return 'Не знайдено результатів';
    }
    if (error.message.includes('timeout')) {
      return 'Час очікування вичерпаний. Спробуйте пізніше';
    }
    if (error.message.includes('validation')) {
      return 'Невірні дані. Перевірте ввід';
    }

    // Default message
    return 'Сталась помилка. Спробуйте пізніше';
  }
}
