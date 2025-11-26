export interface AppConfig {
    bot: {
        token: string;
        webhook?: string;
        polling: boolean;
    };
    database: {
        path: string;
        sqlite?: {
            memory?: boolean;
        };
    };
    ai: {
        enabled: boolean;
        provider?: 'openai' | 'anthropic';
        apiKey?: string;
        timeout?: number;
    };
    storage: {
        uploadsDir: string;
        maxFileSize: number;
        allowedMimeTypes: string[];
    };
    server: {
        port: number;
        host: string;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        format: 'json' | 'text';
        file?: string;
    };
    features: {
        audioBooks: boolean;
        aiAssistant: boolean;
        recommendations: boolean;
        reviews: boolean;
        promoCode: boolean;
    };
    limits: {
        booksPerPage: number;
        maxTags: number;
        maxGenres: number;
        sessionTimeout: number;
        rateLimitPerMinute: number;
    };
}
export declare class ConfigManager {
    private config;
    constructor();
    private loadConfig;
    getConfig(): AppConfig;
    get<K extends keyof AppConfig>(key: K): AppConfig[K];
    validate(): boolean;
    isFeatureEnabled(feature: keyof AppConfig['features']): boolean;
    getLimit(limit: keyof AppConfig['limits']): number;
}
export declare function getConfig(): ConfigManager;
export declare function resetConfig(): void;
//# sourceMappingURL=AppConfig.d.ts.map