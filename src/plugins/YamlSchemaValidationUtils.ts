import { parseYamlDocuments } from '../utils/yaml';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
    path: string;
    message: string;
    severity: ValidationSeverity;
    line?: number;
    suggestion?: string;
}

export const REQUIRED_FIELDS: Record<string, string[]> = {
    Deployment: ['apiVersion', 'kind', 'metadata.name', 'spec.selector', 'spec.template'],
    Service: ['apiVersion', 'kind', 'metadata.name', 'spec.selector', 'spec.ports'],
    Pod: ['apiVersion', 'kind', 'metadata.name', 'spec.containers'],
    ConfigMap: ['apiVersion', 'kind', 'metadata.name'],
    Secret: ['apiVersion', 'kind', 'metadata.name'],
    Ingress: ['apiVersion', 'kind', 'metadata.name', 'spec.rules'],
    StatefulSet: ['apiVersion', 'kind', 'metadata.name', 'spec.selector', 'spec.template', 'spec.serviceName'],
    DaemonSet: ['apiVersion', 'kind', 'metadata.name', 'spec.selector', 'spec.template'],
    Job: ['apiVersion', 'kind', 'metadata.name', 'spec.template'],
    CronJob: ['apiVersion', 'kind', 'metadata.name', 'spec.schedule', 'spec.jobTemplate'],
    PersistentVolumeClaim: ['apiVersion', 'kind', 'metadata.name', 'spec.accessModes', 'spec.resources'],
    Namespace: ['apiVersion', 'kind', 'metadata.name'],
    ServiceAccount: ['apiVersion', 'kind', 'metadata.name'],
    Role: ['apiVersion', 'kind', 'metadata.name', 'rules'],
    ClusterRole: ['apiVersion', 'kind', 'metadata.name', 'rules'],
    RoleBinding: ['apiVersion', 'kind', 'metadata.name', 'roleRef', 'subjects'],
    ClusterRoleBinding: ['apiVersion', 'kind', 'metadata.name', 'roleRef', 'subjects'],
    NetworkPolicy: ['apiVersion', 'kind', 'metadata.name', 'spec.podSelector'],
};

const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
};

const validateSingleDocument = (parsed: any): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    if (!parsed || typeof parsed !== 'object') return issues;

    const kind = parsed.kind || '';
    const requiredFields = REQUIRED_FIELDS[kind] || [];

    requiredFields.forEach(field => {
        const hasNested = getNestedValue(parsed, field) !== undefined;

        if (!hasNested) {
            issues.push({
                path: field,
                message: `Required field "${field}" is missing for ${kind || 'this resource'}`,
                severity: 'error',
                suggestion: `Add "${field}" to your ${kind} manifest`,
            });
        }
    });

    const CONTAINER_PARENT_RE = /(?:^|\.)(?:containers|initContainers)\[\d+\]/;

    const traverse = (obj: any, path: string) => {
        if (!obj || typeof obj !== 'object') return;

        if (Array.isArray(obj)) {
            obj.forEach((item, index) => traverse(item, `${path}[${index}]`));
            return;
        }

        for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            const inContainer = CONTAINER_PARENT_RE.test(currentPath);

            if (inContainer && key === 'image' && typeof value === 'string' && value.endsWith(':latest')) {
                issues.push({
                    path: currentPath,
                    message: 'Using ":latest" tag is not recommended for production deployments',
                    severity: 'warning',
                    suggestion: 'Pin to a specific version tag (e.g., nginx:1.25.0) for reproducible builds',
                });
            }

            if (inContainer && key === 'imagePullPolicy' && value === 'Always') {
                issues.push({
                    path: currentPath,
                    message: 'imagePullPolicy: Always causes unnecessary image pulls on every pod restart',
                    severity: 'info',
                    suggestion: 'Use "IfNotPresent" for tagged images, reserve "Always" for development only',
                });
            }

            if (inContainer && key === 'resources' && typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
                issues.push({
                    path: currentPath,
                    message: 'Empty resource limits/requests, pods may be evicted under pressure',
                    severity: 'warning',
                    suggestion: 'Define both requests and limits for CPU and memory',
                });
            }

            if (key === 'hostNetwork' && value === true && currentPath.startsWith('spec')) {
                issues.push({
                    path: currentPath,
                    message: 'hostNetwork: true exposes the pod to the host network stack',
                    severity: 'warning',
                    suggestion: 'Avoid hostNetwork unless absolutely necessary (e.g., CNI plugins)',
                });
            }

            if (key === 'privileged' && value === true && currentPath.includes('securityContext')) {
                issues.push({
                    path: currentPath,
                    message: 'Running a container in privileged mode is a security risk',
                    severity: 'error',
                    suggestion: 'Use specific securityContext capabilities instead of full privileged mode',
                });
            }

            if (key === 'runAsUser' && value === 0 && currentPath.includes('securityContext')) {
                issues.push({
                    path: currentPath,
                    message: 'Container is configured to run as root (UID 0)',
                    severity: 'warning',
                    suggestion: 'Run containers as non-root user for better security (e.g., runAsUser: 1000)',
                });
            }

            if (key === 'replicas' && value === 1 && kind === 'Deployment' && currentPath === 'spec.replicas') {
                issues.push({
                    path: currentPath,
                    message: 'Single replica Deployment, no high availability',
                    severity: 'info',
                    suggestion: 'Consider running at least 2 replicas for production workloads',
                });
            }

            if (key === 'apiVersion' && typeof value === 'string' && currentPath === 'apiVersion') {
                if (value === 'extensions/v1beta1') {
                    issues.push({
                        path: currentPath,
                        message: 'Deprecated API version: extensions/v1beta1',
                        severity: 'error',
                        suggestion: 'Migrate to apps/v1 for Deployments, networking.k8s.io/v1 for Ingresses',
                    });
                } else if (value.match(/^apps\/v1beta[12]$/)) {
                    issues.push({
                        path: currentPath,
                        message: 'Deprecated API version: apps/v1beta',
                        severity: 'error',
                        suggestion: 'Use apps/v1 instead, v1beta versions were removed in Kubernetes 1.16+',
                    });
                }
            }

            traverse(value, currentPath);
        }
    };

    traverse(parsed, '');

    return issues;
};

export const validateYaml = (content: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    try {
        const documents = parseYamlDocuments(content);

        for (const doc of documents) {
            issues.push(...validateSingleDocument(doc));
        }
    } catch (e: any) {
        issues.push({
            path: '',
            message: `YAML/JSON parse error: ${e.message}`,
            severity: 'error',
        });
        return issues;
    }

    return issues;
};
