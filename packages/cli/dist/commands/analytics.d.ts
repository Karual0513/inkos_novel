import { Command } from "commander";
interface AnalyticsData {
    readonly bookId: string;
    readonly totalChapters: number;
    readonly totalWords: number;
    readonly avgWordsPerChapter: number;
    readonly auditPassRate: number;
    readonly topIssueCategories: ReadonlyArray<{
        readonly category: string;
        readonly count: number;
    }>;
    readonly chaptersWithMostIssues: ReadonlyArray<{
        readonly chapter: number;
        readonly issueCount: number;
    }>;
    readonly statusDistribution: Record<string, number>;
}
export declare function computeAnalytics(bookId: string, chapters: ReadonlyArray<{
    readonly number: number;
    readonly status: string;
    readonly wordCount: number;
    readonly auditIssues: ReadonlyArray<string>;
}>): AnalyticsData;
export declare const analyticsCommand: Command;
export {};
//# sourceMappingURL=analytics.d.ts.map