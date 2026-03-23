import type { GenreProfile } from "../models/genre-profile.js";
import type { WriteChapterOutput } from "./writer.js";
export interface CreativeOutput {
    readonly title: string;
    readonly content: string;
    readonly wordCount: number;
    readonly preWriteCheck: string;
}
export declare function parseCreativeOutput(chapterNumber: number, content: string): CreativeOutput;
export type ParsedWriterOutput = Omit<WriteChapterOutput, "postWriteErrors" | "postWriteWarnings">;
/**
 * Parse LLM output that uses === TAG === delimiters into structured chapter data.
 * Shared by WriterAgent (writing new chapters) and ChapterAnalyzerAgent (analyzing existing chapters).
 */
export declare function parseWriterOutput(chapterNumber: number, content: string, genreProfile: GenreProfile): ParsedWriterOutput;
//# sourceMappingURL=writer-parser.d.ts.map