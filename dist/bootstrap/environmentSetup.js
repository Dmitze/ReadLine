"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupEnvironment = setupEnvironment;
const dotenv_1 = __importDefault(require("dotenv"));
const logger_1 = require("../utils/logger");
const envSchema_1 = require("../config/envSchema");
const constants_1 = require("../constants");
dotenv_1.default.config();
function setupEnvironment() {
    const env = (0, envSchema_1.validateEnv)();
    logger_1.logger.info('Environment validation passed', { nodeEnv: env.NODE_ENV });
    const errors = [];
    const warnings = [];
    if (!process.env.BOT_TOKEN) {
        errors.push('BOT_TOKEN is required');
    }
    else if (process.env.BOT_TOKEN.length < constants_1.LIMITS.BOT_TOKEN_MIN) {
        errors.push('BOT_TOKEN appears to be invalid (too short)');
    }
    if (!process.env.GEMINI_API_KEY) {
        warnings.push('GEMINI_API_KEY is not set - AI features will be disabled');
    }
    else if (process.env.GEMINI_API_KEY.length < constants_1.LIMITS.API_KEY_MIN) {
        warnings.push('GEMINI_API_KEY appears to be invalid (too short) - AI features may not work');
    }
    if (errors.length > 0) {
        logger_1.logger.error('Environment validation failed - Critical configuration errors', new Error(errors.join(', ')));
        logger_1.logger.error('Configuration required', new Error('Create .env file with: BOT_TOKEN, GEMINI_API_KEY (optional)'));
        process.exit(1);
    }
    if (warnings.length > 0) {
        logger_1.logger.warn('Environment validation warnings', { warnings });
    }
    logger_1.logger.info('Environment variables validated successfully');
    return env;
}
//# sourceMappingURL=environmentSetup.js.map