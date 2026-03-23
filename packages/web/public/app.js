const state = {
  meta: null,
  contexts: [],
  commands: [],
  filteredGroups: [],
  selectedContext: ".",
  selectedCommandPath: "",
  dashboard: null,
  execution: null,
  search: "",
  history: loadHistory(),
};

const refs = {
  contextSelect: document.querySelector("#context-select"),
  cliStatus: document.querySelector("#cli-status"),
  dashboardCards: document.querySelector("#dashboard-cards"),
  commandSearch: document.querySelector("#command-search"),
  commandGroups: document.querySelector("#command-groups"),
  commandPanel: document.querySelector("#command-panel"),
  booksPanel: document.querySelector("#books-panel"),
  reviewsPanel: document.querySelector("#reviews-panel"),
  outputPanel: document.querySelector("#output-panel"),
};

await bootstrap();

async function bootstrap() {
  await loadMeta();
  bindEvents();
  renderContextOptions();
  renderCommandGroups();
  renderCommandPanel();
  await refreshDashboard();
  renderOutputPanel();
}

async function loadMeta() {
  const response = await fetch("/api/meta");
  state.meta = await response.json();
  state.contexts = state.meta.contexts;
  state.commands = flattenCommands(state.meta.commands).filter((command) => command.runnable);
  state.selectedContext = state.contexts.find((context) => context.isDefault)?.relativePath ?? ".";
  state.selectedCommandPath = state.commands[0]?.path ?? "";
  refs.cliStatus.textContent = state.meta.cliBuilt
    ? "CLI 已构建，页面会直接执行真实 inkos 命令"
    : "CLI 尚未构建，请先运行 pnpm --filter @actalk/inkos build";
}

function bindEvents() {
  refs.contextSelect.addEventListener("change", async (event) => {
    state.selectedContext = event.target.value;
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

  refs.commandPanel.addEventListener("input", () => {
    updatePreview();
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
      action.textContent = "已复制";
      setTimeout(() => {
        action.textContent = "复制命令";
      }, 1200);
    }
  });

  refs.outputPanel.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-history-command]");
    if (!button) {
      return;
    }
    state.selectedCommandPath = button.dataset.historyCommand;
    renderCommandGroups();
    renderCommandPanel(button.dataset.historyPreview ?? "");
  });
}

