# Handoff: Phase 1 Frontend — math-to-go 学生学习界面 + 管理后台

## Overview

This package contains the **hi-fi HTML design prototypes** for the math-to-go frontend — an agentic RAG + Knowledge Graph tutoring system for Chinese elementary school students (Grade 4, Term 2, Equations unit).

The prototype covers all four core tutoring use cases (UC-1 through UC-4), a login/auth flow, and a full admin panel for KB management and versioning.

---

## About the Design Files

> ⚠️ **The HTML files in this bundle are design references built as interactive prototypes** — they are NOT production code to be shipped directly. The task is to **recreate these designs in the target codebase** using React 18 + Vite + TypeScript + Tailwind v3 (as specified in `docs/project-scope.md` and PHASE-008). Use the existing patterns, component libraries, and Zustand state management already planned for the project.

The HTML prototypes use:
- React 18 + Babel (in-browser, no build step) — replace with Vite + TSX
- Inline styles as JS objects — replace with Tailwind classes or CSS modules
- `localStorage` for mock auth — replace with real `POST /auth/login`
- `setInterval` simulations for streaming — replace with real SSE from `POST /tutor/run`

---

## Fidelity

**High-fidelity (hifi).** These prototypes are pixel-accurate with final colors, typography, spacing, interactions, animations, and copy. Recreate the UI pixel-precisely using the codebase's existing Tailwind config and component patterns.

---

## Files in This Package

| File | Description |
|------|-------------|
| `Login.html` | Login screen with role selection (student / admin) |
| `Math Tutor.html` | Main student learning interface (all 4 UCs) |
| `Admin Panel.html` | Admin panel (KB management, release pipeline, version control) |
| `components.jsx` | Shared UI components (CurriculumNav, ActionPanel, streaming, ThreeColorNotes, etc.) |
| `components-v2.jsx` | Workflow components (ProblemSetPreview, AnswerSession, GradeConfirmPreview, GradingReport, etc.) |
| `curriculum-data.js` | Full BNU curriculum tree (G1–G6, all units/subtopics) from `bnu_curriculum.yaml` |
| `tweaks-panel.jsx` | Design tweaks panel (dev tool only — do not ship) |

---

## Screens / Views

### 1. Login.html — 登录页

**Purpose:** Role-based login. Students → tutoring UI. Admins → admin panel.

**Layout:**
- Two-column full-viewport split
- Left panel: 380px fixed, `#1865F2` blue background. Contains brand logo, tagline list, footer text
- Right panel: flex-1, `#FFF9F0` warm white background, centered card

**Left panel components:**
- Logo mark: 48×48px, `border-radius: 12px`, `rgba(255,255,255,0.2)` bg, white "数" character, 24px 800 weight
- App name: 22px 800 weight white
- Subtitle: 13px, 70% opacity
- Tagline list: 4 items, 16px 500 weight, 90% opacity, 16px gap
- Footer: 13px, 50% opacity

**Login card:**
- `max-width: 420px`, `border-radius: 16px`, `border: 1.5px solid #EDE8DF`, `padding: 36px 40px`
- `box-shadow: 0 4px 24px rgba(0,0,0,0.06)`

**Role selector (first screen):**
- Two role cards, full-width, `border-radius: 12px`, `border: 1.5px solid #EDE8DF`, `background: #FFF9F0`
- Each has: large emoji icon (28px) + title (16px 700) + subtitle (13px `#7A7167`) + right chevron

**Login form (after role selected):**
- Back button (13px `#1865F2`)
- Role tag badge: `background: #EEF3FF`, `color: #1865F2`, `border-radius: 8px`
- Input fields: `height: 46px`, `border-radius: 10px`, `border: 1.5px solid #DDD8CE`; focus: `border-color: #1865F2`, `box-shadow: 0 0 0 3px rgba(24,101,242,0.12)`
- Submit button: `height: 48px`, `border-radius: 12px`, `background: #1865F2`, 16px 700 white
- Quick-fill chips: `background: #F5F3EF`, `border: 1.5px solid #DDD8CE`, `border-radius: 6px`, 13px

**Auth logic:**
```
POST /auth/login { role, username, password }
→ 200: { user: { id, name, role, grade?, class?, title?, avatar_initial } }
→ student → redirect to /tutor
→ admin   → redirect to /admin
→ 401: show error message inline
```

---

### 2. Math Tutor.html — 学生学习界面

