# 项目文档索引

本文档只维护当前可作为开发依据的文档入口。阶段性计划、一次性审计和历史执行记录请从归档入口查阅，**不应直接作为当前任务清单**。

**最后更新**: 2026-07-26  
**维护者**: sops 开发团队

---

## 30 秒决策树（先读这个）

| 你要做的事 | 先读 |
| --- | --- |
| 判断产品该不该做 / 体验底线 | **[PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)** |
| 改用户可见文案 / Toast / 空状态措辞 | **[CONTENT_DESIGN.md](./CONTENT_DESIGN.md)** |
| 改颜色、Appearance、暗色、归属色 | **[THEME_SYSTEM_GUIDELINES.md](./THEME_SYSTEM_GUIDELINES.md)** |
| 改页面布局、Banner、视觉风格 | **[VISUAL_DESIGN_GUIDELINES.md](./VISUAL_DESIGN_GUIDELINES.md)** |
| 改按钮/表单/Toast/空状态/卡片 | **[COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)** |
| 改弹窗/确认/抽屉 | **[MODAL_DEVELOPMENT_GUIDELINES.md](./MODAL_DEVELOPMENT_GUIDELINES.md)** |
| 键盘焦点 / a11y 底线 | **[ACCESSIBILITY.md](./ACCESSIBILITY.md)** |
| 改 CSS 变量 / token / Tailwind 色 | **[guides/css/CSS-ARCHITECTURE-README.md](./guides/css/CSS-ARCHITECTURE-README.md)** + 主题宪法 |
| 写/改测试、问测什么 | **[TESTING_STRATEGY.md](./TESTING_STRATEGY.md)** |
| 发版 / tag / RC / GA | **[RELEASE_POLICY.md](./RELEASE_POLICY.md)** |
| 部署 Cloudflare / CSP | **[DEPLOYMENT.md](./DEPLOYMENT.md)** |
| 线上故障 / 回滚 / 白屏 / LLM 挂 | **[OPS_RUNBOOK.md](./OPS_RUNBOOK.md)** |
| 安全报告 / 密钥边界 | **[SECURITY.md](../SECURITY.md)** |
| 查当前技术债 | **[TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md)**（活） |
| 做新功能设计 | `docs/superpowers/specs/` + 触及的上述宪法 |
| 历史审计/旧计划 | `docs/archive/`、`.kiro/`（**只读**） |

**冲突裁决顺序（高 → 低）：**  
PRODUCT_PRINCIPLES → 领域宪法（THEME / VISUAL / COMPONENT / MODAL / TESTING / RELEASE）→ 功能 Spec → 实现代码注释。

---

## 现行规范（source of truth）

### 产品与体验

- [产品原则](./PRODUCT_PRINCIPLES.md) — 定位、非目标、DoD、规范变更流程。
- [内容设计规范](./CONTENT_DESIGN.md) — 去 AI 味、按钮/错误/空状态文案。
- [无障碍规范](./ACCESSIBILITY.md) — 底线 + 发版抽检清单。
- [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md) — Appearance / 模块归属 / token 契约。
- [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md) — 页面与组件视觉执行细则。
- [组件开发规范](./COMPONENT_GUIDELINES.md) — 按钮/表单/反馈/卡片/清单。
- [模态框开发规范指南](./MODAL_DEVELOPMENT_GUIDELINES.md)
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md)

### 工程与共享能力

- [共享能力复用指南](./SHARED_CAPABILITIES_GUIDE.md) — 页面壳、剪贴板、LLM JSON、Overview 等。
- [项目结构审查](./PROJECT_STRUCTURE.md) — 目录职责、清理规则、归档边界。
- [CSS 架构快速开始](./guides/css/CSS-ARCHITECTURE-README.md)
- [CSS 架构完整指南](./guides/css/css-architecture-guide.md)
- [页面实现模板规范](./guides/modules/page-implementation-templates.md)
- [Superpowers 计划与规格](./superpowers/README.md) — **功能** plans / specs（非长期宪法）。

### 质量、测试、债务

- [测试策略 SSOT](./TESTING_STRATEGY.md)
- [CI 质量门禁](./CI-QUALITY-GATES.md)
- [技术债务看板（活）](./TECH_DEBT_BOARD.md)
- [技术债务审计报告（历史快照）](./TECH_DEBT_AUDIT.md) — 勿当 open 债唯一清单。
- [XSS 风险扫描报告](./XSS_SCAN_REPORT.md) — 工具输出。
- [卡片 UI 债务收敛计划](./CARD_UI_DEBT_REDUCTION_PLAN.md)

### 入门与运维

