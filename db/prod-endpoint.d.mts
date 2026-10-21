// Types for db/prod-endpoint.mjs, so TypeScript callers (e2e/clean-dev.ts) can import it.
export declare const PROD_ENDPOINT_ID: string | null;
export declare function endpointId(url: string): string | null;
export declare function isProductionUrl(url: string, prodId?: string | null): boolean;
