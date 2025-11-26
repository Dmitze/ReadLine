import { DatabaseWrapper } from '../database/dbWrapper';
import { QueryOptimizer } from '../database/QueryOptimizer';
export interface PaginationParams {
    limit: number;
    offset: number;
    cacheKey?: string;
    cacheTtl?: number;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
    page: number;
    totalPages: number;
}
export interface FilterOptions {
    where?: Record<string, any>;
    orderBy?: string;
    limit?: number;
    offset?: number;
    cacheKey?: string;
    cacheTtl?: number;
}
export declare abstract class OptimizedRepository<T extends {
    id?: number;
}> {
    protected db: DatabaseWrapper;
    protected tableName: string;
    protected queryOptimizer: QueryOptimizer;
    constructor(db: DatabaseWrapper, tableName: string, optimizer?: QueryOptimizer);
    getById(id: number, cacheTtl?: number): Promise<T | undefined>;
    getByIds(ids: number[], cacheKey?: string): Promise<T[]>;
    getPaginated(params: PaginationParams): Promise<PaginatedResult<T>>;
    getFiltered(options: FilterOptions): Promise<T[]>;
    exists(id: number): Promise<boolean>;
    count(where?: Record<string, any>): Promise<number>;
    batchInsert(rows: Omit<T, 'id'>[]): Promise<number[]>;
    batchUpdate(rows: Array<T & {
        id: number;
    }>): Promise<number>;
    insert(data: Omit<T, 'id'>): Promise<number>;
    update(id: number, data: Partial<Omit<T, 'id'>>): Promise<number>;
    delete(id: number): Promise<number>;
    transaction<R>(callback: () => Promise<R>): Promise<R>;
}
//# sourceMappingURL=OptimizedRepository.d.ts.map