import { BaseAgent } from "./base.js";
import type { BookConfig } from "../models/book.js";
import { type PostWriteViolation } from "./post-write-validator.js";
export interface WriteChapterInput {
    readonly book: BookConfig;
    readonly bookDir: string;
    readonly chapterNumber: number;
    readonly externalContext?: string;
    readonly wordCountOverride?: number;
    readonly temperatureOverride?: number;
}
export interface WriteChapterOutput {
    readonly chapterNumber: number;
    readonly title: string;
    readonly content: string;
    readonly wordCount: number;
    readonly preWriteCheck: string;
    readonly postSettlement: string;
    readonly updatedState: string;
    readonly updatedLedger: string;
    readonly updatedHooks: string;
    readonly chapterSummary: string;
    readonly updatedSubplots: string;
    readonly updatedEmotionalArcs: string;
    readonly updatedCharacterMatrix: string;
    readonly postWriteErrors: ReadonlyArray<PostWriteViolation>;
    readonly postWriteWarnings: ReadonlyArray<PostWriteViolation>;
}
export declare class WriterAgent extends BaseAgent {
    get name(): string;
    writeChapter(input: WriteChapterInput): Promise<WriteChapterOutput>;
    private settle;
    saveChapter(bookDir: string, output: WriteChapterOutput, numericalSystem?: boolean): Promise<void>;
    private buildUserPrompt;
    private loadRecentChapters;
    private readFileOrDefault;
    /** Save new truth files (summaries, subplots, emotional arcs, character matrix). */
    saveNewTruthFiles(bookDir: string, output: WriteChapterOutput): Promise<void>;
    private appendChapterSummary;
    private buildStyleFingerprint;
    /**
     * Extract dialogue fingerprints from recent chapters.
     * For each character with multiple dialogue lines, compute speaking style markers.
     */
    private extractDialogueFingerprints;
    /**
     * Find relevant chapter summaries based on volume outline context.
     * Extracts character names and hook IDs from the current volume's outline,
     * then searches chapter summaries for matching entries.
     */
    private findRelevantSummaries;
    private sanitizeFilename;
}
//# sourceMappingURL=writer.d.ts.map