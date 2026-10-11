export interface SharedStateOptions {
    ttlMs?: number;
    encrypted?: boolean;
    persistent?: boolean;
    namespace?: string;
}
interface SharedStateEntry {
    pluginId: string;
    stateKey: string;
    value: any;
    updatedAt: number;
    expiresAt?: number;
    options?: SharedStateOptions;
    version: number;
}
type StateChangeListener = (key: string, value: any, metadata?: {
    version: number;
    pluginId: string;
}) => void;
export declare const registerSharedState: (pluginId: string, stateKey: string, initialValue: any, options?: SharedStateOptions) => void;
export declare const invalidateState: (keyOrPluginId: string, stateKey?: string, namespace?: string) => void;
export declare const setSharedState: (pluginId: string, stateKey: string, value: any, options?: SharedStateOptions) => void;
export declare const getSharedState: <T = any>(pluginId: string, stateKey: string, namespace?: string) => T | undefined;
export declare const getAllSharedState: (pluginId?: string) => SharedStateEntry[];
export declare const subscribeToState: (pluginId: string, stateKey: string, listener: StateChangeListener) => (() => void);
export declare const subscribeToAllStateChanges: (listener: StateChangeListener) => (() => void);
export declare const clearSharedState: (pluginId?: string) => void;
export declare const useSharedState: <T = any>(pluginId: string, stateKey: string) => [T | undefined, (value: T) => void];
interface PluginServiceEntry {
    pluginId: string;
    serviceName: string;
    service: any;
    registeredAt: number;
}
export declare const registerPluginService: <T>(pluginId: string, serviceName: string, service: T) => (() => void);
export declare const getPluginService: <T = any>(pluginId: string, serviceName: string) => T | undefined;
export declare const findServices: (serviceName: string) => PluginServiceEntry[];
export declare const getAllServices: (pluginId?: string) => PluginServiceEntry[];
export declare const usePluginService: <T = any>(pluginId: string, serviceName: string) => T | undefined;
export declare const clearPluginServices: (pluginId?: string) => void;
export interface ServiceContract<T> {
    name: string;
    version: string;
    pluginId: string;
    implementation: T;
    healthCheck?: () => boolean | Promise<boolean>;
}
export declare const ServiceBus: {
    publish<T>(contract: ServiceContract<T>): () => void;
    resolve<T>(name: string, version: string): T | undefined;
    resolveAsync<T>(name: string, version: string, timeoutMs?: number): Promise<T>;
    listAll(): Array<Omit<ServiceContract<unknown>, "implementation">>;
    healthCheck(name: string, version: string): Promise<boolean>;
};
export {};
