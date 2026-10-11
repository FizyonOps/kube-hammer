export declare const PLUGIN_SETTINGS_STORAGE_KEY = "kube-hammer-plugin-settings";
export declare const PLUGIN_SETTINGS_FLUSH_DELAY_MS = 300;
type PluginSettingsMap = Record<string, Record<string, unknown>>;
interface PluginSettingsStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export interface PluginSettingsStore {
    get<T>(pluginId: string, key: string, defaultValue: T): T;
    set(pluginId: string, key: string, value: unknown): void;
    getAll(pluginId: string): Record<string, unknown>;
    flush(): void;
}
export declare function parsePluginSettings(raw: string | null | undefined): PluginSettingsMap;
export declare function serializePluginSettings(all: PluginSettingsMap): string;
export declare function createPluginSettingsStore(storageProvider?: () => PluginSettingsStorage | null): PluginSettingsStore;
export declare const getPluginSetting: <T = unknown>(pluginId: string, key: string, defaultValue: T) => T;
export declare const setPluginSetting: (pluginId: string, key: string, value: unknown) => void;
export declare const getAllPluginSettings: (pluginId: string) => Record<string, unknown>;
export declare const flushPluginSettings: () => void;
export {};
