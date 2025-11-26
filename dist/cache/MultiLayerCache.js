"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiLayerCache = void 0;
exports.getCache = getCache;
exports.resetCache = resetCache;
const MemoryCache_1 = require("./MemoryCache");
class MultiLayerCache {
    constructor(config = {}) {
        this.accessCount = new Map();
        this.creationTime = new Map();
        this.config = {
            memory: { enabled: true, ttl: 3600000 },
            strategy: 'LRU',
            maxSize: 1000,
            ...config,
        };
        this.memoryCache = new MemoryCache_1.MemoryCache(this.config.memory.ttl);
    }
    get(key) {
        if (!this.config.memory.enabled)
            return null;
        const value = this.memoryCache.get(key);
        if (value !== null) {
            this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
        }
        return value;
    }
    set(key, value, ttl) {
        if (!this.config.memory.enabled)
            return;
        if (this.memoryCache.size() >= this.config.maxSize) {
            this.evict();
        }
        this.memoryCache.set(key, value, ttl);
        this.accessCount.set(key, 0);
        this.creationTime.set(key, Date.now());
    }
    delete(key) {
        this.accessCount.delete(key);
        this.creationTime.delete(key);
        return this.memoryCache.delete(key);
    }
    clear() {
        this.memoryCache.clear();
        this.accessCount.clear();
        this.creationTime.clear();
    }
    evict() {
        const keys = this.memoryCache.keys();
        if (keys.length === 0)
            return;
        let keyToRemove = null;
        switch (this.config.strategy) {
            case 'LRU':
                keyToRemove = keys.reduce((least, key) => (this.accessCount.get(key) || 0) < (this.accessCount.get(least) || 0) ? key : least);
                break;
            case 'LFU':
                keyToRemove = keys.reduce((least, key) => {
                    const leastAccess = this.accessCount.get(least) || 0;
                    const keyAccess = this.accessCount.get(key) || 0;
                    if (keyAccess !== leastAccess) {
                        return keyAccess < leastAccess ? key : least;
                    }
                    const leastTime = this.creationTime.get(least) || 0;
                    const keyTime = this.creationTime.get(key) || 0;
                    return keyTime < leastTime ? key : least;
                });
                break;
            case 'FIFO':
                keyToRemove = keys.reduce((oldest, key) => {
                    const oldestTime = this.creationTime.get(oldest) || 0;
                    const keyTime = this.creationTime.get(key) || 0;
                    return keyTime < oldestTime ? key : oldest;
                });
                break;
        }
        if (keyToRemove) {
            this.delete(keyToRemove);
        }
    }
    async getOrSet(key, factory, ttl) {
        if (!this.config.memory.enabled) {
            return factory();
        }
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        const value = await factory();
        this.set(key, value, ttl);
        return value;
    }
    invalidateByPrefix(prefix) {
        return this.memoryCache.deleteByPrefix(prefix);
    }
    invalidate(pattern) {
        const count = this.memoryCache.invalidate(pattern);
        const keys = pattern.source.split('|');
        for (const key of keys) {
            this.accessCount.delete(key);
            this.creationTime.delete(key);
        }
        return count;
    }
    getStats() {
        const stats = this.memoryCache.getStats();
        const topAccessed = Array.from(this.accessCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key, count]) => ({ key, count }));
        return {
            strategy: this.config.strategy,
            size: stats.size,
            maxSize: this.config.maxSize,
            utilization: (stats.size / this.config.maxSize) * 100,
            memory: stats.memory,
            topAccessed,
        };
    }
    reconfigure(config) {
        this.config = { ...this.config, ...config };
    }
}
exports.MultiLayerCache = MultiLayerCache;
let cacheInstance = null;
function getCache() {
    if (!cacheInstance) {
        cacheInstance = new MultiLayerCache();
    }
    return cacheInstance;
}
function resetCache() {
    if (cacheInstance) {
        cacheInstance.clear();
    }
    cacheInstance = null;
}
//# sourceMappingURL=MultiLayerCache.js.map