import { Markup } from 'telegraf';
export interface BreadcrumbItem {
    label: string;
    action?: string;
}
export declare function formatBreadcrumbs(items: BreadcrumbItem[]): string;
export declare function createNavigationKeyboard(options: {
    showHome?: boolean;
    showBack?: boolean;
    backAction?: string;
    additionalButtons?: any[][];
}): Markup.Markup<import("@telegraf/types").InlineKeyboardMarkup>;
export declare function createBreadcrumbText(breadcrumbs: BreadcrumbItem[], content: string): string;
export declare function getQuickActionsKeyboard(): import("@telegraf/types").ReplyKeyboardMarkup;
export declare function getStandardMainMenu(): import("@telegraf/types").ReplyKeyboardMarkup;
//# sourceMappingURL=navigation.d.ts.map