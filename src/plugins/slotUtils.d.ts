export type SlotName = 'sidebar-top' | 'sidebar-bottom' | 'toolbar-left' | 'toolbar-right' | 'resource-actions' | 'details-panel-top' | 'details-panel-bottom' | 'main-panel-bottom';
export interface PluginSlotItem {
    pluginId: string;
    slotName: SlotName;
    component: React.FC<any>;
    priority: number;
    condition?: () => boolean;
}
export declare const slotListeners: Set<() => void>;
export declare const registerPluginSlot: (item: PluginSlotItem) => void;
export declare const unregisterPluginSlot: (pluginId: string, slotName?: SlotName) => void;
export declare const getSlotItems: (slotName: SlotName) => PluginSlotItem[];
