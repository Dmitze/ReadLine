import { BotContext, WizardState } from '../../../types/telegraf';
export declare function logUserAction(ctx: BotContext, action: string, data?: any): void;
export declare function handleFileUpload(ctx: BotContext, operation: () => Promise<void>): Promise<boolean>;
export declare function autoSaveState(state: WizardState): void;
//# sourceMappingURL=helpers.d.ts.map