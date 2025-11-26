"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = exports.Logger = exports.logger = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor() {
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }
    log(level, message, meta) {
        const formatted = this.formatMessage(level, message, meta);
        switch (level) {
            case LogLevel.DEBUG:
                if (this.isDevelopment) {
                    console.log(`🔍 ${formatted}`);
                }
                break;
            case LogLevel.INFO:
                console.log(`ℹ️ ${formatted}`);
                break;
            case LogLevel.WARN:
                console.warn(`⚠️ ${formatted}`);
                break;
            case LogLevel.ERROR:
                console.error(`❌ ${formatted}`);
                break;
        }
    }
    debug(message, meta) {
        this.log(LogLevel.DEBUG, message, meta);
    }
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    error(message, error, meta) {
        const errorMeta = error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                ...meta,
            }
            : { error, ...meta };
        this.log(LogLevel.ERROR, message, errorMeta);
    }
    userAction(userId, action, details) {
        this.info(`User action: ${action}`, {
            userId,
            ...details,
        });
    }
    adminAction(adminId, action, details) {
        this.warn(`Admin action: ${action}`, {
            adminId,
            ...details,
        });
    }
    dbQuery(query, params) {
        this.debug('Database query', { query, params });
    }
    aiRequest(userId, question, response) {
        this.info('AI request', {
            userId,
            questionLength: question.length,
            responseLength: response.length,
        });
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
//# sourceMappingURL=logger.js.map