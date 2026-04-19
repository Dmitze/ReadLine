import { BotContext } from '../types/telegraf';
import { Result } from '../core/Result';

export async function handleResult<T>(
  ctx: BotContext,
  result: Result<T>,
  errorMessage?: string
): Promise<boolean> {
  if (result.isOk()) {
    return true;
  }

  const message = errorMessage || getDefaultErrorMessage(result.error);
  try {
    await ctx.reply(`❌ ${message}`);
  } catch (error) {
    console.error('Failed to send error message', error);
  }

  return false;
}

function getDefaultErrorMessage(error: Error): string {
  if (error.message.includes('not found')) {
    return 'Не знайдено результатів';
  }
  if (error.message.includes('timeout')) {
    return 'Час очікування вичерпаний';
  }
  return 'Сталась помилка';
}

export async function withResultHandler<T>(
  ctx: BotContext,
  operation: () => Promise<Result<T>>,
  onSuccess: (value: T) => Promise<void>,
  errorMessage?: string
): Promise<void> {
  const result = await operation();

  if (!(await handleResult(ctx, result, errorMessage))) {
    return;
  }

  const value = result.unwrap();
  await onSuccess(value);
}
