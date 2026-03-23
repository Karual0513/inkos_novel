import { BaseAgent } from "./base.js";
import type { BookConfig } from "../models/book.js";
import { type ParsedWriterOutput } from "./writer-parser.js";
export interface AnalyzeChapterInput {
    readonly book: BookConfig;
    readonly bookDir: string;
    readonly chapterNumber: number;
    readonly chapterContent: string;
    readonly chapterTitle?: string;
}
export type AnalyzeChapterOutput = ParsedWriterOutput;
export declare class ChapterAnalyzerAgent extends BaseAgent {
    get name(): string;
    analyzeChapter(input: AnalyzeChapterInput): Promise<AnalyzeChapterOutput>;
    private buildSystemPrompt;
    private buildUserPrompt;
    private readFileOrDefault;
}
//# sourceMappingURL=chapter-analyzer.d.ts.map