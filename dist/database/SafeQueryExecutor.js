"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeQueryExecutor = void 0;
const Result_1 = require("../core/Result");
const InputSanitizer_1 = require("../validation/InputSanitizer");
const logger_1 = require("../utils/logger");
class SafeQueryExecutor {
    constructor(db) {
        this.db = db;
        this.queryLogs = [];
        this.defaultTimeout = 30000;
        this.maxQueryLogs = 1000;
    }
    async executeSelect(query, parameters = [], options = {}) {
        try {
            if (options.checkInjection !== false) {
                for (const param of parameters) {
                    if (typeof param === 'string' && InputSanitizer_1.InputSanitizer.checkSqlInjection(param)) {
                        return new Result_1.Err(new Error('Potential SQL injection detected in parameters'));
                    }
                }
            }
            if (options.logQuery) {
                this.logQuery(query, parameters);
            }
            const startTime = Date.now();
            const rows = await this.executeWithTimeout(query, parameters, options.timeout || this.defaultTimeout);
            const duration = Date.now() - startTime;
            const rowCount = Array.isArray(rows) ? rows.length : 0;
            this.recordQueryLog(query, parameters, duration, rowCount);
            return new Result_1.Ok(rows);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.recordQueryLog(query, parameters, 0, 0, err);
            return new Result_1.Err(err);
        }
    }
    async executeInsert(query, parameters = [], options = {}) {
        try {
            if (options.checkInjection !== false) {
                this.validateParameters(parameters);
            }
            if (options.logQuery) {
                this.logQuery(query, parameters);
            }
            const startTime = Date.now();
            const result = (await this.executeWithTimeout(query, parameters, options.timeout || this.defaultTimeout));
            const duration = Date.now() - startTime;
            const changes = result?.changes || 0;
            this.recordQueryLog(query, parameters, duration, changes);
            return new Result_1.Ok({
                lastId: result?.lastID || 0,
                changes,
            });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.recordQueryLog(query, parameters, 0, 0, err);
            return new Result_1.Err(err);
        }
    }
    async executeUpdate(query, parameters = [], options = {}) {
        try {
            if (options.checkInjection !== false) {
                this.validateParameters(parameters);
            }
            if (options.logQuery) {
                this.logQuery(query, parameters);
            }
            const startTime = Date.now();
            const result = (await this.executeWithTimeout(query, parameters, options.timeout || this.defaultTimeout));
            const duration = Date.now() - startTime;
            const changes = result?.changes || 0;
            this.recordQueryLog(query, parameters, duration, changes);
            return new Result_1.Ok(changes);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.recordQueryLog(query, parameters, 0, 0, err);
            return new Result_1.Err(err);
        }
    }
    async executeDelete(query, parameters = [], options = {}) {
        return this.executeUpdate(query, parameters, options);
    }
    async executeTransaction(operations) {
        try {
            await this.execute('BEGIN TRANSACTION', []);
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                if (!result.ok) {
                    await this.execute('ROLLBACK', []);
                    return result;
                }
                results.push(result);
            }
            await this.execute('COMMIT', []);
            return new Result_1.Ok(results);
        }
        catch (error) {
            try {
                await this.execute('ROLLBACK', []);
            }
            catch (rollbackError) {
                logger_1.logger.warn('Failed to rollback transaction', {
                    error: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
                });
            }
            const err = error instanceof Error ? error : new Error(String(error));
            return new Result_1.Err(err);
        }
    }
    executeWithTimeout(query, parameters, timeout) {
        return Promise.race([
            this.execute(query, parameters),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Query execution timeout after ${timeout}ms`)), timeout)),
        ]);
    }
    execute(query, parameters) {
        return new Promise((resolve, reject) => {
            if (query.trim().toUpperCase().startsWith('SELECT')) {
                this.db.all(query, parameters, (err, rows) => {
                    if (err)
                        reject(err);
                    else
                        resolve(rows);
                });
            }
            else {
                this.db.run(query, parameters, function (err) {
                    if (err)
                        reject(err);
                    else
                        resolve({ lastID: this.lastID, changes: this.changes });
                });
            }
        });
    }
    validateParameters(parameters) {
        for (const param of parameters) {
            if (typeof param === 'string') {
                if (InputSanitizer_1.InputSanitizer.checkSqlInjection(param)) {
                    throw new Error('Potential SQL injection detected in parameters');
                }
            }
        }
    }
    logQuery(query, parameters) { }
    recordQueryLog(query, parameters, duration, rowsAffected, error) {
        const log = {
            query,
            parameters,
            executedAt: new Date(),
            duration,
            rowsAffected: error ? undefined : rowsAffected,
            error,
        };
        this.queryLogs.push(log);
        if (this.queryLogs.length > this.maxQueryLogs) {
            this.queryLogs = this.queryLogs.slice(-this.maxQueryLogs);
        }
        if (this.queryLogs.length > this.maxQueryLogs) {
            this.queryLogs.shift();
        }
    }
    getQueryLogs(limit = 100) {
        return this.queryLogs.slice(-limit);
    }
    clearLogs() {
        this.queryLogs = [];
    }
    getStats() {
        const totalQueries = this.queryLogs.length;
        const totalErrors = this.queryLogs.filter((log) => log.error).length;
        const totalDuration = this.queryLogs.reduce((sum, log) => sum + log.duration, 0);
        const sortedByDuration = [...this.queryLogs].sort((a, b) => b.duration - a.duration);
        return {
            totalQueries,
            totalErrors,
            totalDuration,
            averageDuration: totalQueries > 0 ? totalDuration / totalQueries : 0,
            slowestQuery: sortedByDuration[0],
        };
    }
}
exports.SafeQueryExecutor = SafeQueryExecutor;
//# sourceMappingURL=SafeQueryExecutor.js.map