function renderContextOptions() {
  refs.contextSelect.innerHTML = state.contexts
    .map(
      (context) => `
        <option value="${escapeAttribute(context.relativePath)}" ${context.relativePath === state.selectedContext ? "selected" : ""}>
          ${escapeHtml(context.label)}${context.initialized ? "" : " (未初始化)"}
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
    const haystack = `${command.path} ${command.description}`.toLowerCase();
    return haystack.includes(state.search);
  });

  const groups = groupCommands(commands);
  refs.commandGroups.innerHTML = groups
    .map(
      ([group, items]) => `
        <section class="command-group">
          <h3>${escapeHtml(group)}</h3>
          ${items
            .map(
              (command) => `
                <button class="command-item ${command.path === state.selectedCommandPath ? "active" : ""}" data-command-path="${escapeAttribute(command.path)}">
                  <span>${escapeHtml(command.path)}</span>
                  <small>${escapeHtml(command.description || command.usage || "无描述")}</small>
                </button>
              `,
            )
            .join("")}
        </section>
      `,
    )
    .join("");
}

function renderCommandPanel(prefillPreview = "") {
  const command = getSelectedCommand();
  if (!command) {
    refs.commandPanel.innerHTML = `<div class="empty-state"><h2>没有可用命令</h2><p>当前搜索条件下没有匹配的 CLI 命令。</p></div>`;
    return;
  }

  refs.commandPanel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">Command Studio</p>
        <h2>${escapeHtml(command.path)}</h2>
        <p>${escapeHtml(command.description || "使用表单来执行这条 InkOS 命令")}</p>
      </div>
      <div class="badge-row">
        <span class="badge">${command.supportsJson ? "JSON 输出" : "文本输出"}</span>
        <span class="badge">${command.arguments.length} 个参数</span>
        <span class="badge">${command.options.length} 个选项</span>
      </div>
    </div>

    <div class="usage-box">${escapeHtml(`inkos ${command.path} ${command.usage}`.trim())}</div>

    <div class="form-grid">
      <section>
        <h3>位置参数</h3>
        ${command.arguments.length > 0 ? command.arguments.map(renderArgumentField).join("") : `<p class="muted">这条命令没有位置参数。</p>`}
      </section>
      <section>
        <h3>命令选项</h3>
        ${command.options.length > 0 ? command.options.map(renderOptionField).join("") : `<p class="muted">这条命令没有可配置选项。</p>`}
      </section>
    </div>

    <div class="preview-box">
      <label>命令预览</label>
      <pre id="command-preview">${escapeHtml(prefillPreview || buildPreview(command))}</pre>
    </div>

    <div class="action-row">
      <button class="primary" data-action="execute">执行命令</button>
      <button class="secondary" data-action="copy">复制命令</button>
    </div>
  `;

  updatePreview();
}

function renderArgumentField(argument) {
  const hint = argument.variadic ? "多个值用空格分隔" : argument.description || "";
  return `
    <label class="field">
      <span>${escapeHtml(argument.name)}${argument.required ? " *" : ""}</span>
      <input data-kind="argument" data-name="${escapeAttribute(argument.name)}" type="text" placeholder="${escapeAttribute(hint)}" />
      <small>${escapeHtml(hint || (argument.required ? "必填参数" : "可选参数"))}</small>
    </label>
  `;
}

function renderOptionField(option) {
  if (option.boolean) {
    const checked = option.name === "json" ? "checked" : "";
    return `
      <label class="toggle-field">
        <input data-kind="option" data-name="${escapeAttribute(option.name)}" type="checkbox" ${checked} />
        <span>
          <strong>${escapeHtml(option.long || option.flags)}</strong>
          <small>${escapeHtml(option.description || "布尔开关")}</small>
        </span>
      </label>
    `;
  }

  const placeholder = option.valueOptional ? "可留空" : "请输入值";
  return `
    <label class="field">
      <span>${escapeHtml(option.long || option.flags)}${option.required ? " *" : ""}</span>
      <input data-kind="option" data-name="${escapeAttribute(option.name)}" type="text" placeholder="${escapeAttribute(placeholder)}" />
      <small>${escapeHtml(option.description || "命令选项")}</small>
    </label>
  `;
}

async function refreshDashboard() {
  const response = await fetch(`/api/dashboard?context=${encodeURIComponent(state.selectedContext)}`);
  state.dashboard = await response.json();
  renderDashboardCards();
  renderBooksPanel();
  renderReviewsPanel();
}

function renderDashboardCards() {
  const totals = state.dashboard?.totals ?? { books: 0, chapters: 0, words: 0, pendingReviews: 0 };
  const cards = [
    { label: "书籍数量", value: totals.books, tone: "teal" },
    { label: "章节总数", value: totals.chapters, tone: "sand" },
    { label: "累计字数", value: formatNumber(totals.words), tone: "rust" },
    { label: "待审核", value: totals.pendingReviews, tone: "ink" },
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
  const books = state.dashboard?.books ?? [];
  if (!state.dashboard?.initialized) {
    refs.booksPanel.innerHTML = `
      <div class="panel-head compact">
        <div>
          <p class="eyebrow">Project Audit</p>
          <h2>项目状态</h2>
        </div>
      </div>
      <div class="empty-state">
        <p>当前上下文还不是 InkOS 项目。可以在左侧选择已有项目，或执行 init 命令创建一个。</p>
      </div>
    `;
    return;
  }

  refs.booksPanel.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Project Audit</p>
        <h2>书籍概览</h2>
      </div>
    </div>
    <div class="list-panel">
      ${books.length > 0 ? books.map(renderBookCard).join("") : `<div class="empty-state"><p>当前项目还没有书籍。</p></div>`}
    </div>
  `;
}

function renderBookCard(book) {
  return `
    <article class="list-card">
      <div>
        <strong>${escapeHtml(book.title)}</strong>
        <small>${escapeHtml(book.id)} · ${escapeHtml(book.genre)} / ${escapeHtml(book.platform)}</small>
      </div>
      <div class="metric-row">
        <span>状态 ${escapeHtml(book.status)}</span>
        <span>章节 ${book.chapters}/${book.targetChapters}</span>
        <span>字数 ${formatNumber(book.totalWords)}</span>
        <span>待审 ${book.pending}</span>
      </div>
    </article>
  `;
}

function renderReviewsPanel() {
  const reviews = state.dashboard?.pendingReviews ?? [];
  refs.reviewsPanel.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Queue</p>
        <h2>待审核章节</h2>
      </div>
    </div>
    <div class="list-panel">
      ${reviews.length > 0 ? reviews.map(renderReviewCard).join("") : `<div class="empty-state"><p>当前没有待审核章节。</p></div>`}
    </div>
  `;
}

function renderReviewCard(review) {
  return `
    <article class="list-card subtle">
      <div>
        <strong>${escapeHtml(review.title)} · 第 ${review.chapter} 章</strong>
        <small>${escapeHtml(review.chapterTitle)}</small>
      </div>
      <div class="metric-row">
        <span>${escapeHtml(review.status)}</span>
        <span>${review.issueCount} 个问题</span>
      </div>
    </article>
  `;
}

function renderOutputPanel() {
  const execution = state.execution;
  const recent = state.history.slice(0, 5);

  if (execution?.error) {
    refs.outputPanel.innerHTML = `
      <div class="panel-head compact">
        <div>
          <p class="eyebrow">Execution</p>
          <h2>执行结果</h2>
        </div>
        <span class="badge danger">失败</span>
      </div>
      <div class="preview-box compact">
        <label>错误信息</label>
        <pre>${escapeHtml(execution.error)}</pre>
      </div>
      <div class="panel-head compact history-head">
        <div>
          <p class="eyebrow">History</p>
          <h2>最近执行</h2>
        </div>
      </div>
      <div class="history-list">
        ${recent.length > 0 ? recent.map(renderHistoryButton).join("") : `<div class="empty-state tiny"><p>还没有执行历史。</p></div>`}
      </div>
    `;
    return;
  }

  refs.outputPanel.innerHTML = `
    <div class="panel-head compact">
      <div>
        <p class="eyebrow">Execution</p>
        <h2>执行结果</h2>
      </div>
      ${execution ? `<span class="badge ${execution.ok ? "success" : "danger"}">${execution.ok ? "成功" : "失败"}</span>` : ""}
    </div>

    ${execution ? `
      <div class="result-meta">
        <span>上下文 ${escapeHtml(execution.contextPath)}</span>
        <span>退出码 ${execution.exitCode}</span>
      </div>
      <div class="preview-box compact">
        <label>已执行命令</label>
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
    ` : `
      <div class="empty-state">
        <p>执行任一命令后，结果会显示在这里。</p>
      </div>
    `}

    <div class="panel-head compact history-head">
      <div>
        <p class="eyebrow">History</p>
        <h2>最近执行</h2>
      </div>
    </div>
    <div class="history-list">
      ${recent.length > 0 ? recent.map(renderHistoryButton).join("") : `<div class="empty-state tiny"><p>还没有执行历史。</p></div>`}
    </div>
  `;
}

function renderHistoryButton(item) {
  return `
    <button class="history-item" data-history-command="${escapeAttribute(item.commandPath)}" data-history-preview="${escapeAttribute(item.preview)}">
      <strong>${escapeHtml(item.commandPath)}</strong>
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
    const value = payload.arguments[argument.name]?.trim();
    if (!value) {
      continue;
    }
    parts.push(value);
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
    argumentsPayload[input.dataset.name] = input.value;
  });

  refs.commandPanel.querySelectorAll("[data-kind='option']").forEach((input) => {
    if (input.type === "checkbox") {
      optionsPayload[input.dataset.name] = input.checked;
      return;
    }
    optionsPayload[input.dataset.name] = input.value;
  });

  return { arguments: argumentsPayload, options: optionsPayload };
}

async function executeSelectedCommand() {
  const payload = {
    commandPath: state.selectedCommandPath,
    contextPath: state.selectedContext,
    ...collectFormPayload(),
  };

  const button = refs.commandPanel.querySelector("button[data-action='execute']");
  button.disabled = true;
  button.textContent = "执行中...";

  try {
    const response = await fetch("/api/execute", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    state.execution = response.ok ? result : { error: result.error || "命令执行失败" };
    pushHistory({
      commandPath: state.selectedCommandPath,
      contextPath: state.selectedContext,
      preview: buildPreview(),
    });
    renderOutputPanel();
    await refreshDashboard();
  } finally {
    button.disabled = false;
    button.textContent = "执行命令";
  }
}

function pushHistory(entry) {
  state.history = [entry, ...state.history.filter((item) => item.preview !== entry.preview || item.contextPath !== entry.contextPath)].slice(0, 10);
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

function flattenCommands(commands) {
  return commands.flatMap((command) => [command, ...flattenCommands(command.children)]);
}

function groupCommands(commands) {
  const map = new Map();
  for (const command of commands) {
    const group = command.path.split(" ")[0];
    if (!map.has(group)) {
      map.set(group, []);
    }
    map.get(group).push(command);
  }
  return [...map.entries()].sort((left, right) => left[0].localeCompare(right[0]));
}

function quoteShell(value) {
  return /\s/.test(value) ? `"${value}"` : value;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
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