import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, extname, isAbsolute, join, parse, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";
import { StateManager } from "@actalk/inkos-core";
import { collectCommandMetadata, createProgram, type CommandMetadata } from "@actalk/inkos/program";
import {
  readBookChapters,
  readChapterDocument,
  saveChapterDocument,
  type ChapterSavePayload,
} from "./chapter-documents.js";
import { initializeProjectAt } from "./project-init.js";

interface ProjectContextInfo {
  readonly relativePath: string;
  readonly label: string;
  readonly initialized: boolean;
  readonly isDefault: boolean;
}

interface ExecutionPayload {
  readonly commandPath: string;
  readonly contextPath?: string;
  readonly arguments?: Record<string, string>;
  readonly options?: Record<string, string | boolean>;
}

interface ProjectCreatePayload {
  readonly targetPath?: string;
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

interface ChapterRequestPayload extends ChapterSavePayload {
  readonly contextPath?: string;
}

const runtimeDir = dirname(fileURLToPath(import.meta.url));
const host = "127.0.0.1";
const port = parseInt(process.env.INKOS_STUDIO_PORT ?? "3210", 10);
const filesystemRootsToken = "@roots";

export interface StudioServerOptions {
  readonly publicDir?: string;
  readonly workspaceRoot?: string;
  readonly cliEntry?: string;
}

const defaultWorkspaceRoot = resolve(runtimeDir, "../../..");
const defaultPublicDir = resolve(runtimeDir, "public");
const defaultCliEntry = resolve(defaultWorkspaceRoot, "packages/cli/dist/index.js");

const commandTree = collectCommandMetadata(createProgram());
const runnableCommandIndex = buildRunnableCommandIndex(commandTree);

export function createStudioServer(options: StudioServerOptions = {}): Server {
  const workspaceRoot = options.workspaceRoot ?? defaultWorkspaceRoot;
  const publicDir = options.publicDir ?? defaultPublicDir;
  const cliEntry = options.cliEntry ?? defaultCliEntry;

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `${host}:${port}`}`);

      if (request.method === "GET" && url.pathname === "/api/meta") {
        const contexts = await listProjectContexts(workspaceRoot);
        return json(response, 200, {
          workspaceRoot,
          cliBuilt: await exists(cliEntry),
          contexts,
          pathSuggestions: await listPathSuggestions(workspaceRoot, 3),
          commands: commandTree,
        });
      }

      if (request.method === "GET" && url.pathname === "/api/dashboard") {
        const contextRoot = resolveContextRoot(workspaceRoot, url.searchParams.get("context") ?? undefined);
        return json(response, 200, await readDashboard(workspaceRoot, contextRoot));
      }

      if (request.method === "GET" && url.pathname === "/api/chapters") {
        const contextRoot = resolveContextRoot(workspaceRoot, url.searchParams.get("context") ?? undefined);
        const bookId = url.searchParams.get("bookId");
        if (!bookId) {
          throw new Error("Missing required query parameter: bookId");
        }
        return json(response, 200, await readBookChapters(contextRoot, bookId));
      }

      if (request.method === "GET" && url.pathname === "/api/chapter") {
        const contextRoot = resolveContextRoot(workspaceRoot, url.searchParams.get("context") ?? undefined);
        const bookId = url.searchParams.get("bookId");
        const chapter = parseInt(url.searchParams.get("chapter") ?? "", 10);
        if (!bookId) {
          throw new Error("Missing required query parameter: bookId");
        }
        if (!Number.isInteger(chapter) || chapter < 1) {
          throw new Error("Missing or invalid query parameter: chapter");
        }
        return json(response, 200, await readChapterDocument(contextRoot, bookId, chapter));
      }

      if (request.method === "GET" && url.pathname === "/api/path-tree") {
        const targetPath = url.searchParams.get("path") ?? ".";
        return json(response, 200, await readPathTree(workspaceRoot, targetPath));
      }

      if (request.method === "POST" && url.pathname === "/api/chapter") {
        const payload = (await readJsonBody(request)) as ChapterRequestPayload;
        return json(response, 200, await saveChapterDocument(resolveContextRoot(workspaceRoot, payload.contextPath), payload));
      }

      if (request.method === "POST" && url.pathname === "/api/execute") {
        const payload = (await readJsonBody(request)) as ExecutionPayload;
        return json(response, 200, await executeCommand(workspaceRoot, cliEntry, payload));
      }

      if (request.method === "POST" && url.pathname === "/api/projects") {
        const payload = (await readJsonBody(request)) as ProjectCreatePayload;
        return json(response, 200, await createProject(workspaceRoot, payload));
      }

      if (request.method === "GET") {
        return serveStaticAsset(publicDir, url.pathname, response);
      }

      return json(response, 405, { error: `Unsupported method: ${request.method}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json(response, 500, { error: message });
    }
  });
}

