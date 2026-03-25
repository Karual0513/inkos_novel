import {
  BOOK_STATUS_LABELS,
  CHAPTER_STATUS_LABELS,
  GENRE_LABELS,
  PLATFORM_LABELS,
  REVISE_MODE_LABELS,
  buildPrefillFromDataset,
  getCommandDisplayName,
  getCommandPrefill,
  localizeCommand,
} from "./app-shared.js";

const FIELD_LABELS = {
  args: "参数串",
  id: "题材 ID",
  title: "书名",
  genre: "题材",
  platform: "平台",
  chapter: "章节号",
  "book-id": "书籍 ID",
  words: "章节字数",
  count: "生成章数",
  context: "创作说明",
  contextFile: "说明文件",
  targetChapters: "目标章数",
  chapterWords: "每章字数",
  status: "状态",
  mode: "修订模式",
  reason: "驳回原因",
  name: "显示名称",
  numerical: "启用数值系统",
  power: "启用战力体系",
  era: "启用时代考据",
  force: "跳过确认",
  json: "结构化输出",
};

const PAGE_DEFINITIONS = {
  overview: {
    hash: "#page-overview",
    label: "总览驾驶舱",
    description: "总览项目状态、近期命令和创作链路。",
  },
  editor: {
    hash: "#page-editor",
    label: "创作编辑器",
    description: "编辑正文并同步查看 Markdown 预览、章节信息和快捷动作。",
  },
  works: {
    hash: "#page-works",
    label: "作品管理",
    description: "管理小说规则、章节状态、审阅队列和修订动作。",
  },
  imports: {
    hash: "#page-imports",
    label: "文本导入",
    description: "处理文风仿写、番外写作和外部素材接入。",
  },
  genres: {
    hash: "#page-genres",
    label: "题材管理",
    description: "查看题材库、项目题材分布和题材规则命令。",
  },
  commands: {
    hash: "#page-commands",
    label: "命令中心",
    description: "直接执行 CLI 命令并查看控制台输出。",
  },
  agent: {
    hash: "#page-agent",
    label: "Agent",
    description: "组织智能体问答、创作指令和辅助流程。",
  },
  aigc: {
    hash: "#page-aigc",
    label: "AIGC 检测",
    description: "聚合检测风险、章节信号和处理建议。",
  },
  settings: {
    hash: "#page-settings",
    label: "设置配置",
    description: "处理全局配置、项目配置、项目创建与环境诊断。",
  },
};

const state = {
  meta: null,
  contexts: [],
  externalContexts: loadExternalContexts(),
  commands: [],
  selectedContext: ".",
  selectedCommandPath: "",
  search: "",
  dashboard: null,
  selectedBookId: "",
  chapters: [],
  selectedChapterNumber: null,
  activeChapter: null,
  editorContent: "",
  editorDirty: false,
  execution: null,
  history: loadHistory(),
  commandPrefills: {},
  currentPage: "overview",
  resultFilterStatus: "all",
  resultFilterQuery: "",
  projectCreatePath: "",
  pathTree: {},
  pathTreeLoading: {},
  pathTreeExpanded: [".", "@roots"],
};

const refs = {
  pageNav: document.querySelector("#page-nav"),
  pageTitle: document.querySelector("#page-title"),
  pageDescription: document.querySelector("#page-description"),
  overviewPanel: document.querySelector("#overview-panel"),
  worksOverview: document.querySelector("#works-overview"),
  editorContextPanel: document.querySelector("#editor-context-panel"),
  importsPanel: document.querySelector("#imports-panel"),
  genresPanel: document.querySelector("#genres-panel"),
  agentPanel: document.querySelector("#agent-panel"),
  aigcPanel: document.querySelector("#aigc-panel"),
  settingsPanel: document.querySelector("#settings-panel"),
  commandOverview: document.querySelector("#command-overview"),
  contextSelect: document.querySelector("#context-select"),
  refreshDashboard: document.querySelector("#refresh-dashboard"),
  cliStatus: document.querySelector("#cli-status"),
  cliStatusDot: document.querySelector("#cli-status-dot"),
  toolbarSummary: document.querySelector("#toolbar-summary"),
  dashboardCards: document.querySelector("#dashboard-cards"),
  commandSearch: document.querySelector("#command-search"),
  commandGroups: document.querySelector("#command-groups"),
  commandPanel: document.querySelector("#command-panel"),
  booksPanel: document.querySelector("#books-panel"),
  chaptersPanel: document.querySelector("#chapters-panel"),
  reviewsPanel: document.querySelector("#reviews-panel"),
  editorPanel: document.querySelector("#editor-panel"),
  outputPanel: document.querySelector("#output-panel"),
  resultsSidebar: document.querySelector("#results-sidebar"),
  viewPages: [...document.querySelectorAll(".view-page")],
};

await bootstrap();

async function bootstrap() {
  await loadMeta();
  await ensurePathTreeLoaded(".");
  await ensurePathTreeLoaded("@roots");
  bindEvents();
  syncPageFromHash();
  renderContextOptions();
  renderCommandGroups();
  await refreshDashboard();
  renderPageNav();
  renderOverviewPanel();
  renderEditorContextPanel();
  renderCommandPanel();
  renderOutputPanel();
  renderCommandOverview();
  renderWorksOverview();
  renderImportsPanel();
  renderGenresPanel();
  renderAgentPanel();
  renderAigcPanel();
  renderSettingsPanel();
  updateProjectPathPreview();
}

async function loadMeta(preferredContext = state.selectedContext) {
  const response = await fetch("/api/meta");
  state.meta = await response.json();
  state.contexts = mergeContexts(state.meta.contexts, preferredContext);
  state.commands = flattenCommands(state.meta.commands)
    .filter((command) => command.runnable)
    .map(localizeCommand);
  state.selectedContext = state.contexts.find((context) => context.relativePath === preferredContext)?.relativePath
    ?? state.contexts.find((context) => context.isDefault)?.relativePath
    ?? ".";
  state.selectedCommandPath = state.commands.find((command) => command.path === "status")?.path ?? state.commands[0]?.path ?? "";
  refs.cliStatus.textContent = state.meta.cliBuilt ? "CLI 就绪" : "CLI 未构建";
  if (refs.cliStatusDot) {
    refs.cliStatusDot.className = state.meta.cliBuilt ? "cli-dot" : "cli-dot offline";
  }
  renderToolbarSummary();
}

function bindEvents() {
  window.addEventListener("hashchange", () => {
    syncPageFromHash();
  });

  refs.settingsPanel.addEventListener("submit", async (event) => {
    const form = event.target.closest("#project-create-form");
    if (!form) {
      return;
    }
    event.preventDefault();
    await createProjectFromOverview();
  });

  refs.settingsPanel.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    if (action.dataset.action === "use-selected-context-path") {
      const value = state.selectedContext && state.selectedContext !== "." ? state.selectedContext : "";
      state.projectCreatePath = value;
      const input = refs.settingsPanel.querySelector("#project-create-path");
      if (input) {
        input.value = value;
      }
      updateProjectPathPreview();
      renderSettingsPanel();
    }

    if (action.dataset.action === "toggle-path-node") {
      void togglePathNode(action.dataset.pathNode || ".");
    }

    if (action.dataset.action === "select-path-node") {
      state.projectCreatePath = action.dataset.pathNode || "";
      updateProjectPathPreview();
      renderSettingsPanel();
    }

    if (action.dataset.action === "reload-path-tree") {
      state.pathTree = {};
      state.pathTreeExpanded = [".", "@roots"];
      void Promise.all([ensurePathTreeLoaded("."), ensurePathTreeLoaded("@roots")]).then(() => {
        renderSettingsPanel();
      });
    }

    if (action.dataset.action === "select-path-parent") {
      const parentPath = getPathParent(state.projectCreatePath);
      if (!parentPath) {
        return;
      }
      state.projectCreatePath = parentPath;
      void ensurePathTreeLoaded(parentPath).then(() => {
        expandPathTrail(parentPath);
        renderSettingsPanel();
      });
    }
  });

  refs.settingsPanel.addEventListener("input", (event) => {
    if (event.target.id !== "project-create-path") {
      return;
    }
    state.projectCreatePath = event.target.value;
    updateProjectPathPreview();
  });

  refs.refreshDashboard.addEventListener("click", async () => {
    refs.refreshDashboard.disabled = true;
    const originalText = refs.refreshDashboard.textContent;
    refs.refreshDashboard.textContent = "刷新中...";
    try {
      await refreshDashboard();
      renderPageNav();
      renderCommandPanel();
      renderOutputPanel();
    } finally {
      refs.refreshDashboard.disabled = false;
      refs.refreshDashboard.textContent = originalText;
    }
  });

  refs.contextSelect.addEventListener("change", async (event) => {
    if (!(await confirmDiscardEditorChanges())) {
      refs.contextSelect.value = state.selectedContext;
      return;
    }
    state.selectedContext = event.target.value;
    state.selectedBookId = "";
    state.selectedChapterNumber = null;
    state.activeChapter = null;
    state.editorContent = "";
    state.editorDirty = false;
    await refreshDashboard();
    renderPageNav();
    renderCommandPanel();
  });

  refs.commandSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderCommandGroups();
    renderCommandOverview();
  });

  for (const panel of [refs.overviewPanel, refs.editorContextPanel, refs.commandOverview, refs.importsPanel, refs.genresPanel, refs.agentPanel, refs.aigcPanel, refs.settingsPanel]) {
    panel?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-command-path]");
      if (!button) {
        return;
      }
      openCommand(button.dataset.commandPath, buildPrefillFromDataset(button.dataset));
    });
  }

  refs.agentPanel.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    if (action.dataset.action === "open-agent-command") {
      const promptInput = refs.agentPanel.querySelector("#agent-prompt-input");
      const contextInput = refs.agentPanel.querySelector("#agent-context-input");
      const turnsInput = refs.agentPanel.querySelector("#agent-max-turns-input");
      const prompt = String(promptInput?.value ?? "").trim();
      const context = String(contextInput?.value ?? "").trim();
      const maxTurns = String(turnsInput?.value ?? "").trim();
      openCommand("agent", prompt ? {
        arguments: { instruction: prompt },
        options: {
          context,
          maxTurns,
        },
      } : {});
    }
  });

  refs.importsPanel.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    const styleFile = String(refs.importsPanel.querySelector("#style-source-file")?.value ?? "").trim();
    const styleName = String(refs.importsPanel.querySelector("#style-source-name")?.value ?? "").trim();
    const targetBookId = String(refs.importsPanel.querySelector("#import-target-book")?.value ?? state.selectedBookId ?? "").trim();
    const canonFrom = String(refs.importsPanel.querySelector("#canon-parent-book")?.value ?? "").trim();
    const chaptersFrom = String(refs.importsPanel.querySelector("#chapter-import-path")?.value ?? "").trim();
    const draftBookId = String(refs.importsPanel.querySelector("#draft-book-id")?.value ?? state.selectedBookId ?? "").trim();
    const draftWords = String(refs.importsPanel.querySelector("#draft-words")?.value ?? "").trim();
    const draftContext = String(refs.importsPanel.querySelector("#draft-context")?.value ?? "").trim();

    if (action.dataset.action === "prepare-style-analyze") {
      openCommand("style analyze", {
        arguments: { file: styleFile },
        options: { name: styleName },
      });
    }

    if (action.dataset.action === "prepare-style-import") {
      openCommand("style import", {
        arguments: { file: styleFile, "book-id": targetBookId },
        options: { name: styleName },
      });
    }

    if (action.dataset.action === "prepare-import-canon") {
      openCommand("import canon", {
        arguments: { "target-book-id": targetBookId },
        options: { from: canonFrom },
      });
    }

    if (action.dataset.action === "prepare-import-chapters") {
      openCommand("import chapters", {
        arguments: { "book-id": targetBookId },
        options: { from: chaptersFrom },
      });
    }

    if (action.dataset.action === "prepare-draft") {
      openCommand("draft", {
        arguments: { "book-id": draftBookId },
        options: { words: draftWords, context: draftContext },
      });
    }
  });

  refs.aigcPanel.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    const bookId = String(refs.aigcPanel.querySelector("#aigc-book-id")?.value ?? state.selectedBookId ?? "").trim();
    const chapter = String(refs.aigcPanel.querySelector("#aigc-chapter")?.value ?? state.selectedChapterNumber ?? "").trim();

    if (action.dataset.action === "prepare-detect") {
      openCommand("detect", {
        arguments: { "book-id": bookId, chapter },
      });
    }

    if (action.dataset.action === "prepare-detect-stats") {
      openCommand("detect", {
        arguments: { "book-id": bookId },
        options: { stats: true },
      });
    }

    if (action.dataset.action === "prepare-detect-all") {
      openCommand("detect", {
        arguments: { "book-id": bookId },
        options: { all: true },
      });
    }
  });

  refs.settingsPanel.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    if (action.dataset.action === "prepare-config-set") {
      const key = String(refs.settingsPanel.querySelector("#config-key-input")?.value ?? "").trim();
      const value = String(refs.settingsPanel.querySelector("#config-value-input")?.value ?? "").trim();
      openCommand("config set", { arguments: { key, value } });
    }

    if (action.dataset.action === "prepare-show-global") {
      openCommand("config show-global");
    }

    if (action.dataset.action === "prepare-show-models") {
      openCommand("config show-models");
    }
  });

  refs.commandGroups.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-command-path]");
    if (!button) {
      return;
    }
    state.selectedCommandPath = button.dataset.commandPath;
    renderCommandGroups();
    renderCommandPanel();
    renderCommandOverview();
  });

  refs.commandPanel.addEventListener("input", (event) => {
    if (event.target.closest("[data-kind]")) {
      updatePreview();
    }
  });

  refs.commandPanel.addEventListener("click", async (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    if (action.dataset.action === "execute") {
      await executeSelectedCommand();
    }

    if (action.dataset.action === "copy") {
      await navigator.clipboard.writeText(buildPreview());
      const oldText = action.textContent;
      action.textContent = "已复制";
      setTimeout(() => {
        action.textContent = oldText;
      }, 1200);
    }

    if (action.dataset.action === "open-shortcut") {
      openCommand(action.dataset.commandPath, buildPrefillFromDataset(action.dataset));
    }
  });

  refs.booksPanel.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "select-book") {
      if (!(await confirmDiscardEditorChanges())) {
        return;
      }
      await selectBook(button.dataset.bookId);
      return;
    }

    if (button.dataset.action === "prefill-command") {
      openCommand(button.dataset.commandPath, buildPrefillFromDataset(button.dataset));
    }
  });

  refs.chaptersPanel.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "select-chapter") {
      if (!(await confirmDiscardEditorChanges())) {
        return;
      }
      await loadChapter(button.dataset.bookId, Number(button.dataset.chapter));
      return;
    }

    if (button.dataset.action === "prefill-command") {
      openCommand(button.dataset.commandPath, buildPrefillFromDataset(button.dataset));
    }
  });

  refs.reviewsPanel.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "select-review") {
      if (!(await confirmDiscardEditorChanges())) {
        return;
      }
      await selectBook(button.dataset.bookId);
      await loadChapter(button.dataset.bookId, Number(button.dataset.chapter));
      return;
    }

    if (button.dataset.action === "prefill-command") {
      openCommand(button.dataset.commandPath, buildPrefillFromDataset(button.dataset));
    }
  });

  refs.editorPanel.addEventListener("input", (event) => {
    if (event.target.id !== "chapter-editor") {
      return;
    }
    state.editorContent = event.target.value;
    state.editorDirty = state.activeChapter ? state.editorContent !== state.activeChapter.content : false;
    renderEditorMeta();
    renderEditorContextPanel();
    updateEditorPreview();
  });

  refs.editorPanel.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    if (button.dataset.action === "save-editor") {
      await saveCurrentChapter();
      return;
    }

    if (button.dataset.action === "revert-editor") {
      if (!state.activeChapter) {
        return;
      }
      state.editorContent = state.activeChapter.content;
      state.editorDirty = false;
      renderEditorPanel();
      return;
    }

    if (button.dataset.action === "prefill-command") {
      openCommand(button.dataset.commandPath, buildPrefillFromDataset(button.dataset));
    }
  });

  refs.outputPanel.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-history-index]");
    if (button) {
      const item = getFilteredHistory()[Number(button.dataset.historyIndex)];
      if (!item) {
        return;
      }

      if (state.contexts.some((context) => context.relativePath === item.contextPath)) {
        state.selectedContext = item.contextPath;
        refs.contextSelect.value = item.contextPath;
      }

      if (item.payload) {
        state.commandPrefills[item.commandPath] = item.payload;
      }
      state.selectedCommandPath = item.commandPath;
      setCurrentPage("commands");
      renderContextOptions();
      renderCommandGroups();
      renderCommandPanel();
      renderCommandOverview();
      return;
    }

    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    if (action.dataset.action === "clear-results-filters") {
      state.resultFilterStatus = "all";
      state.resultFilterQuery = "";
      renderOutputPanel();
    }
  });

  refs.outputPanel.addEventListener("input", (event) => {
    if (event.target.id === "history-search") {
      state.resultFilterQuery = event.target.value.trim().toLowerCase();
      renderOutputPanel();
    }
  });

  refs.outputPanel.addEventListener("change", (event) => {
    if (event.target.id === "history-status-filter") {
      state.resultFilterStatus = event.target.value;
      renderOutputPanel();
    }
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.editorDirty) {
      return;
    }
    event.preventDefault();
    event.returnValue = "";
  });
}

