import React from 'react';
export type PluginCategory = 'ui' | 'data' | 'action' | 'integration' | 'visualization' | 'analysis' | 'ai' | 'utility' | 'observability' | 'finops' | 'security' | 'gitops' | 'backup' | 'ai-ops' | 'multi-cloud' | 'governance' | 'troubleshooting' | 'operators' | 'collusion-prevention';
export interface PluginCapabilities {
    slots?: import('./slotUtils').SlotName[];
    events?: {
        emits?: string[];
        subscribes?: string[];
    };
    dataChannels?: {
        publishes?: string[];
        subscribes?: string[];
    };
    columnExtensions?: string[];
    customActions?: string[];
    ipcChannels?: string[];
    sidebar?: boolean;
    themeOverride?: boolean;
    aiContextProvider?: boolean;
    workerPool?: boolean;
}
export interface PluginLifecycle {
    onEnable?: () => (() => void) | void;
    onDisable?: () => void;
    onContextChange?: (contextName: string) => void;
    onNamespaceChange?: (namespace: string) => void;
    onResourceSelect?: (resourceType: string) => void;
}
export interface AIContextProvider {
    pluginId: string;
    label: string;
    priority?: number;
    ttlMs?: number;
    getContext: () => Promise<string> | string;
}
export type AIContextProviderState = 'ready' | 'empty' | 'timeout' | 'error' | 'disabled' | 'denied';
export interface AIContextProviderResult {
    providerId: string;
    pluginId: string;
    label: string;
    content: string;
    charCount: number;
    state: AIContextProviderState;
    message?: string;
}
interface CollectAIContextProviderOptions {
    enabledProviderIds?: Record<string, boolean>;
    enforcePermissions?: boolean;
    includeSkipped?: boolean;
    timeoutMs?: number;
}
export interface PluginToolParam {
    type: string;
    description: string;
    required?: boolean;
    enum?: string[];
}
export interface PluginToolSpec {
    name: string;
    description: string;
    inputSchema: Record<string, PluginToolParam>;
    example?: string;
}
export interface PluginCapabilitySpec {
    summary: string;
    tools: PluginToolSpec[];
}
export interface PluginDefinition {
    id: string;
    label: string;
    description: string;
    enabledByDefault: boolean;
    SettingsPanel?: React.FC | null;
    category?: PluginCategory;
    lifecycle?: PluginLifecycle;
    requiredTier?: 'pro' | 'enterprise';
    capabilities?: PluginCapabilitySpec;
    runtimeCapabilities?: PluginCapabilities;
    minSdkVersion?: string;
    defaultPermissions?: Partial<import('./permissions').PluginPermissions>;
}
export declare const registerPlugin: (def: PluginDefinition) => void;
export declare const registerAIContextProvider: (provider: AIContextProvider) => void;
export declare const unregisterAIContextProviders: (pluginId: string) => void;
export declare const collectAIContext: (options?: CollectAIContextProviderOptions) => Promise<AIContextProviderResult[]>;
export declare const getPlugins: () => PluginDefinition[];
export declare const getPluginById: (id: string) => PluginDefinition | undefined;
export declare const getPluginsByCategory: (category: PluginCategory) => PluginDefinition[];
export declare const getAIContextProviders: () => AIContextProvider[];
export type OutputRendererProps = {
    data: any;
    onClose?: () => void;
};
export type OutputRendererComponent = React.FC<OutputRendererProps>;
export declare const registerOutputRenderer: (id: string, component: OutputRendererComponent) => void;
export declare const getOutputRenderer: (id: string) => OutputRendererComponent | undefined;
export declare const enablePlugin: (pluginId: string) => Promise<boolean>;
export declare const disablePlugin: (pluginId: string) => void;
export declare const notifyContextChange: (contextName: string, enabledIds: string[]) => void;
export declare const notifyNamespaceChange: (namespace: string, enabledIds: string[]) => void;
export declare const notifyResourceSelect: (resourceType: string, enabledIds: string[]) => void;
export interface AIContextSnapshot {
    providerId: string;
    label: string;
    content: string;
    charCount: number;
    state: AIContextProviderState;
    message?: string;
}
export interface GatheredAIContext {
    content: string;
    providers: AIContextProviderResult[];
}
export declare const collectAIContextProviders: (options?: CollectAIContextProviderOptions) => Promise<AIContextProviderResult[]>;
export declare const previewAIContextProviders: () => Promise<AIContextSnapshot[]>;
export declare const gatherAIContextDetails: (enabledProviderIds?: Record<string, boolean>) => Promise<GatheredAIContext>;
export declare const gatherAIContext: (enabledProviderIds?: Record<string, boolean>) => Promise<string>;
export declare const getPluginsWithCapabilities: () => Array<PluginDefinition & {
    capabilities: PluginCapabilitySpec;
}>;
export {};