export async function startStudioServer(server = createStudioServer()): Promise<Server> {
  await new Promise<void>((resolve) => {
    server.listen(port, host, () => resolve());
  });

  const contexts = await listProjectContexts(defaultWorkspaceRoot);
  const defaultContext = contexts.find((context) => context.isDefault);

  process.stdout.write(`InkOS Studio running at http://${host}:${port}\n`);
  process.stdout.write(`Workspace root: ${defaultWorkspaceRoot}\n`);
  if (defaultContext) {
    process.stdout.write(`Default project context: ${defaultContext.label}\n`);
  }

  return server;
}

function buildRunnableCommandIndex(commands: ReadonlyArray<CommandMetadata>): ReadonlyMap<string, CommandMetadata> {
  const entries: Array<readonly [string, CommandMetadata]> = [];

  const visit = (command: CommandMetadata): void => {
    if (command.runnable) {
      entries.push([command.path, command]);
    }
    for (const child of command.children) {
      visit(child);
    }
  };

  for (const command of commands) {
    visit(command);
  }

  return new Map(entries);
}

async function listProjectContexts(workspaceRoot: string): Promise<ReadonlyArray<ProjectContextInfo>> {
  const discovered = new Set<string>();
  const contexts: ProjectContextInfo[] = [];
  const defaultRelativePath = await pickDefaultContext(workspaceRoot);

  const registerContext = async (relativePath: string, label: string): Promise<void> => {
    const normalized = normalizeRelativePath(relativePath);
    if (discovered.has(normalized)) {
      return;
    }
    discovered.add(normalized);

    const absolutePath = resolve(workspaceRoot, normalized);
    contexts.push({
      relativePath: normalized,
      label,
      initialized: await exists(join(absolutePath, "inkos.json")),
      isDefault: normalized === defaultRelativePath,
    });
  };

  await registerContext(".", "workspace");

  for (const projectDir of await findProjectDirs(workspaceRoot, 3)) {
    await registerContext(relative(workspaceRoot, projectDir), relative(workspaceRoot, projectDir) || ".");
  }

  return contexts.sort((left, right) => {
    if (left.isDefault) return -1;
    if (right.isDefault) return 1;
    if (left.initialized !== right.initialized) return left.initialized ? -1 : 1;
    return left.label.localeCompare(right.label);
  });
}

async function pickDefaultContext(workspaceRoot: string): Promise<string> {
  if (await exists(join(workspaceRoot, "inkos.json"))) {
    return ".";
  }

  const candidates = await findProjectDirs(workspaceRoot, 3);
  if (candidates.length === 0) {
    return ".";
  }

  return normalizeRelativePath(relative(workspaceRoot, candidates[0]!));
}

async function findProjectDirs(root: string, depth: number): Promise<ReadonlyArray<string>> {
  const found: string[] = [];
  const ignored = new Set([".git", "node_modules", "dist"]);

  const visit = async (currentDir: string, currentDepth: number): Promise<void> => {
    if (await exists(join(currentDir, "inkos.json"))) {
      found.push(currentDir);
    }
    if (currentDepth >= depth) {
      return;
    }

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || ignored.has(entry.name)) {
        continue;
      }
      await visit(join(currentDir, entry.name), currentDepth + 1);
    }
  };

  await visit(root, 0);
  return found;
}

async function listPathSuggestions(root: string, depth: number): Promise<ReadonlyArray<string>> {
  const suggestions = new Set<string>(["."]);
  const ignored = new Set([".git", "node_modules", "dist"]);

  const visit = async (currentDir: string, currentDepth: number): Promise<void> => {
    if (currentDepth >= depth) {
      return;
    }

    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || ignored.has(entry.name)) {
        continue;
      }
      const absolutePath = join(currentDir, entry.name);
      const relativePath = normalizeRelativePath(relative(root, absolutePath) || ".");
      suggestions.add(relativePath);
      await visit(absolutePath, currentDepth + 1);
    }
  };

  await visit(root, 0);
  return [...suggestions].sort((left, right) => left.localeCompare(right));
}

