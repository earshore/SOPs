# AihangSOP 项目文档

> 本目录包含 AihangSOP 项目的技术文档和指南。过期/阶段性文档已归档至 `archive/`，不应再作为开发依据。

---

## 架构与设计

- [CSS 架构快速开始](./CSS-ARCHITECTURE-README.md)
- [CSS 架构完整指南](./css-architecture-guide.md)
- [开发最佳实践](./best-practices.md)

## LLM 网关

- [网关接入指南](./llm-gateway-integration-guide.md) — 新增网关的完整步骤（4 文件 + 1 命令）

## API 文档

- [AlpineRegistry API](./api/AlpineRegistry.md)
- [SafeModuleLoader API](./api/SafeModuleLoader.md)
- [SafeRenderer API](./api/SafeRenderer.md)

> `docs:api` / `docs:serve` 脚本已废弃，以上 API 文档为手动维护版本。

## 功能指南

- [DNA 提取器使用指南](./dna-extractor-guide.md)
- [Promptlab 置信度用户指南](./promptlab-confidence-user-guide.md)
- [置信度故障排查](./confidence-troubleshooting.md)

## 状态管理

- [Zustand 迁移指南](./zustand-migration-guide.md) — 旧 StateManager → Zustand 的迁移参考
- [状态同步最佳实践](./state-sync-best-practices.md) — Alpine ↔ Zustand 同步规范

## 命名验证器（tools/naming-validator）

- [README](./naming-validator-README.md) — 功能说明和命名规范
- [使用指南](./naming-validator-USAGE.md) — CLI 命令和配置

## 测试与质量

- [视觉回归测试](./visual-regression-testing.md)
- [Playwright 并行执行](./playwright-parallel-execution.md)
- [Lighthouse CI 指南](./lighthouse-ci-guide.md)

## 故障排查

- [通用故障排查指南](./troubleshooting-guide.md)

## AI 开发指引

- [development/CLAUDE.md](./development/CLAUDE.md) — AI 辅助开发的项目上下文（供 AI 工具使用）

---

## 目录结构

```
docs/
├── api/                # API 详细文档（手动维护）
├── archive/            # 历史文档归档（过期/阶段性，不作为开发依据）
├── development/        # AI 开发辅助文档
├── guides/             # （暂无有效文档）
├── screenshots/        # 项目截图
├── troubleshooting/    # （暂无有效文档，相关内容见 troubleshooting-guide.md）
└── verification/       # （历史验收报告已归档至 archive/）
```

---

**最后更新**: 2026-03-28
