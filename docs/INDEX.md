# 项目文档索引

本文档提供了 SOPs 项目所有文档的索引和导航。

---

## 📚 核心文档

### 入门指南
- [README.md](../README.md) - 项目概览和快速开始
- [运营作业系统落地计划](./OPERATING_SYSTEM_ROADMAP.md) - 产品收敛、作业闭环和阶段落地计划
- [项目结构审查](./PROJECT_STRUCTURE.md) - 当前目录职责、清理规则和归档边界
- [CLAUDE.md](../CLAUDE.md) - Claude Code 开发指南
- [CHANGELOG.md](./CHANGELOG.md) - 项目变更日志
- [CONTRIBUTING.md](../.kiro/CONTRIBUTING.md) - 贡献指南

### 开发文档
- [最佳实践](./development/best-practices.md) - 开发最佳实践
- [开发指南](./development/CLAUDE.md) - 详细的开发指南
- [页面实现模板规范](./guides/modules/page-implementation-templates.md) - 按页面分类约束模块入口、加载、DI 和 CSS 策略

---

## 🎨 CSS 架构

### CSS 文档
- [CSS 架构快速开始](./guides/css/CSS-ARCHITECTURE-README.md) - 5 分钟快速上手
- [CSS 架构指南](./guides/css/css-architecture-guide.md) - 完整的 CSS 架构文档
- [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md) - 主题分层、token 来源、组件视觉底线和验收规则
- [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md) - 视觉归一化、颜色映射和 welcome banner 开发规范
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md) - 页面进入动画审计、设计标准和接入规范
- [CSS 快速参考](../src/css/QUICK-REFERENCE.md) - CSS 变量快速查询
- [CSS README](../src/css/README.md) - CSS 目录说明

---

## 🔧 API 文档

### 核心 API
- [AlpineRegistry](./api/AlpineRegistry.md) - Alpine.js 组件注册系统
- [SafeModuleLoader](./api/SafeModuleLoader.md) - 安全模板加载器（历史名）
- [SafeRenderer](./api/SafeRenderer.md) - 安全渲染器

---

## 🧪 测试文档

### 测试指南
- [测试 README](../tests/README.md) - 测试概览
- [测试指南](../tests/TEST_GUIDE.md) - 详细测试指南
- [P0 测试指南](../tests/P0_TEST_GUIDE.md) - P0 级别测试
- [测试执行计划](../tests/TEST_EXECUTION_PLAN.md) - 测试执行计划
- [测试报告指南](../tests/REPORT_GUIDE.md) - 测试报告编写
- [测试团队架构](../tests/TEST_TEAM_ARCHITECTURE.md) - 测试团队组织

### E2E 测试
- [E2E 测试 README](../tests/e2e/README.md) - E2E 测试文档
- [Playwright 并行执行](./testing/playwright-parallel-execution.md) - 并行测试指南
- [Lighthouse CI 指南](./testing/lighthouse-ci-guide.md) - 性能测试

### 调试和诊断
- [调试 README](../tests/debug/README.md) - 调试工具
- [诊断 README](../tests/diagnose/README.md) - 诊断工具

---

## 📖 使用指南

### 功能指南
- [DNA Extractor 指南](./guides/dna-extractor-guide.md) - DNA 提取器使用
- [Promptlab Confidence 用户指南](./guides/promptlab-confidence-user-guide.md) - Promptlab 置信度功能
- [部署指南](./DEPLOYMENT.md) - Cloudflare Pages 静态部署与 new-api 直连说明
- [命名验证器 README](./guides/naming-validator/naming-validator-README.md) - 命名验证工具
- [命名验证器使用](./guides/naming-validator/naming-validator-USAGE.md) - 使用说明

---

## 🔍 故障排查

### 排查指南
- [故障排查指南](./troubleshooting/troubleshooting-guide.md) - 常见问题解决
- [Confidence 故障排查](./troubleshooting/confidence-troubleshooting.md) - Confidence 功能问题

---

## 🏗️ 架构文档

