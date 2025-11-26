"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryOptimizer = void 0;
const MultiLayerCache_1 = require("../cache/MultiLayerCache");
const logger_1 = require("../utils/logger");
class QueryOptimizer {
    constructor(db, cache) {
        this.db = db;
        this.metrics = [];
        this.indexCache = new Map();
        this.maxMetrics = 10000;
        this.slowQueryThreshold = 100;
        this.queryCache = cache || new MultiLayerCache_1.MultiLayerCache();
    }
    async executeOptimized(query, params = [], cacheKey, cacheTtl = 300000) {
        try {
            if (cacheKey) {
                const cached = this.queryCache.get(cacheKey);
                if (cached) {
                    logger_1.logger.debug(`Cache hit for query: ${cacheKey}`);
                    return cached;
                }
            }
            const startTime = Date.now();
            const result = await this.db.all(query, params);
            const executionTime = Date.now() - startTime;
            if (executionTime > this.slowQueryThreshold) {
                logger_1.logger.warn(`Slow query detected (${executionTime}ms): ${this.sanitizeQuery(query)}`);
            }
            this.recordMetric(query, executionTime, result.length);
            if (cacheKey) {
                this.queryCache.set(cacheKey, result, cacheTtl);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error executing optimized query', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getOptimized(query, params = [], cacheKey, cacheTtl = 300000) {
        try {
            if (cacheKey) {
                const cached = this.queryCache.get(cacheKey);
                if (cached) {
                    logger_1.logger.debug(`Cache hit for single query: ${cacheKey}`);
                    return cached;
                }
            }
            const startTime = Date.now();
            const result = await this.db.get(query, params);
            const executionTime = Date.now() - startTime;
            if (executionTime > this.slowQueryThreshold) {
                logger_1.logger.warn(`Slow single query (${executionTime}ms): ${this.sanitizeQuery(query)}`);
            }
            this.recordMetric(query, executionTime, result ? 1 : 0);
            if (cacheKey && result) {
                this.queryCache.set(cacheKey, result, cacheTtl);
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error executing optimized get query', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async batchInsert(tableName, rows, batchSize = 500) {
        try {
            const results = [];
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
            logger_1.logger.info(`Batch inserted ${results.length} rows into ${tableName}`);
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error in batch insert', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async batchUpdate(tableName, updates, batchSize = 500) {
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
            logger_1.logger.info(`Batch updated ${totalChanges} rows in ${tableName}`);
            return totalChanges;
        }
        catch (error) {
            logger_1.logger.error('Error in batch update', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async createIndex(definition) {
        try {
            const indexName = definition.name || `idx_${definition.tableName}_${definition.columns.join('_')}`;
            const columnList = definition.columns.join(', ');
            const uniqueKeyword = definition.unique ? 'UNIQUE' : '';
            const query = `CREATE ${uniqueKeyword} INDEX IF NOT EXISTS ${indexName} ON ${definition.tableName} (${columnList})`;
            await this.db.run(query, []);
            this.indexCache.delete(definition.tableName);
            logger_1.logger.info(`Index created: ${indexName} on ${definition.tableName}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error creating index', error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }
    async getIndexes(tableName) {
        try {
            if (this.indexCache.has(tableName)) {
                return this.indexCache.get(tableName) || [];
            }
            const query = `PRAGMA index_list(${tableName})`;
            const indexes = await this.db.all(query, []);
            const indexDefs = indexes.map((idx) => ({
                tableName,
                columns: [idx.name],
                unique: idx.unique === 1,
                name: idx.name,
            }));
            this.indexCache.set(tableName, indexDefs);
            return indexDefs;
        }
        catch (error) {
            logger_1.logger.error('Error getting indexes', error instanceof Error ? error : new Error(String(error)));
            return [];
        }
    }
    async analyzeTable(tableName) {
        try {
            await this.db.run(`ANALYZE ${tableName}`, []);
            const countResult = await this.db.get(`SELECT COUNT(*) as count FROM ${tableName}`, []);
            const rowCount = countResult?.count || 0;
            const suggestions = [];
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
        }
        catch (error) {
            logger_1.logger.error('Error analyzing table', error instanceof Error ? error : new Error(String(error)));
            return {
                tableName,
                rowCount: 0,
                suggestions: [],
            };
        }
    }
    async getQueryPlan(query) {
        try {
            const plan = await this.db.all(`EXPLAIN QUERY PLAN ${query}`, []);
            return {
                query: this.sanitizeQuery(query),
                estimates: {
                    fullTableScan: plan.some((row) => row.detail && row.detail.includes('SCAN TABLE')),
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting query plan', error instanceof Error ? error : new Error(String(error)));
            return {
                query: this.sanitizeQuery(query),
                estimates: {},
            };
        }
    }
    recordMetric(query, executionTime, rowsAffected) {
        this.metrics.push({
            query: this.sanitizeQuery(query),
            executionTime,
            rowsAffected,
            timestamp: Date.now(),
        });
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }
    getMetrics(limit = 100) {
        return this.metrics.slice(-limit);
    }
    getSlowQueries(threshold = 100, limit = 20) {
        return this.metrics.filter((m) => m.executionTime > threshold).slice(-limit);
    }
    getMostFrequentQueries(limit = 10) {
        const queryMap = new Map();
        for (const metric of this.metrics) {
            const existing = queryMap.get(metric.query);
            if (existing) {
                existing.count++;
                existing.totalTime += metric.executionTime;
            }
            else {
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
    clearMetrics() {
        this.metrics = [];
        logger_1.logger.info('Query metrics cleared');
    }
    invalidateTableCache(tableName) {
        this.queryCache.invalidateByPrefix(tableName);
        logger_1.logger.debug(`Cache invalidated for table: ${tableName}`);
    }
    sanitizeQuery(query) {
        return query.replace(/[?]/g, '*').substring(0, 200);
    }
}
exports.QueryOptimizer = QueryOptimizer;
//# sourceMappingURL=QueryOptimizer.js.map