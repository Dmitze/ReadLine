/**
 * Multi-Layer Cache Strategy (Memory + Strategy)
 * REFACTOR-011: Advanced Caching Strategy
 */

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
      ...config
    };

    this.memoryCache = new MemoryCache(this.config.memory.ttl);
  }

  /**
   * Отримати значення
   */
  get<T>(key: string): T | null {
    if (!this.config.memory.enabled) return null;

    const value = this.memoryCache.get<T>(key);
    
    if (value !== null) {
      // Оновити статистику доступу
      this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    }

    return value;
  }

  /**
   * Встановити значення
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (!this.config.memory.enabled) return;

    // Перевірити ліміт розміру
    if (this.memoryCache.size() >= this.config.maxSize) {
      this.evict();
    }

    this.memoryCache.set(key, value, ttl);
    this.accessCount.set(key, 0);
    this.creationTime.set(key, Date.now());
  }

  /**
   * Видалити значення
   */
  delete(key: string): boolean {
    this.accessCount.delete(key);
    this.creationTime.delete(key);
    return this.memoryCache.delete(key);
  }

  /**
   * Очистити кеш
   */
  clear(): void {
    this.memoryCache.clear();
    this.accessCount.clear();
    this.creationTime.clear();
  }

  /**
   * Вилучити елемент за стратегією
   */
  private evict(): void {
    const keys = this.memoryCache.keys();
    if (keys.length === 0) return;

    let keyToRemove: string | null = null;

    switch (this.config.strategy) {
      case 'LRU':
        // Least Recently Used - видалити елемент з найменшою кількістю доступів
        keyToRemove = keys.reduce((least, key) => 
          (this.accessCount.get(key) || 0) < (this.accessCount.get(least) || 0) ? key : least
        );
        break;

      case 'LFU':
        // Least Frequently Used - видалити елемент з найменшою частотою доступів
        keyToRemove = keys.reduce((least, key) => {
          const leastAccess = this.accessCount.get(least) || 0;
          const keyAccess = this.accessCount.get(key) || 0;
          if (keyAccess !== leastAccess) {
            return keyAccess < leastAccess ? key : least;
          }
          // Якщо частота однакова, видалити старіший
          const leastTime = this.creationTime.get(least) || 0;
          const keyTime = this.creationTime.get(key) || 0;
          return keyTime < leastTime ? key : least;
        });
        break;

      case 'FIFO':
        // First In First Out - видалити найстарший елемент
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

  /**
   * Отримати або встановити значення
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
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

  /**
   * Інвалідувати кеш за префіксом
   */
  invalidateByPrefix(prefix: string): number {
    return this.memoryCache.deleteByPrefix(prefix);
  }

  /**
   * Інвалідувати кеш за шаблоном
   */
  invalidate(pattern: RegExp): number {
    const count = this.memoryCache.invalidate(pattern);
    const keys = pattern.source.split('|');
    for (const key of keys) {
      this.accessCount.delete(key);
      this.creationTime.delete(key);
    }
    return count;
  }

  /**
   * Отримати статистику
   */
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
      utilization: (stats.size / this.config.maxSize * 100),
      memory: stats.memory,
      topAccessed
    };
  }

  /**
   * Перезагрузити конфіг
   */
  reconfigure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Singleton instance
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
