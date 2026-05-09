# math-to-go 项目本体词汇表（Ontology Glossary）

> **用途**：前端设计（Claude Design）、后端开发、KB 建设、API 设计共用同一份本体定义，消除语义漂移。
>
> **规范**：
> - 代码/API/KB 字段名：使用**英文标识符**（下划线分隔）
> - 用户界面标签：使用**中文**，以表格「UI 标签」列为准
> - 如一个概念有多种中文说法，本表选定唯一正式用法，其他列为禁用词

---

## 1. 课程体系（Curriculum）

| 英文标识符 | UI 标签 | 定义 | 禁用词（勿混用）|
|-----------|--------|------|--------------|
| `grade` | 年级 | 小学学年，范围 1–6，对应 G1–G6。 | 学年、年度 |
| `term` | 学期 | 上册（T1）或下册（T2）。 | 册、学期号 |
| `unit` | 单元 | 一册教材中的教学单元，使用 YAML 中的 `unit_id`（如 `equations`）。 | 章、章节、课 |
| `subtopic` | 知识点主题 | 单元内的细分主题，是练习题生成和检索的最细粒度过滤维度。值与 `bnu_curriculum.yaml` 中 `subtopic.id` 一致（如 `remove_brackets`）。 | 知识点、考点、小节 |
| `curriculum_tree` | 课程树 | Grade → Term → Unit → Subtopic 四级层级结构，存储于 `knowledge_base/curriculum/bnu_curriculum.yaml`，通过 `GET /curriculum` 提供给前端。 | 课程表、知识体系 |
| `unit_name` | 单元名称 | 单元的中文显示名称，如"认识方程"。仅用于 UI 展示，不参与检索逻辑。 | — |
| `subtopic_name` | 知识点名称 | 知识点主题的中文显示名称，如"去括号"。仅用于 UI 展示。 | — |

---

## 2. 四种用例（Use Cases）

每个用例有三个名字：**action 值**（API 参数）、**UI 标签**（面板标题）、**组件名**（前端代码）。三者严格对应，不可混用。

| API `action` 值 | 前端 `activeAction` 值 | UI 标签 | 侧边栏面板 | 简述 |
|----------------|----------------------|--------|---------|------|
| `review` | `review` | 📚 复习 | `ActionPanel`（无额外展开）| 生成本单元三色笔记 HTML |
| `generate` | `generate` | 📝 练习 | `GeneratePanel`（内联展开）| 生成练习题（严格模式或推断模式）|
| `grade` | `grade` | 📷 批改 | `GradePanel` | 上传作业图片，两步批改流程 |
| `mistake_practice` | `drill` | 💪 夯实 | `ActionPanel`（无额外展开）| 从错题本按艾宾浩斯计划练习 |

> **注意**：UC-4 的 API `action` 值是 `mistake_practice`；前端 Zustand store 的 `activeAction` 值是 `drill`（来自设计稿）。
> 前端提交时须做映射：`drill` → 发送 `action: "mistake_practice"`。
> 禁止在 API / KB 字段中出现 "drill"；禁止在前端 store 中出现 "mistake_practice"。

---

## 3. 结构化请求（Structured Request）

前端向后端发送 JSON，字段名定义如下：

| 字段名 | 类型 | 必须 | 说明 |
|--------|------|------|------|
| `action` | string | ✅ | 四种用例之一：`review` / `generate` / `grade` / `mistake_practice` |
| `grade` | int | ✅ | 年级，1–6 |
| `term` | int | ✅ | 学期，1 或 2 |
| `unit` | string | ✅ | 单元 ID，如 `equations` |
| `subtopic` | string | UC-2 必须 | 知识点主题 ID，如 `remove_brackets` |
| `count` | int | UC-2 必须 | 生成题目数量，默认 10，上限 20 |
| `strict` | bool | 否 | 是否启用严格模式，默认 `false` |
| `image_base64` | string | UC-3 必须 | 作业图片 base64 编码（JPEG/PNG/WEBP）|

禁止字段：`query`（自由文本）、`text`、`message`、`prompt`——这些仅在高级模式自由提问中使用，不属于主流程。

---

## 4. 知识库（Knowledge Base / KB）

### 4.1 文档类型

