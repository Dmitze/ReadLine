/**
 * Optimized Repository
 * REFACTOR-012: Database Query Optimization
 *
 * Enhanced repository with query optimization, caching, and batch operations
 */

import { DatabaseWrapper, SQLParameters } from '../database/dbWrapper';
import { QueryOptimizer } from '../database/QueryOptimizer';
import { logger } from '../utils/logger';

export interface PaginationParams {
  limit: number;
  offset: number;
  cacheKey?: string;
  cacheTtl?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
}

export interface FilterOptions {
  where?: Record<string, any>;
  orderBy?: string;
  limit?: number;
  offset?: number;
  cacheKey?: string;
  cacheTtl?: number;
}

/**
 * Optimized base repository with advanced query features
 */
export abstract class OptimizedRepository<T extends { id?: number }> {
  protected tableName: string;
  protected queryOptimizer: QueryOptimizer;

  constructor(
    protected db: DatabaseWrapper,
    tableName: string,
    optimizer?: QueryOptimizer
  ) {
    this.tableName = tableName;
    this.queryOptimizer = optimizer || new QueryOptimizer(db);
  }

  /**
   * Get entity by ID with caching
   */
  async getById(id: number, cacheTtl: number = 600000): Promise<T | undefined> {
    try {
      const cacheKey = `${this.tableName}:id:${id}`;
      const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;

      return await this.queryOptimizer.getOptimized<T>(query, [id], cacheKey, cacheTtl);
    } catch (error) {
      logger.error(`Error getting ${this.tableName} by id`, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get multiple entities by IDs
   */
  async getByIds(ids: number[], cacheKey?: string): Promise<T[]> {
    try {
      if (ids.length === 0) return [];

      const placeholders = ids.map(() => '?').join(',');
      const query = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;

      const key = cacheKey || `${this.tableName}:ids:${ids.join(',')}`;
      return await this.queryOptimizer.executeOptimized<T>(query, ids, key, 300000);
    } catch (error) {
      logger.error('Error getting multiple entities by ids', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get paginated results with optimized count query
   */
  async getPaginated(params: PaginationParams): Promise<PaginatedResult<T>> {
    try {
      const cacheKey = params.cacheKey || `${this.tableName}:paginated:${params.limit}:${params.offset}`;
      const cacheTtl = params.cacheTtl || 300000;

      // Get count and data in parallel
      const [data, total] = await Promise.all([
        this.queryOptimizer.executeOptimized<T>(
          `SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT ? OFFSET ?`,
          [params.limit, params.offset],
          `${cacheKey}:data`,
          cacheTtl
        ),
        this.queryOptimizer.getOptimized<{ count: number }>(
          `SELECT COUNT(*) as count FROM ${this.tableName}`,
          [],
          `${cacheKey}:count`,
          cacheTtl
        ),
      ]);

      const totalCount = total?.count || 0;
      const page = Math.floor(params.offset / params.limit) + 1;
      const totalPages = Math.ceil(totalCount / params.limit);

      return {
        data,
        total: totalCount,
        limit: params.limit,
        offset: params.offset,
        page,
        totalPages,
      };
    } catch (error) {
      logger.error('Error getting paginated results', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get filtered results with optimization
   */
  async getFiltered(options: FilterOptions): Promise<T[]> {
    try {
      const whereClauses: string[] = [];
      const params: any[] = [];

      // Build WHERE clause
      if (options.where) {
        for (const [key, value] of Object.entries(options.where)) {
          whereClauses.push(`${key} = ?`);
          params.push(value);
        }
      }

      let query = `SELECT * FROM ${this.tableName}`;

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      if (options.orderBy) {
        query += ` ORDER BY ${options.orderBy}`;
      }

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const cacheKey = options.cacheKey || `${this.tableName}:filtered:${JSON.stringify(options.where)}`;
      const cacheTtl = options.cacheTtl || 300000;

      return await this.queryOptimizer.executeOptimized<T>(query, params, cacheKey, cacheTtl);
    } catch (error) {
      logger.error('Error getting filtered results', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Check if entity exists
   */
  async exists(id: number): Promise<boolean> {
    try {
      const cacheKey = `${this.tableName}:exists:${id}`;
      const result = await this.queryOptimizer.getOptimized<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`,
        [id],
        cacheKey,
        300000
      );

      return (result?.count || 0) > 0;
    } catch (error) {
      logger.error('Error checking entity existence', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Count entities
   */
  async count(where?: Record<string, any>): Promise<number> {
    try {
      const whereClauses: string[] = [];
      const params: any[] = [];

      if (where) {
        for (const [key, value] of Object.entries(where)) {
          whereClauses.push(`${key} = ?`);
          params.push(value);
        }
      }

      let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }

      const cacheKey = `${this.tableName}:count:${where ? JSON.stringify(where) : 'all'}`;
      const result = await this.queryOptimizer.getOptimized<{ count: number }>(query, params, cacheKey, 300000);

      return result?.count || 0;
    } catch (error) {
      logger.error('Error counting entities', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Batch insert with optimization
   */
  async batchInsert(rows: Omit<T, 'id'>[]): Promise<number[]> {
    try {
      if (rows.length === 0) return [];

      // Invalidate cache
      this.queryOptimizer.invalidateTableCache(this.tableName);

      return await this.queryOptimizer.batchInsert<Omit<T, 'id'>>(this.tableName, rows, 500);
    } catch (error) {
      logger.error('Error in batch insert', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Batch update with optimization
   */
  async batchUpdate(rows: Array<T & { id: number }>): Promise<number> {
    try {
      if (rows.length === 0) return 0;

      // Invalidate cache
      this.queryOptimizer.invalidateTableCache(this.tableName);

      return await this.queryOptimizer.batchUpdate<T & { id: number }>(this.tableName, rows, 500);
    } catch (error) {
      logger.error('Error in batch update', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Insert single entity
   */
  async insert(data: Omit<T, 'id'>): Promise<number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(', ');
      const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

      // Invalidate cache
      this.queryOptimizer.invalidateTableCache(this.tableName);

      return await this.db.insert(query, values as SQLParameters);
    } catch (error) {
      logger.error('Error inserting entity', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Update single entity
   */
  async update(id: number, data: Partial<Omit<T, 'id'>>): Promise<number> {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data) as SQLParameters;
      values.push(id);
      const setClause = keys.map((key) => `${key} = ?`).join(', ');
      const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;

      // Invalidate cache for this entity
      this.queryOptimizer.invalidateTableCache(`${this.tableName}:id:${id}`);
      this.queryOptimizer.invalidateTableCache(this.tableName);

      return await this.db.update(query, values);
    } catch (error) {
      logger.error('Error updating entity', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Delete entity
   */
  async delete(id: number): Promise<number> {
    try {
      const query = `DELETE FROM ${this.tableName} WHERE id = ?`;

      // Invalidate cache
      this.queryOptimizer.invalidateTableCache(`${this.tableName}:id:${id}`);
      this.queryOptimizer.invalidateTableCache(this.tableName);

      return await this.db.delete(query, [id]);
    } catch (error) {
      logger.error('Error deleting entity', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction<R>(callback: () => Promise<R>): Promise<R> {
    try {
      const result = await this.db.transaction(callback);

      // Invalidate cache after transaction
      this.queryOptimizer.invalidateTableCache(this.tableName);

      return result;
    } catch (error) {
      logger.error('Error in transaction', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }
}
