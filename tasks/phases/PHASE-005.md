---
phase_id: phase-5
title: 练习题生成（UC-2）
status: draft
priority: P1
---

## Goal

实现练习题生成节点，支持两种模式：严格模式（仅从 KB 返回现有题目）和推断模式（LLM 基于 KB 样例生成新题目，并通过验证器确认可解性）。

## In Scope

- `backend/app/agents/problem_generator.py`：LangGraph 节点
  - **严格模式**（`strict=true`）：从 `practice` corpus 检索，按 subtopic/difficulty 过滤，直接返回 KB 原题
  - **推断模式**（默认）：检索样例 → LLM 仿写新题 → evaluator 节点检验 → 注入批评重试
- `backend/app/agents/problem_evaluator.py`：LangGraph 节点（ADR-007 Extension 4）
  - Rubric 三项检查：(1) 难度匹配请求级别，(2) 语言适合四年级学生，(3) `sympy` 确认唯一确定解
  - 未通过：将结构化批评（非对话历史）注入回 generator，最多重试 2 次
  - 通过：输出题目列表
- 输出格式：带序号的题目列表 + 难度标签 + 折叠式答案区
- 题目数量参数：默认 10，上限 20
- subtopic / difficulty 过滤透传到 HybridRetriever metadata filter
- 新增依赖：`sympy`（代数验证）

## Out of Scope

- 自动评分（属 UC-3/UC-4）
- 题目去重数据库（v1 依赖 LLM 生成差异性，不做显式去重）

## Exit Criteria

- 严格模式：`{"action":"generate","strict":true,"count":5,"subtopic":"remove_brackets"}` 返回 ≤5 道 KB 原题
- 推断模式：生成10道题目，evaluator 对全部通过 3 项 rubric 检查（验证失败重试，最多2次）
- `sympy` 可解性检查：至少1道题触发重试并在重试后通过（单元测试验证重试逻辑）
- 输出 HTML 包含折叠答案区，可在浏览器正确渲染
- `mypy --strict` 对 `problem_generator.py` + `problem_evaluator.py` 无报错

## Dependencies

phase-4（StateGraph 骨架、HybridRetriever 接口）

## Notes

推断模式下 LLM temperature=0.7 以增加题目多样性；验证器使用 temperature=0.1。生成题目的答案不写入 KB，仅随本次请求返回。
