/**
 * Cache Service - in-memory кешування для швидкого доступу
 */

import { logger } from './logger';

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  // ✅ ВИПРАВЛЕНО #10: додано pending promises для уникнення race condition
  private pending: Map<string, Promise<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 хвилин за замовчуванням

  /**
   * Отримати значення з кешу
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      logger.debug('Cache miss', { key });
      return null;
    }

    // Перевіряємо чи не expired
    if (Date.now() > item.expiresAt) {
      logger.debug('Cache expired', { key });
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key });
    return item.data as T;
  }

  /**
   * Зберегти значення в кеш
   */
  set<T>(key: string, data: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data,
      expiresAt,
    });

    logger.debug('Cache set', { key, ttl: ttl || this.defaultTTL });
  }

  /**
   * Видалити значення з кешу
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache delete', { key });
  }

  /**
   * Очистити весь кеш
   */
  clear(): void {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Видалити всі expired записи
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;
    // ✅ ВИПРАВЛЕНО #34: збираємо keys перед видаленням
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

  /**
   * Отримати або встановити значення
   * ✅ ВИПРАВЛЕНО #10: race condition - два паралельні запити не виконають fetcher двічі
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    // Перевіряємо чи вже виконується запит
    const pendingPromise = this.pending.get(key);
    if (pendingPromise) {
      logger.debug('Cache pending hit', { key });
      return pendingPromise;
    }

    // Створюємо новий запит
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

  /**
   * Отримати статистику кешу
   */
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

// Singleton instance
export const cache = new CacheService();

// Періодична очистка expired записів (кожні 10 хвилин)
// Зберігаємо reference для можливості очистки в тестах
export const cleanupInterval = setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);

// Дозволяємо unref в Node.js environment щоб не блокувати exit
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

// Cache keys для різних типів даних
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

// TTL для різних типів даних (в мілісекундах)
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 хвилина
  MEDIUM: 5 * 60 * 1000, // 5 хвилин
  LONG: 15 * 60 * 1000, // 15 хвилин
  VERY_LONG: 60 * 60 * 1000, // 1 година
} as const;
