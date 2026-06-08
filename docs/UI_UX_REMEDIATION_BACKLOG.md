# sops 视觉与 UX 整改 backlog

本 backlog 基于 `docs/UI_UX_VISUAL_AUDIT_REPORT.md` 拆分。优先级按用户阻断程度、影响页面数量和整改依赖排序。

## 执行原则

- 先修可用性阻断，再做视觉收敛。
- 先改全局壳层和共享组件，再改单页面细节。
- 每个任务必须有截图或量化指标验收。
- 不把历史 CSS 一次性大迁移；新代码先执行更严格准入。

## P0：移动端可用性阻断

| ID | 整改项 | 影响范围 | 主要文件 | 验收标准 |
| --- | --- | --- | --- | --- |
| UI-P0-01 | 动态侧边栏移动端抽屉化 | SOPS、App Center、PPC、Playground、AMZ Hub、More | `index.html`、`src/common/ui/navigation.ts`、`src/css/layouts/container.css` | 375、390、430px 下侧边栏关闭时不占宽，`#main-content.x = 0`，主内容宽度不低于 360px。 |
| UI-P0-02 | 移动端模块主内容容器修复 | 全部动态侧边栏模块 | `index.html`、模块根容器样式 | 移动截图无竖排断字、无核心表单和卡片被压缩到不可读。 |
| UI-P0-03 | 移动端一级导航入口 | 全站导航 | `index.html`、`src/css/components/header-main.css`、`src/css/components/mega-menu.css` | 768px 以下可以进入 SOPs、应用中心、Amazon 智库、更多，不依赖 hover。 |
| UI-P0-04 | 壳层移动截图回归 | 首页 + 6 个模块 | `tests/visual/visual.test.ts` 或新增 smoke 测试 | CI 或本地命令输出 375/390/430px 关键截图，失败时能定位页面。 |

## P1：产品体验与设计系统收敛