async function readPathTree(workspaceRoot: string, targetPath: string): Promise<PathTreeResponse> {
  const root = resolvePathTreeRoot(workspaceRoot, targetPath);
  if (!root.absolutePath) {
    return {
      path: filesystemRootsToken,
      parentPath: null,
      nodes: await listFilesystemRoots(),
    };
  }
  const ignored = new Set([".git", "node_modules", "dist"]);
  const entries = await readdir(root.absolutePath, { withFileTypes: true });
  const nodes: PathTreeNode[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || ignored.has(entry.name)) {
      continue;
    }

    const absolutePath = join(root.absolutePath, entry.name);
    const hasChildren = await directoryHasVisibleChildren(absolutePath, ignored);
    nodes.push({
      path: toClientPath(workspaceRoot, absolutePath),
      label: entry.name,
      initialized: await exists(join(absolutePath, "inkos.json")),
      hasChildren,
    });
  }

  return {
    path: root.clientPath,
    parentPath: getParentClientPath(workspaceRoot, root.absolutePath, root.scope),
    nodes: nodes.sort((left, right) => left.label.localeCompare(right.label)),
  };
}

async function directoryHasVisibleChildren(dirPath: string, ignored: ReadonlySet<string>): Promise<boolean> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  return entries.some((entry) => entry.isDirectory() && !ignored.has(entry.name));
}

async function listFilesystemRoots(): Promise<ReadonlyArray<PathTreeNode>> {
  const roots: PathTreeNode[] = [];
  const ignored = new Set([".git", "node_modules", "dist"]);

  if (process.platform === "win32") {
    for (let code = 65; code <= 90; code += 1) {
      const drive = `${String.fromCharCode(code)}:/`;
      if (!(await exists(drive))) {
        continue;
      }
      roots.push({
        path: drive,
        label: drive.replace(/\/$/, ""),
        initialized: await exists(join(drive, "inkos.json")),
        hasChildren: await directoryHasVisibleChildren(drive, ignored),
      });
    }
    return roots;
  }

  return [{
    path: "/",
    label: "/",
    initialized: await exists(join("/", "inkos.json")),
    hasChildren: await directoryHasVisibleChildren("/", ignored),
  }];
}

async function readDashboard(workspaceRoot: string, contextRoot: string): Promise<Record<string, unknown>> {
  const initialized = await exists(join(contextRoot, "inkos.json"));
  if (!initialized) {
    return {
      contextPath: toClientPath(workspaceRoot, contextRoot),
      initialized: false,
      books: [],
      pendingReviews: [],
      totals: {
        books: 0,
        chapters: 0,
        words: 0,
        pendingReviews: 0,
      },
    };
  }

  const state = new StateManager(contextRoot);
  const bookIds = await state.listBooks();
  const books = [];
  const pendingReviews = [];
  let totalChapters = 0;
  let totalWords = 0;

  for (const bookId of bookIds) {
    const config = await state.loadBookConfig(bookId);
    const index = await state.loadChapterIndex(bookId);
    const approved = index.filter((chapter) => chapter.status === "approved").length;
    const pending = index.filter((chapter) => chapter.status === "ready-for-review" || chapter.status === "audit-failed").length;
    const failed = index.filter((chapter) => chapter.status === "audit-failed").length;
    const chapterWords = index.reduce((sum, chapter) => sum + chapter.wordCount, 0);

    totalChapters += index.length;
    totalWords += chapterWords;

    books.push({
      id: bookId,
      title: config.title,
      genre: config.genre,
      platform: config.platform,
      status: config.status,
      targetChapters: config.targetChapters,
      chapters: index.length,
      totalWords: chapterWords,
      approved,
      pending,
      failed,
      nextChapter: await state.getNextChapterNumber(bookId),
    });

    for (const chapter of index.filter((item) => item.status === "ready-for-review" || item.status === "audit-failed")) {
      pendingReviews.push({
        bookId,
        title: config.title,
        chapter: chapter.number,
        chapterTitle: chapter.title,
        status: chapter.status,
        issueCount: chapter.auditIssues.length,
      });
    }
  }

  return {
    contextPath: toClientPath(workspaceRoot, contextRoot),
    initialized: true,
    books,
    pendingReviews: pendingReviews.sort((left, right) => left.chapter - right.chapter),
    totals: {
      books: books.length,
      chapters: totalChapters,
      words: totalWords,
      pendingReviews: pendingReviews.length,
    },
  };
}