| 英文标识符 | UI / 场景标签 | `knowledge_type` 值 | 定义 | 禁用词 |
|-----------|-------------|-------------------|------|-------|
| Concept | 概念 | `concept` | 定义、定理、性质的陈述性知识。 | 理论、知识点文档 |
| Heuristic | 解题技巧 | `heuristic` | 解题策略、记忆口诀、思路方法。 | 方法、技巧、窍门 |
| Exercise | 练习题 | `exercise` | 有题干、答案、解析的数学题，来源于教材/社交媒体/竞赛等。 | 习题、例题、题目文档 |
| Mistake | 错题 | `mistake` | 学生在作业/练习/考试中犯过的具体错误，携带艾宾浩斯复习元数据。 | 错误、错题集、错误记录 |

### 4.2 检索语料库

| 英文标识符 | 包含文档类型 | 用于哪些用例 |
|-----------|------------|------------|
| `knowledge` corpus | concept + heuristic | UC-1 复习 |
| `practice` corpus | exercise + mistake | UC-2 练习题生成、UC-3 作业批改（题目匹配）|
| mistake-only（`practice` corpus 的子集）| mistake | UC-4 夯实（艾宾浩斯调度器过滤）|

### 4.3 doc_id 命名规则

```
{TYPE}.G{grade}T{term}.{UNIT}.{SEQ:03d}

TYPE    = CONCEPT | HEUR | EX | MISTAKE
grade   = 数字，如 4
term    = 数字，如 2
UNIT    = 单元缩写大写，如 EQ（equations）
SEQ     = 三位序号，从 001 开始

示例：
  CONCEPT.G4T2.EQ.001   ← 四年级下册方程单元第1个概念文档
  EX.G4T2.EQ.015        ← 同单元第15道练习题
  MISTAKE.G4T2.EQ.003   ← 同单元第3条错题记录
```

---

## 5. 题目与答案（Problem & Answer）

| 英文标识符 | 中文 | 定义 | 禁用词 |
|-----------|------|------|-------|
| `problem` | 题目 | 一道数学题，包含题干（`problem_text`）。 | 问题、题、question |
| `problem_text` | 题干 | 题目的文字描述，不含答案。 | 题面、题干文本 |
| `answer` | 答案 | 题目的正确结果（最终值或结论）。 | 结果、正确答案 |
| `solution` | 解题过程 | 从题目到答案的完整步骤。 | 解析、详解、过程 |
| `student_answer` | 学生作答 | 由 Claude Vision 从作业图片中识别出的学生所写答案。 | 学生答案、答题结果 |
| `difficulty` | 难度 | `easy` / `medium` / `hard`，KB 文档的固有属性。 | 难易程度、等级 |

---

## 6. 批改（Grading）

| 英文标识符 | 中文 | 定义 | 禁用词 |
|-----------|------|------|-------|
| `grading_report` | 批改报告 | UC-3 的输出，包含每题的批改结果列表。 | 批改结果、评分报告、批阅 |
| `grading_item` | 批改条目 | 批改报告中的单题批改记录。 | 批改项 |
| `is_correct` | 是否正确 | boolean，`true` 表示学生作答与正确答案一致。 | 对错、正确性 |
| `source` | 来源标注 | 每条批改条目必须标注来源：`kb_match`（题库命中）或 `inferred`（LLM 推断）。| 来源、依据 |
| `kb_match` | 题库命中 | 在 KB practice corpus 中找到相同或相似题目，答案来源于 KB。 | 匹配、已有题目 |
| `inferred` | 推断批改 | KB 中无对应题目，由 LLM 推理得出批改结论。 | AI批改、智能批改 |
| `feedback` | 解析 | 批改条目中面向学生的中文解释，语气友好，说明错在哪里及正确做法。 | 点评、评语、解析 |
| `low_confidence` | 低置信度 | 图片质量太低导致 Claude Vision 无法可靠识别时的状态，触发重拍提示。 | 识别失败 |

---

## 7. 艾宾浩斯复习（Ebbinghaus Spaced Repetition）

所有字段存储在 Mistake 文档的 YAML frontmatter 中。

| 字段名 | 中文 | 类型 | 定义 |
|--------|------|------|------|
| `review_count` | 复习次数 | int | 该错题被练习的累计次数（含本次）。 |
| `ebbinghaus_interval` | 复习间隔（天）| int | 当前阶段到下次复习的天数，序列为 1→2→4→7→15→30。 |
| `last_review_date` | 上次复习日期 | ISO date | 最近一次完成练习的日期。 |
| `next_review_date` | 下次复习日期 | ISO date | 系统计算的下次应复习日期，= last_review_date + ebbinghaus_interval。 |
| `mastered` | 已掌握 | bool | 连续答对 `MASTERY_THRESHOLD` 次后置为 `true`，不再进入复习队列。 |
| `MASTERY_THRESHOLD` | 掌握阈值 | int | 连续答对多少次视为掌握，默认 3，可在 `.env` 中配置。 |
| `due_today` | 今日待复习 | — | 查询条件：`next_review_date ≤ 今日 AND mastered = false`，不是存储字段。 |
| `session` | 练习会话 | — | UC-4 的一次完整练习过程，从开始到结束汇总。不存储，仅存在于运行时。 |

