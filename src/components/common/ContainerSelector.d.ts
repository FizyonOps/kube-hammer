import React from 'react';
import type { PodContainerEntry } from '../../hooks/usePodContainers';
interface ContainerSelectorProps {
    containers: PodContainerEntry[];
    selectedContainer: string;
    onChange: (container: string) => void;
    disabled?: boolean;
}
export declare const ContainerSelector: React.FC<ContainerSelectorProps>;
export {};
