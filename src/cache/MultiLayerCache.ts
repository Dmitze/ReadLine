import { MemoryCache } from './MemoryCache';

export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO';

export interface CacheConfig {
  memory: {
    enabled: boolean;
    ttl: number;
  };
  strategy: CacheStrategy;
  maxSize: number;
}

export class MultiLayerCache {
  private memoryCache: MemoryCache;
  private config: CacheConfig;
  private accessCount = new Map<string, number>();
  private creationTime = new Map<string, number>();

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      memory: { enabled: true, ttl: 3600000 },
      strategy: 'LRU',
      maxSize: 1000,
      ...config,
    };

    this.memoryCache = new MemoryCache(this.config.memory.ttl);
  }

  get<T>(key: string): T | null {
    if (!this.config.memory.enabled) return null;

    const value = this.memoryCache.get<T>(key);

    if (value !== null) {
      this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    }

    return value;
  }

  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.config.memory.enabled) return;

    if (this.memoryCache.size() >= this.config.maxSize) {
      this.evict();
    }

    this.memoryCache.set(key, value, ttl);
    this.accessCount.set(key, 0);
    this.creationTime.set(key, Date.now());
  }

  delete(key: string): boolean {
    this.accessCount.delete(key);
    this.creationTime.delete(key);
    return this.memoryCache.delete(key);
  }

  clear(): void {
    this.memoryCache.clear();
    this.accessCount.clear();
    this.creationTime.clear();
  }

  private evict(): void {
    const keys = this.memoryCache.keys();
    if (keys.length === 0) return;

    let keyToRemove: string | null = null;

    switch (this.config.strategy) {
      case 'LRU':
        keyToRemove = keys.reduce((least, key) =>
          (this.accessCount.get(key) || 0) < (this.accessCount.get(least) || 0) ? key : least
        );
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

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    if (!this.config.memory.enabled) {
      return factory();
    }

    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  invalidateByPrefix(prefix: string): number {
    return this.memoryCache.deleteByPrefix(prefix);
  }

  invalidate(pattern: RegExp): number {
    const count = this.memoryCache.invalidate(pattern);
    const keys = pattern.source.split('|');
    for (const key of keys) {
      this.accessCount.delete(key);
      this.creationTime.delete(key);
    }
    return count;
  }

  getStats(): {
    strategy: CacheStrategy;
    size: number;
    maxSize: number;
    utilization: number;
    memory: string;
    topAccessed: Array<{ key: string; count: number }>;
  } {
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

  reconfigure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

let cacheInstance: MultiLayerCache | null = null;

export function getCache(): MultiLayerCache {
  if (!cacheInstance) {
    cacheInstance = new MultiLayerCache();
  }
  return cacheInstance;
}

export function resetCache(): void {
  if (cacheInstance) {
    cacheInstance.clear();
  }
  cacheInstance = null;
}
