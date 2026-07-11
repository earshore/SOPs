# 项目文档索引

本文档只维护当前可作为开发依据的文档入口。阶段性计划、一次性审计和历史执行记录请从归档入口查阅，不应直接作为当前任务清单。

---

## 当前入口

- [项目 README](../README.md) - 项目概览、快速开始和常用命令。
- [运营作业系统落地计划](./OPERATING_SYSTEM_ROADMAP.md) - 产品收敛、作业闭环和阶段落地计划。
- [项目结构审查](./PROJECT_STRUCTURE.md) - 当前目录职责、清理规则和归档边界。
- [贡献指南](../.kiro/CONTRIBUTING.md) - 提交流程和协作约定。
- [变更日志](./CHANGELOG.md) - 发布与变更记录。

## 质量与安全

- [CI 质量门禁](./CI-QUALITY-GATES.md) - 当前 CI 安全与质量标准。
- [技术债务审计报告](./TECH_DEBT_AUDIT.md) - 当前残留债务、验证命令和后续触发条件。
- [XSS 风险扫描报告](./XSS_SCAN_REPORT.md) - 由安全扫描工具持续更新的当前扫描输出。

## 开发规范

- [系统稳定性最佳实践](./development/best-practices.md) - 基础设施、安全渲染、错误处理和测试实践。
- [状态同步最佳实践](./development/state-sync-best-practices.md) - Alpine 与 Zustand 状态同步规范。
- [Zustand 迁移指南](./development/zustand-migration-guide.md) - 旧 StateManager 到 Zustand 的迁移参考。
- [页面实现模板规范](./guides/modules/page-implementation-templates.md) - 页面入口、加载、DI 和 CSS 策略约束。
- [模态框开发规范指南](./MODAL_DEVELOPMENT_GUIDELINES.md) - 弹窗选型、实现、可访问性、测试与验证门禁。
- [共享能力复用指南](./SHARED_CAPABILITIES_GUIDE.md) - 页面壳、剪贴板、LLM JSON、Overview、站点映射等高回报轮子。
- [AI 辅助开发上下文](./development/CLAUDE.md) - 供 AI 工具使用的项目上下文。

## 功能指南

- [部署指南](./DEPLOYMENT.md) - Cloudflare Pages 静态部署与 new-api 直连说明。
- [DNA 提取器使用指南](./guides/dna-extractor-guide.md)
- [Promptlab 置信度用户指南](./guides/promptlab-confidence-user-guide.md)
- [CSS 架构快速开始](./guides/css/CSS-ARCHITECTURE-README.md)
- [CSS 架构完整指南](./guides/css/css-architecture-guide.md)
- [命名验证器 README](./guides/naming-validator/naming-validator-README.md)
- [命名验证器使用指南](./guides/naming-validator/naming-validator-USAGE.md)

## 测试与排查

- [测试 README](../tests/README.md) - 测试概览。
- [测试指南](../tests/TEST_GUIDE.md) - 详细测试指南。
- [视觉回归测试](./testing/visual-regression-testing.md)
- [Playwright 并行执行](./testing/playwright-parallel-execution.md)
- [Lighthouse CI 指南](./testing/lighthouse-ci-guide.md)
- [通用故障排查指南](./troubleshooting/troubleshooting-guide.md)
- [置信度显示问题排查](./troubleshooting/confidence-troubleshooting.md)

## API 文档

- [AlpineRegistry API](./api/AlpineRegistry.md)
- [SafeModuleLoader API](./api/SafeModuleLoader.md)
- [SafeRenderer API](./api/SafeRenderer.md)

## 设计与主题

- [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md)
- [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md)
- [模态框开发规范指南](./MODAL_DEVELOPMENT_GUIDELINES.md)
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md)
- [卡片 UI 债务收敛计划](./CARD_UI_DEBT_REDUCTION_PLAN.md)

## 归档入口

- [质量与技术债归档](./archive/quality/README.md) - 已完成的构建修复、技术债和安全修复报告。
- [视觉审计归档](./archive/ui-audit/README.md) - 已完成的视觉审计、PC UI 优化和确认弹窗计划。
- [知识库评审归档](./archive/knowledge-review/README.md) - 已完成的知识内容评审与整改报告。
- [历史验证归档](./archive/verification/README.md) - 已完成的阶段性验证报告。
- [其他历史文档](./archive/misc/) - 旧 API、快速开始和协作文档。

## 历史 Kiro 文档

`.kiro/` 下的 specs、arch-debt、design、agents、fix-reports 和 test-reports 是早期规划与执行快照。它们保留为历史记录；当前架构、质量与开发依据以本索引中的 `docs/` 当前文档和实际脚本输出为准。

---

**最后更新**: 2026-07-10
**维护者**: sops 开发团队
