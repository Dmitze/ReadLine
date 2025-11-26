import { Database, DatabaseWrapper } from './dbWrapper';
export interface IMigration {
    version: string;
    name: string;
    up: (db: Database | DatabaseWrapper) => Promise<void>;
    down?: (db: Database | DatabaseWrapper) => Promise<void>;
}
export interface MigrationRecord {
    id: number;
    version: string;
    name: string;
    executed_at: string;
    duration_ms: number;
}
export declare class MigrationRunner {
    private db;
    private migrations;
    private tableName;
    constructor(db: Database | DatabaseWrapper);
    register(migration: IMigration): void;
    registerAll(...migrations: IMigration[]): void;
    initialize(): Promise<void>;
    getExecuted(): Promise<MigrationRecord[]>;
    isExecuted(version: string): Promise<boolean>;
    runPending(): Promise<{
        version: string;
        name: string;
        duration: number;
    }[]>;
    rollback(targetVersion?: string): Promise<{
        version: string;
        name: string;
    }[]>;
    getStatus(): Promise<{
        executed: string[];
        pending: string[];
        total: number;
    }>;
    reset(): Promise<void>;
}
export declare function initializeMigrations(db: Database): Promise<MigrationRunner>;
//# sourceMappingURL=Migration.d.ts.map