| ID | 整改项 | 影响范围 | 主要文件 | 验收标准 |
| --- | --- | --- | --- | --- |
| UI-P1-01 | 首页首屏工作台化 | 首页 | `src/modules/home/*` | 首屏显示待办、最近工具、关键 SOP、异常状态；品牌 hero 不再占满第一屏。 |
| UI-P1-02 | 移除自定义 cursor | 首页 | `src/modules/home/homeDisplay.css`、首页模板 | 默认系统指针恢复；删除 `cursor: none` 和 follower 依赖。 |
| UI-P1-03 | 路由级 skeleton | 动态路由 | 路由加载与模块挂载代码 | 页面等待超过 300ms 时主区域有 skeleton，不出现长时间空白。 |
| UI-P1-04 | Mega Menu 语义与键盘交互 | 顶部导航 | `index.html`、`src/css/components/header-main.css`、导航脚本 | 一级菜单维护 `aria-expanded` / `aria-controls`，支持键盘打开、关闭和焦点返回。 |
| UI-P1-05 | App Center / PPC token 对照表 | App Center、PPC | `src/modules/app_center/app_center_style.css`、`src/modules/app_center/views/ppc_search_terms/style.css` | `--app-*`、`--ppc-*` 主色、文本、边框、阴影映射到全局 token；新增局部 token 需登记。 |
| UI-P1-06 | Welcome Banner 收敛 | 首页、App Center 及使用横幅页面 | `src/css/components/welcome-banner.css`、相关模块 CSS | 默认横幅无 orb / particle；只保留标题、说明、状态、主操作和必要标签。 |
| UI-P1-07 | 共享卡片 / 徽章 / 按钮标准化 | SOPS、AMZ Hub、App Center、More | `src/css/components/cards.css`、`badges.css`、模块 CSS | 对齐 `docs/css-module-analysis-report.md`；重复卡片、徽章、按钮模式减少，页面截图一致。 |
| UI-P1-08 | 标题结构治理 | PromptLab、Scraper、AI Analysis、Playground、AMZ Quality、More Prompts | 相关页面模板 | 每个核心页面有且仅有一个 h1；标题层级不跳跃。 |
| UI-P1-09 | 视觉装饰降噪 | 工具型页面 | 模块 CSS、welcome banner、首页 CSS | 渐变和大阴影只用于品牌入口或重要状态；主工作区不使用装饰 blob / particle。 |
| UI-P1-10 | 共享渲染器语义治理 | 总览页、侧边栏、顶部菜单 | `src/common/components/OverviewRenderer.ts`、`src/common/components/SidebarRenderer.ts`、`src/common/ui/megaMenu.ts` | 搜索框有 label；筛选按钮同步 `aria-pressed`；展开按钮维护 `aria-expanded` / `aria-controls`；菜单卡片可键盘聚焦。 |
| UI-P1-11 | 可点击卡片原生化 | Mega Menu、SOPS 总览、More 总览 | `src/common/ui/megaMenu.ts`、`src/modules/sops/views/overview/template.html`、`src/modules/more/views/overview/template.html` | `<div data-action>` 导航卡片改为 button / link；Enter 和 Space 可触发；焦点样式清晰。 |
| UI-P1-12 | 状态反馈语义治理 | loading、empty、error、toast、progress | `index.html`、`src/components/ErrorBoundary.ts`、`src/common/ui/notifications.ts`、`src/common/utils/LoadingManager.ts` | loading 用 `role="status"` / `aria-live`；error 用 `role="alert"`；主内容加载时有 `aria-busy`；toast 可被读屏公告。 |
| UI-P1-13 | 弹窗语义与焦点治理 | 全局 AppModal、删除确认、导入冲突 | `src/components/modal/AppModal.ts`、`src/components/modal/sharedModals.html` | 弹窗 panel 有 `role="dialog"`、`aria-modal`、标题/描述关联；打开后聚焦，Tab 不逃逸，关闭后焦点返回触发器。 |
| UI-P1-14 | 路由级 skeleton 规范 | 动态路由、表格页、表单页、内容页 | `src/common/components/SkeletonLoader.ts`、`src/common/utils/ModuleLoader.ts` | 定义 route/table/form/content 四类 skeleton；超过 300ms 展示骨架；截图验证无空白主区域。 |
| UI-P1-15 | 数据表组件标准化 | NPI、PPC、Restricted Words、SOP 表格页 | 共享表格样式 / 模板、相关 `template.html` | 表格模式覆盖 caption、scope、sticky header / first column、density、数值对齐、滚动提示和移动摘要。 |
| UI-P1-16 | 阅读型长内容模板 | AMZ Hub 长文页、SOP 培训页 | 共享内容页样式、AMZ / SOPS 长模板 | 超过 800 行或 6 个主章节的页面有目录、锚点、稳定行宽、正文尺寸和 checklist 组件规则。 |
| UI-P1-17 | 概览页入口模式统一 | SOPS、AMZ Hub、More、共享 OverviewRenderer | `src/common/components/OverviewRenderer.ts`、各 overview 模板 / index | 迁移到 App Center 基线：搜索 label、筛选 `aria-pressed`、结果计数、空态、卡片键盘触发。 |
| UI-P1-18 | 统一导航契约 | 跨模块跳转、工具链路、概览卡片 | `src/common/router/*`、`src/common/ui/index.ts`、相关模块跳转代码 | 业务 UI 不直接写 `window.location.hash`；跨工具跳转统一 route helper，加载态、历史记录和测试路径一致。 |
| UI-P1-19 | 输入工作流标准化 | PPC、Scraper、Keyword Hunter、PromptLab、AI Analysis | 共享表单 / 上传 / AI 状态组件、相关模板 | 上传、粘贴、大文本输入、AI 执行、结果错误卡形成统一 label / helper / error / loading 语义规则。 |
| UI-P1-20 | 导入 / 上传错误反馈标准 | PPC 报表导入、Scraper JSON 导入 | `ppc_search_terms`、`master_analysis/scraper` | 文件类型、大小、解析失败、数据结构错误在上传面板内持久展示，toast 只作辅助提醒。 |
| UI-P1-21 | 指标 / 图表 / 状态编码标准 | KPI、进度、置信度、分数、风险等级、Chart.js 图表 | `src/css/components/progress.css`、`badges.css`、`design-tokens.ts`、相关模块模板 | 定义 KPI、score、confidence、risk、progress、chart 的 token、阈值、文案、图标和 fallback 规则；新增模块不得自定义未登记状态色。 |
| UI-P1-22 | 主题 / 暗色模式契约治理 | 全站主题系统 | `src/common/config/themeConfig.ts`、`src/common/config/themes.ts`、`src/stores/useAppStore.ts`、`src/css/foundation/variables.css` | 品牌主题与明暗模式分离；`light` / `dark` / `auto` 统一驱动 DOM、store、storage 和系统偏好监听；`data-theme` 不再同时承担品牌色和 dark 语义。 |
| UI-P1-23 | 动效 / 微交互契约治理 | 全站 motion 系统 | `src/services/animation-manager.ts`、`src/css/animations/*`、`src/css/utilities/animation-controls.css`、模块 CSS | 定义 motion scale、动效类别、运行时开关、reduced-motion 规则；反馈型动效默认可用，装饰型循环动画默认关闭或显式启用。 |
| UI-P1-24 | 键盘交互 / 焦点状态契约治理 | 顶部导航、Mega Menu、共享渲染器、总览页、折叠面板、弹窗 / 抽屉 | `src/common/components/OverviewRenderer.ts`、`src/common/ui/megaMenu.ts`、`src/common/components/SidebarRenderer.ts`、`src/components/modal/AppModal.ts`、相关模块模板 | 所有可点击导航入口优先使用 button / link；Enter / Space 可触发，Esc 可关闭浮层，关闭后焦点返回；`aria-pressed` / `aria-expanded` / `aria-current` 与视觉状态同步，focus-visible 可见。 |
| UI-P1-25 | 视觉资产 / 图标系统契约治理 | 品牌资产、导航图标、状态图标、空状态、长内容页 | `public/logo.svg`、`index.html`、`src/common/config/menuConfig.ts`、`src/common/ui/notifications.ts`、共享 icon helper / registry | Logo / favicon / header mark 由同一源派生；业务 UI 通过 icon registry 使用图标；结构性 UI 不再直接使用 emoji；空状态模板定义标题、原因、下一步和主操作。 |
| UI-P1-26 | 视觉性能 / 字体加载契约治理 | 首屏壳层、字体、图标、CSS 分包、路由 style-ready | `index.html`、`src/main.ts`、`src/css/critical.css`、`src/css/foundation/variables.css`、`src/common/config/moduleCssRegistry.ts`、性能测试 | 字体和图标使用单一来源；critical / main / module CSS 边界明确；路由 ready 包含 style-ready；主 CSS 失败有降级状态；核心 Web Vitals 门槛写入验收。 |
| UI-P1-27 | 层级 / 浮层 / 滚动锁定契约治理 | 全站 overlay、modal、drawer、toast、loading、popover、sticky table | `src/css/foundation/variables.css`、`src/common/config/design-tokens.ts`、`src/components/modal/AppModal.ts`、`src/css/components/modals.css`、`src/css/layouts/container.css`、业务 body 级浮层 | z-index 只有一套 token 来源；业务不再新增 `z-[9999]` / `99999`；body 级浮层统一接入 overlay manager、scroll lock、focus return、Esc、safe-area 和背景不可交互策略。 |
| UI-P1-28 | 响应式断点 / 容器 / 密度契约治理 | 全站断点、容器、工具页、宽表、长内容、chat 输入框 | `config/tailwind.config.generated.js`、`src/common/config/design-tokens.ts`、`src/css/foundation/variables.css`、`src/css/layouts/container.css`、`src/css/utilities/containers.css`、模块私有 media query | Tailwind screens、TS BREAKPOINTS、CSS breakpoint、测试视口使用同一来源；页面类型映射到容器宽度和 density；新增私有 media query、固定宽度、截断规则必须登记。 |
| UI-P1-29 | AI 输出 / Markdown / 代码块 / 导出契约治理 | PromptLab、AI Analysis、Keyword Hunter、Playground、Markdown / CodeBlock / JsonViewer | `src/css/components/markdown.css`、`src/css/components/code-highlight.css`、`src/css/components/chat.css`、`src/css/utilities/print.css`、`promptlab/components/reportRenderer.ts`、`keyword_hunter/analysis/index.ts`、`ai_analysis/components/actions.ts`、`playground/deep-chat/index.ts` | 定义 Markdown variants、CodeBlock / JsonViewer 结构、copy / download / print 共享状态、LLM 输出结构 fallback；业务模块不再用 nth-child 推断输出语义。 |
| UI-P1-30 | 文案 / 术语 / 微文案契约治理 | 全站 UI copy、状态文案、错误文案、可访问名称 | UI copy registry、术语表、`src/common/errors/errorCodes.ts`、`src/common/constants/constants.ts`、`src/components/settings/systemSettings.ts`、核心模块模板 | 定义 `AI / Prompt / API / LLM`、复制 / 下载 / 导出、empty / loading / error、危险操作、placeholder、title、aria-label 的统一规则；新增模块文案需登记首选写法。 |
| UI-P1-31 | 系统设置 / 偏好 / 本地数据管理契约治理 | 系统设置、模型配置、代理配置、本地数据、性能监控 | `src/components/settings/systemSettings.html`、`src/components/settings/systemSettings.ts`、`src/components/modal/AppModal.ts`、`src/services/localDataStore.ts`、`src/common/devtools/PerformanceMonitor.ts` | 设置抽屉接入 dialog / drawer 语义、焦点管理和焦点返回；API Key、模型、代理、本地数据、危险清空和开发监控分层治理。 |
| UI-P1-32 | 搜索 / 筛选 / 发现入口契约治理 | 侧边栏、总览页、业务表格、复杂检索、搜索历史、全局命令入口 | `src/common/components/SidebarRenderer.ts`、`src/common/ui/search.ts`、`src/common/components/OverviewRenderer.ts`、各 overview 模板、`ppc_search_terms`、`restricted_words`、`marketing_calendar`、`more/views/explore/prompts`、命令入口组件 | 统一 search field、filter group、result count、empty state、clear action、search history、command palette、键盘和移动浮层规则；App Center Overview / PPC 基线回灌到共享组件。 |
| UI-P1-33 | 帮助 / 引导 / Tooltip / 文档入口契约治理 | 使用指南、折叠说明、tooltip、样例数据、外部引用、应用内文档入口、可关闭提示 | `src/common/components/OverviewRenderer.ts`、`scraper/template.html`、`ai_analysis/template.html`、`promptlab/template.html`、`ppc_search_terms`、SOP 长文模板、`docs/README.md`、帮助 / 文档入口组件 | 定义 HelpPanel、Disclosure、Tooltip、SampleDataBanner、ReferenceLinks、DocsEntry 和 dismissible tips 偏好恢复规则；关键说明不再只依赖 hover 或 `title`。 |
| UI-P1-34 | 历史 / 草稿 / 快照 / 恢复契约治理 | Scraper 历史、PromptLab 草稿、Keyword Hunter 输入、PPC 设置、Deep Chat 会话、系统导入导出、危险删除 | `src/services/storageService.ts`、`src/services/localDataStore.ts`、`src/stores/useAppStore.ts`、`master_analysis/services/historyService.ts`、`scraper/components/HistoryPanel.ts`、`promptlab/components/PromptlabPanel.ts`、`keyword_hunter`、`ppc_search_terms`、`playground/deep-chat`、`systemSettings.*` | 定义 RecoveryBanner、HistorySnapshotList、DraftRestoreState、BackupRestoreWizard 和 UndoDelete 规则；恢复态必须显示来源、时间、范围、覆盖影响和放弃 / 继续 / 另存路径。 |

