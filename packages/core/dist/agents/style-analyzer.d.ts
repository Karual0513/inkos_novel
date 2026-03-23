/**
 * Style fingerprint analysis — pure text analysis (no LLM).
 * Extracts statistical features from reference text to build a StyleProfile.
 */
import type { StyleProfile } from "../models/style-profile.js";
/**
 * Analyze a reference text and extract its style profile.
 * The returned profile can be serialized to style_profile.json.
 */
export declare function analyzeStyle(text: string, sourceName?: string): StyleProfile;
//# sourceMappingURL=style-analyzer.d.ts.map