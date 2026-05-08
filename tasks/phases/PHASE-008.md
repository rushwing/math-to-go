---
phase_id: phase-8
title: 前端 UI — 学生学习界面 + 登录页
status: draft
priority: P2
design_ref: frontend/design/README.md
---

## Goal

实现学生学习界面（Math Tutor）和登录页（Login）：基于角色的登录跳转、三级联动课程导航、四种用例面板、AgentPipeline 步骤追踪、CoT 思考流、完整答题会话与批改流程，以及 SSE 流式渲染。

> **设计参考：** `frontend/design/README.md`（像素级布局规范、完整状态机、API 契约）。
> `frontend/design/*.html` 为可交互的 hi-fi 原型，在浏览器中可直接打开预览。

## In Scope

### 页面

- `pages/Login.tsx` — 角色选择（学生/管理员）→ 登录表单 → 跳转
- `pages/Tutor.tsx` — 学生学习主界面（所有 4 个用例）

### 导航层组件

- `nav/CurriculumNav` — TopNav 60px，含 UserAvatar + 应用标题 + Grade/Term/Unit 三级联动下拉 + 「开始」CTA
- `nav/UserAvatar` — Google 账户风格头像（名称哈希配色）+ 下拉菜单（管理后台入口、切换账户、退出）

### 侧边栏组件

- `actions/ActionPanel` — 四张 radio 卡片（复习/练习/批改/夯实），每次仅激活一个
  - `generate` 激活时内联展开：题目数步进器 + 主题下拉 + 严格模式开关
- `actions/GradePanel` — 拖拽/点击上传区，缩略图预览，>5MB 警告横幅
- `actions/FreeQueryInput` — 折叠「高级模式」区（家长/教师专用），默认收起

### 流式输出基础设施

- `pipeline/AgentPipeline` — 横向步骤追踪器（pending/running/done 三态动画，含连接线进度）
- `pipeline/CoTStream` — 可折叠思考面板（弹跳三点动画、等宽字体滚动、输出到达后自动收起）

### 用例输出组件

- `notes/ThreeColorNotes` — UC-1，后端 HTML 注入（`dangerouslySetInnerHTML`）+ 打印按钮（`@media print`）
- `problems/ProblemSetPreview` — UC-2/UC-4，题目卡片网格（难度徽章 + 「预览 ▼」），批改后叠加 ✓/✗ 状态
- `problems/AnswerSession` — UC-2/UC-4，双栏布局：左侧题号导航（28px 方格）+ 右侧答题区（多行文本框 + 上/下题 + 交卷）
- `grading/GradeConfirmPreview` — UC-3 步骤1，OCR 识别结果确认，含置信度指示器，低置信度建议重拍
- `grading/GradingProgress` — UC-3 步骤2，逐题批改进度（AgentPipeline + 进度条 + 逐题状态列表）
- `grading/GradingReport` — UC-3/UC-2/UC-4，批改报告卡片（✓/✗ + 来源标注 `📚 题库` / `🤖 推断` + 折叠解析）
- `shared/SessionSummary` — UC-4，练习结束汇总（复习N题 / 掌握M题 / 明日K题）

### 状态机（Tutor screen）

```
idle
  → generating
      → review_result          (UC-1 完成)
      → problem_preview        (UC-2/UC-4 题目预览)
           → answering         (进入答题)
                → grading      (提交批改)
                     → graded  (批改完成)

grade flow:
  idle → ocr_running → ocr_confirm → grade_marking → graded
```

### 状态管理

- `stores/auth.ts` — `user`, `setUser`, `logout`
- `stores/tutor.ts` — `selection`, `activeAction`, `screen`, `problems`, `answers`, `gradingResults`, `pipelineStep`, `cotThoughts`, `cotDone`, `outputContent`
- `hooks/useSSE.ts` — EventSource 生命周期封装（connect/disconnect/reconnect）
- `hooks/useCurriculum.ts` — 加载并缓存 `/curriculum` 响应
- `localStorage`：`mtt_answers`（答题内容逐键保存）+ `mtt_selection`（上次选择的 grade/term/unit）

