export interface LogEntry {
    id: string;
    pluginId: string;
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message: string;
    correlationId?: string;
    context?: Record<string, unknown>;
    tags?: string[];
}
export interface PolicyRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    enforce: (context: Record<string, any>) => boolean;
    violationMessage: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
}
declare class LoggingAndPolicyManager {
    private logs;
    private maxLogRetention;
    private policies;
    log(pluginId: string, level: LogEntry['level'], message: string, correlationId?: string, context?: Record<string, unknown>): void;
    getLogs(pluginId?: string, correlationId?: string, minLevel?: LogEntry['level']): LogEntry[];
    registerPolicy(rule: PolicyRule): void;
    enforcePolicies(context: Record<string, any>, operation: string): boolean;
    exportAuditLogs(): string;
}
export declare const loggingManager: LoggingAndPolicyManager;
export {};
