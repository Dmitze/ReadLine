/**
 * Cache Tests - тести для кешування
 */

import { cache } from '../utils/cache';

describe('Cache Service', () => {
  beforeEach(() => {
    cache.clear();
  });

  describe('get and set', () => {
    it('should store and retrieve data', () => {
      cache.set('test-key', 'test-value');
      const result = cache.get('test-key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire data after TTL', async () => {
      cache.set('test-key', 'test-value', 100); // 100ms TTL

      // Одразу має бути доступно
      expect(cache.get('test-key')).toBe('test-value');

      // Чекаємо більше TTL
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Має бути expired
      expect(cache.get('test-key')).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete data', () => {
      cache.set('test-key', 'test-value');
      cache.delete('test-key');
      expect(cache.get('test-key')).toBeNull();
    });
  });

  describe('clear', () => {
    it('should clear all data', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('getOrSet', () => {
    it('should fetch and cache data', async () => {
      const fetcher = jest.fn(async () => 'fetched-value');

      const result = await cache.getOrSet('test-key', fetcher);

      expect(result).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1);

      // Другий виклик має використати кеш
      const result2 = await cache.getOrSet('test-key', fetcher);
      expect(result2).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1); // Не викликається знову
    });

    it('should prevent race condition', async () => {
      const fetcher = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'fetched-value';
      });

      // Два паралельні запити
      const [result1, result2] = await Promise.all([
        cache.getOrSet('test-key', fetcher),
        cache.getOrSet('test-key', fetcher),
      ]);

      expect(result1).toBe('fetched-value');
      expect(result2).toBe('fetched-value');
      expect(fetcher).toHaveBeenCalledTimes(1); // Викликається тільки раз
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 10000);

      await new Promise((resolve) => setTimeout(resolve, 150));

      cache.cleanup();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });
});
