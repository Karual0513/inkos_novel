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
  commands: {
    hash: "#page-commands",
    label: "命令中心",
    description: "筛选命令、填写参数并执行 CLI",
  },
  workbench: {
    hash: "#page-workbench",
    label: "编辑工作台",
    description: "查看书籍、章节、待审队列与正文编辑",
  },
  results: {
    hash: "#page-results",
    label: "执行结果",
    description: "查看输出、结构化结果与历史记录",
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
  currentPage: "commands",
  resultFilterStatus: "all",
  resultFilterQuery: "",
  projectCreatePath: "",
  pathTree: {},
  pathTreeLoading: {},
  pathTreeExpanded: [".", "@roots"],
};

const refs = {
  pageNav: document.querySelector("#page-nav"),
  commandOverview: document.querySelector("#command-overview"),
  workbenchOverview: document.querySelector("#workbench-overview"),
  contextSelect: document.querySelector("#context-select"),
  refreshDashboard: document.querySelector("#refresh-dashboard"),
  cliStatus: document.querySelector("#cli-status"),
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
  renderCommandPanel();
  renderOutputPanel();
  renderCommandOverview();
  renderWorkbenchOverview();
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
  refs.cliStatus.textContent = state.meta.cliBuilt
    ? "CLI 已构建，网页会直接执行真实的 InkOS 命令。"
    : "CLI 尚未构建，请先运行 pnpm --filter @actalk/inkos build。";
  renderToolbarSummary();
}

