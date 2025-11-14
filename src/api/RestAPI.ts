/**
 * REST API Server
 * Provides HTTP endpoints for bot functionality
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { ServiceContainer } from '../core/ServiceContainer';
import swaggerOptions from './swagger';
import { Result } from '../core/Result';

export interface RestAPIConfig {
  port: number;
  host?: string;
  enableSwagger?: boolean;
  apiPrefix?: string;
}

/**
 * REST API Server
 */
export class RestAPI {
  private app: Express;
  private port: number;
  private host: string;
  private serviceContainer: ServiceContainer;
  private specs: any;

  constructor(serviceContainer: ServiceContainer, config: RestAPIConfig) {
    this.app = express();
    this.port = config.port;
    this.host = config.host || 'localhost';
    this.serviceContainer = serviceContainer;
    this.specs = swaggerJsdoc(swaggerOptions);

    this.setupMiddleware();
    this.setupSwagger(config.enableSwagger ?? true);
    this.setupRoutes(config.apiPrefix || '/api');
    this.setupErrorHandling();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // CORS
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }

      next();
    });

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Setup Swagger documentation
   */
  private setupSwagger(enabled: boolean): void {
    if (!enabled) return;

    this.app.use(
      '/api-docs',
      swaggerUi.serve,
      swaggerUi.setup(this.specs, {
        swaggerOptions: {
          persistAuthorization: true
        }
      })
    );

    console.log('📚 Swagger documentation available at /api-docs');
  }

  /**
   * Setup API routes
   */
  private setupRoutes(prefix: string): void {
    /**
     * Health check endpoint
     */
    this.app.get(`${prefix}/health`, (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    /**
     * Books endpoints
     */
    this.app.get(`${prefix}/books`, async (req: Request, res: Response) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const genre = req.query.genre as string;

        // This would use the BookService from container
        res.json({
          success: true,
          data: [],
          pagination: { page, limit, total: 0 }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    this.app.get(`${prefix}/books/:id`, async (req: Request, res: Response) => {
      try {
        const bookId = parseInt(req.params.id);

        res.json({
          success: true,
          data: {
            id: bookId,
            title: 'Example Book'
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    /**
     * Reviews endpoints
     */
    this.app.get(`${prefix}/books/:id/reviews`, async (req: Request, res: Response) => {
      try {
        const bookId = parseInt(req.params.id);

        res.json({
          success: true,
          data: []
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    /**
     * Jobs endpoints
     */
    this.app.get(`${prefix}/jobs/:jobId`, async (req: Request, res: Response) => {
      try {
        const jobId = req.params.jobId;

        res.json({
          success: true,
          data: {
            jobId,
            status: 'completed',
            progress: 100
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    this.app.post(`${prefix}/jobs/:jobId/retry`, async (req: Request, res: Response) => {
      try {
        const jobId = req.params.jobId;

        res.json({
          success: true,
          data: {
            jobId,
            status: 'pending'
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    /**
     * Statistics endpoints
     */
    this.app.get(`${prefix}/stats`, async (req: Request, res: Response) => {
      try {
        res.json({
          success: true,
          data: {
            totalBooks: 0,
            totalUsers: 0,
            totalReviews: 0,
            averageRating: 0
          }
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: (error as Error).message
        });
      }
    });

    console.log(`✅ API routes registered at ${prefix}`);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
      });
    });

    // Global error handler
    this.app.use((error: any, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ API Error:', error);

      res.status(error.status || 500).json({
        success: false,
        error: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR'
      });
    });
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, this.host, () => {
        console.log(`\n🚀 REST API Server running at http://${this.host}:${this.port}`);
        console.log(`📚 Swagger docs at http://${this.host}:${this.port}/api-docs\n`);
        resolve();
      });
    });
  }

  /**
   * Get Express app instance
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * Create REST API server
 */
export function createRestAPI(
  serviceContainer: ServiceContainer,
  config: RestAPIConfig
): RestAPI {
  return new RestAPI(serviceContainer, config);
}