async function executeCommand(workspaceRoot: string, cliEntry: string, payload: ExecutionPayload): Promise<Record<string, unknown>> {
  const command = runnableCommandIndex.get(payload.commandPath);
  if (!command) {
    throw new Error(`Unknown command path: ${payload.commandPath}`);
  }

  if (!(await exists(cliEntry))) {
    throw new Error("CLI build output not found. Run 'pnpm --filter @actalk/inkos build' first.");
  }

  const contextRoot = resolveContextRoot(workspaceRoot, payload.contextPath);
  const argv = buildCommandArguments(command, payload);
  const result = await spawnProcess(process.execPath, [cliEntry, ...argv], contextRoot);
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();

  return {
    commandPath: command.path,
    contextPath: toClientPath(workspaceRoot, contextRoot),
    argv: ["inkos", ...argv],
    exitCode: result.exitCode,
    ok: result.exitCode === 0,
    stdout,
    stderr,
    json: tryParseJson(stdout),
  };
}

async function createProject(workspaceRoot: string, payload: ProjectCreatePayload): Promise<Record<string, unknown>> {
  const targetPath = normalizeProjectTargetPath(payload.targetPath);
  const projectRoot = resolveContextRoot(workspaceRoot, targetPath);

  if (await exists(join(projectRoot, "inkos.json"))) {
    throw new Error(`Target path already contains an InkOS project: ${targetPath}`);
  }

  const initialized = await initializeProjectAt(projectRoot);
  const contexts = await listProjectContexts(workspaceRoot);

  return {
    ok: true,
    createdContext: toClientPath(workspaceRoot, projectRoot),
    projectName: initialized.projectName,
    projectPath: toClientPath(workspaceRoot, projectRoot),
    contexts,
    pathSuggestions: await listPathSuggestions(workspaceRoot, 3),
  };
}

function buildCommandArguments(command: CommandMetadata, payload: ExecutionPayload): string[] {
  const args = [...command.path.split(" ")];
  const positionalValues = payload.arguments ?? {};
  const optionValues = payload.options ?? {};

  for (const argument of command.arguments) {
    const rawValue = positionalValues[argument.name]?.trim() ?? "";
    if (argument.variadic) {
      const values = splitVariadicValue(rawValue);
      if (argument.required && values.length === 0) {
        throw new Error(`Missing required argument: ${argument.name}`);
      }
      args.push(...values);
      continue;
    }

    if (!rawValue) {
      if (argument.required) {
        throw new Error(`Missing required argument: ${argument.name}`);
      }
      continue;
    }

    args.push(rawValue);
  }

  for (const option of command.options) {
    const value = optionValues[option.name];
    if (option.boolean) {
      if (value === true || value === "true") {
        args.push(option.long ?? option.flags.split(", ").at(-1) ?? option.flags);
      }
      continue;
    }

    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) {
      if (option.required) {
        throw new Error(`Missing required option: ${option.long ?? option.name}`);
      }
      continue;
    }

    args.push(option.long ?? option.flags.split(", ").at(-1) ?? option.flags, normalized);
  }

  return args;
}

