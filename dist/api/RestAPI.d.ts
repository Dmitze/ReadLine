import { Express } from 'express';
import { ServiceContainer } from '../core/ServiceContainer';
export interface RestAPIConfig {
    port: number;
    host?: string;
    enableSwagger?: boolean;
    apiPrefix?: string;
}
export declare class RestAPI {
    private app;
    private port;
    private host;
    private serviceContainer;
    private specs;
    constructor(serviceContainer: ServiceContainer, config: RestAPIConfig);
    private setupMiddleware;
    private setupSwagger;
    private setupRoutes;
    private setupErrorHandling;
    start(): Promise<void>;
    getApp(): Express;
}
export declare function createRestAPI(serviceContainer: ServiceContainer, config: RestAPIConfig): RestAPI;
//# sourceMappingURL=RestAPI.d.ts.map