export type CloudProvider = 'aws' | 'gcp' | 'azure' | 'on-prem';
export interface CloudCredential {
    provider: CloudProvider;
    region?: string;
    accountId?: string;
    isAuthenticated: boolean;
}
export interface CloudResource {
    id: string;
    type: string;
    provider: CloudProvider;
    region: string;
    tags: Record<string, string>;
    status: string;
}
declare class MultiCloudManager {
    private credentials;
    constructor();
    isConfigured(provider: CloudProvider): boolean;
    getCredentials(): CloudCredential[];
    fetchResources(provider: CloudProvider, resourceType?: string): Promise<CloudResource[]>;
}
export declare const multiCloudManager: MultiCloudManager;
export {};
