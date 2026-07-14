# App Center Load Stability Design

## Goal

消除应用总览在存在最近作业数据时的首次加载闪屏，并从 Prompt 生成页彻底移除“复制 SEO 关键词”入口及其专用处理链路。

## Root cause

`ModuleLoader` 会先给 `#app_center_content_area` 添加 `view-fade-in-initial`，等待子模块 `mount()` 完成后再启动一次 `view-fade-in`。应用总览又在 `render()` 中提前添加旧的 `fade-in`。当最近作业需要异步检查 IndexedDB payload 状态时，旧动画会在数据尚未渲染完成时把页面展示出来；异步初始化完成后，`ModuleLoader` 移除旧动画并从透明度 0 重新执行页面动画，形成一次可见闪烁。

生产对照录制显示：无数据时最近作业在首帧内完成；80 条测试作业时，容器在约 94ms 内处于 `view-fade-in-initial fade-in` 且卡片仍未生成，随后切换为 `view-fade-in-initial view-fade-in` 并出现卡片，符合双重动画冲突。

## Design

### Application overview

- 删除 `AppCenterOverviewModule.render()` 中的旧 `fade-in`。
- 保留 `ModuleLoader` 的统一页面入场动画；它只在 `renderRecentPanel()` 完整结束后执行。
- 不新增骨架屏、占位高度或额外加载状态。

### Prompt generation

- 删除 welcome banner 中的“复制 SEO 关键词”按钮。
- 删除 Alpine 组件的 `copySeoKeywords` 方法、UI helper 和仅服务该操作的关键词复制格式化方法。
- 保留 Listing Prompt 向 Deep Chat 交接时携带 SEO 关键词的既有业务数据流。

## Verification

- 单元测试模拟最近作业 payload 异步未完成，断言 overview 不会添加旧 `fade-in`。
- 模板测试断言不再出现“复制 SEO 关键词”和 `copySeoKeywords`。
- PromptLab 定向测试、应用总览测试、类型检查、lint、构建通过。
- 使用多条最近作业数据进行浏览器时间线复验，确认加载期间不再出现 `view-fade-in-initial fade-in` 组合，仅执行一次 `view-fade-in`。

## Out of scope

- 不调整最近作业卡片布局、筛选、排序或 payload 检查策略。
- 不改变 SEO 关键词随 Prompt 交接到 Deep Chat 的内容。
- 不增加新的加载动画。
