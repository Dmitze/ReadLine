"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrapContainer = bootstrapContainer;
exports.registerRepository = registerRepository;
exports.registerService = registerService;
exports.getContainer = getContainer;
const ServiceContainer_1 = require("./ServiceContainer");
const logger_1 = require("../utils/logger");
const models_1 = require("../database/models");
const dbWrapper_1 = require("../database/dbWrapper");
const TransactionManager_1 = require("../database/TransactionManager");
async function bootstrapContainer(container) {
    logger_1.logger.info('Bootstrapping service container...');
    try {
        container.registerSingleton('logger', () => logger_1.logger);
        container.registerSingleton('config', () => ({
            get: (key) => process.env[key],
            getAll: () => process.env,
        }));
        container.registerSingleton('database', () => models_1.db);
        container.registerSingleton('DatabaseWrapper', () => new dbWrapper_1.DatabaseWrapper(models_1.db));
        container.registerSingleton('TransactionManager', () => {
            const wrapper = container.resolveSync('DatabaseWrapper');
            return new TransactionManager_1.TransactionManager(wrapper);
        });
        container.registerSingleton('cache', () => {
            const { cache } = require('../utils/cache');
            return cache;
        });
        container.registerSingleton('BookRepository', () => {
            const { BookRepository } = require('../repositories/BookRepository');
            return new BookRepository();
        });
        container.registerSingleton('UserRepository', () => {
            const { UserRepository } = require('../repositories/UserRepository');
            return new UserRepository();
        });
        container.registerSingleton('ReviewRepository', () => {
            const { ReviewRepository } = require('../repositories/ReviewRepository');
            return new ReviewRepository();
        });
        container.registerSingleton('SavedBookRepository', () => {
            const { SavedBookRepository } = require('../repositories/SavedBookRepository');
            return new SavedBookRepository();
        });
        container.registerSingleton('TagRepository', () => {
            const { TagRepository } = require('../repositories/TagRepository');
            return new TagRepository();
        });
        container.registerSingleton('PromoCodeRepository', () => {
            const { PromoCodeRepository } = require('../repositories/PromoCodeRepository');
            return new PromoCodeRepository();
        });
        container.registerSingleton('AudioRepository', () => {
            const { AudioRepository } = require('../repositories/AudioRepository');
            return new AudioRepository();
        });
        container.registerSingleton('BookService', () => {
            const { BookService } = require('../services/BookService');
            return new BookService(container.resolveSync('BookRepository'), container.resolveSync('ReviewRepository'), container.resolveSync('SavedBookRepository'), container.resolveSync('TagRepository'));
        });
        logger_1.logger.info('Service container bootstrapped successfully');
        const stats = container.getStats();
        logger_1.logger.debug('Container stats', {
            totalServices: stats.totalServices,
            services: stats.services.map((s) => s.key),
        });
    }
    catch (error) {
        logger_1.logger.error('Failed to bootstrap container', error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
}
function registerRepository(container, name, factory) {
    container.registerSingleton(name, factory);
    logger_1.logger.debug(`Registered repository: ${name}`);
}
function registerService(container, name, factory, lifetime = 'singleton') {
    if (lifetime === 'singleton') {
        container.registerSingleton(name, factory);
    }
    else {
        container.registerTransient(name, factory);
    }
    logger_1.logger.debug(`Registered service: ${name} (${lifetime})`);
}
function getContainer() {
    if (!globalThis.__serviceContainer) {
        globalThis.__serviceContainer = new ServiceContainer_1.ServiceContainer();
    }
    return globalThis.__serviceContainer;
}
//# sourceMappingURL=ContainerBootstrap.js.map