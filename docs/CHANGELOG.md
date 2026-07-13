# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.0.5] - 2026-07-13

> 正式 GA。整合 `v3.0.4` 之后冻结线 `3.0.4-rc.1`…`rc.11` 的全部能力，并落地企业级发布治理。  
> 本版本取代误打的历史 tag `v3.0.5`（旧指向无 Release 的中间提交）。

### Added
- 企业级发布治理：`docs/RELEASE_POLICY.md`、Release Notes 模板、`SECURITY.md`
- 发版脚本 `npm run release:validate|notes|package` 与 GitHub Release 流水线（产物 zip / build-info / SHA256）
- 应用中心「最近继续」高密度 Resume Queue：上下文优先标题、fact chips、列数偏好与空状态引导
- `recentArtifactPresenter` 展示层与单元测试
- 共享剪贴板、SOP 模板、LLM JSON 工具与 Shared Capabilities Guide
- 共享确认弹窗与 Modal 开发指南；Keyword Hunter / Master Analysis / Deep Chat 等收敛确认逻辑
- App Center catalog / artifact envelope / workflow / workspace 服务与工作台能力
- 循环依赖检查、action/import/source 命名审计接入质量门禁
- Deep Chat 线程内联重命名、删除确认与 Keyword Hunter 快照删除确认

### Changed
- 应用版本号只读 `package.json`（经 Vite 注入），避免非 semver git tag 污染 UI
- 入口异步拆分：系统设置、domain shells、Font Awesome brands
- 生产路径统一结构化错误与 `app:` + kebab-case 事件命名
- 对齐部署 CSP `connect-src` 与 Amazon 站点清单
- GitHub Latest 通道规范：仅 GA 可 Latest；RC 必须 Pre-release
- 仓库 homepage 对齐生产域 `https://sops.hongecb.store`
- 冻结 `3.0.4-rc.*`；本版本为该线的正式收口 GA

### Fixed
- 应用矩阵分类筛选在生产包中不生效（`[hidden]` 被 display 覆盖）
- Alpine 设置面板懒加载注册竞态
- AppModal 打开态 host 不可见导致自动化无法识别
- Prettier 格式阻塞构建；css/lint 门禁与废弃 CSS 半径别名
- 剪贴板在无 `execCommand` 环境下的降级路径
- Sentry 加载方式与生产构建兼容性

## [3.0.4-rc.11] - 2026-07-12

> 版本线说明：曾误标为 `3.0.5` / `3.0.5-rc.*` / `3.0.6-rc.*`。按当前约定并入 `3.0.4` 预发布序列：`rc.8`–`rc.11`。

### Added
- 应用中心总览「最近继续」重做为高密度 Resume Queue：作业上下文优先标题、短类型标签、去重 fact chips、1/2/3 列偏好持久化与空状态快捷入口。
- 新增 `recentArtifactPresenter` 纯展示变换与对应单元测试，并补充设计规格文档。

### Changed
- 拆分 `SECURE_STORAGE_SECURITY_BOUNDARY` 常量，恢复 `secureStorage` 动态导入拆包；提高 Vite chunk 体积告警阈值以匹配已知 deferred `system-settings` 包。
- 优化入口加载：拆分系统设置、domain shells 与 Font Awesome brands 异步块。
- 同步应用内版本显示到 `3.0.4-rc.11`。
- 应用版本号改为只读 `package.json`，避免非 semver git tag（如 `latest`）污染 UI 版本展示。

### Fixed
- 修复 Alpine 设置面板在懒加载后的注册竞态。
- 修复阻塞 Vercel 构建的 Prettier 格式问题，并清理误入发布树的构建临时文件。
- 通过 CSS 变量命名与 ESLint 复杂度拆分，恢复 `css:audit` / `lint:warning-gate` 通过。

## [3.0.4-rc.10] - 2026-07-11

### Added
- 新增共享剪贴板、模板与 LLM JSON 工具，沉淀 Shared Capabilities Guide。
- 统一生产路径错误为 `ValidationError` / `SystemError` 等结构化错误，覆盖 PPC、History、Keyword Hunter、Deep Chat 等模块。

### Changed
- 将应用级事件命名统一为 `app:` + kebab-case。
- 对齐部署 CSP `connect-src` 与站点清单，覆盖 Amazon 全站点域名。
- 同步应用内版本显示到 `3.0.4-rc.10`。

