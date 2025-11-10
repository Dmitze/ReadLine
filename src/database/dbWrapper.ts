/**
 * Database Wrapper - Generic utilities для роботи з SQLite
 * Усуває дублювання коду з models.ts
 */

import { Database } from 'sqlite3';

export class DatabaseWrapper {
  constructor(private db: Database) {}

  /**
   * Виконати SELECT ONE запит
   */
  async get<T>(query: string, params: any[] = []): Promise<T | undefined> {
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
  async all<T>(query: string, params: any[] = []): Promise<T[]> {
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
  async run(query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
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
  async insert(query: string, params: any[] = []): Promise<number> {
    const result = await this.run(query, params);
    return result.lastID;
  }

  /**
   * Виконати запит і повернути кількість змінених рядків
   */
  async update(query: string, params: any[] = []): Promise<number> {
    const result = await this.run(query, params);
    return result.changes;
  }

  /**
   * Виконати запит і повернути кількість видалених рядків
   */
  async delete(query: string, params: any[] = []): Promise<number> {
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
  async exists(query: string, params: any[] = []): Promise<boolean> {
    const result = await this.get<{ count: number }>(query, params);
    return result ? result.count > 0 : false;
  }

  /**
   * Підрахувати кількість записів
   */
  async count(table: string, where?: string, params: any[] = []): Promise<number> {
    const query = where 
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;
    
    const result = await this.get<{ count: number }>(query, params);
    return result?.count || 0;
  }
}


