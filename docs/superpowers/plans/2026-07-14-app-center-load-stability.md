# App Center Load Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除应用总览有最近作业数据时的双重淡入闪屏，并移除 Prompt 生成页的 SEO 关键词复制入口。

**Architecture:** 让 `ModuleLoader` 成为应用总览唯一的页面入场动画所有者，避免子模块在异步初始化完成前自行显示。PromptLab 侧删除按钮及其独占的 handler/formatter，同时保持 Deep Chat handoff 数据不变。

**Tech Stack:** TypeScript、Vitest、Vite、Playwright CLI

---

### Task 1: Add regression coverage

**Files:**
- Modify: `tests/unit/app_center_overview.test.ts`
- Modify: `tests/unit/app-center-listing-workflow-handoff.test.ts`
- Modify: `tests/unit/promptlab.test.ts`
- Modify: `tests/unit/promptlabService.dedupe.test.ts`

- [ ] **Step 1: Add the overview animation ownership assertion**

在 overview 测试中模拟未完成的 PPC payload 查询；模板挂载后、查询完成前断言容器没有 `fade-in`。完成 deferred Promise 后等待 mount 结束。

- [ ] **Step 2: Change Prompt template expectations**

断言模板不包含 `复制 SEO 关键词` 和 `copySeoKeywords`，同时继续断言 Deep Chat handoff 存在。

- [ ] **Step 3: Remove tests for the deleted copy-only APIs**

删除 `promptlab.test.ts` 中复制按钮 action 测试，以及 `promptlabService.dedupe.test.ts` 中复制文本 formatter 测试。

- [ ] **Step 4: Verify RED**

Run: `npx vitest run tests/unit/app_center_overview.test.ts tests/unit/app-center-listing-workflow-handoff.test.ts`

Expected: overview 因仍添加 `fade-in` 失败，Prompt 模板因仍包含复制按钮失败。

### Task 2: Implement the minimum fix

**Files:**
- Modify: `src/modules/app_center/views/overview/index.ts`
- Modify: `src/modules/app_center/views/master_analysis/promptlab/template.html`
- Modify: `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts`
- Modify: `src/modules/app_center/views/master_analysis/promptlab/components/uiHelpers.ts`
- Modify: `src/modules/app_center/views/master_analysis/services/promptlabService.ts`

- [ ] **Step 1: Remove the overview legacy animation**

删除 `this.container.classList.add('fade-in')` 和对应旧动画注释；模板和 catalog 渲染顺序不变。

- [ ] **Step 2: Remove the Prompt banner action**

删除 welcome banner 按钮、`PromptlabPanel` 的 handler/import、`uiHelpers` 的复制函数和专用 imports。

- [ ] **Step 3: Remove the copy-only formatter**

删除 `buildSeoKeywordCopyText` 导出及仅被它使用的 report keyword formatter 辅助函数，不改 `generateMasterPrompt` 或 Deep Chat handoff。

- [ ] **Step 4: Verify GREEN**

Run: `npx vitest run tests/unit/app_center_overview.test.ts tests/unit/app-center-listing-workflow-handoff.test.ts tests/unit/promptlab.test.ts tests/unit/promptlabService.dedupe.test.ts tests/unit/promptlab-template-a11y.test.ts`

Expected: all selected files pass.

### Task 3: Release-level verification

**Files:**
- No additional source files

- [ ] **Step 1: Run static gates**

Run: `npm run type-check && npm run lint && npm run lint:warning-gate && npm run format:check`

Expected: exit 0 and ESLint warnings remain `0/0`.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: security, quality, formatting and Vite build all exit 0.

- [ ] **Step 3: Re-run browser timeline**

使用多条最近作业数据加载应用总览，确认异步阶段不再出现 `view-fade-in-initial fade-in`，最终只运行 `view-fade-in`，Prompt welcome banner 不含 SEO 复制按钮。
