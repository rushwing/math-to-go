---
phase_id: phase-7
title: 错题集练习 + 艾宾浩斯（UC-4）
status: draft
priority: P2
---

## Goal

实现错题集练习功能：严格从 mistake corpus 检索，通过艾宾浩斯间隔复习算法调度复习题目，交互式练习后更新错题本的复习状态（review_count / next_review_date / mastered）。

## In Scope

- `backend/app/services/ebbinghaus_service.py`：
  - 根据 `next_review_date ≤ today` 过滤到期题目
  - 计算下次复习日期：intervals = [1, 2, 4, 7, 15, 30] 天
  - 连续答对 `MASTERY_THRESHOLD`（默认3次）次后标记 `mastered: true`
- `backend/app/agents/practice_graph.py`：LangGraph 图 + `AsyncSqliteSaver` checkpointer（ADR-007 Extension 3）
  - Thread ID：`{student_id}:{unit_id}`（如 `u42:G4T2.EQ`）
  - 节点：`load_schedule` → `select_problems`（Ebbinghaus 调度）→ `present_problems` → `grade_responses` → `update_schedule` → checkpoint 持久化
  - Mistake 文档 frontmatter 更新写回 `.md` 文件（非向量库）
- API 端点（ADR-007 Extension 3）：
  - `GET /tutor/practice`：加载当前 checkpoint 中的艾宾浩斯日程，返回今日待复习题目
  - `POST /tutor/practice/submit`：接收用户答案 → 批改 → 更新日程 → 持久化 checkpoint → SSE 返回会话汇总
- 练习会话结束时输出：本次复习N题 / 掌握M题 / 明日待复习K题
- 新增依赖：`aiosqlite`（`AsyncSqliteSaver` 所需）

## Out of Scope

- 多设备同步（v1 本地 SQLite，`backend/data/checkpoints.db`）
- 自适应难度调整（v1 仅按 Ebbinghaus 间隔，不考虑答题时间）

## Exit Criteria

- `GET /tutor/practice` 返回 `next_review_date ≤ today` 的题目列表
- `POST /tutor/practice/submit` 答对3次后文档 `mastered: true`，下次 `GET` 不再返回该题
- `next_review_date` 在答错后按正确 Ebbinghaus interval 更新
- 服务重启后 `GET /tutor/practice` 从 checkpoint 恢复日程（单元测试验证跨会话持久化）
- 单元测试覆盖：首次复习、中间阶段、mastered 边界、checkpoint 恢复

## Dependencies

phase-4（StateGraph 骨架）、phase-1（mistake 文档 frontmatter 结构）

## Notes

`AsyncSqliteSaver` 连接字符串：`backend/data/checkpoints.db`（需挂载到 Docker volume 以保证生产环境持久化）。Frontmatter 更新使用 `python-frontmatter` 库读写，保留文档正文不变。`MASTERY_THRESHOLD` 和 intervals 在 `config.py` 中可配置。
