export declare enum PluginEventType {
    KUBE_CONTEXT_CHANGED = "kube:context:changed",
    KUBE_NAMESPACE_CHANGED = "kube:namespace:changed",
    KUBE_RESOURCE_SELECTED = "kube:resource:selected",
    RESOURCE_LIST_UPDATED = "kube:resource:list:updated",
    PREFERENCES_CHANGED = "plugin:preferences:changed",
    PLUGIN_ENABLED = "plugin:enabled",
    PLUGIN_DISABLED = "plugin:disabled"
}
export interface PluginEventPayloadMap {
    [PluginEventType.KUBE_CONTEXT_CHANGED]: {
        contextName: string;
    };
    [PluginEventType.KUBE_NAMESPACE_CHANGED]: {
        namespace: string;
    };
    [PluginEventType.KUBE_RESOURCE_SELECTED]: {
        resourceType: string;
        resourceName: string;
        namespace: string;
    };
    [PluginEventType.RESOURCE_LIST_UPDATED]: {
        resourceType: string;
        namespace: string;
        count: number;
    };
    [PluginEventType.PREFERENCES_CHANGED]: {
        key: string;
        value: unknown;
    };
    [PluginEventType.PLUGIN_ENABLED]: {
        pluginId: string;
    };
    [PluginEventType.PLUGIN_DISABLED]: {
        pluginId: string;
    };
}
export type TypedPluginEvent<T extends PluginEventType> = {
    type: T;
    payload: PluginEventPayloadMap[T];
};
export interface PluginEvent {
    type: PluginEventType;
    payload?: any;
}
type PluginEventHandler = (event: PluginEvent) => void;
export declare const emitPluginEvent: (event: PluginEvent) => void;
export declare const subscribeToPluginEvent: (type: PluginEventType, handler: PluginEventHandler) => (() => void);
export declare const clearAllSubscriptions: () => void;
export {};
