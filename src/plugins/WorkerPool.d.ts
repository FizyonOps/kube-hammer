export interface WorkerTaskConfig {
    pluginId: string;
    taskName: string;
    payload: any;
    timeoutMs?: number;
}
export interface WorkerTaskResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    durationMs: number;
}
declare class PluginWorkerPool {
    private readonly maxWorkers;
    private readonly queue;
    private activeTasks;
    constructor(maxWorkers?: number);
    executeTask(config: WorkerTaskConfig): Promise<WorkerTaskResult<any>>;
    private processQueue;
    getMetrics(): {
        activeTasks: number;
        queuedTasks: number;
        maxWorkers: number;
    };
}
export declare const pluginWorkerPool: PluginWorkerPool;
export {};
