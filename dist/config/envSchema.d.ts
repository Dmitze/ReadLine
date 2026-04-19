import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    BOT_TOKEN: z.ZodString;
    ADMIN_ID: z.ZodString;
    DB_PATH: z.ZodDefault<z.ZodString>;
    GEMINI_API_KEY: z.ZodOptional<z.ZodString>;
    GEMINI_MODEL: z.ZodDefault<z.ZodString>;
    GROQ_API_KEY: z.ZodOptional<z.ZodString>;
    GROQ_MODEL: z.ZodDefault<z.ZodString>;
    AI_PROVIDER: z.ZodDefault<z.ZodEnum<["gemini", "openai", "groq"]>>;
    REDIS_HOST: z.ZodDefault<z.ZodString>;
    REDIS_PORT: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
    PORT: z.ZodEffects<z.ZodDefault<z.ZodString>, number, string>;
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "production", "test"]>>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
    REDIS_PORT?: string;
    LOG_LEVEL?: "error" | "debug" | "info" | "warn";
    PORT?: string;
}>;
export type Env = z.infer<typeof envSchema>;
export declare function validateEnv(): Env;
export declare function getEnv(): Env;
//# sourceMappingURL=envSchema.d.ts.map