**Overall layout:**
- Full-height flex column: TopNav (60px) + Body (flex row: Sidebar 280px + MainContent flex-1)
- Background: `#FFF9F0`

#### 2a. TopNav (CurriculumNav)

**Height:** 60px, `background: #fff`, `border-bottom: 1px solid #EDE8DF`, `padding: 0 24px`

**Left: UserAvatar (Google Account style)**
- Replaces the old "数" logo
- 36×36px rounded square button, color derived from username hash (palette: `["#1865F2","#16A34A","#D97706","#9333EA","#DC2626","#0891B2"]`)
- Initial character: first Chinese character if name is Chinese, else first uppercase Latin letter
- Click → dropdown panel (260px wide, `border-radius: 14px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.12)`)
- Dropdown contents:
  - User card: 44×44px avatar + name (15px 700) + role/class (12px `#7A7167`) + ID (11px monospace `#9E9589`)
  - Divider
  - Menu items (14px, 40px height): ⚙️ 管理后台 (admin only) / 📊 我的学习记录 / 🔔 通知设置
  - Divider
  - 🔄 切换账户 / 🚪 退出登录
- Close on outside click

**Center: App name** — "数学助手" 16px 700

**Dropdowns (Grade → Term → Unit cascade):**
- Each: `height: 44px`, `border-radius: 8px`, `border: 1.5px solid #DDD8CE`
- Selected state: `border-color: #1865F2`, `background: #FFF9F0`
- Custom chevron (▼), no native appearance
- Cascade: changing Grade resets Term + Unit; changing Term resets Unit
- Data source: `GET /curriculum` → `bnu_curriculum.yaml` (already in repo)

**开始 CTA button:**
- `height: 44px`, `padding: 0 24px`, `border-radius: 8px`
- Active (all 3 selected): `background: #1865F2`, white text
- Disabled: `background: #EDE8DF`, `color: #B0A898`, `cursor: not-allowed`
- Disabled during streaming/grading

#### 2b. Sidebar (280px)

- `background: #fff`, `border-right: 1px solid #EDE8DF`, `padding: 20px 16px`
- Section label: 12px 700 `#9E9589` uppercase, 0.06em letter-spacing

**ActionPanel — 4 radio cards:**

Each card: `border-radius: 12px`, `border: 2px solid #EDE8DF`, `padding: 16px 18px`, pointer cursor
Active card: `border-color: #1865F2`, `box-shadow: 0 0 0 3px rgba(24,101,242,0.10)`, `background: #F5F8FF`

Actions:
| ID | Icon | Title | Description |
|----|------|-------|-------------|
| `review` | 📚 | 请帮我复习 | 生成本单元三色笔记，整理定义、公式与例题 |
| `generate` | 📝 | 请帮我练习 | 按主题生成练习题，可选严格模式 |
| `grade` | 📷 | 请帮我批改 | 上传作业图片，逐题批改并给出解析 |
| `drill` | 💪 | 请帮我夯实 | 艾宾浩斯错题复习，今日应复习题目 |

When `generate` is active, expand inline:
- Count stepper: number input `[1–30]`, default 10
- Subtopic dropdown: from `/curriculum` for selected unit
- Strict mode checkbox: "严格模式（仅从题库选题，不推断生成）"

**GradePanel (when `grade` action selected):**
- Upload zone: dashed border `#C0B8AD`, `border-radius: 12px`, `min-height: 140px`
- Drag state: `border-color: #1865F2`, `background: #F0F5FF`
- Has-file state: solid `#1865F2` border, thumbnail + filename + size
- Accept: `image/jpeg,image/png,image/webp`, single file only
- Warning banner if file > 5MB: `background: #FFF3CD`, `border: 1px solid #F5C842`

**FreeQueryInput (collapsed, bottom of sidebar):**
- Dashed border `#C0B8AD`, collapsed by default
- Label: "高级模式（家长 / 教师专用）"
- Expanded: warning banner + free-text textarea + 发送 button
- Warning: `background: #FFF3CD`, color `#7A5C00`

#### 2c. Main Content Area

**State machine (screen values):**

```
idle → generating → {review_result | problem_preview}
                           ↓
                       answering → grading → graded
                       
grade flow: idle → ocr_running → ocr_confirm → grading → graded
```

**idle screen:**
- Centered placeholder: large emoji (48px, 35% opacity) + description text (16px `#9E9589`)
- Different copy per active action

