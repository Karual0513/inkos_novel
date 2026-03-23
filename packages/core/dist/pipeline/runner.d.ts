import type { LLMClient } from "../llm/provider.js";
import type { BookConfig } from "../models/book.js";
import type { ChapterMeta } from "../models/chapter.js";
import type { NotifyChannel } from "../models/project.js";
import { type ReviseMode } from "../agents/reviser.js";
import type { RadarSource } from "../agents/radar-source.js";
import type { AuditResult } from "../agents/continuity.js";
import type { RadarResult } from "../agents/radar.js";
export interface PipelineConfig {
    readonly client: LLMClient;
    readonly model: string;
    readonly projectRoot: string;
    readonly notifyChannels?: ReadonlyArray<NotifyChannel>;
    readonly radarSources?: ReadonlyArray<RadarSource>;
    readonly externalContext?: string;
    readonly modelOverrides?: Record<string, string>;
}
export interface ChapterPipelineResult {
    readonly chapterNumber: number;
    readonly title: string;
    readonly wordCount: number;
    readonly auditResult: AuditResult;
    readonly revised: boolean;
    readonly status: "approved" | "needs-review";
}
export interface DraftResult {
    readonly chapterNumber: number;
    readonly title: string;
    readonly wordCount: number;
    readonly filePath: string;
}
export interface ReviseResult {
    readonly chapterNumber: number;
    readonly wordCount: number;
    readonly fixedIssues: ReadonlyArray<string>;
}
export interface TruthFiles {
    readonly currentState: string;
    readonly particleLedger: string;
    readonly pendingHooks: string;
    readonly storyBible: string;
    readonly volumeOutline: string;
    readonly bookRules: string;
}
export interface BookStatusInfo {
    readonly bookId: string;
    readonly title: string;
    readonly genre: string;
    readonly platform: string;
    readonly status: string;
    readonly chaptersWritten: number;
    readonly totalWords: number;
    readonly nextChapter: number;
    readonly chapters: ReadonlyArray<ChapterMeta>;
}
export interface ImportChaptersInput {
    readonly bookId: string;
    readonly chapters: ReadonlyArray<{
        readonly title: string;
        readonly content: string;
    }>;
    readonly resumeFrom?: number;
}
export interface ImportChaptersResult {
    readonly bookId: string;
    readonly importedCount: number;
    readonly totalWords: number;
    readonly nextChapter: number;
}
export declare class PipelineRunner {
    private readonly state;
    private readonly config;
    constructor(config: PipelineConfig);
    private agentCtx;
    private modelFor;
    private agentCtxFor;
    private loadGenreProfile;
    runRadar(): Promise<RadarResult>;
    initBook(book: BookConfig): Promise<void>;
    /** Write a single draft chapter. Saves chapter file + truth files + index + snapshot. */
    writeDraft(bookId: string, context?: string, wordCount?: number): Promise<DraftResult>;
    /** Audit the latest (or specified) chapter. Read-only, no lock needed. */
    auditDraft(bookId: string, chapterNumber?: number): Promise<AuditResult & {
        readonly chapterNumber: number;
    }>;
    /** Revise the latest (or specified) chapter based on audit issues. */
    reviseDraft(bookId: string, chapterNumber?: number, mode?: ReviseMode): Promise<ReviseResult>;
    /** Read all truth files for a book. */
    readTruthFiles(bookId: string): Promise<TruthFiles>;
    /** Get book status overview. */
    getBookStatus(bookId: string): Promise<BookStatusInfo>;
    writeNextChapter(bookId: string, wordCount?: number, temperatureOverride?: number): Promise<ChapterPipelineResult>;
    private _writeNextChapterLocked;
    /**
     * Generate a qualitative style guide from reference text via LLM.
     * Also saves the statistical style_profile.json.
     */
    generateStyleGuide(bookId: string, referenceText: string, sourceName?: string): Promise<string>;
    /**
     * Import canon from parent book for spinoff writing.
     * Reads parent's truth files, uses LLM to generate parent_canon.md in target book.
     */
    importCanon(targetBookId: string, parentBookId: string): Promise<string>;
    /**
     * Import existing chapters into a book. Reverse-engineers all truth files
     * via sequential replay so the Writer and Auditor can continue naturally.
     *
     * Step 1: Generate foundation (story_bible, volume_outline, book_rules) from all chapters.
     * Step 2: Sequentially replay each chapter through ChapterAnalyzer to build truth files.
     */
    importChapters(input: ImportChaptersInput): Promise<ImportChaptersResult>;
    private emitWebhook;
    private readChapterContent;
}
//# sourceMappingURL=runner.d.ts.map