### Fixed
- 修复应用中心总览「应用矩阵」分类筛选不生效：作者样式 `display:flex/grid` 覆盖了 `[hidden]`，改为 `.hidden` + 模块 CSS 强制隐藏。
- 修复共享剪贴板在无 `execCommand` 环境下的降级路径，并同步 Promptlab / Prompts 相关测试。
- 移除废弃 CSS 半径别名 `--radius-card` / `--radius-panel`。

## [3.0.4-rc.9] - 2026-07-10

### Added
- 新增共享确认弹窗组件，并补充 AppModal 与确认弹窗回归测试覆盖。
- 新增 Modal 开发指南，沉淀触发、焦点、关闭行为和测试约定。
- 新增 SOPS 共享模板模块、复制动作封装和页面复制工作流测试夹具。

### Changed
- 将 Keyword Hunter、Master Analysis、Deep Chat 等模块的确认逻辑收敛到共享确认弹窗。
- 将 SOPS 页面里的分散模板渲染与剪贴板反馈收敛到共享工具，减少页面重复实现。
- 更新页面架构审计以识别共享 SOP 模板模块。
- 同步应用内版本显示到 `3.0.4-rc.9`。

### Fixed
- 修复 AppModal 打开态 host 元素不可见导致浏览器自动化无法识别弹窗的问题，并稳定 NPI Tracker 移动端 Next Step smoke 覆盖。
- 替换多个 SOPS 页面里的 `alert` 复制反馈，统一成功与失败提示行为。
- 强化 NPI Tracker、Restricted Words、Prompt Library 和系统设置相关回归测试覆盖。

## [3.0.4-rc.8] - 2026-07-09

### Added
- 新增循环依赖检查脚本，统一处理 Vite `?url` 资源导入后再执行 Madge 审计。
- 整合 `v3.0.4-rc.1` 至 `v3.0.4-rc.7` 的 App Center 工作台、Deep Chat、Keyword Hunter、PPC Search Terms、系统设置和质量门禁更新。

### Changed
- 归档历史预发布检查、UI 审计、安全审计和技术债务报告，收敛文档索引与项目结构说明。
- 将 Deep Chat bundle 固定输出到 `assets/vendor/deepChat.bundle.js`，减少构建产物散列变动对加载器和循环依赖检查的影响。
- 同步应用内版本显示到 `3.0.4-rc.8`。

### Fixed
- 调整 Sentry 加载方式，按浏览器 SDK 和 core API 显式映射监控方法，提升生产构建兼容性。

## [3.0.4-rc.7] - 2026-07-09

### Added
- Deep Chat 线程支持内联重命名，减少进入管理菜单的来回切换。

### Changed
- 同步应用内版本显示到 `3.0.4-rc.7`。

## [3.0.4-rc.6] - 2026-07-09

### Added
- 新增 Deep Chat 删除确认弹窗，替换原生 `confirm()`，支持取消、Esc、点击遮罩关闭与「不再询问」持久化。
- 新增 Keyword Hunter 快照删除确认弹窗，支持取消、Esc、点击遮罩关闭与「不再询问」持久化。
- 补充删除确认弹窗与快照删除流程的单元测试。

### Changed
- 同步应用内版本显示到 `3.0.4-rc.6`。

## [3.0.4-rc.5] - 2026-07-08

### Added
- App Center 概览最近项（recent items）新增图标盒与 `RECENT_ARTIFACT_ICONS` 图标映射，区分不同产物类型。
- 新增相对/绝对时间格式化工具，最近项时间以「刚刚 / N 分钟前 / N 小时前 / N 天前…」展示，并保留绝对时间 tooltip。

### Changed
- 重构最近项条目结构：图标盒 + 标题（标题 + 相对时间）+ 元信息 + 操作按钮，补充 hover/focus 过渡、reduced-motion 与响应式微调。
- 同步应用内版本显示到 `3.0.4-rc.5`。

### Fixed
- 改进最近项 `aria-label`（类型 · 标题 · 相对时间），提升可访问性。
- 更新 XSS 扫描报告时间戳。

## [3.0.4-rc.4] - 2026-07-08

### Added
- 新增 App Center catalog、artifact envelope、workflow definitions 和 workspace context 服务。
- 新增 App Center 工作台评审文档和对应单元测试覆盖。

### Changed
- App Center 概览改为 catalog-driven 渲染，减少模板内硬编码。
- PPC Search Terms 增加 action-list 产物导出和 recent UI 衔接。
- PromptLab、Keyword Hunter 和历史记录服务接入新的产物/最近上下文。
- 同步应用内版本显示到 `3.0.4-rc.4`。