**generating screen (all actions):**
Three stacked layers:
1. **AgentPipeline** — horizontal step tracker
2. **CoTStream** — collapsible thinking panel
3. **Output area** — shimmer skeleton or streaming HTML

**AgentPipeline component:**
- `background: #F8F5F0`, `border-radius: 12px`, `border: 1.5px solid #EDE8DF`, `padding: 20px 16px 16px`
- Horizontal connecting track: absolute positioned, `top: 36px`, `height: 2px`, `background: #DDD8CE`
- Track fill: animated `width` transition, `background: #1865F2`
- Each step dot: 24×24px circle
  - pending: `background: #DDD8CE`
  - running: `background: #1865F2` + outer ripple animation (`animation: ripple 1.4s ease-out infinite`) + inner white pulse dot
  - done: `background: #1865F2` + white ✓ checkmark SVG
- Step label: 12px, `max-width: 80px`, centered
- Running step: shows result label in 11px `#1865F2` with pulse animation
- Done step: shows result text in 11px `#16A34A`

**Pipeline steps per action:**
```
review:   解析请求 → 向量检索 → 图谱遍历 → 重排序 → 生成笔记
generate: 解析请求 → 题库检索 → 题目生成 → 验证器 → 输出完成
grade_ocr: 接收图片 → 视觉识别 → 结构化
grade_mark: KB匹配 → 逐题批改 → 生成报告
drill:    加载错题 → 艾宾浩斯 → 排序优先 → 题目生成
```

**CoTStream component:**
- `border-radius: 10px`, `border: 1.5px solid #EDE8DF`, `background: #fff`
- Header toggle: shows animated 3-dot thinking indicator (bouncing, staggered 0.2s delay) OR ✓ green when done
- "思考中…" label (14px 600 `#5A5248`) + duration badge when done
- Expanded body: `max-height: 180px`, `overflow-y: auto`, `background: #FAFAF8`
- Text: 13px monospace (`ui-monospace`), `color: #7A7167`, `white-space: pre-wrap`
- Blinking cursor `▋` while streaming (`animation: pulse 0.8s infinite`)
- Auto-collapses when output content starts appearing (length > 50 chars)

**Three-Color Notes output (review_result screen):**
Full-width rich HTML sections, each section is a white card with `border-radius: 12px`:

Section structure per color:
- Left accent bar: 4×22px colored rectangle, `border-radius: 2px`
- Title text: 16px 700
- Accent badge: 12px 700, colored bg, white text, `border-radius: 4px`

Red section (定义·易错点, badge "必背"):
- Quote callout: `border-left: 4px solid #DC2626`, `background: #FFF5F5`, `border-radius: 0 8px 8px 0`
- Two-column comparison: ✓是方程 (green) vs ✗不是方程 (red), each `border-radius: 8px`
- Warning callout: ⚠️ + warning text with `Hi` inline highlights

Blue section (公式·等式性质, badge "核心"):
- Formula code blocks: `background: #1A1A2E`, `color: #E8F4FD`, `border-radius: 8px`, `font-family: 'Courier New'`, `font-size: 14px`, `white-space: pre`
- Two-column bracket rule comparison

Green section (例题·口诀, badge "例题"):
- Horizontal process flow: step boxes with `→` arrows, current step highlighted in green/blue
- Quote callout for word problems with `Hi` inline highlights
- Mnemonic box: `background: #FFFBEB`, `border: 1.5px solid #FDE68A`

**ProblemSetPreview (problem_preview screen — generate/drill):**
- Header card: mode icon + title + subtitle + "开始作答 →" CTA (or score when graded)
- Stats bar (when graded): correct/incorrect/accuracy chips
- Problem card grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`
- Each card: difficulty badge + subtopic badge + truncated question (2 lines) + "预览 ▼" button
- When graded: green/red border + ✓/✗ circle badge replaces number
- Expanded (when graded): student answer + correct answer + solution process in `#F8F5F0` box

**AnswerSession (answering screen):**
Two-pane layout within a single card:

Left nav panel (160px, `background: #F8F5F0`, `border-right: 1px solid #EDE8DF`):
- Back button (← 返回预览)
- Progress: "{answered} / {total} 已答"
- Number grid: 4 columns, each pip 28×28px, `border-radius: 6px`
  - Current: `background: #1865F2`, white, `box-shadow: 0 2px 8px rgba(24,101,242,0.3)`
  - Answered: `background: #DCFCE7`, `color: #16A34A`, `border: 1.5px solid #86EFAC`
  - Empty: `background: #fff`, `color: #9E9589`, `border: 1.5px solid #DDD8CE`
