/**
 * ✅ Абстракція для кешування
 * REFACTOR-012: Unified Caching Interface
 *
 * Забезпечує єдиний інтерфейс для різних типів кешу (in-memory, Redis, etc.)
 */

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

/**
 * ✅ Єдиний інтерфейс для всіх типів кешу
 */
export interface CacheInterface {
  /**
   * Отримати значення з кешу
   */
  get<T>(key: string): T | null;

  /**
   * Встановити значення в кеш
   */
  set<T>(key: string, value: T, ttl?: number): void;

  /**
   * Перевірити наявність ключа
   */
  has(key: string): boolean;

  /**
   * Видалити значення з кешу
   */
  delete(key: string): boolean;

  /**
   * Очистити весь кеш
   */
  clear(): void;

  /**
   * Отримати розмір кешу
   */
  size(): number;

  /**
   * Отримати всі ключі
   */
  keys(): string[];

  /**
   * Отримати статистику кешу
   */
  getStats(): CacheStats;

  /**
   * Отримати або встановити значення (lazy loading)
   */
  getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T>;

  /**
   * Видалити всі ключі за префіксом
   */
  deleteByPrefix(prefix: string): number;

  /**
   * Інвалідувати кеш за шаблоном
   */
  invalidate(pattern: RegExp): number;
}

/**
 * ✅ Фабрика для створення кешу
 */
export class CacheFactory {
  /**
   * Створити in-memory кеш
   */
  static createMemoryCache(defaultTTL: number = 3600000): CacheInterface {
    const { MemoryCache } = require('./MemoryCache');
    return new MemoryCache(defaultTTL);
  }

  /**
   * Створити Redis кеш (для майбутнього використання)
   */
  static createRedisCache(redisUrl: string, defaultTTL: number = 3600000): CacheInterface {
    // TODO: Implement Redis cache
    console.warn('Redis cache not implemented yet, using memory cache');
    return this.createMemoryCache(defaultTTL);
  }

  /**
   * Створити multi-layer кеш (memory + Redis)
   */
  static createMultiLayerCache(
    memoryTTL: number = 300000,
    redisUrl?: string,
    redisTTL: number = 3600000
  ): CacheInterface {
    const { MultiLayerCache } = require('./MultiLayerCache');
    return new MultiLayerCache(memoryTTL, redisUrl, redisTTL);
  }
}

/**
 * ✅ Глобальний кеш менеджер
 */
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

  /**
   * Отримати або створити кеш за назвою
   */
  getCache(name: string, type: 'memory' | 'redis' | 'multi' = 'memory', options?: any): CacheInterface {
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

  /**
   * Отримати статистику всіх кешів
   */
  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Очистити всі кеші
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}