### Fixed
- 补充 App Center catalog/workflow/workspace、Keyword Hunter 快照、PPC UI 和历史记录回归覆盖。

## [3.0.4-rc.3] - 2026-07-08

### Added
- 新增 action name、import path 和 source naming 质量审计，并接入 `ci:quality`。
- 新增 SOPS owner field 共享处理工具和测试覆盖。

### Changed
- 统一 TypeScript、Vite、Vitest 和源码导入到单一 `@/` 项目别名。
- 内部私有/工具方法去除前导下划线，并同步调用点、测试和 source-name 审计规则。
- 同步应用内版本显示到 `3.0.4-rc.3`。

### Fixed
- 对齐核心工具、组件、路由、bootstrap、服务和单元测试的内部命名约定。
- 收紧源码命名、导入路径和 action 命名约定，减少后续回归风险。

## [3.0.4-rc.2] - 2026-07-07

### Added
- 系统设置面板新增原生 `<details>/<summary>` 折叠体验和默认折叠状态测试覆盖。

### Changed
- 移除 Deep Chat 未使用的 provider status UI，并调整配置刷新与模型选择交互。
- Keyword Tracker 路由和服务命名收敛为 Keyword Hunter，刷新输入、分析、流程模板与样式。
- Deep Chat 资源收敛到功能路由目录，并加强请求生命周期、预算、prompt 选择和线程历史行为。
- PPC Search Terms 更新设置、Agent 分析流、结果控件和相关单元/E2E/视觉测试。
- 同步应用内版本显示到 `3.0.4-rc.2`。

### Fixed
- 对齐 Keyword Hunter 快照驱动流程、Deep Chat 发送/预览和 release smoke 覆盖。
- 刷新 App Center workflow 相关路由、manifest、action registry 与视觉回归测试。

## [3.0.4-rc.1] - 2026-07-07

### Added
- 新增运行时策略服务和工具策略服务，统一模型选择、超时、缓存、批处理和默认提供商设置。
- 系统设置新增工具策略、运行时控制、数据/备份、诊断和危险操作面板。
- 新增开发者诊断服务与设置面板，支持性能、事件调试、错误/分析、功能开关和日志级别开关。

### Changed
- Keyword Hunter、Master Analysis、Deep Chat、PPC Search Terms 和 Scraper 接入策略设置。
- 启动时应用开发者诊断配置，并将 eventLogger 事件日志改为受调试开关门控。
- 同步应用内版本显示到 `3.0.4-rc.1`。

### Fixed
- 补充和更新系统设置、策略服务、LLM 行为、存储、Keyword Hunter、PPC 与 release smoke 测试覆盖。
- 修复监控导入兼容、存储键和 XSS 报告时间戳相关维护项。

## [3.0.4] - 2026-07-06

### Added
- 新增 Keyword Hunter AI 翻译模型选择器和界面刷新。
- 新增 AI 功能深度优化建议文档。

### Changed
- Deep Chat/Playground 请求预算改为动态计算，并延续 rc 系列的线程、搜索、本地化和 prompt 持久化体验。
- 整合 `v3.0.3-rc.7` 至 `v3.0.3-rc.23` 的监控、安全门禁、PPC 分析器、Keyword Hunter、PromptLab、Settings 和 UI 可访问性改进。
- 同步应用内版本显示到 `3.0.4`。

### Fixed
- 修复 LLM abort 边界行为和动态请求预算回归。
- 补充 Keyword Hunter 翻译模型选择与 LLM 行为测试覆盖。

## [3.0.3-rc.23] - 2026-07-06

### Added
- 新增 Sentry SDK、监控初始化、secret leak scanner 和安全 CI 门禁。
- 新增本地 flag icons、Deep Chat Search Chats 弹窗和线程菜单 UI。
- 新增 release smoke 覆盖、PPC 分析器状态测试和安全审计报告。

### Changed
- Deep Chat 完成界面本地化、历史线程过滤和 prompt 选择持久化。
- 优化 PromptLab、Settings、Playground 渲染器、Sidebar 和 loading/skeleton 体验。
- PPC Search Terms 分析器改用回调驱动 UI，并保留分析状态。
- 同步应用内版本显示到 `3.0.3-rc.23`。

