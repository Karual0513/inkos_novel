import { readFile, writeFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const catalogPath = resolve(scriptDir, "genre-catalog.json");
const genresDir = resolve(rootDir, "packages", "core", "genres");

const catalog = JSON.parse(await readFile(catalogPath, "utf8"));

validateCatalog(catalog);

const builtinFiles = (await readdir(genresDir))
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.replace(/\.md$/, ""));

const builtinSet = new Set(builtinFiles);
const genreIds = catalog.map((genre) => genre.id);
const cliGenreExamples = renderCliGenreExamples(genreIds);
const cliPrimaryGenre = renderCliPrimaryGenre(genreIds);
const builtinGenres = catalog.filter((genre) => genre.comparisonSection === "builtin");
const candidateGenres = catalog.filter((genre) => genre.comparisonSection === "candidate");
const generatedCount = catalog.filter((genre) => builtinSet.has(genre.id)).length;
const pendingCount = catalog.length - generatedCount;
const listBuckets = {
  core: catalog.filter((genre) => genre.listBucket === "core"),
  existingExtension: catalog.filter((genre) => genre.listBucket === "existing-extension"),
  newExtension: catalog.filter((genre) => genre.listBucket === "new-extension"),
};

await replaceInFile(
  resolve(rootDir, "packages", "core", "src", "models", "book.ts"),
  /export const GenreSchema = z\.enum\(\[[\s\S]*?\]\);/,
  `export const GenreSchema = z.enum([\n${indentLines(renderStringList(genreIds), 2)}\n]);`,
);

await replaceInFile(
  resolve(rootDir, "packages", "core", "src", "pipeline", "agent.ts"),
  /genre: \{ type: "string", enum: \[[\s\S]*?\], description: "题材"\s*\},/,
  `genre: { type: "string", enum: [${genreIds.map((id) => `"${id}"`).join(", ")}], description: "题材" },`,
);

await replaceInFile(
  resolve(rootDir, "packages", "web", "public", "app-shared.js"),
  /export const GENRE_LABELS = \{[\s\S]*?\n\};/,
  `export const GENRE_LABELS = {\n${indentLines(renderLabelMap(catalog), 2)}\n};`,
);

await replaceInFile(
  resolve(rootDir, "packages", "cli", "src", "commands", "genre.ts"),
  /\.argument\("<id>", "Genre ID \(e\.g\. [^"]+\)"\)/,
  `.argument("<id>", "Genre ID (e.g. ${cliGenreExamples})")`,
);

await replaceInFile(
  resolve(rootDir, "packages", "cli", "src", "commands", "genre.ts"),
  /\.argument\("<id>", "Genre ID to copy \(e\.g\. [^"]+\)"\)/,
  `.argument("<id>", "Genre ID to copy (e.g. ${cliGenreExamples})")`,
);

