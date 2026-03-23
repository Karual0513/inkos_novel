export interface ChapterSavePayload {
    readonly bookId: string;
    readonly chapter: number;
    readonly content: string;
}
export declare function readBookChapters(contextRoot: string, bookId: string): Promise<Record<string, unknown>>;
export declare function readChapterDocument(contextRoot: string, bookId: string, chapterNumber: number): Promise<Record<string, unknown>>;
export declare function saveChapterDocument(contextRoot: string, payload: ChapterSavePayload): Promise<Record<string, unknown>>;
export declare function findChapterFileName(bookDir: string, chapterNumber: number, fallbackTitle?: string): Promise<string>;
export declare function parseChapterDocument(chapterNumber: number, raw: string, fallbackTitle: string): {
    readonly title: string;
    readonly content: string;
    readonly wordCount: number;
};
export declare function rawHeading(chapterNumber: number, title: string): string;
export declare function estimateWordCount(content: string): number;
export declare function sanitizeTitle(title: string): string;
//# sourceMappingURL=chapter-documents.d.ts.map