### 架构债务
以下 `.kiro/arch-debt/` 文档是早期架构债务规划和执行快照。当前残留技术债以 [技术债务审计报告](./TECH_DEBT_AUDIT.md) 和实际脚本输出为准。

- [架构债务 README](../.kiro/arch-debt/README.md) - 架构债务管理
- [债务清单](../.kiro/arch-debt/debt-list.md) - 技术债务列表
- [修复进度](../.kiro/arch-debt/progress.md) - 修复进度跟踪
- [修复计划](../.kiro/arch-debt/plan.md) - 修复计划
- [批次 3 计划](../.kiro/arch-debt/batch-3-plan.md) - 第三批修复计划
- [事件命名统一](../.kiro/arch-debt/event-naming-unification.md) - 事件命名规范
- [内存泄漏分析](../.kiro/arch-debt/memory-leak-analysis.md) - 内存泄漏问题
- [内存泄漏修复计划](../.kiro/arch-debt/memory-leak-fix-plan.md) - 修复方案
- [总结报告](../.kiro/arch-debt/summary-report.md) - 架构债务总结

### 项目总结
- [项目总结](../.kiro/PROJECT_SUMMARY.md) - BUG 修复项目总结

---

## 🎯 需求和设计

### 需求文档
位于 `.kiro/specs/` 目录：

- **App Center 架构统一**
  - [需求](../.kiro/specs/app-center-architecture-unification/requirements.md)
  - [设计](../.kiro/specs/app-center-architecture-unification/design.md)
  - [任务](../.kiro/specs/app-center-architecture-unification/tasks.md)

- **App Center 概览**
  - [需求](../.kiro/specs/app-center-overview/requirements.md)
  - [设计](../.kiro/specs/app-center-overview/design.md)
  - [任务](../.kiro/specs/app-center-overview/tasks.md)

- **构建警告修复**
  - [Bug 修复](../.kiro/specs/build-warnings-fix/bugfix.md)

- **代码质量改进**
  - [README](../.kiro/specs/code-quality-improvement/README.md)
  - [计划](../.kiro/specs/code-quality-improvement/plan.md)
  - [执行状态](../.kiro/specs/code-quality-improvement/execution-status.md)
  - [进度跟踪](../.kiro/specs/code-quality-improvement/progress-tracker.md)
  - [快速开始](../.kiro/specs/code-quality-improvement/quick-start.md)
  - [自动化策略](../.kiro/specs/code-quality-improvement/automation-strategy.md)
  - [最终报告](../.kiro/specs/code-quality-improvement/FINAL-REPORT.md)
  - [总结](../.kiro/specs/code-quality-improvement/SUMMARY.md)
  - 批次总结（6-13）

- **HTML/CSS 命名优化**
  - [需求](../.kiro/specs/html-css-naming-optimization/requirements.md)
  - [设计](../.kiro/specs/html-css-naming-optimization/design.md)
  - [任务](../.kiro/specs/html-css-naming-optimization/tasks.md)

- **Master Prompt 分析 UX 优化**
  - [需求](../.kiro/specs/master-prompt-analysis-ux-optimization/requirements.md)
  - [设计](../.kiro/specs/master-prompt-analysis-ux-optimization/design.md)
  - [任务](../.kiro/specs/master-prompt-analysis-ux-optimization/tasks.md)

- **Master Prompt Widget 系统重构**
  - [需求](../.kiro/specs/master-prompt-widget-system-refactor/requirements.md)
  - [设计](../.kiro/specs/master-prompt-widget-system-refactor/design.md)
  - [任务](../.kiro/specs/master-prompt-widget-system-refactor/tasks.md)

- **微交互动画**
  - [需求](../.kiro/specs/micro-interaction-animations/requirements.md)
  - [设计](../.kiro/specs/micro-interaction-animations/design.md)
  - [任务](../.kiro/specs/micro-interaction-animations/tasks.md)

- **项目优化**
  - [任务](../.kiro/specs/project-optimization/tasks.md)

- **系统稳定性优化**
  - [需求](../.kiro/specs/system-stability-optimization/requirements.md)
  - [设计](../.kiro/specs/system-stability-optimization/design.md)

