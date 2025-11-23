/**
 * Database Wrapper - Generic utilities для роботи з SQLite
 * Усуває дублювання коду з models.ts
 */

import { Database as SqliteDatabase } from 'sqlite3';
import { logger } from '../utils/logger';
import { safeParseInt } from '../utils/helpers';

export type { SqliteDatabase as Database };

/**
 * SQL Parameter Types - type-safe replacements for 'any'
 */
export type SQLParameter = string | number | boolean | null | undefined;
export type SQLParameters = SQLParameter[];

export class DatabaseWrapper {
  constructor(private db: SqliteDatabase) {}

  /**
   * Виконати SELECT ONE запит
   */
  async get<T>(query: string, params: SQLParameters = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row: T) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Виконати SELECT ALL запит
   */
  async all<T>(query: string, params: SQLParameters = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /**
   * Виконати INSERT/UPDATE/DELETE запит
   * Повертає lastID для INSERT або changes для UPDATE/DELETE
   */
  async run(
    query: string,
    params: SQLParameters = []
  ): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  /**
   * Виконати запит і повернути тільки lastID
   */
  async insert(query: string, params: SQLParameters = []): Promise<number> {
    const result = await this.run(query, params);
    return result.lastID;
  }

  /**
   * Виконати запит і повернути кількість змінених рядків
   */
  async update(query: string, params: SQLParameters = []): Promise<number> {
    const result = await this.run(query, params);
    return result.changes;
  }

  /**
   * Виконати запит і повернути кількість видалених рядків
   */
  async delete(query: string, params: SQLParameters = []): Promise<number> {
    const result = await this.run(query, params);
    return result.changes;
  }

  /**
   * Виконати кілька запитів в транзакції
   * Fixed: proper async/await without Promise anti-pattern
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    try {
      // Begin transaction
      await this.run('BEGIN TRANSACTION');

      // Execute callback
      const result = await callback();

      // Commit on success
      await this.run('COMMIT');

      return result;
    } catch (error) {
      // Rollback on error
      try {
        await this.run('ROLLBACK');
      } catch (rollbackError) {
        logger.error(
          'Failed to rollback transaction',
          rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError))
        );
      }
      throw error;
    }
  }

  /**
   * Перевірити чи існує запис
   */
  async exists(query: string, params: SQLParameters = []): Promise<boolean> {
    const result = await this.get<{ count: number }>(query, params);
    return result ? result.count > 0 : false;
  }

  /**
   * Підрахувати кількість записів
   * NOTE: table and where parameters should be from trusted sources only
   * Consider using QueryBuilder for dynamic queries
   */
  async count(table: string, where?: string, params: SQLParameters = []): Promise<number> {
    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    const query = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;

    const result = await this.get<{ count: number }>(query, params);
    return result?.count || 0;
  }
}
