import { BotContext, WizardState } from '../../types/telegraf';
export declare function getProgress(step: number): string;
export declare const examples: {
    title: string;
    author: string;
    description: string;
    link: string;
};
export declare const popularGenres: string[];
export declare const otherGenres: string[];
export declare function logUserAction(ctx: BotContext, action: string, data?: Record<string, unknown>): void;
export declare function autoSaveState(state: WizardState): void;
export declare function getCachedTags(): Promise<Array<{
    id: number;
    name: string;
}>>;
export declare function invalidateTagsCache(): void;
export declare function showFormatSelection(ctx: BotContext, _state: WizardState): Promise<void>;
export declare function proceedToTags(ctx: BotContext): Promise<void>;
export declare function showBookPreview(ctx: BotContext, state: WizardState): Promise<void>;
export declare function handleFileUpload(ctx: BotContext, uploadCallback: () => Promise<void>): Promise<boolean>;
//# sourceMappingURL=utils.d.ts.map