function renderContextOptions() {
  refs.contextSelect.innerHTML = state.contexts
    .map(
      (context) => `
        <option value="${escapeAttribute(context.relativePath)}" ${context.relativePath === state.selectedContext ? "selected" : ""}>
          ${escapeHtml(formatContextLabel(context))}${context.initialized ? "" : "（未初始化）"}
        </option>
      `,
    )
    .join("");
}

function renderCommandGroups() {
  const commands = getVisibleCommands();

  const groups = groupCommands(commands);
  refs.commandGroups.innerHTML = groups.length > 0
    ? groups
      .map(
        ([group, items]) => `
          <section class="command-group">
            <h3>${escapeHtml(group)}</h3>
            ${items
              .map(
                (command) => `
                  <button class="command-item ${command.path === state.selectedCommandPath ? "active" : ""}" data-command-path="${escapeAttribute(command.path)}">
                    <span>${escapeHtml(command.uiLabel)}</span>
                    <small>${escapeHtml(command.uiDescription || command.description || "暂无说明")}</small>
                    <small class="path-hint">${escapeHtml(command.path)}</small>
                  </button>
                `,
              )
              .join("")}
          </section>
        `,
      )
      .join("")
    : `<div class="empty-state tiny"><p>没有匹配的命令，请换个关键词。</p></div>`;
}

function renderCommandPanel() {
  const command = getSelectedCommand();
  if (!command) {
    refs.commandPanel.innerHTML = `<div class="empty-state"><h2>没有可用命令</h2><p>当前没有可执行命令。</p></div>`;
    return;
  }

  const prefill = getCommandPrefill(command, state);
  refs.commandPanel.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">${escapeHtml(command.uiLabel)}</h3>
        <p class="card-subtitle">${escapeHtml(command.uiDescription || command.description || "通过中文表单执行命令")}</p>
      </div>
      <div class="badge-row">
        <span class="badge">${escapeHtml(command.uiCategoryLabel)}</span>
        <span class="badge">${command.supportsJson ? "结构化" : "文本"}</span>
        <span class="badge">参数 ${command.arguments.length}</span>
        <span class="badge">选项 ${command.options.length}</span>
      </div>
    </div>

    <div class="context-bar">
      <span>当前上下文：${escapeHtml(state.selectedContext)}</span>
      <span>${state.selectedBookId ? `当前书籍：${escapeHtml(getSelectedBook()?.title ?? state.selectedBookId)}` : "当前书籍：未选择"}</span>
      <span>${state.selectedChapterNumber ? `当前章节：第 ${state.selectedChapterNumber} 章` : "当前章节：未选择"}</span>
    </div>

    ${renderPageJumpLinks("commands")}

    ${renderCommandShortcuts(command)}

    <div class="usage-box">${escapeHtml(`inkos ${command.path} ${command.usage}`.trim())}</div>

    <div class="form-grid">
      <section>
        <h3>位置参数</h3>
        ${command.arguments.length > 0 ? command.arguments.map((argument) => renderArgumentField(command, argument, prefill.arguments[argument.name] ?? "")).join("") : `<p class="muted">这条命令没有位置参数。</p>`}
      </section>
      <section>
        <h3>命令选项</h3>
        ${command.options.length > 0 ? command.options.map((option) => renderOptionField(command, option, prefill.options[option.name])).join("") : `<p class="muted">这条命令没有可配置选项。</p>`}
      </section>
    </div>

    <div class="preview-box">
      <label>命令预览</label>
      <pre id="command-preview">${escapeHtml(buildPreview(command))}</pre>
    </div>

    <div class="action-row">
      <button class="primary" data-action="execute">执行命令</button>
      <button class="secondary" data-action="copy">复制命令</button>
    </div>
  `;
}

function renderArgumentField(command, argument, value) {
  return renderFieldBlock({
    command,
    kind: "argument",
    field: argument,
    value,
    label: getFieldLabel(command.path, argument.name),
    hint: getFieldHint(command.path, argument.name, argument.description, argument.required, argument.variadic),
  });
}

function renderOptionField(command, option, value) {
  return renderFieldBlock({
    command,
    kind: "option",
    field: option,
    value,
    label: getFieldLabel(command.path, option.name),
    hint: getFieldHint(command.path, option.name, option.description, option.required, false),
  });
}

function renderFieldBlock({ command, kind, field, value, label, hint }) {
  const control = renderFieldControl(command, kind, field, value);
  if (field.boolean) {
    return `
      <label class="toggle-field">
        ${control}
        <span>
          <strong>${escapeHtml(label)}</strong>
          <small>${escapeHtml(hint)}</small>
        </span>
      </label>
    `;
  }

  return `
    <label class="field">
      <span>${escapeHtml(label)}${field.required ? " *" : ""}</span>
      ${control}
      <small>${escapeHtml(hint)}</small>
    </label>
  `;
}

function renderFieldControl(command, kind, field, value) {
  const normalizedValue = value ?? (field.boolean ? false : "");
  const dataAttrs = `data-kind="${kind}" data-name="${escapeAttribute(field.name)}"`;
  const options = getKnownFieldOptions(command.path, kind, field.name);

  if (field.boolean) {
    return `<input ${dataAttrs} type="checkbox" ${normalizedValue ? "checked" : ""} />`;
  }

  if (options.length > 0) {
    const currentValue = String(normalizedValue ?? "");
    return `
      <select ${dataAttrs}>
        <option value="">${field.required ? "请选择" : "留空使用默认"}</option>
        ${options
          .map(
            (option) => `<option value="${escapeAttribute(option.value)}" ${option.value === currentValue ? "selected" : ""}>${escapeHtml(option.label)}</option>`,
          )
          .join("")}
      </select>
    `;
  }

  const placeholder = getFieldPlaceholder(command.path, kind, field.name, field.variadic);
  return `<input ${dataAttrs} type="text" value="${escapeAttribute(String(normalizedValue ?? ""))}" placeholder="${escapeAttribute(placeholder)}" />`;
}

async function refreshDashboard() {
  const response = await fetch(`/api/dashboard?context=${encodeURIComponent(state.selectedContext)}`);
  state.dashboard = await response.json();
  renderToolbarSummary();
  renderPageNav();
  renderWorksOverview();
  renderOverviewPanel();
  renderImportsPanel();
  renderGenresPanel();
  renderAigcPanel();
  renderSettingsPanel();

  if (!state.dashboard.initialized) {
    state.selectedBookId = "";
    state.selectedChapterNumber = null;
    state.chapters = [];
    state.activeChapter = null;
    state.editorContent = "";
    state.editorDirty = false;
    renderDashboardCards();
    renderBooksPanel();
    renderChaptersPanel();
    renderReviewsPanel();
    renderEditorContextPanel();
    renderEditorPanel();
    return;
  }

  syncBookSelection();
  renderDashboardCards();
  renderBooksPanel();
  renderReviewsPanel();
  renderEditorContextPanel();

  if (state.selectedBookId) {
    await loadBookChapters(state.selectedBookId);
  } else {
    state.chapters = [];
    state.selectedChapterNumber = null;
    state.activeChapter = null;
    state.editorContent = "";
    state.editorDirty = false;
    renderChaptersPanel();
    renderEditorContextPanel();
    renderEditorPanel();
  }
}

function renderDashboardCards() {
  const totals = state.dashboard?.totals ?? { books: 0, chapters: 0, words: 0, pendingReviews: 0 };
  const cards = [
    { label: "书籍总数", value: totals.books, tone: "primary", footer: "当前项目管理的书籍" },
    { label: "章节总数", value: totals.chapters, tone: "success", footer: "已生成的全部章节" },
    { label: "累计字数", value: formatNumber(totals.words), tone: "warning", footer: "全部章节的总字数" },
    { label: "待审章节", value: totals.pendingReviews, tone: "danger", footer: "需要人工审阅的章节" },
  ];

  refs.dashboardCards.innerHTML = cards
    .map(
      (card) => `
        <article class="stat-card tone-${card.tone}">
          <p class="stat-label">${card.label}</p>
          <div class="stat-value">${card.value}</div>
          <div class="stat-footer">${card.footer}</div>
        </article>
      `,
    )
    .join("");
}

function renderBooksPanel() {
  if (!state.dashboard?.initialized) {
    refs.booksPanel.innerHTML = `
      <div class="card-head">
        <div><h3 class="card-title">书籍列表</h3></div>
      </div>
      <div class="empty-state"><p>当前上下文还不是 InkOS 项目，可以先执行“初始化项目”。</p></div>
    `;
    return;
  }

  const books = state.dashboard?.books ?? [];
  refs.booksPanel.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">书籍列表</h3>
        <p class="card-subtitle">选择书籍后自动同步章节与编辑器</p>
      </div>
      <span class="badge">${books.length} 本</span>
    </div>
    ${renderPageJumpLinks("works")}
    <div class="list-panel">
      ${books.length > 0 ? books.map(renderBookCard).join("") : `<div class="empty-state tiny"><p>当前项目还没有书籍。</p></div>`}
    </div>
  `;
  renderWorksOverview();
}

