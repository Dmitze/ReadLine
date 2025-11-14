/**
 * Base Repository Class
 * REFACTOR-002: Repository Layer Separation
 * 
 * Provides common database operations for all repositories
 */

import { DatabaseWrapper } from '../database/dbWrapper';
import { logger } from '../utils/logger';

/**
 * Base repository with common CRUD operations
 */
export abstract class BaseRepository<T extends { id?: number }> {
  protected tableName: string;

  constructor(
    protected db: DatabaseWrapper,
    tableName: string
  ) {
    this.tableName = tableName;
  }

  /**
   * Get entity by ID
   */
  async getById(id: number): Promise<T | undefined> {
    try {
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
      return await this.db.get<T>(query, [id]);
    } catch (error) {
      logger.error(`Error getting ${this.tableName} by id`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get all entities
   */
  async getAll(limit?: number, offset?: number): Promise<T[]> {
    try {
      let query = `SELECT * FROM ${this.tableName}`;
      const params: any[] = [];

      if (limit !== undefined && offset !== undefined) {
        query += ` LIMIT ? OFFSET ?`;
        params.push(limit, offset);
      }

      return await this.db.all<T>(query, params);
    } catch (error) {
      logger.error(`Error getting all ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Count total entities
   */
  async count(where?: string | Record<string, any>, params?: any[]): Promise<number> {
    try {
      if (typeof where === 'object' && where !== null) {
        // If where is an object, convert to WHERE clause
        const whereClauses = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const values = Object.values(where);
        const whereString = whereClauses.length > 0 ? whereClauses : undefined;
        return await this.db.count(this.tableName, whereString, values.length > 0 ? values : undefined);
      }
      const whereString = typeof where === 'string' ? where : undefined;
      return await this.db.count(this.tableName, whereString, params);
    } catch (error) {
      logger.error(`Error counting ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`;
      return await this.db.exists(query, [id]);
    } catch (error) {
      logger.error(`Error checking ${this.tableName} existence`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Delete entity
   */
  async delete(id: number): Promise<number> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
      return await this.db.delete(query, [id]);
    } catch (error) {
      logger.error(`Error deleting from ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute a custom query
   */
  async query<R>(query: string, params?: any[]): Promise<R[]> {
    try {
      return await this.db.all<R>(query, params);
    } catch (error) {
      logger.error(`Error executing query on ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Insert a new entity
   */
  async insert(data: Omit<T, 'id'>): Promise<number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
      return await this.db.insert(query, values);
    } catch (error) {
      logger.error(`Error inserting into ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update an entity
   */
  async update(id: number, data: Partial<Omit<T, 'id'>>): Promise<number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      values.push(id);
      const setClause = keys.map(key => `${key} = ?`).join(', ');
      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
      return await this.db.update(query, values);
    } catch (error) {
      logger.error(`Error updating ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<R>(callback: () => Promise<R>): Promise<R> {
    try {
      return await this.db.transaction(callback);
    } catch (error) {
      logger.error(`Error in transaction on ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