function bindEvents() {
  window.addEventListener("hashchange", () => {
    syncPageFromHash();
  });

  refs.commandOverview.addEventListener("submit", async (event) => {
    const form = event.target.closest("#project-create-form");
    if (!form) {
      return;
    }
    event.preventDefault();
    await createProjectFromOverview();
  });

  refs.commandOverview.addEventListener("click", (event) => {
    const action = event.target.closest("button[data-action]");
    if (!action) {
      return;
    }

    if (action.dataset.action === "use-selected-context-path") {
      const value = state.selectedContext && state.selectedContext !== "." ? state.selectedContext : "";
      state.projectCreatePath = value;
      const input = refs.commandOverview.querySelector("#project-create-path");
      if (input) {
        input.value = value;
      }
      updateProjectPathPreview();
      renderCommandOverview();
    }

    if (action.dataset.action === "toggle-path-node") {
      void togglePathNode(action.dataset.pathNode || ".");
    }

    if (action.dataset.action === "select-path-node") {
      state.projectCreatePath = action.dataset.pathNode || "";
      updateProjectPathPreview();
      renderCommandOverview();
    }

    if (action.dataset.action === "reload-path-tree") {
      state.pathTree = {};
      state.pathTreeExpanded = [".", "@roots"];
      void Promise.all([ensurePathTreeLoaded("."), ensurePathTreeLoaded("@roots")]).then(() => {
        renderCommandOverview();
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
        renderCommandOverview();
      });
    }
  });

  refs.commandOverview.addEventListener("input", (event) => {
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
    <div class="panel-head">
      <div>
        <p class="eyebrow">Command Studio</p>
        <h2>${escapeHtml(command.uiLabel)}</h2>
        <p>${escapeHtml(command.uiDescription || command.description || "通过中文表单执行命令")}</p>
      </div>
      <div class="badge-row">
        <span class="badge">${escapeHtml(command.uiCategoryLabel)}</span>
        <span class="badge">${command.supportsJson ? "结构化结果" : "文本结果"}</span>
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
  renderWorkbenchOverview();

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
    renderEditorPanel();
    return;
  }

  syncBookSelection();
  renderDashboardCards();
  renderBooksPanel();
  renderReviewsPanel();

  if (state.selectedBookId) {
    await loadBookChapters(state.selectedBookId);
  } else {
    state.chapters = [];
    state.selectedChapterNumber = null;
    state.activeChapter = null;
    state.editorContent = "";
    state.editorDirty = false;
    renderChaptersPanel();
    renderEditorPanel();
  }
}

function renderDashboardCards() {
  const totals = state.dashboard?.totals ?? { books: 0, chapters: 0, words: 0, pendingReviews: 0 };
  const cards = [
    { label: "书籍数量", value: totals.books, tone: "teal" },
    { label: "章节总数", value: totals.chapters, tone: "sand" },
    { label: "累计字数", value: formatNumber(totals.words), tone: "rust" },
    { label: "待审章节", value: totals.pendingReviews, tone: "ink" },
  ];

  refs.dashboardCards.innerHTML = cards
    .map(
      (card, index) => `
        <article class="card stat-card tone-${card.tone}" style="animation-delay:${index * 90}ms">
          <span>${card.label}</span>
          <strong>${card.value}</strong>
        </article>
      `,
    )
    .join("");
}

function renderBooksPanel() {
  if (!state.dashboard?.initialized) {
    refs.booksPanel.innerHTML = `
      <div class="panel-head compact">
        <div>
          <p class="eyebrow">Project</p>
          <h2>书籍列表</h2>
        </div>
      </div>
      <div class="empty-state"><p>当前上下文还不是 InkOS 项目，可以先执行“初始化项目”。</p></div>
    `;
    return;
  }

  const books = state.dashboard?.books ?? [];
  refs.booksPanel.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Books</p>
        <h2>书籍列表</h2>
        <p class="muted">选择书籍后会自动同步章节列表、编辑器和相关命令预填。</p>
      </div>
      <span class="badge">${books.length} 本</span>
    </div>
    ${renderPageJumpLinks("workbench")}
    <div class="list-panel">
      ${books.length > 0 ? books.map(renderBookCard).join("") : `<div class="empty-state tiny"><p>当前项目还没有书籍。</p></div>`}
    </div>
  `;
  renderWorkbenchOverview();
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
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Chapters</p>
        <h2>${selectedBook ? `${escapeHtml(selectedBook.title)} 的章节` : "章节列表"}</h2>
      </div>
      <span class="badge">${state.chapters.length} 章</span>
    </div>
    ${renderPageJumpLinks("workbench")}
    <div class="list-panel chapter-list">
      ${selectedBook ? (state.chapters.length > 0 ? state.chapters.map(renderChapterCard).join("") : `<div class="empty-state tiny"><p>这本书还没有章节。</p></div>`) : `<div class="empty-state tiny"><p>先选择一本书，再查看章节和正文。</p></div>`}
    </div>
  `;
  renderWorkbenchOverview();
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
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Review Queue</p>
        <h2>待审章节</h2>
      </div>
      <span class="badge">${reviews.length} 项</span>
    </div>
    ${renderPageJumpLinks("workbench")}
    <div class="list-panel">
      ${reviews.length > 0 ? reviews.map(renderReviewCard).join("") : `<div class="empty-state tiny"><p>当前没有待审章节。</p></div>`}
    </div>
  `;
  renderWorkbenchOverview();
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
    renderWorkbenchOverview();
    return;
  }

  if (!selectedBook || !chapter) {
    refs.editorPanel.innerHTML = `
      <div class="empty-state editor-empty">
        <h2>正文编辑工作台</h2>
        <p>从左侧书籍或待审列表中选择章节后，这里会显示正文、问题、审阅动作和快捷命令。</p>
      </div>
    `;
    renderWorkbenchOverview();
    return;
  }

  refs.editorPanel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">Editor Workbench</p>
        <h2>${escapeHtml(selectedBook.title)} · 第 ${chapter.chapter} 章</h2>
        <p>${escapeHtml(chapter.title)}${chapter.fileName ? ` · ${escapeHtml(chapter.fileName)}` : ""}</p>
      </div>
      <div class="badge-row editor-status" id="editor-meta-badges"></div>
    </div>

    ${renderPageJumpLinks("workbench")}

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
      <aside class="editor-sidebar">
        <div class="info-card">
          <h3>章节信息</h3>
          <ul class="plain-list">
            <li><span>书籍</span><strong>${escapeHtml(selectedBook.title)}</strong></li>
            <li><span>章节</span><strong>第 ${chapter.chapter} 章</strong></li>
            <li><span>状态</span><strong>${escapeHtml(CHAPTER_STATUS_LABELS[chapter.status] ?? chapter.status)}</strong></li>
            <li><span>字数</span><strong>${formatNumber(chapter.wordCount)}</strong></li>
            <li><span>更新时间</span><strong>${formatDateTime(chapter.updatedAt)}</strong></li>
          </ul>
        </div>
        <div class="info-card">
          <h3>审阅备注</h3>
          <p class="muted">${escapeHtml(chapter.reviewNote || "暂无审阅备注")}</p>
        </div>
        <div class="info-card">
          <h3>当前问题</h3>
          ${chapter.auditIssues.length > 0 ? `<ul class="issue-list">${chapter.auditIssues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}</ul>` : `<p class="muted">当前没有记录的问题。</p>`}
        </div>
      </aside>
    </div>
  `;

  renderEditorMeta();
  renderWorkbenchOverview();
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
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Execution</p>
        <h2>执行结果</h2>
      </div>
      ${execution ? `<span class="badge ${execution.ok ? "success" : "danger"}">${execution.ok ? "成功" : "失败"}</span>` : ""}
    </div>

    ${renderPageJumpLinks("results")}

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
        <p class="eyebrow">History</p>
        <h2>最近执行</h2>
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
    setCurrentPage("results");
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
    setCurrentPage("results");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function selectBook(bookId) {
  state.selectedBookId = bookId;
  state.selectedChapterNumber = null;
  await loadBookChapters(bookId);
  setCurrentPage("workbench", { scroll: false });
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
  renderEditorPanel();
  setCurrentPage("workbench", { scroll: !options.silentDirtyReset });
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

  const cards = [
    {
      key: "commands",
      meta: `${state.commands.length} 条命令`,
      detail: state.selectedCommandPath ? `当前 ${getCommandDisplayName(state.selectedCommandPath)}` : "选择命令开始执行",
    },
    {
      key: "workbench",
      meta: `${state.dashboard?.books?.length ?? 0} 本书 / ${state.chapters.length} 章`,
      detail: state.selectedBookId ? `当前 ${getSelectedBook()?.title ?? state.selectedBookId}` : "先选择书籍与章节",
    },
    {
      key: "results",
      meta: `${state.history.length} 条历史`,
      detail: state.execution ? `${state.execution.ok ? "最近成功" : "最近失败"} · ${getCommandDisplayName(state.execution.commandPath)}` : "查看最近输出与执行历史",
    },
  ];

  refs.pageNav.innerHTML = cards
    .map(({ key, meta, detail }) => {
      const page = PAGE_DEFINITIONS[key];
      return `
        <a class="page-nav-item ${state.currentPage === key ? "active" : ""}" href="${page.hash}">
          <span class="page-nav-label">${escapeHtml(page.label)}</span>
          <strong>${escapeHtml(meta)}</strong>
          <small>${escapeHtml(detail)}</small>
        </a>
      `;
    })
    .join("");
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
}

function setCurrentPage(page, options = {}) {
  const { scroll = true } = options;
  const nextPage = PAGE_DEFINITIONS[page] ? page : "commands";
  if (window.location.hash !== PAGE_DEFINITIONS[nextPage].hash) {
    window.location.hash = PAGE_DEFINITIONS[nextPage].hash;
    return;
  }
  state.currentPage = nextPage;
  updatePageVisibility();
  renderToolbarSummary();
  renderPageNav();
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
  if (hash === "#workbench" || hash === "#page-workbench") {
    return "workbench";
  }
  if (hash === "#execution-results" || hash === "#page-results") {
    return "results";
  }
  return "commands";
}

function renderCommandOverview() {
  if (!refs.commandOverview) {
    return;
  }

  const selectedCommand = getSelectedCommand();
  const visibleCommands = getVisibleCommands();
  const categories = new Set(visibleCommands.map((command) => command.uiCategoryLabel));
  const recentCommand = state.history.find((item) => item.kind !== "save");
  const pathSuggestions = getProjectPathSuggestions();
  const draftPath = state.projectCreatePath.trim();

  refs.commandOverview.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Command Overview</p>
        <h2>命令页概览</h2>
      </div>
      <span class="badge">${visibleCommands.length} 条可见命令</span>
    </div>
    <div class="summary-grid compact-grid">
      <article class="summary-card"><span>业务分组</span><strong>${categories.size}</strong></article>
      <article class="summary-card"><span>当前命令</span><strong>${escapeHtml(selectedCommand?.uiLabel ?? "未选择")}</strong></article>
      <article class="summary-card"><span>最近执行</span><strong>${escapeHtml(recentCommand ? getCommandDisplayName(recentCommand.commandPath) : "暂无")}</strong></article>
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
        <h3>当前上下文</h3>
        <p class="muted">${escapeHtml(state.selectedContext)}${state.selectedBookId ? ` · 已选书籍 ${escapeHtml(getSelectedBook()?.title ?? state.selectedBookId)}` : " · 未选书籍"}</p>
        <p class="muted">${state.search ? `正在按“${escapeHtml(state.search)}”筛选命令。` : "当前显示完整命令列表，可按中文或 path 搜索。"}</p>
      </div>
      <div class="info-card project-create-card">
        <h3>创建项目</h3>
        <p class="muted">可输入工作区相对路径，也可直接浏览工作区与本机磁盘，选择绝对路径作为项目目录。</p>
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
  `;

  updateProjectPathPreview();
}

function renderWorkbenchOverview() {
  if (!refs.workbenchOverview) {
    return;
  }

  const selectedBook = getSelectedBook();
  const activeChapter = state.activeChapter;
  const totals = state.dashboard?.totals ?? { books: 0, chapters: 0, words: 0, pendingReviews: 0 };
  const chapterRatio = selectedBook && selectedBook.targetChapters > 0
    ? Math.max(0, Math.min(100, Math.round((selectedBook.chapters / selectedBook.targetChapters) * 100)))
    : 0;

  refs.workbenchOverview.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Workbench Overview</p>
        <h2>工作台概览</h2>
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
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Results Sidebar</p>
        <h2>结果摘要侧栏</h2>
      </div>
      <span class="badge">${filteredHistory.length} 条命中</span>
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
    renderCommandOverview();
    return;
  }

  await ensurePathTreeLoaded(targetPath);
  if (!state.pathTreeExpanded.includes(targetPath)) {
    state.pathTreeExpanded = [...state.pathTreeExpanded, targetPath];
  }
  renderCommandOverview();
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
  const input = refs.commandOverview.querySelector("#project-create-path");
  const button = refs.commandOverview.querySelector("#project-create-form button[type='submit']");
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
      setCurrentPage("results");
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
    renderWorkbenchOverview();
    renderOutputPanel();
    setCurrentPage("results");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function updateProjectPathPreview(message) {
  const preview = refs.commandOverview.querySelector("#project-path-preview");
  if (!preview) {
    return;
  }

  if (message) {
    preview.textContent = message;
    return;
  }

  const targetPath = String(refs.commandOverview.querySelector("#project-create-path")?.value ?? state.projectCreatePath ?? "").trim();
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