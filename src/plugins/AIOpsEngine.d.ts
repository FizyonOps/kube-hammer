export interface AnomalyReport {
    resourceId: string;
    resourceType: string;
    metric: string;
    anomalyScore: number;
    description: string;
    timestamp: number;
}
export interface RemediationAction {
    id: string;
    pluginId: string;
    name: string;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
    execute: (context: any) => Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
}
declare class AIOpsEngine {
    private anomalyHandlers;
    private remediationHooks;
    reportAnomaly(report: Omit<AnomalyReport, 'timestamp'>): void;
    onAnomaly(handler: (report: AnomalyReport) => void): () => void;
    registerRemediation(action: RemediationAction): () => void;
    getRemediations(pluginId?: string): RemediationAction[];
    executeRemediation(id: string, context: any): Promise<{
        success: boolean;
        result?: any;
        error?: string;
    }>;
}
export declare const aiOpsEngine: AIOpsEngine;
export {};
