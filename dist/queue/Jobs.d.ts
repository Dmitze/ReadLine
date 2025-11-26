import { QueueManager, JobData } from './Queue';
import { Result } from '../core/Result';
export interface EmailJobData extends JobData {
    to: string;
    subject: string;
    body: string;
    html?: string;
}
export interface ReportJobData extends JobData {
    userId: number;
    type: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
}
export interface NotificationJobData extends JobData {
    userId: number;
    title: string;
    message: string;
    type?: string;
}
export interface ExportJobData extends JobData {
    userId: number;
    format: 'csv' | 'json' | 'pdf';
    dataType: 'books' | 'reviews' | 'history';
}
export interface AIJobData extends JobData {
    bookId: number;
    prompt: string;
    type: 'recommendation' | 'summary' | 'analysis';
}
export interface MaintenanceJobData extends JobData {
    type: 'cleanup' | 'optimization' | 'backup';
    targetTables?: string[];
}
export declare class JobQueueRegistry {
    private queues;
    private redisConfig;
    constructor(redisConfig?: any);
    getQueue(queueName: string): QueueManager;
    getEmailQueue(): QueueManager;
    getReportQueue(): QueueManager;
    getNotificationQueue(): QueueManager;
    getExportQueue(): QueueManager;
    getAIQueue(): QueueManager;
    getMaintenanceQueue(): QueueManager;
    closeAll(): Promise<Result<void>>;
}
export declare function createJobQueueRegistry(redisConfig?: any): JobQueueRegistry;
export declare class JobHandlers {
    static handleEmail(data: EmailJobData): Promise<any>;
    static handleReport(data: ReportJobData): Promise<any>;
    static handleNotification(data: NotificationJobData): Promise<any>;
    static handleExport(data: ExportJobData): Promise<any>;
    static handleAIProcessing(data: AIJobData): Promise<any>;
    static handleMaintenance(data: MaintenanceJobData): Promise<any>;
}
//# sourceMappingURL=Jobs.d.ts.map