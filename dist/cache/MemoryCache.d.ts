export interface CacheEntry<T> {
    value: T;
    timestamp: number;
    ttl?: number;
}
export declare class MemoryCache {
    private cache;
    private timers;
    private defaultTTL;
    constructor(defaultTTL?: number);
    get<T>(key: string): T | null;
    set<T>(key: string, value: T, ttl?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    getStats(): {
        size: number;
        entries: number;
        memory: string;
    };
    getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;
    deleteByPrefix(prefix: string): number;
    invalidate(pattern: RegExp): number;
}
//# sourceMappingURL=MemoryCache.d.ts.map