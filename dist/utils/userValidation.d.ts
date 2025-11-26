import { Context } from 'telegraf';
export declare const validateUserId: (ctx: Context) => number | null;
export declare const requireValidUserId: (ctx: Context, next: () => Promise<void>) => Promise<void>;
export declare const checkUserIdOrReply: (ctx: Context) => Promise<boolean>;
//# sourceMappingURL=userValidation.d.ts.map