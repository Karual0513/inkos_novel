/**
 * Sensitive word detection — rule-based analysis (no LLM).
 *
 * Detects politically sensitive, sexually explicit, and extremely violent terms
 * in Chinese web novel content. Used in audit pipeline to flag or block content.
 */
import type { AuditIssue } from "./continuity.js";
export interface SensitiveWordMatch {
    readonly word: string;
    readonly count: number;
    readonly severity: "block" | "warn";
}
export interface SensitiveWordResult {
    readonly issues: ReadonlyArray<AuditIssue>;
    readonly found: ReadonlyArray<SensitiveWordMatch>;
}
/**
 * Analyze text content for sensitive words.
 * Returns issues that can be merged into audit results.
 */
export declare function analyzeSensitiveWords(content: string, customWords?: ReadonlyArray<string>): SensitiveWordResult;
//# sourceMappingURL=sensitive-words.d.ts.map