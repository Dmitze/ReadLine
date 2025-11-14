/**
 * Job Type Definitions and Handlers
 */

import { QueueManager, JobData, QueueConfig } from './Queue';
import { Result, Ok, Err } from '../core/Result';

/**
 * Email Job Types
 */
export interface EmailJobData extends JobData {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Report Generation Job Types
 */
export interface ReportJobData extends JobData {
  userId: number;
  type: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}

/**
 * User Notification Job Types
 */
export interface NotificationJobData extends JobData {
  userId: number;
  title: string;
  message: string;
  type?: string;
}

/**
 * Data Export Job Types
 */
export interface ExportJobData extends JobData {
  userId: number;
  format: 'csv' | 'json' | 'pdf';
  dataType: 'books' | 'reviews' | 'history';
}

/**
 * AI Processing Job Types
 */
export interface AIJobData extends JobData {
  bookId: number;
  prompt: string;
  type: 'recommendation' | 'summary' | 'analysis';
}

/**
 * Scheduled Maintenance Job Types
 */
export interface MaintenanceJobData extends JobData {
  type: 'cleanup' | 'optimization' | 'backup';
  targetTables?: string[];
}

/**
 * Job Queue Registry
 */
export class JobQueueRegistry {
  private queues: Map<string, QueueManager> = new Map();
  private redisConfig: any;

  constructor(redisConfig?: any) {
    this.redisConfig = redisConfig || {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379')
    };
  }

  /**
   * Get or create queue for job type
   */
  getQueue(queueName: string): QueueManager {
    if (!this.queues.has(queueName)) {
      const config: QueueConfig = {
        name: queueName,
        redis: this.redisConfig,
        maxAttempts: 3
      };

      const queue = new QueueManager(config);
      this.queues.set(queueName, queue);
    }

    return this.queues.get(queueName)!;
  }

  /**
   * Email queue
   */
  getEmailQueue(): QueueManager {
    return this.getQueue('emails');
  }

  /**
   * Report queue
   */
  getReportQueue(): QueueManager {
    return this.getQueue('reports');
  }

  /**
   * Notification queue
   */
  getNotificationQueue(): QueueManager {
    return this.getQueue('notifications');
  }

  /**
   * Export queue
   */
  getExportQueue(): QueueManager {
    return this.getQueue('exports');
  }

  /**
   * AI Processing queue
   */
  getAIQueue(): QueueManager {
    return this.getQueue('ai-processing');
  }

  /**
   * Maintenance queue
   */
  getMaintenanceQueue(): QueueManager {
    return this.getQueue('maintenance');
  }

  /**
   * Close all queues
   */
  async closeAll(): Promise<Result<void>> {
     try {
       const promises = Array.from(this.queues.values()).map(q => q.close());
       await Promise.all(promises);
       this.queues.clear();
       return new Ok(undefined);
     } catch (error) {
       return new Err(new Error(`Failed to close queues: ${error}`));
     }
   }
}

/**
 * Create job queue registry
 */
export function createJobQueueRegistry(redisConfig?: any): JobQueueRegistry {
  return new JobQueueRegistry(redisConfig);
}

/**
 * Predefined Job Queue Handlers
 */
export class JobHandlers {
  /**
   * Email handler
   */
  static async handleEmail(data: EmailJobData): Promise<any> {
    try {
      // Mock email sending
      console.log(`📧 Sending email to ${data.to}: ${data.subject}`);
      
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        emailId: `email-${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  /**
   * Report generation handler
   */
  static async handleReport(data: ReportJobData): Promise<any> {
    try {
      console.log(`📊 Generating ${data.type} report for user ${data.userId}`);
      
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        reportId: `report-${Date.now()}`,
        type: data.type,
        records: Math.floor(Math.random() * 100)
      };
    } catch (error) {
      throw new Error(`Failed to generate report: ${error}`);
    }
  }

  /**
   * Notification handler
   */
  static async handleNotification(data: NotificationJobData): Promise<any> {
    try {
      console.log(`📢 Sending notification to user ${data.userId}: ${data.title}`);
      
      // Simulate notification
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return {
        success: true,
        notificationId: `notif-${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Failed to send notification: ${error}`);
    }
  }

  /**
   * Export handler
   */
  static async handleExport(data: ExportJobData): Promise<any> {
    try {
      console.log(`💾 Exporting ${data.dataType} as ${data.format} for user ${data.userId}`);
      
      // Simulate export
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        success: true,
        exportId: `export-${Date.now()}`,
        format: data.format,
        fileSize: Math.floor(Math.random() * 10000)
      };
    } catch (error) {
      throw new Error(`Failed to export data: ${error}`);
    }
  }

  /**
   * AI Processing handler
   */
  static async handleAIProcessing(data: AIJobData): Promise<any> {
    try {
      console.log(`🤖 Processing AI request for book ${data.bookId}: ${data.type}`);
      
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return {
        success: true,
        aiResultId: `ai-${Date.now()}`,
        type: data.type,
        result: `AI processed: ${data.prompt.substring(0, 50)}...`
      };
    } catch (error) {
      throw new Error(`Failed to process AI request: ${error}`);
    }
  }

  /**
   * Maintenance handler
   */
  static async handleMaintenance(data: MaintenanceJobData): Promise<any> {
    try {
      console.log(`🔧 Running maintenance: ${data.type}`);
      
      // Simulate maintenance
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        maintenanceId: `maint-${Date.now()}`,
        type: data.type,
        tablesAffected: data.targetTables?.length || 0
      };
    } catch (error) {
      throw new Error(`Failed to run maintenance: ${error}`);
    }
  }
}
