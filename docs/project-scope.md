# math-to-go — Project Scope

## Overview

**math-to-go** is an agentic RAG + Knowledge Graph tutoring system for Chinese elementary school students. It combines hybrid vector retrieval (BGE-M3), a Neo4j concept knowledge graph, and Claude claude-sonnet-4-6 to deliver four core tutoring workflows: knowledge review, exercise generation, homework grading, and spaced-repetition mistake practice.

**Initial scope:** Chinese Elementary Grade 4 Term 2 — Equations Unit (方程)
**Scalability target:** Any grade/term/subject via the hierarchical KB doc_id scheme

---

## Use Cases

### UC-1 知识点复习 (Knowledge Review)

**用户操作：**
1. 顶部导航选择 `[ 四年级 ]` → `[ 下册 ]` → `[ 第五单元：认识方程 ]`
2. 勾选 `📚 请帮我复习` → `☑ 复习本单元知识点`
3. 点击「开始」

**前端向后端发送结构化参数（非自由文本）：**
```json
{ "action": "review", "grade": 4, "term": 2, "unit": "equations" }
```

**Pipeline:**
1. 后端接收结构化 action，直接进入检索节点（无需意图分类）
2. Hybrid retrieval: BGE-M3 dense + sparse，过滤 `knowledge` corpus（concept + heuristic），按 grade/term/unit 筛选
3. Graph traversal: Neo4j 查询先决条件链 + 关联概念
4. LLM 综合检索内容生成 **三色笔记 HTML**
   - 红色：关键定义/易错点
   - 蓝色：公式/规则/性质
   - 绿色：例题/口诀/记忆技巧
5. SSE 流式返回，前端渲染 HTML，支持打印/导出 PDF

**Constraints:** 笔记内容必须忠实反映 KB 内容，不能幻构规则。

---

### UC-2 练习题生成 (Exercise Generation)

**用户操作：**
1. 顶部导航锁定单元（同 UC-1）
2. 勾选 `📝 请帮我练习` → 填写题目数量 `[ 10 ]`，选择主题 `[ 去括号 ▼ ]`
3. 可选勾选 `☐ 严格模式（仅从题库选题）`
4. 点击「开始」

**前端向后端发送结构化参数：**
```json
{ "action": "generate", "grade": 4, "term": 2, "unit": "equations",
  "subtopic": "remove_brackets", "count": 10, "strict": false }
```

**Pipeline:**
1. 后端接收结构化参数，subtopic 直接作为检索过滤器
2. Hybrid retrieval from `practice` corpus，按 subtopic 过滤
3. **Strict mode**（`strict: true`）：从 KB 直接返回现有题目，不生成新题
4. **Inference mode**（`strict: false`，默认）：LLM 仿照 KB 样例生成新题
5. **Verifier step**：生成题目回传 LLM 确认可解性，不通过则重试（最多3次）
6. 输出：带序号的题目列表 + 难度标签 + 折叠答案区

**Constraints:** 验证器必须确认每题有唯一确定解后才返回给用户。

---

### UC-3 作业批改 (Homework Grading)

**用户操作：**
1. 顶部导航锁定单元（可选，不锁定则全库匹配）
2. 勾选 `📷 请帮我批改`
3. 拖拽或点击上传作业图片（支持 JPEG/PNG/WEBP，单张）
4. 点击「开始批改」

**前端向后端发送：**
```json
{ "action": "grade", "grade": 4, "term": 2, "unit": "equations",
  "image_base64": "..." }
```

**Pipeline:**
1. 后端接收结构化参数 + 图片，直接进入批改节点
2. Claude Vision 识别图片中的题目列表和学生答案
3. BGE-M3 ColBERT 模式匹配 KB `practice` corpus
4. **KB 命中**（相似度 ≥ 阈值）：召回标准答案，对比批改
5. **KB 未命中**：LLM 推断批改，报告标注 `source: inferred`
6. 低置信度图片（模糊/倾斜）返回"请重新拍照"提示

**Output:** 每题批改卡：✓/✗ + 正确答案 + 中文学生友好解释 + 来源标注（`kb_match` / `inferred`）

**Constraints:** 必须区分「KB 命中批改」与「LLM 推断批改」。

---

### UC-4 错题练习 + 艾宾浩斯 (Mistake Practice with Spaced Repetition)

