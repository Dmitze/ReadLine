/**
 * Transaction Manager Tests
 */

import { TransactionManager, TransactionPatterns } from '../../database/TransactionManager';
import { DatabaseWrapper } from '../../database/dbWrapper';

describe('Transaction Manager', () => {
  let mockDb: {
    run: jest.Mock;
    all: jest.Mock;
    get: jest.Mock;
    transaction: jest.Mock;
  };
  let dbWrapper: DatabaseWrapper;
  let manager: TransactionManager;

  beforeEach(() => {
    mockDb = {
      run: jest.fn((query, params, callback) => {
        if (typeof params === 'function') {
          params(null);
        } else if (callback) {
          callback.call({ changes: 1, lastID: 1 }, null);
        }
      }),
      all: jest.fn(),
      get: jest.fn(),
      transaction: jest.fn(),
    };

    dbWrapper = new DatabaseWrapper(mockDb as never);
    manager = new TransactionManager(dbWrapper);
  });

  describe('executeTransaction', () => {
    it('should execute operation in transaction', async () => {
      let executed = false;
      const operation = jest.fn(async () => {
        executed = true;
        return 'success';
      });

      // Mock transaction method
      dbWrapper.transaction = jest.fn(async (callback) => {
        return await callback();
      });

      const result = await manager.executeTransaction(operation);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('success');
      }
      expect(executed).toBe(true);
    });

    it('should rollback on error', async () => {
      const operation = jest.fn(async () => {
        throw new Error('Operation failed');
      });

      dbWrapper.transaction = jest.fn(async (callback) => {
        return await callback();
      });

      const result = await manager.executeTransaction(operation);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Operation failed');
      }
    });
  });

  describe('batch', () => {
    it('should execute multiple operations in order', async () => {
      const order: number[] = [];
      const operations = [
        async () => {
          order.push(1);
          return 1;
        },
        async () => {
          order.push(2);
          return 2;
        },
        async () => {
          order.push(3);
          return 3;
        },
      ];

      dbWrapper.transaction = jest.fn(async (callback) => {
        return await callback();
      });

      const result = await manager.batch(operations);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([1, 2, 3]);
      }
      expect(order).toEqual([1, 2, 3]);
    });

    it('should rollback all on error', async () => {
      const operations = [
        async () => 1,
        async () => {
          throw new Error('Failed');
        },
        async () => 3,
      ];

      dbWrapper.transaction = jest.fn(async (callback) => {
        try {
          return await callback();
        } catch (error) {
          throw error; // Transaction will rollback
        }
      });

      const result = await manager.batch(operations);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toBe('Failed');
      }
    });
  });

  describe('savepoint', () => {
    it('should create and release savepoint', async () => {
      const operation = jest.fn(async () => 'success');

      const result = await manager.savepoint('sp1', operation);

      expect(result.isOk()).toBe(true);
      expect(mockDb.run).toHaveBeenCalledWith(
        'SAVEPOINT sp1',
        expect.anything(),
        expect.anything()
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        'RELEASE SAVEPOINT sp1',
        expect.anything(),
        expect.anything()
      );
    });
  });
});

describe('TransactionPatterns', () => {
  let mockDb: { run: jest.Mock; all: jest.Mock; get: jest.Mock };
  let dbWrapper: DatabaseWrapper;
  let manager: TransactionManager;
  let patterns: TransactionPatterns;

  beforeEach(() => {
    mockDb = {
      run: jest.fn((query, params, callback) => {
        if (typeof params === 'function') {
          params(null);
        } else if (callback) {
          callback.call({ changes: 1, lastID: 1 }, null);
        }
      }),
      all: jest.fn(),
      get: jest.fn(),
    };

    dbWrapper = new DatabaseWrapper(mockDb as never);
    manager = new TransactionManager(dbWrapper);
    patterns = new TransactionPatterns(manager);
  });

  describe('createWithRelated', () => {
    it('should create main and related entities', async () => {
      const mainCreate = jest.fn(async () => 1);
      const relatedCreates = [
        jest.fn(async (id: number) => `related-${id}-1`),
        jest.fn(async (id: number) => `related-${id}-2`),
      ];

      dbWrapper.transaction = jest.fn(async (callback) => {
        return await callback();
      });

      const result = await patterns.createWithRelated(mainCreate, relatedCreates);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.main).toBe(1);
        expect(result.value.related).toEqual(['related-1-1', 'related-1-2']);
      }
    });
  });
});
