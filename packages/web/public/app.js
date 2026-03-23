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

const state = {
  meta: null,
  contexts: [],
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
};

const refs = {
  contextSelect: document.querySelector("#context-select"),
  cliStatus: document.querySelector("#cli-status"),
  dashboardCards: document.querySelector("#dashboard-cards"),
  commandSearch: document.querySelector("#command-search"),
  commandGroups: document.querySelector("#command-groups"),
  commandPanel: document.querySelector("#command-panel"),
  booksPanel: document.querySelector("#books-panel"),
  chaptersPanel: document.querySelector("#chapters-panel"),
  reviewsPanel: document.querySelector("#reviews-panel"),
  editorPanel: document.querySelector("#editor-panel"),
  outputPanel: document.querySelector("#output-panel"),
};

await bootstrap();

async function bootstrap() {
  await loadMeta();
  bindEvents();
  renderContextOptions();
  renderCommandGroups();
  await refreshDashboard();
  renderCommandPanel();
  renderOutputPanel();
}

async function loadMeta() {
  const response = await fetch("/api/meta");
  state.meta = await response.json();
  state.contexts = state.meta.contexts;
  state.commands = flattenCommands(state.meta.commands)
    .filter((command) => command.runnable)
    .map(localizeCommand);
  state.selectedContext = state.contexts.find((context) => context.isDefault)?.relativePath ?? ".";
  state.selectedCommandPath = state.commands.find((command) => command.path === "status")?.path ?? state.commands[0]?.path ?? "";
  refs.cliStatus.textContent = state.meta.cliBuilt
    ? "CLI 已构建，网页会直接执行真实的 InkOS 命令。"
    : "CLI 尚未构建，请先运行 pnpm --filter @actalk/inkos build。";
}

function bindEvents() {
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
    renderCommandPanel();
  });

  refs.commandSearch.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderCommandGroups();
  });

  refs.commandGroups.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-command-path]");
    if (!button) {
      return;
    }
    state.selectedCommandPath = button.dataset.commandPath;
    renderCommandGroups();
    renderCommandPanel();
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
    if (!button) {
      return;
    }

    const item = state.history[Number(button.dataset.historyIndex)];
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
    renderContextOptions();
    renderCommandGroups();
    renderCommandPanel();
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
          ${escapeHtml(context.label)}${context.initialized ? "" : "（未初始化）"}
        </option>
      `,
    )
    .join("");
}

function renderCommandGroups() {
  const commands = state.commands.filter((command) => {
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
      </div>
      <span class="badge">${books.length} 本</span>
    </div>
    <div class="list-panel">
      ${books.length > 0 ? books.map(renderBookCard).join("") : `<div class="empty-state tiny"><p>当前项目还没有书籍。</p></div>`}
    </div>
  `;
}

function renderBookCard(book) {
  const active = book.id === state.selectedBookId;
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
    <div class="list-panel chapter-list">
      ${selectedBook ? (state.chapters.length > 0 ? state.chapters.map(renderChapterCard).join("") : `<div class="empty-state tiny"><p>这本书还没有章节。</p></div>`) : `<div class="empty-state tiny"><p>先选择一本书，再查看章节和正文。</p></div>`}
    </div>
  `;
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
    <div class="list-panel">
      ${reviews.length > 0 ? reviews.map(renderReviewCard).join("") : `<div class="empty-state tiny"><p>当前没有待审章节。</p></div>`}
    </div>
  `;
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
    return;
  }

  if (!selectedBook || !chapter) {
    refs.editorPanel.innerHTML = `
      <div class="empty-state editor-empty">
        <h2>正文编辑工作台</h2>
        <p>从左侧书籍或待审列表中选择章节后，这里会显示正文、问题、审阅动作和快捷命令。</p>
      </div>
    `;
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
        <label class="editor-label" for="chapter-editor">章节正文（Markdown）</label>
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
  const recent = state.history.slice(0, 8);

  refs.outputPanel.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Execution</p>
        <h2>执行结果</h2>
      </div>
      ${execution ? `<span class="badge ${execution.ok ? "success" : "danger"}">${execution.ok ? "成功" : "失败"}</span>` : ""}
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

  return "";
}

function renderHistoryItem(item, index) {
  return `
    <button class="history-item" data-history-index="${index}">
      <strong>${escapeHtml(getCommandDisplayName(item.commandPath))}</strong>
      <small>${escapeHtml(item.contextPath)} · ${escapeHtml(item.preview)}</small>
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
    });
    await refreshDashboard();
    await refreshActiveChapter();
    renderOutputPanel();
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function selectBook(bookId) {
  state.selectedBookId = bookId;
  state.selectedChapterNumber = null;
  await loadBookChapters(bookId);
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
  refs.commandPanel.scrollIntoView({ behavior: "smooth", block: "start" });
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