- Legend at bottom

Right answer area (flex-1, `padding: 20px 24px`):
- Question header: "第 N 题" + difficulty badge + subtopic badge
- Question box: `background: #F8F5F0`, `border-radius: 10px`, 17px 500 text
- Answer textarea: `border-radius: 10px`, `border: 1.5px solid #DDD8CE`, 16px, `rows: 7`
  - Placeholder: "一行一个解题步骤，例如：\n第一步：……\n第二步：……\n答：x = ……"
  - Focus: `border-color: #1865F2`
- Navigation bar (pinned to bottom, `border-top: 1px solid #EDE8DF`):
  - 上一题 ← (ghost, hidden on first question)
  - 下一题 → (blue, primary)
  - On last question: replace 下一题 with 交卷 (green `#16A34A`, or orange `#D97706` if unanswered questions remain)
  - 交卷 shows count of unanswered questions when not all answered

**Persist answers:** `localStorage.setItem("mtt_answers", JSON.stringify(answers))` on every change. Restore on mount.

**GradeConfirmPreview (ocr_confirm screen):**
- Header: 📷 icon + "识图结果确认" title + subtitle
- Warning banner: 💡 tip about re-uploading if OCR wrong
- Problem cards with: number badge + confidence indicator (green/orange/red dot) + "查看详情 ▼"
- Expanded: shows "识别到的学生答案" in `#F5F3EF` pill
- Low confidence (<0.7): red warning "建议重新拍照"
- Footer: "重新上传" (ghost) + "识别正确，开始批改 →" (blue primary)

**GradingProgress (grading screen):**
- AgentPipeline for grade_mark steps
- Progress section: label + fraction + progress bar (`height: 6px`, `background: #EDE8DF`)
- Per-problem list: colored dot + "第N题" + status ("批改中…" pulsing, "✓ 完成", "等待中")

**GradingReportV2 (graded screen):**
- Summary header: 📋 icon + title + subtitle + score ring (28px 800 `#16A34A`)
- Stats chips: correct/incorrect/kb_match/inferred counts
- Per-problem cards: green/red background + ✓/✗ badge + source tag (📚 题库 / 🤖 推断)
- Wrong answers: "查看答案与解析 ▼" button in red
- Expanded: correct answer + error explanation (`#FFF9F0` box) + solution process (`#F8F5F0` box)
- Below report: `ProblemSetPreview` with grading overlay

---

### 3. Admin Panel.html — 管理后台

**Overall layout:**
- Full-height: TopBar (56px) + Body (Sidenav 220px + Content flex-1)
- Background: `#F5F3EF`

#### TopBar
- Left: Logo (32×32px `#1865F2`) + "数学助手" 15px 700 + "管理后台" badge (`#F5F3EF` bg, `#9E9589` text)
- Right: "← 学习界面" link (blue, `#EEF3FF` bg) + user avatar + name/title + 退出 link

#### Sidenav (220px, `background: #fff`)
Section labels: 11px 700 `#9E9589` uppercase
Nav items: 14px, `border-radius: 8px`, hover `#F5F3EF`, active `background: #EEF3FF, color: #1865F2`

Sections + items:
- **学生管理:** 👥 学生成长概览
- **知识库:** 📁 文档库管理 / 🚀 KB 发布 / 🏷 版本控制 / 🗺 单元版本映射

#### Page: 学生成长概览

4 stat cards (grid 4-col): 班级平均正确率 / 今日活跃 / 待复习错题 / 平均连续打卡

Student table (full-width card, no padding):
Columns: 学生 | 复习题数 | 掌握题数 | 正确率 | 连续打卡 | 错题数 | 今日待复习 | 最后活跃

- 正确率: mini bar (60px wide, `height: 6px`) + percentage text
  - ≥85%: `#16A34A`; ≥75%: `#D97706`; <75%: `#DC2626`
- 连续打卡: 🔥 orange 700
- 今日待复习: colored pill (orange if >0, gray if 0)
- Row click → expand detail card below with Ebbinghaus distribution

#### Page: 文档库管理

Toolbar: type filter buttons + search input + "＋ 上传文档" primary button

Type filter pill style:
- Active: `border-color: #1865F2`, `background: #EEF3FF`, `color: #1865F2`
- Inactive: `border-color: #DDD8CE`, `background: #fff`

