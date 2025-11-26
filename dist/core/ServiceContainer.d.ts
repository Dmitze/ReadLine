import { IServiceContainer } from './types';
export declare class ServiceContainer implements IServiceContainer {
    private services;
    private initializationInProgress;
    registerSingleton<T>(key: string, factory: () => Promise<T> | T): void;
    registerTransient<T>(key: string, factory: () => Promise<T> | T): void;
    resolve<T>(key: string): Promise<T>;
    resolveSync<T>(key: string): T;
    has(key: string): boolean;
    clear(): void;
    getRegisteredServices(): string[];
    getStats(): {
        totalServices: number;
        services: {
            key: string;
            lifetime: "singleton" | "transient";
            initialized: boolean;
        }[];
    };
    getBookService(): Promise<any>;
    private createInstance;
}
export declare const globalContainer: ServiceContainer;
export declare function initializeContainer(): Promise<void>;
//# sourceMappingURL=ServiceContainer.d.ts.map