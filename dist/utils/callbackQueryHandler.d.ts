import { BotContext } from '../types/telegraf';
export declare function safeAnswerCbQuery(ctx: BotContext, notification?: string, options?: {
    show_alert?: boolean;
}): Promise<void>;
export declare function createSafeCallbackHandler(handler: (ctx: BotContext) => Promise<void>): (ctx: BotContext) => Promise<void>;
//# sourceMappingURL=callbackQueryHandler.d.ts.map