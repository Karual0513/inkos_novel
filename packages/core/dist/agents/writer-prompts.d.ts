import type { BookConfig } from "../models/book.js";
import type { GenreProfile } from "../models/genre-profile.js";
import type { BookRules } from "../models/book-rules.js";
export declare function buildWriterSystemPrompt(book: BookConfig, genreProfile: GenreProfile, bookRules: BookRules | null, bookRulesBody: string, genreBody: string, styleGuide: string, styleFingerprint?: string, chapterNumber?: number, mode?: "full" | "creative"): string;
//# sourceMappingURL=writer-prompts.d.ts.map