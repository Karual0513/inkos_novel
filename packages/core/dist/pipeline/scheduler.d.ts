import type { PipelineConfig } from "./runner.js";
import type { QualityGates, DetectionConfig } from "../models/project.js";
export interface SchedulerConfig extends PipelineConfig {
    readonly radarCron: string;
    readonly writeCron: string;
    readonly maxConcurrentBooks: number;
    readonly chaptersPerCycle: number;
    readonly retryDelayMs: number;
    readonly cooldownAfterChapterMs: number;
    readonly maxChaptersPerDay: number;
    readonly qualityGates?: QualityGates;
    readonly detection?: DetectionConfig;
    readonly onChapterComplete?: (bookId: string, chapter: number, status: string) => void;
    readonly onError?: (bookId: string, error: Error) => void;
    readonly onPause?: (bookId: string, reason: string) => void;
}
export declare class Scheduler {
    private readonly pipeline;
    private readonly state;
    private readonly config;
    private tasks;
    private running;
    private consecutiveFailures;
    private pausedBooks;
    private failureDimensions;
    private dailyChapterCount;
    constructor(config: SchedulerConfig);
    start(): Promise<void>;
    stop(): void;
    get isRunning(): boolean;
    /** Resume a paused book. */
    resumeBook(bookId: string): void;
    /** Check if a book is paused. */
    isBookPaused(bookId: string): boolean;
    private get gates();
    /** Check if daily cap is reached across all books. */
    private isDailyCapReached;
    /** Increment daily chapter counter. */
    private recordChapterWritten;
    private runWriteCycle;
    /** Process a single book: write chaptersPerCycle chapters with retry + cooldown. */
    private processBook;
    /** Write one chapter for a book. Returns true if approved. */
    private writeOneChapter;
    private runDetection;
    private handleAuditFailure;
    private runRadarScan;
    private emitDiagnosticAlert;
    private readChapterContent;
    private cronToMs;
    private sleep;
}
//# sourceMappingURL=scheduler.d.ts.map