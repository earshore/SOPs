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
