import { JobOptions } from 'bull';
import { Result } from '../core/Result';
export interface QueueConfig {
    name: string;
    redis?: {
        host: string;
        port: number;
        password?: string;
    };
    defaultJobOptions?: JobOptions;
    maxAttempts?: number;
}
export interface JobData {
    [key: string]: any;
}
export interface JobResult {
    status: 'completed' | 'failed' | 'pending' | 'active';
    jobId: string;
    data?: any;
    error?: string;
    progress?: number;
    attemptsMade?: number;
}
export declare class QueueManager {
    private queue;
    private redis;
    private jobHandlers;
    constructor(config: QueueConfig);
    registerHandler(jobType: string, handler: (data: JobData) => Promise<any>): void;
    addJob(jobType: string, data: JobData, options?: JobOptions): Promise<Result<JobResult>>;
    getJobStatus(jobId: string): Promise<Result<JobResult>>;
    waitForJob(jobId: string, timeout?: number): Promise<Result<any>>;
    retryJob(jobId: string): Promise<Result<JobResult>>;
    removeJob(jobId: string): Promise<Result<void>>;
    getStats(): Promise<Result<{
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
    }>>;
    clear(): Promise<Result<void>>;
    private setupEventListeners;
    close(): Promise<void>;
}
export declare function createQueueManager(config: QueueConfig): QueueManager;
//# sourceMappingURL=Queue.d.ts.map