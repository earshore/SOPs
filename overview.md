# 残留 CSP Parser 报错修复概览

## 本轮完成

- 继续沿用长期安全方向：不回退到普通 Alpine，不在 CSP 中重新加入 `unsafe-eval`。
- 针对数据采集、AI 智能分析、Prompt 生产三个页面，进一步清理 `@alpinejs/csp` 可能无法解析的模板内联表达式。
- 将剩余风险表达式迁移到 TypeScript getter/method，包括：
  - `!xxx` 否定表达式；
  - `> 0` / `tasks.length > 0`；
  - `x-data="{ ... }"` 局部对象字面量；
  - `target.icon + ' ...'` 字符串拼接；
  - `x-for="renderVersion in [reportRenderVersion]"` 数组表达式；
  - 性能设置区域复杂对象型 `:class`。

## 关键改动

- `scraper/template.html` / `ScraperPanel.ts`
  - 新增 `hasNoValidAsins`、`hasInvalidAsins`、`startDisabled`、`hasTasks` 等 getter。
  - 模板中改用简单属性读取。

- `ai_analysis/template.html` / `AlpinePanel.ts` / `computedProperties.ts` / `PerformanceSettings.ts`
  - 用 `showSelectionSummary`、`hasNoScraperData`、`runAnalysisDisabled`、`analysisNotRunning`、`jsonViewerCollapsed` 等替代否定表达式。
  - 用组件级 `productSummaryTooltipVisible` 替代局部 `x-data`。
  - 用 `getListingTargetIconClass()`、`getReviewTargetIconClass()` 替代字符串拼接。
  - 用性能设置 getter 替代复杂对象型 `:class`。
  - 移除仅为强制重渲染使用的数组型 `x-for="renderVersion in [reportRenderVersion]"` 包装。

- `promptlab/template.html` / `PromptlabPanel.ts`
  - 用 `reportActionDisabled` 替代 `!hasReport`。
  - 用 `generateButtonDisabled` 替代 `!isReady`。

## 验证结果

- `npm run build`：通过。
- 针对三页模板复扫：未再命中目标高风险 Alpine 表达式模式。
- `<template>` 标签数量检查：三页均 open/close 平衡。
- `npm run type-check`：未通过，但失败集中在既有测试文件类型问题：
  - `analysisPrompts.test.ts`
  - `promptSanitizer.test.ts`
  - `dnaExtractor.test.ts`

这些 type-check 失败与本轮 CSP 模板迁移无直接关系，生产构建已验证通过。

## 后续建议

- 部署后重点回归三条路由：数据采集、AI 智能分析、Prompt 生产。
- 如线上仍出现 `CSP Parser Error`，下一步应基于新的 console 堆栈继续收敛其它动态模板或运行时渲染片段。
