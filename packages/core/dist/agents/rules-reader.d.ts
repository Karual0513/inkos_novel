import { type ParsedGenreProfile } from "../models/genre-profile.js";
import { type ParsedBookRules } from "../models/book-rules.js";
/**
 * Load genre profile. Lookup order:
 * 1. Project-level: {projectRoot}/genres/{genreId}.md
 * 2. Built-in:     packages/core/genres/{genreId}.md
 * 3. Fallback:     built-in other.md
 */
export declare function readGenreProfile(projectRoot: string, genreId: string): Promise<ParsedGenreProfile>;
/**
 * List all available genre profiles (project-level + built-in, deduped).
 * Returns array of { id, name, source }.
 */
export declare function listAvailableGenres(projectRoot: string): Promise<ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly source: "project" | "builtin";
}>>;
/** Return the path to the built-in genres directory. */
export declare function getBuiltinGenresDir(): string;
/**
 * Load book_rules.md from the book's story directory.
 * Returns null if the file doesn't exist.
 */
export declare function readBookRules(bookDir: string): Promise<ParsedBookRules | null>;
//# sourceMappingURL=rules-reader.d.ts.map