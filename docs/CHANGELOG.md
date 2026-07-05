# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 新增 CBA 网关提供商支持
- 新增 KR 网关提供商和 Anthropic 适配器
- 新增 ChatAnywhere 支持
- 新增 Cloudflare 环境部署脚本
- 新增 NEW/CPA 网关占位符到环境文件

### Changed
- 替换旧版网关为 new_api 和 cpa
- 更新 CB-E 网关 URL 为 sds.dpdns.org
- 使用 chatanywhere.org 并修复 OpenAI 域名
- 集中化 CORS 头部并优化响应

### Fixed
- 修复 CSS 构建和 API 认证问题（Cloudflare Pages）
- 修复 Alpine.js `$cleanup` 生命周期钩子错误
- 修复 Keyword Hunter 路由路径错误
- 修复最小化按钮不可见问题

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
