import { ServiceContainer } from '../../core/ServiceContainer';
import {
  bootstrapContainer,
  registerRepository,
  registerService,
} from '../../core/ContainerBootstrap';

describe('Container Bootstrap', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(() => {
    container.clear();
  });

  describe('bootstrapContainer', () => {
    it('should register services without errors', async () => {
      await expect(bootstrapContainer(container)).resolves.not.toThrow();
    });

    it('should have core services registered', async () => {
      await bootstrapContainer(container);

      expect(container.has('logger')).toBe(true);
      expect(container.has('config')).toBe(true);
      expect(container.has('DatabaseWrapper')).toBe(true);
    });
  });

  describe('registerRepository', () => {
    it('should register repository', () => {
      const mockRepo = { findAll: jest.fn() };

      registerRepository(container, 'TestRepository', () => mockRepo);

      expect(container.has('TestRepository')).toBe(true);
    });
  });

  describe('registerService', () => {
    it('should register singleton service by default', () => {
      const mockService = { doSomething: jest.fn() };

      registerService(container, 'TestService', () => mockService);

      expect(container.has('TestService')).toBe(true);
    });

    it('should register transient service', () => {
      const mockService = { doSomething: jest.fn() };

      registerService(container, 'TestService', () => mockService, 'transient');

      expect(container.has('TestService')).toBe(true);
    });
  });

  describe('Service Resolution', () => {
    it('should check if services are registered', async () => {
      await bootstrapContainer(container);

      expect(container.has('logger')).toBe(true);
      expect(container.has('DatabaseWrapper')).toBe(true);
    });
  });
});
