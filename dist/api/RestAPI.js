"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestAPI = void 0;
exports.createRestAPI = createRestAPI;
const express_1 = __importDefault(require("express"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_1 = __importDefault(require("./swagger"));
const logger_1 = require("../utils/logger");
class RestAPI {
    constructor(serviceContainer, config) {
        this.app = (0, express_1.default)();
        this.port = config.port;
        this.host = config.host || 'localhost';
        this.serviceContainer = serviceContainer;
        this.specs = (0, swagger_jsdoc_1.default)(swagger_1.default);
        this.setupMiddleware();
        this.setupSwagger(config.enableSwagger ?? true);
        this.setupRoutes(config.apiPrefix || '/api');
        this.setupErrorHandling();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json({ limit: '10mb' }));
        this.app.use(express_1.default.urlencoded({ limit: '10mb', extended: true }));
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (req.method === 'OPTIONS') {
                return res.sendStatus(200);
            }
            next();
        });
        this.app.use((req, res, next) => {
            logger_1.logger.info('API Request', { method: req.method, path: req.path });
            next();
        });
    }
    setupSwagger(enabled) {
        if (!enabled)
            return;
        this.app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(this.specs, {
            swaggerOptions: {
                persistAuthorization: true,
            },
        }));
        logger_1.logger.info('Swagger documentation available at /api-docs');
    }
    setupRoutes(prefix) {
        this.app.get(`${prefix}/health`, (req, res) => {
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            });
        });
        this.app.get(`${prefix}/books`, async (req, res) => {
            try {
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const genre = req.query.genre;
                res.json({
                    success: true,
                    data: [],
                    pagination: { page, limit, total: 0 },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.get(`${prefix}/books/:id`, async (req, res) => {
            try {
                const bookId = parseInt(req.params.id);
                res.json({
                    success: true,
                    data: {
                        id: bookId,
                        title: 'Example Book',
                    },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.get(`${prefix}/books/:id/details`, async (req, res) => {
            try {
                const bookId = parseInt(req.params.id);
                const bookService = await this.serviceContainer.getBookService();
                const result = await bookService.getDetailedBookInfo(bookId);
                if (result.isErr()) {
                    return res.status(404).json({
                        success: false,
                        error: result.error.message,
                    });
                }
                res.json({
                    success: true,
                    data: result.value,
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.put(`${prefix}/books/:id/extended-info`, async (req, res) => {
            try {
                const bookId = parseInt(req.params.id);
                const { recommended_age, content_warnings } = req.body;
                const bookService = await this.serviceContainer.getBookService();
                const result = await bookService.updateBookExtendedInfo(bookId, recommended_age, content_warnings);
                if (result.isErr()) {
                    return res.status(400).json({
                        success: false,
                        error: result.error.message,
                    });
                }
                res.json({
                    success: true,
                    message: 'Book extended information updated successfully',
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.get(`${prefix}/books/:id/reviews`, async (req, res) => {
            try {
                const bookId = parseInt(req.params.id);
                res.json({
                    success: true,
                    data: [],
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.get(`${prefix}/jobs/:jobId`, async (req, res) => {
            try {
                const jobId = req.params.jobId;
                res.json({
                    success: true,
                    data: {
                        jobId,
                        status: 'completed',
                        progress: 100,
                    },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.post(`${prefix}/jobs/:jobId/retry`, async (req, res) => {
            try {
                const jobId = req.params.jobId;
                res.json({
                    success: true,
                    data: {
                        jobId,
                        status: 'pending',
                    },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        this.app.get(`${prefix}/stats`, async (req, res) => {
            try {
                res.json({
                    success: true,
                    data: {
                        totalBooks: 0,
                        totalUsers: 0,
                        totalReviews: 0,
                        averageRating: 0,
                    },
                });
            }
            catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        });
        logger_1.logger.info('API routes registered', { prefix });
    }
    setupErrorHandling() {
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found',
                path: req.path,
                method: req.method,
            });
        });
        this.app.use((error, req, res, next) => {
            logger_1.logger.error('API Error', error);
            res.status(error.status || 500).json({
                success: false,
                error: error.message || 'Internal server error',
                code: error.code || 'INTERNAL_ERROR',
            });
        });
    }
    async start() {
        return new Promise((resolve) => {
            this.app.listen(this.port, this.host, () => {
                logger_1.logger.info('REST API Server started', {
                    url: `http://${this.host}:${this.port}`,
                    swagger: `http://${this.host}:${this.port}/api-docs`,
                });
                resolve();
            });
        });
    }
    getApp() {
        return this.app;
    }
}
exports.RestAPI = RestAPI;
function createRestAPI(serviceContainer, config) {
    return new RestAPI(serviceContainer, config);
}
//# sourceMappingURL=RestAPI.js.map