/**
 * AIGC detection — calls external API (GPTZero, Originality, or custom endpoint).
 * Not a BaseAgent subclass since it doesn't use the LLM provider.
 */
import type { DetectionConfig } from "../models/project.js";
export interface DetectionResult {
    readonly score: number;
    readonly provider: string;
    readonly detectedAt: string;
    readonly raw?: Record<string, unknown>;
}
/**
 * Detect AI-generated content by calling an external detection API.
 * Returns a normalized score between 0 (human) and 1 (AI).
 */
export declare function detectAIContent(config: DetectionConfig, content: string): Promise<DetectionResult>;
//# sourceMappingURL=detector.d.ts.map