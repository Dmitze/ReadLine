import { Result, Ok, Err } from '../core/Result';
import { InputSanitizer } from '../validation/InputSanitizer';
import { logger } from '../utils/logger';

import { SQLParameters } from './dbWrapper';

export interface QueryLog {
  query: string;
  parameters: SQLParameters;
  executedAt: Date;
  duration: number;
  error?: Error;
  rowsAffected?: number;
}

export interface ExecutionOptions {
  timeout?: number;
  logQuery?: boolean;
  checkInjection?: boolean;
  retryCount?: number;
}

export class SafeQueryExecutor {
  private queryLogs: QueryLog[] = [];
  private defaultTimeout: number = 30000;
  private maxQueryLogs: number = 1000;

  constructor(
    private db: {
      all: (
        query: string,
        params: SQLParameters,
        callback: (err: Error | null, rows: unknown[]) => void
      ) => void;
      run: (
        query: string,
        params: SQLParameters,
        callback: (this: { lastID: number; changes: number }, err: Error | null) => void
      ) => void;
    }
  ) {}

  async executeSelect<T>(
    query: string,
    parameters: SQLParameters = [],
    options: ExecutionOptions = {}
  ): Promise<Result<T[]>> {
    try {
      if (options.checkInjection !== false) {
        for (const param of parameters) {
          if (typeof param === 'string' && InputSanitizer.checkSqlInjection(param)) {
            return new Err(new Error('Potential SQL injection detected in parameters'));
          }
        }
      }

      if (options.logQuery) {
        this.logQuery(query, parameters);
      }

      const startTime = Date.now();
      const rows = await this.executeWithTimeout(
        query,
        parameters,
        options.timeout || this.defaultTimeout
      );
      const duration = Date.now() - startTime;

      const rowCount = Array.isArray(rows) ? rows.length : 0;
      this.recordQueryLog(query, parameters, duration, rowCount);

      return new Ok(rows as T[]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordQueryLog(query, parameters, 0, 0, err);
      return new Err(err);
    }
  }

  async executeInsert(
    query: string,
    parameters: SQLParameters = [],
    options: ExecutionOptions = {}
  ): Promise<Result<{ lastId: number; changes: number }>> {
    try {
      if (options.checkInjection !== false) {
        this.validateParameters(parameters);
      }

      if (options.logQuery) {
        this.logQuery(query, parameters);
      }

      const startTime = Date.now();
      const result = (await this.executeWithTimeout(
        query,
        parameters,
        options.timeout || this.defaultTimeout
      )) as { lastID?: number; changes?: number } | undefined;
      const duration = Date.now() - startTime;

      const changes = result?.changes || 0;
      this.recordQueryLog(query, parameters, duration, changes);

      return new Ok({
        lastId: result?.lastID || 0,
        changes,
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordQueryLog(query, parameters, 0, 0, err);
      return new Err(err);
    }
  }

  async executeUpdate(
    query: string,
    parameters: SQLParameters = [],
    options: ExecutionOptions = {}
  ): Promise<Result<number>> {
    try {
      if (options.checkInjection !== false) {
        this.validateParameters(parameters);
      }

      if (options.logQuery) {
        this.logQuery(query, parameters);
      }

      const startTime = Date.now();
      const result = (await this.executeWithTimeout(
        query,
        parameters,
        options.timeout || this.defaultTimeout
      )) as { changes?: number } | undefined;
      const duration = Date.now() - startTime;

      const changes = result?.changes || 0;
      this.recordQueryLog(query, parameters, duration, changes);

      return new Ok(changes);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.recordQueryLog(query, parameters, 0, 0, err);
      return new Err(err);
    }
  }

  async executeDelete(
    query: string,
    parameters: SQLParameters = [],
    options: ExecutionOptions = {}
  ): Promise<Result<number>> {
    return this.executeUpdate(query, parameters, options);
  }

  async executeTransaction<T>(operations: Array<() => Promise<Result<any>>>): Promise<Result<T>> {
    try {
      await this.execute('BEGIN TRANSACTION', []);

      const results: any[] = [];

      for (const operation of operations) {
        const result = await operation();
        if (!result.ok) {
          await this.execute('ROLLBACK', []);
          return result as any;
        }
        results.push(result);
      }

      await this.execute('COMMIT', []);

      return new Ok(results as T);
    } catch (error) {
      try {
        await this.execute('ROLLBACK', []);
      } catch (rollbackError) {
        logger.warn('Failed to rollback transaction', {
          error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
        });
      }

      const err = error instanceof Error ? error : new Error(String(error));
      return new Err(err);
    }
  }

  private executeWithTimeout(
    query: string,
    parameters: SQLParameters,
    timeout: number
  ): Promise<unknown> {
    return Promise.race([
      this.execute(query, parameters),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Query execution timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private execute(query: string, parameters: SQLParameters): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (query.trim().toUpperCase().startsWith('SELECT')) {
        this.db.all(query, parameters, (err: Error | null, rows: unknown[]) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.db.run(
          query,
          parameters,
          function (this: { lastID: number; changes: number }, err: Error | null) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
          }
        );
      }
    });
  }

  private validateParameters(parameters: SQLParameters): void {
    for (const param of parameters) {
      if (typeof param === 'string') {
        if (InputSanitizer.checkSqlInjection(param)) {
          throw new Error('Potential SQL injection detected in parameters');
        }
      }
    }
  }

  private logQuery(query: string, parameters: SQLParameters): void {}

  private recordQueryLog(
    query: string,
    parameters: SQLParameters,
    duration: number,
    rowsAffected: number,
    error?: Error
  ): void {
    const log: QueryLog = {
      query,
      parameters,
      executedAt: new Date(),
      duration,
      rowsAffected: error ? undefined : rowsAffected,
      error,
    };

    this.queryLogs.push(log);

    if (this.queryLogs.length > this.maxQueryLogs) {
      this.queryLogs = this.queryLogs.slice(-this.maxQueryLogs);
    }

    if (this.queryLogs.length > this.maxQueryLogs) {
      this.queryLogs.shift();
    }
  }

  getQueryLogs(limit: number = 100): QueryLog[] {
    return this.queryLogs.slice(-limit);
  }

  clearLogs(): void {
    this.queryLogs = [];
  }

  getStats(): {
    totalQueries: number;
    totalErrors: number;
    totalDuration: number;
    averageDuration: number;
    slowestQuery?: QueryLog;
  } {
    const totalQueries = this.queryLogs.length;
    const totalErrors = this.queryLogs.filter((log) => log.error).length;
    const totalDuration = this.queryLogs.reduce((sum, log) => sum + log.duration, 0);

    const sortedByDuration = [...this.queryLogs].sort((a, b) => b.duration - a.duration);

    return {
      totalQueries,
      totalErrors,
      totalDuration,
      averageDuration: totalQueries > 0 ? totalDuration / totalQueries : 0,
      slowestQuery: sortedByDuration[0],
    };
  }
}