await replaceInFile(
  resolve(rootDir, "packages", "cli", "src", "utils.ts"),
  /No books found\. Create one first:\\n  inkos book create --title '\.\.\.' --genre [^"\n]+/,
  `No books found. Create one first:\\n  inkos book create --title '...' --genre ${cliPrimaryGenre}`,
);

await replaceInFile(
  resolve(rootDir, "packages", "cli", "src", "commands", "init.ts"),
  /inkos book create --title '我的小说' --genre [^'\n]+ --platform tomato/g,
  `inkos book create --title '我的小说' --genre ${cliPrimaryGenre} --platform tomato`,
);

await replaceInFile(
  resolve(rootDir, "packages", "core", "src", "__tests__", "models.test.ts"),
  /const validGenres = \[[\s\S]*?\] as const;/,
  `const validGenres = [\n${indentLines(renderStringList(genreIds), 4)}\n  ] as const;`,
);

await replaceFirstMatchInFile(
  resolve(rootDir, "packages", "core", "src", "__tests__", "rules-reader.test.ts"),
  /expect\(ids\)\.toEqual\(expect\.arrayContaining\(\[[\s\S]*?\]\)\);/,
  `expect(ids).toEqual(expect.arrayContaining([\n${indentLines(renderStringList(genreIds), 6)}\n    ]));`,
);

await replaceFirstMatchInFile(
  resolve(rootDir, "packages", "core", "src", "__tests__", "rules-reader.test.ts"),
  /for \(const id of \[[\s\S]*?\] as const\) \{/,
  `for (const id of [\n${indentLines(renderStringList(genreIds), 6)}\n    ] as const) {`,
);

await replaceInFile(
  resolve(rootDir, "README.md"),
  /### 题材自定义[\s\S]*?### 单本书规则/,
  `${renderReadmeZhSection(catalog, listBuckets)}\n\n### 单本书规则`,
);

await replaceInFile(
  resolve(rootDir, "README.en.md"),
  /### Genre Customization[\s\S]*?### Per-Book Rules/,
  `${renderReadmeEnSection(catalog, listBuckets)}\n\n### Per-Book Rules`,
);

await replaceInFile(
  resolve(rootDir, "SKILL.md"),
  /description: .*$/m,
  `description: Autonomous novel writing CLI agent - use for creative fiction writing, novel generation, style imitation, chapter continuation, and AIGC detection. Supports ${catalog.length} built-in Chinese web novel genres with multi-agent pipeline and advanced auditing.`,
);

await replaceLineStartingWith(
  resolve(rootDir, "SKILL.md"),
  "- Genres (",
  `- Genres (${catalog.length} built-ins): ${genreIds.map((id) => `\`${id}\``).join(", ")}`,
);

await replaceInFile(
  resolve(rootDir, "技能.zh-CN.md"),
  /description: .*$/m,
  `description: 自主小说创作 CLI 智能体，可用于创意小说写作、小说生成、风格模仿、章节续写与 AIGC 检测。支持 ${catalog.length} 个内置中文网文题材，具备多智能体流水线与高级审校能力。`,
);

await replaceLineStartingWith(
  resolve(rootDir, "技能.zh-CN.md"),
  "- 题材（",
  `- 题材（${catalog.length} 个内置）： ${catalog.map((genre) => `\`${genre.id}\`（${genre.zh}）`).join("、")}`,
);

await writeFile(
  resolve(rootDir, "inkos - genres对照表.md"),
  renderComparisonTable(builtinGenres, candidateGenres, builtinSet, generatedCount, pendingCount),
  "utf8",
);

await assertFileContains(
  resolve(rootDir, "packages", "cli", "src", "commands", "genre.ts"),
  `Genre ID (e.g. ${cliGenreExamples})`,
);

await assertFileContains(
  resolve(rootDir, "packages", "cli", "src", "commands", "genre.ts"),
  `Genre ID to copy (e.g. ${cliGenreExamples})`,
);

await assertFileContains(
  resolve(rootDir, "packages", "cli", "src", "utils.ts"),
  `inkos book create --title '...' --genre ${cliPrimaryGenre}`,
);

await assertFileContains(
  resolve(rootDir, "packages", "cli", "src", "commands", "init.ts"),
  `inkos book create --title '我的小说' --genre ${cliPrimaryGenre} --platform tomato`,
);

function validateCatalog(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Genre catalog must be a non-empty array");
  }

  const seen = new Set();
  for (const entry of entries) {
    for (const key of ["id", "zh", "en", "zhRules", "enRules", "listBucket", "comparisonSection", "comparisonGroup"]) {
      if (!entry[key]) {
        throw new Error(`Genre catalog entry ${JSON.stringify(entry)} is missing required key: ${key}`);
      }
    }
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate genre id: ${entry.id}`);
    }
    seen.add(entry.id);
  }
}

function renderStringList(values) {
  return values.map((value) => `"${value}",`).join("\n");
}

function renderLabelMap(entries) {
  return entries.map((entry) => `${quoteKey(entry.id)}: "${entry.zh}",`).join("\n");
}

function renderCliGenreExamples(ids) {
  const preferred = ["xuanhuan", "infinite", "cyberpunk", "detective"];
  const selected = preferred.filter((id) => ids.includes(id));

  for (const id of ids) {
    if (selected.length >= 4) {
      break;
    }
    if (!selected.includes(id)) {
      selected.push(id);
    }
  }

  return selected.join(", ");
}

