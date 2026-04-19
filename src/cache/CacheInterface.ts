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

export class CacheFactory {
  static createMemoryCache(defaultTTL: number = 3600000): CacheInterface {
    const { MemoryCache } = require('./MemoryCache');
    return new MemoryCache(defaultTTL);
  }

  static createRedisCache(redisUrl: string, defaultTTL: number = 3600000): CacheInterface {
    console.warn('Redis cache not implemented yet, using memory cache');
    return this.createMemoryCache(defaultTTL);
  }

  static createMultiLayerCache(
    memoryTTL: number = 300000,
    redisUrl?: string,
    redisTTL: number = 3600000
  ): CacheInterface {
    const { MultiLayerCache } = require('./MultiLayerCache');
    return new MultiLayerCache(memoryTTL, redisUrl, redisTTL);
  }
}

export class CacheManager {
  private static instance: CacheManager;
  private caches: Map<string, CacheInterface> = new Map();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  getCache(
    name: string,
    type: 'memory' | 'redis' | 'multi' = 'memory',
    options?: any
  ): CacheInterface {
    if (this.caches.has(name)) {
      return this.caches.get(name)!;
    }

    let cache: CacheInterface;
    switch (type) {
      case 'redis':
        cache = CacheFactory.createRedisCache(options?.redisUrl, options?.ttl);
        break;
      case 'multi':
        cache = CacheFactory.createMultiLayerCache(
          options?.memoryTTL,
          options?.redisUrl,
          options?.redisTTL
        );
        break;
      default:
        cache = CacheFactory.createMemoryCache(options?.ttl);
    }

    this.caches.set(name, cache);
    return cache;
  }

  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}
