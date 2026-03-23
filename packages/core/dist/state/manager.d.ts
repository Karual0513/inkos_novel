import type { BookConfig } from "../models/book.js";
import type { ChapterMeta } from "../models/chapter.js";
export declare class StateManager {
    private readonly projectRoot;
    constructor(projectRoot: string);
    acquireBookLock(bookId: string): Promise<() => Promise<void>>;
    get booksDir(): string;
    bookDir(bookId: string): string;
    loadProjectConfig(): Promise<Record<string, unknown>>;
    saveProjectConfig(config: Record<string, unknown>): Promise<void>;
    loadBookConfig(bookId: string): Promise<BookConfig>;
    saveBookConfig(bookId: string, config: BookConfig): Promise<void>;
    listBooks(): Promise<ReadonlyArray<string>>;
    getNextChapterNumber(bookId: string): Promise<number>;
    loadChapterIndex(bookId: string): Promise<ReadonlyArray<ChapterMeta>>;
    saveChapterIndex(bookId: string, index: ReadonlyArray<ChapterMeta>): Promise<void>;
    snapshotState(bookId: string, chapterNumber: number): Promise<void>;
    restoreState(bookId: string, chapterNumber: number): Promise<boolean>;
}
//# sourceMappingURL=manager.d.ts.map