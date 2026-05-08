---
phase_id: phase-6
title: 作业批改 + Claude Vision（UC-3）
status: draft
priority: P2
---

## Goal

实现作业批改功能：用户上传作业照片，Claude Vision 识别题目和学生答案，系统通过 BGE-M3 ColBERT 模式匹配 KB 中的对应题目并召回标准答案，对无 KB 匹配的题目进行推断批改，生成结构化批改报告。

## In Scope

UC-3 使用两个独立 LangGraph 图 + artifact 中转存储（ADR-007 Extension 5）：

**Step 1 — `ocr_graph`（`POST /tutor/grade/ocr`）：**
- `backend/app/agents/ocr_graph.py`：
  1. `image_ingestion`：base64 → 验证格式 + 尺寸
  2. `ocr_extract`：调用 Claude Vision，提取题目列表 + 学生答案（JSON）
  3. `confidence_check`：低置信度图片返回 `low_confidence` 提示
  4. 存储 OCR artifact 到 `app.state.ocr_artifacts[session_id]`（TTL 30 分钟）
- SSE 事件：`ocr_artifact { problems: [...], confidence: [...] }`
- 前端渲染：`GradeConfirmPreview`（学生确认 OCR 结果）

**Step 2 — `mark_graph`（`POST /tutor/grade/mark`）：**
- `backend/app/agents/mark_graph.py`：
  1. `load_ocr_artifact`：从 `app.state.ocr_artifacts[session_id]` 读取（不从 LLM context 重推导）
  2. `grade_problems`：对每题调用 BGE-M3 ColBERT 匹配 KB practice corpus；命中用 KB 标准答案，未命中用 LLM 推断
  3. `generate_report`：生成批改报告（标注来源：`kb_match` / `inferred`）
- SSE 流式返回批改报告
- 前端流程：`GradingProgress` → `GradingReport`

**共享：**
- 批改报告格式：每题 ✓/✗ + 正确答案 + 中文学生友好解释
- `backend/app/state/artifact_store.py`：`dict[str, OcrArtifact]`（in-process，v1 无 Redis 依赖）

## Out of Scope

- 批量图片上传（v1 单张）
- 手写识别质量评分
- Redis artifact 持久化（v1 用 in-process dict）

## Exit Criteria

- `POST /tutor/grade/ocr`：上传含3道方程题图片，返回 `ocr_artifact`，`session_id` 对应条目存入 artifact store
- `POST /tutor/grade/mark`：使用上一步 `session_id`，返回3条批改结果（`problem_number` 连续）
- `mark_graph` 的 `load_ocr_artifact` 直接从 artifact store 读取，不调用 Claude Vision（单元测试验证）
- KB 命中题目 `source: kb_match`；未命中题目 `source: inferred`
- 低质量图片触发 `low_confidence` 响应而非错误批改
- 集成测试使用 fixture 图片（3 张标准测试图）

## Dependencies

phase-2（BGE-M3 ColBERT 接口）、phase-4（StateGraph 骨架、SSE 端点模式）

## Notes

Claude Vision image token 约 800–1200 per 照片，成本可接受。ColBERT 相似度阈值默认 0.75，可通过 `COLBERT_MATCH_THRESHOLD` 环境变量调整。批改报告需在前端以卡片形式展示，答案区颜色区分正确（绿）/错误（红）。Artifact store TTL 30 分钟，超时后返回 404 要求重新上传。
