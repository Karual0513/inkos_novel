import type { AddressInfo } from "node:net";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, parse, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createStudioServer } from "../server.js";
import { createTempInkosWorkspace, removeTempInkosWorkspace } from "./test-helpers.js";

interface ChaptersResponse {
  readonly bookId: string;
  readonly title: string;
  readonly chapters: ReadonlyArray<Record<string, unknown>>;
}

interface ChapterResponse {
  readonly bookId: string;
  readonly chapter: number;
  readonly title: string;
  readonly fileName: string;
  readonly reviewNote: string;
  readonly auditIssues: ReadonlyArray<string>;
  readonly content: string;
}

interface ChapterSaveResponse {
  readonly ok: boolean;
  readonly bookId: string;
  readonly chapter: number;
  readonly title: string;
  readonly wordCount: number;
}

interface DashboardBook {
  readonly id: string;
  readonly title: string;
  readonly genre: string;
  readonly platform: string;
  readonly status: string;
  readonly targetChapters: number;
  readonly chapters: number;
  readonly totalWords: number;
  readonly approved: number;
  readonly pending: number;
  readonly failed: number;
  readonly nextChapter: number;
}

interface PendingReview {
  readonly bookId: string;
  readonly title: string;
  readonly chapter: number;
  readonly chapterTitle: string;
  readonly status: string;
  readonly issueCount: number;
}

interface DashboardResponse {
  readonly contextPath: string;
  readonly initialized: boolean;
  readonly books: ReadonlyArray<DashboardBook>;
  readonly pendingReviews: ReadonlyArray<PendingReview>;
  readonly totals: {
    readonly books: number;
    readonly chapters: number;
    readonly words: number;
    readonly pendingReviews: number;
  };
}

interface ProjectContextInfo {
  readonly relativePath: string;
  readonly label: string;
  readonly initialized: boolean;
  readonly isDefault: boolean;
}

interface CommandNode {
  readonly path: string;
  readonly runnable: boolean;
  readonly children: ReadonlyArray<CommandNode>;
}

interface MetaResponse {
  readonly workspaceRoot: string;
  readonly cliBuilt: boolean;
  readonly contexts: ReadonlyArray<ProjectContextInfo>;
  readonly pathSuggestions: ReadonlyArray<string>;
  readonly commands: ReadonlyArray<CommandNode>;
}

interface ProjectCreateResponse {
  readonly ok: boolean;
  readonly createdContext: string;
  readonly projectName: string;
  readonly projectPath: string;
  readonly contexts: ReadonlyArray<ProjectContextInfo>;
  readonly pathSuggestions: ReadonlyArray<string>;
}

interface PathTreeNode {
  readonly path: string;
  readonly label: string;
  readonly initialized: boolean;
  readonly hasChildren: boolean;
}

interface PathTreeResponse {
  readonly path: string;
  readonly parentPath: string | null;
  readonly nodes: ReadonlyArray<PathTreeNode>;
}

