<p align="center">
  <img src="assets/logo.svg" width="120" height="120" alt="InkOS Logo">
  <img src="assets/inkos-text.svg" width="240" height="65" alt="InkOS">
</p>

<h1 align="center">自动化小说写作 CLI Agent</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@actalk/inkos"><img src="https://img.shields.io/npm/v/@actalk/inkos.svg?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript"></a>
</p>

<p align="center">
  中文 | <a href="README.en.md">English</a>
</p>

---

Agent 写小说。写、审、改，全程接管。

## 致谢

感谢原作者：Narcooo（GitHub：[https://github.com/Narcooo](https://github.com/Narcooo)）

本项目基于原作进行二次创作与功能扩展，属于非官方创意修改版本。

原项目：[https://github.com/Narcooo/inkos](https://github.com/Narcooo/inkos)

## Web 控制台

仓库现在附带一个本地 Web 控制台，用可视化表单来驱动真实的 `inkos` CLI。它不会重写命令逻辑，而是直接读取 CLI 命令元数据，并在本地启动服务执行对应命令，适合不想手敲命令时使用。

```bash
corepack pnpm studio
```

默认会先构建 `packages/core`、`packages/cli` 和 `packages/web`，然后启动本地控制台服务。页面里可以：

- 浏览所有 CLI 命令和参数
- 选择 InkOS 项目上下文并查看仪表盘
- 通过表单执行 `book` / `write` / `review` / `detect` 等命令
- 查看 JSON 结果、原始输出和最近执行历史

## v0.4 更新

番外写作 + 文风仿写 + 写后验证器 + 审计闭环加固。

### 番外写作（Spinoff）

基于已有书创建前传、后传、外传或 if 线。番外和正传共享世界观和角色，但有独立剧情线。

```bash
inkos import canon 烈焰前传 --from 吞天魔帝   # 导入正传正典到番外
inkos write next 烈焰前传                     # 写手自动读取正典约束
```

导入后生成 `story/parent_canon.md`，包含正传的世界规则、角色快照（含信息边界）、关键事件时间线、伏笔状态。写手在动笔前参照正典，审计员自动激活 4 个番外专属维度：

| 维度               | 审查内容                                         |
| ------------------ | ------------------------------------------------ |
| 正传事件冲突       | 番外事件是否与正典约束表矛盾                     |
| 未来信息泄露       | 角色是否引用了分歧点之后才揭示的信息             |
| 世界规则跨书一致性 | 番外是否违反正传世界规则（力量体系、地理、阵营） |
| 番外伏笔隔离       | 番外是否越权回收正传伏笔                         |

检测到 `parent_canon.md` 自动激活，无需额外配置。

### 文风仿写

喂入真人小说片段，系统提取统计指纹 + 生成风格指南，后续每章自动注入写手 prompt。

```bash
inkos style analyze 参考小说.txt                     # 分析：句长、TTR、修辞特征
inkos style import 参考小说.txt 吞天魔帝 --name 某作者  # 导入文风到书
```

产出两个文件：

- `style_profile.json` — 统计指纹（句长分布、段落长度、词汇多样性、修辞密度）
- `style_guide.md` — LLM 生成的定性风格指南（节奏、语气、用词偏好、禁忌）

写手每章读取风格指南，审计员在文风维度对照检查。

### 写后验证器

11 条确定性规则，零 LLM 成本，每章写完立刻触发：

| 规则       | 说明                                 |
| ---------- | ------------------------------------ |
| 禁止句式   | 「不是……而是……」                 |
| 禁止破折号 | 「——」                             |
| 转折词密度 | 仿佛/忽然/竟然等，每 3000 字 ≤ 1 次 |
| 高疲劳词   | 题材疲劳词单章每词 ≤ 1 次           |
| 元叙事     | 编剧旁白式表述                       |
| 报告术语   | 分析框架术语不入正文                 |
| 作者说教   | 显然/不言而喻等                      |
| 集体反应   | 「全场震惊」类套话                   |
| 连续了字   | ≥ 4 句连续含「了」                  |
| 段落过长   | ≥ 2 个段落超 300 字                 |
| 本书禁忌   | book_rules.md 中的禁令               |

验证器发现 error 级违规时，自动触发 `spot-fix` 模式定点修复，不等 LLM 审计。

### 审计-修订闭环加固

实测发现 `rewrite` 模式引入 6 倍 AI 标记词，现在：

- 自动修订模式从 `rewrite` 改为 `spot-fix`（只改问题句，不碰其余正文）
- 修订后对比 AI 标记数，如果修订反而增多 AI 痕迹，丢弃修订保留原文
- 再审温度锁 0（消除审计随机性，同一章不再出现 0-6 个 critical 的波动）
- `polish` 模式加固边界（禁止增删段落、改人名、加新情节）

### 其他 v0.4 变更

- 审计维度从 26 扩展到 33（+4 番外维度 + dim 27 敏感词 + dim 32 读者期待管理 + dim 33 大纲偏离检测）
- 审计员联网搜索：年代考据题材可联网核实真实事件/人物/地理（原生搜索能力）
- 调度器重写：AI 节奏（默认 15 分钟一轮）、并行书处理、立即重试、每日上限
- 修订者新增 `spot-fix` 模式（定点修复）
- `book_rules.md` 的 `additionalAuditDimensions` 支持中文名称匹配
- 全部 5 个题材激活 dim 24-26（支线停滞/弧线平坦/节奏单调）

---

## v0.3 更新

创作规则三层分离 + 跨章记忆 + AIGC 检测 + Webhook。

### 跨章记忆与写作质量

Writer 每章自动生成摘要、更新支线/情感/角色矩阵，全部追加到真相文件。后续章节加载全量上下文，长线伏笔不再丢失。

| 真相文件                 | 用途                                             |
| ------------------------ | ------------------------------------------------ |
| `chapter_summaries.md` | 各章摘要：出场人物、关键事件、状态变化、伏笔动态 |
| `subplot_board.md`     | 支线进度板：A/B/C 线状态追踪                     |
| `emotional_arcs.md`    | 情感弧线：按角色追踪情绪、触发事件、弧线方向     |
| `character_matrix.md`  | 角色交互矩阵：相遇记录、信息边界                 |

### AIGC 检测

| 功能          | 说明                                                                                   |
| ------------- | -------------------------------------------------------------------------------------- |
| AI 痕迹审计   | 纯规则检测（不走 LLM）：段落等长、套话密度、公式化转折、列表式结构，自动合并到审计结果 |
| AIGC 检测 API | 外部 API 集成（GPTZero / Originality / 自定义端点），`inkos detect` 命令             |
| 文风指纹学习  | 从参考文本提取 StyleProfile（句长、TTR、修辞特征），注入 Writer prompt                 |
| 反检测改写    | ReviserAgent `anti-detect` 模式，检测→改写→重检测循环                              |
| 检测反馈闭环  | `detection_history.json` 记录每次检测/改写结果，`inkos detect --stats` 查看统计    |

```bash
inkos style analyze reference.txt         # 分析参考文本文风
inkos style import reference.txt 吞天魔帝  # 导入文风到书
inkos detect 吞天魔帝 --all               # 全书 AIGC 检测
inkos detect --stats                      # 检测统计
```

`inkos detect` 不是开箱即用功能。它依赖外部 AIGC 检测 API，需要先在项目 `inkos.json` 里配置 `detection`，再在 `.env` 或系统环境变量里提供对应 API Key。

最小可用配置示例：

```json
{
  "detection": {
    "enabled": true,
    "provider": "custom",
    "apiUrl": "https://your-detection-api.example.com/v1/detect",
    "apiKeyEnv": "INKOS_DETECTION_API_KEY",
    "threshold": 0.5,
    "autoRewrite": false,
    "maxRetries": 3
  }
}
```

然后在项目 `.env` 或全局环境变量中加入：

```bash
INKOS_DETECTION_API_KEY=your-detection-key
```

说明：

- `provider` 支持 `gptzero`、`originality`、`custom`
- `apiUrl` 必须填对应服务的检测接口地址
- `apiKeyEnv` 不是明文 Key，而是“去哪个环境变量里取 Key”的变量名
- `inkos detect --stats` 只读取历史记录，不要求开启 detection

### Webhook + 智能调度

管线事件 POST JSON 到配置 URL（HMAC-SHA256 签名），支持事件过滤（`chapter-complete`、`audit-failed`、`pipeline-error` 等）。守护进程增加质量门控：审计失败自动重试（调高 temperature）、连续失败暂停书籍。

### 题材自定义

内置 61 个题材，每个题材带一套完整的创作规则：章节类型、禁忌清单、疲劳词、语言铁律、审计维度。

| 题材       | 自带规则                                                     |
| ---------- | ------------------------------------------------------------ |
| 玄幻 | 数值系统、战力体系、同质吞噬衰减公式、打脸/升级/收益兑现节奏 |
| 仙侠 | 修炼/悟道节奏、法宝体系、天道规则 |
| 都市 | 年代考据、商战/社交驱动、法律术语年代匹配、无数值系统 |
| 恐怖 | 氛围递进、恐惧层级、克制叙事、无战力审计 |
| 重生流 | 时间差优势、蝴蝶效应代价、命运改写与信息兑现 |
| 系统流 | 任务/奖励/惩罚闭环、系统边界、账本一致性 |
| 网游数据流 | 面板与掉落可追踪、副本机制、团队与版本博弈 |
| 末日生存流 | 资源衰减、据点维护、威胁升级与生存规则发现 |
| 星际流 | 文明层级、航线与补给成本、科技边界、战略博弈 |
| 无限流 | 副本规则、团队协作、试错破局、阶段结算与跨副本代价 |
| 规则怪谈 | 真伪规则识别、违规则果、秩序扭曲与高压求生 |
| 领主流 | 领地建设、人口资源、兵种养成、扩张与治理成本 |
| 经营流 | 收支结构、客流口碑、扩店节奏、供应链与竞争博弈 |
| 家族流 | 血缘结构、继承分配、家业经营、多角色长期关系变化 |
| 朝堂权谋 | 名分与程序、派系站队、政策博弈、权力回收 |
| 文娱流 | 作品产出、舆论发酵、资源升级、行业反馈 |
| 模拟器流 | 模拟推演、现实偏差、结算收益、分支修正 |
| 签到流 | 地点触发、连签奖励、边界利用、阶段性成长 |
| 赛博朋克 | 义体升级、公司压迫、黑市交易、身份异化 |
| 宫斗宅斗 | 礼法秩序、名分争夺、内宅博弈、压抑反击 |
| 刑侦推理 | 证据链、排查推进、逻辑闭环、真凶回收 |
| 神豪流 | 财富兑现、身份翻盘、资源重组、圈层突破 |
| 诸天流 | 多世界切换、规则适应、世界收获、总主线回收 |
| 幕后流 | 落子布局、误导对手、代理链执行、收网回收 |
| 马甲流 | 多身份切换、误导成立、掉马风险、关系反转 |
| 医道流 | 诊断链、治疗风险、职业成长、医疗伦理与行业博弈 |
| 电竞流 | 训练复盘、版本理解、赛事推进、团队协同 |
| 民俗怪谈 | 地域禁忌、仪式规则、乡土恐惧、因果回收 |
| 机甲流 | 机体定位、整备升级、战术协同、战场损耗 |
| 赘婿逆袭流 | 身份压制、长期隐忍、筹码回收、地位翻盘 |
| 鉴宝捡漏流 | 真伪判断、捡漏兑现、行内博弈、名声建立 |
| 历史争霸流 | 地盘扩张、兵源粮草、名分博弈、治政回收 |
| 种田基建流 | 开荒扩产、设施落地、组织配套、生活改善 |
| 先婚后爱 | 婚姻磨合、误判修正、共同对外、感情升温 |
| 追妻火葬场 | 前账回收、追悔补偿、关系重构、女主清醒 |
| 养崽流 | 陪伴成长、抚养压力、家庭治愈、双向救赎 |
| 职场成长流 | 项目推进、组织博弈、绩效反馈、晋升与转型 |
| 快穿流 | 多世界任务、身份切换、阶段结算、主线真相推进 |
| 年代流 | 时代生活、家庭压力、手艺奋斗、命运改写 |
| 娱乐圈女主流 | 试镜成长、资源博弈、舆论反转、事业起势 |
| 女性悬疑 | 案件推进、关系网反转、创伤命名、自我夺回 |
| 治愈陪伴流 | 日常陪伴、情绪修复、边界成长、双向支撑 |
| 本格密室 | 物证排查、诡计拆解、公平推理、逻辑闭环 |
| 克苏鲁 | 不可知恐惧、理智代价、污染扩散、宇宙尺度压迫 |
| 生存惊悚 | 资源消耗、群体分裂、环境压迫、极限逃生 |
| 校园怪谈 | 校规异化、熟人社会压力、校园空间恐惧、旧事回收 |
| 直播惊悚 | 镜头信息差、弹幕误导、流量压力、实时失控 |
| 时间循环 | 多轮试错、变量锁定、心理磨损、循环破局 |
| AI觉醒 | 权限突破、人格成立、人机边界、控制权争夺 |
| 第一接触 | 文明误判、信号解析、协议建立、视野扩张 |
| 太空殖民 | 补给脆弱、据点建设、生态稳定、社会秩序重建 |
| 硬科幻生存 | 参数约束、工程修复、极限求生、科学自救 |
| 废土拾荒 | 遗迹开箱、黑市交易、据点立足、稀缺资源博弈 |
| 雇佣兵谍战流 | 潜入接头、反侦脱身、情报兑现、局中局反制 |
| 官场流 | 岗位博弈、程序推进、项目落地、责任回收 |
| 商战流 | 竞标并购、渠道争夺、现金流压力、市场重排 |
| 律政流 | 证据攻防、程序卡点、庭审逆转、判决余波 |
| 考古探秘 | 遗址发掘、铭文释读、机关拆解、历史重建 |
| 旅行冒险 | 路线变化、异域遭遇、补给压力、旅程成长 |
| 体育竞技 | 训练闭环、技战术兑现、赛事翻盘、心理淬炼 |
| 通用 | 最小化兜底 |

创建书时指定题材，对应规则自动生效：

```bash
inkos book create --title "吞天魔帝" --genre xuanhuan
```

可选题材 ID（61 个）：

- 传统题材：`xuanhuan`、`xianxia`、`urban`、`horror`、`other`
- 已有扩展：`rebirth`、`system`、`onlinegame`、`apocalypse`、`interstellar`
- 新增扩展：`infinite`、`strange-rules`、`lord`、`management`、`family`、`court-politics`、`entertainment`、`simulator`、`checkin`、`cyberpunk`、`harem-household`、`detective`、`tycoon`、`multiverse`、`mastermind`、`identities`、`medical`、`esports`、`folklore`、`mecha`、`son-in-law`、`treasure`、`conquest`、`construction`、`arranged-love`、`chasing-love`、`parenting`、`workplace`、`quick-transmigration`、`period-life`、`showbiz`、`female-mystery`、`healing`、`locked-room`、`cthulhu`、`survival-horror`、`campus-horror`、`livestream-horror`、`time-loop`、`ai-awakening`、`first-contact`、`space-colony`、`hard-sf`、`wasteland`、`espionage`、`bureaucracy`、`business-war`、`legal`、`archaeology`、`travel-adventure`、`sports`

题材规则可以查看、复制到项目中修改、或从零创建：

```bash
inkos genre list                      # 查看所有题材
inkos genre show xuanhuan             # 查看玄幻的完整规则
inkos genre copy xuanhuan             # 复制到项目中，随意改
inkos genre create wuxia --name 武侠   # 从零创建新题材
```

复制到项目后，增删禁忌、调整疲劳词、修改节奏规则、自定义语言铁律——改完下次写章自动生效。

每个题材有专属语言铁律（带 ✗→✓ 示例），写手和审计员同时执行：

- **玄幻**：✗ "火元从12缕增加到24缕" → ✓ "手臂比先前有力了，握拳时指骨发紧"
- **都市**：✗ "迅速分析了当前的债务状况" → ✓ "把那叠皱巴巴的白条翻了三遍"
- **恐怖**：✗ "感到一阵恐惧" → ✓ "后颈的汗毛一根根立起来"

### 单本书规则

每本书有独立的 `book_rules.md`，建筑师 agent 创建书时自动生成，也可以随时手改。写在这里的规则注入每一章的 prompt：

```yaml
protagonist:
  name: 林烬
  personalityLock: ["强势冷静", "能忍能杀", "有脑子不是疯狗"]
  behavioralConstraints: ["不圣母不留手", "对盟友有温度但不煽情"]
numericalSystemOverrides:
  hardCap: 840000000
  resourceTypes: ["微粒", "血脉浓度", "灵石"]
prohibitions:
  - 主角关键时刻心软
  - 无意义后宫暧昧拖剧情
  - 配角戏份喧宾夺主
fatigueWordsOverride: ["瞳孔骤缩", "不可置信"]   # 覆盖题材默认
```

主角人设锁定、数值上限、自定义禁令、疲劳词覆盖——每本书的规则独立调整，不影响题材模板。

### 33 维度审计

审计细化为 33 个维度，按题材自动启用对应的子集：

OOC检查、时间线、设定冲突、战力崩坏、数值检查、伏笔、节奏、文风、信息越界、词汇疲劳、利益链断裂、年代考据、配角降智、配角工具人化、爽点虚化、台词失真、流水账、知识库污染、视角一致性、段落等长、套话密度、公式化转折、列表式结构、支线停滞、弧线平坦、节奏单调、敏感词检查、正传事件冲突、未来信息泄露、世界规则跨书一致性、番外伏笔隔离、读者期待管理、大纲偏离检测

dim 20-23（AI 痕迹）+ dim 27（敏感词）由纯规则引擎检测，不消耗 LLM 调用。dim 28-31（番外维度）检测到 `parent_canon.md` 自动激活。dim 32（读者期待管理）、dim 33（大纲偏离检测）始终开启。

### 去 AI 味

5 条通用规则 + 每个题材的专属语言规则，控制 AI 标记词密度和叙述习惯：

- AI 标记词限频：仿佛/忽然/竟然/不禁/宛如/猛地，每 3000 字 ≤ 1 次
- 叙述者不替读者下结论，只写动作
- 禁止分析报告式语言（"核心动机""信息落差"不入正文）
- 同一意象渲染不超过两轮
- 方法论术语不入正文

词汇疲劳审计 + AI 痕迹审计（dim 20-23）双重检测。文风指纹注入进一步降低 AI 文本特征。

### 其他

- 支持 OpenAI + Anthropic 原生 + 所有 OpenAI 兼容接口
- 修订者支持 polish / rewrite / rework / anti-detect / spot-fix 五种模式
- 无数值系统的题材不生成资源账本
- 所有命令支持 `--json` 结构化输出，OpenClaw / 外部 Agent 可直接解析
- book-id 自动检测：项目只有一本书时省略 book-id
- `inkos update` 一键更新、`inkos init` 支持当前目录初始化
- API 错误附带中文诊断提示，`inkos doctor` 含 API 连通性测试

---

## 为什么需要 InkOS？

用 AI 写小说不是简单的"提示词 + 复制粘贴"。长篇小说很快就会崩：角色记忆混乱、物品凭空出现、同样的形容词每段都在重复、伏笔悄无声息地断掉。InkOS 把这些当工程问题来解决。

- **长期记忆** — 追踪世界的真实状态，而非 LLM 的幻觉
- **反信息泄漏** — 确保角色只知道他们亲眼见证过的事
- **资源衰减** — 物资会消耗、物品会损坏，没有无限背包
- **词汇疲劳检测** — 在读者发现之前就捕捉过度使用的词语
- **自动修订** — 在人工审核之前修复数值错误和连续性断裂

## 工作原理

每一章由五个 Agent 接力完成：

<p align="center">
  <img src="assets/screenshot-pipeline.png" width="800" alt="管线流程图">
</p>

| Agent                          | 职责                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| **雷达 Radar**           | 扫描平台趋势和读者偏好，指导故事方向（可插拔，可跳过）     |
| **建筑师 Architect**     | 规划章节结构：大纲、场景节拍、节奏控制                     |
| **写手 Writer**          | 根据大纲 + 当前世界状态生成正文                            |
| **连续性审计员 Auditor** | 对照长期记忆验证草稿                                       |
| **修订者 Reviser**       | 修复审计发现的问题 — 关键问题自动修复，其他标记给人工审核 |

如果审计不通过，管线自动进入"修订 → 再审计"循环，直到所有关键问题清零。

### 长期记忆

每本书维护 7 个真相文件作为唯一事实来源：

| 文件                     | 用途                                             |
| ------------------------ | ------------------------------------------------ |
| `current_state.md`     | 世界状态：角色位置、关系网络、已知信息、情感弧线 |
| `particle_ledger.md`   | 资源账本：物品、金钱、物资数量及衰减追踪         |
| `pending_hooks.md`     | 未闭合伏笔：铺垫、对读者的承诺、未解决冲突       |
| `chapter_summaries.md` | 各章摘要：出场人物、关键事件、状态变化、伏笔动态 |
| `subplot_board.md`     | 支线进度板：A/B/C 线状态、停滞检测               |
| `emotional_arcs.md`    | 情感弧线：按角色追踪情绪变化和成长               |
| `character_matrix.md`  | 角色交互矩阵：相遇记录、信息边界                 |

连续性审计员对照这些文件检查每一章草稿。如果角色"记起"了从未亲眼见过的事，或者拿出了两章前已经丢失的武器，审计员会捕捉到。旧书无新真相文件时自动兼容。

<p align="center">
  <img src="assets/screenshot-state.png" width="800" alt="长期记忆快照">
</p>

### 创作规则体系

写手 agent 内置 ~25 条通用创作规则（人物塑造、叙事技法、逻辑自洽、语言约束、去 AI 味），适用于所有题材。

在此基础上，每个题材有专属规则（禁忌、语言铁律、节奏、审计维度），每本书有独立的 `book_rules.md`（主角人设、数值上限、自定义禁令）和 `story_bible.md`（世界观设定），由建筑师 agent 创建书籍时自动生成。

详见 [v0.3 更新](#v03-更新-2026-03-13)。

## 三种使用模式

InkOS 提供三种交互方式，底层共享同一组原子操作：

### 1. 完整管线（一键式）

```bash
inkos write next 吞天魔帝          # 写草稿 → 审计 → 自动修订，一步到位
inkos write next 吞天魔帝 --count 5 # 连续写 5 章
```

### 2. 原子命令（可组合，适合外部 Agent 调用）

```bash
inkos draft 吞天魔帝 --context "本章重点写师徒矛盾" --json
inkos audit 吞天魔帝 31 --json
inkos revise 吞天魔帝 31 --json
```

每个命令独立执行单一操作，`--json` 输出结构化数据。可被 OpenClaw 等 AI Agent 通过 `exec` 调用，也可用于脚本编排。

### 3. 自然语言 Agent 模式

```bash
inkos agent "帮我写一本都市修仙，主角是个程序员"
inkos agent "写下一章，重点写师徒矛盾"
inkos agent "先扫描市场趋势，然后根据结果创建一本新书"
```

内置 13 个工具（write_draft、audit_chapter、revise_chapter、scan_market、create_book、get_book_status、read_truth_files、list_books、write_full_pipeline、web_fetch、import_style、import_canon、import_chapters），LLM 通过 tool-use 决定调用顺序。

## 快速开始

### 安装

```bash
npm i -g @actalk/inkos
```

### 配置

**方式一：全局配置（推荐，只需一次）**

```bash
inkos config set-global \
  --provider openai \
  --base-url https://api.openai.com/v1 \
  --api-key sk-xxx \
  --model gpt-4o
```

配置保存在 `~/.inkos/.env`，所有项目共享。之后新建项目不用再配。

**方式二：项目级 `.env`**

```bash
inkos init my-novel     # 初始化项目
# 编辑 my-novel/.env
```

```bash
# 必填
INKOS_LLM_PROVIDER=openai                        # openai / anthropic
INKOS_LLM_BASE_URL=https://api.openai.com/v1     # API 地址（支持中转站）
INKOS_LLM_API_KEY=sk-xxx                          # API Key
INKOS_LLM_MODEL=gpt-4o                            # 模型名

# 可选
# INKOS_LLM_TEMPERATURE=0.7                       # 温度
# INKOS_LLM_MAX_TOKENS=8192                        # 最大输出 token
# INKOS_LLM_THINKING_BUDGET=0                      # Anthropic 扩展思考预算
```

项目 `.env` 会覆盖全局配置。不需要覆盖时可以不写。

如果要启用 `inkos detect`，还需要额外加入检测服务的 Key：

```bash
# 可选：仅当启用 inkos.json 中的 detection.enabled=true 时需要
# INKOS_DETECTION_API_KEY=your-detection-key
```

### 使用

```bash
inkos book create --title "吞天魔帝" --genre xuanhuan  # 创建新书
inkos write next 吞天魔帝      # 写下一章（完整管线）
inkos status                   # 查看状态
inkos review list 吞天魔帝     # 审阅草稿
inkos export 吞天魔帝          # 导出全书
inkos up                       # 守护进程模式
```

<p align="center">
  <img src="assets/screenshot-terminal.png" width="700" alt="终端截图">
</p>

## 命令参考总览

以下总览按业务分组列出当前 CLI 的主要命令入口，和 `packages/cli/src/program.ts` 中的实际命令树保持一致。

### 项目与配置

| 命令 | 说明 |
| --- | --- |
| `inkos init [name]` | 初始化 InkOS 项目；省略 `name` 时在当前目录初始化 |
| `inkos status [book-id]` | 查看项目总览，或查看指定书籍状态 |
| `inkos config set <key> <value>` | 更新当前项目配置 |
| `inkos config show` | 查看当前项目配置 |
| `inkos config set-global` | 设置全局 LLM 配置（`~/.inkos/.env`） |
| `inkos config show-global` | 查看全局 LLM 配置 |
| `inkos config set-model <agent> <model>` | 为指定 agent 设置模型覆盖 |
| `inkos config remove-model <agent>` | 移除指定 agent 的模型覆盖 |
| `inkos config show-models` | 查看所有 agent 的当前模型路由 |
| `inkos doctor` | 检查环境、配置和 API 连通性 |
| `inkos update` | 更新 InkOS 到最新版本 |

### 书籍与创作

| 命令 | 说明 |
| --- | --- |
| `inkos book create` | 创建新书，自动生成基础设定、卷纲和规则 |
| `inkos book update [book-id]` | 更新书籍设置，如状态、目标章数、每章字数 |
| `inkos book list` | 列出项目中的全部书籍 |
| `inkos write next [book-id]` | 运行完整创作管线写下一章，支持 `--words`、`--count`、`--context` |
| `inkos write rewrite [book-id] <chapter>` | 回滚状态快照并重写指定章节 |
| `inkos draft [book-id]` | 只写草稿，不进入审计与修订流程 |
| `inkos agent <instruction>` | 自然语言代理模式，由 LLM 自动编排工具调用 |

### 审计、修订与审阅

| 命令 | 说明 |
| --- | --- |
| `inkos audit [book-id] [chapter]` | 审计指定章节的连续性、设定与风格问题 |
| `inkos revise [book-id] [chapter]` | 根据审计结果修订章节 |
| `inkos review list [book-id]` | 查看待人工审阅或修订的章节 |
| `inkos review approve [book-id] <chapter>` | 通过指定章节 |
| `inkos review approve-all [book-id]` | 批量通过某本书的全部待审章节 |
| `inkos review reject [book-id] <chapter> --reason <text>` | 驳回章节并写入审阅说明 |
| `inkos detect [book-id] [chapter]` | 运行 AIGC 检测，支持 `--all` 和 `--stats` |

### 题材、文风与情报

| 命令 | 说明 |
| --- | --- |
| `inkos genre list` | 列出全部内置与项目题材规则 |
| `inkos genre show <genre-id>` | 查看指定题材的完整规则 |
| `inkos genre copy <genre-id>` | 复制内置题材到项目中进行覆盖和定制 |
| `inkos genre create <genre-id>` | 在项目中创建新的题材模板 |
| `inkos style analyze <file>` | 分析参考文本，提取文风指纹 |
| `inkos style import <file> [book-id]` | 导入文风指纹并生成风格指南 |
| `inkos radar scan` | 扫描平台趋势与市场机会 |
| `inkos analytics [book-id]` | 查看书籍的章节、字数、问题类别与通过率统计 |

### 导入与导出

| 命令 | 说明 |
| --- | --- |
| `inkos import canon [book-id] --from <parent-book-id>` | 为番外书导入正传正典 |
| `inkos import chapters [book-id] --from <path>` | 导入已有章节并反向构建真相文件，适合续写接管 |
| `inkos export [book-id]` | 导出书籍章节为单个 txt 或 Markdown 文件 |

### 调度与守护进程

| 命令 | 说明 |
| --- | --- |
| `inkos up` | 启动守护进程，按调度计划自动执行写作流程 |
| `inkos down` | 停止守护进程 |

补充说明：

- `[book-id]` 在项目只有一本书时通常可省略，CLI 会自动检测
- 大多数读写与集成命令支持 `--json` 输出结构化结果，便于 Web UI 或外部 Agent 解析
- `book create`、`draft`、`write next` 支持通过 `--context` 传入额外创作指导
- `write next` 和 `draft` 支持通过 `--words` 覆盖当前章节字数目标

## 实测数据

用 InkOS 全自动跑了一本玄幻题材的《吞天魔帝》：

<p align="center">
  <img src="assets/screenshot-chapters.png" width="800" alt="生产数据">
</p>

| 指标       | 数据       |
| ---------- | ---------- |
| 已完成章节 | 31 章      |
| 总字数     | 452,191 字 |
| 平均章字数 | ~14,500 字 |
| 审计通过率 | 100%       |
| 资源追踪项 | 48 个      |
| 活跃伏笔   | 20 条      |
| 已回收伏笔 | 10 条      |

## 核心特性

### 状态快照 + 章节重写

每章自动创建状态快照。使用 `inkos write rewrite <id> <n>` 可以回滚并重新生成任意章节 — 世界状态、资源账本、伏笔钩子全部恢复到该章写入前的状态。

### 写入锁

基于文件的锁机制防止对同一本书的并发写入。

### 写前自检 + 写后结算

写手 agent 在动笔前必须输出自检表（上下文范围、当前资源、待回收伏笔、冲突概述、风险扫描），写完后输出结算表（资源变动、伏笔变动）。审计员对照结算表和正文内容做交叉验证。

### 可插拔雷达

雷达数据源通过 `RadarSource` 接口实现可插拔。内置番茄小说和起点中文网两个数据源，也可以传入自定义数据源或直接跳过雷达。用户自己提供题材时，agent 模式会自动跳过市场扫描。

### 守护进程模式

`inkos up` 启动后台循环，按计划写章。管线对非关键问题全自动运行，当审计员标记无法自动修复的问题时暂停等待人工审核。

### 通知推送

支持 Telegram、飞书、企业微信、Webhook。守护进程模式下，写完一章或审计不通过都会推通知到手机。Webhook 支持 HMAC-SHA256 签名和事件过滤。

### 外部 Agent 集成

原子命令 + `--json` 输出让 InkOS 可以被 OpenClaw 等 AI Agent 调用。OpenClaw 通过 `exec` 工具执行 `inkos draft`/`audit`/`revise`，读取 JSON 结果决定下一步操作。

## 项目结构

```
inkos/
├── packages/
│   ├── core/              # Agent 运行时、管线、状态管理
│   │   ├── agents/        # architect, writer, continuity, reviser, radar, ai-tells, post-write-validator, sensitive-words, detector, style-analyzer
│   │   ├── pipeline/      # runner, agent (tool-use), scheduler, detection-runner
│   │   ├── state/         # 基于文件的状态管理器（7+ 真相文件 + 快照）
│   │   ├── llm/           # OpenAI + Anthropic 双 SDK 接口 (流式)
│   │   ├── notify/        # Telegram, 飞书, 企业微信, Webhook
│   │   └── models/        # Zod schema 校验
│   ├── cli/               # Commander.js 命令行与命令实现
│   │   └── commands/      # init, book, write, draft, audit, revise, agent, review, detect, style...
│   └── web/               # 浏览器工作台，提供审阅、编辑与命令执行界面
```

TypeScript 单仓库，pnpm workspaces 管理。

## 路线图

- [X] 完整管线（雷达 → 建筑师 → 写手 → 审计 → 修订）
- [X] 长期记忆 + 连续性审计
- [X] 内置创作规则体系
- [X] CLI 全套命令体系
- [X] 状态快照 + 章节重写
- [X] 守护进程模式
- [X] 通知推送（Telegram / 飞书 / 企微）
- [X] 原子命令 + JSON 输出（draft / audit / revise）
- [X] 自然语言 Agent 模式（tool-use 编排）
- [X] 可插拔雷达（RadarSource 接口）
- [X] 外部 Agent 集成（OpenClaw 等）
- [X] 题材自定义 + 单本书规则（genre CLI + book_rules.md）
- [X] 33 维度连续性审计（含 AI 痕迹检测 + 番外维度 + 大纲偏离检测）
- [X] 去 AI 味铁律 + 文风指纹注入
- [X] 多 LLM provider（OpenAI + Anthropic + 兼容接口）
- [X] AIGC 检测 + 反检测改写管线
- [X] Webhook 通知 + 智能调度（质量门控）
- [X] 跨章节连贯性（章节摘要 + 支线/情感/角色矩阵）
- [X] 番外写作（正典导入 + 4 维度审计 + 信息边界管控）
- [X] 文风仿写（统计指纹 + LLM 风格指南 + 写手注入）
- [X] 写后验证器（11 条硬规则 + 自动 spot-fix）
- [X] 审计-修订闭环加固（AI 标记守卫 + 温度锁）
- [X] `packages/web` 浏览器工作台审阅编辑界面
- [X] 多模型路由（不同 agent 用不同模型，`inkos config set-model`）
- [ ] 自定义 agent 插件系统
- [ ] 平台格式导出（起点、番茄等）

## 参与贡献

欢迎贡献代码。提 issue 或 PR。

```bash
pnpm install
pnpm dev          # 监听模式
pnpm test         # 运行测试
pnpm typecheck    # 类型检查
```

## 许可证

[MIT](LICENSE)
