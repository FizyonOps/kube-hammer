import { PluginPermissionScope, PluginPermissionManifest } from '../types/pluginPermissions';
export interface PluginPermissions {
    accessLocalStorage: boolean;
    accessNetwork: boolean;
    modifyTheme: boolean;
    executeCommands: boolean;
    registerSlots: boolean;
    transformResources: boolean;
    registerActions: boolean;
    accessAI: boolean;
    interPluginComm: boolean;
    accessClipboard: boolean;
    readClusterState: boolean;
    writeClusterState: boolean;
    readSecrets: boolean;
    accessAuditLogs: boolean;
    accessMetrics: boolean;
    manageBackups: boolean;
    manageGitOps: boolean;
    impersonateUsers: boolean;
    managePolicies: boolean;
    accessCloudProvider: boolean;
}
export declare const DEFAULT_PERMISSIONS: PluginPermissions;
export declare const FULL_PERMISSIONS: PluginPermissions;
export declare const PERMISSION_LABELS: Record<keyof PluginPermissions, string>;
export declare const PERMISSION_RISK: Record<keyof PluginPermissions, 'low' | 'medium' | 'high' | 'critical'>;
export interface PermissionGrant {
    version: string;
    permissions: Partial<PluginPermissions>;
    grantedAt: number;
}
export type PermissionApprovalSource = 'marketplace' | 'local' | 'bundled';
export interface PermissionApprovalDecision {
    pendingApproval: boolean;
    escalatedPermissions: (keyof PluginPermissions)[];
}
export declare const setPluginPermissions: (pluginId: string, permissions: PluginPermissions) => void;
export declare const getPluginPermissions: (pluginId: string) => PluginPermissions;
export declare const hasPermission: (pluginId: string, permission: keyof PluginPermissions) => boolean;
export declare const grantPermission: (pluginId: string, permission: keyof PluginPermissions) => void;
export declare const revokePermission: (pluginId: string, permission: keyof PluginPermissions) => void;
export declare const grantAllPermissions: (pluginId: string) => void;
export declare const loadPersistedPermissions: () => void;
export declare const getAllGrantedPermissions: () => Map<string, PluginPermissions>;
export declare const clearPluginPermissions: (pluginId: string) => void;
export declare const recordPermissionGrant: (pluginId: string, version: string, permissions: Partial<PluginPermissions>) => void;
export declare const getPermissionGrant: (pluginId: string) => PermissionGrant | undefined;
export declare const clearPermissionGrant: (pluginId: string) => void;
export declare const computePermissionEscalation: (oldPerms: Partial<PluginPermissions>, newPerms: Partial<PluginPermissions>) => (keyof PluginPermissions)[];
export declare const getPermissionApprovalDecision: (previousGrant: PermissionGrant | undefined, requestedPermissions: Partial<PluginPermissions>, source: PermissionApprovalSource) => PermissionApprovalDecision;
export declare const setPluginPermissionScopes: (pluginId: string, scopes: PluginPermissionScope[]) => void;
export declare const getPluginPermissionScopes: (pluginId: string) => PluginPermissionScope[];
export declare const getEffectivePluginPermissions: (pluginId: string) => Set<PluginPermissionScope>;
export declare const hasPluginPermissionScope: (pluginId: string, scope: PluginPermissionScope) => boolean;
export declare const getPluginScopesRequiringAdminApproval: (pluginId: string) => PluginPermissionScope[];
export declare const recordPermissionManifest: (manifest: PluginPermissionManifest) => void;
export declare const getPermissionManifest: (pluginId: string) => PluginPermissionManifest | undefined;
export declare const hasAdminApproval: (pluginId: string) => boolean;
export declare const grantAdminApproval: (pluginId: string, approverId: string) => void;
export declare const revokeAdminApproval: (pluginId: string) => void;
export declare const validateMinimumPermissionForOperation: (pluginId: string, requiredScope: PluginPermissionScope) => boolean;
export declare const loadPersistedPermissionScopes: () => void;
export declare const loadPersistedPermissionManifests: () => void;
export declare const clearPluginPermissionScopes: (pluginId: string) => void;
export declare const getAllPluginPermissionScopes: () => Map<string, PluginPermissionScope[]>;
export declare const computePermissionScopeEscalation: (oldScopes: PluginPermissionScope[], newScopes: PluginPermissionScope[]) => PluginPermissionScope[];
export declare const loadPersistedGrants: () => void;
