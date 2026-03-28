# AihangSOP 项目文档

> 本目录包含 AihangSOP 项目的技术文档和指南。过期/阶段性文档已归档至 `archive/`，不应再作为开发依据。

---

## 功能使用指南 (`guides/`)

- [LLM 网关接入指南](./guides/llm-gateway-integration-guide.md) — 新增网关的完整步骤
- [DNA 提取器使用指南](./guides/dna-extractor-guide.md)
- [Promptlab 置信度用户指南](./guides/promptlab-confidence-user-guide.md)

### CSS 体系 (`guides/css/`)
- [CSS 架构快速开始](./guides/css/CSS-ARCHITECTURE-README.md)
- [CSS 架构完整指南](./guides/css/css-architecture-guide.md)

### 命名验证器 (`guides/naming-validator/`)
- [README](./guides/naming-validator/naming-validator-README.md) — 功能说明和命名规范
- [使用指南](./guides/naming-validator/naming-validator-USAGE.md) — CLI 命令和配置

---

## 开发规范 (`development/`)

- [系统稳定性最佳实践](./development/best-practices.md)
- [状态同步最佳实践](./development/state-sync-best-practices.md) — Alpine ↔ Zustand 同步规范
- [Zustand 迁移指南](./development/zustand-migration-guide.md) — 旧 StateManager → Zustand 的迁移参考
- [AI 辅助开发上下文](./development/CLAUDE.md) — 供 AI 工具使用的项目上下文

---

## 故障排查 (`troubleshooting/`)

- [通用故障排查指南](./troubleshooting/troubleshooting-guide.md)
- [置信度显示问题排查](./troubleshooting/confidence-troubleshooting.md)

---

## 测试配置 (`testing/`)

- [视觉回归测试](./testing/visual-regression-testing.md)
- [Playwright 并行执行](./testing/playwright-parallel-execution.md)
- [Lighthouse CI 指南](./testing/lighthouse-ci-guide.md)

---

## API 文档 (`api/`)

- [AlpineRegistry API](./api/AlpineRegistry.md)
- [SafeModuleLoader API](./api/SafeModuleLoader.md)
- [SafeRenderer API](./api/SafeRenderer.md)

---

## 目录结构

```
docs/
├── api/                        # API 详细文档（手动维护）
├── archive/                    # 历史文档归档（过期/阶段性，不作为开发依据）
│   ├── ai-analysis/            #   AI分析加速方案（4篇）
│   ├── bug-fix-reports/        #   单次 Bug 修复记录（2篇）
│   ├── verification/           #   阶段性验收报告（4篇）
│   └── misc/                   #   其他过期文档（4篇）
├── development/                # 开发规范、最佳实践、AI辅助上下文
├── guides/                     # 功能使用指南
│   ├── css/                    #   CSS 架构体系
│   └── naming-validator/       #   命名验证工具
├── screenshots/                # 项目截图
├── testing/                    # 测试配置与使用指南
├── troubleshooting/            # 故障排查
└── verification/               # （历史验收报告已归档至 archive/verification/）
```

---

**最后更新**: 2026-03-28