function renderBookCard(book) {
  const active = book.id === state.selectedBookId;
  const chapterRatio = book.targetChapters > 0
    ? Math.max(0, Math.min(100, Math.round((book.chapters / book.targetChapters) * 100)))
    : 0;
  return `
    <article class="list-card ${active ? "selected" : ""}">
      <div>
        <strong>${escapeHtml(book.title)}</strong>
        <small>${escapeHtml(book.id)} · ${escapeHtml(GENRE_LABELS[book.genre] ?? book.genre)} / ${escapeHtml(PLATFORM_LABELS[book.platform] ?? book.platform)}</small>
      </div>
      <div class="metric-row">
        <span>${escapeHtml(BOOK_STATUS_LABELS[book.status] ?? book.status)}</span>
        <span>章节 ${book.chapters}/${book.targetChapters}</span>
        <span>字数 ${formatNumber(book.totalWords)}</span>
        <span>待审 ${book.pending}</span>
      </div>
      <div class="book-progress">
        <div class="book-progress-bar"><span style="width:${chapterRatio}%"></span></div>
        <small class="muted">进度 ${chapterRatio}%${book.targetChapters > 0 ? ` · 目标 ${book.targetChapters} 章` : ""}</small>
      </div>
      <div class="card-actions">
        <button class="ghost" data-action="select-book" data-book-id="${escapeAttribute(book.id)}">查看章节</button>
        <button class="ghost" data-action="prefill-command" data-command-path="write next" data-book-id="${escapeAttribute(book.id)}">续写</button>
        <button class="ghost" data-action="prefill-command" data-command-path="status" data-book-id="${escapeAttribute(book.id)}">状态</button>
        <button class="ghost" data-action="prefill-command" data-command-path="genre show" data-genre="${escapeAttribute(book.genre)}">题材规则</button>
      </div>
    </article>
  `;
}

function renderChaptersPanel() {
  const selectedBook = getSelectedBook();
  refs.chaptersPanel.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">${selectedBook ? `${escapeHtml(selectedBook.title)} 的章节` : "章节列表"}</h3>
      </div>
      <span class="badge">${state.chapters.length} 章</span>
    </div>
    ${renderPageJumpLinks("works")}
    <div class="list-panel chapter-list">
      ${selectedBook ? (state.chapters.length > 0 ? state.chapters.map(renderChapterCard).join("") : `<div class="empty-state tiny"><p>这本书还没有章节。</p></div>`) : `<div class="empty-state tiny"><p>先选择一本书，再查看章节和正文。</p></div>`}
    </div>
  `;
  renderWorksOverview();
}

function renderChapterCard(chapter) {
  const active = chapter.number === state.selectedChapterNumber;
  return `
    <article class="list-card subtle ${active ? "selected" : ""}">
      <div>
        <strong>第 ${chapter.number} 章 · ${escapeHtml(chapter.title)}</strong>
        <small>${escapeHtml(CHAPTER_STATUS_LABELS[chapter.status] ?? chapter.status)} · ${formatNumber(chapter.wordCount)} 字</small>
      </div>
      <div class="metric-row">
        <span>${formatDateTime(chapter.updatedAt)}</span>
        <span>${chapter.auditIssues.length} 个问题</span>
      </div>
      <div class="card-actions">
        <button class="ghost" data-action="select-chapter" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.number}">编辑正文</button>
        <button class="ghost" data-action="prefill-command" data-command-path="audit" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.number}">审计</button>
        <button class="ghost" data-action="prefill-command" data-command-path="revise" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.number}" data-mode="rewrite">修订</button>
      </div>
    </article>
  `;
}

function renderReviewsPanel() {
  const reviews = state.dashboard?.pendingReviews ?? [];
  refs.reviewsPanel.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">待审章节</h3>
      </div>
      <span class="badge">${reviews.length} 项</span>
    </div>
    ${renderPageJumpLinks("works")}
    <div class="list-panel">
      ${reviews.length > 0 ? reviews.map(renderReviewCard).join("") : `<div class="empty-state tiny"><p>当前没有待审章节。</p></div>`}
    </div>
  `;
  renderWorksOverview();
}

function renderReviewCard(review) {
  const active = review.bookId === state.selectedBookId && review.chapter === state.selectedChapterNumber;
  return `
    <article class="list-card subtle ${active ? "selected" : ""}">
      <div>
        <strong>${escapeHtml(review.title)} · 第 ${review.chapter} 章</strong>
        <small>${escapeHtml(review.chapterTitle)}</small>
      </div>
      <div class="metric-row">
        <span>${escapeHtml(CHAPTER_STATUS_LABELS[review.status] ?? review.status)}</span>
        <span>${review.issueCount} 个问题</span>
      </div>
      <div class="card-actions">
        <button class="ghost" data-action="select-review" data-book-id="${escapeAttribute(review.bookId)}" data-chapter="${review.chapter}">打开正文</button>
        <button class="ghost" data-action="prefill-command" data-command-path="audit" data-book-id="${escapeAttribute(review.bookId)}" data-chapter="${review.chapter}">审计</button>
        <button class="ghost" data-action="prefill-command" data-command-path="revise" data-book-id="${escapeAttribute(review.bookId)}" data-chapter="${review.chapter}" data-mode="rewrite">修订</button>
        <button class="ghost" data-action="prefill-command" data-command-path="review approve" data-book-id="${escapeAttribute(review.bookId)}" data-chapter="${review.chapter}">通过</button>
      </div>
    </article>
  `;
}

function renderEditorPanel() {
  const chapter = state.activeChapter;
  const selectedBook = getSelectedBook();
  if (!state.dashboard?.initialized) {
    refs.editorPanel.innerHTML = `
      <div class="empty-state editor-empty">
        <h2>正文编辑工作台</h2>
        <p>先选择一个已初始化的 InkOS 项目，再进入章节编辑与审阅操作。</p>
      </div>
    `;
    renderWorksOverview();
    return;
  }

  if (!selectedBook || !chapter) {
    refs.editorPanel.innerHTML = `
      <div class="empty-state editor-empty">
        <h2>正文编辑工作台</h2>
        <p>从左侧书籍或待审列表中选择章节后，这里会显示正文、问题、审阅动作和快捷命令。</p>
      </div>
    `;
    renderWorksOverview();
    return;
  }

  refs.editorPanel.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">${escapeHtml(selectedBook.title)} · 第 ${chapter.chapter} 章</h3>
        <p class="card-subtitle">${escapeHtml(chapter.title)}${chapter.fileName ? ` · ${escapeHtml(chapter.fileName)}` : ""}</p>
      </div>
      <div class="badge-row editor-status" id="editor-meta-badges"></div>
    </div>

    ${renderPageJumpLinks("editor")}

    <div class="editor-toolbar">
      <button class="primary" data-action="save-editor">保存正文</button>
      <button class="secondary" data-action="revert-editor">还原未保存修改</button>
      <button class="ghost" data-action="prefill-command" data-command-path="audit" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.chapter}">预填审计</button>
      <button class="ghost" data-action="prefill-command" data-command-path="revise" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.chapter}" data-mode="rewrite">预填修订</button>
      <button class="ghost" data-action="prefill-command" data-command-path="review approve" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.chapter}">预填通过</button>
      <button class="ghost" data-action="prefill-command" data-command-path="review reject" data-book-id="${escapeAttribute(state.selectedBookId)}" data-chapter="${chapter.chapter}">预填驳回</button>
      <button class="ghost" data-action="prefill-command" data-command-path="write next" data-book-id="${escapeAttribute(state.selectedBookId)}">续写下一章</button>
    </div>

    <div class="editor-grid">
      <div class="editor-surface">
        <div class="editor-surface-head">
          <label class="editor-label" for="chapter-editor">章节正文（Markdown）</label>
          <a class="text-link" href="#page-commands">返回命令中心</a>
        </div>
        <textarea id="chapter-editor" spellcheck="false">${escapeHtml(state.editorContent)}</textarea>
      </div>
      <div class="preview-shell">
        <div class="markdown-preview">
          <h3>Markdown 预览</h3>
          <div class="markdown-preview-body">${renderMarkdownPreview(state.editorContent)}</div>
        </div>
      </div>
    </div>
  `;

  renderEditorMeta();
  renderWorksOverview();
}

function renderEditorMeta() {
  const badges = refs.editorPanel.querySelector("#editor-meta-badges");
  const chapter = state.activeChapter;
  if (!badges || !chapter) {
    return;
  }

  badges.innerHTML = `
    <span class="badge">${escapeHtml(CHAPTER_STATUS_LABELS[chapter.status] ?? chapter.status)}</span>
    <span class="badge">${formatNumber(estimateWordCountFromText(state.editorContent || chapter.content))} 字</span>
    <span class="badge ${state.editorDirty ? "warning" : "success"}">${state.editorDirty ? "有未保存修改" : "已同步"}</span>
  `;
}

function renderOutputPanel() {
  const execution = state.execution;
  const recent = getFilteredHistory().slice(0, 8);

  refs.outputPanel.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">执行结果</h3>
      </div>
      ${execution ? `<span class="badge ${execution.ok ? "success" : "danger"}">${execution.ok ? "成功" : "失败"}</span>` : ""}
    </div>

    ${renderPageJumpLinks("commands")}

    <div class="results-toolbar">
      <label class="field-inline">
        <span>结果筛选</span>
        <select id="history-status-filter">
          <option value="all" ${state.resultFilterStatus === "all" ? "selected" : ""}>全部</option>
          <option value="success" ${state.resultFilterStatus === "success" ? "selected" : ""}>仅成功</option>
          <option value="failure" ${state.resultFilterStatus === "failure" ? "selected" : ""}>仅失败</option>
          <option value="save" ${state.resultFilterStatus === "save" ? "selected" : ""}>仅保存正文</option>
        </select>
      </label>
      <label class="field-inline field-inline-grow">
        <span>命令搜索</span>
        <input id="history-search" type="search" value="${escapeAttribute(state.resultFilterQuery)}" placeholder="按命令名、预览或上下文筛选" />
      </label>
      <button class="ghost" data-action="clear-results-filters">清空筛选</button>
    </div>

    ${execution ? renderExecutionContent(execution) : `<div class="empty-state"><p>执行命令、保存章节或触发审阅操作后，结果会显示在这里。</p></div>`}

    <div class="panel-head compact history-head">
      <div>
        <h3 class="card-title">最近执行</h3>
      </div>
    </div>

    <div class="history-list">
      ${recent.length > 0 ? recent.map((item, index) => renderHistoryItem(item, index)).join("") : `<div class="empty-state tiny"><p>还没有执行历史。</p></div>`}
    </div>
  `;

  renderResultsSidebar();
}

function renderExecutionContent(execution) {
  const structured = renderExecutionSummary(execution);
  return `
    <div class="result-meta">
      <span>动作 ${escapeHtml(execution.commandPath)}</span>
      <span>上下文 ${escapeHtml(execution.contextPath ?? state.selectedContext)}</span>
      <span>退出码 ${execution.exitCode}</span>
    </div>
    ${structured}
    <div class="preview-box compact">
      <label>执行命令</label>
      <pre>${escapeHtml(execution.argv.join(" "))}</pre>
    </div>
    ${execution.json ? `
      <div class="preview-box compact">
        <label>结构化输出</label>
        <pre>${escapeHtml(JSON.stringify(execution.json, null, 2))}</pre>
      </div>
    ` : ""}
    <div class="output-grid">
      <div class="preview-box compact">
        <label>stdout</label>
        <pre>${escapeHtml(execution.stdout || "(empty)")}</pre>
      </div>
      <div class="preview-box compact">
        <label>stderr</label>
        <pre>${escapeHtml(execution.stderr || "(empty)")}</pre>
      </div>
    </div>
  `;
}

