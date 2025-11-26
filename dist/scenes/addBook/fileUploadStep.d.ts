import { BotContext, WizardState } from '../../types/telegraf';
export declare function showFileFormatMenu(ctx: BotContext, state: WizardState): Promise<void>;
export declare function handleFileFormatUpload(ctx: BotContext, state: WizardState, format: 'file' | 'audio' | 'link'): Promise<boolean>;
export declare function getLoadedFormatsText(state: WizardState): string;
//# sourceMappingURL=fileUploadStep.d.ts.map