function renderCliPrimaryGenre(ids) {
  return ids.includes("xuanhuan") ? "xuanhuan" : ids[0];
}

function renderReadmeZhSection(entries, buckets) {
  return `### 题材自定义\n\n内置 ${entries.length} 个题材，每个题材带一套完整的创作规则：章节类型、禁忌清单、疲劳词、语言铁律、审计维度。\n\n| 题材       | 自带规则                                                     |\n| ---------- | ------------------------------------------------------------ |\n${entries.map((entry) => `| ${padTable(entry.zh, 10)} | ${padTable(entry.zhRules, 60)} |`).join("\n")}\n\n创建书时指定题材，对应规则自动生效：\n\n\`\`\`bash\ninkos book create --title "吞天魔帝" --genre xuanhuan\n\`\`\`\n\n可选题材 ID（${entries.length} 个）：\n\n- 传统题材：${buckets.core.map((genre) => `\`${genre.id}\``).join("、")}\n- 已有扩展：${buckets.existingExtension.map((genre) => `\`${genre.id}\``).join("、")}\n- 新增扩展：${buckets.newExtension.map((genre) => `\`${genre.id}\``).join("、")}\n\n题材规则可以查看、复制到项目中修改、或从零创建：\n\n\`\`\`bash\ninkos genre list                      # 查看所有题材\ninkos genre show xuanhuan             # 查看玄幻的完整规则\ninkos genre copy xuanhuan             # 复制到项目中，随意改\ninkos genre create wuxia --name 武侠   # 从零创建新题材\n\`\`\`\n\n复制到项目后，增删禁忌、调整疲劳词、修改节奏规则、自定义语言铁律——改完下次写章自动生效。\n\n每个题材有专属语言铁律（带 ✗→✓ 示例），写手和审计员同时执行：\n\n- **玄幻**：✗ "火元从12缕增加到24缕" → ✓ "手臂比先前有力了，握拳时指骨发紧"\n- **都市**：✗ "迅速分析了当前的债务状况" → ✓ "把那叠皱巴巴的白条翻了三遍"\n- **恐怖**：✗ "感到一阵恐惧" → ✓ "后颈的汗毛一根根立起来"`;
}

function renderReadmeEnSection(entries, buckets) {
  return `### Genre Customization\n\n${entries.length} built-in genres, each with a complete set of writing rules: chapter types, prohibition lists, fatigue words, language rules, and audit dimensions.\n\n| Genre                 | Built-in Rules                                                                                       |\n| --------------------- | ---------------------------------------------------------------------------------------------------- |\n${entries.map((entry) => `| ${padTable(entry.en, 21)} | ${padTable(entry.enRules, 100)} |`).join("\n")}\n\nSpecify a genre when creating a book and matching rules activate automatically:\n\n\`\`\`bash\ninkos book create --title "Devouring Emperor" --genre xuanhuan\n\`\`\`\n\nAvailable genre IDs (${entries.length} total):\n\n- Core: ${buckets.core.map((genre) => `\`${genre.id}\``).join(", ")}\n- Existing extensions: ${buckets.existingExtension.map((genre) => `\`${genre.id}\``).join(", ")}\n- New extensions: ${buckets.newExtension.map((genre) => `\`${genre.id}\``).join(", ")}\n\nView, copy, or create genre rules:\n\n\`\`\`bash\ninkos genre list                      # List all genres\ninkos genre show xuanhuan             # View full xuanhuan rules\ninkos genre copy xuanhuan             # Copy to project for customization\ninkos genre create wuxia --name Wuxia # Create a new genre from scratch\n\`\`\`\n\nAfter copying to your project, add/remove prohibitions, adjust fatigue words, modify pacing rules, customize language rules — changes take effect on the next chapter.\n\nEach genre ships with dedicated language rules (with ✗→✓ examples) enforced by both writers and auditors:\n\n- **Xuanhuan**: ✗ "Fire essence increased from 12 strands to 24 strands" → ✓ "His arm felt stronger than before, the finger bones tightening as he clenched his fist"\n- **Urban**: ✗ "He quickly analyzed the current debt situation" → ✓ "He flipped through that stack of wrinkled IOUs three times"\n- **Horror**: ✗ "He felt a wave of fear" → ✓ "The hairs on the back of his neck stood up one by one"`;
}

