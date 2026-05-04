---
phase_id: phase-4
title: Agent 核心 + 知识点复习（UC-1）
status: draft
priority: P1
---

## Goal

实现 LangGraph StateGraph 核心骨架，以及第一个完整用例：知识点复习。前端发送结构化 JSON 参数（无需意图识别），完成会话快照注入 → 教学技能检索 → 向量检索 → 图谱检索 → LLM 生成 → 验证 → Three-Color Notes HTML 输出的完整链路，并通过 SSE 流式返回前端。

## In Scope

- `backend/app/agents/state.py`：`AgentState` TypedDict
  - 输入字段：`session_id`, `action`, `grade`, `term`, `unit`, `subtopic`, `count`, `strict`
  - 处理字段：`student_profile`, `skills_context`, `retrieved_knowledge`, `graph_context`, `output_html`, `stream_tokens`, `error`
  - 注：**无** `raw_query` / `intent` 字段——前端直接发送结构化参数，不需意图分类
- `backend/app/agents/graph.py`：StateGraph 定义（含四用例的条件路由边，以 `action` 字段路由）
- `backend/app/memory/student_profile.py`：加载 `STUDENT_PROFILE.md` + `SESSION_NOTES.md` 冻结快照，注入 system prompt（ADR-007 Extension 1）
- `backend/app/agents/skills_retrieve.py`：BGE-M3 检索 `harness/skills/` 目录，按当前上下文返回相关教学技能（ADR-007 Extension 2）
- `backend/app/agents/retrieval.py`：调用 HybridRetriever + GraphRetriever，合并输出到 `retrieved_knowledge` + `graph_context`
- `backend/app/agents/reviewer.py`：接收检索上下文 + 技能上下文 → LLM 生成 Three-Color Notes HTML
- `backend/app/agents/verifier.py`：独立 LLM context 验证输出内容与 KB 文档一致（fail-closed；失败则返回有依据的降级输出，ADR-007 Extension 6）
- `backend/app/api/routes/tutor.py`：`POST /tutor/run` SSE 端点（接收结构化 JSON）
- Three-Color Notes HTML 模板：红色（定义/关键词）/ 蓝色（公式/规则）/ 绿色（例题/口诀）
- `backend/app/utils/anthropic_client.py`：流式 LLM 调用封装

## Out of Scope

- `intent_classifier.py`（不需要——前端已发送结构化 action 参数）
- 练习题生成节点（属 PHASE-005）
- 批改节点（属 PHASE-006）
- 错题节点（属 PHASE-007）
- 前端 UI（属 PHASE-008）

## Exit Criteria

- `POST /tutor/run` 接收 `{"action":"review","grade":4,"term":2,"unit":"equations"}`，SSE 流式返回完整 HTML
- 返回的 HTML 包含红/蓝/绿三色标注内容，且内容与 KB concept/heuristic 文档匹配
- 图谱上下文（先决条件链）出现在 HTML 的"前置知识"部分
- Verifier 通过（HTML 中无 KB 文档未记载的规则）
- 端到端 Playwright 测试（mock KB）通过
- `mypy --strict` + `ruff` 对 `agents/` 模块无报错

## Dependencies

phase-2（HybridRetriever 就绪）、phase-3（GraphRetriever 就绪）

## Notes

Three-Color Notes HTML 需内嵌 CSS，可直接在浏览器打印为 PDF。LLM 温度设为 0.1 保证输出稳定性。意图识别失败时返回友好的中文错误提示而非 500。
