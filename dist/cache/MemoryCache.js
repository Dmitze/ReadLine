"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCache = void 0;
class MemoryCache {
    constructor(defaultTTL = 3600000) {
        this.cache = new Map();
        this.timers = new Map();
        this.defaultTTL = defaultTTL;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (entry.ttl) {
            const age = Date.now() - entry.timestamp;
            if (age > entry.ttl) {
                this.delete(key);
                return null;
            }
        }
        return entry.value;
    }
    set(key, value, ttl) {
        const actualTTL = ttl || this.defaultTTL;
        const oldTimer = this.timers.get(key);
        if (oldTimer) {
            clearTimeout(oldTimer);
            this.timers.delete(key);
        }
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            ttl: actualTTL,
        });
        const timer = setTimeout(() => {
            if (this.timers.get(key) === timer) {
                this.delete(key);
            }
        }, actualTTL);
        this.timers.set(key, timer);
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (entry.ttl) {
            const age = Date.now() - entry.timestamp;
            if (age > entry.ttl) {
                this.delete(key);
                return false;
            }
        }
        return true;
    }
    delete(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }
    clear() {
        for (const [, timer] of this.timers) {
            clearTimeout(timer);
        }
        this.cache.clear();
        this.timers.clear();
    }
    size() {
        return this.cache.size;
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    getStats() {
        let memory = 0;
        for (const [key, entry] of this.cache) {
            memory += key.length + JSON.stringify(entry.value).length;
        }
        return {
            size: this.cache.size,
            entries: this.cache.size,
            memory: `${(memory / 1024).toFixed(2)} KB`,
        };
    }
    async getOrSet(key, factory, ttl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        this.set(key, value, ttl);
        return value;
    }
    deleteByPrefix(prefix) {
        let deleted = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.delete(key);
                deleted++;
            }
        }
        return deleted;
    }
    invalidate(pattern) {
        let deleted = 0;
        for (const key of this.cache.keys()) {
            if (pattern.test(key)) {
                this.delete(key);
                deleted++;
            }
        }
        return deleted;
    }
}
exports.MemoryCache = MemoryCache;
//# sourceMappingURL=MemoryCache.js.map