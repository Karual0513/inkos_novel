import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function createTempInkosWorkspace(): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "inkos-web-test-"));
  await mkdir(join(tempDir, "books", "demo", "chapters"), { recursive: true });
  await writeFile(join(tempDir, "inkos.json"), JSON.stringify({ name: "demo" }, null, 2), "utf-8");
  await writeFile(join(tempDir, "books", "demo", "book.json"), JSON.stringify({
    id: "demo",
    title: "演示项目",
    platform: "tomato",
    genre: "rebirth",
    status: "active",
    targetChapters: 100,
    chapterWordCount: 3000,
    createdAt: "2026-03-23T00:00:00.000Z",
    updatedAt: "2026-03-23T00:00:00.000Z",
  }, null, 2), "utf-8");
  await writeFile(join(tempDir, "books", "demo", "chapters", "index.json"), JSON.stringify([
    {
      number: 1,
      title: "旧标题",
      status: "ready-for-review",
      wordCount: 4,
      createdAt: "2026-03-23T00:00:00.000Z",
      updatedAt: "2026-03-23T00:00:00.000Z",
      auditIssues: ["原问题"],
      reviewNote: "待处理",
    },
  ], null, 2), "utf-8");
  await writeFile(join(tempDir, "books", "demo", "chapters", "0001_旧标题.md"), "# 第1章 旧标题\n\n旧内容\n", "utf-8");
  return tempDir;
}

export async function removeTempInkosWorkspace(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}