---

## 8. 输出格式（Output Formats）

| 英文标识符 | UI 标签 | 对应用例 | 定义 |
|-----------|--------|---------|------|
| `three_color_notes` | 三色笔记 | UC-1 | LLM 生成的 HTML，红色=关键定义/易错点，蓝色=公式/规则，绿色=例题/口诀。可在浏览器打印为 PDF。 |
| `problem_set` | 题目列表 | UC-2 | 带序号的题目列表 + 折叠答案区，含难度标签。 |
| `grading_report` | 批改报告 | UC-3 | 见第 6 节。 |
| `session_summary` | 练习汇总 | UC-4 | 会话结束后显示：本次复习 N 题 / 掌握 M 题 / 明日待复习 K 题。 |
| `streaming_output` | 流式输出 | 全部 | 所有用例的响应均通过 SSE 流式传输，前端逐 token 渲染。 |

---

## 9. 前端组件（Frontend Components）

前端代码中的组件名与本表一一对应，不得使用同义替换名。
设计规范详见 `frontend/design/README.md`（像素级布局）。

### 全局 / 布局

| 组件名 | 层级 | 对应页面 | 职责 |
|--------|------|---------|------|
| `LoginPage` | 页面 | Login | 角色选择卡 + 登录表单，`POST /auth/login` 后按角色跳转。 |
| `CurriculumNav` | 顶栏 | Tutor | 60px TopNav：UserAvatar + 应用标题 + Grade/Term/Unit 联动 + 「开始」CTA。 |
| `UserAvatar` | 顶栏 | Tutor | 名称哈希配色头像按钮 + 下拉菜单（管理后台入口、切换账户、退出）。 |

### 侧边栏（Tutor 页）

| 组件名 | 层级 | 对应用例 | 职责 |
|--------|------|---------|------|
| `ActionPanel` | 侧边栏 | 全部 | 四个用例 radio 卡片（复习/练习/批改/夯实），每次仅激活一个。 |
| `GeneratePanel` | 侧边栏（展开） | UC-2 | `ActionPanel` 内联展开：题目数步进器 + 主题下拉 + 严格模式开关。 |
| `GradePanel` | 侧边栏 | UC-3 | 拖拽/点击上传区，缩略图预览，>5MB 警告横幅。 |
| `FreeQueryInput` | 侧边栏底部 | 全部 | 折叠「高级模式」区（家长/教师专用），默认收起。 |

### 流式基础设施

| 组件名 | 层级 | 对应用例 | 职责 |
|--------|------|---------|------|
| `AgentPipeline` | 输出区顶部 | 全部 generating | 横向步骤追踪器：pending/running（涟漪动画）/done（✓）三态。UC-1/2/3/4/9 各有不同步骤数组。 |
| `CoTStream` | 输出区 | 全部 generating | 可折叠思考面板：弹跳三点动画、等宽字体滚动、输出内容到达后自动收起。 |

### UC-1 输出

| 组件名 | 对应用例 | 职责 |
|--------|---------|------|
| `ThreeColorNotes` | UC-1 | 三色笔记 HTML 渲染（`dangerouslySetInnerHTML`）+ 打印按钮（`@media print`）。 |

### UC-2 / UC-4 输出（共用）

| 组件名 | 对应用例 | 职责 |
|--------|---------|------|
| `ProblemSetPreview` | UC-2 / UC-4 | 题目卡片网格（难度徽章 + 「预览 ▼」），批改后叠加 ✓/✗ 状态和答案展开区。 |
| `AnswerSession` | UC-2 / UC-4 | 双栏答题工作区：左侧题号导航方格 + 右侧作答文本框 + 上/下题 + 交卷按钮。 |
| `GradingReport` | UC-2 / UC-3 / UC-4 | 逐题批改卡（✓/✗ + 来源标注 `📚 题库` / `🤖 推断` + 折叠解析）。 |

### UC-3 输出（批改专有流程）

| 组件名 | 对应用例 | 职责 |
|--------|---------|------|
| `GradeConfirmPreview` | UC-3 步骤1 | OCR 识别结果确认，含置信度指示器（≥0.7 绿，<0.7 红），低置信度建议重拍。 |
| `GradingProgress` | UC-3 步骤2 | `AgentPipeline` + 批改进度条 + 逐题状态列表（等待中 / 批改中 / ✓ 完成）。 |

