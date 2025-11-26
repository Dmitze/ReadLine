import { DatabaseWrapper } from './dbWrapper';
export interface IndexSpec {
    tableName: string;
    indexName: string;
    columns: string[];
    unique?: boolean;
    description?: string;
}
export declare const INDEX_SPECS: IndexSpec[];
export declare class IndexManager {
    private db;
    constructor(db: DatabaseWrapper);
    createAllIndexes(): Promise<{
        created: number;
        skipped: number;
        errors: number;
    }>;
    createIndex(spec: IndexSpec): Promise<boolean>;
    getTableIndexes(tableName: string): Promise<string[]>;
    vacuum(): Promise<void>;
    analyze(): Promise<void>;
    getDatabaseStats(): Promise<{
        pageCount: number;
        pageSize: number;
        freelistCount: number;
        totalSize: number;
    }>;
}
//# sourceMappingURL=IndexManager.d.ts.map