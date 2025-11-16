import { Book } from '../database/models';
import { Context } from 'telegraf';
export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export declare const detectDeviceType: (ctx: Context) => DeviceType;
export declare const getKeyboardConfig: (deviceType: DeviceType) => {
    buttonsPerRow: number;
    useInline: boolean;
    showQuickActions: boolean;
    buttonSize: string;
};
export declare const getAdaptiveMainMenuKeyboard: (ctx: Context, withQuickActions?: boolean) => import("@telegraf/types").InlineKeyboardMarkup | import("@telegraf/types").ReplyKeyboardMarkup;
export declare const getMainMenuKeyboard: () => import("@telegraf/types").ReplyKeyboardMarkup;
export declare const getAdaptiveGenreKeyboard: (ctx: Context, genres: string[]) => import("@telegraf/types").InlineKeyboardMarkup | import("@telegraf/types").ReplyKeyboardMarkup;
export declare const getGenreKeyboard: (genres: string[]) => import("@telegraf/types").InlineKeyboardMarkup;
export declare const getAdaptiveBookKeyboard: (ctx: Context, book: Book, isSaved?: boolean) => import("@telegraf/types").InlineKeyboardMarkup;
export declare const getEnhancedBookKeyboard: (book: Book, isSaved?: boolean) => import("@telegraf/types").InlineKeyboardMarkup;
export declare const getBackKeyboard: () => import("@telegraf/types").ReplyKeyboardRemove;
//# sourceMappingURL=mainKeyboards.d.ts.map