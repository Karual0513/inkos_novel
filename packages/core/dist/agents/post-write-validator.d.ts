/**
 * Post-write rule-based validator.
 *
 * Deterministic, zero-LLM-cost checks that run after every chapter generation.
 * Catches violations that prompt-only rules cannot guarantee.
 */
import type { BookRules } from "../models/book-rules.js";
import type { GenreProfile } from "../models/genre-profile.js";
export interface PostWriteViolation {
    readonly rule: string;
    readonly severity: "error" | "warning";
    readonly description: string;
    readonly suggestion: string;
}
export declare function validatePostWrite(content: string, genreProfile: GenreProfile, bookRules: BookRules | null): ReadonlyArray<PostWriteViolation>;
//# sourceMappingURL=post-write-validator.d.ts.map