"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManager = exports.CacheFactory = void 0;
class CacheFactory {
    static createMemoryCache(defaultTTL = 3600000) {
        const { MemoryCache } = require('./MemoryCache');
        return new MemoryCache(defaultTTL);
    }
    static createRedisCache(redisUrl, defaultTTL = 3600000) {
        console.warn('Redis cache not implemented yet, using memory cache');
        return this.createMemoryCache(defaultTTL);
    }
    static createMultiLayerCache(memoryTTL = 300000, redisUrl, redisTTL = 3600000) {
        const { MultiLayerCache } = require('./MultiLayerCache');
        return new MultiLayerCache(memoryTTL, redisUrl, redisTTL);
    }
}
exports.CacheFactory = CacheFactory;
class CacheManager {
    constructor() {
        this.caches = new Map();
    }
    static getInstance() {
        if (!CacheManager.instance) {
            CacheManager.instance = new CacheManager();
        }
        return CacheManager.instance;
    }
    getCache(name, type = 'memory', options) {
        if (this.caches.has(name)) {
            return this.caches.get(name);
        }
        let cache;
        switch (type) {
            case 'redis':
                cache = CacheFactory.createRedisCache(options?.redisUrl, options?.ttl);
                break;
            case 'multi':
                cache = CacheFactory.createMultiLayerCache(options?.memoryTTL, options?.redisUrl, options?.redisTTL);
                break;
            default:
                cache = CacheFactory.createMemoryCache(options?.ttl);
        }
        this.caches.set(name, cache);
        return cache;
    }
    getAllStats() {
        const stats = {};
        for (const [name, cache] of this.caches) {
            stats[name] = cache.getStats();
        }
        return stats;
    }
    clearAll() {
        for (const cache of this.caches.values()) {
            cache.clear();
        }
    }
}
exports.CacheManager = CacheManager;
//# sourceMappingURL=CacheInterface.js.map