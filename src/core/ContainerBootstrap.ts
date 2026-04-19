import { ServiceContainer } from './ServiceContainer';
import { logger } from '../utils/logger';
import { db } from '../database/models';
import { DatabaseWrapper } from '../database/dbWrapper';
import { TransactionManager } from '../database/TransactionManager';

export async function bootstrapContainer(container: ServiceContainer): Promise<void> {
  logger.info('Bootstrapping service container...');

  try {
    container.registerSingleton('logger', () => logger);

    container.registerSingleton('config', () => ({
      get: (key: string) => process.env[key],
      getAll: () => process.env,
    }));

    container.registerSingleton('database', () => db);

    container.registerSingleton('DatabaseWrapper', () => new DatabaseWrapper(db));

    container.registerSingleton('TransactionManager', () => {
      const wrapper = container.resolveSync<DatabaseWrapper>('DatabaseWrapper');
      return new TransactionManager(wrapper);
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
      return new BookService(
        container.resolveSync('BookRepository'),
        container.resolveSync('ReviewRepository'),
        container.resolveSync('SavedBookRepository'),
        container.resolveSync('TagRepository')
      );
    });

    logger.info('Service container bootstrapped successfully');

    const stats = container.getStats();
    logger.debug('Container stats', {
      totalServices: stats.totalServices,
      services: stats.services.map((s) => s.key),
    });
  } catch (error) {
    logger.error(
      'Failed to bootstrap container',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export function registerRepository<T>(
  container: ServiceContainer,
  name: string,
  factory: () => T
): void {
  container.registerSingleton(name, factory);
  logger.debug(`Registered repository: ${name}`);
}

export function registerService<T>(
  container: ServiceContainer,
  name: string,
  factory: () => T | Promise<T>,
  lifetime: 'singleton' | 'transient' = 'singleton'
): void {
  if (lifetime === 'singleton') {
    container.registerSingleton(name, factory);
  } else {
    container.registerTransient(name, factory);
  }
  logger.debug(`Registered service: ${name} (${lifetime})`);
}

export function getContainer(): ServiceContainer {
  if (!(globalThis as any).__serviceContainer) {
    (globalThis as any).__serviceContainer = new ServiceContainer();
  }
  return (globalThis as any).__serviceContainer;
}
