import { BaseAgent } from "./base.js";
import type { AuditIssue } from "./continuity.js";
export type ReviseMode = "polish" | "rewrite" | "rework" | "anti-detect" | "spot-fix";
export interface ReviseOutput {
    readonly revisedContent: string;
    readonly wordCount: number;
    readonly fixedIssues: ReadonlyArray<string>;
    readonly updatedState: string;
    readonly updatedLedger: string;
    readonly updatedHooks: string;
}
export declare class ReviserAgent extends BaseAgent {
    get name(): string;
    reviseChapter(bookDir: string, chapterContent: string, chapterNumber: number, issues: ReadonlyArray<AuditIssue>, mode?: ReviseMode, genre?: string): Promise<ReviseOutput>;
    private parseOutput;
    private readFileSafe;
}
//# sourceMappingURL=reviser.d.ts.map