"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
const logger_1 = require("../utils/logger");
class BaseRepository {
    constructor(db, tableName) {
        this.db = db;
        this.tableName = tableName;
    }
    async getById(id) {
        try {
            const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
            return await this.db.get(query, [id]);
        }
        catch (error) {
            logger_1.logger.error(`Error getting ${this.tableName} by id`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async getAll(limit, offset) {
        try {
            let query = `SELECT * FROM ${this.tableName}`;
            const params = [];
            if (limit !== undefined && offset !== undefined) {
                query += ' LIMIT ? OFFSET ?';
                params.push(limit, offset);
            }
            return await this.db.all(query, params);
        }
        catch (error) {
            logger_1.logger.error(`Error getting all ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async count(where, params) {
        try {
            if (typeof where === 'object' && where !== null) {
                const whereClauses = Object.keys(where)
                    .map((key) => `${key} = ?`)
                    .join(' AND ');
                const values = Object.values(where);
                const whereString = whereClauses.length > 0 ? whereClauses : undefined;
                return await this.db.count(this.tableName, whereString, values.length > 0 ? values : undefined);
            }
            const whereString = typeof where === 'string' ? where : undefined;
            return await this.db.count(this.tableName, whereString, params);
        }
        catch (error) {
            logger_1.logger.error(`Error counting ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async exists(id) {
        try {
            const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE id = ?`;
            return await this.db.exists(query, [id]);
        }
        catch (error) {
            logger_1.logger.error(`Error checking ${this.tableName} existence`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async delete(id) {
        try {
            const query = `DELETE FROM ${this.tableName} WHERE id = ?`;
            return await this.db.delete(query, [id]);
        }
        catch (error) {
            logger_1.logger.error(`Error deleting from ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async query(query, params) {
        try {
            return await this.db.all(query, params);
        }
        catch (error) {
            logger_1.logger.error(`Error executing query on ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async insert(data) {
        try {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map(() => '?').join(', ');
            const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`;
            return await this.db.insert(query, values);
        }
        catch (error) {
            logger_1.logger.error(`Error inserting into ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
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
            return await this.db.update(query, values);
        }
        catch (error) {
            logger_1.logger.error(`Error updating ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async transaction(callback) {
        try {
            return await this.db.transaction(callback);
        }
        catch (error) {
            logger_1.logger.error(`Error in transaction on ${this.tableName}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
    async findById(id) {
        return this.getById(id);
    }
    async findAll(limit, offset) {
        return this.getAll(limit, offset);
    }
}
exports.BaseRepository = BaseRepository;
//# sourceMappingURL=BaseRepository.js.map