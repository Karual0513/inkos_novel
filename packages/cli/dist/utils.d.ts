import { type ProjectConfig } from "@actalk/inkos-core";
export declare const GLOBAL_CONFIG_DIR: string;
export declare const GLOBAL_ENV_PATH: string;
export declare function resolveContext(opts: {
    readonly context?: string;
    readonly contextFile?: string;
}): Promise<string | undefined>;
export declare function findProjectRoot(): string;
export declare function loadConfig(): Promise<ProjectConfig>;
export declare function createClient(config: ProjectConfig): import("@actalk/inkos-core").LLMClient;
export declare function log(message: string): void;
export declare function logError(message: string): void;
/**
 * Resolve book-id: if provided use it, otherwise auto-detect when exactly one book exists.
 * Validates that the book actually exists.
 */
export declare function resolveBookId(bookIdArg: string | undefined, root: string): Promise<string>;
//# sourceMappingURL=utils.d.ts.map