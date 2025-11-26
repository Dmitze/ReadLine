import { DatabaseWrapper } from './dbWrapper';
import { MultiLayerCache } from '../cache/MultiLayerCache';
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
export declare class QueryOptimizer {
    private db;
    private metrics;
    private indexCache;
    private queryCache;
    private readonly maxMetrics;
    private readonly slowQueryThreshold;
    constructor(db: DatabaseWrapper, cache?: MultiLayerCache);
    executeOptimized<T>(query: string, params?: any[], cacheKey?: string, cacheTtl?: number): Promise<T[]>;
    getOptimized<T>(query: string, params?: any[], cacheKey?: string, cacheTtl?: number): Promise<T | undefined>;
    batchInsert<T extends Record<string, any>>(tableName: string, rows: T[], batchSize?: number): Promise<number[]>;
    batchUpdate<T extends Record<string, any>>(tableName: string, updates: Array<T & {
        id: number;
    }>, batchSize?: number): Promise<number>;
    createIndex(definition: IndexDefinition): Promise<boolean>;
    getIndexes(tableName: string): Promise<IndexDefinition[]>;
    analyzeTable(tableName: string): Promise<{
        tableName: string;
        rowCount: number;
        suggestions: string[];
    }>;
    getQueryPlan(query: string): Promise<QueryPlan>;
    private recordMetric;
    getMetrics(limit?: number): QueryMetrics[];
    getSlowQueries(threshold?: number, limit?: number): QueryMetrics[];
    getMostFrequentQueries(limit?: number): Array<{
        query: string;
        count: number;
        avgTime: number;
    }>;
    clearMetrics(): void;
    invalidateTableCache(tableName: string): void;
    private sanitizeQuery;
}
//# sourceMappingURL=QueryOptimizer.d.ts.map