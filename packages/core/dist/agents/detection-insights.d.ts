/**
 * Detection feedback loop — analyze detection_history.json to extract insights.
 */
import type { DetectionHistoryEntry, DetectionStats } from "../models/detection.js";
/**
 * Analyze detection history and produce aggregated statistics.
 */
export declare function analyzeDetectionInsights(history: ReadonlyArray<DetectionHistoryEntry>): DetectionStats;
//# sourceMappingURL=detection-insights.d.ts.map