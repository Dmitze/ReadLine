import { Book } from '../database/models';
export declare const formatBookCaption: (book: Book, tags?: Array<{
    name: string;
}>) => Promise<string>;
export declare const escapeHtml: (text: string) => string;
export declare const getBookIdText: (bookId?: number) => string;
import { BotContext } from '../types/telegraf';
export declare function showLoadingAnimation(ctx: BotContext, message: string): Promise<number>;
export declare function updateLoadingMessage(ctx: BotContext, messageId: number, newText: string, emoji?: string): Promise<void>;
export declare function createProgressBar(current: number, total: number): string;
export declare function formatStepProgress(currentStep: number, totalSteps: number, stepName: string): string;
//# sourceMappingURL=helpers.d.ts.map