function splitVariadicValue(value: string): string[] {
  const matches = value.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  return matches.map((item) => item.replace(/^['"]|['"]$/g, ""));
}

async function spawnProcess(command: string, args: ReadonlyArray<string>, cwd: string): Promise<{
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });
    child.on("error", rejectPromise);
    child.on("close", (exitCode) => {
      resolvePromise({
        exitCode: exitCode ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed || (!["{", "["].includes(trimmed[0]!))) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function resolveContextRoot(workspaceRoot: string, relativePath?: string | null): string {
  const rawPath = String(relativePath ?? ".").trim();
  if (!rawPath || rawPath === ".") {
    return workspaceRoot;
  }

  if (isAbsolute(rawPath)) {
    return resolve(rawPath);
  }

  const target = normalizeRelativePath(rawPath);
  const absolutePath = resolve(workspaceRoot, target);
  if (!isWithinBasePath(workspaceRoot, absolutePath)) {
    throw new Error(`Context path escapes the workspace: ${relativePath}`);
  }

  return absolutePath;
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath === "" ? "." : relativePath.replace(/\\/g, "/");
}

function normalizeProjectTargetPath(targetPath?: string): string {
  const rawPath = String(targetPath ?? "").trim();
  if (!rawPath) {
    throw new Error("Missing required field: targetPath");
  }

  if (isAbsolute(rawPath)) {
    return normalizeAbsolutePath(resolve(rawPath));
  }

  const normalized = normalizeRelativePath(rawPath);
  if (!normalized || normalized === ".") {
    throw new Error("Missing required field: targetPath");
  }
  return normalized.replace(/^\.\//, "");
}

function resolvePathTreeRoot(workspaceRoot: string, targetPath?: string | null): {
  readonly clientPath: string;
  readonly absolutePath: string | null;
  readonly scope: "workspace" | "absolute" | "roots";
} {
  const rawPath = String(targetPath ?? ".").trim();
  if (!rawPath || rawPath === ".") {
    return {
      clientPath: ".",
      absolutePath: workspaceRoot,
      scope: "workspace",
    };
  }

  if (rawPath === filesystemRootsToken) {
    return {
      clientPath: filesystemRootsToken,
      absolutePath: null,
      scope: "roots",
    };
  }

  if (isAbsolute(rawPath)) {
    return {
      clientPath: normalizeAbsolutePath(resolve(rawPath)),
      absolutePath: resolve(rawPath),
      scope: "absolute",
    };
  }

  const absolutePath = resolveContextRoot(workspaceRoot, rawPath);
  return {
    clientPath: normalizeRelativePath(rawPath),
    absolutePath,
    scope: "workspace",
  };
}

function getParentClientPath(workspaceRoot: string, absolutePath: string, scope: "workspace" | "absolute" | "roots"): string | null {
  if (scope === "roots") {
    return null;
  }

  if (scope === "workspace") {
    if (resolve(workspaceRoot) === resolve(absolutePath)) {
      return null;
    }
    const parentAbsolutePath = dirname(absolutePath);
    return toClientPath(workspaceRoot, parentAbsolutePath);
  }

  const rootPath = normalizeAbsolutePath(parse(absolutePath).root);
  const currentPath = normalizeAbsolutePath(absolutePath);
  if (currentPath === rootPath) {
    return filesystemRootsToken;
  }
  return normalizeAbsolutePath(dirname(absolutePath));
}

function toClientPath(workspaceRoot: string, absolutePath: string): string {
  if (isWithinBasePath(workspaceRoot, absolutePath)) {
    return normalizeRelativePath(relative(workspaceRoot, absolutePath) || ".");
  }
  return normalizeAbsolutePath(absolutePath);
}

function normalizeAbsolutePath(targetPath: string): string {
  const normalized = targetPath.replace(/\\/g, "/");
  if (/^[A-Za-z]:\/$/.test(normalized) || normalized === "/") {
    return normalized;
  }
  return normalized.replace(/\/+$/, "");
}

function isWithinBasePath(basePath: string, targetPath: string): boolean {
  const absoluteBasePath = resolve(basePath);
  const absoluteTargetPath = resolve(targetPath);
  const delta = relative(absoluteBasePath, absoluteTargetPath).replace(/\\/g, "/");
  return delta === "" || delta === "." || (!delta.startsWith("..") && resolve(absoluteBasePath, delta) === absoluteTargetPath);
}

async function serveStaticAsset(publicDir: string, pathname: string, response: import("node:http").ServerResponse): Promise<void> {
  const normalizedPath = pathname === "/" ? "/index.html" : pathname;
  const assetPath = resolve(publicDir, `.${normalizedPath}`);
  const relativeAssetPath = relative(publicDir, assetPath);

  if (relativeAssetPath.startsWith("..")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const asset = await readFile(assetPath);
    response.writeHead(200, {
      "content-type": contentType(extname(assetPath)),
      "cache-control": pathname === "/index.html" ? "no-cache" : "public, max-age=300",
    });
    response.end(asset);
  } catch {
    const indexPath = join(publicDir, "index.html");
    const indexHtml = await readFile(indexPath);
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(indexHtml);
  }
}

function contentType(extension: string): string {
  switch (extension) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function json(response: import("node:http").ServerResponse, statusCode: number, payload: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf-8");
  if (!raw.trim()) {
    return {};
  }
  return JSON.parse(raw);
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

const isMainModule = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;

if (isMainModule) {
  await startStudioServer();
}
