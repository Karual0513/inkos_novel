/**
 * Structural AI-tell detection — pure rule-based analysis (no LLM).
 *
 * Detects patterns common in AI-generated Chinese text:
 * - dim 20: Paragraph length uniformity (low variance)
 * - dim 21: Filler/hedge word density
 * - dim 22: Formulaic transition patterns
 * - dim 23: List-like structure (consecutive same-prefix sentences)
 */
export interface AITellIssue {
    readonly severity: "warning" | "info";
    readonly category: string;
    readonly description: string;
    readonly suggestion: string;
}
export interface AITellResult {
    readonly issues: ReadonlyArray<AITellIssue>;
}
/**
 * Analyze text content for structural AI-tell patterns.
 * Returns issues that can be merged into audit results.
 */
export declare function analyzeAITells(content: string): AITellResult;
//# sourceMappingURL=ai-tells.d.ts.map