describe("server api", () => {
  let workspaceRoot: string;
  let server: Awaited<ReturnType<typeof createStudioServer>>;
  let baseUrl: string;
  let extraDirectories: string[];

  beforeEach(async () => {
    workspaceRoot = await createTempInkosWorkspace();
    extraDirectories = [];
    server = createStudioServer({
      workspaceRoot,
      cliEntry: join(workspaceRoot, "packages", "cli", "dist", "index.js"),
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await removeTempInkosWorkspace(workspaceRoot);
    await Promise.all(extraDirectories.map((dirPath) => rm(dirPath, { recursive: true, force: true })));
  });

  it("returns chapter list from GET /api/chapters", async () => {
    const response = await fetch(`${baseUrl}/api/chapters?context=.&bookId=demo`);
    const payload = await response.json() as ChaptersResponse;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      bookId: "demo",
      title: "演示项目",
    });
    expect(payload.chapters).toHaveLength(1);
    expect(payload.chapters[0]).toMatchObject({
      number: 1,
      title: "旧标题",
      status: "ready-for-review",
    });
  });

  it("returns chapter document from GET /api/chapter", async () => {
    const response = await fetch(`${baseUrl}/api/chapter?context=.&bookId=demo&chapter=1`);
    const payload = await response.json() as ChapterResponse;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      bookId: "demo",
      chapter: 1,
      title: "旧标题",
      fileName: "0001_旧标题.md",
      reviewNote: "待处理",
      auditIssues: ["原问题"],
    });
    expect(payload.content).toBe("# 第1章 旧标题\n\n旧内容\n");
  });

  it("saves chapter document through POST /api/chapter", async () => {
    const response = await fetch(`${baseUrl}/api/chapter`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contextPath: ".",
        bookId: "demo",
        chapter: 1,
        content: "# 新标题\n\n这是 API 更新后的内容。",
      }),
    });
    const payload = await response.json() as ChapterSaveResponse;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      bookId: "demo",
      chapter: 1,
      title: "新标题",
      wordCount: 12,
    });

    const verifyResponse = await fetch(`${baseUrl}/api/chapter?context=.&bookId=demo&chapter=1`);
    const verifyPayload = await verifyResponse.json() as ChapterResponse;
    expect(verifyResponse.status).toBe(200);
    expect(verifyPayload.content).toBe("# 第1章 新标题\n\n这是 API 更新后的内容。\n");
    expect(verifyPayload.title).toBe("新标题");
  });

  it("returns error payload when GET /api/chapters is missing bookId", async () => {
    const response = await fetch(`${baseUrl}/api/chapters?context=.`);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      error: "Missing required query parameter: bookId",
    });
  });

  it("returns book overview and pending review queue from GET /api/dashboard", async () => {
    await writeFile(join(workspaceRoot, "books", "demo", "chapters", "index.json"), JSON.stringify([
      {
        number: 1,
        title: "开局",
        status: "approved",
        wordCount: 1500,
        createdAt: "2026-03-23T00:00:00.000Z",
        updatedAt: "2026-03-23T00:00:00.000Z",
        auditIssues: [],
      },
      {
        number: 2,
        title: "回潮",
        status: "ready-for-review",
        wordCount: 1600,
        createdAt: "2026-03-23T01:00:00.000Z",
        updatedAt: "2026-03-23T01:00:00.000Z",
        auditIssues: ["节奏偏慢"],
        reviewNote: "待人工复核",
      },
      {
        number: 3,
        title: "裂缝",
        status: "audit-failed",
        wordCount: 1700,
        createdAt: "2026-03-23T02:00:00.000Z",
        updatedAt: "2026-03-23T02:00:00.000Z",
        auditIssues: ["设定冲突", "情绪断层"],
        reviewNote: "需要修订",
      },
    ], null, 2), "utf-8");

    const response = await fetch(`${baseUrl}/api/dashboard?context=.`);
    const payload = await response.json() as DashboardResponse;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      contextPath: ".",
      initialized: true,
      totals: {
        books: 1,
        chapters: 3,
        words: 4800,
        pendingReviews: 2,
      },
    });
    expect(payload.books).toHaveLength(1);
    expect(payload.books[0]).toMatchObject({
      id: "demo",
      title: "演示项目",
      genre: "rebirth",
      platform: "tomato",
      status: "active",
      targetChapters: 100,
      chapters: 3,
      totalWords: 4800,
      approved: 1,
      pending: 2,
      failed: 1,
      nextChapter: 4,
    });
    expect(payload.pendingReviews).toEqual([
      {
        bookId: "demo",
        title: "演示项目",
        chapter: 2,
        chapterTitle: "回潮",
        status: "ready-for-review",
        issueCount: 1,
      },
      {
        bookId: "demo",
        title: "演示项目",
        chapter: 3,
        chapterTitle: "裂缝",
        status: "audit-failed",
        issueCount: 2,
      },
    ]);
  });

  it("returns empty dashboard state for uninitialized context", async () => {
    const response = await fetch(`${baseUrl}/api/dashboard?context=missing-context`);
    const payload = await response.json() as DashboardResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      contextPath: "missing-context",
      initialized: false,
      books: [],
      pendingReviews: [],
      totals: {
        books: 0,
        chapters: 0,
        words: 0,
        pendingReviews: 0,
      },
    });
  });

  it("returns meta payload with discovered contexts and command tree", async () => {
    await mkdir(join(workspaceRoot, "sandbox", "child-project"), { recursive: true });
    await writeFile(join(workspaceRoot, "sandbox", "child-project", "inkos.json"), JSON.stringify({ name: "child-project" }, null, 2), "utf-8");

    const response = await fetch(`${baseUrl}/api/meta`);
    const payload = await response.json() as MetaResponse;
    const workspaceContext = payload.contexts.find((context) => context.relativePath === ".");
    const childContext = payload.contexts.find((context) => context.relativePath === "sandbox/child-project");

    expect(response.status).toBe(200);
    expect(payload.workspaceRoot).toBe(workspaceRoot);
    expect(payload.cliBuilt).toBe(false);
    expect(payload.pathSuggestions).toContain("sandbox");
    expect(payload.pathSuggestions).toContain("sandbox/child-project");
    expect(workspaceContext).toMatchObject({
      relativePath: ".",
      label: "workspace",
      initialized: true,
      isDefault: true,
    });
    expect(childContext).toMatchObject({
      relativePath: "sandbox/child-project",
      initialized: true,
      isDefault: false,
    });
    expect(childContext?.label).toContain("child-project");

    const statusCommand = flattenCommandTree(payload.commands).find((command) => command.path === "status");
    const bookCreateCommand = flattenCommandTree(payload.commands).find((command) => command.path === "book create");

    expect(statusCommand).toMatchObject({
      path: "status",
      runnable: true,
    });
    expect(bookCreateCommand).toMatchObject({
      path: "book create",
      runnable: true,
    });
  });

  it("creates project through POST /api/projects with custom relative path", async () => {
    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetPath: "sandbox/new-project",
      }),
    });
    const payload = await response.json() as ProjectCreateResponse;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      createdContext: "sandbox/new-project",
      projectName: "new-project",
      projectPath: "sandbox/new-project",
    });
    expect(payload.contexts.some((context) => context.relativePath === "sandbox/new-project" && context.initialized)).toBe(true);
    expect(payload.pathSuggestions).toContain("sandbox/new-project");

    const metaResponse = await fetch(`${baseUrl}/api/meta`);
    const metaPayload = await metaResponse.json() as MetaResponse;
    expect(metaPayload.contexts.some((context) => context.relativePath === "sandbox/new-project" && context.initialized)).toBe(true);

    const dashboardResponse = await fetch(`${baseUrl}/api/dashboard?context=sandbox/new-project`);
    const dashboardPayload = await dashboardResponse.json() as DashboardResponse;
    expect(dashboardResponse.status).toBe(200);
    expect(dashboardPayload.initialized).toBe(true);
    expect(dashboardPayload.books).toEqual([]);
  });

  it("creates project through POST /api/projects with absolute path", async () => {
    const externalRoot = await mkdtemp(join(tmpdir(), "inkos-web-absolute-project-"));
    const projectTarget = join(externalRoot, "outside-project");
    extraDirectories.push(externalRoot);

    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        targetPath: projectTarget,
      }),
    });
    const payload = await response.json() as ProjectCreateResponse;
    const normalizedProjectTarget = resolve(projectTarget).replace(/\\/g, "/");

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      createdContext: normalizedProjectTarget,
      projectName: "outside-project",
      projectPath: normalizedProjectTarget,
    });

    const dashboardResponse = await fetch(`${baseUrl}/api/dashboard?context=${encodeURIComponent(normalizedProjectTarget)}`);
    const dashboardPayload = await dashboardResponse.json() as DashboardResponse;
    expect(dashboardResponse.status).toBe(200);
    expect(dashboardPayload).toMatchObject({
      contextPath: normalizedProjectTarget,
      initialized: true,
    });
  });

  it("returns directory tree from GET /api/path-tree", async () => {
    await mkdir(join(workspaceRoot, "sandbox", "child-project"), { recursive: true });
    await mkdir(join(workspaceRoot, "sandbox", "drafts"), { recursive: true });
    await writeFile(join(workspaceRoot, "sandbox", "child-project", "inkos.json"), JSON.stringify({ name: "child-project" }, null, 2), "utf-8");

    const rootResponse = await fetch(`${baseUrl}/api/path-tree?path=.`);
    const rootPayload = await rootResponse.json() as PathTreeResponse;

    expect(rootResponse.status).toBe(200);
    expect(rootPayload.path).toBe(".");
    expect(rootPayload.nodes.some((node) => node.path === "sandbox" && node.hasChildren)).toBe(true);

    const childResponse = await fetch(`${baseUrl}/api/path-tree?path=sandbox`);
    const childPayload = await childResponse.json() as PathTreeResponse;

    expect(childResponse.status).toBe(200);
    expect(childPayload.path).toBe("sandbox");
    expect(childPayload.parentPath).toBe(".");
    expect(childPayload.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: "sandbox/child-project",
        initialized: true,
      }),
      expect.objectContaining({
        path: "sandbox/drafts",
        initialized: false,
      }),
    ]));
  });

  it("returns filesystem roots and absolute directory tree from GET /api/path-tree", async () => {
    const externalRoot = await mkdtemp(join(tmpdir(), "inkos-web-absolute-tree-"));
    const childProject = join(externalRoot, "child-project");
    const draftsDir = join(externalRoot, "drafts");
    extraDirectories.push(externalRoot);

    await mkdir(childProject, { recursive: true });
    await mkdir(draftsDir, { recursive: true });
    await writeFile(join(childProject, "inkos.json"), JSON.stringify({ name: "child-project" }, null, 2), "utf-8");

    const rootsResponse = await fetch(`${baseUrl}/api/path-tree?path=${encodeURIComponent("@roots")}`);
    const rootsPayload = await rootsResponse.json() as PathTreeResponse;
    const driveRoot = parse(resolve(workspaceRoot)).root.replace(/\\/g, "/");
    const normalizedExternalRoot = resolve(externalRoot).replace(/\\/g, "/");

    expect(rootsResponse.status).toBe(200);
    expect(rootsPayload.path).toBe("@roots");
    expect(rootsPayload.nodes.some((node) => node.path === driveRoot)).toBe(true);

    const absoluteResponse = await fetch(`${baseUrl}/api/path-tree?path=${encodeURIComponent(normalizedExternalRoot)}`);
    const absolutePayload = await absoluteResponse.json() as PathTreeResponse;

    expect(absoluteResponse.status).toBe(200);
    expect(absolutePayload.path).toBe(normalizedExternalRoot);
    expect(absolutePayload.parentPath).toBe(parse(normalizedExternalRoot).root.replace(/\\/g, "/") === normalizedExternalRoot ? "@roots" : resolve(normalizedExternalRoot, "..").replace(/\\/g, "/"));
    expect(absolutePayload.nodes).toEqual(expect.arrayContaining([
      expect.objectContaining({
        path: `${normalizedExternalRoot}/child-project`,
        initialized: true,
      }),
      expect.objectContaining({
        path: `${normalizedExternalRoot}/drafts`,
        initialized: false,
      }),
    ]));
  });
});

function flattenCommandTree(commands: ReadonlyArray<CommandNode>): CommandNode[] {
  return commands.flatMap((command) => [command, ...flattenCommandTree(command.children)]);
}