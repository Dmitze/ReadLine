import { QueueManager, JobData, QueueConfig } from './Queue';
import { Result, Ok, Err } from '../core/Result';
import { logger } from '../utils/logger';

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

export class JobQueueRegistry {
  private queues: Map<string, QueueManager> = new Map();
  private redisConfig: any;

  constructor(redisConfig?: any) {
    this.redisConfig = redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
  }

  getQueue(queueName: string): QueueManager {
    if (!this.queues.has(queueName)) {
      const config: QueueConfig = {
        name: queueName,
        redis: this.redisConfig,
        maxAttempts: 3,
      };

      const queue = new QueueManager(config);
      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }

  getEmailQueue(): QueueManager {
    return this.getQueue('emails');
  }

  getReportQueue(): QueueManager {
    return this.getQueue('reports');
  }

  getNotificationQueue(): QueueManager {
    return this.getQueue('notifications');
  }

  getExportQueue(): QueueManager {
    return this.getQueue('exports');
  }

  getAIQueue(): QueueManager {
    return this.getQueue('ai-processing');
  }

  getMaintenanceQueue(): QueueManager {
    return this.getQueue('maintenance');
  }

  async closeAll(): Promise<Result<void>> {
    try {
      const promises = Array.from(this.queues.values()).map((q) => q.close());
      await Promise.all(promises);
      this.queues.clear();
      return new Ok(undefined);
    } catch (error) {
      return new Err(new Error(`Failed to close queues: ${error}`));
    }
  }
}

export function createJobQueueRegistry(redisConfig?: any): JobQueueRegistry {
  return new JobQueueRegistry(redisConfig);
}

export class JobHandlers {
  static async handleEmail(data: EmailJobData): Promise<any> {
    try {
      logger.info('Sending email', { to: data.to, subject: data.subject });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      return {
        success: true,
        emailId: `email-${Date.now()}`,
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  static async handleReport(data: ReportJobData): Promise<any> {
    try {
      logger.info('Generating report', { type: data.type, userId: data.userId });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        success: true,
        reportId: `report-${Date.now()}`,
        type: data.type,
        records: Math.floor(Math.random() * 100),
      };
    } catch (error) {
      throw new Error(`Failed to generate report: ${error}`);
    }
  }

  static async handleNotification(data: NotificationJobData): Promise<any> {
    try {
      logger.info('Sending notification', { userId: data.userId, title: data.title });

      await new Promise((resolve) => setTimeout(resolve, 500));

      return {
        success: true,
        notificationId: `notif-${Date.now()}`,
      };
    } catch (error) {
      throw new Error(`Failed to send notification: ${error}`);
    }
  }

  static async handleExport(data: ExportJobData): Promise<any> {
    try {
      logger.info('Exporting data', {
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
    } catch (error) {
      throw new Error(`Failed to export data: ${error}`);
    }
  }

  static async handleAIProcessing(data: AIJobData): Promise<any> {
    try {
      logger.info('Processing AI request', { bookId: data.bookId, type: data.type });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      return {
        success: true,
        aiResultId: `ai-${Date.now()}`,
        type: data.type,
        result: `AI processed: ${data.prompt.substring(0, 50)}...`,
      };
    } catch (error) {
      throw new Error(`Failed to process AI request: ${error}`);
    }
  }

  static async handleMaintenance(data: MaintenanceJobData): Promise<any> {
    try {
      logger.info('Running maintenance', { type: data.type });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      return {
        success: true,
        maintenanceId: `maint-${Date.now()}`,
        type: data.type,
        tablesAffected: data.targetTables?.length || 0,
      };
    } catch (error) {
      throw new Error(`Failed to run maintenance: ${error}`);
    }
  }
}
