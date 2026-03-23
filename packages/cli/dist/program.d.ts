import { Command } from "commander";
export interface CommandArgumentMetadata {
    readonly name: string;
    readonly description: string;
    readonly required: boolean;
    readonly variadic: boolean;
    readonly defaultValue?: unknown;
}
export interface CommandOptionMetadata {
    readonly name: string;
    readonly flags: string;
    readonly short?: string;
    readonly long?: string;
    readonly description: string;
    readonly takesValue: boolean;
    readonly valueRequired: boolean;
    readonly valueOptional: boolean;
    readonly required: boolean;
    readonly boolean: boolean;
    readonly defaultValue?: unknown;
}
export interface CommandMetadata {
    readonly name: string;
    readonly path: string;
    readonly description: string;
    readonly usage: string;
    readonly runnable: boolean;
    readonly supportsJson: boolean;
    readonly arguments: ReadonlyArray<CommandArgumentMetadata>;
    readonly options: ReadonlyArray<CommandOptionMetadata>;
    readonly children: ReadonlyArray<CommandMetadata>;
}
export declare function createProgram(): Command;
export declare function collectCommandMetadata(program: Command): ReadonlyArray<CommandMetadata>;
//# sourceMappingURL=program.d.ts.map