---

## 🎨 设计文档

### 设计相关
位于 `.kiro/design/` 目录：

- [README](../.kiro/design/README-VISUAL-OPTIMIZATION.md) - 视觉优化说明
- [快速开始](../.kiro/design/QUICKSTART-VISUAL-OPTIMIZATION.md) - 快速开始指南
- [完成报告](../.kiro/design/COMPLETION-REPORT.md) - 完成报告
- [视觉优化计划](../.kiro/design/welcome-visual-optimization-plan.md)
- [视觉优化总结](../.kiro/design/welcome-visual-optimization-summary.md)
- [视觉对比](../.kiro/design/welcome-banner-visual-comparison.md)
- [配色方案](../.kiro/design/welcome-banner-color-scheme.md)
- [项目总结](../.kiro/design/welcome-banner-project-summary.md)
- [快速参考](../.kiro/design/welcome-banner-quick-reference.md)
- [重构报告](../.kiro/design/welcome-banner-refactor-report.md)

---

## 🤖 代理文档

### 代理系统
位于 `.kiro/agents/` 目录：

- [代理 README](../.kiro/agents/README.md) - 代理系统说明
- [架构债务 PM](../.kiro/agents/arch-debt-pm.md) - 架构债务项目经理
- [代码审计师](../.kiro/agents/code-auditor.md) - 代码审计代理
- [重构工程师](../.kiro/agents/refactor-engineer.md) - 重构工程师代理
- [UI/UX 优化器](../.kiro/agents/ui-ux-optimizer.md) - UI/UX 优化代理

---

## 📊 报告文档

### 当前质量报告
- [CI 质量门禁](./CI-QUALITY-GATES.md) - 当前 CI 安全与质量标准，含 warning gate 基线
- [技术债务审计报告](./TECH_DEBT_AUDIT.md) - 当前残留债务、验证命令和过期报告校正
- [XSS 风险扫描报告](./XSS_SCAN_REPORT.md) - 当前安全扫描输出

### 归档报告
- [质量与技术债归档](./archive/quality/README.md) - 已完成的构建修复与 P0 技术债报告
- [知识库评审归档](./archive/knowledge-review/README.md) - 已完成的知识内容评审与整改报告
- [视觉审计归档](./archive/ui-audit/README.md) - 已完成的视觉审计、welcome banner 修复和历史 UX backlog

### 修复报告
- [Alpine 清理修复](../.kiro/fix-reports/alpine-cleanup-fix-2026-03-15.md) - Alpine.js 修复报告

### 测试报告
- [Bug 修复验证](../.kiro/test-reports/bug-fix-verification-2026-03-15.md) - Bug 修复验证报告

### 质量控制
- [代码质量检查器](../.kiro/steering/code-quality-checker.md) - 质量检查工具

---

## 📸 截图文档

- [截图 README](./screenshots/README.md) - 截图管理说明

---

## 🔗 快速链接

### 常用文档
- [快速开始](../README.md#快速开始)
- [开发命令](../README.md#可用命令)
- [CSS 架构](./guides/css/CSS-ARCHITECTURE-README.md)
- [测试指南](../tests/TEST_GUIDE.md)
- [故障排查](./troubleshooting/troubleshooting-guide.md)

### 开发资源
- [最佳实践](./development/best-practices.md)
- [代码规范](../CLAUDE.md#development-practices)
- [提交规范](../.kiro/CONTRIBUTING.md#提交规范)
- [架构概览](../CLAUDE.md#architecture-overview)

---

## 📝 文档维护

### 文档更新指南

1. **保持同步** - 代码变更时同步更新文档
2. **清晰简洁** - 使用简单明了的语言
3. **提供示例** - 包含代码示例和截图
4. **及时更新** - 定期检查和更新过时内容

### 文档贡献

欢迎贡献文档！请参考 [贡献指南](../.kiro/CONTRIBUTING.md#文档指南)。

---

**最后更新**: 2026-07-05
**维护者**: sops 开发团队
