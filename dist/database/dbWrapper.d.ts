import { Database as SqliteDatabase } from 'sqlite3';
export type { SqliteDatabase as Database };
export type SQLParameter = string | number | boolean | null | undefined;
export type SQLParameters = SQLParameter[];
export declare class DatabaseWrapper {
    private db;
    constructor(db: SqliteDatabase);
    get<T>(query: string, params?: SQLParameters): Promise<T | undefined>;
    all<T>(query: string, params?: SQLParameters): Promise<T[]>;
    run(query: string, params?: SQLParameters): Promise<{
        lastID: number;
        changes: number;
    }>;
    insert(query: string, params?: SQLParameters): Promise<number>;
    update(query: string, params?: SQLParameters): Promise<number>;
    delete(query: string, params?: SQLParameters): Promise<number>;
    transaction<T>(callback: () => Promise<T>): Promise<T>;
    exists(query: string, params?: SQLParameters): Promise<boolean>;
    count(table: string, where?: string, params?: SQLParameters): Promise<number>;
}
//# sourceMappingURL=dbWrapper.d.ts.map