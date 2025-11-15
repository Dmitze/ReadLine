import { Book } from '../database/models';
export declare const formatBookCaption: (book: Book, tags?: Array<{
    name: string;
}>) => Promise<string>;
export declare const escapeHtml: (text: string) => string;
export declare function showLoadingAnimation(ctx: any, message: string): Promise<number>;
export declare function updateLoadingMessage(ctx: any, messageId: number, newText: string, emoji?: string): Promise<void>;
export declare function createProgressBar(current: number, total: number): string;
export declare function formatStepProgress(currentStep: number, totalSteps: number, stepName: string): string;
//# sourceMappingURL=helpers.d.ts.map