interface NodeMetricsEntry {
    cpuPercent: number;
    memoryPercent: number;
    cpuCores: string;
    memoryBytes: string;
}
interface PodMetricsEntry {
    cpu: string;
    memory: string;
}
interface MetricsState {
    nodeMetrics: Record<string, NodeMetricsEntry>;
    podMetrics: Record<string, PodMetricsEntry>;
    loading: boolean;
    error: string | null;
    lastUpdated: number;
    fetchMetrics: () => Promise<void>;
}
export declare const useMetricsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<MetricsState>>;
export declare const startMetricsPolling: () => void;
export declare const stopMetricsPolling: () => void;
export {};