### Fixed
- 修复 Keyword Hunter 可访问性、拖拽交互、追踪服务和分析流程状态问题。
- 加固 release 安全门禁、CSP 和 secret 泄露检查。
- 修复监控、存储、模块加载、图片懒加载和模板可访问性回归。

## [3.0.3-rc.22] - 2026-07-06

### Added
- 新增安全审计报告、release smoke E2E 覆盖和持久化清洗测试。
- 新增 AppModal 独立样式文件与 Restricted Words 样式入口。

### Changed
- 收紧 LLM 网关、CSP/headers、系统设置和 new_api 直连配置。
- 使用系统字体并调整 Deep Chat、Restricted Words 与代码高亮样式。
- 同步应用内版本显示到 `3.0.3-rc.22`。

### Fixed
- 修复 HttpService Abort/timeout/retry 行为和性能包装重复执行风险。
- 修复 EventBus 错误记录上限、可选服务监控清理和事件解绑元数据。
- 修复持久化中间件对异常 payload 的清洗与恢复。

## [3.0.3-rc.21] - 2026-07-05

### Added
- 新增 async DI、`loaderPath` API 与 SafeTemplateLoader。
- 新增页面架构审计、预发布检查文档和模板实现指南。
- 新增 PC 端设计 token、动效 CSS 和页面架构收敛测试。

### Changed
- 收敛 PC 端模块、模板、空状态和概览列表视图。
- 为模板按钮补充显式类型、ARIA 和可访问性测试覆盖。
- 同步应用内版本显示到 `3.0.3-rc.21`。

### Fixed
- 修复模块错误处理、卸载流程、Loader 和 StorageService 安全性。

## [3.0.3-rc.20] - 2026-07-05

### Added
- 新增导航队列处理与可折叠概览交互。
- PPC Search Terms 新增阈值设置面板。
- Deep Chat 启用 prompt panel。

### Changed
- 重命名 Keyword Hunter 标签并格式化相关样式与 TypeScript。
- 刷新 App Center 与 SOPS 主题体验。
- 优化报告 UI、PPC 导入流程和结果布局。
- 同步应用内版本显示到 `3.0.3-rc.20`。

### Fixed
- 修复报告区块模板嵌套问题。

## [3.0.3-rc.19] - 2026-07-04

### Added
- 新增 LLM provider 与 Scraper proxy 配置。
- SOPS 工具页新增统一剪贴板辅助能力。

### Changed
- App Center 切换到 DeepSeek 蓝主题，并更新主题色、图标和 mega-menu 语义类名。
- 重构 Master Analysis、Promptlab、Scraper 和 App Center 概览模板与样式。
- 规范引号并压缩 CSS 格式。
- 同步应用内版本显示到 `3.0.3-rc.19`。

### Fixed
- 修复 NPI Tracker mock data 类型与 App Center 相关模板测试覆盖。

## [3.0.3-rc.18] - 2026-07-04

### Added
- 新增认证路由守卫与 API endpoint 安全测试。
- 新增 2026-07-04 安全审计报告与 CI 质量门禁说明。

### Changed
- 强化 CSP、SafeRenderer 和安全工具处理，减少渲染与内联脚本风险。
- 收紧 LLM secret 处理并移除旧 timeout wrapper。
- 将 Floating Workbench 命名统一回 App Center。
- 同步应用内版本显示到 `3.0.3-rc.18`。

### Fixed
- 修复本地存储、安全渲染、PPC 导入和路由守卫相关回归覆盖。

## [3.0.3-rc.17] - 2026-07-04

### Added
- Deep Chat 增加 pending assistant 文案和打字机反馈。
- Home 页面新增 Workbench 入口。
- Scraper 导入面板增加导入状态与可访问性回归覆盖。

### Changed
- 规范化 App Center 路由命名为 kebab-case，并补充历史路由别名。
- 使用设计 token 调整 welcome 与 app_center 样式。
- 强化卡片、弹窗、导航、模板控件和 decorative controls 的 ARIA/focus/accessibility 支持。
- 同步应用内版本显示到 `3.0.3-rc.17`。

### Fixed
- 稳定 Deep Chat 请求生命周期、Scraper 模板可访问性和导航页面入场动画测试。

## [3.0.3-rc.16] - 2026-07-03

### Added
- 新增延迟路由/模块加载骨架，提升页面切换反馈。
- 新增路由审计脚本，覆盖 manifest 路径与导航配置。