## P2：逐页质量清理

| ID | 整改项 | 影响范围 | 主要文件 | 验收标准 |
| --- | --- | --- | --- | --- |
| UI-P2-01 | 表单 label 补齐 | PPC、PromptLab、More Prompts、侧边栏搜索 | 对应模板与 `SidebarRenderer.ts` | 可见 input / select / textarea 100% 有 label、`aria-label` 或 `aria-labelledby`。 |
| UI-P2-02 | 触控目标治理 | 移动端所有工具页 | 模块 CSS、共享按钮/表单组件 | 移动端主要操作 hit area 不低于 44px；小图标按钮补足点击区域。 |
| UI-P2-03 | 对比度和小字号治理 | 状态 badge、步骤编号、辅助说明、禁用按钮 | 模块 CSS、共享 badge/button 样式 | 正文 4.5:1，大号/粗体文本 3:1；正文不低于 14px。 |
| UI-P2-04 | 数据表移动策略 | PPC 等结果表 | PPC 页面与表格样式 | 移动端提供卡片摘要或可控横向滚动，不挤压正文。 |
| UI-P2-05 | `!important` 和 inline style 收敛 | 全项目 CSS / TS 模板 | `src/css`、`src/modules` | 除 reset、第三方覆盖、reduced motion 外，不新增模块级 `!important`；颜色和圆角不再写 inline style。 |
| UI-P2-06 | CSS 变量审计基线提升 | 全项目 CSS | design token 文件、模块 CSS | `npm run css:audit` 符合率从 46.3% 提升到 70% 以上；新增不合规变量为 0。 |
| UI-P2-07 | 动效热点清理 | Scraper、首页、welcome banner、危险弹窗、AI Analysis | `scraper_style.css`、`homeDisplay.*`、`welcome-banner.css`、`sharedModals.html`、`ai_analysis_style.css` | `transition: all` 逐步替换为明确属性；Scraper 私有 keyframes、首页 canvas loop、banner 粒子、弹窗 ping/spin、AI shimmer 在 reduced-motion 下停止或降级。 |
| UI-P2-08 | 暗色模式截图验收 | 首页、App Center、PPC、SOPS、Playground、AMZ Hub、More | 视觉测试 | 每个核心页面至少保留 light / dark 截图；同时覆盖显式 dark 与 system dark；截图中无浅色卡片和暗色控件混杂。 |
| UI-P2-09 | HTML 模板 label 批量治理 | NPI、AMZ Quality、Promotion、PPC、PromptLab 等 | 对应 `template.html` | 静态扫描中疑似缺 label 控件从 196 个降为 0；浏览器抽样确认可访问名称正确。 |
| UI-P2-10 | Checkbox / checklist 组件化 | AMZ Hub 长文页、SOPS 清单页 | `src/css/components/forms.css`、相关模板 | checkbox 与文本形成完整 label 点击区；触控区域不低于 44px；状态不只靠颜色表达。 |
| UI-P2-11 | title-only 控件治理 | Playground、PromptLab、Scraper、NPI | 相关模板和渲染器 | 仅依赖 `title` 的 icon button 补 `aria-label` 和可见/hover tooltip；工具按钮不低于 32px。 |
| UI-P2-12 | 状态组件视觉回归 | loading、empty、error、toast、modal、progress | `tests/visual/visual.test.ts` 或新增状态截图测试 | 状态组件有桌面/移动截图；toast/progress 不只被 mask；normal 与 reduced-motion 各有一组关键状态验收。 |
| UI-P2-13 | CLS / loading 覆盖扩展 | SOPS、PPC、AMZ Hub、More、Playground | `tests/performance/verify-cls-all-pages.test.ts`、Playwright smoke | CLS 覆盖全部核心模块；390px 移动端无主内容挤压，加载态不造成明显布局跳动。 |
| UI-P2-14 | NPI 宽表移动治理 | NPI Tracker | `src/modules/sops/views/growth/npi_tracker/template.html`、页面样式 | 桌面保留高密度宽表；移动端按 SKU 卡片展示阶段、库存、价格、合规、决策字段，或提供显式横向滚动与冻结关键列。 |
| UI-P2-15 | PPC / Restricted Words 表格语义 | PPC 搜索词、Restricted Words | `src/modules/app_center/views/ppc_search_terms/template.html`、`src/modules/sops/views/growth/restricted_words/template.html` | 结果表补 caption / scope；排序、筛选、风险等级不只靠颜色；移动端有卡片摘要。 |
| UI-P2-16 | 长内容阅读节奏治理 | AMZ Quality、Email Templates、PPC Advertising、QA Maintenance | 对应 `template.html` | 正文 15px 至 16px、行高 1.6 至 1.75、桌面行宽 65 至 75 字符；章节锚点可跳转。 |
| UI-P2-17 | 小字号库存阈值治理 | 长文页、表格页、状态 badge | 模块模板与 CSS | `text-xs` 只用于 badge / metadata；正文、说明、表格主体、按钮文本不低于 14px；低于 12px 仅用于非关键信息。 |
| UI-P2-18 | 页面位置感知治理 | 动态模块页、深层 SOP / 工具页 | 动态壳层、侧边栏、顶部菜单 | 页面提供 breadcrumb / page context / `aria-current`；移动端侧栏关闭时仍显示当前模块和页面名。 |
| UI-P2-19 | 多步工具任务流提示 | Keyword Hunter、Scraper、AI Analysis、PromptLab | 对应 App Center 模块 | 展示当前阶段、下一步、返回路径和数据保留提示；跨步返回不静默丢失已导入数据。 |
| UI-P2-20 | 大文本输入区 label / helper / error 治理 | Keyword Hunter、PromptLab、PPC context、More Prompts | 对应模板和组件 | textarea / search / context 字段补 label、`aria-describedby`、helper 和字段级错误；placeholder 不再承担说明职责。 |
| UI-P2-21 | 折叠配置区语义治理 | Scraper、AI Analysis、PromptLab | 对应模板和 Alpine 组件 | 折叠面板触发器改为 button，维护 `aria-expanded` / `aria-controls`；目标卡片同步 `aria-pressed`。 |
| UI-P2-22 | 进度 / 分数 / 置信度语义治理 | 全局进度、AI Analysis、Scraper、Keyword Hunter | `index.html`、`notifications.ts`、`ai_analysis`、`scraper`、`keyword_hunter` | 确定性进度条有 `role="progressbar"` 和 `aria-valuenow`；分数 / 置信度 badge 有数值、等级文案、非颜色线索和状态截图。 |
| UI-P2-23 | Chart.js 图表可访问 fallback | AMZ Hub 图表页 | `src/modules/amz_hub/views/knowledge/*` | canvas 有 `aria-label` / `aria-describedby`；页面提供图表摘要、legend、tooltip 和数据表 fallback；视觉测试覆盖 chart 状态。 |
| UI-P2-24 | 高对比与暗色 token 清理 | 主页、AMZ Hub、NPI、PPC、共享组件 | 模块 CSS / 模板、`variables.css`、Chart.js 配置 | `bg-white`、`text-slate-*`、浅色 inline gradient、Chart.js 浅色网格迁移到语义 token；forced-colors smoke 覆盖导航、表单、badge、table、chart fallback。 |
| UI-P2-25 | 键盘可达性 smoke / 焦点回归 | 顶部导航、Mega Menu、概览卡片、筛选、折叠面板、弹窗、抽屉 | `tests/e2e`、`tests/visual/visual.test.ts` 或新增交互 smoke | Playwright 验证 Tab 顺序、Enter / Space 激活、Esc 关闭、焦点返回、无非预期 keyboard trap；同时断言 `aria-pressed`、`aria-expanded`、`aria-current` 与 DOM 状态一致。 |
| UI-P2-26 | emoji / 空状态 / 图片资产清理 | SOP 长内容、AMZ Hub、PromptLab 报告、PPC / Keyword Hunter 空状态 | 相关 `template.html`、`reportRenderer.ts`、空状态组件、图片资产目录 | 结构性状态 emoji 迁移到图标组件并保留文本；空状态截图覆盖 PPC、Keyword Hunter、More、模块加载失败；新增图片有 alt、width / height 或 aspect-ratio、lazy 策略和来源说明。 |
| UI-P2-27 | 字体 / CSS / 视觉稳定性 smoke | 首页、SOPS、App Center、PPC、Playground、AMZ Hub、More、PromptLab、Scraper、AI Analysis | `tests/performance`、`tests/visual/visual.test.ts`、Lighthouse 配置、Playwright smoke | 桌面和 390px 移动端验证 FCP、LCP、CLS、TBT、字体 fallback、图标可见、主 CSS 失败降级、模块 style-ready；覆盖 Font Awesome CDN 失败或本地化后的关键图标状态。 |
| UI-P2-28 | 浮层堆叠 / 滚动锁定 / safe-area smoke | modal、sheet、toast、loading、mega menu、搜索下拉、移动抽屉、sticky table | `tests/e2e`、`tests/visual/visual.test.ts` 或新增 overlay smoke | 桌面、390px 移动端、移动横屏分别验证浮层堆叠顺序、body 背景不滚动、Esc / 点击遮罩关闭、焦点返回、safe-area padding、sticky 表格不穿透弹窗。 |
| UI-P2-29 | 响应式断点 / 横屏 / 超宽屏 smoke | 首页、SOPS、App Center、PPC、Playground、AMZ Hub、More、PromptLab、Scraper、AI Analysis、NPI | `tests/visual/visual.test.ts`、`tests/e2e`、Lighthouse / Playwright 配置 | 390x844、430x932、667x375、844x390、900x800、1100x800、1440x900、1920x1080、2560x1440 覆盖核心路由；断言容器宽度、列数、横向滚动、固定宽度、截断可恢复和超宽屏留白。 |
| UI-P2-30 | AI 输出 / 导出 / Markdown smoke | PromptLab、AI Analysis、Keyword Hunter、Playground | `tests/visual/visual.test.ts`、`tests/e2e`、固定 mock 输出数据 | 固定 mock 覆盖 empty、loading、error、long output、Markdown 表格、列表、代码块、JSON viewer、长 Prompt、copy success / failure、download、print；减少对 `#final-prompt-output`、`#analysis-results`、`.result-card` 的 blanket mask。 |
| UI-P2-31 | 文案一致性 / 中英混排 / 状态文案 smoke | 全站文案、导航、设置、AI 工具、状态组件 | `tests/e2e`、`tests/visual/visual.test.ts`、静态扫描脚本 | 扫描术语变体、中文 ASCII 标点、placeholder-only、title-only、结构性 emoji 错误文案；固定 mock 覆盖 empty、loading、error、copy、download、export 和危险确认文案。 |
| UI-P2-32 | 设置面板 / 密钥 / 备份 / 危险操作 smoke | 系统设置、模型状态、本地数据、性能监控 | `tests/e2e`、`tests/visual/visual.test.ts`、静态扫描脚本 | 覆盖打开关闭、焦点陷阱、密钥显示按钮可访问名称、字段级错误、模型同步失败、代理测试、导入预览、导出文件、清空确认、移动抽屉和暗色 / 高对比截图。 |
| UI-P2-33 | 搜索 / 筛选 / 命令入口 smoke | 侧边栏、总览页、业务搜索、搜索历史、命令入口 | `tests/e2e`、`tests/visual/visual.test.ts`、静态扫描脚本 | 覆盖侧边栏搜索、概览筛选、App Center 搜索、Restricted Words 模式、PPC 动作搜索、Marketing Calendar 历史、More Prompts、全局命令入口、键盘选择、aria 状态、结果计数、空态、清空和移动端浮层截图。 |
| UI-P2-34 | 帮助 / 引导 / Tooltip / 学习路径 smoke | 总览指南、Scraper 策略指南、AI Analysis tooltip、样例数据、SOP 外链、应用内文档入口、可关闭提示 | `tests/e2e`、`tests/visual/visual.test.ts`、静态扫描脚本 | 覆盖使用指南、disclosure 语义、tooltip hover / focus / touch、`aria-describedby`、title-only 扫描、样例 / 真实数据切换、外链 `rel`、docs entry、“不再提示”恢复、移动端、暗色和高对比截图。 |
| UI-P2-35 | 历史 / 草稿 / 快照 / 恢复 smoke | Scraper 历史、PromptLab 草稿、Keyword Hunter 输入、PPC 设置、Deep Chat 会话、系统导入导出、危险删除 | `tests/e2e`、`tests/visual/visual.test.ts`、静态扫描脚本 | 覆盖历史快照加载 / 删除 / 清空、当前快照标记、草稿恢复 banner、配置恢复摘要、导入预览、导出文件、删除 undo、`window.confirm` 替代、键盘、移动端、暗色和高对比截图。 |

