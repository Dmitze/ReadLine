"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envSchema = void 0;
exports.validateEnv = validateEnv;
exports.getEnv = getEnv;
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    BOT_TOKEN: zod_1.z.string().min(20, 'BOT_TOKEN must be at least 20 characters'),
    ADMIN_ID: zod_1.z.string().regex(/^\d+(\s*,\s*\d+)*$/, 'ADMIN_ID must be numeric IDs separated by commas (e.g., "123456789" or "123456789, 987654321"'),
    DB_PATH: zod_1.z.string().default('./database/library.db'),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    GEMINI_MODEL: zod_1.z.string().default('gemini-1.5-flash'),
    AI_PROVIDER: zod_1.z.enum(['gemini', 'openai']).default('gemini'),
    REDIS_HOST: zod_1.z.string().default('localhost'),
    REDIS_PORT: zod_1.z
        .string()
        .regex(/^\d+$/, 'REDIS_PORT must be numeric')
        .default('6379')
        .transform(Number),
    LOG_LEVEL: zod_1.z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    PORT: zod_1.z.string().regex(/^\d+$/, 'PORT must be numeric').default('3000').transform(Number),
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
});
function validateEnv() {
    try {
        return exports.envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('❌ Environment validation failed:');
            error.errors.forEach((err) => {
                console.error(`  - ${err.path.join('.')}: ${err.message}`);
            });
            throw new Error('Invalid environment configuration. Please check your .env file.');
        }
        throw error;
    }
}
let _env = null;
function getEnv() {
    if (!_env) {
        _env = validateEnv();
    }
    return _env;
}
//# sourceMappingURL=envSchema.js.map