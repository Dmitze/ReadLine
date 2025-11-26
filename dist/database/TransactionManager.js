"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionPatterns = exports.TransactionManager = exports.IsolationLevel = void 0;
const logger_1 = require("../utils/logger");
const Result_1 = require("../core/Result");
var IsolationLevel;
(function (IsolationLevel) {
    IsolationLevel["READ_UNCOMMITTED"] = "READ UNCOMMITTED";
    IsolationLevel["READ_COMMITTED"] = "READ COMMITTED";
    IsolationLevel["REPEATABLE_READ"] = "REPEATABLE READ";
    IsolationLevel["SERIALIZABLE"] = "SERIALIZABLE";
})(IsolationLevel || (exports.IsolationLevel = IsolationLevel = {}));
class TransactionManager {
    constructor(db) {
        this.db = db;
        this.stats = new Map();
    }
    async executeTransaction(operation, options = {}) {
        const transactionId = this.generateTransactionId();
        const stats = {
            startTime: new Date(),
            operations: 0,
            committed: false,
        };
        this.stats.set(transactionId, stats);
        try {
            const result = await this.db.transaction(async () => {
                if (options.isolationLevel) {
                    await this.db.run(`PRAGMA read_uncommitted = ${options.isolationLevel === IsolationLevel.READ_UNCOMMITTED ? 1 : 0}`);
                }
                if (options.timeout) {
                    return await this.withTimeout(operation, options.timeout);
                }
                return await operation();
            });
            stats.committed = true;
            stats.endTime = new Date();
            stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
            logger_1.logger.info('Transaction committed', {
                transactionId,
                duration: stats.duration,
                operations: stats.operations,
            });
            return new Result_1.Ok(result);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            stats.error = err;
            stats.endTime = new Date();
            stats.duration = stats.endTime.getTime() - stats.startTime.getTime();
            logger_1.logger.error('Transaction failed', err, {
                transactionId,
                duration: stats.duration,
            });
            if (options.retryOnDeadlock && this.isDeadlock(err) && (options.maxRetries ?? 3) > 0) {
                logger_1.logger.warn('Retrying transaction after deadlock', { transactionId });
                return this.executeTransaction(operation, {
                    ...options,
                    maxRetries: (options.maxRetries ?? 3) - 1,
                });
            }
            return new Result_1.Err(err);
        }
    }
    async batch(operations) {
        return this.executeTransaction(async () => {
            const results = [];
            for (const operation of operations) {
                const result = await operation();
                results.push(result);
            }
            return results;
        });
    }
    async parallel(operations) {
        return this.executeTransaction(async () => {
            return await Promise.all(operations.map((op) => op()));
        });
    }
    async savepoint(name, operation) {
        try {
            await this.db.run(`SAVEPOINT ${name}`);
            const result = await operation();
            await this.db.run(`RELEASE SAVEPOINT ${name}`);
            return new Result_1.Ok(result);
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            try {
                await this.db.run(`ROLLBACK TO SAVEPOINT ${name}`);
            }
            catch (rollbackError) {
                logger_1.logger.error('Failed to rollback savepoint', rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError)));
            }
            return new Result_1.Err(err);
        }
    }
    getStats(transactionId) {
        return this.stats.get(transactionId);
    }
    clearStats() {
        this.stats.clear();
    }
    generateTransactionId() {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async withTimeout(operation, timeout) {
        return Promise.race([
            operation(),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Transaction timeout after ${timeout}ms`)), timeout)),
        ]);
    }
    isDeadlock(error) {
        return error.message.includes('deadlock') || error.message.includes('database is locked');
    }
}
exports.TransactionManager = TransactionManager;
class TransactionPatterns {
    constructor(manager) {
        this.manager = manager;
    }
    async createWithRelated(mainCreate, relatedCreates) {
        return this.manager.executeTransaction(async () => {
            const main = await mainCreate();
            const related = [];
            for (const createRelated of relatedCreates) {
                const rel = await createRelated(main);
                related.push(rel);
            }
            return { main, related };
        });
    }
    async updateWithCascade(updates) {
        return this.manager.batch(updates);
    }
    async deleteWithCascade(mainDelete, cascadeDeletes) {
        return this.manager.executeTransaction(async () => {
            for (const deleteRelated of cascadeDeletes) {
                await deleteRelated();
            }
            await mainDelete();
        });
    }
}
exports.TransactionPatterns = TransactionPatterns;
//# sourceMappingURL=TransactionManager.js.map