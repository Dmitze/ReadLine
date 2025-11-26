import { ServiceContainer } from './ServiceContainer';
export declare function bootstrapContainer(container: ServiceContainer): Promise<void>;
export declare function registerRepository<T>(container: ServiceContainer, name: string, factory: () => T): void;
export declare function registerService<T>(container: ServiceContainer, name: string, factory: () => T | Promise<T>, lifetime?: 'singleton' | 'transient'): void;
export declare function getContainer(): ServiceContainer;
//# sourceMappingURL=ContainerBootstrap.d.ts.map