function renderExecutionSummary(execution) {
  const json = execution.json;
  if (!json) {
    return "";
  }

  if (execution.commandPath === "status" && Array.isArray(json.books)) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>书籍数量</span><strong>${json.books.length}</strong></article>
        <article class="summary-card"><span>待审章节</span><strong>${json.books.reduce((sum, book) => sum + Number(book.pending || 0), 0)}</strong></article>
        <article class="summary-card"><span>失败章节</span><strong>${json.books.reduce((sum, book) => sum + Number(book.failed || 0), 0)}</strong></article>
      </div>
    `;
  }

  if (execution.commandPath === "review list" && Array.isArray(json.pending)) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>待审数量</span><strong>${json.pending.length}</strong></article>
        <article class="summary-card"><span>涉及书籍</span><strong>${new Set(json.pending.map((item) => item.bookId)).size}</strong></article>
      </div>
    `;
  }

  if (execution.commandPath === "audit" && typeof json.passed === "boolean") {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>审计结果</span><strong>${json.passed ? "通过" : "失败"}</strong></article>
        <article class="summary-card"><span>问题数量</span><strong>${Array.isArray(json.issues) ? json.issues.length : 0}</strong></article>
        <article class="summary-card"><span>章节</span><strong>第 ${json.chapterNumber ?? "?"} 章</strong></article>
      </div>
      <div class="preview-box compact"><label>审计摘要</label><pre>${escapeHtml(json.summary || "无摘要")}</pre></div>
    `;
  }

  if (execution.commandPath === "revise" && json.chapterNumber) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>已修订章节</span><strong>第 ${json.chapterNumber} 章</strong></article>
        <article class="summary-card"><span>修订后字数</span><strong>${formatNumber(json.wordCount || 0)}</strong></article>
        <article class="summary-card"><span>修复问题</span><strong>${Array.isArray(json.fixedIssues) ? json.fixedIssues.length : 0}</strong></article>
      </div>
    `;
  }

  if ((execution.commandPath === "write next" || execution.commandPath === "draft") && Array.isArray(json)) {
    const last = json.at(-1);
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>生成章节</span><strong>${json.length}</strong></article>
        <article class="summary-card"><span>最后一章</span><strong>第 ${last?.chapterNumber ?? "?"} 章</strong></article>
        <article class="summary-card"><span>状态</span><strong>${escapeHtml(last?.status ?? "完成")}</strong></article>
      </div>
    `;
  }

  if (execution.commandPath === "write rewrite" && json.chapterNumber) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>重写章节</span><strong>第 ${json.chapterNumber} 章</strong></article>
        <article class="summary-card"><span>标题</span><strong>${escapeHtml(json.title || "(无标题)")}</strong></article>
        <article class="summary-card"><span>状态</span><strong>${escapeHtml(json.status || "已生成")}</strong></article>
      </div>
    `;
  }

  if (execution.commandPath === "book create" && json.bookId) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>新书 ID</span><strong>${escapeHtml(json.bookId)}</strong></article>
        <article class="summary-card"><span>题材</span><strong>${escapeHtml(GENRE_LABELS[json.genre] ?? json.genre)}</strong></article>
        <article class="summary-card"><span>下一步</span><strong>${escapeHtml(json.nextStep || "开始写作")}</strong></article>
      </div>
    `;
  }

  if ((execution.commandPath === "review approve" || execution.commandPath === "review reject") && json.chapter) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>章节</span><strong>第 ${json.chapter} 章</strong></article>
        <article class="summary-card"><span>结果</span><strong>${escapeHtml(CHAPTER_STATUS_LABELS[json.status] ?? json.status)}</strong></article>
        <article class="summary-card"><span>书籍</span><strong>${escapeHtml(json.bookId || "")}</strong></article>
      </div>
    `;
  }

  if (execution.commandPath === "chapter save" && json.chapter) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>已保存章节</span><strong>第 ${json.chapter} 章</strong></article>
        <article class="summary-card"><span>标题</span><strong>${escapeHtml(json.title || "")}</strong></article>
        <article class="summary-card"><span>估算字数</span><strong>${formatNumber(json.wordCount || 0)}</strong></article>
      </div>
    `;
  }

  if (execution.commandPath === "project create" && json.projectPath) {
    return `
      <div class="summary-grid">
        <article class="summary-card"><span>项目路径</span><strong>${escapeHtml(json.projectPath)}</strong></article>
        <article class="summary-card"><span>项目名</span><strong>${escapeHtml(json.projectName || "")}</strong></article>
        <article class="summary-card"><span>新上下文</span><strong>${escapeHtml(json.createdContext || json.projectPath)}</strong></article>
      </div>
    `;
  }

  return "";
}

function renderHistoryItem(item, index) {
  return `
    <button class="history-item" data-history-index="${index}">
      <strong>${escapeHtml(getCommandDisplayName(item.commandPath))}</strong>
      <small>${escapeHtml(item.contextPath)} · ${escapeHtml(item.preview)}</small>
      <small>${escapeHtml(getHistoryOutcomeLabel(item))}${item.timestamp ? ` · ${escapeHtml(formatDateTime(item.timestamp))}` : ""}</small>
    </button>
  `;
}

function updatePreview() {
  const previewNode = document.querySelector("#command-preview");
  if (!previewNode) {
    return;
  }
  previewNode.textContent = buildPreview();
}

function buildPreview(command = getSelectedCommand()) {
  if (!command) {
    return "inkos";
  }

  const payload = collectFormPayload();
  const parts = ["inkos", ...command.path.split(" ")];

  for (const argument of command.arguments) {
    const rawValue = String(payload.arguments[argument.name] ?? "").trim();
    if (!rawValue) {
      continue;
    }
    parts.push(argument.variadic ? rawValue : quoteShell(rawValue));
  }

  for (const option of command.options) {
    const value = payload.options[option.name];
    if (option.boolean) {
      if (value) {
        parts.push(option.long || option.flags);
      }
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      parts.push(option.long || option.flags, quoteShell(value.trim()));
    }
  }

  return parts.join(" ");
}

function collectFormPayload() {
  const argumentsPayload = {};
  const optionsPayload = {};

  refs.commandPanel.querySelectorAll("[data-kind='argument']").forEach((input) => {
    argumentsPayload[input.dataset.name] = input.type === "checkbox" ? input.checked : input.value;
  });

  refs.commandPanel.querySelectorAll("[data-kind='option']").forEach((input) => {
    optionsPayload[input.dataset.name] = input.type === "checkbox" ? input.checked : input.value;
  });

  return { arguments: argumentsPayload, options: optionsPayload };
}

async function executeSelectedCommand() {
  const command = getSelectedCommand();
  if (!command) {
    return;
  }

  const payload = {
    commandPath: state.selectedCommandPath,
    contextPath: state.selectedContext,
    ...collectFormPayload(),
  };

  const button = refs.commandPanel.querySelector("button[data-action='execute']");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "执行中...";

  try {
    await runCommandExecution(payload, buildPreview(command));
    setCurrentPage("commands");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function runCommandExecution(payload, preview) {
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  state.execution = response.ok ? result : {
    error: result.error || "命令执行失败",
    ok: false,
    exitCode: 1,
    commandPath: payload.commandPath,
    contextPath: payload.contextPath,
    argv: ["inkos"],
    stdout: "",
    stderr: result.error || "",
  };

  pushHistory({
    commandPath: payload.commandPath,
    contextPath: payload.contextPath,
    preview,
    ok: response.ok && result.ok !== false,
    timestamp: new Date().toISOString(),
    kind: payload.commandPath === "chapter save" ? "save" : "command",
    payload: {
      arguments: payload.arguments,
      options: payload.options,
    },
  });

  if (response.ok && result.json?.bookId && payload.commandPath === "book create") {
    state.selectedBookId = result.json.bookId;
  }

  await refreshDashboard();
  if (state.selectedBookId && state.selectedChapterNumber) {
    await refreshActiveChapter();
  }
  renderOutputPanel();
  renderCommandPanel();
}

async function saveCurrentChapter() {
  if (!state.activeChapter) {
    return;
  }

  const button = refs.editorPanel.querySelector("button[data-action='save-editor']");
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "保存中...";

  try {
    const response = await fetch("/api/chapter", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contextPath: state.selectedContext,
        bookId: state.selectedBookId,
        chapter: state.activeChapter.chapter,
        content: state.editorContent,
      }),
    });
    const result = await response.json();
    state.execution = response.ok
      ? {
          commandPath: "chapter save",
          contextPath: state.selectedContext,
          argv: ["web", "save-chapter", state.selectedBookId, String(state.activeChapter.chapter)],
          exitCode: 0,
          ok: true,
          stdout: "章节正文已保存。",
          stderr: "",
          json: result,
        }
      : {
          commandPath: "chapter save",
          contextPath: state.selectedContext,
          argv: ["web", "save-chapter", state.selectedBookId, String(state.activeChapter.chapter)],
          exitCode: 1,
          ok: false,
          stdout: "",
          stderr: result.error || "保存失败",
          json: result,
        };

    if (!response.ok) {
      renderOutputPanel();
      return;
    }

    pushHistory({
      commandPath: "chapter save",
      contextPath: state.selectedContext,
      preview: `保存 ${state.selectedBookId} 第 ${state.activeChapter.chapter} 章`,
      ok: true,
      timestamp: new Date().toISOString(),
      kind: "save",
    });
    await refreshDashboard();
    await refreshActiveChapter();
    renderOutputPanel();
    setCurrentPage("editor");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function selectBook(bookId) {
  state.selectedBookId = bookId;
  state.selectedChapterNumber = null;
  await loadBookChapters(bookId);
  setCurrentPage("works", { scroll: false });
  renderCommandPanel();
}

async function loadBookChapters(bookId) {
  const response = await fetch(`/api/chapters?context=${encodeURIComponent(state.selectedContext)}&bookId=${encodeURIComponent(bookId)}`);
  const result = await response.json();
  state.chapters = result.chapters ?? [];

  if (state.chapters.length === 0) {
    state.selectedChapterNumber = null;
    state.activeChapter = null;
    state.editorContent = "";
    state.editorDirty = false;
    renderChaptersPanel();
    renderEditorContextPanel();
    renderEditorPanel();
    return;
  }

  if (!state.chapters.some((chapter) => chapter.number === state.selectedChapterNumber)) {
    state.selectedChapterNumber = pickDefaultChapterNumber(bookId, state.chapters);
  }

  renderChaptersPanel();
  if (state.selectedChapterNumber) {
    await loadChapter(bookId, state.selectedChapterNumber, { silentDirtyReset: true });
  }
}

async function loadChapter(bookId, chapterNumber, options = {}) {
  const response = await fetch(`/api/chapter?context=${encodeURIComponent(state.selectedContext)}&bookId=${encodeURIComponent(bookId)}&chapter=${chapterNumber}`);
  const result = await response.json();
  state.selectedBookId = bookId;
  state.selectedChapterNumber = chapterNumber;
  state.activeChapter = result;
  state.editorContent = result.content;
  state.editorDirty = false;
  renderBooksPanel();
  renderChaptersPanel();
  renderReviewsPanel();
  renderEditorContextPanel();
  renderEditorPanel();
  setCurrentPage("editor", { scroll: !options.silentDirtyReset });
  if (!options.silentDirtyReset) {
    renderCommandPanel();
  }
}

async function refreshActiveChapter() {
  if (!state.selectedBookId || !state.selectedChapterNumber) {
    return;
  }
  await loadChapter(state.selectedBookId, state.selectedChapterNumber, { silentDirtyReset: true });
}

function pushHistory(entry) {
  state.history = [entry, ...state.history.filter((item) => item.preview !== entry.preview || item.contextPath !== entry.contextPath)].slice(0, 12);
  localStorage.setItem("inkos-studio-history", JSON.stringify(state.history));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem("inkos-studio-history") || "[]");
  } catch {
    return [];
  }
}

function getSelectedCommand() {
  return state.commands.find((command) => command.path === state.selectedCommandPath) ?? null;
}

function getSelectedBook() {
  return state.dashboard?.books?.find((book) => book.id === state.selectedBookId) ?? null;
}

function flattenCommands(commands) {
  return commands.flatMap((command) => [command, ...flattenCommands(command.children)]);
}

function groupCommands(commands) {
  const map = new Map();
  for (const command of [...commands].sort((left, right) => {
    if (left.uiCategoryOrder !== right.uiCategoryOrder) {
      return left.uiCategoryOrder - right.uiCategoryOrder;
    }
    if (left.uiOrder !== right.uiOrder) {
      return left.uiOrder - right.uiOrder;
    }
    return left.uiLabel.localeCompare(right.uiLabel, "zh-CN");
  })) {
    if (!map.has(command.uiCategoryLabel)) {
      map.set(command.uiCategoryLabel, []);
    }
    map.get(command.uiCategoryLabel).push(command);
  }
  return [...map.entries()];
}

function getFieldLabel(commandPath, fieldName) {
  if ((commandPath === "review approve" || commandPath === "review reject" || commandPath === "write rewrite") && fieldName === "args") {
    return "书籍与章节";
  }
  return FIELD_LABELS[fieldName] ?? FIELD_LABELS[normalizeFieldKey(fieldName)] ?? fieldName;
}

function getFieldHint(commandPath, fieldName, originalDescription, required, variadic) {
  if ((commandPath === "review approve" || commandPath === "review reject") && fieldName === "args") {
    return "写成“book-id 章节号”，例如 my-book 12";
  }
  if (commandPath === "write rewrite" && fieldName === "args") {
    return "写成“book-id 章节号”，例如 my-book 12";
  }
  if (variadic) {
    return originalDescription || "多个值可用空格分隔";
  }
  if (required) {
    return originalDescription || "必填项";
  }
  return originalDescription || "可选项，留空则使用命令默认行为";
}

function getFieldPlaceholder(commandPath, kind, fieldName, variadic) {
  if ((commandPath === "review approve" || commandPath === "review reject" || commandPath === "write rewrite") && fieldName === "args") {
    return "book-id 章节号";
  }
  if (fieldName === "context") {
    return "输入创作说明、修改要求或本章重点";
  }
  if (fieldName === "reason") {
    return "输入驳回原因";
  }
  if (kind === "argument" && fieldName === "book-id") {
    return "留空则自动识别当前唯一书籍";
  }
  if (kind === "argument" && fieldName === "chapter") {
    return "留空则默认使用最新章节";
  }
  return variadic ? "多个值用空格分隔" : "请输入内容";
}

function getKnownFieldOptions(commandPath, kind, fieldName) {
  const normalized = normalizeFieldKey(fieldName);
  if (kind === "argument" && fieldName === "book-id") {
    return (state.dashboard?.books ?? []).map((book) => ({ value: book.id, label: `${book.title}（${book.id}）` }));
  }
  if (kind === "argument" && fieldName === "chapter") {
    return state.chapters.map((chapter) => ({ value: String(chapter.number), label: `第 ${chapter.number} 章 · ${chapter.title}` }));
  }
  if (normalized === "genre") {
    return Object.entries(GENRE_LABELS).map(([value, label]) => ({ value, label }));
  }
  if (normalized === "platform") {
    return Object.entries(PLATFORM_LABELS).map(([value, label]) => ({ value, label }));
  }
  if (normalized === "status") {
    return Object.entries(BOOK_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  }
  if (normalized === "mode") {
    return Object.entries(REVISE_MODE_LABELS).map(([value, label]) => ({ value, label }));
  }
  if (commandPath === "genre show" && fieldName === "id") {
    return Object.entries(GENRE_LABELS).map(([value, label]) => ({ value, label }));
  }
  return [];
}

function normalizeFieldKey(name) {
  return String(name || "").replace(/[\[\]<>.]/g, "").replace(/\.{3}$/, "");
}

function openCommand(commandPath, prefill = {}) {
  state.selectedCommandPath = commandPath;
  mergeCommandPrefill(commandPath, prefill);
  renderCommandGroups();
  renderCommandPanel();
  renderCommandOverview();
  setCurrentPage("commands");
}

function mergeCommandPrefill(commandPath, prefill) {
  const current = state.commandPrefills[commandPath] ?? { arguments: {}, options: {} };
  state.commandPrefills[commandPath] = {
    arguments: { ...current.arguments, ...(prefill.arguments ?? {}) },
    options: { ...current.options, ...(prefill.options ?? {}) },
  };
}

function syncBookSelection() {
  const books = state.dashboard?.books ?? [];
  if (books.length === 0) {
    state.selectedBookId = "";
    return;
  }

  if (!books.some((book) => book.id === state.selectedBookId)) {
    state.selectedBookId = state.dashboard.pendingReviews?.[0]?.bookId ?? books[0].id;
  }
}

function pickDefaultChapterNumber(bookId, chapters) {
  const pendingForBook = (state.dashboard?.pendingReviews ?? []).find((review) => review.bookId === bookId);
  if (pendingForBook) {
    return pendingForBook.chapter;
  }
  return chapters.at(-1)?.number ?? null;
}

async function confirmDiscardEditorChanges() {
  if (!state.editorDirty) {
    return true;
  }
  return window.confirm("当前章节有未保存修改，确定继续切换吗？");
}

function quoteShell(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function estimateWordCountFromText(text) {
  return String(text || "").replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, "").length;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function formatDateTime(value) {
  if (!value) {
    return "--";
  }
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

function renderToolbarSummary() {
  if (!refs.toolbarSummary) {
    return;
  }

  const initialized = Boolean(state.dashboard?.initialized);
  const selectedBook = getSelectedBook();
  const pendingReviews = state.dashboard?.pendingReviews?.length ?? 0;
  const chapterCount = state.chapters.length;

  const pills = [
    { label: `页面 ${PAGE_DEFINITIONS[state.currentPage]?.label ?? "命令中心"}`, active: true },
    { label: `上下文 ${state.selectedContext || "."}`, active: true },
    { label: initialized ? "项目已初始化" : "项目未初始化", active: initialized },
    { label: selectedBook ? `当前书籍 ${selectedBook.title}` : "未选书籍", active: Boolean(selectedBook) },
    { label: chapterCount > 0 ? `已载入 ${chapterCount} 章` : "章节未载入", active: chapterCount > 0 },
    { label: pendingReviews > 0 ? `待审 ${pendingReviews}` : "待审已清空", active: pendingReviews > 0 },
  ];

  refs.toolbarSummary.innerHTML = pills
    .map((pill) => `<span class="summary-pill ${pill.active ? "active" : ""}">${escapeHtml(pill.label)}</span>`)
    .join("");
}

function renderCommandShortcuts(command) {
  const items = [
    {
      label: "查看项目状态",
      description: "快速刷新当前上下文的书籍与章节汇总",
      commandPath: "status",
    },
    {
      label: "新建书籍",
      description: "进入新书初始化表单",
      commandPath: "book create",
    },
  ];

  if (state.selectedBookId) {
    items.push(
      {
        label: "续写下一章",
        description: "以当前书籍为目标预填续写命令",
        commandPath: "write next",
        dataset: { bookId: state.selectedBookId },
      },
      {
        label: "查看题材规则",
        description: "快速打开当前书籍题材模板",
        commandPath: "genre show",
        dataset: { genre: getSelectedBook()?.genre ?? "" },
      },
    );
  }

  if (state.selectedBookId && state.selectedChapterNumber) {
    items.push(
      {
        label: "审计当前章",
        description: "检查当前章节的问题和风险",
        commandPath: "audit",
        dataset: { bookId: state.selectedBookId, chapter: String(state.selectedChapterNumber) },
      },
      {
        label: "修订当前章",
        description: "用 rewrite 模式直接预填修订表单",
        commandPath: "revise",
        dataset: { bookId: state.selectedBookId, chapter: String(state.selectedChapterNumber), mode: "rewrite" },
      },
    );
  }

  return `
    <div class="shortcut-strip">
      <div>
        <div class="shortcut-label">当前命令：${escapeHtml(command.uiLabel)}</div>
        <p class="muted">常用动作放在这里，避免在命令列表和工作台之间来回切换。</p>
      </div>
      <div class="shortcut-actions">
        ${items.map((item) => renderShortcutButton(item, command.path)).join("")}
      </div>
    </div>
  `;
}

function renderShortcutButton(item, currentPath) {
  const attrs = Object.entries(item.dataset ?? {})
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== "")
    .map(([key, value]) => `data-${toDatasetKey(key)}="${escapeAttribute(String(value))}"`)
    .join(" ");
  return `
    <button
      class="ghost"
      data-action="open-shortcut"
      data-command-path="${escapeAttribute(item.commandPath)}"
      ${attrs}
      ${item.commandPath === currentPath ? "disabled" : ""}
    >
      ${escapeHtml(item.label)}
    </button>
  `;
}

function toDatasetKey(value) {
  return String(value).replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function renderPageNav() {
  if (!refs.pageNav) {
    return;
  }

  const pages = [
    { key: "overview", badge: String(state.dashboard?.totals?.books ?? 0) },
    { key: "editor", badge: state.activeChapter ? `第${state.activeChapter.chapter}章` : "未开章" },
    { key: "works", badge: String(state.dashboard?.pendingReviews?.length ?? 0) },
    { key: "imports", badge: "4" },
    { key: "genres", badge: String(new Set((state.dashboard?.books ?? []).map((book) => book.genre)).size) },
    { key: "commands", badge: String(state.commands.length) },
    { key: "agent", badge: String(state.history.filter((item) => item.commandPath === "agent").length) },
    { key: "aigc", badge: String(getAigcRiskEntries().length) },
    { key: "settings", badge: state.meta?.cliBuilt ? "OK" : "!" },
  ];

  refs.pageNav.innerHTML = pages
    .map(({ key, badge }) => {
      const page = PAGE_DEFINITIONS[key];
      return `
        <a class="nav-item ${state.currentPage === key ? "active" : ""}" href="${page.hash}">
          <strong>
            <span>${escapeHtml(page.label)}</span>
            <span class="nav-badge">${escapeHtml(badge)}</span>
          </strong>
          <small>${escapeHtml(page.description)}</small>
        </a>
      `;
    })
    .join("");

  renderCurrentPageMeta();
}

function renderCurrentPageMeta() {
  const page = PAGE_DEFINITIONS[state.currentPage] ?? PAGE_DEFINITIONS.overview;
  if (refs.pageTitle) {
    refs.pageTitle.textContent = page.label;
  }
  if (refs.pageDescription) {
    refs.pageDescription.textContent = page.description;
  }
}

function renderPageJumpLinks(currentPage) {
  const items = Object.entries(PAGE_DEFINITIONS)
    .filter(([page]) => page !== currentPage)
    .map(([, page]) => `<a class="page-jump-link" href="${page.hash}">${escapeHtml(page.label)}</a>`)
    .join("");
  return items ? `<div class="page-jump-row">${items}</div>` : "";
}

function syncPageFromHash() {
  const page = getPageFromHash(window.location.hash);
  state.currentPage = page;
  updatePageVisibility();
  renderToolbarSummary();
  renderPageNav();
  renderCurrentPageMeta();
}

function setCurrentPage(page, options = {}) {
  const { scroll = true } = options;
  const nextPage = PAGE_DEFINITIONS[page] ? page : "overview";
  if (window.location.hash !== PAGE_DEFINITIONS[nextPage].hash) {
    window.location.hash = PAGE_DEFINITIONS[nextPage].hash;
    return;
  }
  state.currentPage = nextPage;
  updatePageVisibility();
  renderToolbarSummary();
  renderPageNav();
  renderCurrentPageMeta();
  if (scroll) {
    document.querySelector(PAGE_DEFINITIONS[nextPage].hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function updatePageVisibility() {
  refs.viewPages.forEach((page) => {
    const active = page.dataset.page === state.currentPage;
    page.classList.toggle("active", active);
    page.hidden = !active;
  });
}

function getPageFromHash(hash) {
  for (const [key, page] of Object.entries(PAGE_DEFINITIONS)) {
    if (hash === page.hash) {
      return key;
    }
  }
  return "overview";
}

function renderCommandOverview() {
  if (!refs.commandOverview) {
    return;
  }

  const selectedCommand = getSelectedCommand();
  const visibleCommands = getVisibleCommands();
  const categories = new Set(visibleCommands.map((command) => command.uiCategoryLabel));
  const recentCommand = state.history.find((item) => item.kind !== "save");
  const successCount = state.history.filter((item) => item.ok).length;

  refs.commandOverview.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Command Center</p>
        <h3 class="card-title">CLI 命令驾驶台</h3>
        <p class="card-subtitle">集中处理命令筛选、参数拼装、执行与控制台回看。</p>
      </div>
      <span class="badge">${visibleCommands.length} 条可见命令</span>
    </div>
    <div class="summary-grid compact-grid">
      <article class="summary-card"><span>业务分组</span><strong>${categories.size}</strong></article>
      <article class="summary-card"><span>当前命令</span><strong>${escapeHtml(selectedCommand?.uiLabel ?? "未选择")}</strong></article>
      <article class="summary-card"><span>成功记录</span><strong>${successCount}</strong></article>
    </div>
    <div class="page-info-grid">
      <div class="info-card">
        <h3>当前命令摘要</h3>
        <ul class="plain-list">
          <li><span>命令路径</span><strong>${escapeHtml(selectedCommand?.path ?? "--")}</strong></li>
          <li><span>命令分组</span><strong>${escapeHtml(selectedCommand?.uiCategoryLabel ?? "--")}</strong></li>
          <li><span>位置参数</span><strong>${selectedCommand?.arguments.length ?? 0}</strong></li>
          <li><span>命令选项</span><strong>${selectedCommand?.options.length ?? 0}</strong></li>
        </ul>
      </div>
      <div class="info-card">
        <h3>执行上下文</h3>
        <p class="muted">${escapeHtml(state.selectedContext)}${state.selectedBookId ? ` · 已选书籍 ${escapeHtml(getSelectedBook()?.title ?? state.selectedBookId)}` : " · 未选书籍"}</p>
        <p class="muted">${state.search ? `正在按“${escapeHtml(state.search)}”筛选命令。` : "当前显示完整命令列表，可按中文或 path 搜索。"}</p>
      </div>
      <div class="command-brief">
        <h3>最近动作</h3>
        <p class="muted">${escapeHtml(recentCommand ? getCommandDisplayName(recentCommand.commandPath) : "暂无执行记录")}</p>
        <div class="card-actions">
          <button class="ghost" data-command-path="status">项目状态</button>
          <button class="ghost" data-command-path="review list">待审列表</button>
          <button class="ghost" data-command-path="doctor">环境诊断</button>
        </div>
      </div>
    </div>
  `;
}

