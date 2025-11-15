/**
 * Database Wrapper - Generic utilities для роботи з SQLite
 * Усуває дублювання коду з models.ts
 */

import { Database as SqliteDatabase } from 'sqlite3';

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
  async run(query: string, params: SQLParameters = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
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
   */
  async transaction<T>(callback: () => Promise<T>): Promise<T> {
    return new Promise(async (resolve, reject) => {
      this.db.run('BEGIN TRANSACTION', async (err) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          const result = await callback();
          this.db.run('COMMIT', (err) => {
            if (err) reject(err);
            else resolve(result);
          });
        } catch (error) {
          this.db.run('ROLLBACK', () => {
            reject(error);
          });
        }
      });
    });
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
   */
  async count(table: string, where?: string, params: SQLParameters = []): Promise<number> {
    const query = where 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    
    const result = await this.get<{ count: number }>(query, params);
    return result?.count || 0;
  }
}