Type color tags:
| Type | Background | Color |
|------|-----------|-------|
| concept | `#EEF3FF` | `#1865F2` |
| heuristic | `#F0FDF4` | `#16A34A` |
| exercise | `#FFFBEB` | `#D97706` |
| mistake | `#FFF5F5` | `#DC2626` |

Table columns: 类型 | 文档 ID (monospace `#5A5248`, `#F5F3EF` bg) | 标题 | 子主题 | 难度 | 版本 (monospace `#1865F2`) | 状态 | 操作

Click row → right side panel (360px) with full frontmatter key/value pairs

Upload panel (collapsible): type selector + file input (.md/.yaml) + confirm button
Delete confirm: modal overlay with red confirm button

**API endpoints needed:**
```
GET    /admin/kb/docs?type=&unit=&search=   → doc list
POST   /admin/kb/docs                        → upload new doc
PUT    /admin/kb/docs/:id                    → replace doc
DELETE /admin/kb/docs/:id                    → delete doc
```

#### Page: KB 发布

Pre-release summary: draft docs list + release config form (version number + commit message)

"🚀 发起 KB Release" primary button → triggers LangGraph pipeline:

**Release pipeline steps:**
```
git add → git commit → git push → PR 审查 → 向量化 → KB Release
```
All 6 steps rendered in `AgentPipeline` component.

Log terminal: `background: #1A1A2E`, monospace 13px, scrollable `max-height: 240px`
Log line format: `[source]` in `#4A90D9` + message in colored text (`#7A7167` info, `#16A34A` success)

**SSE endpoint:**
```
POST /admin/kb/release { version, commit_message }
→ SSE stream:
  data: {"step": "git_add", "status": "running"}
  data: {"step": "git_add", "status": "done", "result": "暂存完成"}
  data: {"log": "[git] Changes staged ✓", "level": "success"}
  ...
  data: {"step": "kb_release", "status": "done", "result": "v0.0.3 发布"}
  data: [DONE]
```

#### Page: 版本控制

Version cards (full-width):
- draft: `border-color: #93C5FD`, `background: #F0F5FF`
- active: `border-color: #86EFAC`, `background: #F0FDF4`
- deprecated: `border-color: #EDE8DF`, `background: #fff`

Each card shows: version code (18px 800) + status badge + change description + author/date/doc count + unit tags + action buttons

Actions:
- draft → "发布此版本" (primary blue)
- active → "当前生产版本" (green label)
- deprecated → "恢复此版本" (ghost)

**API endpoints:**
```
GET  /admin/kb/versions              → version list
POST /admin/kb/versions/:v/promote   → publish draft
POST /admin/kb/versions/:v/rollback  → rollback to version
```

#### Page: 单元版本映射

Version legend chips (3 versions with colored dot + label)

Unit grid: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`

Each unit card shows current version in large monospace (16px 800), card border/bg matches version color:
- v0.0.3: `border: #93C5FD`, `bg: #F0F5FF`, text `#1865F2`
- v0.0.2: `border: #86EFAC`, `bg: #F0FDF4`, text `#16A34A`
- v0.0.1: `border: #DDD8CE`, `bg: #F5F3EF`, text `#7A7167`

"切换" button → inline version picker (available versions as colored buttons)

Summary table at bottom: version → count of units using it

**API endpoints:**
```
GET /admin/kb/unit-versions              → {unit: version} map
PUT /admin/kb/unit-versions/:unit        → { version }
```

---

## Interactions & Behavior

### Navigation Flow
```
Login.html
  ├── student login → Math Tutor.html
  └── admin login  → Admin Panel.html
                          └── "← 学习界面" → Math Tutor.html

Math Tutor.html (UserAvatar menu)
  ├── ⚙️ 管理后台 (admin only) → Admin Panel.html
  ├── 🔄 切换账户 → Login.html (clear localStorage)
  └── 🚪 退出登录 → Login.html (clear localStorage)
```

### Streaming (Math Tutor)
Replace `setInterval` simulations with real SSE:
```typescript
const source = new EventSource(`/tutor/stream?session=${sessionId}`);
source.onmessage = (e) => {
  if (e.data === '[DONE]') { source.close(); setStatus('complete'); return; }
  const chunk = JSON.parse(e.data);
  if (chunk.type === 'pipeline') setPipelineStep(chunk.step);
  if (chunk.type === 'cot')      setCotThoughts(t => t + chunk.text);
  if (chunk.type === 'output')   setOutputContent(c => c + chunk.html);
};
```

