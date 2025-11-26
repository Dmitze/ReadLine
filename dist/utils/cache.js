"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.CACHE_KEYS = exports.cleanupInterval = exports.cache = void 0;
const logger_1 = require("./logger");
class CacheService {
    constructor() {
        this.cache = new Map();
        this.pending = new Map();
        this.defaultTTL = 5 * 60 * 1000;
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            logger_1.logger.debug('Cache miss', { key });
            return null;
        }
        if (Date.now() > item.expiresAt) {
            logger_1.logger.debug('Cache expired', { key });
            this.cache.delete(key);
            return null;
        }
        logger_1.logger.debug('Cache hit', { key });
        return item.data;
    }
    set(key, data, ttl) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, {
            data,
            expiresAt,
        });
        logger_1.logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
    }
    delete(key) {
        this.cache.delete(key);
        logger_1.logger.debug('Cache delete', { key });
    }
    clear() {
        this.cache.clear();
        logger_1.logger.debug('Cache cleared');
    }
    cleanup() {
        const now = Date.now();
        let removed = 0;
        const keysToRemove = [];
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                keysToRemove.push(key);
            }
        }
        for (const key of keysToRemove) {
            this.cache.delete(key);
            removed++;
        }
        logger_1.logger.debug('Cache cleanup', { removed });
    }
    async getOrSet(key, fetcher, ttl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const pendingPromise = this.pending.get(key);
        if (pendingPromise) {
            logger_1.logger.debug('Cache pending hit', { key });
            return pendingPromise;
        }
        logger_1.logger.debug('Cache fetch', { key });
        const promise = fetcher()
            .then((data) => {
            this.set(key, data, ttl);
            this.pending.delete(key);
            return data;
        })
            .catch((error) => {
            this.pending.delete(key);
            throw error;
        });
        this.pending.set(key, promise);
        return promise;
    }
    getStats() {
        const now = Date.now();
        let expired = 0;
        let active = 0;
        for (const item of this.cache.values()) {
            if (now > item.expiresAt) {
                expired++;
            }
            else {
                active++;
            }
        }
        return {
            total: this.cache.size,
            active,
            expired,
        };
    }
}
exports.cache = new CacheService();
exports.cleanupInterval = setInterval(() => {
    exports.cache.cleanup();
}, 10 * 60 * 1000);
if (exports.cleanupInterval.unref) {
    exports.cleanupInterval.unref();
}
exports.CACHE_KEYS = {
    GENRES: 'genres',
    TOP_BOOKS: 'top_books',
    NEW_BOOKS: 'new_books',
    ADMIN_STATS: 'admin_stats',
    PENDING_REVIEWS: 'pending_reviews',
    BOOK: (id) => `book_${id}`,
    BOOKS_BY_GENRE: (genre) => `books_genre_${genre}`,
    USER_SAVED_BOOKS: (userId) => `user_saved_${userId}`,
};
exports.CACHE_TTL = {
    SHORT: 1 * 60 * 1000,
    MEDIUM: 5 * 60 * 1000,
    LONG: 15 * 60 * 1000,
    VERY_LONG: 60 * 60 * 1000,
};
//# sourceMappingURL=cache.js.map