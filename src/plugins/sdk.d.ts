import React from 'react';
import { KubeResource } from '../types/kubernetes';
import { PluginEventType, emitPluginEvent, subscribeToPluginEvent } from './events';
import { SlotName } from './slotUtils';
import { getPluginById, getPlugins } from './registry';
import { ColumnExtension } from './columns';
import { PluginPermissions } from './permissions';
import { PluginPermissionScope, PluginPermissionManifest } from '../types/pluginPermissions';
import { ShortcutDefinition, ShortcutCategory } from '../services/shortcuts/ShortcutRegistry';
export { registerPluginSidebarEntry, getPluginSidebarEntries, usePluginSidebarEntries, } from './sidebarEntriesStore';
export type { ShortcutDefinition, ShortcutCategory };
export { registerOutputRenderer, getOutputRenderer } from './registry';
export type { OutputRendererProps, OutputRendererComponent } from './registry';
export type { PluginSidebarEntry } from './sidebarEntriesStore';
import { AnomalyReport, RemediationAction } from './AIOpsEngine';
import { CloudProvider, CloudResource, CloudCredential } from './MultiCloudManager';
export { getAllPluginSettings, getPluginSetting, setPluginSetting } from './PluginSettingsStore';
export type { PluginPermissionScope, PluginPermissionManifest, };
export { PERMISSION_SCOPE_HIERARCHY, PERMISSION_SCOPE_RISK, PERMISSIONS_REQUIRING_ADMIN_APPROVAL, isValidPermissionScope, getImplicitPermissions, calculateEffectivePermissions, requiresAdminApproval, getPermissionRisk, createPermissionManifest, validatePluginPermissions, } from '../types/pluginPermissions';
export type ResourceTransformFn = (resources: KubeResource[], context: ResourceTransformContext) => KubeResource[];
export interface ResourceTransformContext {
    namespace: string;
    resourceType: string;
    pluginId: string;
}
export type CustomActionHandler = (resource: KubeResource, context: ActionContext) => Promise<ActionResult>;
export interface ActionContext {
    namespace: string;
    resourceType: string;
    pluginId: string;
}
export type ActionOutputType = 'text' | 'html' | 'terminal' | 'component';
export interface ActionOutputPayload {
    type: ActionOutputType;
    content: string;
    data?: any;
}
export interface ActionResult {
    success: boolean;
    message?: string;
    data?: any;
    output?: ActionOutputPayload;
}
export interface CustomAction {
    pluginId: string;
    id: string;
    label: string;
    icon?: string;
    description?: string;
    resourceTypes: string[] | '*';
    handler: CustomActionHandler;
    requiresConfirmation?: boolean;
    outputMode?: 'dialog' | 'silent' | 'toast';
    place?: 'popup' | 'bottom' | 'right' | 'drawer' | 'external-terminal' | 'detached';
}
export interface PluginActionParam {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: string[];
    default?: string;
    prefix?: string;
}
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';
export interface ObservabilityMetric {
    pluginId: string;
    name: string;
    type: MetricType;
    value: number;
    labels?: Record<string, string>;
    timestamp: number;
    description?: string;
}
export interface ObservabilityTraceSpan {
    pluginId: string;
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    attributes?: Record<string, string | number | boolean>;
    status?: 'ok' | 'error';
    statusMessage?: string;
}
export interface FinOpsCostMetric {
    pluginId: string;
    resourceId: string;
    resourceType: string;
    estimatedCostUsd: number;
    period: 'hourly' | 'daily' | 'monthly';
    confidence: number;
    provider: 'aws' | 'gcp' | 'azure' | 'on-prem';
    timestamp: number;
}
export interface PluginActionTemplate {
    pluginId: string;
    id: string;
    description: string;
    icon: string;
    resourceTypes: string[] | '*';
    command: string;
    mode: 'individual' | 'bulk';
    outputMode?: 'dialog' | 'silent' | 'toast';
    place?: 'popup' | 'bottom' | 'right' | 'drawer' | 'external-terminal' | 'detached';
    mutating?: boolean;
    requiresConfirmation?: boolean;
    params?: PluginActionParam[];
    visibleWhen?: string;
    quickAction?: boolean;
    handler?: CustomActionHandler;
}
export interface ThemeOverride {
    pluginId: string;
    cssVariables?: Record<string, string>;
    componentOverrides?: Record<string, Record<string, any>>;
}
export interface PluginDataChannel {
    pluginId: string;
    channelId: string;
    data: any;
    timestamp: number;
}
export interface ScriptExecutionRequest {
    pluginId: string;
    command: string;
    args?: string[];
    timeout?: number;
    cwd?: string;
}
export interface ScriptExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
}
export declare const recordMetric: (metric: Omit<ObservabilityMetric, "timestamp">) => void;
export declare const recordTraceSpan: (span: Omit<ObservabilityTraceSpan, "startTime"> & {
    startTime?: number;
}) => void;
export declare const recordFinOpsCost: (cost: Omit<FinOpsCostMetric, "timestamp">) => void;
export declare const getObservabilityMetrics: (pluginId?: string) => ObservabilityMetric[];
export declare const getObservabilityTraces: (pluginId?: string) => ObservabilityTraceSpan[];
export declare const getFinOpsMetrics: (pluginId?: string) => FinOpsCostMetric[];
export declare const registerResourceTransform: (pluginId: string, transform: ResourceTransformFn, priority?: number) => (() => void);
export declare const applyResourceTransforms: (resources: KubeResource[], namespace: string, resourceType: string) => KubeResource[];
export declare const registerCustomAction: (action: CustomAction) => (() => void);
export declare const getCustomActions: (resourceType: string) => CustomAction[];
export declare const registerPluginActionTemplate: (template: PluginActionTemplate) => (() => void);
export declare const getPluginActionTemplates: (resourceType: string) => PluginActionTemplate[];
export declare const unregisterPluginActionTemplates: (pluginId: string) => void;
export declare const registerThemeOverride: (override: ThemeOverride) => (() => void);
export declare const getThemeOverrides: () => ThemeOverride[];
export declare const publishToChannel: (pluginId: string, channelId: string, data: any) => void;
export declare const subscribeToChannel: (channelId: string, listener: (data: PluginDataChannel) => void) => (() => void);
export declare const getChannelData: (channelId: string) => PluginDataChannel | undefined;
export declare const executeScript: (request: ScriptExecutionRequest) => Promise<ScriptExecutionResult>;
export interface PluginSDK {
    meta: {
        pluginId: string;
    };
    events: {
        emit: typeof emitPluginEvent;
        subscribe: typeof subscribeToPluginEvent;
        types: typeof PluginEventType;
    };
    slots: {
        register: (slotName: SlotName, component: React.FC<any>, priority?: number) => () => void;
        unregister: (slotName?: SlotName) => void;
    };
    resources: {
        addTransform: (transform: ResourceTransformFn, priority?: number) => () => void;
        getCustomActions: typeof getCustomActions;
        addAction: (action: Omit<CustomAction, 'pluginId'>) => () => void;
        addActionTemplate: (template: Omit<PluginActionTemplate, 'pluginId'>) => () => void;
    };
    data: {
        publish: (channelId: string, data: any) => void;
        subscribe: (channelId: string, listener: (data: PluginDataChannel) => void) => () => void;
        get: (channelId: string) => PluginDataChannel | undefined;
    };
    theme: {
        override: (override: Omit<ThemeOverride, 'pluginId'>) => () => void;
    };
    scripts: {
        execute: (command: string, args?: string[], timeout?: number) => Promise<ScriptExecutionResult>;
    };
    ai: {
        registerContextProvider: (label: string, getContext: () => Promise<string> | string) => void;
        unregisterContextProviders: () => void;
        reportAnomaly: (report: Omit<AnomalyReport, 'timestamp'>) => void;
        registerRemediation: (action: Omit<RemediationAction, 'pluginId'>) => () => void;
        getRemediations: () => RemediationAction[];
        executeRemediation: (id: string, context: any) => Promise<{
            success: boolean;
            result?: any;
            error?: string;
        }>;
    };
    plugins: {
        getAll: typeof getPlugins;
        getById: typeof getPluginById;
    };
    state: {
        register: (key: string, initialValue: any) => void;
        set: (key: string, value: any) => void;
        get: <T = any>(key: string) => T | undefined;
        subscribe: (key: string, listener: (key: string, value: any) => void) => () => void;
        clear: () => void;
    };
    services: {
        register: <T>(serviceName: string, service: T) => () => void;
        get: <T = any>(targetPluginId: string, serviceName: string) => T | undefined;
        find: (serviceName: string) => Array<{
            pluginId: string;
            service: any;
        }>;
        clear: () => void;
    };
    columns: {
        add: (extension: Omit<ColumnExtension, 'pluginId'>) => () => void;
        getForType: (resourceType: string) => ColumnExtension[];
        removeAll: () => void;
    };
    permissions: {
        check: (permission: keyof PluginPermissions) => boolean;
        getAll: () => PluginPermissions;
    };
    dependencies: {
        register: (deps: string[], optionalDeps?: string[]) => void;
        validate: (availablePlugins: string[]) => {
            valid: boolean;
            missingRequired: string[];
            missingOptional: string[];
        };
        getDependents: () => string[];
    };
    settings: {
        get: <T = unknown>(key: string, defaultValue: T) => T;
        set: (key: string, value: unknown) => void;
        getAll: () => Record<string, unknown>;
    };
    shortcuts: {
        register: (def: Omit<ShortcutDefinition, 'pluginId'>) => () => void;
        unregisterAll: () => void;
    };
    observability: {
        metric: (metric: Omit<ObservabilityMetric, 'pluginId' | 'timestamp'>) => void;
        trace: (span: Omit<ObservabilityTraceSpan, 'pluginId' | 'startTime'> & {
            startTime?: number;
        }) => void;
        finops: (cost: Omit<FinOpsCostMetric, 'pluginId' | 'timestamp'>) => void;
    };
    performance: {
        runInWorker: <T = any>(taskName: string, payload: any, timeoutMs?: number) => Promise<{
            success: boolean;
            data?: T;
            error?: string;
            durationMs: number;
        }>;
    };
    cloud: {
        isConfigured: (provider: CloudProvider) => boolean;
        getCredentials: () => CloudCredential[];
        fetchResources: (provider: CloudProvider, resourceType?: string) => Promise<CloudResource[]>;
    };
    logging: {
        info: (message: string, correlationId?: string, context?: Record<string, unknown>) => void;
        warn: (message: string, correlationId?: string, context?: Record<string, unknown>) => void;
        error: (message: string, correlationId?: string, context?: Record<string, unknown>) => void;
        debug: (message: string, correlationId?: string, context?: Record<string, unknown>) => void;
        fatal: (message: string, correlationId?: string, context?: Record<string, unknown>) => void;
    };
}
export declare const createPluginSDK: (pluginId: string) => PluginSDK;
export declare const SDK_VERSION = "2.0.0";
export interface SDKCompatibilityResult {
    compatible: boolean;
    requiredVersion: string;
    currentVersion: string;
    reason?: string;
}
export declare const checkSdkCompatibility: (minRequired: string) => SDKCompatibilityResult;
export declare const validatePluginSdkVersion: (pluginId: string, minSdkVersion: string | undefined) => boolean;
export interface PluginIPCDescriptor<TArgs = unknown, TResult = unknown> {
    channelId: string;
    pluginId: string;
    description: string;
    handler: (args: TArgs) => Promise<TResult>;
}
export declare const registerPluginIPCHandler: <TArgs, TResult>(descriptor: PluginIPCDescriptor<TArgs, TResult>) => (() => void);
export declare const callPluginIPCHandler: <TResult>(pluginId: string, channelId: string, args: unknown) => Promise<TResult>;
export declare const getPluginIPCHandlers: (pluginId?: string) => PluginIPCDescriptor[];
export interface ThemeTokenRequirement {
    token: string;
    fallback: string;
    description: string;
    required: boolean;
}
export interface PluginThemeContract {
    pluginId: string;
    tokens: ThemeTokenRequirement[];
}
export declare const registerThemeContract: (contract: PluginThemeContract) => (() => void);
export declare const getThemeContract: (pluginId: string) => PluginThemeContract | undefined;
export declare const getAllThemeContracts: () => PluginThemeContract[];
export declare const validateThemeContract: (pluginId: string) => {
    valid: boolean;
    missing: string[];
};
export interface WorkerTask<T = unknown> {
    pluginId: string;
    taskId: string;
    fnBody: string;
    args: unknown[];
    timeoutMs?: number;
}
export interface WorkerTaskResult<T = unknown> {
    taskId: string;
    pluginId: string;
    result?: T;
    error?: string;
    durationMs: number;
}
export declare const WorkerPool: {
    submit<T = unknown>(task: WorkerTask<T>): Promise<WorkerTaskResult<T>>;
    terminateAll(): void;
    activeTaskCount(): number;
};
