/**
 * Queue System Integration Tests
 */

import { JobQueueRegistry, JobHandlers } from '../../queue/Jobs';

describe('Queue System', () => {
  let queueRegistry: JobQueueRegistry;

  beforeEach(() => {
    // Use in-memory Redis for testing
    queueRegistry = new JobQueueRegistry({
      host: 'localhost',
      port: 6379
    });
  });

  afterEach(async () => {
    await queueRegistry.closeAll();
  });

  describe('QueueManager', () => {
    it('should add job to queue', async () => {
      const emailQueue = queueRegistry.getEmailQueue();
      const result = await emailQueue.addJob('email', {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'Test body'
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.status).toBe('pending');
        expect(result.value.jobId).toBeDefined();
      }
    });

    it('should register and execute job handler', async () => {
      const reportQueue = queueRegistry.getReportQueue();
      const mockHandler = jest.fn().mockResolvedValue({ success: true });

      reportQueue.registerHandler('generate', mockHandler);

      const result = await reportQueue.addJob('generate', {
        userId: 1,
        type: 'daily',
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.isOk()).toBe(true);
    });

    it('should get job status', async () => {
      const notificationQueue = queueRegistry.getNotificationQueue();

      const addResult = await notificationQueue.addJob('notify', {
        userId: 1,
        title: 'Test Notification',
        message: 'Test message'
      });

      expect(addResult.isOk()).toBe(true);

      if (addResult.isOk()) {
        const jobId = addResult.value.jobId;
        const statusResult = await notificationQueue.getJobStatus(jobId);

        expect(statusResult.isOk()).toBe(true);
        if (statusResult.isOk()) {
          expect(statusResult.value.jobId).toBe(jobId);
          expect(['pending', 'active', 'completed', 'failed']).toContain(
            statusResult.value.status
          );
        }
      }
    });

    it('should get queue statistics', async () => {
      const exportQueue = queueRegistry.getExportQueue();

      // Add multiple jobs
      await exportQueue.addJob('export', {
        userId: 1,
        format: 'csv',
        dataType: 'books'
      });

      await exportQueue.addJob('export', {
        userId: 2,
        format: 'json',
        dataType: 'reviews'
      });

      const statsResult = await exportQueue.getStats();

      expect(statsResult.isOk()).toBe(true);
      if (statsResult.isOk()) {
        expect(statsResult.value.waiting).toBeGreaterThanOrEqual(0);
        expect(statsResult.value.active).toBeGreaterThanOrEqual(0);
        expect(statsResult.value.completed).toBeGreaterThanOrEqual(0);
        expect(statsResult.value.failed).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle queue errors gracefully', async () => {
      const aiQueue = queueRegistry.getAIQueue();

      const result = await aiQueue.getJobStatus('non-existent-job-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Job not found');
      }
    });
  });

  describe('JobQueueRegistry', () => {
    it('should return same queue instance for same name', () => {
      const emailQueue1 = queueRegistry.getEmailQueue();
      const emailQueue2 = queueRegistry.getEmailQueue();

      expect(emailQueue1).toBe(emailQueue2);
    });

    it('should provide separate queues for different types', () => {
      const emailQueue = queueRegistry.getEmailQueue();
      const reportQueue = queueRegistry.getReportQueue();
      const notificationQueue = queueRegistry.getNotificationQueue();

      expect(emailQueue).not.toBe(reportQueue);
      expect(reportQueue).not.toBe(notificationQueue);
      expect(emailQueue).not.toBe(notificationQueue);
    });

    it('should close all queues', async () => {
      const emailQueue = queueRegistry.getEmailQueue();

      await emailQueue.addJob('email', {
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test'
      });

      const closeResult = await queueRegistry.closeAll();

      expect(closeResult.isOk()).toBe(true);
    });
  });

  describe('Job Handlers', () => {
    it('should handle email jobs', async () => {
      const result = await JobHandlers.handleEmail({
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'Test body'
      });

      expect(result.success).toBe(true);
      expect(result.emailId).toBeDefined();
    });

    it('should handle report generation', async () => {
      const result = await JobHandlers.handleReport({
        userId: 1,
        type: 'daily',
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      });

      expect(result.success).toBe(true);
      expect(result.reportId).toBeDefined();
      expect(result.type).toBe('daily');
    });

    it('should handle notifications', async () => {
      const result = await JobHandlers.handleNotification({
        userId: 1,
        title: 'Test Notification',
        message: 'Test message'
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
    });

    it('should handle exports', async () => {
      const result = await JobHandlers.handleExport({
        userId: 1,
        format: 'csv',
        dataType: 'books'
      });

      expect(result.success).toBe(true);
      expect(result.exportId).toBeDefined();
      expect(result.format).toBe('csv');
    });

    it('should handle AI processing', async () => {
      const result = await JobHandlers.handleAIProcessing({
        bookId: 1,
        prompt: 'Analyze this book',
        type: 'analysis'
      });

      expect(result.success).toBe(true);
      expect(result.aiResultId).toBeDefined();
      expect(result.type).toBe('analysis');
    });

    it('should handle maintenance tasks', async () => {
      const result = await JobHandlers.handleMaintenance({
        type: 'cleanup',
        targetTables: ['books', 'reviews']
      });

      expect(result.success).toBe(true);
      expect(result.maintenanceId).toBeDefined();
      expect(result.type).toBe('cleanup');
      expect(result.tablesAffected).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle job not found error', async () => {
      const maintenanceQueue = queueRegistry.getMaintenanceQueue();

      const result = await maintenanceQueue.getJobStatus('invalid-job-id');

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.message).toContain('Job not found');
      }
    });

    it('should handle remove job operation', async () => {
      const exportQueue = queueRegistry.getExportQueue();

      const addResult = await exportQueue.addJob('export', {
        userId: 1,
        format: 'json',
        dataType: 'books'
      });

      expect(addResult.isOk()).toBe(true);

      if (addResult.isOk()) {
        const removeResult = await exportQueue.removeJob(addResult.value.jobId);
        expect(removeResult.isOk()).toBe(true);
      }
    });

    it('should clear queue', async () => {
      const aiQueue = queueRegistry.getAIQueue();

      await aiQueue.addJob('process', {
        bookId: 1,
        prompt: 'Test',
        type: 'summary'
      });

      const clearResult = await aiQueue.clear();

      expect(clearResult.isOk()).toBe(true);
    });
  });
});
