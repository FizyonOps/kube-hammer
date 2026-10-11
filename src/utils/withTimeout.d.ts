export declare class TimeoutError extends Error {
    constructor(message: string);
}
export declare const withTimeout: <T>(promise: Promise<T>, timeoutMs: number, message: string) => Promise<T>;
