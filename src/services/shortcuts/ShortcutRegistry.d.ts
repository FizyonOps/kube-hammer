export type ShortcutCategory = 'general' | 'navigation' | 'actions' | 'view' | 'plugin';
export interface ShortcutDefinition {
    id: string;
    keys: string[];
    description: string;
    category: ShortcutCategory;
    pluginId?: string;
    targetQuery?: string;
    condition?: () => boolean;
}
export declare const registerShortcut: (def: ShortcutDefinition) => (() => void);
export declare const unregisterPluginShortcuts: (pluginId: string) => void;
export declare const getAllShortcuts: () => ShortcutDefinition[];
export declare const getShortcutsForStage: (heldModifiers: string[]) => ShortcutDefinition[];
export declare const useShortcuts: () => ShortcutDefinition[];
