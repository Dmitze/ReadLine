export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl?: number;
}
export interface CacheStats {
    size: number;
    entries: number;
    memory: string;
    hitRate?: number;
    missRate?: number;
}
export interface CacheInterface {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttl?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    getStats(): CacheStats;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    deleteByPrefix(prefix: string): number;
    invalidate(pattern: RegExp): number;
}
export declare class CacheFactory {
    static createMemoryCache(defaultTTL?: number): CacheInterface;
    static createRedisCache(redisUrl: string, defaultTTL?: number): CacheInterface;
    static createMultiLayerCache(memoryTTL?: number, redisUrl?: string, redisTTL?: number): CacheInterface;
}
export declare class CacheManager {
    private static instance;
    private caches;
    private constructor();
    static getInstance(): CacheManager;
    getCache(name: string, type?: 'memory' | 'redis' | 'multi', options?: any): CacheInterface;
    getAllStats(): Record<string, CacheStats>;
    clearAll(): void;
}
//# sourceMappingURL=CacheInterface.d.ts.map