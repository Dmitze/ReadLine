/**
 * In-Memory Cache Implementation
 * REFACTOR-011: Advanced Caching Strategy
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private timers = new Map<string, NodeJS.Timeout>();
  private defaultTTL: number;

  constructor(defaultTTL: number = 3600000) {
    this.defaultTTL = defaultTTL;
  }

  /**
   * Отримати значення з кешу
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Перевірити TTL
    if (entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        this.delete(key);
        return null;
      }
    }

    return entry.value as T;
  }

  /**
   * Встановити значення в кеш
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const actualTTL = ttl || this.defaultTTL;

    // ✅ Атомарна операція - завжди очищаємо старий таймер
    const oldTimer = this.timers.get(key);
    if (oldTimer) {
      clearTimeout(oldTimer);
      this.timers.delete(key);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: actualTTL,
    });

    // ✅ Створюємо новий таймер тільки після очищення старого
    const timer = setTimeout(() => {
      // ✅ Додаткова перевірка що таймер ще актуальний
      if (this.timers.get(key) === timer) {
        this.delete(key);
      }
    }, actualTTL);

    this.timers.set(key, timer);
  }

  /**
   * Перевірити наявність ключа
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Перевірити TTL
    if (entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        this.delete(key);
        return false;
      }
    }

    return true;
  }

  /**
   * Видалити значення з кешу
   */
  delete(key: string): boolean {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    return this.cache.delete(key);
  }

  /**
   * Очистити весь кеш
   */
  clear(): void {
    for (const [, timer] of this.timers) {
      clearTimeout(timer);
    }
    this.cache.clear();
    this.timers.clear();
  }

  /**
   * Отримати розмір кешу
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Отримати всі ключі
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Отримати статистику кешу
   */
  getStats(): {
    size: number;
    entries: number;
    memory: string;
  } {
    let memory = 0;
    for (const [key, entry] of this.cache) {
      memory += key.length + JSON.stringify(entry.value).length;
    }

    return {
      size: this.cache.size,
      entries: this.cache.size,
      memory: `${(memory / 1024).toFixed(2)} KB`,
    };
  }

  /**
   * Отримати або встановити значення (lazy loading)
   */
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Видалити всі ключі за префіксом
   */
  deleteByPrefix(prefix: string): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Інвалідувати кеш за шаблоном
   */
  invalidate(pattern: RegExp): number {
    let deleted = 0;
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key);
        deleted++;
      }
    }
    return deleted;
  }
}