### UC-4 输出

| 组件名 | 对应用例 | 职责 |
|--------|---------|------|
| `SessionSummary` | UC-4 | 练习结束汇总卡：本次复习 N 题 / 掌握 M 题 / 明日待复习 K 题。 |

### 管理后台（Admin，PHASE-009）

| 组件名 | 职责 |
|--------|------|
| `StudentOverview` | 班级统计卡片（4指标）+ 学生表格（正确率迷你条形图）+ 行展开 Ebbinghaus 分布。 |
| `KBDocManager` | 文档列表（类型筛选 + 搜索 + 上传）+ 右侧 frontmatter 详情面板 + 删除确认弹窗。 |
| `KBReleasePipeline` | 发布摘要 + 版本号/commit message 表单 + `AgentPipeline`（6步）+ 日志终端（暗色）。 |
| `KBVersionControl` | 版本卡片列表（draft/active/deprecated 三态）+ 发布/恢复操作。 |
| `KBVersionMap` | 单元版本映射网格 + 「切换」内联选择器 + 汇总表。 |

---

## 10. 生成模式（Generate Modes）

| 英文标识符 | UI 标签 | 定义 |
|-----------|--------|------|
| `strict` mode | 严格模式 | 仅从 KB `practice` corpus 中返回已有题目，不由 LLM 生成新题。参数：`"strict": true`。 |
| inference mode | 推断模式（默认）| LLM 仿照 KB 样例生成新题，经 Verifier 验证可解后返回。参数：`"strict": false`。 |
| `verifier` | 验证器 | inference mode 中的质量门控节点，验证 LLM 生成的题目是否有唯一确定解。 |

---

## 11. 检索技术术语（Retrieval）

> 本节供后端开发参考，前端设计无需关心。

| 英文标识符 | 中文 | 定义 |
|-----------|------|------|
| `hybrid_retrieval` | 混合检索 | BGE-M3 dense + sparse 双路并行，RRF 融合排序，reranker 精排。 |
| `dense_retrieval` | 语义检索 | BGE-M3 dense 模式，基于语义相似度的向量检索。 |
| `sparse_retrieval` | 词法检索 | BGE-M3 sparse 模式，基于词法加权的稀疏向量检索，替代传统 BM25。 |
| `colbert_match` | 精确题目匹配 | BGE-M3 ColBERT（多向量）模式，用于 UC-3 中从图片识别的题干与 KB 题目的精确匹配。 |
| `rrf` | 倒数排名融合 | Reciprocal Rank Fusion，合并 dense 和 sparse 两路检索排名的算法。 |
| `reranker` | 精排模型 | BAAI/bge-reranker-v2-m3，对候选文档做交叉编码精排，输出最终 top-k。 |
| `graph_retrieval` | 图谱检索 | 在 Neo4j 中执行 Cypher 查询，获取先决条件链、关联概念、常见错误等结构化知识，补充向量检索的上下文。 |
| `retrieval_context` | 检索上下文 | 向量检索 + 图谱检索结果的合并输出，作为 LLM 综合生成的输入。 |

---

## 12. 消歧义速查（Disambiguation）

> **开发/设计时如果拿不准该用哪个词，查这一节。**

