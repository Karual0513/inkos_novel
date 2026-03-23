/**
 * Detection pipeline runner — handles detection, auto-rewrite loop, and history tracking.
 * Extracted from runner.ts to keep runner under 800 lines.
 */
import type { DetectionConfig } from "../models/project.js";
import type { DetectionHistoryEntry } from "../models/detection.js";
import type { AgentContext } from "../agents/base.js";
import { type DetectionResult } from "../agents/detector.js";
export interface DetectChapterResult {
    readonly chapterNumber: number;
    readonly detection: DetectionResult;
    readonly passed: boolean;
}
export interface DetectAndRewriteResult {
    readonly chapterNumber: number;
    readonly originalScore: number;
    readonly finalScore: number;
    readonly attempts: number;
    readonly passed: boolean;
    readonly finalContent: string;
}
/** Run detection on a single chapter's content. */
export declare function detectChapter(config: DetectionConfig, content: string, chapterNumber: number): Promise<DetectChapterResult>;
/**
 * Detect-and-rewrite loop: detect → revise in anti-detect mode → re-detect,
 * until score passes threshold or max retries reached.
 */
export declare function detectAndRewrite(config: DetectionConfig, ctx: AgentContext, bookDir: string, content: string, chapterNumber: number, genre?: string): Promise<DetectAndRewriteResult>;
/** Load detection history from disk. */
export declare function loadDetectionHistory(bookDir: string): Promise<ReadonlyArray<DetectionHistoryEntry>>;
//# sourceMappingURL=detection-runner.d.ts.map