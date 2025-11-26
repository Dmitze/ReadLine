"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
exports.createQueueManager = createQueueManager;
const bull_1 = __importDefault(require("bull"));
const ioredis_1 = __importDefault(require("ioredis"));
const Result_1 = require("../core/Result");
const logger_1 = require("../utils/logger");
class QueueManager {
    constructor(config) {
        this.jobHandlers = new Map();
        const redisConfig = config.redis || {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
        };
        this.redis = new ioredis_1.default(redisConfig);
        this.queue = new bull_1.default(config.name, {
            redis: redisConfig,
            defaultJobOptions: {
                attempts: config.maxAttempts || 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000,
                },
                removeOnComplete: true,
                removeOnFail: false,
                ...config.defaultJobOptions,
            },
        });
        this.setupEventListeners();
    }
    registerHandler(jobType, handler) {
        this.jobHandlers.set(jobType, handler);
        this.queue.process(jobType, async (job) => {
            try {
                return await handler(job.data);
            }
            catch (error) {
                throw error;
            }
        });
    }
    async addJob(jobType, data, options) {
        try {
            const job = await this.queue.add(jobType, data, {
                ...options,
                jobId: `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            });
            return new Result_1.Ok({
                status: 'pending',
                jobId: job.id.toString(),
                data: job.data,
            });
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to add job: ${error}`));
        }
    }
    async getJobStatus(jobId) {
        try {
            const job = await this.queue.getJob(jobId);
            if (!job) {
                return new Result_1.Err(new Error(`Job not found: ${jobId}`));
            }
            let status = 'pending';
            try {
                if (job.isCompleted?.())
                    status = 'completed';
                else if (job.isFailed?.())
                    status = 'failed';
                else if (job.isActive?.())
                    status = 'active';
            }
            catch {
            }
            return new Result_1.Ok({
                status,
                jobId: job.id.toString(),
                data: job.returnvalue,
                error: job.failedReason,
                progress: job.progress(),
                attemptsMade: job.attemptsMade,
            });
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to get job status: ${error}`));
        }
    }
    async waitForJob(jobId, timeout = 30000) {
        try {
            const job = await this.queue.getJob(jobId);
            if (!job) {
                return new Result_1.Err(new Error(`Job not found: ${jobId}`));
            }
            const result = await job.waitUntilFinished(timeout);
            return new Result_1.Ok(result);
        }
        catch (error) {
            return new Result_1.Err(new Error(`Job failed or timed out: ${error}`));
        }
    }
    async retryJob(jobId) {
        try {
            const job = await this.queue.getJob(jobId);
            if (!job) {
                return new Result_1.Err(new Error(`Job not found: ${jobId}`));
            }
            if (!job.isFailed()) {
                return new Result_1.Err(new Error('Job is not in failed state'));
            }
            await job.retry();
            return new Result_1.Ok({
                status: 'pending',
                jobId: job.id.toString(),
                data: job.data,
                attemptsMade: job.attemptsMade,
            });
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to retry job: ${error}`));
        }
    }
    async removeJob(jobId) {
        try {
            const job = await this.queue.getJob(jobId);
            if (job) {
                await job.remove();
            }
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to remove job: ${error}`));
        }
    }
    async getStats() {
        try {
            const counts = await this.queue.getJobCounts();
            return new Result_1.Ok(counts);
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to get queue stats: ${error}`));
        }
    }
    async clear() {
        try {
            await this.queue.clean(0, 'completed');
            await this.queue.clean(0, 'failed');
            return new Result_1.Ok(undefined);
        }
        catch (error) {
            return new Result_1.Err(new Error(`Failed to clear queue: ${error}`));
        }
    }
    setupEventListeners() {
        this.queue.on('completed', (job) => {
            logger_1.logger.info('Job completed', { jobId: job.id });
        });
        this.queue.on('failed', (job, error) => {
            logger_1.logger.error('Job failed', error, { jobId: job.id });
        });
        this.queue.on('stalled', (job) => {
            logger_1.logger.warn('Job stalled', { jobId: job.id });
        });
        this.queue.on('error', (error) => {
            logger_1.logger.error('Queue error', error instanceof Error ? error : new Error(String(error)));
        });
    }
    async close() {
        await this.queue.close();
        await this.redis.quit();
    }
}
exports.QueueManager = QueueManager;
function createQueueManager(config) {
    return new QueueManager(config);
}
//# sourceMappingURL=Queue.js.map