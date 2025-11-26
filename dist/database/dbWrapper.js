"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseWrapper = void 0;
const logger_1 = require("../utils/logger");
class DatabaseWrapper {
    constructor(db) {
        this.db = db;
    }
    async get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    async all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        });
    }
    async run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (err) {
                if (err)
                    reject(err);
                else
                    resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
    async insert(query, params = []) {
        const result = await this.run(query, params);
        return result.lastID;
    }
    async update(query, params = []) {
        const result = await this.run(query, params);
        return result.changes;
    }
    async delete(query, params = []) {
        const result = await this.run(query, params);
        return result.changes;
    }
    async transaction(callback) {
        try {
            await this.run('BEGIN TRANSACTION');
            const result = await callback();
            await this.run('COMMIT');
            return result;
        }
        catch (error) {
            try {
                await this.run('ROLLBACK');
            }
            catch (rollbackError) {
                logger_1.logger.error('Failed to rollback transaction', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)));
            }
            throw error;
        }
    }
    async exists(query, params = []) {
        const result = await this.get(query, params);
        return result ? result.count > 0 : false;
    }
    async count(table, where, params = []) {
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            throw new Error(`Invalid table name: ${table}`);
        }
        const query = where
            ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
            : `SELECT COUNT(*) as count FROM ${table}`;
        const result = await this.get(query, params);
        return result?.count || 0;
    }
}
exports.DatabaseWrapper = DatabaseWrapper;
//# sourceMappingURL=dbWrapper.js.map