function renderWorksOverview() {
  if (!refs.worksOverview) {
    return;
  }

  const selectedBook = getSelectedBook();
  const activeChapter = state.activeChapter;
  const totals = state.dashboard?.totals ?? { books: 0, chapters: 0, words: 0, pendingReviews: 0 };
  const chapterRatio = selectedBook && selectedBook.targetChapters > 0
    ? Math.max(0, Math.min(100, Math.round((selectedBook.chapters / selectedBook.targetChapters) * 100)))
    : 0;

  refs.worksOverview.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Works Manager</p>
        <h3 class="card-title">作品管理台</h3>
        <p class="card-subtitle">围绕书籍规则、章节进度、审阅与修订组织当前项目。</p>
      </div>
      <span class="badge">${selectedBook ? "已聚焦书籍" : "等待选择"}</span>
    </div>
    <div class="summary-grid compact-grid">
      <article class="summary-card"><span>书籍总数</span><strong>${totals.books}</strong></article>
      <article class="summary-card"><span>待审章节</span><strong>${totals.pendingReviews}</strong></article>
      <article class="summary-card"><span>当前章节</span><strong>${activeChapter ? `第 ${activeChapter.chapter} 章` : "未选择"}</strong></article>
    </div>
    <div class="page-info-grid">
      <div class="info-card">
        <h3>当前书籍</h3>
        ${selectedBook ? `
          <ul class="plain-list">
            <li><span>书名</span><strong>${escapeHtml(selectedBook.title)}</strong></li>
            <li><span>题材</span><strong>${escapeHtml(GENRE_LABELS[selectedBook.genre] ?? selectedBook.genre)}</strong></li>
            <li><span>平台</span><strong>${escapeHtml(PLATFORM_LABELS[selectedBook.platform] ?? selectedBook.platform)}</strong></li>
            <li><span>完成进度</span><strong>${chapterRatio}%</strong></li>
          </ul>
        ` : `<p class="muted">先从书籍列表或待审队列里选择一本书，工作台会自动联动章节与编辑器。</p>`}
      </div>
      <div class="info-card">
        <h3>当前编辑状态</h3>
        ${activeChapter ? `
          <ul class="plain-list">
            <li><span>章节状态</span><strong>${escapeHtml(CHAPTER_STATUS_LABELS[activeChapter.status] ?? activeChapter.status)}</strong></li>
            <li><span>估算字数</span><strong>${formatNumber(estimateWordCountFromText(state.editorContent || activeChapter.content))}</strong></li>
            <li><span>未保存修改</span><strong>${state.editorDirty ? "有" : "无"}</strong></li>
            <li><span>问题数量</span><strong>${activeChapter.auditIssues.length}</strong></li>
          </ul>
        ` : `<p class="muted">当前没有打开章节。选择章节后，这里会显示编辑状态、字数和问题数量。</p>`}
      </div>
    </div>
  `;
}

function renderOverviewPanel() {
  if (!refs.overviewPanel) {
    return;
  }

  const totals = state.dashboard?.totals ?? { books: 0, chapters: 0, words: 0, pendingReviews: 0 };
  const selectedBook = getSelectedBook();
  const latest = state.history[0];

  refs.overviewPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Studio Overview</p>
        <h3 class="card-title">总览驾驶舱</h3>
        <p class="card-subtitle">把创作编辑、作品管理、命令执行和检测流程集中在同一套工作台中。</p>
      </div>
      <span class="badge ${state.dashboard?.initialized ? "success" : "warning"}">${state.dashboard?.initialized ? "项目已初始化" : "等待初始化"}</span>
    </div>

    <div class="overview-grid">
      <section class="section-block">
        <div class="overview-focus-grid">
          <article class="highlight-card">
            <span class="section-kicker">Focus</span>
            <h3>当前写作焦点</h3>
            <p>${selectedBook ? `正在跟进《${escapeHtml(selectedBook.title)}》` : "当前还没有选中书籍"}</p>
            <div class="workspace-facts">
              <span class="status-chip active">书籍 ${totals.books}</span>
              <span class="status-chip ${totals.pendingReviews > 0 ? "active" : ""}">待审 ${totals.pendingReviews}</span>
              <span class="status-chip ${state.editorDirty ? "active" : ""}">${state.editorDirty ? "正文未保存" : "正文已同步"}</span>
            </div>
          </article>
          <article class="highlight-card">
            <span class="section-kicker">Execution</span>
            <h3>最近命令</h3>
            <p>${escapeHtml(latest ? getCommandDisplayName(latest.commandPath) : "暂无")}</p>
            <div class="workspace-facts">
              <span class="status-chip ${latest?.ok ? "active" : ""}">${latest ? getHistoryOutcomeLabel(latest) : "尚未执行"}</span>
              <span class="status-chip">历史 ${state.history.length}</span>
            </div>
          </article>
          <article class="highlight-card">
            <span class="section-kicker">Health</span>
            <h3>项目健康度</h3>
            <p>${totals.pendingReviews > 0 ? "存在待审章节，建议先处理审阅闭环。" : "当前审阅队列较干净，可继续推进写作。"}</p>
            <div class="workspace-facts">
              <span class="status-chip ${state.meta?.cliBuilt ? "active" : ""}">${state.meta?.cliBuilt ? "CLI 就绪" : "CLI 未构建"}</span>
              <span class="status-chip">字数 ${formatNumber(totals.words)}</span>
            </div>
          </article>
        </div>

        <div class="section-block workspace-brief">
          <h3>创作链路</h3>
          <div class="workspace-flow">
            <article class="flow-step"><strong>1. 文本导入</strong><p class="muted">导入设定、文风样本或番外目标。</p></article>
            <article class="flow-step"><strong>2. 创作编辑</strong><p class="muted">围绕章节正文进行编写、预览和保存。</p></article>
            <article class="flow-step"><strong>3. 审阅修订</strong><p class="muted">执行审计、审阅通过或修订重写。</p></article>
            <article class="flow-step"><strong>4. 检测与配置</strong><p class="muted">处理 AIGC 风险并维护项目与全局设置。</p></article>
          </div>
        </div>
      </section>

      <aside class="section-block">
        <div class="action-card">
          <div class="action-card-head">
            <strong>快速入口</strong>
            <span class="badge">Studio</span>
          </div>
          <div class="quick-link-grid">
            <a class="page-jump-link" href="#page-editor">打开编辑器</a>
            <a class="page-jump-link" href="#page-works">管理作品</a>
            <a class="page-jump-link" href="#page-commands">执行命令</a>
            <a class="page-jump-link" href="#page-settings">进入配置</a>
          </div>
        </div>
        <div class="info-card">
          <h3>当前项目</h3>
          <ul class="plain-list">
            <li><span>上下文</span><strong>${escapeHtml(state.selectedContext)}</strong></li>
            <li><span>书籍数</span><strong>${totals.books}</strong></li>
            <li><span>章节数</span><strong>${totals.chapters}</strong></li>
            <li><span>待审数</span><strong>${totals.pendingReviews}</strong></li>
          </ul>
        </div>
      </aside>
    </div>
  `;
}

