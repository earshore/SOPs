# 项目文档索引

本文档只维护当前可作为开发依据的文档入口。阶段性计划、一次性审计和历史执行记录请从归档入口查阅，不应直接作为当前任务清单。

---

## 现行规范（source of truth）

- [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md) — Appearance / 模块归属 / token 契约。
- [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md) — 页面与组件视觉执行细则。
- [模态框开发规范指南](./MODAL_DEVELOPMENT_GUIDELINES.md)
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md)
- [共享能力复用指南](./SHARED_CAPABILITIES_GUIDE.md) — 页面壳、剪贴板、LLM JSON、Overview 等。
- [项目结构审查](./PROJECT_STRUCTURE.md) — 目录职责、清理规则、归档边界。
- [Superpowers 计划与规格](./superpowers/README.md) — **现行** implementation plans / design specs（`plans/`、`specs/`）。

## 入门与运维

- [项目 README](../README.md) — 概览、快速开始和常用命令。
- [快速开始（docs）](./GETTING_STARTED.md)
- [文档速查](./QUICK_REFERENCE.md)
- [运营作业系统落地计划](./OPERATING_SYSTEM_ROADMAP.md)
- [部署指南](./DEPLOYMENT.md)
- [变更日志](./CHANGELOG.md)
- [发布策略](./RELEASE_POLICY.md)
- [Release Notes 模板](./templates/RELEASE_NOTES_TEMPLATE.md)
- [安全策略](../SECURITY.md)
- [贡献指南（历史 Kiro 路径）](../.kiro/CONTRIBUTING.md) — 协作约定；若与 README/`docs/` 冲突，以现行 `docs/` 与根 README 为准。

## 质量与安全

- [CI 质量门禁](./CI-QUALITY-GATES.md)
- [技术债务审计报告](./TECH_DEBT_AUDIT.md) — 当前残留债务与验证命令（优先于 `.kiro/arch-debt` 快照）。
- [XSS 风险扫描报告](./XSS_SCAN_REPORT.md) — 扫描工具持续更新的输出。
- [卡片 UI 债务收敛计划](./CARD_UI_DEBT_REDUCTION_PLAN.md) — 仍 active 的卡片债收敛计划。

## 开发规范

- [系统稳定性最佳实践](./development/best-practices.md)
- [状态同步最佳实践](./development/state-sync-best-practices.md)
- [Zustand 迁移指南](./development/zustand-migration-guide.md)
- [页面实现模板规范](./guides/modules/page-implementation-templates.md)
- [工具 LLM 错误码速查](./troubleshooting/LLM_ERROR_CODES.md)
- [运行时降级矩阵](./troubleshooting/DEGRADATION_MATRIX.md)
- [AI 辅助开发上下文](./development/CLAUDE.md)
- 根目录 [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) — 编码助手行为约定。

## 功能指南

- [DNA 提取器使用指南](./guides/dna-extractor-guide.md)
- [Promptlab 置信度用户指南](./guides/promptlab-confidence-user-guide.md)
- [CSS 架构快速开始](./guides/css/CSS-ARCHITECTURE-README.md)
- [CSS 架构完整指南](./guides/css/css-architecture-guide.md)
- [命名验证器 README](./guides/naming-validator/naming-validator-README.md)
- [命名验证器使用指南](./guides/naming-validator/naming-validator-USAGE.md)

## 提案与评审笔记（非 SSOT）

下列文档供讨论/评审，**不是**与 THEME/VISUAL/superpowers 同级的强制规范：

- [AI 功能深度优化建议](./AI_FUNCTION_DEEP_OPTIMIZATION_RECOMMENDATIONS.md) — active proposal。
- [App Center 工作流工作台评审](./app_center_workflow_workbench_review.md) — review note。

## 测试与排查

- [测试 README](../tests/README.md)
- [测试指南](../tests/TEST_GUIDE.md)
- [视觉回归测试](./testing/visual-regression-testing.md)
- [Playwright 并行执行](./testing/playwright-parallel-execution.md)
- [Lighthouse CI 指南](./testing/lighthouse-ci-guide.md)
- [通用故障排查指南](./troubleshooting/troubleshooting-guide.md)
- [置信度显示问题排查](./troubleshooting/confidence-troubleshooting.md)

## API 文档

- [AlpineRegistry API](./api/AlpineRegistry.md)
- [SafeModuleLoader API](./api/SafeModuleLoader.md)
- [SafeRenderer API](./api/SafeRenderer.md)

## 设计与主题（快捷）

（完整权威见上方「现行规范」。）

- [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md)
- [主题系统企业级审查与收敛路线图](./superpowers/specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md) — As-Is/To-Be、D1–D12、Phase 0–5
- [主题落地团队作战手册](./superpowers/plans/2026-07-26-theme-system-team-operating-playbook.md) — 角色/RACI/门禁/两周冲刺
- [主题体验验收矩阵](./superpowers/plans/2026-07-26-theme-system-experience-acceptance-matrix.md) — 体验官场景与签字
- [主题 XO 签字状态](./superpowers/plans/2026-07-26-theme-system-xo-signoff-status.md) — code-aware 状态 + 30 分钟人工脚本
- [Token 覆盖清单 D1](./superpowers/plans/2026-07-26-token-override-inventory.md) — generated vs handwritten
- [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md)
- [模态框开发规范指南](./MODAL_DEVELOPMENT_GUIDELINES.md)
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md)

## 归档入口（勿当现行 SSOT）

- [质量与技术债归档](./archive/quality/README.md)
- [视觉审计归档](./archive/ui-audit/README.md) — 含根目录迁入的 Deep Chat 审查笔记（2026-07-26 batch B）。
- [知识库评审归档](./archive/knowledge-review/README.md)
- [历史验证归档](./archive/verification/README.md)
- [其他历史文档](./archive/misc/)

## 历史 Kiro 文档（勿当现行 SSOT）

`.kiro/` 下的 specs、arch-debt、design、agents、fix-reports 和 test-reports 是 **2026-H1 及更早** 的规划与执行快照。

- 入口说明：[`.kiro/README.md`](../.kiro/README.md)
- 债务进度快照已标注 historical：[`arch-debt/progress.md`](../.kiro/arch-debt/progress.md)（最后更新 2026-07-11）
- **当前**架构、主题、发版与实现计划以本索引「现行规范」与 `docs/superpowers/` 为准，不以 `.kiro/arch-debt` 的「100% 完成」表述为活债务清单。

---

**最后更新**: 2026-07-26  
**维护者**: sops 开发团队
