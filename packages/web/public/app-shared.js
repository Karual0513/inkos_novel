export const COMMAND_CATEGORIES = {
  core: { label: "核心创作", order: 10 },
  review: { label: "审阅修订", order: 20 },
  project: { label: "项目总览", order: 30 },
  style: { label: "风格与题材", order: 40 },
  io: { label: "导入导出", order: 50 },
  system: { label: "系统维护", order: 60 },
};

export const COMMAND_LABELS = {
  "init": { label: "初始化项目", category: "system", order: 1, description: "创建 InkOS 项目结构" },
  "config set": { label: "设置项目配置", category: "system", order: 2, description: "修改当前项目的模型与参数" },
  "config set-global": { label: "设置全局配置", category: "system", order: 3, description: "修改全局模型与 API 配置" },
  "book create": { label: "创建新书", category: "core", order: 1, description: "生成新书基础设定、卷纲与规则" },
  "book update": { label: "更新书籍设置", category: "project", order: 2, description: "更新字数、章数与书籍状态" },
  "book list": { label: "查看书籍列表", category: "project", order: 3, description: "列出项目中的全部书籍" },
  "write next": { label: "续写下一章", category: "core", order: 4, description: "按当前书籍状态继续写下一章" },
  "write rewrite": { label: "重写指定章节", category: "core", order: 5, description: "回滚并重写某一章" },
  "draft": { label: "只写草稿", category: "core", order: 6, description: "生成草稿，不走审计与修订流程" },
  "review list": { label: "查看待审章节", category: "review", order: 1, description: "查看待人工审阅或修订的章节" },
  "review approve": { label: "通过审阅", category: "review", order: 2, description: "将章节标记为已通过审阅" },
  "review approve-all": { label: "全部通过审阅", category: "review", order: 3, description: "将某本书的待审章节全部通过" },
  "review reject": { label: "驳回章节", category: "review", order: 4, description: "驳回章节并写入审阅说明" },
  "audit": { label: "审计章节", category: "review", order: 5, description: "检查章节连续性与规则问题" },
  "revise": { label: "修订章节", category: "review", order: 6, description: "根据审计结果修订章节" },
  "status": { label: "项目状态", category: "project", order: 1, description: "查看项目与书籍总体进度" },
  "analytics": { label: "数据分析", category: "project", order: 4, description: "查看章节统计与趋势" },
  "genre list": { label: "查看题材库", category: "style", order: 1, description: "列出全部内置与项目题材规则" },
  "genre show": { label: "查看题材规则", category: "style", order: 2, description: "查看指定题材的完整规则" },
  "genre create": { label: "创建题材模板", category: "style", order: 3, description: "从零创建新的题材规则" },
  "genre copy": { label: "复制题材到项目", category: "style", order: 4, description: "复制内置题材到项目中覆盖使用" },
  "style analyze": { label: "分析文风", category: "style", order: 5, description: "分析文本风格并生成画像" },
  "style import": { label: "导入文风指纹", category: "style", order: 6, description: "导入已有文风分析结果" },
  "radar scan": { label: "扫描市场趋势", category: "project", order: 5, description: "分析平台趋势与热门题材" },
  "export": { label: "导出作品", category: "io", order: 1, description: "导出章节为文本或 Markdown" },
  "import canon": { label: "导入正典设定", category: "io", order: 2, description: "导入外部世界观或正典文件" },
  "import chapters": { label: "导入章节", category: "io", order: 3, description: "将外部章节导入当前书籍" },
  "detect": { label: "AIGC 检测", category: "review", order: 7, description: "检测章节 AIGC 风险" },
  "agent": { label: "代理创作模式", category: "core", order: 7, description: "通过自然语言驱动 CLI 代理" },
  "up": { label: "启动守护进程", category: "system", order: 4, description: "启动后台守护任务" },
  "down": { label: "停止守护进程", category: "system", order: 5, description: "停止后台守护任务" },
  "doctor": { label: "环境诊断", category: "system", order: 6, description: "检查 CLI 与依赖状态" },
  "update": { label: "更新 CLI", category: "system", order: 7, description: "更新 InkOS 命令行版本" },
};

export const BOOK_STATUS_LABELS = {
  incubating: "孵化中",
  outlining: "设定中",
  active: "连载中",
  paused: "暂停",
  completed: "已完结",
  dropped: "已弃坑",
};

export const CHAPTER_STATUS_LABELS = {
  "card-generated": "状态卡已生成",
  drafting: "写作中",
  drafted: "草稿完成",
  auditing: "审计中",
  "audit-passed": "审计通过",
  "audit-failed": "审计失败",
  revising: "修订中",
  "ready-for-review": "待审阅",
  approved: "已通过",
  rejected: "已驳回",
  published: "已发布",
  imported: "已导入",
};