## 建议里程碑

| 里程碑 | 范围 | 完成定义 |
| --- | --- | --- |
| M1 | UI-P0-01 到 UI-P0-04 | 移动端核心路由可用，截图回归稳定。 |
| M2 | UI-P1-01 到 UI-P1-04 | 首页、路由加载、导航体验符合运营工作台定位。 |
| M3 | UI-P1-05 到 UI-P1-34 | 主视觉 token、横幅、卡片、徽章、标题结构、共享渲染器语义、状态反馈、弹窗语义、表格、长内容模板、概览页、导航契约、输入工作流、指标 / 图表 / 状态编码、主题契约、motion 契约、键盘 / 焦点契约、视觉资产 / 图标契约、视觉性能契约、层级 / 浮层 / 滚动契约、响应式断点 / 容器 / 密度契约、AI 输出 / 导出契约、文案 / 术语契约、系统设置契约、搜索发现契约、帮助学习契约和可恢复性契约完成第一轮收敛。 |
| M4 | UI-P2-01 到 UI-P2-35 | 表单、触控、对比度、动效、暗色截图、模板 label、状态组件、宽表、长内容、页面位置、多步任务流、输入错误态、进度 / 分数语义、图表 fallback、高对比清理、键盘 smoke、资产清理、视觉稳定性 smoke、浮层堆叠 smoke、响应式断点 smoke、AI 输出 smoke、文案一致性 smoke、设置面板 smoke、搜索发现 smoke、帮助学习 smoke 和可恢复性 smoke 进入持续门槛。 |

