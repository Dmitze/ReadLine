import { DatabaseWrapper } from './dbWrapper';
import { logger } from '../utils/logger';
import { Result, Ok, Err } from '../core/Result';

export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  timeout?: number;
  retryOnDeadlock?: boolean;
  maxRetries?: number;
}

export interface TransactionStats {
  startTime: Date;
  endTime?: Date;
  duration?: number;
  operations: number;
  committed: boolean;
  error?: Error;
}

export class TransactionManager {
  private stats: Map<string, TransactionStats> = new Map();

  constructor(private db: DatabaseWrapper) {}

  async executeTransaction<T>(
    operation: () => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<Result<T>> {
    const transactionId = this.generateTransactionId();
    const stats: TransactionStats = {
      startTime: new Date(),
      operations: 0,
      committed: false,
    };

    this.stats.set(transactionId, stats);

    try {
      const result = await this.db.transaction(async () => {
        if (options.isolationLevel) {
          await this.db.run(
            `PRAGMA read_uncommitted = ${options.isolationLevel === IsolationLevel.READ_UNCOMMITTED ? 1 : 0}`
          );
        }

        if (options.timeout) {
          return await this.withTimeout(operation, options.timeout);
        }

        return await operation();
      });

      stats.committed = true;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.info('Transaction committed', {
        transactionId,
        duration: stats.duration,
        operations: stats.operations,
      });

      return new Ok(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      stats.error = err;
      stats.endTime = new Date();
      stats.duration = stats.endTime.getTime() - stats.startTime.getTime();

      logger.error('Transaction failed', err, {
        transactionId,
        duration: stats.duration,
      });

      if (options.retryOnDeadlock && this.isDeadlock(err) && (options.maxRetries ?? 3) > 0) {
        logger.warn('Retrying transaction after deadlock', { transactionId });
        return this.executeTransaction(operation, {
          ...options,
          maxRetries: (options.maxRetries ?? 3) - 1,
        });
      }

      return new Err(err);
    }
  }

  async batch<T>(operations: Array<() => Promise<T>>): Promise<Result<T[]>> {
    return this.executeTransaction(async () => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation();
        results.push(result);
      }

      return results;
    });
  }

  async parallel<T>(operations: Array<() => Promise<T>>): Promise<Result<T[]>> {
    return this.executeTransaction(async () => {
      return await Promise.all(operations.map((op) => op()));
    });
  }

  async savepoint<T>(name: string, operation: () => Promise<T>): Promise<Result<T>> {
    try {
      await this.db.run(`SAVEPOINT ${name}`);

      const result = await operation();

      await this.db.run(`RELEASE SAVEPOINT ${name}`);

      return new Ok(result);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      try {
        await this.db.run(`ROLLBACK TO SAVEPOINT ${name}`);
      } catch (rollbackError) {
        logger.error(
          'Failed to rollback savepoint',
          rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError))
        );
      }

      return new Err(err);
    }
  }

  getStats(transactionId: string): TransactionStats | undefined {
    return this.stats.get(transactionId);
  }

  clearStats(): void {
    this.stats.clear();
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async withTimeout<T>(operation: () => Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Transaction timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private isDeadlock(error: Error): boolean {
    return error.message.includes('deadlock') || error.message.includes('database is locked');
  }
}

export class TransactionPatterns {
  constructor(private manager: TransactionManager) {}

  async createWithRelated<T, R>(
    mainCreate: () => Promise<T>,
    relatedCreates: Array<(mainId: T) => Promise<R>>
  ): Promise<Result<{ main: T; related: R[] }>> {
    return this.manager.executeTransaction(async () => {
      const main = await mainCreate();
      const related: R[] = [];

      for (const createRelated of relatedCreates) {
        const rel = await createRelated(main);
        related.push(rel);
      }

      return { main, related };
    });
  }

  async updateWithCascade<T>(updates: Array<() => Promise<T>>): Promise<Result<T[]>> {
    return this.manager.batch(updates);
  }

  async deleteWithCascade(
    mainDelete: () => Promise<void>,
    cascadeDeletes: Array<() => Promise<void>>
  ): Promise<Result<void>> {
    return this.manager.executeTransaction(async () => {
      for (const deleteRelated of cascadeDeletes) {
        await deleteRelated();
      }

      await mainDelete();
    });
  }
}
