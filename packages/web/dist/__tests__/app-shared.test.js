import { describe, expect, it } from "vitest";
import { buildPrefillFromDataset, getCommandDisplayName, getCommandPrefill, localizeCommand, } from "../../public/app-shared.js";
describe("app-shared", () => {
    it("localizes known command metadata into Chinese UI labels", () => {
        const localized = localizeCommand({
            path: "write next",
            description: "continue writing",
            runnable: true,
            supportsJson: true,
            arguments: [],
            options: [],
            children: [],
        });
        expect(localized.uiLabel).toBe("续写下一章");
        expect(localized.uiCategoryLabel).toBe("核心创作");
        expect(localized.uiDescription).toContain("继续写下一章");
    });
    it("builds dataset prefill for review approval and genre shortcut actions", () => {
        expect(buildPrefillFromDataset({ commandPath: "review approve", bookId: "demo", chapter: "12" })).toEqual({
            arguments: { args: "demo 12" },
            options: {},
        });
        expect(buildPrefillFromDataset({ commandPath: "genre show", genre: "rebirth" })).toEqual({
            arguments: { id: "rebirth" },
            options: {},
        });
    });
    it("derives command prefills from current selection and preserves explicit values", () => {
        const command = {
            path: "revise",
            supportsJson: true,
            arguments: [{ name: "book-id" }, { name: "chapter" }],
        };
        const prefill = getCommandPrefill(command, {
            commandPrefills: {
                revise: {
                    arguments: { chapter: "9" },
                    options: {},
                },
            },
            selectedBookId: "book-1",
            selectedChapterNumber: 7,
        });
        expect(prefill).toEqual({
            arguments: {
                "book-id": "book-1",
                chapter: "9",
            },
            options: {
                json: true,
                mode: "rewrite",
            },
        });
    });
    it("fills combined args for rewrite-style commands from selected chapter", () => {
        const prefill = getCommandPrefill({
            path: "review reject",
            supportsJson: false,
            arguments: [{ name: "args" }],
        }, {
            commandPrefills: {},
            selectedBookId: "demo-book",
            selectedChapterNumber: 4,
        });
        expect(prefill.arguments.args).toBe("demo-book 4");
        expect(getCommandDisplayName("review reject")).toBe("驳回章节");
    });
});
//# sourceMappingURL=app-shared.test.js.map