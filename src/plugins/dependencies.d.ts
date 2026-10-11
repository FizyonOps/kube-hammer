interface DependencyNode {
    pluginId: string;
    dependencies: string[];
    optionalDependencies: string[];
}
interface ResolvedOrder {
    ordered: string[];
    missing: Array<{
        pluginId: string;
        missingDep: string;
    }>;
    circular: string[][];
}
export declare const registerPluginDependencies: (pluginId: string, dependencies?: string[], optionalDependencies?: string[]) => void;
export declare const getPluginDependencies: (pluginId: string) => DependencyNode | undefined;
export declare const getDependents: (pluginId: string) => string[];
export declare const canDisablePlugin: (pluginId: string, enabledIds: string[]) => {
    allowed: boolean;
    blockers: string[];
};
export declare const resolveDependencyOrder: (pluginIds: string[]) => ResolvedOrder;
export declare const validateDependencies: (pluginId: string, availablePlugins: string[]) => {
    valid: boolean;
    missingRequired: string[];
    missingOptional: string[];
};
export declare const clearDependencyGraph: () => void;
export {};
