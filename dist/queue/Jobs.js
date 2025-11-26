"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobHandlers = exports.JobQueueRegistry = void 0;
exports.createJobQueueRegistry = createJobQueueRegistry;
const Queue_1 = require("./Queue");
const Result_1 = require("../core/Result");
const logger_1 = require("../utils/logger");
class JobQueueRegistry {
    constructor(redisConfig) {
        this.queues = new Map();
        this.redisConfig = redisConfig || {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        };
    }
    getQueue(queueName) {
        if (!this.queues.has(queueName)) {
            const config = {
                name: queueName,
                redis: this.redisConfig,
                maxAttempts: 3,
            };
            const queue = new Queue_1.QueueManager(config);
            this.queues.set(queueName, queue);
        }
        return this.queues.get(queueName);
    }
    getEmailQueue() {
        return this.getQueue('emails');
    }
    getReportQueue() {
        return this.getQueue('reports');
    }
    getNotificationQueue() {
        return this.getQueue('notifications');
    }
    getExportQueue() {
        return this.getQueue('exports');
    }
    getAIQueue() {
        return this.getQueue('ai-processing');
    }
    getMaintenanceQueue() {
        return this.getQueue('maintenance');
    }
    async closeAll() {
        try {
            const promises = Array.from(this.queues.values()).map((q) => q.close());
            await Promise.all(promises);
            this.queues.clear();
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to close queues: ${error}`));
        }
    }
}
exports.JobQueueRegistry = JobQueueRegistry;
function createJobQueueRegistry(redisConfig) {
    return new JobQueueRegistry(redisConfig);
}
class JobHandlers {
    static async handleEmail(data) {
        try {
            logger_1.logger.info('Sending email', { to: data.to, subject: data.subject });
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return {
                success: true,
                emailId: `email-${Date.now()}`,
            };
        }
        catch (error) {
            throw new Error(`Failed to send email: ${error}`);
        }
    }
    static async handleReport(data) {
        try {
            logger_1.logger.info('Generating report', { type: data.type, userId: data.userId });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return {
                success: true,
                reportId: `report-${Date.now()}`,
                type: data.type,
                records: Math.floor(Math.random() * 100),
            };
        }
        catch (error) {
            throw new Error(`Failed to generate report: ${error}`);
        }
    }
    static async handleNotification(data) {
        try {
            logger_1.logger.info('Sending notification', { userId: data.userId, title: data.title });
            await new Promise((resolve) => setTimeout(resolve, 500));
            return {
                success: true,
                notificationId: `notif-${Date.now()}`,
            };
        }
        catch (error) {
            throw new Error(`Failed to send notification: ${error}`);
        }
    }
    static async handleExport(data) {
        try {
            logger_1.logger.info('Exporting data', {
                dataType: data.dataType,
                format: data.format,
                userId: data.userId,
            });
            await new Promise((resolve) => setTimeout(resolve, 1500));
            return {
                success: true,
                exportId: `export-${Date.now()}`,
                format: data.format,
                fileSize: Math.floor(Math.random() * 10000),
            };
        }
        catch (error) {
            throw new Error(`Failed to export data: ${error}`);
        }
    }
    static async handleAIProcessing(data) {
        try {
            logger_1.logger.info('Processing AI request', { bookId: data.bookId, type: data.type });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            return {
                success: true,
                aiResultId: `ai-${Date.now()}`,
                type: data.type,
                result: `AI processed: ${data.prompt.substring(0, 50)}...`,
            };
        }
        catch (error) {
            throw new Error(`Failed to process AI request: ${error}`);
        }
    }
    static async handleMaintenance(data) {
        try {
            logger_1.logger.info('Running maintenance', { type: data.type });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return {
                success: true,
                maintenanceId: `maint-${Date.now()}`,
                type: data.type,
                tablesAffected: data.targetTables?.length || 0,
            };
        }
        catch (error) {
            throw new Error(`Failed to run maintenance: ${error}`);
        }
    }
}
exports.JobHandlers = JobHandlers;
//# sourceMappingURL=Jobs.js.map