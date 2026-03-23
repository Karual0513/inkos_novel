import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { StateManager } from "@actalk/inkos-core";

export interface ChapterSavePayload {
  readonly bookId: string;
  readonly chapter: number;
  readonly content: string;
}

export async function readBookChapters(contextRoot: string, bookId: string): Promise<Record<string, unknown>> {
  const state = new StateManager(contextRoot);
  const book = await state.loadBookConfig(bookId);
  const chapters = await state.loadChapterIndex(bookId);

  return {
    bookId,
    title: book.title,
    chapters: [...chapters].sort((left, right) => left.number - right.number),
  };
}

export async function readChapterDocument(
  contextRoot: string,
  bookId: string,
  chapterNumber: number,
): Promise<Record<string, unknown>> {
  const state = new StateManager(contextRoot);
  const index = await state.loadChapterIndex(bookId);
  const chapterMeta = index.find((chapter) => chapter.number === chapterNumber);
  if (!chapterMeta) {
    throw new Error(`Chapter ${chapterNumber} not found in \"${bookId}\"`);
  }

  const bookDir = state.bookDir(bookId);
  const fileName = await findChapterFileName(bookDir, chapterNumber);
  const raw = await readFile(join(bookDir, "chapters", fileName), "utf-8");

  return {
    bookId,
    chapter: chapterNumber,
    title: chapterMeta.title,
    status: chapterMeta.status,
    wordCount: chapterMeta.wordCount,
    updatedAt: chapterMeta.updatedAt,
    fileName,
    content: raw,
    auditIssues: chapterMeta.auditIssues,
    reviewNote: chapterMeta.reviewNote ?? "",
  };
}

export async function saveChapterDocument(
  contextRoot: string,
  payload: ChapterSavePayload,
): Promise<Record<string, unknown>> {
  const state = new StateManager(contextRoot);
  const index = [...(await state.loadChapterIndex(payload.bookId))];
  const chapterIndex = index.findIndex((chapter) => chapter.number === payload.chapter);
  if (chapterIndex === -1) {
    throw new Error(`Chapter ${payload.chapter} not found in \"${payload.bookId}\"`);
  }

  const bookDir = state.bookDir(payload.bookId);
  const fileName = await findChapterFileName(bookDir, payload.chapter, index[chapterIndex]!.title);
  const chapterPath = join(bookDir, "chapters", fileName);

  const parsed = parseChapterDocument(payload.chapter, payload.content, index[chapterIndex]!.title);
  await writeFile(chapterPath, parsed.content, "utf-8");

  const updatedAt = new Date().toISOString();
  index[chapterIndex] = {
    ...index[chapterIndex]!,
    title: parsed.title,
    wordCount: parsed.wordCount,
    updatedAt,
  };
  await state.saveChapterIndex(payload.bookId, index);

  return {
    ok: true,
    bookId: payload.bookId,
    chapter: payload.chapter,
    title: parsed.title,
    wordCount: parsed.wordCount,
    updatedAt,
    fileName,
  };
}

export async function findChapterFileName(bookDir: string, chapterNumber: number, fallbackTitle?: string): Promise<string> {
  const chaptersDir = join(bookDir, "chapters");
  const files = await readdir(chaptersDir);
  const paddedNum = String(chapterNumber).padStart(4, "0");
  const existing = files.find((file) => file.startsWith(paddedNum) && file.endsWith(".md"));
  if (existing) {
    return existing;
  }
  if (!fallbackTitle) {
    throw new Error(`Chapter ${chapterNumber} file not found in ${chaptersDir}`);
  }
  return `${paddedNum}_${sanitizeTitle(fallbackTitle)}.md`;
}

export function parseChapterDocument(chapterNumber: number, raw: string, fallbackTitle: string): {
  readonly title: string;
  readonly content: string;
  readonly wordCount: number;
} {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    throw new Error("Chapter content cannot be empty");
  }

  const lines = normalized.split("\n");
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0);
  const firstLine = firstNonEmptyIndex >= 0 ? lines[firstNonEmptyIndex]!.trim() : "";
  const numberedHeading = firstLine.match(/^#\s*第\s*\d+\s*章\s*(.+)$/);
  const genericHeading = firstLine.match(/^#\s*(.+)$/);
  const title = (numberedHeading?.[1] ?? genericHeading?.[1] ?? fallbackTitle).trim() || fallbackTitle;

  if (numberedHeading) {
    lines[firstNonEmptyIndex] = rawHeading(chapterNumber, title);
  } else if (genericHeading) {
    lines[firstNonEmptyIndex] = rawHeading(chapterNumber, title);
    if (lines[firstNonEmptyIndex + 1]?.trim()) {
      lines.splice(firstNonEmptyIndex + 1, 0, "");
    }
  } else {
    lines.unshift(rawHeading(chapterNumber, title), "");
  }

  const content = lines.join("\n").replace(/^\n+/, "").trim() + "\n";
  const body = content.replace(/^#.*\n+/, "");

  return {
    title,
    content,
    wordCount: estimateWordCount(body),
  };
}

export function rawHeading(chapterNumber: number, title: string): string {
  return `# 第${chapterNumber}章 ${title}`;
}

export function estimateWordCount(content: string): number {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-]/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\s+/g, "")
    .length;
}

export function sanitizeTitle(title: string): string {
  return title.replace(/[/\\?%*:|"<>]/g, "").replace(/\s+/g, "_").slice(0, 50);
}