### Answer Persistence
```typescript
// Save on every keystroke
useEffect(() => {
  localStorage.setItem('mtt_answers', JSON.stringify(answers));
}, [answers]);

// Restore on mount
const [answers, setAnswers] = useState(() => {
  try { return JSON.parse(localStorage.getItem('mtt_answers') || '{}'); }
  catch { return {}; }
});
```

### Grading Flow (homework)
1. User uploads image → `POST /tutor/grade/ocr { image_base64, grade, term, unit }`
2. Returns OCR results with confidence scores
3. User confirms in `GradeConfirmPreview`
4. `POST /tutor/grade/mark { ocr_results }` → SSE grading stream
5. Results shown in `GradingReportV2`

### Admin KB Release
1. Triggered by `POST /admin/kb/release`
2. Backend runs LangGraph task chain: git add → commit → push → PR → ingest → release
3. Each step emits SSE event: `{ step, status, result?, log? }`
4. Frontend `AgentPipeline` advances per step; log terminal appends lines

---

## State Management (Zustand)

Recommended store slices:

```typescript
// auth.ts
interface AuthStore {
  user: User | null;
  setUser: (u: User) => void;
  logout: () => void;
}

// tutor.ts
interface TutorStore {
  selection: { grade: string; term: string; unit: string };
  activeAction: 'review' | 'generate' | 'grade' | 'drill';
  screen: 'idle' | 'generating' | 'review_result' | 'problem_preview' |
          'answering' | 'grading' | 'graded' | 'ocr_running' | 'ocr_confirm' | 'grade_marking';
  problems: Problem[];
  answers: Record<number, string>;
  gradingResults: GradingResult[] | null;
  pipelineStep: number;
  cotThoughts: string;
  cotDone: boolean;
  outputContent: string;
  // ... actions
}

// admin.ts
interface AdminStore {
  currentPage: 'students' | 'docs' | 'release' | 'versions' | 'vmap';
  docs: KBDoc[];
  versions: KBVersion[];
  unitVersions: UnitVersion[];
  releasePhase: 'idle' | 'running' | 'done';
  pipelineStep: number;
  releaseLog: LogLine[];
}
```

---

## Design Tokens

### Colors
```
Primary blue:      #1865F2
Blue light:        #EEF3FF
Green:             #16A34A
Green light:       #F0FDF4
Orange:            #D97706
Orange light:      #FFFBEB
Red:               #DC2626
Red light:         #FFF5F5
Purple:            #9333EA
Teal:              #0891B2

Page background:   #FFF9F0
Surface white:     #FFFFFF
Sidebar bg:        #F8F5F0
Admin bg:          #F5F3EF
Border:            #EDE8DF
Border mid:        #DDD8CE
Border soft:       #C0B8AD

Text primary:      #1A1A1A
Text secondary:    #5A5248
Text muted:        #7A7167
Text placeholder:  #9E9589

Dark code bg:      #1A1A2E  (formula/log blocks)
Dark code text:    #E8F4FD
```

### Typography
```
Font family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif

Nav title:       16px / 700
Page title:      20px / 800
Card title:      17px / 700
Body:            15–16px / 400–500
Label:           13–14px / 600
Caption/badge:   11–12px / 600–700
Code/monospace:  13–14px / 'Courier New', ui-monospace
```

### Spacing
```
Page padding:      24–32px
Card padding:      16–20px (inner), 24px (content)
Gap between cards: 12–16px
Form field gap:    6px (label→input), 10–16px (between fields)
Sidebar padding:   20px 16px
```

### Border Radius
```
Page cards:      12px
Form inputs:     8–10px
Buttons:         8–12px (primary: 10px, large: 12px)
Badges/tags:     6px
Avatar:          8–10px (square), 50% (circle)
Dots/pips:       50%
```

### Shadows
```
Card default:    none (border only)
Login card:      0 4px 24px rgba(0,0,0,0.06)
Dropdown menu:   0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)
Avatar focus:    0 0 0 3px {color}33
```

### Animations
```css
@keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
@keyframes shimmer { 0%,100%{background:#EDE8DF} 50%{background:#F5F3EF} }
@keyframes fadeIn  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes ripple  { 0%{transform:scale(.8);opacity:.8} 100%{transform:scale(2.2);opacity:0} }
@keyframes thinkDot { 0%,80%,100%{transform:scale(.6);opacity:.4} 40%{transform:scale(1.1);opacity:1} }
```

