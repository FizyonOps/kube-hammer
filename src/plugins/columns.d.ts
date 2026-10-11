import React from 'react';
export interface ColumnExtension {
    pluginId: string;
    columnId: string;
    label: string;
    resourceTypes: string[] | '*';
    render?: (resource: any, allResources: any[]) => React.ReactNode;
    getValue?: (resource: any) => any;
    sortable?: boolean;
    align?: 'left' | 'right' | 'center';
    minWidth?: number;
    defaultHidden?: boolean;
    priority?: number;
}
export declare const registerColumnExtension: (extension: ColumnExtension) => (() => void);
export declare const getColumnExtensions: (resourceType: string) => ColumnExtension[];
export declare const getAllColumnExtensions: () => ColumnExtension[];
export declare const useColumnExtensions: (resourceType: string) => ColumnExtension[];
export declare const unregisterPluginColumns: (pluginId: string) => void;
export declare const clearAllColumnExtensions: () => void;
export interface ColumnCellRenderer {
    pluginId: string;
    columnId: string;
    render: (value: any, row: any) => React.ReactNode;
}
export declare const registerColumnCellRenderer: (renderer: ColumnCellRenderer) => (() => void);
export declare const getColumnCellRenderers: () => ColumnCellRenderer[];
export declare const useColumnCellRenderers: () => ColumnCellRenderer[];
export declare const unregisterPluginCellRenderers: (pluginId: string) => void;
