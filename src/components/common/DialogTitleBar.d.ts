import React from 'react';
interface DialogTitleBarProps {
    title: React.ReactNode;
    onClose: () => void;
    children?: React.ReactNode;
}
export declare const DialogTitleBar: React.FC<DialogTitleBarProps>;
export {};
