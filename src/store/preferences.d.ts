export interface TableSortState {
    orderBy: string;
    order: 'asc' | 'desc';
}
export interface ClearedTableSortState {
    orderBy: null;
    order: null;
}
export type PersistedTableSortState = TableSortState | ClearedTableSortState;
export declare function areTableSortStatesEqual(left: TableSortState | null | undefined, right: TableSortState | null | undefined): boolean;
export declare function arePersistedTableSortStatesEqual(left: PersistedTableSortState | null | undefined, right: PersistedTableSortState | null | undefined): boolean;
export declare function getNextTableSortState(currentSortState: TableSortState | null, property: string): TableSortState | null;
export declare function toPersistedTableSortState(sortState: TableSortState | null): PersistedTableSortState;
export declare function resolveTableSortState(storedSortState: PersistedTableSortState | null | undefined, defaultSortState: TableSortState): TableSortState | null;
export declare function sanitizePersistedTableSort(value: unknown): Record<string, PersistedTableSortState>;
export type AIExecutionAction = 'get' | 'describe' | 'logs' | 'exec' | 'delete' | 'apply' | 'patch' | 'scale' | 'rollout' | 'port-forward';
export interface AIExecutionOption {
    id: AIExecutionAction;
    label: string;
    description: string;
    risk: 'read' | 'interactive' | 'write' | 'delete';
}
export declare const AI_EXECUTION_OPTIONS: AIExecutionOption[];
export declare const DEFAULT_AI_ALLOWED_EXECUTIONS: AIExecutionAction[];
export declare function isAiExecutionAllowed(preferences: Preferences, action: AIExecutionAction): boolean;
export interface Preferences {
    themeMode: 'light' | 'dark' | 'system';
    autoRefreshInterval: number;
    defaultRowsPerPage: 10 | 25 | 100;
    tableSize: 'small' | 'medium';
    defaultStartupResource: string;
    lastSelectedResourceTypes: string[];
    confirmBeforeDelete: boolean;
    showResourceCountBadge: boolean;
    multiSelectOnClick: boolean;
    detailFieldVisibility: Record<string, Record<string, boolean>>;
    enabledPlugins: string[];
    pinnedCategories: string[];
    maxExpandedCategories: number;
    autoUpdate: boolean;
    enabledPluginIds: string[];
    refreshOnWindowFocus: boolean;
    pauseRefreshOnError: boolean;
    persistedColumnState: Record<string, {
        visibleColumns: string[];
        columnOrder: string[];
        columnWidths?: Record<string, number>;
    }>;
    customStatusColors: Record<string, string>;
    badgeCountMode: 'total' | 'running' | 'error';
    showRowNumbers: boolean;
    highlightAlternateRows: boolean;
    relationshipGraphEnabled: boolean;
    relationshipAutoExpand: boolean;
    troubleshootEnabled: boolean;
    troubleshootAutoFetchLogs: boolean;
    troubleshootAutoFetchEvents: boolean;
    multiClusterEnabled: boolean;
    multiClusterAutoRefresh: boolean;
    cloudAuthDetectionEnabled: boolean;
    cloudAuthShowInToolbar: boolean;
    metricsEnabled: boolean;
    metricsAutoRefresh: boolean;
    yamlValidationEnabled: boolean;
    yamlValidationShowBestPractices: boolean;
    securityAuditEnabled: boolean;
    securityAuditAutoRun: boolean;
    aiAssistantEnabled: boolean;
    aiEndpointUrl: string;
    aiEndpointType: 'ollama' | 'openai-compatible' | 'fizyonai';
    aiModelName: string;
    aiApiKey: string;
    aiRequestTimeoutSeconds: number;
    aiMaxTokens: number;
    aiIncludeClusterContext: boolean;
    aiIncludeNamespace: boolean;
    aiContextProviderSettings: Record<string, boolean>;
    aiSystemPromptEnabled: boolean;
    aiTemperature: number;
    aiAllowedExecutions: AIExecutionAction[];
    aiRedactionEnabled: boolean;
    aiGitOpsMode: boolean;
    aiAutoSendCommandOutputs: boolean;
    aiAgentMode: boolean;
    aiContextLevel: 'minimal' | 'standard' | 'deep';
    aiRedactionPatternOverrides: Record<string, boolean>;
    aiCustomRedactionPatterns: Array<{
        id: string;
        name: string;
        pattern: string;
        enabled: boolean;
    }>;
    bestFitColumns: boolean;
    telemetryEnabled: boolean;
    favoriteContexts: string[];
    recentContexts: string[];
    rootControllerClickEnabled: boolean;
    resourceStateAlertsEnabled: boolean;
    controlledByClickEnabled: boolean;
    helmToolsMode: 'auto' | 'always' | 'disabled';
    fluxToolsMode: 'auto' | 'always' | 'disabled';
    cellLinkColumns: string[];
    minimizeToTray: boolean;
    recentNamespaces: string[];
    lastNamespace: string;
    lastNamespaces: string[];
    lastContext: string;
    lastFilterText: string;
    tableSort: Record<string, PersistedTableSortState>;
    copyIconRevealKey: string;
    clipboardHistoryItems: string[];
    clipboardHistoryLimit: number;
    hotbarViews: SavedView[];
    sidebarTab: 'nav' | 'actions';
    aiAssistantWidth: number;
    sidebarCollapsed: boolean;
    resourceDetailViewMode: 'hidden' | 'inline' | 'compare' | 'right' | 'drawer';
    resourceBottomPanelHeight: number;
    resourceRightPanelWidth: number;
    applyStrategy: 'client' | 'server-side';
    actionOrder: Record<string, string[]>;
    primaryActionLimit: Record<string, number>;
    lastActionOutputPlace: 'popup' | 'bottom' | 'right' | 'drawer' | 'detached' | null;
    actionOutputDrawerWidth: number;
    resourceDetailDrawerWidth: number;
    confirmBeforeContextSwitch: boolean;
    clusterRailEnabled: boolean;
    paidTierPluginsSeededFor: 'none' | 'pro' | 'enterprise';
}
interface SavedView {
    id: string;
    name: string;
    resourceType: string;
    namespace?: string;
    filters?: Record<string, string>;
    pinned: boolean;
}
export declare const DEFAULT_PREFERENCES: Preferences;
export declare function flushPreferencesPersistence(sync?: boolean): void;
export declare function loadPreferences(): Preferences;
interface PreferencesStore {
    preferences: Preferences;
    setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
    setPreferences: (updates: Partial<Preferences>) => void;
    resetPreferences: () => void;
}
export declare const usePreferences: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<PreferencesStore>, "setState" | "devtools"> & {
    setState(partial: PreferencesStore | Partial<PreferencesStore> | ((state: PreferencesStore) => PreferencesStore | Partial<PreferencesStore>), replace?: false | undefined, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): void;
    setState(state: PreferencesStore | ((state: PreferencesStore) => PreferencesStore), replace: true, action?: (string | {
        [x: string]: unknown;
        [x: number]: unknown;
        [x: symbol]: unknown;
        type: string;
    }) | undefined): void;
    devtools: {
        cleanup: () => void;
    };
}>;
export declare function getPreferencesSnapshot(): Preferences;
export declare function subscribePreferences(listener: (preferences: Preferences) => void): () => void;
export declare function usePreference<K extends keyof Preferences>(key: K): Preferences[K];
export declare function usePreferenceSelector<T>(selector: (prefs: Preferences) => T): T;
export declare function useSetPreference(): PreferencesStore['setPreference'];
export declare function useSetPreferences(): PreferencesStore['setPreferences'];
export declare function useResetPreferences(): PreferencesStore['resetPreferences'];
export {};