### Changed
- 路由系统迁移到 routeId 优先 API，并支持 manifest route paths 与 redirects。
- PPC Search Terms 迁移到 PPC Tools 目录结构。
- Deep Chat 拆分为 controller、配置、样式、预览和渲染模块。
- 归档历史文档与本地工具产物，减少仓库噪声。
- 同步应用内版本显示到 `3.0.3-rc.16`。

### Removed
- 移除 LegacyAdapter、全局 legacy 路由 API 和旧 routeEvents 入口。

## [3.0.3-rc.15] - 2026-07-03

### Added
- 新增功能开关服务及路由守卫集成。
- 新增 AI Analysis 端到端 fixture，覆盖沉浸式翻译运行恢复。

### Changed
- 拆分 PPC Search Terms 动作、Agent、分析、导入导出、规则、设置和 UI 模块。
- 持久化沉浸式翻译运行记录。
- 放宽 Promptlab/Scraper 性能端到端阈值并强化等待逻辑。
- 同步应用内版本显示到 `3.0.3-rc.15`。

### Fixed
- 强化 LLM streaming 响应解析与空响应处理。

## [3.0.3-rc.14] - 2026-07-03

### Changed
- 刷新 Keyword Hunter 分析、输入页和快照服务测试覆盖。
- 清理历史复杂度/技术债务报告，更新架构债务与 Kiro 状态文档。
- 强化 Promptlab 视觉 readiness 状态与 E2E helper。
- 同步应用内版本显示到 `3.0.3-rc.14`。

### Fixed
- 稳定 Keyword Hunter、Promptlab 和 Scraper 端到端页面对象与等待逻辑。

## [3.0.3-rc.13] - 2026-07-03

### Added
- Deep Chat 增加发送流程端到端测试、停止遮罩和请求生命周期覆盖。
- 新增主题系统文档、CSS 性能/调试工具测试和质量报告沉淀。

### Changed
- 持久化分析运行记录，处理空 LLM 响应并提升请求预算控制。
- 拆分 AI Analysis、PPC Search Terms、Scraper import、Prompt Library 与 Keyword Highlight 热点模块。
- 整合 CSS token、共享 keyframes、badge/icon 样式和质量工具。
- 强化 Promptlab 页面选择器、DNA 提取流程和 E2E helper。
- 同步应用内版本显示到 `3.0.3-rc.13`。

### Fixed
- 修复 Deep Chat 停止竞态并稳定 Promptlab 端到端测试。
- 更新 Deep Chat stop button 选择器和断言，降低 Playwright 超时与并发抖动。

## [3.0.3-rc.12] - 2026-07-02

### Added
- Keyword Hunter 输入页新增历史快照面板与快照服务，支持保存、恢复和删除分析状态。
- 为 Keyword Hunter 快照服务、输入页和 Scraper 当前数据渲染补充单元测试。

### Changed
- Keyword Hunter 分析结果改为自动归档，减少手动快照操作和跨步骤状态丢失。
- Scraper 页面挂载时渲染当前采集数据。
- 同步应用内版本显示到 `3.0.3-rc.12`。

## [3.0.3-rc.11] - 2026-07-01

### Added
- 新增 AMZ_HUB 成熟期运营视图。
- 新增质量报告、技术债务报告和知识库评审执行报告。

### Changed
- 统一 AMZ_HUB 与 SOPS 内容、元数据和页面脚手架。
- 调整 AMZ_HUB 模块命名和导航内容呈现。
- 优化 AI 翻译 UI。
- 同步应用内版本显示到 `3.0.3-rc.11`。

### Fixed
- 修复暗色 tile 对比度和标签重叠问题。

## [3.0.3-rc.10] - 2026-06-30

### Added
- 新增 Vercel 部署配置和静态资源路由兼容设置。
- 新增 Master Analysis 报告身份指纹服务及相关单元测试。

### Changed
- AI Analysis 报告绑定 scraped-data 指纹，减少旧报告与新采集数据混用。
- Promptlab 拆分 readiness 状态并补充 SEO context。
- 同步应用内版本显示到 `3.0.3-rc.10`。

### Fixed
- 将构建配置文件从符号链接转换为常规文件，提升 Vercel 构建兼容性。

## [3.0.3-rc.9] - 2026-06-13

### Changed
- NPI Tracker 改用 `data-action` 操作绑定，并更新页面对象和端到端测试。
- Deep Chat prompt preview 支持 pointer-aware 交互。
- 同步应用内版本显示到 `3.0.3-rc.9`。

