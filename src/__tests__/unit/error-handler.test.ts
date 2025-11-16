/**
 * Error Handler Tests
 */

import {
  AppError,
  ErrorType,
  asyncHandler,
  retryOperation,
  withFallback,
  withTimeout
} from '../../utils/errorHandler';

describe('Error Handler', () => {
  describe('AppError', () => {
    it('should create custom error with type', () => {
      const error = new AppError(
        ErrorType.VALIDATION,
        'Invalid input',
        'User-friendly message'
      );

      expect(error.type).toBe(ErrorType.VALIDATION);
      expect(error.message).toBe('Invalid input');
      expect(error.userMessage).toBe('User-friendly message');
      expect(error.name).toBe('AppError');
    });
  });

  describe('asyncHandler', () => {
    it('should return result on success', async () => {
      const fn = async (x: number) => x * 2;
      const safe = asyncHandler(fn);

      const result = await safe(5);
      expect(result).toBe(10);
    });

    it('should return undefined on error', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };
      const safe = asyncHandler(fn);

      const result = await safe();
      expect(result).toBeUndefined();
    });
  });

  describe('retryOperation', () => {
    it('should succeed on first try', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryOperation(operation, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      let attempts = 0;
      const operation = jest.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Fail');
        }
        return 'success';
      });

      const result = await retryOperation(operation, 3, 10);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      await expect(retryOperation(operation, 3, 10)).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('withFallback', () => {
    it('should return primary result on success', async () => {
      const primary = jest.fn().mockResolvedValue('primary');
      const fallback = jest.fn().mockResolvedValue('fallback');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('primary');
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should use fallback on primary failure', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('Primary failed'));
      const fallback = jest.fn().mockResolvedValue('fallback');

      const result = await withFallback(primary, fallback);

      expect(result).toBe('fallback');
      expect(fallback).toHaveBeenCalled();
    });
  });

  describe('withTimeout', () => {
    it('should return result if operation completes in time', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'done';
      };

      const result = await withTimeout(operation, 100);
      expect(result).toBe('done');
    });

    it('should throw on timeout', async () => {
      const operation = async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return 'done';
      };

      await expect(withTimeout(operation, 50, 'Too slow')).rejects.toThrow('Too slow');
    });
  });
});
