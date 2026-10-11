export interface KubeResource {
    name: string;
    namespace: string;
    status?: string;
    ready?: string;
    restarts?: number;
    age: string;
    type: string;
    [key: string]: any;
}
