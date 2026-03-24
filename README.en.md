<p align="center">
  <img src="assets/logo.svg" width="120" height="120" alt="InkOS Logo">
  <img src="assets/inkos-text.svg" width="240" height="65" alt="InkOS">
</p>

<h1 align="center">Multi-Agent Novel Production System</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@actalk/inkos"><img src="https://img.shields.io/npm/v/@actalk/inkos.svg?color=cb3837&logo=npm" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg" alt="Node.js"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript"></a>
</p>

<p align="center">
  <a href="README.md">中文</a> | English
</p>

---

Open-source multi-agent system that autonomously writes, audits, and revises novels — with human review gates that keep you in control.

## Acknowledgements

Thanks to the original author: Narcooo (GitHub: [https://github.com/Narcooo](https://github.com/Narcooo))

This project is an unofficial derivative version based on the original work, with creative modifications and feature extensions.

Original project: [https://github.com/Narcooo/inkos](https://github.com/Narcooo/inkos)

## v0.4 Update

Spinoff writing + style cloning + post-write validator + audit-revise hardening.

### Spinoff Writing

Create prequels, sequels, side-stories, or what-if branches from existing books. Spinoffs share the parent's world and characters but have independent plot lines.

```bash
inkos import canon my-prequel --from main-novel   # Import parent canon
inkos write next my-prequel                        # Writer auto-reads canon constraints
```

Generates `story/parent_canon.md` containing the parent's world rules, character snapshots (with information boundaries), key event timeline, and foreshadowing state. The auditor auto-activates 4 spinoff-specific dimensions:

| Dimension                       | Checks                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Canon Event Conflict            | Whether spinoff events contradict the parent's canon constraints                     |
| Future Info Leak                | Whether characters reference information revealed after the divergence point         |
| Cross-Book World Consistency    | Whether the spinoff violates parent world rules (power systems, geography, factions) |
| Spinoff Foreshadowing Isolation | Whether the spinoff oversteps by resolving parent foreshadowing                      |

Auto-activates when `parent_canon.md` is detected. No extra configuration needed.

### Style Cloning

Feed in a real novel excerpt. The system extracts a statistical fingerprint + generates a qualitative style guide, then injects both into every chapter's Writer prompt.

```bash
inkos style analyze reference.txt                      # Analyze: sentence length, TTR, rhetorical features
inkos style import reference.txt my-book --name "Author"  # Import style into book
```

Produces two files:

- `style_profile.json` — statistical fingerprint (sentence/paragraph length distribution, vocabulary diversity, rhetorical density)
- `style_guide.md` — LLM-generated qualitative guide (rhythm, tone, word preferences, taboos)

The Writer reads the style guide every chapter; the Auditor cross-checks against it in the style dimension.

### Post-Write Validator

11 deterministic rules, zero LLM cost, fires immediately after each chapter:

| Rule                    | Description                                                    |
| ----------------------- | -------------------------------------------------------------- |
| Banned Patterns         | "not X… but Y…" sentence structure                           |
| Dash Prohibition        | em-dash "——"                                                 |
| Transition Word Density | "as if" / "suddenly" / "unexpectedly" — max 1 per 3,000 words |
| High-Fatigue Words      | Genre fatigue words: max 1 per word per chapter                |
| Meta-Narration          | Screenwriter-style commentary                                  |
| Report Terminology      | Analytical framework terms banned from prose                   |
| Author Sermonizing      | "obviously" / "needless to say" etc.                           |
| Collective Shock        | "the whole crowd was stunned" cliches                          |
| Consecutive "le" (了)   | ≥ 4 consecutive sentences containing "了"                     |
| Paragraph Length        | ≥ 2 paragraphs over 300 characters                            |
| Book Prohibitions       | Custom bans from book_rules.md                                 |

When the validator finds error-level violations, it auto-triggers `spot-fix` mode for targeted repair before the LLM audit even runs.

### Audit-Revise Loop Hardening

Real testing showed `rewrite` mode introduces 6x more AI markers than the original text. Now:

- Auto-revise mode changed from `rewrite` to `spot-fix` (only fixes flagged sentences, leaves everything else untouched)
- Post-revise AI marker guard: if revision increases AI tell count, the revision is discarded
- Re-audit temperature locked to 0 (deterministic pass/fail gating)
- `polish` mode boundaries strengthened (no adding paragraphs, renaming entities, or changing causality)

### Other v0.4 Changes

- Audit dimensions expanded from 26 to 33 (+4 spinoff dims + dim 27 sensitive words + dim 32 reader expectation management + dim 33 outline adherence detection)
- All 5 genres now activate dims 24-26 (subplot stagnation / flat emotional arc / monotonous pacing)
- Auditor web search: era-research genres can verify real events/people/geography online (native search)
- Scheduler rewrite: AI-paced (15min cycles), parallel book processing, immediate retry, daily cap
- New `spot-fix` revise mode (targeted repair)
- `additionalAuditDimensions` in `book_rules.md` now supports name-string matching

---

## v0.3 Update

Three-layer rule separation + cross-chapter memory + AIGC detection + Webhook.

### Cross-Chapter Memory & Writing Quality

The Writer auto-generates chapter summaries, updates subplot/emotion/character matrices — all appended to truth files. Subsequent chapters load full context, so long-term foreshadowing never gets lost.

| Truth File               | Purpose                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `chapter_summaries.md` | Per-chapter summaries: characters, key events, state changes, hook dynamics |
| `subplot_board.md`     | Subplot progress board: A/B/C line status tracking                          |
| `emotional_arcs.md`    | Emotional arcs: per-character emotion, triggers, arc direction              |
| `character_matrix.md`  | Character interaction matrix: encounter records, information boundaries     |

### AIGC Detection

| Feature                 | Description                                                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI-Tell Audit           | Pure rule-based detection (no LLM): paragraph uniformity, hedge word density, formulaic transitions, list-like structure — auto-merged into audit results |
| AIGC Detection API      | External API integration (GPTZero / Originality / custom endpoints),`inkos detect` command                                                               |
| Style Fingerprint       | Extract StyleProfile from reference text (sentence length, TTR, rhetorical features), inject into Writer prompt                                            |
| Anti-Detect Rewrite     | ReviserAgent `anti-detect` mode, detect → rewrite → re-detect loop                                                                                     |
| Detection Feedback Loop | `detection_history.json` records each detection/rewrite result, `inkos detect --stats` for statistics                                                  |

```bash
inkos style analyze reference.txt           # Analyze reference text style
inkos style import reference.txt my-book    # Import style into book
inkos detect my-book --all                  # Detect all chapters
inkos detect --stats                        # Detection statistics
```

### Webhook + Smart Scheduler

Pipeline events POST JSON to configured URLs (HMAC-SHA256 signed), with event filtering (`chapter-complete`, `audit-failed`, `pipeline-error`, etc.). Daemon mode adds quality gates: auto-retry on audit failure (with temperature ramp), pause book after consecutive failures.

### Genre Customization

61 built-in genres, each with a complete set of writing rules: chapter types, prohibition lists, fatigue words, language rules, and audit dimensions.

| Genre                 | Built-in Rules                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| Xuanhuan (Fantasy) | Numerical system, power scaling, same-type absorption decay formula, face-slap/upgrade/payoff pacing |
| Xianxia (Cultivation) | Cultivation/enlightenment pacing, artifact system, heavenly dao rules |
| Urban | Era research, business/social-driven plot, era-matched legal terminology, no numerical system |
| Horror | Atmosphere progression, fear levels, restrained narration, no power scaling audit |
| Rebirth | Time-advantage payoff, butterfly-effect cost, destiny rewrite under uncertainty |
| System | Task/reward/penalty loop, system boundaries, ledger consistency |
| Onlinegame | Trackable stats and drops, raid mechanics, team and meta competition |
| Apocalypse | Resource decay, shelter maintenance, threat escalation, survival-rule discovery |
| Interstellar | Civilizational scale, route and supply costs, tech boundaries, strategic conflict |
| Infinite | Instance rules, team survival, staged settlement, cross-instance consequences |
| Strange-Rules | True/false rules, violation penalties, distorted order, high-pressure survival |
| Lord | Territory building, population and resource loops, military growth, expansion governance |
| Management | Revenue-cost structure, customer flow, expansion pacing, supply-chain competition |
| Family | Bloodline structure, inheritance pressure, family business operation, multi-character arcs |
| Court-Politics | Rank and procedure, faction alignment, policy conflict, power recovery |
| Entertainment | Creative output, public buzz, resource upgrade, industry feedback |
| Simulator | Simulation runs, reality deviation, settlement rewards, branch correction |
| Checkin | Location-triggered rewards, streak mechanics, boundary exploitation, staged growth |
| Cyberpunk | Body mods, corporate pressure, black-market trade, identity drift |
| Harem-Household | Ritual order, rank competition, inner-house intrigue, suppressed retaliation |
| Detective | Evidence chains, procedural investigation, logical closure, culprit reveal |
| Tycoon | Wealth payout loops, status reversal, resource reallocation, access to elite circles |
| Multiverse | World-hopping, rule adaptation, cross-world rewards, long-arc mainline recovery |
| Mastermind | Piece placement, misdirection, proxy execution, net-closing payoff |
| Identities | Multi-identity rotation, disguise pressure, reveal risk, relationship reversal |
| Medical | Diagnostic chains, treatment risk, professional growth, ethics and hospital politics |
| Esports | Training review, meta understanding, tournament pacing, team coordination |
| Folklore | Regional taboos, ritual rules, village dread, cause-and-effect closure |
| Mecha | Unit roles, maintenance upgrades, tactical coordination, battlefield attrition |
| Son-in-Law | Status suppression, long-term restraint, leverage payoff, social reversal |
| Treasure | Authenticity judgment, undervalued finds, insider bargaining, reputation building |
| Conquest | Territorial expansion, troop and grain logistics, legitimacy conflict, governance follow-through |
| Construction | Land reclamation, facility rollout, organizational support, living-standard improvement |
| Arranged-Love | Marriage friction, misread correction, united front moments, emotional warming |
| Chasing-Love | Old wounds repaid, regret and compensation, relationship rebuild, heroine clarity |
| Parenting | Everyday care, parenting pressure, family healing, mutual redemption |
| Workplace | Project delivery, organizational politics, performance feedback, promotion and transition |
| Quick-Transmigration | Multi-world tasks, identity switching, staged settlement, long-arc truth progression |
| Period-Life | Era-grounded living, family pressure, craft-based striving, destiny rewrite |
| Showbiz | Audition growth, resource games, public reversal, career ascent |
| Female-Mystery | Case progression, relationship reversals, trauma naming, reclaiming agency |
| Healing | Everyday companionship, emotional repair, boundary growth, mutual support |
| Locked-Room | Physical clues, trick deconstruction, fair-play deduction, logical closure |
| Cthulhu | Cosmic dread, sanity cost, contamination spread, unknowable scale |
| Survival-Horror | Resource drain, group fracture, environmental pressure, extreme escape |
| Campus-Horror | Mutated school rules, closed social pressure, campus-space dread, buried-incident recovery |
| Livestream-Horror | Camera information gaps, chat misdirection, traffic pressure, real-time collapse |
| Time-Loop | Iterative retries, variable locking, mental erosion, loop-breaking payoff |
| AI-Awakening | Permission breakthroughs, personhood formation, human-machine boundaries, control struggles |
| First-Contact | Civilizational misread, signal decoding, protocol building, widened perspective |
| Space-Colony | Fragile supply lines, outpost building, ecological stability, social order rebuilding |
| Hard-SF | Parameter constraints, engineering repair, extreme survival, scientific self-rescue |
| Wasteland | Ruin scavenging, black-market exchange, outpost footholds, scarcity conflict |
| Espionage | Infiltration links, counter-surveillance escape, intel payoff, nested-operation reversals |
| Bureaucracy | Position maneuvering, procedural push, project delivery, accountability recovery |
| Business-War | Bids and M&A, channel fights, cash-flow pressure, market reshuffling |
| Legal | Evidence offense-defense, procedural choke points, courtroom reversals, post-judgment fallout |
| Archaeology | Site excavation, inscription decoding, mechanism teardown, historical reconstruction |
| Travel-Adventure | Route changes, foreign encounters, supply pressure, growth through the journey |
| Sports | Training loops, tactical payoff, match reversals, mental hardening |
| General | Minimal fallback |

Specify a genre when creating a book and matching rules activate automatically:

```bash
inkos book create --title "Devouring Emperor" --genre xuanhuan
```

Available genre IDs (61 total):

- Core: `xuanhuan`, `xianxia`, `urban`, `horror`, `other`
- Existing extensions: `rebirth`, `system`, `onlinegame`, `apocalypse`, `interstellar`
- New extensions: `infinite`, `strange-rules`, `lord`, `management`, `family`, `court-politics`, `entertainment`, `simulator`, `checkin`, `cyberpunk`, `harem-household`, `detective`, `tycoon`, `multiverse`, `mastermind`, `identities`, `medical`, `esports`, `folklore`, `mecha`, `son-in-law`, `treasure`, `conquest`, `construction`, `arranged-love`, `chasing-love`, `parenting`, `workplace`, `quick-transmigration`, `period-life`, `showbiz`, `female-mystery`, `healing`, `locked-room`, `cthulhu`, `survival-horror`, `campus-horror`, `livestream-horror`, `time-loop`, `ai-awakening`, `first-contact`, `space-colony`, `hard-sf`, `wasteland`, `espionage`, `bureaucracy`, `business-war`, `legal`, `archaeology`, `travel-adventure`, `sports`

View, copy, or create genre rules:

```bash
inkos genre list                      # List all genres
inkos genre show xuanhuan             # View full xuanhuan rules
inkos genre copy xuanhuan             # Copy to project for customization
inkos genre create wuxia --name Wuxia # Create a new genre from scratch
```

After copying to your project, add/remove prohibitions, adjust fatigue words, modify pacing rules, customize language rules — changes take effect on the next chapter.

Each genre ships with dedicated language rules (with ✗→✓ examples) enforced by both writers and auditors:

- **Xuanhuan**: ✗ "Fire essence increased from 12 strands to 24 strands" → ✓ "His arm felt stronger than before, the finger bones tightening as he clenched his fist"
- **Urban**: ✗ "He quickly analyzed the current debt situation" → ✓ "He flipped through that stack of wrinkled IOUs three times"
- **Horror**: ✗ "He felt a wave of fear" → ✓ "The hairs on the back of his neck stood up one by one"

### Per-Book Rules

Each book has its own `book_rules.md`, auto-generated by the Architect agent when creating a book — also editable anytime. Rules here are injected into every chapter's prompt:

```yaml
protagonist:
  name: Lin Jin
  personalityLock: ["ruthlessly calm", "patient but lethal", "smart, not reckless"]
  behavioralConstraints: ["no mercy, no hesitation", "warm to allies but never sentimental"]
numericalSystemOverrides:
  hardCap: 840000000
  resourceTypes: ["particles", "bloodline density", "spirit stones"]
prohibitions:
  - protagonist goes soft at critical moments
  - pointless harem romance dragging the plot
  - side characters stealing the spotlight
fatigueWordsOverride: ["pupils constricted", "disbelief"]   # Override genre defaults
```

Protagonist personality lock, numerical caps, custom prohibitions, fatigue word overrides — each book's rules are independent, without affecting the genre template.

### 33-Dimension Audit

Auditing is broken down into 33 dimensions, with genre-appropriate subsets auto-enabled:

OOC check, timeline, setting conflicts, power scaling collapse, numerical verification, foreshadowing, pacing, writing style, information leaking, vocabulary fatigue, broken interest chains, era research, side character intelligence drops, side character tool-ification, hollow payoffs, dialogue authenticity, padding detection, knowledge base contamination, POV consistency, paragraph uniformity, hedge word density, formulaic transitions, list-like structure, subplot stagnation, flat emotional arc, monotonous pacing, sensitive word check, canon event conflict, future info leak, cross-book world consistency, spinoff foreshadowing isolation, reader expectation management, outline adherence detection

Dims 20-23 (AI-tell detection) + dim 27 (sensitive words) use a pure rule engine — no LLM calls. Dims 28-31 (spinoff) auto-activate when `parent_canon.md` is detected. Dim 32 (reader expectation management) and dim 33 (outline adherence detection) are always on.

### De-AI-ification

5 universal rules + genre-specific language rules to control AI marker word density and narration habits:

- AI marker word frequency limit: "as if" / "suddenly" / "unexpectedly" / "couldn't help but" — max 1 per 3,000 words
- Narrator never draws conclusions for the reader, only writes actions
- No analytical report language ("core motivation", "information gap" never appear in prose)
- Same imagery rendered no more than twice
- Methodology jargon stays out of prose

Vocabulary fatigue audit + AI-tell audit (dims 20-23) provide dual detection. Style fingerprint injection further reduces AI text characteristics.

### Other

- Supports OpenAI + Anthropic native + all OpenAI-compatible endpoints
- Reviser supports polish / rewrite / rework / anti-detect / spot-fix modes
- Genres without numerical systems skip resource ledger generation
- All commands support `--json` structured output for OpenClaw / external agent integration
- Auto-detect book-id when project has only one book
- `inkos update` for self-updating, `inkos init` supports current directory
- API errors include diagnostic hints, `inkos doctor` includes connectivity test

---

## Why InkOS?

Writing a novel with AI isn't just "prompt and paste." Long-form fiction breaks down fast: characters forget things, items appear from nowhere, the same adjectives repeat every paragraph, and plot threads silently die. InkOS treats these as engineering problems.

- **Canonical truth files** — track the real state of the world, not what the LLM hallucinates
- **Anti-information-leaking** — characters only know what they've actually witnessed
- **Resource decay** — supplies deplete and items break, no infinite backpacks
- **Vocabulary fatigue detection** — catches overused words before readers do
- **Auto-revision** — fixes math errors and continuity breaks before human review

## How It Works

Each chapter is produced by five agents in sequence:

<p align="center">
  <img src="assets/screenshot-pipeline.png" width="800" alt="Pipeline diagram">
</p>

| Agent                        | Responsibility                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Radar**              | Scans platform trends and reader preferences to inform story direction (pluggable, skippable)    |
| **Architect**          | Plans chapter structure: outline, scene beats, pacing targets                                    |
| **Writer**             | Produces prose from the plan + current world state                                               |
| **Continuity Auditor** | Validates the draft against canonical truth files                                                |
| **Reviser**            | Fixes issues found by the auditor — auto-fixes critical problems, flags others for human review |

If the audit fails, the pipeline automatically enters a revise → re-audit loop until all critical issues are resolved.

### Canonical Truth Files

Every book maintains 7 truth files as the single source of truth:

| File                     | Purpose                                                                             |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `current_state.md`     | World state: character locations, relationships, knowledge, emotional arcs          |
| `particle_ledger.md`   | Resource accounting: items, money, supplies with quantities and decay tracking      |
| `pending_hooks.md`     | Open plot threads: foreshadowing planted, promises to readers, unresolved conflicts |
| `chapter_summaries.md` | Per-chapter summaries: characters, key events, state changes, hook dynamics         |
| `subplot_board.md`     | Subplot progress board: A/B/C line status tracking                                  |
| `emotional_arcs.md`    | Emotional arcs: per-character emotion tracking and growth                           |
| `character_matrix.md`  | Character interaction matrix: encounter records, information boundaries             |

The Continuity Auditor checks every draft against these files. If a character "remembers" something they never witnessed, or pulls a weapon they lost two chapters ago, the auditor catches it. Legacy books without new truth files are automatically compatible.

<p align="center">
  <img src="assets/screenshot-state.png" width="800" alt="Truth files snapshot">
</p>

### Writing Rule System

The Writer agent has ~25 universal writing rules (character craft, narrative technique, logical consistency, language constraints, de-AI-ification), applicable to all genres.

On top of that, each genre has dedicated rules (prohibitions, language rules, pacing, audit dimensions), and each book has its own `book_rules.md` (protagonist personality, numerical caps, custom prohibitions) and `story_bible.md` (worldbuilding), auto-generated by the Architect agent.

See [v0.3 Update](#v03-update-2026-03-13) for details.

## Three Usage Modes

InkOS provides three interaction modes, all sharing the same atomic operations:

### 1. Full Pipeline (One Command)

```bash
inkos write next my-book              # Draft → audit → auto-revise, all in one
inkos write next my-book --count 5    # Write 5 chapters in sequence
```

### 2. Atomic Commands (Composable, External Agent Friendly)

```bash
inkos draft my-book --context "Focus on master-disciple conflict" --json
inkos audit my-book 31 --json
inkos revise my-book 31 --json
```

Each command performs a single operation independently. `--json` outputs structured data. Can be called by OpenClaw or other AI agents via `exec`, or used in scripts.

### 3. Natural Language Agent Mode

```bash
inkos agent "Write an urban cultivation novel with a programmer protagonist"
inkos agent "Write the next chapter, focus on master-disciple conflict"
inkos agent "Scan market trends first, then create a new book based on results"
```

13 built-in tools (write_draft, audit_chapter, revise_chapter, scan_market, create_book, get_book_status, read_truth_files, list_books, write_full_pipeline, web_fetch, import_style, import_canon, import_chapters), with the LLM deciding call order via tool-use.

## Quick Start

### Install

```bash
npm i -g @actalk/inkos
```

### Configure

**Option 1: Global config (recommended, one-time setup)**

```bash
inkos config set-global \
  --provider openai \
  --base-url https://api.openai.com/v1 \
  --api-key sk-xxx \
  --model gpt-4o
```

Saved to `~/.inkos/.env`, shared by all projects. New projects just work without extra config.

**Option 2: Per-project `.env`**

```bash
inkos init my-novel     # Initialize project
# Edit my-novel/.env
```

```bash
# Required
INKOS_LLM_PROVIDER=openai                        # openai / anthropic
INKOS_LLM_BASE_URL=https://api.openai.com/v1     # API endpoint (proxy-friendly)
INKOS_LLM_API_KEY=sk-xxx                          # API Key
INKOS_LLM_MODEL=gpt-4o                            # Model name

# Optional
# INKOS_LLM_TEMPERATURE=0.7                       # Temperature
# INKOS_LLM_MAX_TOKENS=8192                        # Max output tokens
# INKOS_LLM_THINKING_BUDGET=0                      # Anthropic extended thinking budget
```

Project `.env` overrides global config. Skip it if no override needed.

### Usage

```bash
inkos book create --title "Devouring Emperor" --genre xuanhuan  # Create a book
inkos write next my-book          # Write next chapter (full pipeline)
inkos status                      # Check status
inkos review list my-book         # Review drafts
inkos export my-book              # Export full book
inkos up                          # Daemon mode
```

<p align="center">
  <img src="assets/screenshot-terminal.png" width="700" alt="Terminal screenshot">
</p>

## CLI Reference Overview

The reference below groups the current CLI entry points by business area and matches the actual command tree in `packages/cli/src/program.ts`.

### Project and Configuration

| Command | Description |
| --- | --- |
| `inkos init [name]` | Initialize an InkOS project. Omit `name` to initialize the current directory. |
| `inkos status [book-id]` | Show project overview, or inspect a specific book. |
| `inkos config set <key> <value>` | Update the current project configuration. |
| `inkos config show` | Show the current project configuration. |
| `inkos config set-global` | Set global LLM configuration in `~/.inkos/.env`. |
| `inkos config show-global` | Show global LLM configuration. |
| `inkos config set-model <agent> <model>` | Override the model used by a specific agent. |
| `inkos config remove-model <agent>` | Remove an agent-specific model override. |
| `inkos config show-models` | Show the effective model routing for all agents. |
| `inkos doctor` | Diagnose environment, configuration, and API connectivity. |
| `inkos update` | Update InkOS to the latest version. |

### Books and Writing

| Command | Description |
| --- | --- |
| `inkos book create` | Create a new book with base setup, outline, and rules. |
| `inkos book update [book-id]` | Update book settings such as status, target chapters, or chapter length. |
| `inkos book list` | List all books in the project. |
| `inkos write next [book-id]` | Run the full writing pipeline for the next chapter. Supports `--words`, `--count`, and `--context`. |
| `inkos write rewrite [book-id] <chapter>` | Restore the snapshot before a chapter and rewrite it. |
| `inkos draft [book-id]` | Draft only, without audit or revise steps. |
| `inkos agent <instruction>` | Natural-language agent mode with LLM-driven tool orchestration. |

### Audit, Revise, and Review

| Command | Description |
| --- | --- |
| `inkos audit [book-id] [chapter]` | Audit a chapter for continuity, setting, and style issues. |
| `inkos revise [book-id] [chapter]` | Revise a chapter from audit findings. |
| `inkos review list [book-id]` | List chapters waiting for manual review or follow-up. |
| `inkos review approve [book-id] <chapter>` | Approve a specific chapter. |
| `inkos review approve-all [book-id]` | Approve all pending chapters for a book. |
| `inkos review reject [book-id] <chapter> --reason <text>` | Reject a chapter and store the review note. |
| `inkos detect [book-id] [chapter]` | Run AIGC detection. Supports `--all` and `--stats`. |

### Genres, Style, and Intelligence

| Command | Description |
| --- | --- |
| `inkos genre list` | List built-in and project-level genre rules. |
| `inkos genre show <genre-id>` | Show the full rules for a genre. |
| `inkos genre copy <genre-id>` | Copy a built-in genre into the project for customization. |
| `inkos genre create <genre-id>` | Create a new project genre template. |
| `inkos style analyze <file>` | Analyze reference prose and extract a style fingerprint. |
| `inkos style import <file> [book-id]` | Import a style fingerprint and generate a style guide. |
| `inkos radar scan` | Scan platform trends and market opportunities. |
| `inkos analytics [book-id]` | Show chapter, word-count, issue-category, and pass-rate statistics. |

### Import and Export

| Command | Description |
| --- | --- |
| `inkos import canon [book-id] --from <parent-book-id>` | Import canon from a parent book for spinoff writing. |
| `inkos import chapters [book-id] --from <path>` | Import existing chapters and reconstruct truth files for takeover writing. |
| `inkos export [book-id]` | Export chapters as a single txt or Markdown file. |

### Scheduling and Daemon

| Command | Description |
| --- | --- |
| `inkos up` | Start the daemon and run writing jobs on schedule. |
| `inkos down` | Stop the daemon. |

Notes:

- `[book-id]` can usually be omitted when the project contains only one book.
- Most read/write and integration commands support `--json` for structured output.
- `book create`, `draft`, and `write next` support `--context` for extra writing guidance.
- `draft` and `write next` support `--words` to override the chapter word target.

## Key Features

### State Snapshots + Chapter Rewrite

Every chapter automatically creates a state snapshot. Use `inkos write rewrite <id> <n>` to roll back and regenerate any chapter — world state, resource ledger, and plot hooks all restore to the pre-chapter state.

### Write Lock

File-based locking prevents concurrent writes to the same book.

### Pre-Write Checklist + Post-Write Settlement

The Writer agent outputs a pre-write checklist before writing (context scope, current resources, pending hooks, conflict overview, risk scan), and a settlement table after writing (resource changes, hook changes). The Auditor cross-validates the settlement table against prose content.

### Pluggable Radar

Radar data sources are pluggable via the `RadarSource` interface. Built-in sources for Tomato Novel and Qidian. Custom data sources or skipping radar entirely are both supported.

### Daemon Mode

`inkos up` starts an autonomous background loop that writes chapters on a schedule. The pipeline runs fully unattended for non-critical issues, but pauses for human review when the auditor flags problems it cannot auto-fix.

### Notifications

Telegram, Feishu, WeCom, and Webhook. In daemon mode, get notified on your phone when a chapter is done or an audit fails. Webhook supports HMAC-SHA256 signing and event filtering.

### External Agent Integration

Atomic commands + `--json` output make InkOS callable by OpenClaw and other AI agents. OpenClaw executes `inkos draft`/`audit`/`revise` via `exec`, reads JSON results, and decides next steps.

## Architecture

```
inkos/
├── packages/
│   ├── core/              # Agent runtime, pipeline, state management
│   │   ├── agents/        # architect, writer, continuity, reviser, radar, ai-tells, post-write-validator, sensitive-words, detector, style-analyzer
│   │   ├── pipeline/      # runner, agent (tool-use), scheduler, detection-runner
│   │   ├── state/         # File-based state manager (7 truth files + snapshots)
│   │   ├── llm/           # OpenAI + Anthropic dual SDK (streaming)
│   │   ├── notify/        # Telegram, Feishu, WeCom, Webhook
│   │   └── models/        # Zod schema validation
│   ├── cli/               # Commander.js CLI and command implementations
│   │   └── commands/      # init, book, write, draft, audit, revise, agent, review, detect, style...
│   └── web/               # Browser studio for review, editing, and command execution
```

TypeScript monorepo managed with pnpm workspaces.

## Roadmap

- [X] Full pipeline (radar → architect → writer → auditor → reviser)
- [X] Canonical truth files + continuity audit
- [X] Built-in writing rule system
- [X] Full CLI command suite
- [X] State snapshots + chapter rewrite
- [X] Daemon mode
- [X] Notifications (Telegram / Feishu / WeCom)
- [X] Atomic commands + JSON output (draft / audit / revise)
- [X] Natural language agent mode (tool-use orchestration)
- [X] Pluggable radar (RadarSource interface)
- [X] External agent integration (OpenClaw, etc.)
- [X] Genre customization + per-book rules (genre CLI + book_rules.md)
- [X] 33-dimension continuity audit (including AI-tell detection + spinoff dims + outline adherence)
- [X] De-AI-ification rules + style fingerprint injection
- [X] Spinoff writing (canon import + 4 audit dimensions + info boundary control)
- [X] Style cloning (statistical fingerprint + LLM style guide + Writer injection)
- [X] Post-write validator (11 hard rules + auto spot-fix)
- [X] Audit-revise loop hardening (AI marker guard + temperature lock)
- [X] Multi-LLM provider (OpenAI + Anthropic + compatible endpoints)
- [X] AIGC detection + anti-detect rewrite pipeline
- [X] Webhook notifications + smart scheduler (quality gates)
- [X] Cross-chapter coherence (chapter summaries + subplot/emotion/character matrices)
- [X] `packages/web` browser studio for review and editing
- [X] Multi-model routing (different models for different agents, `inkos config set-model`)
- [ ] Custom agent plugin system
- [ ] Platform-specific export (Qidian, Tomato, etc.)

## Contributing

Contributions welcome. Open an issue or PR.

```bash
pnpm install
pnpm dev          # Watch mode for all packages
pnpm test         # Run tests
pnpm typecheck    # Type-check without emitting
```

## License

[MIT](LICENSE)
