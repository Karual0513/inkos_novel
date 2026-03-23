import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StateManager } from "@actalk/inkos-core";
import { collectCommandMetadata, createProgram } from "@actalk/inkos/program";
import { readBookChapters, readChapterDocument, saveChapterDocument, } from "./chapter-documents.js";
import { initializeProjectAt } from "./project-init.js";
const runtimeDir = dirname(fileURLToPath(import.meta.url));
const host = "127.0.0.1";
const port = parseInt(process.env.INKOS_STUDIO_PORT ?? "3210", 10);
const defaultWorkspaceRoot = resolve(runtimeDir, "../../..");
const defaultPublicDir = resolve(runtimeDir, "public");
const defaultCliEntry = resolve(defaultWorkspaceRoot, "packages/cli/dist/index.js");
const commandTree = collectCommandMetadata(createProgram());
const runnableCommandIndex = buildRunnableCommandIndex(commandTree);
export function createStudioServer(options = {}) {
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
            if (request.method === "POST" && url.pathname === "/api/chapter") {
                const payload = (await readJsonBody(request));
                return json(response, 200, await saveChapterDocument(resolveContextRoot(workspaceRoot, payload.contextPath), payload));
            }
            if (request.method === "POST" && url.pathname === "/api/execute") {
                const payload = (await readJsonBody(request));
                return json(response, 200, await executeCommand(workspaceRoot, cliEntry, payload));
            }
            if (request.method === "POST" && url.pathname === "/api/projects") {
                const payload = (await readJsonBody(request));
                return json(response, 200, await createProject(workspaceRoot, payload));
            }
            if (request.method === "GET") {
                return serveStaticAsset(publicDir, url.pathname, response);
            }
            return json(response, 405, { error: `Unsupported method: ${request.method}` });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return json(response, 500, { error: message });
        }
    });
}
export async function startStudioServer(server = createStudioServer()) {
    await new Promise((resolve) => {
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
function buildRunnableCommandIndex(commands) {
    const entries = [];
    const visit = (command) => {
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
async function listProjectContexts(workspaceRoot) {
    const discovered = new Set();
    const contexts = [];
    const defaultRelativePath = await pickDefaultContext(workspaceRoot);
    const registerContext = async (relativePath, label) => {
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
        if (left.isDefault)
            return -1;
        if (right.isDefault)
            return 1;
        if (left.initialized !== right.initialized)
            return left.initialized ? -1 : 1;
        return left.label.localeCompare(right.label);
    });
}
async function pickDefaultContext(workspaceRoot) {
    if (await exists(join(workspaceRoot, "inkos.json"))) {
        return ".";
    }
    const candidates = await findProjectDirs(workspaceRoot, 3);
    if (candidates.length === 0) {
        return ".";
    }
    return normalizeRelativePath(relative(workspaceRoot, candidates[0]));
}
async function findProjectDirs(root, depth) {
    const found = [];
    const ignored = new Set([".git", "node_modules", "dist"]);
    const visit = async (currentDir, currentDepth) => {
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
async function listPathSuggestions(root, depth) {
    const suggestions = new Set(["."]);
    const ignored = new Set([".git", "node_modules", "dist"]);
    const visit = async (currentDir, currentDepth) => {
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
async function readDashboard(workspaceRoot, contextRoot) {
    const initialized = await exists(join(contextRoot, "inkos.json"));
    if (!initialized) {
        return {
            contextPath: normalizeRelativePath(relative(workspaceRoot, contextRoot) || "."),
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
        contextPath: normalizeRelativePath(relative(workspaceRoot, contextRoot) || "."),
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
async function executeCommand(workspaceRoot, cliEntry, payload) {
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
        contextPath: normalizeRelativePath(relative(workspaceRoot, contextRoot) || "."),
        argv: ["inkos", ...argv],
        exitCode: result.exitCode,
        ok: result.exitCode === 0,
        stdout,
        stderr,
        json: tryParseJson(stdout),
    };
}
async function createProject(workspaceRoot, payload) {
    const targetPath = normalizeProjectTargetPath(payload.targetPath);
    const projectRoot = resolveContextRoot(workspaceRoot, targetPath);
    if (await exists(join(projectRoot, "inkos.json"))) {
        throw new Error(`Target path already contains an InkOS project: ${targetPath}`);
    }
    const initialized = await initializeProjectAt(projectRoot);
    const contexts = await listProjectContexts(workspaceRoot);
    return {
        ok: true,
        createdContext: normalizeRelativePath(relative(workspaceRoot, projectRoot) || "."),
        projectName: initialized.projectName,
        projectPath: normalizeRelativePath(relative(workspaceRoot, projectRoot) || "."),
        contexts,
        pathSuggestions: await listPathSuggestions(workspaceRoot, 3),
    };
}
function buildCommandArguments(command, payload) {
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
function splitVariadicValue(value) {
    const matches = value.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
    return matches.map((item) => item.replace(/^['"]|['"]$/g, ""));
}
async function spawnProcess(command, args, cwd) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            cwd,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on("data", (chunk) => {
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
function tryParseJson(text) {
    const trimmed = text.trim();
    if (!trimmed || (!["{", "["].includes(trimmed[0]))) {
        return null;
    }
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return null;
    }
}
function resolveContextRoot(workspaceRoot, relativePath) {
    const target = normalizeRelativePath(relativePath ?? ".");
    const absolutePath = resolve(workspaceRoot, target);
    const delta = relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
    if (delta === "" || delta === ".") {
        return absolutePath;
    }
    if (delta.startsWith("..") || resolve(workspaceRoot, delta) !== absolutePath) {
        throw new Error(`Context path escapes the workspace: ${relativePath}`);
    }
    return absolutePath;
}
function normalizeRelativePath(relativePath) {
    return relativePath === "" ? "." : relativePath.replace(/\\/g, "/");
}
function normalizeProjectTargetPath(targetPath) {
    const normalized = normalizeRelativePath(String(targetPath ?? "").trim());
    if (!normalized || normalized === ".") {
        throw new Error("Missing required field: targetPath");
    }
    return normalized.replace(/^\.\//, "");
}
async function serveStaticAsset(publicDir, pathname, response) {
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
    }
    catch {
        const indexPath = join(publicDir, "index.html");
        const indexHtml = await readFile(indexPath);
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(indexHtml);
    }
}
function contentType(extension) {
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
function json(response, statusCode, payload) {
    response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(payload, null, 2));
}
async function readJsonBody(request) {
    const chunks = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const raw = Buffer.concat(chunks).toString("utf-8");
    if (!raw.trim()) {
        return {};
    }
    return JSON.parse(raw);
}
async function exists(targetPath) {
    try {
        await stat(targetPath);
        return true;
    }
    catch {
        return false;
    }
}
const isMainModule = process.argv[1] ? resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if (isMainModule) {
    await startStudioServer();
}
//# sourceMappingURL=server.js.map