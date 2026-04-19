export declare function setupEnvironment(): {
    NODE_ENV?: "production" | "development" | "test";
    BOT_TOKEN?: string;
    ADMIN_ID?: string;
    DB_PATH?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    AI_PROVIDER?: "gemini" | "openai" | "groq";
    REDIS_HOST?: string;
    REDIS_PORT?: number;
    LOG_LEVEL?: "error" | "debug" | "info" | "warn";
    PORT?: number;
};
//# sourceMappingURL=environmentSetup.d.ts.map