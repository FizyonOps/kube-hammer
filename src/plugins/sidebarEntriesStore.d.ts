import React from 'react';
export interface PluginSidebarEntry {
    pluginId: string;
    id: string;
    label: string;
    icon: string;
    component: React.FC;
    topLevel?: boolean;
    category?: string;
}
export declare const registerPluginSidebarEntry: (entry: PluginSidebarEntry) => (() => void);
export declare const getPluginSidebarEntries: () => PluginSidebarEntry[];
export declare const usePluginSidebarEntries: () => PluginSidebarEntry[];
