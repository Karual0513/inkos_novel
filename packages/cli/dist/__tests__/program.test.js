import { describe, expect, it } from "vitest";
import { collectCommandMetadata, createProgram } from "../program.js";
function flatten(commands) {
    return commands.flatMap((command) => [command, ...flatten(command.children)]);
}
describe("program metadata", () => {
    it("captures runnable CLI commands for the web console", () => {
        const commands = flatten(collectCommandMetadata(createProgram()));
        expect(commands.some((command) => command.path === "book create" && command.runnable)).toBe(true);
        expect(commands.some((command) => command.path === "write next" && command.supportsJson)).toBe(true);
        expect(commands.some((command) => command.path === "review approve" && command.arguments.length > 0)).toBe(true);
    });
});
//# sourceMappingURL=program.test.js.map