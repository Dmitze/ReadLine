export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO';
export interface CacheConfig {
    memory: {
        enabled: boolean;
        ttl: number;
    };
    strategy: CacheStrategy;
    maxSize: number;
}
export declare class MultiLayerCache {
    private memoryCache;
    private config;
    private accessCount;
    private creationTime;
    constructor(config?: Partial<CacheConfig>);
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttl?: number): void;
    delete(key: string): boolean;
    clear(): void;
    private evict;
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    invalidateByPrefix(prefix: string): number;
    invalidate(pattern: RegExp): number;
    getStats(): {
        strategy: CacheStrategy;
        size: number;
        maxSize: number;
        utilization: number;
        memory: string;
        topAccessed: Array<{
            key: string;
            count: number;
        }>;
    };
    reconfigure(config: Partial<CacheConfig>): void;
}
export declare function getCache(): MultiLayerCache;
export declare function resetCache(): void;
//# sourceMappingURL=MultiLayerCache.d.ts.map