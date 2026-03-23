import { createRequire } from "node:module";
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { configCommand } from "./commands/config.js";
import { bookCommand } from "./commands/book.js";
import { writeCommand } from "./commands/write.js";
import { reviewCommand } from "./commands/review.js";
import { statusCommand } from "./commands/status.js";
import { radarCommand } from "./commands/radar.js";
import { upCommand, downCommand } from "./commands/daemon.js";
import { doctorCommand } from "./commands/doctor.js";
import { exportCommand } from "./commands/export.js";
import { draftCommand } from "./commands/draft.js";
import { auditCommand } from "./commands/audit.js";
import { reviseCommand } from "./commands/revise.js";
import { agentCommand } from "./commands/agent.js";
import { genreCommand } from "./commands/genre.js";
import { updateCommand } from "./commands/update.js";
import { detectCommand } from "./commands/detect.js";
import { styleCommand } from "./commands/style.js";
import { analyticsCommand } from "./commands/analytics.js";
import { importCommand } from "./commands/import.js";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");
export function createProgram() {
    const program = new Command();
    program
        .name("inkos")
        .description("InkOS — Multi-agent novel production system")
        .version(version);
    program.addCommand(initCommand);
    program.addCommand(configCommand);
    program.addCommand(bookCommand);
    program.addCommand(writeCommand);
    program.addCommand(reviewCommand);
    program.addCommand(statusCommand);
    program.addCommand(radarCommand);
    program.addCommand(upCommand);
    program.addCommand(downCommand);
    program.addCommand(doctorCommand);
    program.addCommand(exportCommand);
    program.addCommand(draftCommand);
    program.addCommand(auditCommand);
    program.addCommand(reviseCommand);
    program.addCommand(agentCommand);
    program.addCommand(genreCommand);
    program.addCommand(updateCommand);
    program.addCommand(detectCommand);
    program.addCommand(styleCommand);
    program.addCommand(analyticsCommand);
    program.addCommand(importCommand);
    return program;
}
export function collectCommandMetadata(program) {
    return program.commands
        .filter((command) => command.name() !== "help")
        .map((command) => collectSingleCommandMetadata(command, []));
}
function collectSingleCommandMetadata(command, parentSegments) {
    const pathSegments = [...parentSegments, command.name()];
    const children = command.commands
        .filter((child) => child.name() !== "help")
        .map((child) => collectSingleCommandMetadata(child, pathSegments));
    const options = command.options
        .filter((option) => option.name() !== "help" && option.name() !== "version")
        .map((option) => {
        const valueRequired = Boolean(option.required);
        const valueOptional = Boolean(option.optional);
        const takesValue = valueRequired || valueOptional;
        return {
            name: option.attributeName(),
            flags: option.flags,
            short: option.short ?? undefined,
            long: option.long ?? undefined,
            description: option.description,
            takesValue,
            valueRequired,
            valueOptional,
            required: Boolean(option.mandatory),
            boolean: !takesValue,
            defaultValue: option.defaultValue,
        };
    });
    return {
        name: command.name(),
        path: pathSegments.join(" "),
        description: command.description(),
        usage: command.usage(),
        runnable: children.length === 0,
        supportsJson: options.some((option) => option.long === "--json"),
        arguments: command.registeredArguments.map((argument) => ({
            name: argument.name(),
            description: argument.description ?? "",
            required: argument.required,
            variadic: argument.variadic,
            defaultValue: argument.defaultValue,
        })),
        options,
        children,
    };
}
//# sourceMappingURL=program.js.map