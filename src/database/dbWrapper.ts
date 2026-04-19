import { Database as SqliteDatabase } from 'sqlite3';
import { logger } from '../utils/logger';
import { safeParseInt } from '../utils/helpers';

export type { SqliteDatabase as Database };

export type SQLParameter = string | number | boolean | null | undefined;
export type SQLParameters = SQLParameter[];

export class DatabaseWrapper {
  constructor(private db: SqliteDatabase) {}

  async get<T>(query: string, params: SQLParameters = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row: T) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all<T>(query: string, params: SQLParameters = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

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

  async insert(query: string, params: SQLParameters = []): Promise<number> {
    const result = await this.run(query, params);
    return result.lastID;
  }

  async update(query: string, params: SQLParameters = []): Promise<number> {
    const result = await this.run(query, params);
    return result.changes;
  }

  async delete(query: string, params: SQLParameters = []): Promise<number> {
    const result = await this.run(query, params);
    return result.changes;
  }

  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    try {
      await this.run('BEGIN TRANSACTION');

      const result = await callback();

      await this.run('COMMIT');

      return result;
    } catch (error) {
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

  async exists(query: string, params: SQLParameters = []): Promise<boolean> {
    const result = await this.get<{ count: number }>(query, params);
    return result ? result.count > 0 : false;
  }

  async count(table: string, where?: string, params: SQLParameters = []): Promise<number> {
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