**用户操作：**
1. 顶部导航锁定单元（同 UC-1）
2. 勾选 `💪 请帮我夯实` → `☑ 从错题本生成今日艾宾浩斯复习题`
3. 点击「开始练习」

**前端向后端发送结构化参数：**
```json
{ "action": "mistake_practice", "grade": 4, "term": 2, "unit": "equations" }
```

**Pipeline:**
1. 后端接收结构化参数，直接进入错题训练节点
2. Ebbinghaus 调度器过滤 `next_review_date ≤ today` 的 mistake 文档
3. 交互式练习：逐题呈现 → 前端渲染题目 → 用户作答 → 比对 → 更新 frontmatter
   - 更新字段：`review_count`, `last_review_date`, `next_review_date`, `ebbinghaus_interval`
4. 连续答对 `MASTERY_THRESHOLD` 次（默认3次）后标记 `mastered: true`
5. 练习结束输出会话汇总

**Ebbinghaus intervals:** 1 → 2 → 4 → 7 → 15 → 30 天

---

## Knowledge Base Structure

### Doc ID Scheme

```
{TYPE}.G{grade}T{term}.{UNIT}.{SEQ:03d}
```

Examples:
- `CONCEPT.G4T2.EQ.001` — equation definition
- `HEUR.G4T2.EQ.002` — balance-scale mental model jingle
- `EX.G4T2.EQ.015` — bracket removal exercise
- `MISTAKE.G4T2.EQ.003` — sign error when removing brackets

### Knowledge Types

| Type | Directory | Purpose |
|------|-----------|---------|
| `concept` | `knowledge_base/docs/concept/` | Definitions, properties, theorems |
| `heuristic` | `knowledge_base/docs/heuristic/` | Problem-solving strategies, jingles (口诀), mnemonics |
| `exercise` | `knowledge_base/docs/exercise/` | Practice problems sourced from social media / textbooks |
| `mistake` | `knowledge_base/docs/mistake/` | Error patterns from homework/exams with Ebbinghaus metadata |

### YAML Frontmatter Schema

**All KB docs:**
```yaml
---
doc_id: CONCEPT.G4T2.EQ.001
knowledge_type: concept             # concept | heuristic | exercise | mistake
grade: 4
term: 2
subject: math
unit: equations                     # equations | fractions | geometry | ...
subtopic: equation_definition       # e.g. remove_brackets | solve_basic | word_problems
difficulty: easy                    # easy | medium | hard
source: textbook                    # textbook | social_media | homework | exam
tags: [equation, variable, balance]
verified: true
---
```

**Mistake docs additionally:**
```yaml
review_count: 0
last_review_date: null
next_review_date: 2026-05-03        # ISO date — today on creation
ebbinghaus_interval: 1              # days to next review
mastered: false
```

### Retrieval Corpora

| Corpus | Doc Types | Use Cases |
|--------|-----------|-----------|
| `knowledge` | concept + heuristic | UC-1 (review), UC-4 (context for drill) |
| `practice` | exercise + mistake | UC-2 (generation source), UC-3 (answer lookup) |

---

## Neo4j Knowledge Graph

### Node Types

| Label | Key Properties | Purpose |
|-------|---------------|---------|
| `Topic` | id, name, grade, term | Top-level curriculum unit |
| `Concept` | id, name, description | Knowledge point |
| `Skill` | id, name, description | Problem-solving skill |
| `Problem` | doc_id, difficulty, subtopic | Links to KB exercise doc |
| `Mistake` | doc_id, pattern, misconception | Links to KB mistake doc |

### Relationships

| Relationship | From → To | Meaning |
|-------------|-----------|---------|
| `BELONGS_TO` | Concept → Topic | Concept is part of this topic |
| `PREREQUISITE_OF` | Concept → Concept | Must understand A before B |
| `APPLIES_TO` | Skill → Concept | Skill is used to solve this concept |
| `TESTS_SKILL` | Problem → Skill | Problem exercises this skill |
| `STEMS_FROM` | Mistake → Concept | Error originates from misconception of concept |
| `COMMON_IN` | Mistake → Problem | Error pattern appears in this type of problem |

### Graph-Enabled Queries

