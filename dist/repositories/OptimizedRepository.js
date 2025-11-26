"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedRepository = void 0;
const QueryOptimizer_1 = require("../database/QueryOptimizer");
const logger_1 = require("../utils/logger");
class OptimizedRepository {
    constructor(db, tableName, optimizer) {
        this.db = db;
        this.tableName = tableName;
        this.queryOptimizer = optimizer || new QueryOptimizer_1.QueryOptimizer(db);
    }
    async getById(id, cacheTtl = 600000) {
        try {
            const cacheKey = `${this.tableName}:id:${id}`;
            const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
            return await this.queryOptimizer.getOptimized(query, [id], cacheKey, cacheTtl);
        }
        catch (error) {
            logger_1.logger.error(`Error getting ${this.tableName} by id`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getByIds(ids, cacheKey) {
        try {
            if (ids.length === 0)
                return [];
            const placeholders = ids.map(() => '?').join(',');
            const query = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;
            const key = cacheKey || `${this.tableName}:ids:${ids.join(',')}`;
            return await this.queryOptimizer.executeOptimized(query, ids, key, 300000);
        }
        catch (error) {
            logger_1.logger.error('Error getting multiple entities by ids', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getPaginated(params) {
        try {
            const cacheKey = params.cacheKey || `${this.tableName}:paginated:${params.limit}:${params.offset}`;
            const cacheTtl = params.cacheTtl || 300000;
            const [data, total] = await Promise.all([
                this.queryOptimizer.executeOptimized(`SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT ? OFFSET ?`, [params.limit, params.offset], `${cacheKey}:data`, cacheTtl),
                this.queryOptimizer.getOptimized(`SELECT COUNT(*) as count FROM ${this.tableName}`, [], `${cacheKey}:count`, cacheTtl),
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
        }
        catch (error) {
            logger_1.logger.error('Error getting paginated results', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getFiltered(options) {
        try {
            const whereClauses = [];
            const params = [];
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
            return await this.queryOptimizer.executeOptimized(query, params, cacheKey, cacheTtl);
        }
        catch (error) {
            logger_1.logger.error('Error getting filtered results', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async exists(id) {
        try {
            const cacheKey = `${this.tableName}:exists:${id}`;
            const result = await this.queryOptimizer.getOptimized(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`, [id], cacheKey, 300000);
            return (result?.count || 0) > 0;
        }
        catch (error) {
            logger_1.logger.error('Error checking entity existence', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async count(where) {
        try {
            const whereClauses = [];
            const params = [];
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
            const result = await this.queryOptimizer.getOptimized(query, params, cacheKey, 300000);
            return result?.count || 0;
        }
        catch (error) {
            logger_1.logger.error('Error counting entities', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async batchInsert(rows) {
        try {
            if (rows.length === 0)
                return [];
            this.queryOptimizer.invalidateTableCache(this.tableName);
            return await this.queryOptimizer.batchInsert(this.tableName, rows, 500);
        }
        catch (error) {
            logger_1.logger.error('Error in batch insert', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async batchUpdate(rows) {
        try {
            if (rows.length === 0)
                return 0;
            this.queryOptimizer.invalidateTableCache(this.tableName);
            return await this.queryOptimizer.batchUpdate(this.tableName, rows, 500);
        }
        catch (error) {
            logger_1.logger.error('Error in batch update', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async insert(data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
            this.queryOptimizer.invalidateTableCache(this.tableName);
            return await this.db.insert(query, values);
        }
        catch (error) {
            logger_1.logger.error('Error inserting entity', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async update(id, data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            values.push(id);
            const setClause = keys.map((key) => `${key} = ?`).join(', ');
            const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
            this.queryOptimizer.invalidateTableCache(`${this.tableName}:id:${id}`);
            this.queryOptimizer.invalidateTableCache(this.tableName);
            return await this.db.update(query, values);
        }
        catch (error) {
            logger_1.logger.error('Error updating entity', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
            this.queryOptimizer.invalidateTableCache(`${this.tableName}:id:${id}`);
            this.queryOptimizer.invalidateTableCache(this.tableName);
            return await this.db.delete(query, [id]);
        }
        catch (error) {
            logger_1.logger.error('Error deleting entity', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async transaction(callback) {
        try {
            const result = await this.db.transaction(callback);
            this.queryOptimizer.invalidateTableCache(this.tableName);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error in transaction', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}
exports.OptimizedRepository = OptimizedRepository;
//# sourceMappingURL=OptimizedRepository.js.map