---

## API Contract Summary

All endpoints under `/api/v1/`. Auth via JWT Bearer token.

### Auth
```
POST /auth/login    { username, password, role }  → { user, token }
POST /auth/logout                                 → 204
GET  /auth/me                                     → { user }
```

### Curriculum
```
GET /curriculum                     → full bnu_curriculum.yaml tree
GET /curriculum/:grade/:term/units  → units for grade+term
GET /curriculum/:grade/:term/:unit/subtopics → subtopics
```

### Tutor (Student)
```
POST /tutor/run     { action, grade, term, unit, subtopic?, count?, strict? }  → SSE
POST /tutor/grade/ocr  { image_base64, grade, term, unit }  → { ocr_results[] }
POST /tutor/grade/mark { ocr_results[] }  → SSE grading stream
```

### Admin — KB Docs
```
GET    /admin/kb/docs           → KBDoc[]
POST   /admin/kb/docs           → KBDoc (multipart/form-data)
PUT    /admin/kb/docs/:id       → KBDoc (replace file)
DELETE /admin/kb/docs/:id       → 204
```

### Admin — Versions
```
GET  /admin/kb/versions              → KBVersion[]
POST /admin/kb/release               → SSE (pipeline stream)
POST /admin/kb/versions/:v/promote   → KBVersion
POST /admin/kb/versions/:v/rollback  → KBVersion
GET  /admin/kb/unit-versions         → { unit: version }
PUT  /admin/kb/unit-versions/:unit   → { version }
```

### Admin — Students
```
GET /admin/students             → Student[]
GET /admin/students/:id/stats   → StudentStats
```

---

## Assets

- **Font:** Noto Sans SC (Google Fonts) — already referenced in prototypes
- **Icons:** All icons are Unicode emoji — no icon library needed
- **Images:** No images in this design — placeholder `URL.createObjectURL()` for upload preview
- **Curriculum data:** `knowledge_base/curriculum/bnu_curriculum.yaml` — serve via `GET /curriculum`

---

## Target Implementation Environment

Per `docs/project-scope.md` and PHASE-008:
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS v3
- **State:** Zustand
- **HTTP/SSE:** native `fetch` + `EventSource`
- **Frontend port:** 5173 (dev), served by Nginx (prod)
- **Backend:** FastAPI + `sse-starlette`

Frontend root: `math-to-go/frontend/src/` (currently empty — scaffold from scratch)

Suggested folder structure:
```
frontend/src/
  components/
    nav/          CurriculumNav, UserAvatar
    actions/      ActionPanel, GradePanel
    pipeline/     AgentPipeline, CoTStream
    notes/        ThreeColorNotes (+ sub-components)
    problems/     ProblemSetPreview, AnswerSession
    grading/      GradeConfirmPreview, GradingProgress, GradingReportV2
    admin/        KBDocManager, KBReleasePipeline, KBVersionControl, KBVersionMap
    shared/       StudentOverview
  pages/
    Login.tsx
    Tutor.tsx
    Admin.tsx
  stores/
    auth.ts
    tutor.ts
    admin.ts
  hooks/
    useSSE.ts
    useCurriculum.ts
  types/
    index.ts
```

---

## Notes for Implementer

1. **Start with PHASE-008** per the phase plan — UI is gated on PHASE-004 through PHASE-007 (backend agents)
2. **Mock the SSE endpoints first** using the same chunk patterns shown in the prototype's `REVIEW_CHUNKS` and `PIPELINE_STEPS` arrays — this lets UI development proceed independently
3. **The `bnu_curriculum.yaml` must be served** via `GET /curriculum` at startup — the dropdowns depend on it entirely
4. **CoT streaming** depends on LangGraph's `astream_events` API — the `on_chain_stream` events with `metadata.langgraph_node` tell the frontend which pipeline step is running
5. **Three-Color Notes HTML** is generated by the backend (Claude output) and injected via `dangerouslySetInnerHTML` / `v-html` — the frontend does not generate this content
6. **Admin KB Release pipeline** maps 1:1 to a LangGraph `StateGraph` with 6 nodes; each node emits an SSE event when it starts and completes
7. **Version control** in the prototype is UI-only mock — real implementation needs git operations via `gitpython` or subprocess calls in the backend release agent
