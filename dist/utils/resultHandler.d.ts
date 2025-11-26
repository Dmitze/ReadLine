import { BotContext } from '../types/telegraf';
import { Result } from '../core/Result';
export declare function handleResult<T>(ctx: BotContext, result: Result<T>, errorMessage?: string): Promise<boolean>;
export declare function withResultHandler<T>(ctx: BotContext, operation: () => Promise<Result<T>>, onSuccess: (value: T) => Promise<void>, errorMessage?: string): Promise<void>;
//# sourceMappingURL=resultHandler.d.ts.map