import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
export async function initializeProjectAt(projectDir) {
    const projectName = basename(projectDir);
    await mkdir(projectDir, { recursive: true });
    await mkdir(join(projectDir, "books"), { recursive: true });
    await mkdir(join(projectDir, "radar"), { recursive: true });
    const config = {
        name: projectName,
        version: "0.1.0",
        llm: {
            provider: process.env.INKOS_LLM_PROVIDER ?? "openai",
            baseUrl: process.env.INKOS_LLM_BASE_URL ?? "https://api.openai.com/v1",
            model: process.env.INKOS_LLM_MODEL ?? "gpt-4o",
        },
        notify: [],
        detection: {
            enabled: false,
            provider: "custom",
            apiUrl: "https://your-detection-api.example.com/v1/detect",
            apiKeyEnv: "INKOS_DETECTION_API_KEY",
            threshold: 0.5,
            autoRewrite: false,
            maxRetries: 3,
        },
        daemon: {
            schedule: {
                radarCron: "0 */6 * * *",
                writeCron: "*/15 * * * *",
            },
            maxConcurrentBooks: 3,
        },
    };
    await writeFile(join(projectDir, "inkos.json"), JSON.stringify(config, null, 2), "utf-8");
    await writeFile(join(projectDir, ".env"), [
        "# LLM Configuration",
        "# Tip: Run 'inkos config set-global' to set once for all projects.",
        "# Provider: openai (OpenAI / compatible proxy), anthropic (Anthropic native)",
        "INKOS_LLM_PROVIDER=openai",
        "INKOS_LLM_BASE_URL=https://api.openai.com/v1",
        "INKOS_LLM_API_KEY=your-api-key-here",
        "INKOS_LLM_MODEL=gpt-4o",
        "",
        "# Optional parameters (defaults shown):",
        "# INKOS_LLM_TEMPERATURE=0.7",
        "# INKOS_LLM_MAX_TOKENS=8192",
        "# INKOS_LLM_THINKING_BUDGET=0",
        "# INKOS_LLM_API_FORMAT=chat",
        "",
        "# Detection API example (used by 'inkos detect' when detection.enabled=true in inkos.json):",
        "# INKOS_DETECTION_API_KEY=your-detection-key-here",
    ].join("\n"), "utf-8");
    await writeFile(join(projectDir, ".gitignore"), [".env", "node_modules/", ".DS_Store"].join("\n"), "utf-8");
    return {
        projectDir,
        projectName,
    };
}
//# sourceMappingURL=project-init.js.map