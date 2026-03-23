export interface SplitChapter {
    readonly title: string;
    readonly content: string;
}
/**
 * Split a single text file into chapters by matching title lines.
 *
 * Default pattern matches:
 * - "第一章 xxxx" / "第1章 xxxx"
 * - "# 第1章 xxxx" / "## 第23章 xxxx"
 *
 * Each match marks the start of a new chapter. Content between matches
 * belongs to the preceding chapter.
 */
export declare function splitChapters(text: string, pattern?: string): ReadonlyArray<SplitChapter>;
//# sourceMappingURL=chapter-splitter.d.ts.map