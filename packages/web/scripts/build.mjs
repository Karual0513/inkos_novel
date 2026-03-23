import { spawn } from "node:child_process";
import { cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const distDir = resolve(packageRoot, "dist");
const publicDir = resolve(packageRoot, "public");
const publicDistDir = resolve(distDir, "public");
const tscCommand = resolve(
  packageRoot,
  "node_modules",
  "typescript",
  "bin",
  "tsc",
);

await run(process.execPath, [tscCommand, "-p", "tsconfig.json"], packageRoot);

await rm(publicDistDir, { recursive: true, force: true });
await cp(publicDir, publicDistDir, { recursive: true });

function run(command, args, cwd) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", rejectPromise);
    child.on("close", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      rejectPromise(new Error(`Build command failed with exit code ${code ?? 1}`));
    });
  });
}