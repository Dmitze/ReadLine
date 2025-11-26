"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hours = exports.minutes = exports.seconds = exports.TIMEOUTS = void 0;
exports.TIMEOUTS = {
    DATABASE_BUSY: 3000,
    DATABASE_QUERY: 5000,
    DATABASE_TRANSACTION: 10000,
    MESSAGE_DELETE_DELAY: 300,
    MESSAGE_SEND_DELAY: 500,
    TYPING_INDICATOR: 2000,
    AI_REQUEST: 30000,
    AI_SEARCH: 10000,
    CACHE_TTL: 300000,
    CACHE_CLEANUP: 600000,
    CACHE_SHORT: 60000,
    API_REQUEST: 5000,
    HTTP_TIMEOUT: 10000,
    RATE_LIMIT_WINDOW: 60000,
    RETRY_INITIAL: 500,
    RETRY_MAX: 10000,
    QUEUE_PROCESS_DELAY: 500,
    QUEUE_CLEANUP: 3000,
};
const seconds = (n) => n * 1000;
exports.seconds = seconds;
const minutes = (n) => n * 60 * 1000;
exports.minutes = minutes;
const hours = (n) => n * 60 * 60 * 1000;
exports.hours = hours;
//# sourceMappingURL=timeouts.js.map