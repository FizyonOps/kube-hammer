export type PluginPermissionScope = 'readPods' | 'writePods' | 'readSecrets' | 'writeSecrets' | 'execIntoPod' | 'manageDeployments' | 'adminK8s';
export declare const PERMISSION_SCOPE_HIERARCHY: Record<PluginPermissionScope, PluginPermissionScope[]>;
export declare const PERMISSION_SCOPE_RISK: Record<PluginPermissionScope, 'low' | 'medium' | 'high' | 'critical'>;
export declare const PERMISSIONS_REQUIRING_ADMIN_APPROVAL: Set<PluginPermissionScope>;
export interface PluginPermissionManifest {
    pluginId: string;
    requestedScopes: PluginPermissionScope[];
    scopeJustifications: Record<PluginPermissionScope, string>;
    adminApprovalGranted?: boolean;
    approvalTimestamp?: number;
    approverId?: string;
}
export interface PluginPermissionValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    requiresAdminApproval: PluginPermissionScope[];
}
export declare function validatePluginPermissions(pluginId: string, requestedPermissions: string[]): void;
export declare function isValidPermissionScope(permission: string): permission is PluginPermissionScope;
export declare function getImplicitPermissions(scope: PluginPermissionScope): PluginPermissionScope[];
export declare function calculateEffectivePermissions(scopes: PluginPermissionScope[]): Set<PluginPermissionScope>;
export declare function requiresAdminApproval(scope: PluginPermissionScope): boolean;
export declare function getPermissionRisk(scope: PluginPermissionScope): 'low' | 'medium' | 'high' | 'critical';
export declare function createPermissionManifest(pluginId: string, requestedScopes: PluginPermissionScope[], scopeJustifications: Record<PluginPermissionScope, string>): PluginPermissionManifest;