- "What do I need to know before learning to solve bracket equations?" → `PREREQUISITE_OF` chain
- "What mistakes are students most likely to make on this concept?" → `STEMS_FROM` + `COMMON_IN`
- "What problems practice the balance-scale skill?" → `TESTS_SKILL` traversal

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| LLM | Claude claude-sonnet-4-6 | 200K ctx, native vision, Chinese proficiency |
| Agent Framework | LangGraph 0.2+ | StateGraph, conditional edges, astream_events |
| Embedding | BAAI/bge-m3 | 8192 tok; dense + sparse + ColBERT |
| Reranker | BAAI/bge-reranker-v2-m3 | Cross-encoder, BGE family synergy |
| Vector DB (dev) | ChromaDB 0.5+ | Zero-config, SQLite-backed |
| Vector DB (prod) | Qdrant | Distributed, supports hybrid retrieval |
| Retrieval Fusion | RRF | Combines BGE-M3 dense + sparse scores |
| Knowledge Graph | Neo4j Community Edition 5.x | Cypher, LangChain GraphRetriever |
| Graph Client | langchain-neo4j | GraphCypherQAChain integration |
| Backend | FastAPI + Uvicorn + sse-starlette | Async SSE streaming |
| Frontend | React 18 + Vite + TypeScript | Tailwind v3, Zustand state |
| Package Mgr | uv (backend) + npm (frontend) | Rust-fast resolution |
| Chinese NLP | jieba | Text preprocessing for BGE-M3 input |
| Config | pydantic-settings + python-dotenv | .env-based |
| Logging | loguru | Structured, per-session |

See `docs/adr/` for full ADRs on each module selection.

---

## Output Formats

| Use Case | Output Format |
|----------|-------------|
| UC-1 Review | Three-Color Notes HTML (red/blue/green semantic markup, print-ready) |
| UC-2 Exercise | Numbered problem list with difficulty and answer key (collapsible) |
| UC-3 Grading | Per-problem structured report: ✓/✗ + correction + explanation |
| UC-4 Mistake Drill | Interactive Q&A with session summary + Ebbinghaus next-review schedule |

---

## UI Design: Structured Navigation (No Free-Text Input)

The frontend uses **guided dropdowns and checkboxes** instead of a free-text chat box. This is intentional for a children's education product.

### Navigation Bar (Always Visible)

```
[ 四年级 ▼ ]  [ 下册 ▼ ]  [ 第五单元：认识方程 ▼ ]
```

Selecting Grade → Term → Unit locks the retrieval context (sets `grade`, `term`, `unit` filters).

### Action Panels (Checkbox Selection Below Navigation)

```
📚 请帮我复习
  ☑ 复习本单元知识点（生成三色笔记 HTML）

📝 请帮我练习
  ☑ 生成 [ 10 ] 道 [ 去括号 ▼ ] 相关练习题
     [ ] 严格模式（仅从题库选题，不推断生成）

📷 请帮我批改
  ☑ 上传作业 / 练习 / 考试图片，由 Agent 完成批改

💪 请帮我夯实
  ☑ 从错题本生成今日艾宾浩斯复习题
```

**Future panels (placeholder, not implemented in v1):**
```
📋 期中练习（全单元综合）
📋 期末练习（全册综合）
```

### Rationale

| 设计选择 | 原因 |
|---------|------|
| 下拉菜单代替自由输入 | 儿童不知道该输什么；结构化输入直接转为 KB 过滤器 |
| 勾选步骤而非自然语言 | 避免意图识别歧义；操作对家长透明 |
| 锁定 Grade/Term/Unit | 检索前置过滤，防止跨单元混淆 |
| 保留"自由提问"入口（高级模式）| 家长/教师处理特殊场景 |

### Curriculum Tree Data Source

```
knowledge_base/curriculum/bnu_curriculum.yaml
```

后端在启动时加载此 YAML，通过 `GET /curriculum` 接口返回给前端，用于渲染下拉菜单。"练习题主题"子菜单的选项来自对应 Unit 的 `subtopics` 列表。

KB 中每个文档的 `subtopic` 字段值必须与 YAML 中的 `subtopic.id` 匹配，才能被正确过滤召回。

---

## Out of Scope (v1)

- Multi-user accounts / authentication
- Real-time collaborative sessions
- Subjects other than math
- Grades other than G4T2 (KB content only — architecture supports any grade)
- Native mobile app
- Automated KB ingestion from external sources
