import { PipelineRunner } from "./runner.js";
import { StateManager } from "../state/manager.js";
import { dispatchWebhookEvent } from "../notify/dispatcher.js";
import { detectChapter, detectAndRewrite } from "./detection-runner.js";
export class Scheduler {
    pipeline;
    state;
    config;
    tasks = [];
    running = false;
    // Quality gate tracking (per book)
    consecutiveFailures = new Map();
    pausedBooks = new Set();
    // Failure clustering: bookId → (dimension → count)
    failureDimensions = new Map();
    // Daily chapter counter: "YYYY-MM-DD" → count
    dailyChapterCount = new Map();
    constructor(config) {
        this.config = config;
        this.pipeline = new PipelineRunner(config);
        this.state = new StateManager(config.projectRoot);
    }
    async start() {
        if (this.running)
            return;
        this.running = true;
        // Run write cycle immediately on start, then schedule
        await this.runWriteCycle();
        // Schedule recurring write cycle
        const writeCycleMs = this.cronToMs(this.config.writeCron);
        const writeTask = {
            name: "write-cycle",
            intervalMs: writeCycleMs,
        };
        writeTask.timer = setInterval(() => {
            this.runWriteCycle().catch((e) => {
                this.config.onError?.("scheduler", e);
            });
        }, writeCycleMs);
        this.tasks.push(writeTask);
        // Schedule radar scan
        const radarMs = this.cronToMs(this.config.radarCron);
        const radarTask = {
            name: "radar-scan",
            intervalMs: radarMs,
        };
        radarTask.timer = setInterval(() => {
            this.runRadarScan().catch((e) => {
                this.config.onError?.("radar", e);
            });
        }, radarMs);
        this.tasks.push(radarTask);
    }
    stop() {
        this.running = false;
        for (const task of this.tasks) {
            if (task.timer)
                clearInterval(task.timer);
        }
        this.tasks = [];
    }
    get isRunning() {
        return this.running;
    }
    /** Resume a paused book. */
    resumeBook(bookId) {
        this.pausedBooks.delete(bookId);
        this.consecutiveFailures.delete(bookId);
        this.failureDimensions.delete(bookId);
    }
    /** Check if a book is paused. */
    isBookPaused(bookId) {
        return this.pausedBooks.has(bookId);
    }
    get gates() {
        return this.config.qualityGates ?? {
            maxAuditRetries: 2,
            pauseAfterConsecutiveFailures: 3,
            retryTemperatureStep: 0.1,
        };
    }
    /** Check if daily cap is reached across all books. */
    isDailyCapReached() {
        const today = new Date().toISOString().slice(0, 10);
        const count = this.dailyChapterCount.get(today) ?? 0;
        return count >= this.config.maxChaptersPerDay;
    }
    /** Increment daily chapter counter. */
    recordChapterWritten() {
        const today = new Date().toISOString().slice(0, 10);
        const count = this.dailyChapterCount.get(today) ?? 0;
        this.dailyChapterCount.set(today, count + 1);
        // Clean up old dates (keep only today)
        for (const key of this.dailyChapterCount.keys()) {
            if (key !== today)
                this.dailyChapterCount.delete(key);
        }
    }
    async runWriteCycle() {
        if (this.isDailyCapReached()) {
            process.stderr.write(`[scheduler] Daily cap reached (${this.config.maxChaptersPerDay}), skipping cycle\n`);
            return;
        }
        const bookIds = await this.state.listBooks();
        const activeBooks = [];
        for (const id of bookIds) {
            if (this.pausedBooks.has(id))
                continue;
            const config = await this.state.loadBookConfig(id);
            if (config.status === "active" || config.status === "outlining") {
                activeBooks.push({ id, config });
            }
        }
        const booksToWrite = activeBooks.slice(0, this.config.maxConcurrentBooks);
        // Parallel book processing
        await Promise.all(booksToWrite.map((book) => this.processBook(book.id, book.config)));
    }
    /** Process a single book: write chaptersPerCycle chapters with retry + cooldown. */
    async processBook(bookId, bookConfig) {
        for (let i = 0; i < this.config.chaptersPerCycle; i++) {
            if (!this.running)
                return;
            if (this.isDailyCapReached())
                return;
            if (this.pausedBooks.has(bookId))
                return;
            // Cooldown between chapters (skip for the first one)
            if (i > 0 && this.config.cooldownAfterChapterMs > 0) {
                await this.sleep(this.config.cooldownAfterChapterMs);
            }
            const success = await this.writeOneChapter(bookId, bookConfig);
            if (!success) {
                // Immediate retry with delay (if within retry limit)
                const failures = this.consecutiveFailures.get(bookId) ?? 0;
                if (failures <= this.gates.maxAuditRetries && this.config.retryDelayMs > 0) {
                    process.stderr.write(`[scheduler] ${bookId} retrying in ${this.config.retryDelayMs}ms\n`);
                    await this.sleep(this.config.retryDelayMs);
                    const retrySuccess = await this.writeOneChapter(bookId, bookConfig);
                    if (!retrySuccess)
                        break; // Stop this book's cycle on second failure
                }
                else {
                    break; // Stop this book's cycle
                }
            }
        }
    }
    /** Write one chapter for a book. Returns true if approved. */
    async writeOneChapter(bookId, bookConfig) {
        try {
            // Compute temperature override: base 0.7 + failures * step
            const failures = this.consecutiveFailures.get(bookId) ?? 0;
            const tempOverride = failures > 0
                ? Math.min(1.2, 0.7 + failures * this.gates.retryTemperatureStep)
                : undefined;
            const result = await this.pipeline.writeNextChapter(bookId, undefined, tempOverride);
            if (result.status === "approved") {
                this.consecutiveFailures.delete(bookId);
                this.recordChapterWritten();
                // Auto-detection loop after successful audit
                if (this.config.detection?.enabled) {
                    await this.runDetection(bookId, bookConfig, result.chapterNumber);
                }
                this.config.onChapterComplete?.(bookId, result.chapterNumber, result.status);
                return true;
            }
            // Audit failed — apply quality gates
            const issueCategories = result.auditResult.issues.map((i) => i.category);
            await this.handleAuditFailure(bookId, result.chapterNumber, issueCategories);
            this.config.onChapterComplete?.(bookId, result.chapterNumber, result.status);
            return false;
        }
        catch (e) {
            this.config.onError?.(bookId, e);
            await this.handleAuditFailure(bookId, 0);
            return false;
        }
    }
    async runDetection(bookId, bookConfig, chapterNumber) {
        if (!this.config.detection)
            return;
        try {
            const bookDir = this.state.bookDir(bookId);
            const chapterContent = await this.readChapterContent(bookDir, chapterNumber);
            const detResult = await detectChapter(this.config.detection, chapterContent, chapterNumber);
            if (!detResult.passed && this.config.detection.autoRewrite) {
                await detectAndRewrite(this.config.detection, { client: this.config.client, model: this.config.model, projectRoot: this.config.projectRoot }, bookDir, chapterContent, chapterNumber, bookConfig.genre);
            }
        }
        catch (e) {
            this.config.onError?.(bookId, e);
        }
    }
    async handleAuditFailure(bookId, chapterNumber, issueCategories = []) {
        const failures = (this.consecutiveFailures.get(bookId) ?? 0) + 1;
        this.consecutiveFailures.set(bookId, failures);
        // Track failure dimensions for clustering
        if (issueCategories.length > 0) {
            const existing = this.failureDimensions.get(bookId);
            const dimMap = existing ? new Map(existing) : new Map();
            for (const cat of issueCategories) {
                dimMap.set(cat, (dimMap.get(cat) ?? 0) + 1);
            }
            this.failureDimensions.set(bookId, dimMap);
            // Check for dimension clustering (any dimension with >=3 failures)
            for (const [dimension, count] of dimMap) {
                if (count >= 3) {
                    await this.emitDiagnosticAlert(bookId, chapterNumber, dimension, count);
                }
            }
        }
        const gates = this.gates;
        if (failures <= gates.maxAuditRetries) {
            process.stderr.write(`[scheduler] ${bookId} audit failed (${failures}/${gates.maxAuditRetries}), will retry\n`);
            return;
        }
        // Check if we should pause
        if (failures >= gates.pauseAfterConsecutiveFailures) {
            this.pausedBooks.add(bookId);
            const reason = `${failures} consecutive audit failures (threshold: ${gates.pauseAfterConsecutiveFailures})`;
            process.stderr.write(`[scheduler] ${bookId} PAUSED: ${reason}\n`);
            this.config.onPause?.(bookId, reason);
            if (this.config.notifyChannels && this.config.notifyChannels.length > 0) {
                await dispatchWebhookEvent(this.config.notifyChannels, {
                    event: "pipeline-error",
                    bookId,
                    chapterNumber: chapterNumber > 0 ? chapterNumber : undefined,
                    timestamp: new Date().toISOString(),
                    data: { reason, consecutiveFailures: failures },
                });
            }
        }
    }
    async runRadarScan() {
        try {
            await this.pipeline.runRadar();
        }
        catch (e) {
            this.config.onError?.("radar", e);
        }
    }
    async emitDiagnosticAlert(bookId, chapterNumber, dimension, count) {
        process.stderr.write(`[scheduler] DIAGNOSTIC: ${bookId} has ${count} failures in dimension "${dimension}"\n`);
        if (this.config.notifyChannels && this.config.notifyChannels.length > 0) {
            await dispatchWebhookEvent(this.config.notifyChannels, {
                event: "diagnostic-alert",
                bookId,
                chapterNumber: chapterNumber > 0 ? chapterNumber : undefined,
                timestamp: new Date().toISOString(),
                data: { dimension, failureCount: count },
            });
        }
    }
    async readChapterContent(bookDir, chapterNumber) {
        const { readFile, readdir } = await import("node:fs/promises");
        const { join } = await import("node:path");
        const chaptersDir = join(bookDir, "chapters");
        const files = await readdir(chaptersDir);
        const paddedNum = String(chapterNumber).padStart(4, "0");
        const chapterFile = files.find((f) => f.startsWith(paddedNum) && f.endsWith(".md"));
        if (!chapterFile) {
            throw new Error(`Chapter ${chapterNumber} file not found in ${chaptersDir}`);
        }
        const raw = await readFile(join(chaptersDir, chapterFile), "utf-8");
        const lines = raw.split("\n");
        const contentStart = lines.findIndex((l, i) => i > 0 && l.trim().length > 0);
        return contentStart >= 0 ? lines.slice(contentStart).join("\n") : raw;
    }
    cronToMs(cron) {
        const parts = cron.split(" ");
        if (parts.length < 5)
            return 24 * 60 * 60 * 1000;
        const minute = parts[0];
        const hour = parts[1];
        // "*/N * * * *" → every N minutes
        if (minute.startsWith("*/")) {
            const interval = parseInt(minute.slice(2), 10);
            return interval * 60 * 1000;
        }
        // "0 */N * * *" → every N hours
        if (hour.startsWith("*/")) {
            const interval = parseInt(hour.slice(2), 10);
            return interval * 60 * 60 * 1000;
        }
        // Fixed time → treat as daily
        return 24 * 60 * 60 * 1000;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=scheduler.js.map