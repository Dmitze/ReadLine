import { Database } from './dbWrapper';
export interface MigrationStatus {
    total: number;
    executed: number;
    pending: number;
    migrations: {
        version: string;
        name: string;
        status: 'executed' | 'pending';
        executedAt?: string;
        duration?: number;
    }[];
}
export declare class MigrationManager {
    private runner;
    private db;
    private wrapper;
    constructor(db: Database);
    init(): Promise<void>;
    migrate(): Promise<{
        count: number;
        migrations: string[];
    }>;
    rollback(targetVersion?: string): Promise<{
        count: number;
        migrations: string[];
    }>;
    getStatus(): Promise<MigrationStatus>;
    reset(): Promise<void>;
    fresh(): Promise<void>;
    printStatus(): Promise<void>;
    runSpecific(version: string): Promise<void>;
    validate(): Promise<{
        valid: boolean;
        errors: string[];
    }>;
}
export declare function createMigrationManager(db: Database): Promise<MigrationManager>;
//# sourceMappingURL=MigrationManager.d.ts.map