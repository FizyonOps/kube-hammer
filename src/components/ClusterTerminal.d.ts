import React from 'react';
import '@xterm/xterm/css/xterm.css';
interface ClusterTerminalProps {
    open: boolean;
    onClose: () => void;
    contextName?: string;
    panelMode?: boolean;
    active?: boolean;
    initialCommand?: string;
}
export declare const ClusterTerminal: React.FC<ClusterTerminalProps>;
export {};