function renderEditorContextPanel() {
  if (!refs.editorContextPanel) {
    return;
  }

  const selectedBook = getSelectedBook();
  const chapter = state.activeChapter;

  refs.editorContextPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Editor Context</p>
        <h3 class="card-title">创作上下文</h3>
      </div>
      <span class="badge">${selectedBook ? "已选书籍" : "未选择"}</span>
    </div>
    ${selectedBook ? `
      <div class="info-card">
        <h3>当前书籍</h3>
        <ul class="plain-list">
          <li><span>书名</span><strong>${escapeHtml(selectedBook.title)}</strong></li>
          <li><span>题材</span><strong>${escapeHtml(GENRE_LABELS[selectedBook.genre] ?? selectedBook.genre)}</strong></li>
          <li><span>平台</span><strong>${escapeHtml(PLATFORM_LABELS[selectedBook.platform] ?? selectedBook.platform)}</strong></li>
          <li><span>进度</span><strong>${selectedBook.targetChapters > 0 ? `${Math.round((selectedBook.chapters / selectedBook.targetChapters) * 100)}%` : "--"}</strong></li>
        </ul>
      </div>
      <div class="info-card">
        <h3>当前章节</h3>
        ${chapter ? `
          <ul class="plain-list">
            <li><span>章节</span><strong>第 ${chapter.chapter} 章</strong></li>
            <li><span>状态</span><strong>${escapeHtml(CHAPTER_STATUS_LABELS[chapter.status] ?? chapter.status)}</strong></li>
            <li><span>字数</span><strong>${formatNumber(estimateWordCountFromText(state.editorContent || chapter.content))}</strong></li>
            <li><span>问题</span><strong>${chapter.auditIssues.length}</strong></li>
          </ul>
        ` : `<p class="muted">先在作品管理中选择章节，或直接从待审列表进入。</p>`}
      </div>
      <div class="info-card">
        <h3>快捷动作</h3>
        <div class="card-actions">
          <button class="ghost" data-command-path="write next" data-book-id="${escapeAttribute(selectedBook.id)}">续写下一章</button>
          <button class="ghost" data-command-path="audit" data-book-id="${escapeAttribute(selectedBook.id)}" ${chapter ? `data-chapter="${chapter.chapter}"` : "disabled"}>审计当前章</button>
          <button class="ghost" data-command-path="review list">查看待审</button>
        </div>
      </div>
    ` : `
      <div class="empty-state"><p>先去作品管理页选择一本书，或在命令中心执行 status / book create。</p></div>
    `}
  `;
}

function renderImportsPanel() {
  if (!refs.importsPanel) {
    return;
  }

  const selectedBookId = state.selectedBookId || "";

  refs.importsPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Import Studio</p>
        <h3 class="card-title">文本导入与仿写工作流</h3>
        <p class="card-subtitle">围绕文风仿写、番外写作、设定导入和章节迁移组织入口。</p>
      </div>
      <span class="badge">4 类流程</span>
    </div>
    <div class="imports-grid">
      <article class="action-card">
        <div class="action-card-head"><strong>文风仿写</strong><span class="badge">Style</span></div>
        <label class="field">
          <span>样本文本文件</span>
          <input id="style-source-file" type="text" placeholder="例如 D:/samples/style.txt" />
        </label>
        <label class="field">
          <span>样本名称</span>
          <input id="style-source-name" type="text" placeholder="例如 某作者样本" />
        </label>
        <label class="field">
          <span>目标书籍 ID</span>
          <input id="import-target-book" type="text" value="${escapeAttribute(selectedBookId)}" placeholder="留空则在命令中心再选择" />
        </label>
        <div class="card-actions">
          <button class="ghost" data-action="prepare-style-analyze">预填文风分析</button>
          <button class="ghost" data-action="prepare-style-import">预填文风导入</button>
        </div>
      </article>
      <article class="action-card">
        <div class="action-card-head"><strong>番外与草稿</strong><span class="badge">Draft</span></div>
        <label class="field">
          <span>书籍 ID</span>
          <input id="draft-book-id" type="text" value="${escapeAttribute(selectedBookId)}" placeholder="例如 my-book" />
        </label>
        <label class="field">
          <span>目标字数</span>
          <input id="draft-words" type="text" placeholder="例如 2500" />
        </label>
        <label class="field">
          <span>创作说明</span>
          <input id="draft-context" type="text" placeholder="例如 写一章番外，聚焦配角视角" />
        </label>
        <div class="card-actions">
          <button class="ghost" data-action="prepare-draft">预填草稿写作</button>
          <button class="ghost" data-command-path="write next" data-book-id="${escapeAttribute(selectedBookId)}" ${selectedBookId ? "" : "disabled"}>续写下一章</button>
        </div>
      </article>
      <article class="action-card">
        <div class="action-card-head"><strong>设定导入</strong><span class="badge">Canon</span></div>
        <label class="field">
          <span>目标书籍 ID</span>
          <input type="text" value="${escapeAttribute(selectedBookId)}" disabled />
        </label>
        <label class="field">
          <span>父作品 ID</span>
          <input id="canon-parent-book" type="text" placeholder="例如 parent-book" />
        </label>
        <div class="card-actions">
          <button class="ghost" data-action="prepare-import-canon">预填正典导入</button>
          <button class="ghost" data-command-path="genre list">查看题材库</button>
        </div>
      </article>
      <article class="action-card">
        <div class="action-card-head"><strong>章节迁移</strong><span class="badge">Import</span></div>
        <label class="field">
          <span>导入文件或目录</span>
          <input id="chapter-import-path" type="text" placeholder="例如 D:/novel/chapters 或 D:/novel/all.txt" />
        </label>
        <div class="card-actions">
          <button class="ghost" data-action="prepare-import-chapters">预填章节导入</button>
          <button class="ghost" data-command-path="status">查看项目状态</button>
        </div>
      </article>
    </div>
  `;
}