### Fixed
- 为 NPI Tracker 高风险操作增加确认弹窗覆盖。
- 放宽表格渲染耗时断言到 5000ms，降低环境抖动导致的误报。

## [3.0.3-rc.8] - 2026-06-12

### Added
- 新增 Card、Callout、Workbench UI 审计脚本和 `ui:audit` 聚合命令。
- 新增页面进入动画工具和使用指南。
- 新增回归测试审计脚本，用于汇总覆盖率、Playwright 结果和显式 skip。

### Changed
- 优化卡片、工作台和多个模块页面的边框、动效与视觉一致性。
- 将报告、站点标识和状态文案中的结构性 emoji 替换为文本或 Font Awesome 图标。
- 同步应用内版本显示到 `3.0.3-rc.8`。

### Fixed
- 稳定 Restricted Words E2E 的导航、搜索和详情断言。

## [3.0.3-rc.7] - 2026-06-12

### Changed
- 优化 Master Analysis 的 AI Analysis、Scraper 和 Promptlab 工作流界面。
- 同步应用内版本显示到 `3.0.3-rc.7`。

### Fixed
- 新增统一确认弹窗并接入 Scraper 数据操作流程，降低误清空和误覆盖风险。
- 更新 Scraper 端到端测试和页面对象以匹配新的确认交互。

## [1.0.0] - 2026-03-22

### Added
- 完整的设计令牌系统
  - 300+ 个设计令牌统一管理
  - 自动生成 CSS 变量、Tailwind 配置和 TypeScript 类型
  - 17 种颜色方案，11 级梯度
- 依赖注入容器系统
  - 核心服务和业务服务的集中管理
  - 服务生命周期管理
- 模块化架构
  - BaseModule 基类提供统一生命周期
  - 自动资源清理
  - 模块懒加载支持
- 路由系统
  - 基于 Navigo 的现代化路由
  - 路由预加载
  - 模块生命周期集成
- 完整的测试套件
  - Vitest 单元测试
  - Playwright E2E 测试
  - 性能测试
  - 视觉回归测试
- 代码质量工具
  - ESLint 代码检查
  - Prettier 代码格式化
  - TypeScript 严格模式
  - 技术债务扫描工具
  - CSS 变量审查和迁移工具
- 安全特性
  - XSS 防护
  - CSRF 防护
  - 内容安全策略（CSP）
  - 安全审计工具

### Changed
- 采用 Vite 作为构建工具
- 使用 Alpine.js 作为响应式框架
- 使用 Tailwind CSS 作为 CSS 框架
- 使用 Zustand 进行状态管理

### Architecture
- 实现事件总线系统（EventBus）
  - 替代 window.dispatchEvent
  - 类型安全的事件系统
  - 内存泄漏检测
- 实现结构化错误处理
  - ValidationError - 验证错误
  - ApiError - API 错误
  - BusinessError - 业务逻辑错误
  - SystemError - 系统错误
- 实现 StorageService
  - 类型安全的 localStorage 封装
  - 自动序列化/反序列化
- 实现 Logger 服务
  - 统一的日志记录
  - 日志级别控制
  - 性能监控集成

### Documentation
- 添加 CLAUDE.md 开发指南
- 添加 CSS 架构系统文档
- 添加最佳实践文档
- 添加 API 文档
- 添加测试指南
- 添加故障排查指南

### Performance
- CSS 代码分割
- 模块懒加载
- 资源压缩（Gzip + Brotli）
- Tree Shaking
- 关键 CSS 内联
- 图片懒加载
- 路由预加载

### Technical Debt
- 完成错误处理标准化（100%）
- 完成内存泄漏修复（100%）
- 完成事件机制迁移（56%）
- 架构债务整体完成率：79%

## [0.1.0] - 2025-12-01

### Added
- 初始项目结构
- 基础模块系统
- 基础路由系统
- 基础样式系统

---

## 版本说明

### 版本号规则
- **主版本号（Major）**: 不兼容的 API 修改
- **次版本号（Minor）**: 向下兼容的功能性新增
- **修订号（Patch）**: 向下兼容的问题修正

### 变更类型
- **Added**: 新增功能
- **Changed**: 功能变更
- **Deprecated**: 即将废弃的功能
- **Removed**: 已移除的功能
- **Fixed**: 问题修复
- **Security**: 安全相关修复

---

**维护者**: sops 开发团队  
**最后更新**: 2026-04-17
