import { BotContext } from '../types/telegraf';
export interface CORSConfig {
    origin?: string | string[] | ((origin: string) => boolean);
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
}
export interface SecurityHeadersConfig {
    contentSecurityPolicy?: string | boolean;
    crossOriginResourcePolicy?: string;
    crossOriginOpenerPolicy?: string;
    referrerPolicy?: string;
    strictTransportSecurity?: string;
    xContentTypeOptions?: string;
    xFrameOptions?: string;
    xPoweredBy?: boolean;
}
export declare function securityHeadersMiddleware(config?: SecurityHeadersConfig): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
export declare function corsMiddleware(config?: CORSConfig): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
export declare function requestValidationMiddleware(): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
export declare function xssPreventionMiddleware(): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
export interface UserSecurityContext {
    userId: number;
    lastActivity: Date;
    requestCount: number;
    isBlocked: boolean;
    suspiciousActivities: number;
}
export declare class SecurityContext {
    private users;
    checkUser(userId: number): UserSecurityContext;
    recordSuspiciousActivity(userId: number): void;
    incrementRequest(userId: number): void;
    unblockUser(userId: number): void;
    cleanup(): void;
}
export declare function createSecurityContextMiddleware(securityContext: SecurityContext): (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
export declare function createSecurityMiddlewareStack(config?: {
    cors?: CORSConfig;
    headers?: SecurityHeadersConfig;
}): {
    cors: (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
    headers: (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
    requestValidation: (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
    xssPrevention: (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
    securityContext: (ctx: BotContext, next: () => Promise<void>) => Promise<void>;
    apply: (bot: {
        use: (middleware: unknown) => void;
    }) => void;
    getSecurityContext: () => SecurityContext;
};
//# sourceMappingURL=SecurityHeaders.d.ts.map