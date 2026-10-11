import React from 'react';
import { SxProps, Theme } from '@mui/material';
interface KubeStateViewProps {
    loading?: boolean;
    error?: string | null;
    empty?: boolean;
    emptyMessage?: React.ReactNode;
    errorAction?: React.ReactNode;
    loadingLabel?: React.ReactNode;
    loadingSize?: number;
    minHeight?: number | string;
    fill?: boolean;
    sx?: SxProps<Theme>;
    children?: React.ReactNode;
}
export declare const KubeStateView: React.FC<KubeStateViewProps>;
export {};
