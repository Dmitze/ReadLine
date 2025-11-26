import { DatabaseWrapper } from './dbWrapper';
import { Result } from '../core/Result';
export declare enum IsolationLevel {
    READ_UNCOMMITTED = "READ UNCOMMITTED",
    READ_COMMITTED = "READ COMMITTED",
    REPEATABLE_READ = "REPEATABLE READ",
    SERIALIZABLE = "SERIALIZABLE"
}
export interface TransactionOptions {
    isolationLevel?: IsolationLevel;
    timeout?: number;
    retryOnDeadlock?: boolean;
    maxRetries?: number;
}
export interface TransactionStats {
    startTime: Date;
    endTime?: Date;
    duration?: number;
    operations: number;
    committed: boolean;
    error?: Error;
}
export declare class TransactionManager {
    private db;
    private stats;
    constructor(db: DatabaseWrapper);
    executeTransaction<T>(operation: () => Promise<T>, options?: TransactionOptions): Promise<Result<T>>;
    batch<T>(operations: Array<() => Promise<T>>): Promise<Result<T[]>>;
    parallel<T>(operations: Array<() => Promise<T>>): Promise<Result<T[]>>;
    savepoint<T>(name: string, operation: () => Promise<T>): Promise<Result<T>>;
    getStats(transactionId: string): TransactionStats | undefined;
    clearStats(): void;
    private generateTransactionId;
    private withTimeout;
    private isDeadlock;
}
export declare class TransactionPatterns {
    private manager;
    constructor(manager: TransactionManager);
    createWithRelated<T, R>(mainCreate: () => Promise<T>, relatedCreates: Array<(mainId: T) => Promise<R>>): Promise<Result<{
        main: T;
        related: R[];
    }>>;
    updateWithCascade<T>(updates: Array<() => Promise<T>>): Promise<Result<T[]>>;
    deleteWithCascade(mainDelete: () => Promise<void>, cascadeDeletes: Array<() => Promise<void>>): Promise<Result<void>>;
}
//# sourceMappingURL=TransactionManager.d.ts.map