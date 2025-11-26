import { Result } from '../core/Result';
import { SQLParameters } from './dbWrapper';
export interface QueryLog {
    query: string;
    parameters: SQLParameters;
    executedAt: Date;
    duration: number;
    error?: Error;
    rowsAffected?: number;
}
export interface ExecutionOptions {
    timeout?: number;
    logQuery?: boolean;
    checkInjection?: boolean;
    retryCount?: number;
}
export declare class SafeQueryExecutor {
    private db;
    private queryLogs;
    private defaultTimeout;
    private maxQueryLogs;
    constructor(db: {
        all: (query: string, params: SQLParameters, callback: (err: Error | null, rows: unknown[]) => void) => void;
        run: (query: string, params: SQLParameters, callback: (this: {
            lastID: number;
            changes: number;
        }, err: Error | null) => void) => void;
    });
    executeSelect<T>(query: string, parameters?: SQLParameters, options?: ExecutionOptions): Promise<Result<T[]>>;
    executeInsert(query: string, parameters?: SQLParameters, options?: ExecutionOptions): Promise<Result<{
        lastId: number;
        changes: number;
    }>>;
    executeUpdate(query: string, parameters?: SQLParameters, options?: ExecutionOptions): Promise<Result<number>>;
    executeDelete(query: string, parameters?: SQLParameters, options?: ExecutionOptions): Promise<Result<number>>;
    executeTransaction<T>(operations: Array<() => Promise<Result<any>>>): Promise<Result<T>>;
    private executeWithTimeout;
    private execute;
    private validateParameters;
    private logQuery;
    private recordQueryLog;
    getQueryLogs(limit?: number): QueryLog[];
    clearLogs(): void;
    getStats(): {
        totalQueries: number;
        totalErrors: number;
        totalDuration: number;
        averageDuration: number;
        slowestQuery?: QueryLog;
    };
}
//# sourceMappingURL=SafeQueryExecutor.d.ts.map