### 样式

- Tailwind v3，设计 Token 见 `frontend/design/README.md` § Design Tokens
- 主色 `#1865F2`，页面底色 `#FFF9F0`，字体 Noto Sans SC / PingFang SC，正文 ≥16px
- 动画：`pulse`, `shimmer`, `fadeIn`, `ripple`, `thinkDot`（CSS keyframes）

### 推荐目录结构

```
frontend/src/
  components/
    nav/          CurriculumNav, UserAvatar
    actions/      ActionPanel, GradePanel, FreeQueryInput
    pipeline/     AgentPipeline, CoTStream
    notes/        ThreeColorNotes
    problems/     ProblemSetPreview, AnswerSession
    grading/      GradeConfirmPreview, GradingProgress, GradingReport
    shared/       SessionSummary
  pages/
    Login.tsx
    Tutor.tsx
  stores/
    auth.ts
    tutor.ts
  hooks/
    useSSE.ts
    useCurriculum.ts
  types/
    index.ts
```

## API 契约（本阶段消费）

```
POST /auth/login  { role, username, password }  → { user, token }
GET  /auth/me                                   → { user }
POST /auth/logout                               → 204

GET  /curriculum                                → bnu_curriculum.yaml tree
GET  /curriculum/:grade/:term/units             → units[]
GET  /curriculum/:grade/:term/:unit/subtopics   → subtopics[]

POST /tutor/run   { action, grade, term, unit, subtopic?, count?, strict? } → SSE
POST /tutor/grade/ocr   { image_base64, grade, term, unit }  → { ocr_results[] }
POST /tutor/grade/mark  { ocr_results[] }                    → SSE grading stream
```

SSE chunk 格式：
```typescript
{ type: 'pipeline', step: number }       // 推进 AgentPipeline
{ type: 'cot',      text: string }       // 追加到 CoTStream
{ type: 'output',   html: string }       // 追加到输出区
"[DONE]"                                  // 流结束
```

## Out of Scope

- 管理后台（→ PHASE-009）
- 移动端 Native App
- 离线模式
- 期中/期末综合练习（UI 占位，功能留待 v2）

## Exit Criteria

- `CurriculumNav` 三级联动正确渲染所有年级单元（数据来自 `/curriculum`）
- 登录页角色选择 → 表单 → JWT 存储 → 跳转 Tutor 页面，完整流程可手动验证
- 四种用例均可通过结构化面板触发并完成完整操作（手动验证）
- UC-3 批改走完两步流程：上传 → OCR 确认 → 批改报告
- `AgentPipeline` 步骤动画与后端 SSE `pipeline` 事件同步
- Three-Color Notes `@media print` 预览无样式丢失
- `AnswerSession` 答题内容在页面刷新后从 `localStorage` 恢复
- `FreeQueryInput`（高级模式）默认折叠，展开后可触发后端
- Playwright E2E 覆盖：UC-1 复习完整流程 + UC-3 批改完整流程（含 OCR 确认步骤）
- `tsc --noEmit` + ESLint 无报错

## Dependencies

phase-4（`/tutor/run` SSE 端点）、phase-5、phase-6、phase-7（各节点接口稳定）

并行开发说明：后端接口未就绪时，用 `frontend/design/Math Tutor.html` 中的 `REVIEW_CHUNKS` 和 `PIPELINE_STEPS` mock 数据模拟 SSE，UI 开发不阻塞后端进度。

## Notes

- Three-Color Notes HTML 由后端 LLM 生成，`dangerouslySetInnerHTML` 渲染（受控 LLM 输出，不接受用户 HTML 输入，XSS 风险可接受）
- `bnu_curriculum.yaml` 由后端在启动时加载，通过 `GET /curriculum` 提供给前端，前端不直接读 YAML
- `tweaks-panel.jsx` 为设计调试工具，不进入生产构建
- JWT 存储在 `localStorage`（`mtt_token`），生产环境改用 httpOnly cookie
