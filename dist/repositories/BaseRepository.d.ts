import { DatabaseWrapper } from '../database/dbWrapper';
export declare abstract class BaseRepository<T extends {
    id?: number;
}> {
    protected db: DatabaseWrapper;
    protected tableName: string;
    constructor(db: DatabaseWrapper, tableName: string);
    getById(id: number): Promise<T | undefined>;
    getAll(limit?: number, offset?: number): Promise<T[]>;
    count(where?: string | Record<string, any>, params?: any[]): Promise<number>;
    exists(id: number): Promise<boolean>;
    delete(id: number): Promise<number>;
    query<R>(query: string, params?: any[]): Promise<R[]>;
    insert(data: Omit<T, 'id'>): Promise<number>;
    update(id: number, data: Partial<Omit<T, 'id'>>): Promise<number>;
    transaction<R>(callback: () => Promise<R>): Promise<R>;
    findById(id: number): Promise<T | undefined>;
    findAll(limit?: number, offset?: number): Promise<T[]>;
}
//# sourceMappingURL=BaseRepository.d.ts.map