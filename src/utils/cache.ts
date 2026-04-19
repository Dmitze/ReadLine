import { logger } from './logger';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();

  private pending: Map<string, Promise<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000;

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      logger.debug('Cache miss', { key });
      return null;
    }

    if (Date.now() > item.expiresAt) {
      logger.debug('Cache expired', { key });
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return item.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      expiresAt,
    });

    logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
  }

  delete(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache delete', { key });
  }

  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    const keysToRemove: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.cache.delete(key);
      removed++;
    }

    logger.debug('Cache cleanup', { removed });
  }

  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const pendingPromise = this.pending.get(key);
    if (pendingPromise) {
      logger.debug('Cache pending hit', { key });
      return pendingPromise;
    }

    logger.debug('Cache fetch', { key });
    const promise = fetcher()
      .then((data) => {
        this.set(key, data, ttl);
        this.pending.delete(key);
        return data;
      })
      .catch((error) => {
        this.pending.delete(key);
        throw error;
      });

    this.pending.set(key, promise);
    return promise;
  }

  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const item of this.cache.values()) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
    };
  }
}

export const cache = new CacheService();

export const cleanupInterval = setInterval(
  () => {
    cache.cleanup();
  },
  10 * 60 * 1000
);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

export const CACHE_KEYS = {
  GENRES: 'genres',
  TOP_BOOKS: 'top_books',
  NEW_BOOKS: 'new_books',
  ADMIN_STATS: 'admin_stats',
  PENDING_REVIEWS: 'pending_reviews',
  BOOK: (id: number) => `book_${id}`,
  BOOKS_BY_GENRE: (genre: string) => `books_genre_${genre}`,
  USER_SAVED_BOOKS: (userId: number) => `user_saved_${userId}`,
} as const;

export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,
  MEDIUM: 5 * 60 * 1000,
  LONG: 15 * 60 * 1000,
  VERY_LONG: 60 * 60 * 1000,
} as const;
