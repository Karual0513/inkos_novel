import { BaseAgent } from "./base.js";
export interface AuditResult {
    readonly passed: boolean;
    readonly issues: ReadonlyArray<AuditIssue>;
    readonly summary: string;
}
export interface AuditIssue {
    readonly severity: "critical" | "warning" | "info";
    readonly category: string;
    readonly description: string;
    readonly suggestion: string;
}
export declare class ContinuityAuditor extends BaseAgent {
    get name(): string;
    auditChapter(bookDir: string, chapterContent: string, chapterNumber: number, genre?: string, options?: {
        temperature?: number;
    }): Promise<AuditResult>;
    private parseAuditResult;
    private readFileSafe;
}
//# sourceMappingURL=continuity.d.ts.map