- [项目 README](../README.md)
- [快速开始（docs）](./GETTING_STARTED.md)
- [文档速查](./QUICK_REFERENCE.md)
- [运营作业系统落地计划](./OPERATING_SYSTEM_ROADMAP.md) — 产品路线（非组件 SSOT）
- [部署指南](./DEPLOYMENT.md)
- [运维 Runbook](./OPS_RUNBOOK.md) — 白屏 / LLM / 设置 / 回滚最低信号包。
- [变更日志](./CHANGELOG.md)
- [发布策略](./RELEASE_POLICY.md)
- [Release Notes 模板](./templates/RELEASE_NOTES_TEMPLATE.md)
- [安全策略](../SECURITY.md)
- [贡献指南（历史 Kiro 路径）](../.kiro/CONTRIBUTING.md) — 若与 README/`docs/` 冲突，以现行 `docs/` 与根 README 为准。

### 开发实践（注意日期）

- [系统稳定性最佳实践](./development/best-practices.md) — 含迁移上下文；**状态以 Zustand/`src/stores` 为准**。
- [状态同步最佳实践](./development/state-sync-best-practices.md)
- [Zustand 迁移指南](./development/zustand-migration-guide.md)
- [工具 LLM 错误码速查](./troubleshooting/LLM_ERROR_CODES.md)
- [运行时降级矩阵](./troubleshooting/DEGRADATION_MATRIX.md)
- 根目录 [CLAUDE.md](../CLAUDE.md) / [AGENTS.md](../AGENTS.md) — 编码助手行为约定。

---

## 功能指南

- [DNA 提取器使用指南](./guides/dna-extractor-guide.md)
- [Promptlab 置信度用户指南](./guides/promptlab-confidence-user-guide.md)
- [命名验证器 README](./guides/naming-validator/naming-validator-README.md)
- [命名验证器使用指南](./guides/naming-validator/naming-validator-USAGE.md)

## 提案与评审笔记（非 SSOT）

- [AI 功能深度优化建议](./AI_FUNCTION_DEEP_OPTIMIZATION_RECOMMENDATIONS.md)
- [App Center 工作流工作台评审](./app_center_workflow_workbench_review.md)

## 测试操作手册（从属 TESTING_STRATEGY）

- [测试 README](../tests/README.md)
- [测试指南（历史手册）](../tests/TEST_GUIDE.md) — **策略以 TESTING_STRATEGY 为准**
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

- [稳定主题系统规范](./THEME_SYSTEM_GUIDELINES.md)
- [主题系统企业级审查与收敛路线图](./superpowers/specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md)
- [主题落地团队作战手册](./superpowers/plans/2026-07-26-theme-system-team-operating-playbook.md)
- [Ownership Role → Palette 映射表](./superpowers/plans/2026-07-26-ownership-role-palette-map.md)
- [主题体验验收矩阵](./superpowers/plans/2026-07-26-theme-system-experience-acceptance-matrix.md)
- [主题 XO 签字状态](./superpowers/plans/2026-07-26-theme-system-xo-signoff-status.md)
- [主题落地进度看板](./superpowers/plans/2026-07-26-theme-system-landing-status.md)
- [Token 覆盖清单 D1](./superpowers/plans/2026-07-26-token-override-inventory.md)
- [工作台圆角决策 D2](./superpowers/plans/2026-07-26-workbench-radius-decision.md)
- Token 原子冲突 allowlist：`config/token-atomic-override-allowlist.json`
- [视觉设计规范指南](./VISUAL_DESIGN_GUIDELINES.md)
- [组件开发规范](./COMPONENT_GUIDELINES.md)
- [模态框开发规范指南](./MODAL_DEVELOPMENT_GUIDELINES.md)
- [页面访问动画规范](./PAGE_ENTRY_ANIMATION_GUIDELINES.md)

---

## 归档入口（勿当现行 SSOT）

- [质量与技术债归档](./archive/quality/README.md)
- [视觉审计归档](./archive/ui-audit/README.md)
- [知识库评审归档](./archive/knowledge-review/README.md)
- [历史验证归档](./archive/verification/README.md)
- [其他历史文档](./archive/misc/)

## 历史 Kiro 文档（勿当现行 SSOT）

`.kiro/` 下的 specs、arch-debt、design、agents、fix-reports 和 test-reports 是 **2026-H1 及更早** 的规划与执行快照。

- 入口说明：[`.kiro/README.md`](../.kiro/README.md)
- 债务进度快照已标注 historical：[`arch-debt/progress.md`](../.kiro/arch-debt/progress.md)
- **当前**架构、主题、发版与实现计划以本索引「现行规范」与 `docs/superpowers/` 为准。

---

## 规范文档状态标签（约定）

| 标签 | 含义 |
| --- | --- |
| **active · SSOT** | 必须遵守；冲突时优先 |
| **active · plan** | 执行计划，完成后可归档 |
| **historical** | 只读；不指导新开发 |
| **proposal** | 讨论中，未强制 |
