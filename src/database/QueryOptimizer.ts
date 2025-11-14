/**
 * Query Optimizer
 * REFACTOR-012: Database Query Optimization
 *
 * Optimizes database queries, analyzes performance, manages indexes and caching
 */

import { DatabaseWrapper } from './dbWrapper';
import { MultiLayerCache } from '../cache/MultiLayerCache';
import { logger } from '../utils/logger';

export interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: number;
}

export interface IndexDefinition {
  tableName: string;
  columns: string[];
  unique?: boolean;
  name?: string;
}

export interface QueryPlan {
  query: string;
  estimates: {
    rowsReturned?: number;
    executionTime?: number;
    fullTableScan?: boolean;
  };
}

/**
 * Query Optimizer for performance monitoring and optimization
 */
export class QueryOptimizer {
  private metrics: QueryMetrics[] = [];
  private indexCache: Map<string, IndexDefinition[]> = new Map();
  private queryCache: MultiLayerCache;
  private readonly maxMetrics = 10000;
  private readonly slowQueryThreshold = 100; // ms

  constructor(
    private db: DatabaseWrapper,
    cache?: MultiLayerCache
  ) {
    this.queryCache = cache || new MultiLayerCache();
  }

  /**
   * Execute query with optimization and caching
   */
  async executeOptimized<T>(
    query: string,
    params: any[] = [],
    cacheKey?: string,
    cacheTtl: number = 300000 // 5 minutes
  ): Promise<T[]> {
    try {
      // Check cache first
      if (cacheKey) {
        const cached = this.queryCache.get<T[]>(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for query: ${cacheKey}`);
          return cached;
        }
      }

      // Execute query with metrics
      const startTime = Date.now();
      const result = await this.db.all<T>(query, params);
      const executionTime = Date.now() - startTime;

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn(`Slow query detected (${executionTime}ms): ${this.sanitizeQuery(query)}`);
      }

      // Record metrics
      this.recordMetric(query, executionTime, result.length);

      // Cache result if key provided
      if (cacheKey) {
        this.queryCache.set(cacheKey, result, cacheTtl);
      }

      return result;
    } catch (error) {
      logger.error('Error executing optimized query', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Execute single row query with optimization
   */
  async getOptimized<T>(
    query: string,
    params: any[] = [],
    cacheKey?: string,
    cacheTtl: number = 300000
  ): Promise<T | undefined> {
    try {
      // Check cache first
      if (cacheKey) {
        const cached = this.queryCache.get<T>(cacheKey);
        if (cached) {
          logger.debug(`Cache hit for single query: ${cacheKey}`);
          return cached;
        }
      }

      // Execute query
      const startTime = Date.now();
      const result = await this.db.get<T>(query, params);
      const executionTime = Date.now() - startTime;

      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        logger.warn(`Slow single query (${executionTime}ms): ${this.sanitizeQuery(query)}`);
      }

      // Record metrics
      this.recordMetric(query, executionTime, result ? 1 : 0);

      // Cache result
      if (cacheKey && result) {
        this.queryCache.set(cacheKey, result, cacheTtl);
      }

      return result;
    } catch (error) {
      logger.error('Error executing optimized get query', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Batch insert with optimization
   */
  async batchInsert<T extends Record<string, any>>(
    tableName: string,
    rows: T[],
    batchSize: number = 500
  ): Promise<number[]> {
    try {
      const results: number[] = [];

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        for (const row of batch) {
          const keys = Object.keys(row);
          const values = Object.values(row);
          const placeholders = keys.map(() => '?').join(', ');
          const query = `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`;

          const id = await this.db.insert(query, values);
          results.push(id);
        }
      }

      logger.info(`Batch inserted ${results.length} rows into ${tableName}`);
      return results;
    } catch (error) {
      logger.error('Error in batch insert', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Batch update with optimization
   */
  async batchUpdate<T extends Record<string, any>>(
    tableName: string,
    updates: Array<T & { id: number }>,
    batchSize: number = 500
  ): Promise<number> {
    try {
      let totalChanges = 0;

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        for (const row of batch) {
          const { id, ...data } = row;
          const keys = Object.keys(data);
          const values = Object.values(data);
          values.push(id);

          const setClause = keys.map((key) => `${key} = ?`).join(', ');
          const query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;

          const changes = await this.db.update(query, values);
          totalChanges += changes;
        }
      }

      logger.info(`Batch updated ${totalChanges} rows in ${tableName}`);
      return totalChanges;
    } catch (error) {
      logger.error('Error in batch update', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Create index for faster queries
   */
  async createIndex(definition: IndexDefinition): Promise<boolean> {
    try {
      const indexName = definition.name || `idx_${definition.tableName}_${definition.columns.join('_')}`;
      const columnList = definition.columns.join(', ');
      const uniqueKeyword = definition.unique ? 'UNIQUE' : '';

      const query = `CREATE ${uniqueKeyword} INDEX IF NOT EXISTS ${indexName} ON ${definition.tableName} (${columnList})`;

      await this.db.run(query, []);

      // Invalidate cache
      this.indexCache.delete(definition.tableName);

      logger.info(`Index created: ${indexName} on ${definition.tableName}`);
      return true;
    } catch (error) {
      logger.error('Error creating index', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }

  /**
   * Get existing indexes for table
   */
  async getIndexes(tableName: string): Promise<IndexDefinition[]> {
    try {
      if (this.indexCache.has(tableName)) {
        return this.indexCache.get(tableName) || [];
      }

      const query = `PRAGMA index_list(${tableName})`;
      const indexes = await this.db.all<any>(query, []);

      const indexDefs: IndexDefinition[] = indexes.map((idx) => ({
        tableName,
        columns: [idx.name], // Simplified for SQLite
        unique: idx.unique === 1,
        name: idx.name,
      }));

      this.indexCache.set(tableName, indexDefs);
      return indexDefs;
    } catch (error) {
      logger.error('Error getting indexes', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Analyze table for optimization suggestions
   */
  async analyzeTable(tableName: string): Promise<{
    tableName: string;
    rowCount: number;
    suggestions: string[];
  }> {
    try {
      // Run ANALYZE
      await this.db.run(`ANALYZE ${tableName}`, []);

      // Get row count
      const countResult = await this.db.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${tableName}`,
        []
      );
      const rowCount = countResult?.count || 0;

      const suggestions: string[] = [];

      // Get indexes
      const indexes = await this.getIndexes(tableName);

      if (indexes.length === 0 && rowCount > 10000) {
        suggestions.push(`Consider creating indexes for frequent filter columns on ${tableName}`);
      }

      if (rowCount > 100000) {
        suggestions.push(`Consider partitioning ${tableName} or archiving old data`);
      }

      return {
        tableName,
        rowCount,
        suggestions,
      };
    } catch (error) {
      logger.error('Error analyzing table', error instanceof Error ? error : new Error(String(error)));
      return {
        tableName,
        rowCount: 0,
        suggestions: [],
      };
    }
  }

  /**
   * Get query execution plan
   */
  async getQueryPlan(query: string): Promise<QueryPlan> {
    try {
      const plan = await this.db.all<any>(`EXPLAIN QUERY PLAN ${query}`, []);

      return {
        query: this.sanitizeQuery(query),
        estimates: {
          fullTableScan: plan.some((row) => row.detail && row.detail.includes('SCAN TABLE')),
        },
      };
    } catch (error) {
      logger.error('Error getting query plan', error instanceof Error ? error : new Error(String(error)));
      return {
        query: this.sanitizeQuery(query),
        estimates: {},
      };
    }
  }

  /**
   * Record query metrics
   */
  private recordMetric(query: string, executionTime: number, rowsAffected: number): void {
    this.metrics.push({
      query: this.sanitizeQuery(query),
      executionTime,
      rowsAffected,
      timestamp: Date.now(),
    });

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(limit: number = 100): QueryMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get slow queries
   */
  getSlowQueries(threshold: number = 100, limit: number = 20): QueryMetrics[] {
    return this.metrics.filter((m) => m.executionTime > threshold).slice(-limit);
  }

  /**
   * Get most frequent queries
   */
  getMostFrequentQueries(limit: number = 10): Array<{ query: string; count: number; avgTime: number }> {
    const queryMap = new Map<string, { count: number; totalTime: number }>();

    for (const metric of this.metrics) {
      const existing = queryMap.get(metric.query);
      if (existing) {
        existing.count++;
        existing.totalTime += metric.executionTime;
      } else {
        queryMap.set(metric.query, { count: 1, totalTime: metric.executionTime });
      }
    }

    const sorted = Array.from(queryMap.entries())
      .map(([query, { count, totalTime }]) => ({
        query,
        count,
        avgTime: totalTime / count,
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, limit);
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    logger.info('Query metrics cleared');
  }

  /**
   * Invalidate cache for table
   */
  invalidateTableCache(tableName: string): void {
    this.queryCache.invalidateByPrefix(tableName);
    logger.debug(`Cache invalidated for table: ${tableName}`);
  }

  /**
   * Sanitize query for logging (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    return query
      .replace(/[?]/g, '*')
      .substring(0, 200); // Limit length
  }
}
