"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
exports.getConfig = getConfig;
exports.resetConfig = resetConfig;
const envSchema_1 = require("./envSchema");
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    loadConfig() {
        const env = (0, envSchema_1.getEnv)();
        return {
            bot: {
                token: env.BOT_TOKEN,
                webhook: undefined,
                polling: true,
            },
            database: {
                path: env.DB_PATH,
                sqlite: {
                    memory: false,
                },
            },
            ai: {
                enabled: !!env.GEMINI_API_KEY,
                provider: env.AI_PROVIDER,
                apiKey: env.GEMINI_API_KEY,
                timeout: 30000,
            },
            storage: {
                uploadsDir: './uploads',
                maxFileSize: 52428800,
                allowedMimeTypes: ['application/pdf', 'audio/mpeg', 'audio/wav'],
            },
            server: {
                port: env.PORT,
                host: '0.0.0.0',
            },
            logging: {
                level: env.LOG_LEVEL,
                format: 'text',
                file: undefined,
            },
            features: {
                audioBooks: true,
                aiAssistant: true,
                recommendations: true,
                reviews: true,
                promoCode: true,
            },
            limits: {
                booksPerPage: 20,
                maxTags: 10,
                maxGenres: 5,
                sessionTimeout: 3600000,
                rateLimitPerMinute: 30,
            },
        };
    }
    getConfig() {
        return this.config;
    }
    get(key) {
        return this.config[key];
    }
    validate() {
        if (!this.config.bot.token) {
            throw new Error('BOT_TOKEN is required');
        }
        if (!this.config.database.path && !this.config.database.sqlite?.memory) {
            throw new Error('DB_PATH or DB_MEMORY is required');
        }
        return true;
    }
    isFeatureEnabled(feature) {
        return this.config.features[feature];
    }
    getLimit(limit) {
        return this.config.limits[limit];
    }
}
exports.ConfigManager = ConfigManager;
let configInstance = null;
function getConfig() {
    if (!configInstance) {
        configInstance = new ConfigManager();
        configInstance.validate();
    }
    return configInstance;
}
function resetConfig() {
    configInstance = null;
}
//# sourceMappingURL=AppConfig.js.map