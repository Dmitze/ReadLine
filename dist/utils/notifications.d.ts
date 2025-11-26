import { Telegraf } from 'telegraf';
import { BotContext } from '../types/telegraf';
export type NotificationFrequency = 'daily' | 'every_4_days' | 'weekly' | 'disabled';
export interface NotificationSettings {
    userId: number;
    frequency: NotificationFrequency;
    enabled: boolean;
    lastNotificationAt?: Date;
    preferredTime?: string;
}
export declare const getUserNotificationSettings: (userId: number) => Promise<NotificationSettings>;
export declare const setUserNotificationSettings: (settings: NotificationSettings) => Promise<boolean>;
export declare const updateLastNotificationTime: (userId: number) => Promise<void>;
export declare const shouldSendNotification: (userId: number) => Promise<boolean>;
export declare const getPersonalizedNotification: (userId: number) => Promise<string | null>;
export declare const sendNotification: (bot: Telegraf<BotContext>, userId: number) => Promise<boolean>;
export declare const startNotificationScheduler: (bot: Telegraf<BotContext>) => NodeJS.Timeout;
export declare const stopNotificationScheduler: (interval: NodeJS.Timeout) => void;
//# sourceMappingURL=notifications.d.ts.map