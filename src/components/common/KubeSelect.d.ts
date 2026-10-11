import React from 'react';
interface KubeSelectOption<T extends string = string> {
    value: T;
    label: string;
    secondaryLabel?: string;
    icon?: React.ReactNode;
    group?: string;
}
interface KubeSelectSingleProps<T extends string = string> {
    label?: string;
    ariaLabel?: string;
    value: T;
    onChange: (value: T) => void;
    options: KubeSelectOption<T>[];
    multiple?: false;
    disabled?: boolean;
    size?: 'small' | 'medium';
    minWidth?: number;
    width?: number;
    maxVisibleOptions?: number;
    groupOrder?: string[];
    placeholder?: string;
    disableClearable?: boolean;
    sx?: Record<string, unknown>;
    onOptionHover?: (value: T) => void;
}
interface KubeSelectMultiProps<T extends string = string> {
    label?: string;
    ariaLabel?: string;
    value: T[];
    onChange: (value: T[]) => void;
    options: KubeSelectOption<T>[];
    multiple: true;
    disabled?: boolean;
    size?: 'small' | 'medium';
    minWidth?: number;
    width?: number;
    maxVisibleOptions?: number;
    groupOrder?: string[];
    placeholder?: string;
    disableClearable?: boolean;
    sx?: Record<string, unknown>;
    onOptionHover?: (value: T) => void;
}
type KubeSelectProps<T extends string = string> = KubeSelectSingleProps<T> | KubeSelectMultiProps<T>;
export declare const KubeSelect: <T extends string = string>(props: KubeSelectProps<T>) => React.ReactElement;
export {};
