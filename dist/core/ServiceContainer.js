"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalContainer = exports.ServiceContainer = void 0;
exports.initializeContainer = initializeContainer;
const logger_1 = require("../utils/logger");
class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.initializationInProgress = new Map();
    }
    registerSingleton(key, factory) {
        if (this.services.has(key)) {
            logger_1.logger.warn(`Service ${key} is already registered, overwriting`);
        }
        this.services.set(key, {
            factory,
            lifetime: 'singleton',
            isInitialized: false,
        });
        logger_1.logger.debug(`Registered singleton service: ${key}`);
    }
    registerTransient(key, factory) {
        if (this.services.has(key)) {
            logger_1.logger.warn(`Service ${key} is already registered, overwriting`);
        }
        this.services.set(key, {
            factory,
            lifetime: 'transient',
        });
        logger_1.logger.debug(`Registered transient service: ${key}`);
    }
    async resolve(key) {
        const definition = this.services.get(key);
        if (!definition) {
            throw new Error(`Service ${key} is not registered in the container`);
        }
        if (definition.lifetime === 'transient') {
            return this.createInstance(key, definition);
        }
        if (definition.isInitialized && definition.instance !== undefined) {
            return definition.instance;
        }
        if (this.initializationInProgress.has(key)) {
            return this.initializationInProgress.get(key);
        }
        const initPromise = this.createInstance(key, definition);
        this.initializationInProgress.set(key, initPromise);
        try {
            const instance = await initPromise;
            definition.instance = instance;
            definition.isInitialized = true;
            return instance;
        }
        finally {
            this.initializationInProgress.delete(key);
        }
    }
    resolveSync(key) {
        const definition = this.services.get(key);
        if (!definition) {
            throw new Error(`Service ${key} is not registered in the container`);
        }
        if (definition.lifetime === 'transient') {
            throw new Error(`Cannot resolve transient service ${key} synchronously. Use resolve() instead.`);
        }
        if (!definition.isInitialized || definition.instance === undefined) {
            throw new Error(`Service ${key} is not initialized. Use resolve() first.`);
        }
        return definition.instance;
    }
    has(key) {
        return this.services.has(key);
    }
    clear() {
        for (const definition of this.services.values()) {
            if (definition.instance && typeof definition.instance.dispose === 'function') {
                definition.instance.dispose().catch((err) => {
                    logger_1.logger.error('Error disposing service', err instanceof Error ? err : new Error(String(err)));
                });
            }
        }
        this.services.clear();
        this.initializationInProgress.clear();
        logger_1.logger.info('Service container cleared');
    }
    getRegisteredServices() {
        return Array.from(this.services.keys());
    }
    getStats() {
        const services = Array.from(this.services.entries()).map(([key, def]) => ({
            key,
            lifetime: def.lifetime,
            initialized: def.isInitialized,
        }));
        return {
            totalServices: this.services.size,
            services,
        };
    }
    async getBookService() {
        return this.resolve('bookService');
    }
    async createInstance(key, definition) {
        try {
            const result = definition.factory();
            if (result instanceof Promise) {
                return await result;
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error(`Error creating service instance for ${key}`, error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}
exports.ServiceContainer = ServiceContainer;
exports.globalContainer = new ServiceContainer();
async function initializeContainer() {
    logger_1.logger.info('Initializing service container');
    try {
        exports.globalContainer.registerSingleton('logger', () => {
            const { logger: loggerInstance } = require('../utils/logger');
            return loggerInstance;
        });
        exports.globalContainer.registerSingleton('database', async () => {
            const { initDatabase } = await Promise.resolve().then(() => __importStar(require('../database/models')));
            return initDatabase();
        });
        exports.globalContainer.registerSingleton('cache', () => {
            const { cache } = require('../utils/cache');
            return cache;
        });
        exports.globalContainer.registerSingleton('config', () => {
            return {
                get: (key) => process.env[key],
                set: (key, value) => {
                    process.env[key] = value;
                },
                getAll: () => process.env,
            };
        });
        logger_1.logger.info('Service container initialized successfully');
        const stats = exports.globalContainer.getStats();
        logger_1.logger.debug(`Container stats: ${JSON.stringify(stats)}`);
    }
    catch (error) {
        logger_1.logger.error('Failed to initialize service container', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
//# sourceMappingURL=ServiceContainer.js.map