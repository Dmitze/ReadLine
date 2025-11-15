/**
 * Queue System using Bull + Redis
 * Manages async job processing for background tasks
 */

import Queue, { Job, JobOptions } from 'bull';
import Redis from 'ioredis';
import { Result, Ok, Err } from '../core/Result';
import { logger } from '../utils/logger';

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

/**
 * Queue Manager - Wraps Bull queue with Result pattern
 */
export class QueueManager {
  private queue: Queue.Queue;
  private redis: Redis;
  private jobHandlers: Map<string, (data: JobData) => Promise<any>> = new Map();

  constructor(config: QueueConfig) {
    const redisConfig = config.redis || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    };

    this.redis = new Redis(redisConfig);

    this.queue = new Queue(config.name, {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: config.maxAttempts || 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false,
        ...config.defaultJobOptions
      }
    });

    this.setupEventListeners();
  }

  /**
   * Register job handler
   */
  registerHandler(jobType: string, handler: (data: JobData) => Promise<any>): void {
    this.jobHandlers.set(jobType, handler);
    
    this.queue.process(jobType, async (job: Job) => {
      try {
        return await handler(job.data);
      } catch (error) {
        throw error;
      }
    });
  }

  /**
   * Add job to queue
   */
  async addJob(
    jobType: string,
    data: JobData,
    options?: JobOptions
  ): Promise<Result<JobResult>> {
    try {
      const job = await this.queue.add(jobType, data, {
        ...options,
        jobId: `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      return new Ok({
        status: 'pending',
        jobId: job.id!.toString(),
        data: job.data
      });
    } catch (error) {
      return new Err(new Error(`Failed to add job: ${error}`));
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<Result<JobResult>> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return new Err(new Error(`Job not found: ${jobId}`));
      }

      let status: JobResult['status'] = 'pending';
      // Bull job status methods - synchronous calls
      try {
        if ((job as any).isCompleted?.()) status = 'completed';
        else if ((job as any).isFailed?.()) status = 'failed';
        else if ((job as any).isActive?.()) status = 'active';
      } catch {
        // If status check fails, default to pending
      }

      return new Ok({
        status,
        jobId: job.id!.toString(),
        data: job.returnvalue,
        error: job.failedReason,
        progress: job.progress() as number,
        attemptsMade: job.attemptsMade
      });
    } catch (error) {
      return new Err(new Error(`Failed to get job status: ${error}`));
    }
  }

  /**
   * Wait for job completion
   */
  async waitForJob(jobId: string, timeout: number = 30000): Promise<Result<any>> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return new Err(new Error(`Job not found: ${jobId}`));
      }

      const result = await (job as any).waitUntilFinished(timeout);
      return new Ok(result);
    } catch (error) {
      return new Err(new Error(`Job failed or timed out: ${error}`));
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(jobId: string): Promise<Result<JobResult>> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (!job) {
        return new Err(new Error(`Job not found: ${jobId}`));
      }

      if (!job.isFailed()) {
        return new Err(new Error('Job is not in failed state'));
      }

      await job.retry();
      
      return new Ok({
        status: 'pending',
        jobId: job.id!.toString(),
        data: job.data,
        attemptsMade: job.attemptsMade
      });
    } catch (error) {
      return new Err(new Error(`Failed to retry job: ${error}`));
    }
  }

  /**
   * Remove job
   */
  async removeJob(jobId: string): Promise<Result<void>> {
    try {
      const job = await this.queue.getJob(jobId);
      
      if (job) {
        await job.remove();
      }

      return new Ok(undefined);
    } catch (error) {
      return new Err(new Error(`Failed to remove job: ${error}`));
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<Result<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }>> {
    try {
      const counts = await this.queue.getJobCounts();
      return new Ok(counts);
    } catch (error) {
      return new Err(new Error(`Failed to get queue stats: ${error}`));
    }
  }

  /**
   * Clear queue
   */
  async clear(): Promise<Result<void>> {
    try {
      await this.queue.clean(0, 'completed');
      await this.queue.clean(0, 'failed');
      return new Ok(undefined);
    } catch (error) {
      return new Err(new Error(`Failed to clear queue: ${error}`));
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.queue.on('completed', (job: Job) => {
      logger.info('Job completed', { jobId: job.id });
    });

    this.queue.on('failed', (job: Job, error: Error) => {
      logger.error('Job failed', error, { jobId: job.id });
    });

    this.queue.on('stalled', (job: Job) => {
      logger.warn('Job stalled', { jobId: job.id });
    });

    this.queue.on('error', (error: Error) => {
      logger.error('Queue error', error instanceof Error ? error : new Error(String(error)));
    });
  }

  /**
   * Close queue and redis connection
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.redis.quit();
  }
}

/**
 * Create queue manager
 */
export function createQueueManager(config: QueueConfig): QueueManager {
  return new QueueManager(config);
}
