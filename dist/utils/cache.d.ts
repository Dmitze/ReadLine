declare class CacheService {
    private cache;
    private pending;
    private defaultTTL;
    get<T>(key: string): T | null;
    set<T>(key: string, data: T, ttl?: number): void;
    delete(key: string): void;
    clear(): void;
    cleanup(): void;
    getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T>;
    getStats(): {
        total: number;
        active: number;
        expired: number;
    };
}
export declare const cache: CacheService;
export declare const cleanupInterval: NodeJS.Timeout;
export declare const CACHE_KEYS: {
    readonly GENRES: "genres";
    readonly TOP_BOOKS: "top_books";
    readonly NEW_BOOKS: "new_books";
    readonly ADMIN_STATS: "admin_stats";
    readonly PENDING_REVIEWS: "pending_reviews";
    readonly BOOK: (id: number) => string;
    readonly BOOKS_BY_GENRE: (genre: string) => string;
    readonly USER_SAVED_BOOKS: (userId: number) => string;
};
export declare const CACHE_TTL: {
    readonly SHORT: number;
    readonly MEDIUM: number;
    readonly LONG: number;
    readonly VERY_LONG: number;
};
export {};
//# sourceMappingURL=cache.d.ts.map