## 推荐验收命令

- `npm run css:audit`
- `npm run css:analyze`
- `npm run test:visual`
- 针对移动壳层补充 Playwright smoke：375、390、430、768px 覆盖首页 + SOPS + App Center + PPC + Playground + AMZ Hub + More。
- 针对概览页补充交互 smoke：筛选按钮同步 `aria-pressed`，结果计数变化，空态可见，卡片可通过键盘触发。
- 针对输入工作流补充状态 smoke：字段为空错误、上传错误、AI 执行 loading、成功、失败重试和字段级错误关联。
- 针对数据可视化补充 smoke：progressbar `aria-valuenow`、score / confidence / risk badge 可读文案、Chart.js canvas 描述关联和数据 fallback。
- 针对主题补充 smoke：`light` / `dark` / `auto` DOM 标记与 store 状态一致，system dark 和显式 dark 截图一致，forced-colors 下导航、表单、badge、table、chart fallback 可读。
- 针对动效补充 smoke：`data-animations="disabled"` 与 `prefers-reduced-motion` 下无装饰循环动画；loading、toast、modal、progress 在 normal / reduced-motion 下都有状态截图。
- 针对键盘路径补充 smoke：顶部导航、Mega Menu、概览卡片、筛选、折叠面板、弹窗、抽屉验证 Tab 顺序、Enter / Space、Esc、焦点返回和语义状态同步。
- 针对视觉资产补充 smoke：logo / favicon / header mark 来源一致，关键图标字体加载后可见，空状态模板截图稳定，结构性 UI 无 emoji；新增图片必须有 alt、尺寸和加载策略。
- 针对视觉性能补充 smoke：桌面和 390px 移动端覆盖 FCP、LCP、CLS、TBT、字体 fallback、图标可见、主 CSS 失败降级和模块 style-ready。
- 针对浮层堆叠补充 smoke：modal、sheet、toast、loading、mega menu、搜索下拉、移动抽屉、sticky table 验证 z-index 顺序、滚动锁定、背景不可交互、Esc / 遮罩关闭、焦点返回和 safe-area padding。
- 针对响应式补充 smoke：390、430、移动横屏、900、1100、1440、1920、2560 宽度覆盖核心路由，检查断点 token、容器宽度、网格列数、固定宽度、截断可恢复、横向滚动和超宽屏密度。
- 针对 AI 输出补充 smoke：PromptLab、AI Analysis、Keyword Hunter、Playground 使用固定 mock 覆盖 Markdown 标题 / 表格 / 列表 / 代码块、JSON viewer、长 Prompt、copy / download / print、空态、加载态和错误态。
- 针对文案补充 smoke：扫描 `AI智能`、`API端点`、`Prompt示例`、中文 ASCII 标点、placeholder-only、title-only 和结构性 emoji 错误文案；固定 mock 覆盖 loading / empty / error / copy / download / export / 危险确认文案。
- 针对设置补充 smoke：系统设置抽屉覆盖打开 / 关闭、焦点陷阱、焦点返回、API Key 显示按钮、字段级错误、模型同步失败、代理保存、导入预览、导出文件、清缓存、清空全部确认、性能监控入口、移动端和暗色 / 高对比截图。
- 针对搜索发现补充 smoke：侧边栏搜索、概览筛选、App Center 搜索、Restricted Words 搜索模式、PPC 动作搜索、Marketing Calendar 搜索历史、More Prompts、全局命令入口覆盖 label、清空、结果计数、空态、键盘选择、`aria-pressed` / `aria-selected`、移动端浮层和暗色 / 高对比截图。
- 针对帮助学习补充 smoke：Overview 使用指南、Scraper 策略指南、AI Analysis tooltip、PromptLab title-only 替代、PPC 样例数据、SOP 外部链接、应用内文档入口和“不再提示”恢复覆盖 disclosure 语义、`aria-describedby`、hover / focus / touch、外链 `rel`、移动端、暗色和高对比截图。
- 针对可恢复性补充 smoke：Scraper 历史快照、PromptLab 草稿、Keyword Hunter 输入恢复、PPC 设置恢复、Deep Chat 会话、系统导入导出、清空 / 删除确认、删除 undo、恢复 banner、键盘、移动端、暗色和高对比截图。