export const GENRE_LABELS = {
  xuanhuan: "玄幻",
  xianxia: "仙侠",
  urban: "都市",
  horror: "恐怖",
  rebirth: "重生流",
  system: "系统流",
  onlinegame: "网游数据流",
  apocalypse: "末日生存流",
  interstellar: "星际流",
  infinite: "无限流",
  "strange-rules": "规则怪谈",
  lord: "领主流",
  management: "经营流",
  family: "家族流",
  "court-politics": "朝堂权谋",
  entertainment: "文娱流",
  simulator: "模拟器流",
  checkin: "签到流",
  cyberpunk: "赛博朋克",
  "harem-household": "宫斗宅斗",
  detective: "刑侦推理",
  tycoon: "神豪流",
  multiverse: "诸天流",
  mastermind: "幕后流",
  identities: "马甲流",
  medical: "医道流",
  esports: "电竞流",
  folklore: "民俗怪谈",
  mecha: "机甲流",
  "son-in-law": "赘婿逆袭流",
  treasure: "鉴宝捡漏流",
  conquest: "历史争霸流",
  construction: "种田基建流",
  "arranged-love": "先婚后爱",
  "chasing-love": "追妻火葬场",
  parenting: "养崽流",
  workplace: "职场成长流",
  "quick-transmigration": "快穿流",
  "period-life": "年代流",
  showbiz: "娱乐圈女主流",
  "female-mystery": "女性悬疑",
  healing: "治愈陪伴流",
  "locked-room": "本格密室",
  cthulhu: "克苏鲁",
  "survival-horror": "生存惊悚",
  "campus-horror": "校园怪谈",
  "livestream-horror": "直播惊悚",
  "time-loop": "时间循环",
  "ai-awakening": "AI觉醒",
  "first-contact": "第一接触",
  "space-colony": "太空殖民",
  "hard-sf": "硬科幻生存",
  wasteland: "废土拾荒",
  espionage: "雇佣兵谍战流",
  bureaucracy: "官场流",
  "business-war": "商战流",
  legal: "律政流",
  archaeology: "考古探秘",
  "travel-adventure": "旅行冒险",
  sports: "体育竞技",
  other: "通用",
};

export const PLATFORM_LABELS = {
  tomato: "番茄",
  feilu: "飞卢",
  qidian: "起点",
  other: "其他",
};

export const REVISE_MODE_LABELS = {
  polish: "润色优化",
  rewrite: "整体重写",
  rework: "结构重做",
  "spot-fix": "局部修补",
};

export function localizeCommand(command) {
  const meta = COMMAND_LABELS[command.path] ?? defaultCommandMeta(command);
  const category = COMMAND_CATEGORIES[meta.category] ?? COMMAND_CATEGORIES.system;
  return {
    ...command,
    uiLabel: meta.label,
    uiDescription: meta.description,
    uiCategory: meta.category,
    uiCategoryLabel: category.label,
    uiCategoryOrder: category.order,
    uiOrder: meta.order ?? 999,
  };
}

export function buildPrefillFromDataset(dataset) {
  const prefill = { arguments: {}, options: {} };
  const bookId = dataset.bookId;
  const chapter = dataset.chapter;
  const genre = dataset.genre;
  const mode = dataset.mode;
  const path = dataset.commandPath;

  if (path === "write next" || path === "draft" || path === "status" || path === "review list" || path === "review approve-all") {
    if (bookId) {
      prefill.arguments["book-id"] = bookId;
    }
  }

  if (path === "audit" || path === "revise") {
    if (bookId) {
      prefill.arguments["book-id"] = bookId;
    }
    if (chapter) {
      prefill.arguments.chapter = String(chapter);
    }
    if (mode) {
      prefill.options.mode = mode;
    }
  }

  if (path === "review approve" || path === "review reject" || path === "write rewrite") {
    if (bookId && chapter) {
      prefill.arguments.args = `${bookId} ${chapter}`;
    }
    if (mode) {
      prefill.options.mode = mode;
    }
  }

  if (path === "genre show" && genre) {
    prefill.arguments.id = genre;
  }

  return prefill;
}

export function getCommandPrefill(command, uiState) {
  const existing = uiState.commandPrefills?.[command.path] ?? { arguments: {}, options: {} };
  const prefill = {
    arguments: { ...existing.arguments },
    options: { ...existing.options },
  };

  if (command.supportsJson && typeof prefill.options.json === "undefined") {
    prefill.options.json = true;
  }

  if (uiState.selectedBookId) {
    if (command.arguments.some((argument) => argument.name === "book-id") && !prefill.arguments["book-id"]) {
      prefill.arguments["book-id"] = uiState.selectedBookId;
    }

    if ((command.path === "review approve" || command.path === "review reject" || command.path === "write rewrite") && !prefill.arguments.args && uiState.selectedChapterNumber) {
      prefill.arguments.args = `${uiState.selectedBookId} ${uiState.selectedChapterNumber}`;
    }
  }

  if (uiState.selectedChapterNumber && command.arguments.some((argument) => argument.name === "chapter") && !prefill.arguments.chapter) {
    prefill.arguments.chapter = String(uiState.selectedChapterNumber);
  }

  if (command.path === "revise" && !prefill.options.mode) {
    prefill.options.mode = "rewrite";
  }

  return prefill;
}

export function getCommandDisplayName(commandPath) {
  return COMMAND_LABELS[commandPath]?.label ?? commandPath;
}

function defaultCommandMeta(command) {
  const root = command.path.split(" ")[0];
  const categoryByRoot = {
    book: "core",
    write: "core",
    draft: "core",
    review: "review",
    audit: "review",
    revise: "review",
    detect: "review",
    status: "project",
    analytics: "project",
    radar: "project",
    genre: "style",
    style: "style",
    import: "io",
    export: "io",
    init: "system",
    config: "system",
    doctor: "system",
    update: "system",
    up: "system",
    down: "system",
  };

  return {
    label: command.path,
    category: categoryByRoot[root] ?? "system",
    order: 999,
    description: command.description || "InkOS 命令",
  };
}