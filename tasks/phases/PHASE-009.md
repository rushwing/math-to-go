---
phase_id: phase-9
title: 管理后台 — KB 管理 + 发布流水线 + 学生概览
status: draft
priority: P3
design_ref: frontend/design/README.md
---

## Goal

实现面向管理员（教师/家长）的后台界面：知识库文档 CRUD、KB 版本发布流水线（LangGraph 驱动的 git→向量化→release）、版本控制与单元版本映射、学生学习数据概览。

> **设计参考：** `frontend/design/README.md` § Admin Panel.html，`frontend/design/Admin Panel.html` 可直接浏览器预览。

## In Scope

### 页面

- `pages/Admin.tsx` — 管理后台容器，含 TopBar + Sidenav + 5 个子页面路由

### 布局组件

- `admin/AdminTopBar` — Logo + 标题 + 「← 学习界面」链接 + 用户信息 + 退出
- `admin/AdminSidenav` — 220px 固定侧边栏，5 个导航项（学生成长概览 / 文档库管理 / KB 发布 / 版本控制 / 单元版本映射）

### 子页面组件

- `admin/StudentOverview` — 班级统计卡片（4指标）+ 学生表格（正确率迷你条形图、连续打卡、今日待复习徽章）+ 行展开 Ebbinghaus 分布
- `admin/KBDocManager` — 文档列表（类型筛选 + 搜索 + 上传按钮）+ 右侧详情面板（全量 frontmatter 键值）+ 上传/替换/删除操作
- `admin/KBReleasePipeline` — 发布前摘要 + 版本号/commit message 表单 + 「🚀 发起 KB Release」按钮 → AgentPipeline（6步）+ 日志终端（`#1A1A2E` 暗色，monospace）
- `admin/KBVersionControl` — 版本卡片列表（draft/active/deprecated 三态）+ 「发布此版本」/「恢复此版本」操作
- `admin/KBVersionMap` — 单元版本映射网格 + 「切换」内联版本选择器 + 底部汇总表

### 后端新增（本阶段需实现）

KB 发布 LangGraph 节点链（6步）：
```
git_add → git_commit → git_push → pr_review → vectorize → kb_release
```
每步 emit SSE 事件：`{ step, status: "running"|"done", result?, log? }`

### 状态管理

- `stores/admin.ts` — `currentPage`, `docs`, `versions`, `unitVersions`, `releasePhase`, `pipelineStep`, `releaseLog`

## API 契约（本阶段新增）

```
GET    /admin/kb/docs                        → KBDoc[]
POST   /admin/kb/docs                        → KBDoc  (multipart/form-data)
PUT    /admin/kb/docs/:id                    → KBDoc
DELETE /admin/kb/docs/:id                    → 204

POST   /admin/kb/release { version, commit_message }  → SSE
GET    /admin/kb/versions                    → KBVersion[]
POST   /admin/kb/versions/:v/promote         → KBVersion
POST   /admin/kb/versions/:v/rollback        → KBVersion
GET    /admin/kb/unit-versions               → { unit: version }
PUT    /admin/kb/unit-versions/:unit { version } → 200

GET    /admin/students                       → Student[]
GET    /admin/students/:id/stats             → StudentStats
```

## Out of Scope

- 实时多用户协作
- 作业批量导入
- 自动化 PR 审查（发布流水线中的 `pr_review` 步骤初版可为人工确认）

## Exit Criteria

- 管理员通过 Login 页面登录后正确跳转至 Admin 页
- `KBDocManager` 可完成文档上传、查看 frontmatter、删除（带确认弹窗）
- `KBReleasePipeline` 发布按钮触发 SSE，`AgentPipeline` 6步逐一点亮，日志终端实时追加
- `KBVersionControl` 可将 draft 版本 promote 为 active
- `KBVersionMap` 可将指定单元切换到不同版本
- `StudentOverview` 表格加载真实 `/admin/students` 数据（或明确标注 mock）
- `tsc --noEmit` + ESLint 无报错

## Dependencies

phase-8（Login 页面 + Auth store + AgentPipeline 复用）、phase-1（KB 文档结构）、phase-2（向量化流程，发布流水线依赖）

## Notes

- KB Release 的 `git` 操作由后端通过 `gitpython` 或 subprocess 执行，需要 repo 配置好 remote 和 push 权限
- `AgentPipeline` 组件在 PHASE-008 中实现，本阶段直接复用（步骤数组不同）
- 版本控制为 KB 文档集合的快照版本，不是 Git tag 的直接映射（可用 KB 内部版本号 + git commit SHA 关联）
- `tweaks-panel.jsx` 为设计调试工具，不进入生产构建
