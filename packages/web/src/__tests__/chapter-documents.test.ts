import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseChapterDocument, readChapterDocument, saveChapterDocument } from "../chapter-documents.js";
import { createTempInkosWorkspace, removeTempInkosWorkspace } from "./test-helpers.js";

describe("chapter-documents", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempInkosWorkspace();
  });

  afterEach(async () => {
    await removeTempInkosWorkspace(tempDir);
  });

  it("normalizes heading when parsing raw chapter content", () => {
    const parsed = parseChapterDocument(3, "# 新标题\n\n这里是正文。", "兜底标题");

    expect(parsed.title).toBe("新标题");
    expect(parsed.content).toBe("# 第3章 新标题\n\n这里是正文。\n");
    expect(parsed.wordCount).toBe(6);
  });

  it("saves chapter content and updates chapter index metadata", async () => {
    const result = await saveChapterDocument(tempDir, {
      bookId: "demo",
      chapter: 1,
      content: "# 新标题\n\n这是修改后的正文内容。",
    });

    const savedContent = await readFile(join(tempDir, "books", "demo", "chapters", "0001_旧标题.md"), "utf-8");
    const index = JSON.parse(await readFile(join(tempDir, "books", "demo", "chapters", "index.json"), "utf-8"));

    expect(result).toMatchObject({
      ok: true,
      bookId: "demo",
      chapter: 1,
      title: "新标题",
      fileName: "0001_旧标题.md",
    });
    expect(savedContent).toBe("# 第1章 新标题\n\n这是修改后的正文内容。\n");
    expect(index[0]).toMatchObject({
      number: 1,
      title: "新标题",
      wordCount: 11,
    });
    expect(Date.parse(index[0].updatedAt)).not.toBeNaN();
  });

  it("reads chapter content with metadata from chapter index", async () => {
    const chapter = await readChapterDocument(tempDir, "demo", 1);

    expect(chapter).toMatchObject({
      bookId: "demo",
      chapter: 1,
      title: "旧标题",
      status: "ready-for-review",
      fileName: "0001_旧标题.md",
      reviewNote: "待处理",
      auditIssues: ["原问题"],
    });
    expect(chapter.content).toBe("# 第1章 旧标题\n\n旧内容\n");
  });
});