import React from 'react';
import '@xterm/xterm/css/xterm.css';
interface PodTerminalProps {
    open: boolean;
    onClose: () => void;
    podName: string;
    namespace: string;
    title?: string;
    terminalCommand?: string[];
    panelMode?: boolean;
    active?: boolean;
    onNodeShellCleanup?: (nodeName: string) => void;
}
export declare const PodTerminal: React.FC<PodTerminalProps>;
export {};
