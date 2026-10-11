export type PodContainerKind = 'main' | 'init' | 'ephemeral';
export interface PodContainerEntry {
    name: string;
    kind: PodContainerKind;
}
interface UsePodContainersOptions {
    podName: string;
    namespace: string;
    enabled: boolean;
    includeInitContainers?: boolean;
}
export declare function usePodContainers({ podName, namespace, enabled, includeInitContainers, }: UsePodContainersOptions): {
    containers: PodContainerEntry[];
    selectedContainer: string;
    setSelectedContainer: import("react").Dispatch<import("react").SetStateAction<string>>;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<PodContainerEntry[]>;
};
export {};