function renderGenresPanel() {
  if (!refs.genresPanel) {
    return;
  }

  const books = state.dashboard?.books ?? [];
  const distribution = Object.entries(books.reduce((accumulator, book) => {
    accumulator[book.genre] = (accumulator[book.genre] ?? 0) + 1;
    return accumulator;
  }, {}));

  refs.genresPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Genre Library</p>
        <h3 class="card-title">题材管理台</h3>
        <p class="card-subtitle">查看项目题材分布，并快速进入题材列表、复制和创建命令。</p>
      </div>
      <span class="badge">${distribution.length} 种题材</span>
    </div>
    <div class="genre-grid">
      <div class="section-block">
        <div class="info-card">
          <h3>项目题材分布</h3>
          ${distribution.length > 0 ? `
            <div class="genre-list">
              ${distribution.map(([genre, count]) => `
                <div class="genre-list-item">
                  <strong>${escapeHtml(GENRE_LABELS[genre] ?? genre)}</strong>
                  <p class="muted">当前项目中有 ${count} 本作品使用该题材。</p>
                  <div class="card-actions">
                    <button class="ghost" data-command-path="genre show" data-id="${escapeAttribute(genre)}">查看规则</button>
                    <button class="ghost" data-command-path="genre copy" data-id="${escapeAttribute(genre)}">复制到项目</button>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : `<p class="muted">当前项目还没有书籍，暂时没有题材分布。</p>`}
        </div>
      </div>
      <div class="section-block">
        <div class="action-card">
          <div class="action-card-head"><strong>题材命令</strong><span class="badge">Genre</span></div>
          <div class="card-actions">
            <button class="ghost" data-command-path="genre list">查看题材库</button>
            <button class="ghost" data-command-path="genre create">创建题材模板</button>
            <button class="ghost" data-command-path="style analyze">分析文风</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAgentPanel() {
  if (!refs.agentPanel) {
    return;
  }

  refs.agentPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Agent Workspace</p>
        <h3 class="card-title">智能体问答与指令编排</h3>
        <p class="card-subtitle">在进入 agent 命令前，先整理问题、上下文和希望产出的结果。</p>
      </div>
      <span class="badge">自然语言驱动</span>
    </div>
    <div class="agent-grid">
      <div class="agent-composer">
        <label class="editor-label" for="agent-prompt-input">发送给 Agent 的问题</label>
        <textarea id="agent-prompt-input" placeholder="例如：基于当前书籍的主线和待审问题，给出下一章写作策略与情节安排。"></textarea>
        <label class="field">
          <span>补充上下文</span>
          <input id="agent-context-input" type="text" placeholder="例如 当前主角要在下一章完成第一次反击" />
        </label>
        <label class="field">
          <span>最大轮次</span>
          <input id="agent-max-turns-input" type="text" value="20" />
        </label>
        <div class="action-row">
          <button class="primary" data-action="open-agent-command">带入命令中心</button>
          <button class="ghost" data-command-path="agent">直接打开 agent 命令</button>
        </div>
      </div>
      <div class="section-block">
        <div class="info-card">
          <h3>推荐提问</h3>
          <div class="agent-suggestion-list">
            <div class="agent-suggestion-card"><strong>剧情规划</strong><p class="muted">让 agent 生成下一章大纲、节奏和冲突建议。</p></div>
            <div class="agent-suggestion-card"><strong>风格校准</strong><p class="muted">让 agent 基于当前书籍和章节状态校正文风。</p></div>
            <div class="agent-suggestion-card"><strong>问题修复</strong><p class="muted">让 agent 结合审计问题和 review note 给出修订方案。</p></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAigcPanel() {
  if (!refs.aigcPanel) {
    return;
  }

  const entries = getAigcRiskEntries();
  const maxRisk = entries[0]?.score ?? 0;

  refs.aigcPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">AIGC Risk Desk</p>
        <h3 class="card-title">AIGC 检测与风险处理</h3>
        <p class="card-subtitle">聚合待审章节、问题数和推荐动作，优先处理高风险内容。</p>
      </div>
      <span class="badge ${entries.length > 0 ? "warning" : "success"}">${entries.length > 0 ? `${entries.length} 条风险线索` : "暂无明显风险"}</span>
    </div>
    <div class="aigc-grid">
      <div class="aigc-hero">
        <label class="field">
          <span>书籍 ID</span>
          <input id="aigc-book-id" type="text" value="${escapeAttribute(state.selectedBookId || "")}" placeholder="例如 my-book" />
        </label>
        <label class="field">
          <span>章节号</span>
          <input id="aigc-chapter" type="text" value="${escapeAttribute(state.selectedChapterNumber ? String(state.selectedChapterNumber) : "")}" placeholder="例如 12" />
        </label>
        <div class="risk-meter">
          <strong>当前最高风险</strong>
          <div class="risk-track"><span class="risk-fill" style="width:${maxRisk}%"></span></div>
          <p class="muted">该分值基于章节问题数、待审状态和当前章节上下文做前端聚合展示。</p>
        </div>
        <div class="card-actions">
          <button class="ghost" data-action="prepare-detect">预填当前检测</button>
          <button class="ghost" data-action="prepare-detect-all">预填全量检测</button>
          <button class="ghost" data-action="prepare-detect-stats">预填检测统计</button>
          <button class="ghost" data-command-path="audit">执行章节审计</button>
          <button class="ghost" data-command-path="style analyze">分析文风</button>
        </div>
      </div>
      <div class="risk-list">
        ${entries.length > 0 ? entries.map((entry) => `
          <div class="risk-item">
            <div>
              <strong>${escapeHtml(entry.title)}</strong>
              <p class="muted">${escapeHtml(entry.reason)}</p>
            </div>
            <span class="badge ${entry.score >= 75 ? "danger" : entry.score >= 45 ? "warning" : "success"}">${entry.score}</span>
          </div>
        `).join("") : `<div class="empty-state tiny"><p>当前没有需要特别关注的风险项。</p></div>`}
      </div>
    </div>
  `;
}

function renderSettingsPanel() {
  if (!refs.settingsPanel) {
    return;
  }

  const pathSuggestions = getProjectPathSuggestions();
  const draftPath = state.projectCreatePath.trim();

  refs.settingsPanel.innerHTML = `
    <div class="card-head">
      <div>
        <p class="section-kicker">Settings</p>
        <h3 class="card-title">全局配置与项目配置</h3>
        <p class="card-subtitle">维护项目路径、CLI 环境、全局配置和诊断入口。</p>
      </div>
      <span class="badge ${state.meta?.cliBuilt ? "success" : "warning"}">${state.meta?.cliBuilt ? "CLI 就绪" : "CLI 未构建"}</span>
    </div>
    <div class="settings-grid">
      <div class="section-block">
        <div class="info-card">
          <h3>配置动作</h3>
          <div class="card-actions">
            <button class="ghost" data-command-path="config set">项目配置</button>
            <button class="ghost" data-command-path="config set-global">全局配置</button>
            <button class="ghost" data-command-path="doctor">环境诊断</button>
            <button class="ghost" data-command-path="update">更新 CLI</button>
            <button class="ghost" data-command-path="init">初始化项目</button>
          </div>
        </div>
        <div class="info-card">
          <h3>快速修改项目配置</h3>
          <label class="field">
            <span>配置键</span>
            <input id="config-key-input" type="text" placeholder="例如 llm.model" />
          </label>
          <label class="field">
            <span>配置值</span>
            <input id="config-value-input" type="text" placeholder="例如 gpt-4.1" />
          </label>
          <div class="card-actions">
            <button class="ghost" data-action="prepare-config-set">预填 config set</button>
            <button class="ghost" data-action="prepare-show-global">查看全局配置</button>
            <button class="ghost" data-action="prepare-show-models">查看模型路由</button>
          </div>
        </div>
        <div class="info-card project-create-card">
          <h3>创建项目</h3>
          <p class="muted">支持工作区相对路径和本机绝对路径，方便直接创建新的 InkOS 项目。</p>
          <form id="project-create-form" class="project-create-form">
            <label class="field">
              <span>目标路径（相对或绝对） *</span>
              <input id="project-create-path" name="targetPath" type="text" list="project-path-suggestions" value="${escapeAttribute(draftPath)}" placeholder="例如 novels/my-next-book 或 D:/Novels/demo-project" />
              <small>相对路径将以 ${escapeHtml(state.meta?.workspaceRoot ?? "当前工作区")} 为基准；绝对路径会直接使用你选择的目录。</small>
            </label>
            <datalist id="project-path-suggestions">
              ${pathSuggestions.map((path) => `<option value="${escapeAttribute(path === "." ? "" : path)}"></option>`).join("")}
            </datalist>
            <div class="project-path-preview" id="project-path-preview"></div>
            <div class="path-tree-card">
              <div class="path-tree-head">
                <div>
                  <strong>目录树浏览器</strong>
                  <p class="muted path-tree-caption">工作区与本机磁盘可同时浏览，点击目录名即可把路径填入输入框。</p>
                </div>
                <div class="path-tree-tools">
                  <button class="ghost" type="button" data-action="select-path-parent" ${getPathParent(draftPath) ? "" : "disabled"}>上一级</button>
                  <button class="ghost" type="button" data-action="reload-path-tree">刷新目录</button>
                </div>
              </div>
              <div class="path-breadcrumbs">${renderPathBreadcrumbs(draftPath)}</div>
              <div class="path-tree-shell">
                ${renderPathTree()}
              </div>
            </div>
            <div class="card-actions project-create-actions">
              <button class="primary" type="submit">创建项目</button>
              <button class="secondary" type="button" data-action="use-selected-context-path">使用当前上下文路径</button>
            </div>
          </form>
        </div>
      </div>
      <div class="section-block">
        <div class="info-card">
          <h3>当前环境</h3>
          <ul class="plain-list">
            <li><span>上下文</span><strong>${escapeHtml(state.selectedContext)}</strong></li>
            <li><span>CLI 状态</span><strong>${state.meta?.cliBuilt ? "已构建" : "未构建"}</strong></li>
            <li><span>命令数</span><strong>${state.commands.length}</strong></li>
            <li><span>上下文总数</span><strong>${state.contexts.length}</strong></li>
          </ul>
        </div>
      </div>
    </div>
  `;

  updateProjectPathPreview();
}

function renderResultsSidebar() {
  if (!refs.resultsSidebar) {
    return;
  }

  const filteredHistory = getFilteredHistory();
  const recentContexts = [...new Set(filteredHistory.map((item) => item.contextPath))].slice(0, 4);
  const successCount = filteredHistory.filter((item) => item.ok === true).length;
  const failureCount = filteredHistory.filter((item) => item.ok === false).length;
  const latest = filteredHistory[0] ?? state.execution;
  const lastExecution = state.execution;

  refs.resultsSidebar.innerHTML = `
    <div class="card-head">
      <div>
        <h3 class="card-title">结果摘要</h3>
      </div>
      <span class="badge">${filteredHistory.length} 条</span>
    </div>
    <div class="summary-grid compact-grid single-column-grid">
      <article class="summary-card"><span>成功记录</span><strong>${successCount}</strong></article>
      <article class="summary-card"><span>失败记录</span><strong>${failureCount}</strong></article>
      <article class="summary-card"><span>最近动作</span><strong>${escapeHtml(latest?.commandPath ? getCommandDisplayName(latest.commandPath) : "暂无")}</strong></article>
    </div>
    <div class="info-card">
      <h3>当前筛选</h3>
      <ul class="plain-list">
        <li><span>结果状态</span><strong>${escapeHtml(getResultFilterStatusLabel(state.resultFilterStatus))}</strong></li>
        <li><span>搜索关键字</span><strong>${escapeHtml(state.resultFilterQuery || "未设置")}</strong></li>
        <li><span>上下文数</span><strong>${recentContexts.length}</strong></li>
      </ul>
    </div>
    <div class="info-card">
      <h3>最近执行详情</h3>
      ${lastExecution ? `
        <ul class="plain-list">
          <li><span>命令</span><strong>${escapeHtml(getCommandDisplayName(lastExecution.commandPath))}</strong></li>
          <li><span>结果</span><strong>${lastExecution.ok ? "成功" : "失败"}</strong></li>
          <li><span>上下文</span><strong>${escapeHtml(lastExecution.contextPath ?? state.selectedContext)}</strong></li>
          <li><span>退出码</span><strong>${lastExecution.exitCode}</strong></li>
        </ul>
      ` : `<p class="muted">执行命令或保存正文后，这里会显示最新一次结果摘要。</p>`}
    </div>
    <div class="info-card">
      <h3>涉及上下文</h3>
      ${recentContexts.length > 0 ? `<div class="context-chip-list">${recentContexts.map((context) => `<span>${escapeHtml(context)}</span>`).join("")}</div>` : `<p class="muted">当前筛选下还没有上下文记录。</p>`}
    </div>
  `;
}

function renderModuleActionCard(title, description, actions) {
  return `
    <article class="action-card">
      <div class="action-card-head">
        <strong>${escapeHtml(title)}</strong>
      </div>
      <p class="muted">${escapeHtml(description)}</p>
      <div class="card-actions">${actions.join("")}</div>
    </article>
  `;
}

function commandAction(label, commandPath, dataset = {}) {
  const attrs = Object.entries(dataset)
    .map(([key, value]) => `data-${toDatasetKey(key)}="${escapeAttribute(String(value))}"`)
    .join(" ");
  return `<button class="ghost" data-command-path="${escapeAttribute(commandPath)}" ${attrs}>${escapeHtml(label)}</button>`;
}

function getAigcRiskEntries() {
  const pendingReviews = (state.dashboard?.pendingReviews ?? []).map((review) => ({
    title: `${review.title} · 第 ${review.chapter} 章`,
    score: Math.min(96, 48 + review.issueCount * 11),
    reason: `${review.issueCount} 个问题待处理，当前状态为 ${CHAPTER_STATUS_LABELS[review.status] ?? review.status}`,
  }));

  const currentChapters = state.chapters.map((chapter) => ({
    title: `${getSelectedBook()?.title ?? state.selectedBookId} · 第 ${chapter.number} 章`,
    score: Math.min(92, chapter.auditIssues.length * 16 + (chapter.status !== "approved" ? 22 : 0)),
    reason: `${chapter.auditIssues.length} 个审计问题，最近更新时间 ${formatDateTime(chapter.updatedAt)}`,
  }));

  return [...pendingReviews, ...currentChapters]
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);
}

function updateEditorPreview() {
  const preview = refs.editorPanel.querySelector(".markdown-preview-body");
  if (!preview) {
    return;
  }
  preview.innerHTML = renderMarkdownPreview(state.editorContent);
}

function renderMarkdownPreview(markdown) {
  const source = String(markdown || "").replace(/\r\n/g, "\n");
  if (!source.trim()) {
    return `<p class="muted">当前章节还没有正文，保存或导入后会在这里显示 Markdown 预览。</p>`;
  }

  const escaped = escapeHtml(source);
  const blocks = escaped
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");

  const lines = blocks.split("\n");
  const output = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length === 0) {
      return;
    }
    output.push(`<ul>${listBuffer.join("")}</ul>`);
    listBuffer = [];
  };

  for (const line of lines) {
    if (/^<h\d|^<blockquote|^<pre>/.test(line)) {
      flushList();
      output.push(line);
      continue;
    }
    const listMatch = line.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      listBuffer.push(`<li>${listMatch[1]}</li>`);
      continue;
    }
    if (!line.trim()) {
      flushList();
      continue;
    }
    flushList();
    output.push(`<p>${line}</p>`);
  }

  flushList();
  return output.join("");
}

function getVisibleCommands() {
  return state.commands.filter((command) => {
    if (!state.search) {
      return true;
    }

    const haystack = [
      command.path,
      command.description,
      command.uiLabel,
      command.uiCategoryLabel,
      command.uiDescription,
    ].join(" ").toLowerCase();
    return haystack.includes(state.search);
  });
}

function getProjectPathSuggestions() {
  const workspaceSuggestions = Array.isArray(state.meta?.pathSuggestions) ? state.meta.pathSuggestions : [];
  const externalSuggestions = state.externalContexts.map((context) => context.relativePath);
  return [...new Set([...workspaceSuggestions, ...externalSuggestions])];
}

async function ensurePathTreeLoaded(path) {
  const targetPath = String(path || ".");
  if (state.pathTree[targetPath] || state.pathTreeLoading[targetPath]) {
    return;
  }

  state.pathTreeLoading[targetPath] = true;
  try {
    const response = await fetch(`/api/path-tree?path=${encodeURIComponent(targetPath)}`);
    const payload = await response.json();
    state.pathTree[targetPath] = Array.isArray(payload.nodes) ? payload.nodes : [];
  } finally {
    delete state.pathTreeLoading[targetPath];
  }
}

async function togglePathNode(path) {
  const targetPath = String(path || ".");
  if (state.pathTreeExpanded.includes(targetPath)) {
    state.pathTreeExpanded = state.pathTreeExpanded.filter((item) => item !== targetPath);
    renderSettingsPanel();
    return;
  }

  await ensurePathTreeLoaded(targetPath);
  if (!state.pathTreeExpanded.includes(targetPath)) {
    state.pathTreeExpanded = [...state.pathTreeExpanded, targetPath];
  }
  renderSettingsPanel();
}

function renderPathTree() {
  const workspaceNodes = state.pathTree["."];
  const filesystemRoots = state.pathTree["@roots"];
  if (state.pathTreeLoading["."] && !workspaceNodes && state.pathTreeLoading["@roots"] && !filesystemRoots) {
    return `<div class="empty-state tiny"><p>目录加载中...</p></div>`;
  }
  return `
    <div class="path-tree-root path-tree-sections">
      <section class="path-tree-section">
        <div class="path-tree-section-title">工作区</div>
        ${renderPathTreeNode({ path: ".", label: "workspace", initialized: true, hasChildren: true }, 0, true)}
      </section>
      <section class="path-tree-section">
        <div class="path-tree-section-title">本机磁盘</div>
        ${renderPathTreeNode({ path: "@roots", label: "computer", initialized: false, hasChildren: true }, 0, true, "本机")}
      </section>
    </div>
  `;
}

function renderPathTreeNode(node, depth, isRoot = false, labelOverride = "") {
  const children = state.pathTree[node.path] ?? [];
  const expanded = state.pathTreeExpanded.includes(node.path);
  const selected = normalizeTreeSelectablePath(state.projectCreatePath) === normalizeTreeSelectablePath(node.path);
  const canSelect = !isRoot || isAbsoluteContextPath(node.path);
  const displayLabel = labelOverride || node.label;
  const isFilesystemRoots = node.path === "@roots";

  return `
    <div class="path-tree-node ${selected ? "selected" : ""}" style="--tree-depth:${depth}">
      <div class="path-tree-row">
        <button class="path-tree-toggle ghost" type="button" data-action="toggle-path-node" data-path-node="${escapeAttribute(node.path)}" ${node.hasChildren ? "" : "disabled"}>
          ${node.hasChildren ? (expanded ? "-" : "+") : "·"}
        </button>
        <button class="path-tree-select ${selected ? "primary" : "secondary"}" type="button" data-action="select-path-node" data-path-node="${escapeAttribute(node.path)}" ${canSelect ? "" : "disabled"}>
          ${escapeHtml(displayLabel)}
        </button>
        ${isFilesystemRoots ? `<span class="badge">磁盘根</span>` : node.initialized ? `<span class="badge">已初始化</span>` : `<span class="badge warning">未初始化</span>`}
      </div>
      ${expanded ? renderPathTreeChildren(node.path, children, depth + 1) : ""}
    </div>
  `;
}

function renderPathTreeChildren(parentPath, children, depth) {
  if (state.pathTreeLoading[parentPath] && children.length === 0) {
    return `<div class="path-tree-children"><p class="muted">正在加载子目录...</p></div>`;
  }
  if (children.length === 0) {
    return `<div class="path-tree-children"><p class="muted">没有可浏览的子目录。</p></div>`;
  }
  return `
    <div class="path-tree-children">
      ${children.map((child) => renderPathTreeNode(child, depth)).join("")}
    </div>
  `;
}

function normalizeTreeSelectablePath(path) {
  return String(path || "").replace(/^\.\//, "");
}

async function createProjectFromOverview() {
  const input = refs.settingsPanel.querySelector("#project-create-path");
  const button = refs.settingsPanel.querySelector("#project-create-form button[type='submit']");
  const targetPath = String(input?.value ?? state.projectCreatePath ?? "").trim();

  state.projectCreatePath = targetPath;
  if (!targetPath) {
    input?.focus();
    updateProjectPathPreview("请输入项目路径，例如 novels/my-next-book");
    return;
  }

  const originalText = button?.textContent ?? "创建项目";
  if (button) {
    button.disabled = true;
    button.textContent = "创建中...";
  }

  try {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetPath }),
    });
    const result = await response.json();

    state.execution = response.ok
      ? {
          commandPath: "project create",
          contextPath: result.createdContext,
          argv: ["web", "project-create", result.projectPath],
          exitCode: 0,
          ok: true,
          stdout: `项目已创建：${result.projectPath}`,
          stderr: "",
          json: result,
        }
      : {
          commandPath: "project create",
          contextPath: state.selectedContext,
          argv: ["web", "project-create", targetPath],
          exitCode: 1,
          ok: false,
          stdout: "",
          stderr: result.error || "创建项目失败",
          json: result,
        };

    pushHistory({
      commandPath: "project create",
      contextPath: response.ok ? result.createdContext : state.selectedContext,
      preview: `创建项目 ${targetPath}`,
      ok: response.ok,
      timestamp: new Date().toISOString(),
      kind: "project-create",
    });

    if (!response.ok) {
      renderOutputPanel();
      setCurrentPage("settings");
      return;
    }

    if (isAbsoluteContextPath(result.createdContext)) {
      upsertExternalContext(result.createdContext, true);
    }

    await loadMeta(result.createdContext);
    state.selectedContext = result.createdContext;
    state.projectCreatePath = "";
    renderContextOptions();
    refs.contextSelect.value = state.selectedContext;
    await refreshDashboard();
    renderCommandGroups();
    renderCommandPanel();
    renderCommandOverview();
    renderWorksOverview();
    renderOutputPanel();
    setCurrentPage("settings");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function updateProjectPathPreview(message) {
  const preview = refs.settingsPanel.querySelector("#project-path-preview");
  if (!preview) {
    return;
  }

  if (message) {
    preview.textContent = message;
    return;
  }

  const targetPath = String(refs.settingsPanel.querySelector("#project-create-path")?.value ?? state.projectCreatePath ?? "").trim();
  if (!targetPath) {
    preview.textContent = "请选择或输入一个目录路径，可为工作区相对路径，也可为系统绝对路径。";
    return;
  }

  preview.textContent = isAbsoluteContextPath(targetPath)
    ? `将创建到绝对路径：${normalizeContextPath(targetPath)}`
    : `将创建到：${state.meta?.workspaceRoot ?? "工作区"}/${targetPath.replace(/\\/g, "/")}`;
}

function renderPathBreadcrumbs(targetPath) {
  const parts = getPathBreadcrumbs(targetPath);
  return parts.map((part, index) => {
    const disabled = index === parts.length - 1;
    return `<button class="path-breadcrumb ${disabled ? "active" : ""}" type="button" data-action="select-path-node" data-path-node="${escapeAttribute(part.path)}" ${disabled ? "disabled" : ""}>${escapeHtml(part.label)}</button>`;
  }).join(`<span class="path-breadcrumb-sep">/</span>`);
}

function getPathBreadcrumbs(targetPath) {
  const normalized = normalizeContextPath(targetPath || ".");
  if (normalized === "@roots") {
    return [{ label: "本机", path: "@roots" }];
  }
  if (normalized === ".") {
    return [{ label: "workspace", path: "." }];
  }
  if (isAbsoluteContextPath(normalized)) {
    const match = normalized.match(/^([A-Za-z]:\/)(.*)$/);
    if (match) {
      const [, rootPath, rest] = match;
      const crumbs = [{ label: rootPath.replace(/\/$/, ""), path: rootPath }];
      const segments = rest.split("/").filter(Boolean);
      let current = rootPath.replace(/\/$/, "");
      for (const segment of segments) {
        current = `${current}/${segment}`;
        crumbs.push({ label: segment, path: current });
      }
      return crumbs;
    }
    return [{ label: normalized, path: normalized }];
  }

  const segments = normalized.split("/").filter(Boolean);
  const crumbs = [{ label: "workspace", path: "." }];
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    crumbs.push({ label: segment, path: current });
  }
  return crumbs;
}

function getPathParent(targetPath) {
  const normalized = normalizeContextPath(targetPath || ".");
  if (!normalized || normalized === "." || normalized === "@roots") {
    return null;
  }
  if (isAbsoluteContextPath(normalized)) {
    const driveRootMatch = normalized.match(/^[A-Za-z]:\/$/);
    if (driveRootMatch) {
      return "@roots";
    }
    const separatorIndex = normalized.lastIndexOf("/");
    if (separatorIndex <= 0) {
      return "@roots";
    }
    const parent = normalized.slice(0, separatorIndex);
    return /^[A-Za-z]:$/.test(parent) ? `${parent}/` : parent || "@roots";
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return ".";
  }
  return segments.slice(0, -1).join("/");
}

function expandPathTrail(targetPath) {
  const breadcrumbs = getPathBreadcrumbs(targetPath);
  const expanded = new Set(state.pathTreeExpanded);
  expanded.add(".");
  expanded.add("@roots");
  breadcrumbs.forEach((item) => expanded.add(item.path));
  state.pathTreeExpanded = [...expanded];
}

function mergeContexts(baseContexts, preferredContext = "") {
  const merged = [...baseContexts];
  for (const externalContext of state.externalContexts) {
    if (!merged.some((context) => context.relativePath === externalContext.relativePath)) {
      merged.push(externalContext);
    }
  }
  if (preferredContext && !merged.some((context) => context.relativePath === preferredContext)) {
    merged.push({
      relativePath: preferredContext,
      label: preferredContext,
      initialized: true,
      isDefault: false,
      external: isAbsoluteContextPath(preferredContext),
    });
  }
  return merged;
}

function formatContextLabel(context) {
  if (context.external || isAbsoluteContextPath(context.relativePath)) {
    return `外部项目 · ${context.label || context.relativePath}`;
  }
  return context.label;
}

function loadExternalContexts() {
  try {
    return JSON.parse(localStorage.getItem("inkos-studio-external-contexts") || "[]");
  } catch {
    return [];
  }
}

function saveExternalContexts() {
  localStorage.setItem("inkos-studio-external-contexts", JSON.stringify(state.externalContexts));
}

function upsertExternalContext(contextPath, initialized = true) {
  const normalized = normalizeContextPath(contextPath);
  if (!isAbsoluteContextPath(normalized)) {
    return;
  }
  state.externalContexts = [
    {
      relativePath: normalized,
      label: normalized,
      initialized,
      isDefault: false,
      external: true,
    },
    ...state.externalContexts.filter((context) => context.relativePath !== normalized),
  ].slice(0, 8);
  saveExternalContexts();
}

function normalizeContextPath(targetPath) {
  const normalized = String(targetPath || ".").trim().replace(/\\/g, "/");
  if (!normalized) {
    return ".";
  }
  if (normalized === "@roots" || normalized === ".") {
    return normalized;
  }
  if (/^[A-Za-z]:\/$/.test(normalized) || normalized === "/") {
    return normalized;
  }
  return normalized.replace(/\/+$/, "");
}

function isAbsoluteContextPath(targetPath) {
  return /^(?:[A-Za-z]:\/|\/)/.test(normalizeContextPath(targetPath));
}

function getFilteredHistory() {
  return state.history.filter((item) => {
    if (state.resultFilterStatus === "success" && item.ok !== true) {
      return false;
    }
    if (state.resultFilterStatus === "failure" && item.ok !== false) {
      return false;
    }
    if (state.resultFilterStatus === "save" && item.commandPath !== "chapter save") {
      return false;
    }
    if (!state.resultFilterQuery) {
      return true;
    }
    const haystack = [item.commandPath, item.preview, item.contextPath].join(" ").toLowerCase();
    return haystack.includes(state.resultFilterQuery);
  });
}

function getHistoryOutcomeLabel(item) {
  if (item.commandPath === "chapter save") {
    return "正文保存";
  }
  if (item.ok === true) {
    return "执行成功";
  }
  if (item.ok === false) {
    return "执行失败";
  }
  return "历史记录";
}

function getResultFilterStatusLabel(value) {
  if (value === "success") {
    return "仅成功";
  }
  if (value === "failure") {
    return "仅失败";
  }
  if (value === "save") {
    return "仅保存正文";
  }
  return "全部";
}