function renderComparisonTable(builtins, candidates, builtinSet, generatedCount, pendingCount) {
  const builtinRows = builtins.map((genre, index) => `| ${index + 1} | ${genre.zh} | ${genre.id} | ${genre.comparisonGroup} | ${builtinSet.has(genre.id) ? "已有类型" : "待扩展"} |`).join("\n");
  const candidateRows = candidates.map((genre, index) => `| ${index + 1} | ${genre.zh} | ${genre.id} | ${genre.comparisonGroup} | ${builtinSet.has(genre.id) ? "已有类型" : "待扩展"} |`).join("\n");

  return `# InkOS Genres 对照表\n\n本文档汇总 InkOS 当前已生成的 genre 模板，以及后续可扩展的全部类型候选。\n\n标注说明：\n\n- 已有类型：当前 packages/core/genres 中已经存在对应 md 文件\n- 待扩展：当前尚未落地为 genre 模板\n\n## 已有类型 ${builtins.length} 个\n\n| 序号 | 中文名 | 英文 id | 分组 | 状态 |\n| --- | --- | --- | --- | --- |\n${builtinRows}\n\n## 建议扩展类型 ${candidates.length} 个\n\n| 序号 | 中文名 | 英文 id | 分组 | 状态 |\n| --- | --- | --- | --- | --- |\n${candidateRows}\n\n## 汇总\n\n| 类别 | 数量 |\n| --- | --- |\n| 当前已生成 genre 模板 | ${generatedCount} |\n| 候选扩展类型总数 | ${builtins.length + candidates.length} |\n| 当前待扩展类型 | ${pendingCount} |\n`;
}

function quoteKey(value) {
  return /^[$A-Z_][0-9A-Z_$]*$/i.test(value) ? value : `"${value}"`;
}

function indentLines(text, size) {
  const indent = " ".repeat(size);
  return text.split("\n").map((line) => `${indent}${line}`).join("\n");
}

function padTable(value) {
  return value;
}

async function replaceInFile(filePath, pattern, replacement) {
  const content = await readFile(filePath, "utf8");
  if (!pattern.test(content)) {
    throw new Error(`Pattern not found for ${filePath}`);
  }
  const next = content.replace(pattern, replacement);
  await writeFile(filePath, next, "utf8");
}

async function replaceFirstMatchInFile(filePath, pattern, replacement) {
  const content = await readFile(filePath, "utf8");
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Pattern not found for ${filePath}`);
  }
  const next = content.replace(match[0], replacement);
  await writeFile(filePath, next, "utf8");
}

async function replaceLineStartingWith(filePath, prefix, replacement) {
  const content = await readFile(filePath, "utf8");
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  const normalizedPrefix = normalizeMarkdownBullet(prefix);
  const index = lines.findIndex((line) => normalizeMarkdownBullet(line).startsWith(normalizedPrefix));
  if (index === -1) {
    throw new Error(`Line starting with ${prefix} not found for ${filePath}`);
  }
  const bulletPrefix = lines[index].match(/^(\s*-\s+)/)?.[1] ?? (lines[index].match(/^\s*/)?.[0] ?? "");
  lines[index] = `${bulletPrefix}${stripMarkdownBullet(replacement)}`;
  await writeFile(filePath, lines.join(newline), "utf8");
}

function normalizeMarkdownBullet(line) {
  return `${line.trimStart().replace(/^(?:-\s*)+/, "- ")}`;
}

function stripMarkdownBullet(line) {
  return line.replace(/^(?:-\s*)+/, "");
}

async function assertFileContains(filePath, snippet) {
  const content = await readFile(filePath, "utf8");
  if (!content.includes(snippet)) {
    throw new Error(`Expected snippet not found in ${filePath}: ${snippet}`);
  }
}