| ❌ 禁用 / 含糊 | ✅ 正式用法 | 说明 |
|-------------|-----------|------|
| 问题 | 题目（`problem`）| "问题"在中文中歧义大，项目中数学题统一叫"题目"。 |
| 习题、例题 | 练习题（`exercise`）| KB 文档类型统一用 `exercise`。 |
| 错题集、错题库 | 错题（`mistake`）/ 错题本 | `mistake` 是 KB 文档类型；"错题本"是对用户的 UI 描述。 |
| 评分、打分、评阅 | 批改（`grade`/`grading`）| 强调"改正"而非"打分"，符合小学场景。 |
| 巩固、强化 | 夯实（UC-4 UI 标签）/ `mistake_practice`（代码）| 两者严格对应，禁止混用。 |
| 章、章节、课 | 单元（`unit`）| 北师大版以"单元"为划分，不叫章或课。 |
| 知识点（泛指）| 视上下文区分：单元下的某个知识点主题 → `subtopic`；某个概念文档 → `concept` | "知识点"一词在不同上下文含义不同，使用前请明确指向。 |
| 题目数量、题数 | `count`（API 参数）/ 题目数量（UI 标签）| 统一，不用 number、amount。 |
| 智能批改、AI批改 | 推断批改（`inferred`）| 准确描述来源，避免夸大 AI 能力。 |
| 答题 | 作答（`student_answer`）| "答题"动词、"作答"名词，UI/字段名用"作答"。 |
| 三色笔记、三色Note | 三色笔记（`three_color_notes`）| 统一中文 UI 标签和英文标识符。 |
| 学期上/下 | 上册（T1）/ 下册（T2）| 北师大版用"上册/下册"，不用"上学期/下学期"。 |
| `drill`（API 参数）| `activeAction: 'drill'`（前端 store）→ 发送 `action: 'mistake_practice'`（API）| `drill` 仅在前端 store 中使用，API 层必须用 `mistake_practice`。 |
| `ProblemSet` | `ProblemSetPreview` | 设计稿中组件名已更新，含答案预览叠加态，旧名 `ProblemSet` 废弃。 |
| `MistakeDrill` | `AnswerSession` + `ProblemSetPreview` | 答题工作区由 `AnswerSession` 承担（UC-2/4 共用），旧名 `MistakeDrill` 废弃。 |
| `StreamingOutput` | `AgentPipeline` + `CoTStream` + 输出区 | 流式输出已拆分为三层组件，不再有单一 `StreamingOutput` 容器。 |
| `GradingReport`（简版）| `GradingReport`（含 GradeConfirmPreview + GradingProgress 前置流程）| UC-3 批改为两步流程：先 OCR 确认，再批改，最终报告仍叫 `GradingReport`。 |

---

## 13. 需求流程词汇（Harness Process Terms）

> **机器可读来源：`harness/req-constants.sh`**（`check-req-coverage.sh` 从该文件 source 枚举值）。
> 下表为人类可读摘要；新增状态或角色时，**先改 `req-constants.sh`，再改本表和 `requirement-standard.md`**，防止三处漂移。

### REQ `status` 枚举值

| 值 | Owner（frontmatter） | 含义 |
|----|----------------------|------|
| `draft` | `human-001` | 需求草稿，尚未进入 agent 工作流 |
| `req_review` | `optimizer-001` ↔ `evaluator-001` | Optimizer 设计需求文本，Evaluator 审核，迭代直到通过 |
| `tc_design` | `evaluator-001` | Evaluator 编写测试用例文本（TC 文件）|
| `tc_review` | `optimizer-001` ↔ `evaluator-001` | Optimizer 审核 TC 文本，迭代直到通过 |
| `tc_impl` | `optimizer-001` | Optimizer 实现测试代码 |
| `tc_impl_review` | `evaluator-001` | Evaluator 审核测试代码，通过则进入 `req_impl` |
| `req_impl` | `optimizer-001` | Optimizer 实现需求 |
| `req_impl_review` | `evaluator-001` | Evaluator 在 Optimizer 开的 draft PR 上做审查，通过则 `gh pr ready` 进入 `pr_draft` |
| `pr_draft` | `human-001` | Optimizer 在 T12 已开 draft PR；Evaluator 审查通过（T13）后转 ready；Human 合并 |
| `done` | — | PR 已合并，所有关联 bug 已关闭 |
| `blocked` | `unassigned` | 外部阻塞或升级，等待 Human 解除 |

### REQ `owner` 枚举值

> **机器可读来源：`harness/agent-registry.yml`**。`harness/req-constants.sh` 在运行时从注册表动态派生有效 UID 列表；下表为人类可读摘要。新增 agent 时只需更新注册表文件，无需修改脚本或本表。

| 值 | 角色 | 含义 |
|----|------|------|
| `optimizer-001` | optimizer | Claude Code 当前负责（需求设计、实现）|
| `evaluator-001` | evaluator | Codex 当前负责（需求审核、TC 设计、代码审查）|
| `human-001` | human | 人工（Daniel）当前负责（范围审批、合并）|
| `unassigned` | — | 未分配（`draft` 和 `blocked` 状态时允许）|

### REQ `tc_policy` 枚举值

| 值 | 含义 |
|----|------|
| `required` | 必须有测试用例（默认）|
| `optional` | 建议但非强制 |
| `exempt` | 明确豁免，须填写 `tc_exempt_reason` |

### BUG `status` 枚举值

| 值 | 含义 |
|----|------|
| `open` | 已发现，待处理 |
| `in_progress` | 正在修复 |
| `blocked` | 有外部依赖阻塞 |
| `resolved` | 代码已修复，待验证 |
| `closed` | 修复验证通过 |
