# AihangSOP 项目文档

> 本目录包含 AihangSOP 项目的所有技术文档和指南。

## 📚 文档导航

### 核心文档

#### 架构与设计
- [CSS 架构系统](./CSS-ARCHITECTURE-README.md) - CSS 架构快速开始指南
- [CSS 架构指南](./css-architecture-guide.md) - 完整的 CSS 架构使用指南
- [最佳实践](./best-practices.md) - 开发最佳实践和规范

#### API 文档
- [API 文档](./API-DOCUMENTATION.md) - 完整的 API 参考文档
- [API 详细文档](./api/) - 各模块的详细 API 文档

### 功能指南

#### DNA 提取器
- [DNA 提取器使用指南](./dna-extractor-guide.md) - 产品 DNA 自动提取功能使用说明

#### Promptlab
- [Promptlab 用户指南](./promptlab-confidence-user-guide.md) - Prompt 生成工具使用指南

#### 状态管理
- [Zustand 迁移指南](./zustand-migration-guide.md) - 状态管理系统迁移指南
- [状态同步最佳实践](./state-sync-best-practices.md) - 状态同步使用规范

### 测试与质量

#### 测试指南
- [手动测试指南](./MANUAL_TEST_GUIDE.md) - 手动测试流程和检查清单
- [浏览器测试结果](./BROWSER_TEST_RESULT.md) - 浏览器兼容性测试报告
- [视觉回归测试](./visual-regression-testing.md) - 视觉测试配置和使用
- [Playwright 并行执行](./playwright-parallel-execution.md) - E2E 测试并行执行指南

#### 性能与监控
- [Lighthouse CI 指南](./lighthouse-ci-guide.md) - 性能监控配置和使用

### 工具与配置

#### 命名验证器
- [命名验证器 README](./naming-validator-README.md) - 命名规范验证工具
- [命名验证器使用指南](./naming-validator-USAGE.md) - 工具使用说明
- [命名验证器状态](./naming-validator-STATUS.md) - 工具开发状态

### 故障排查

- [故障排查指南](./troubleshooting-guide.md) - 常见问题解决方案
- [置信度故障排查](./confidence-troubleshooting.md) - 置信度系统问题排查

### 开发流程

- [下一步计划](./NEXT_STEPS.md) - 项目后续开发计划
- [PR 描述模板](./pr-description.md) - Pull Request 描述模板
- [PR 模板](./PULL_REQUEST_TEMPLATE.md) - Pull Request 标准模板

---

## 📁 目录结构

```
docs/
├── api/                    # API 详细文档
│   ├── AlpineRegistry.md
│   ├── SafeModuleLoader.md
│   └── SafeRenderer.md
├── archive/                # 历史文档归档
│   ├── confidence-system-consolidated.md
│   ├── dna-extractor-consolidated.md
│   └── ...
├── screenshots/            # 项目截图
└── verification/           # 验证和测试报告
```

---

## 🔍 快速查找

### 我想了解...

- **CSS 如何使用？** → [CSS-ARCHITECTURE-README.md](./CSS-ARCHITECTURE-README.md)
- **如何提取产品 DNA？** → [dna-extractor-guide.md](./dna-extractor-guide.md)
- **如何编写测试？** → [MANUAL_TEST_GUIDE.md](./MANUAL_TEST_GUIDE.md)
- **遇到问题怎么办？** → [troubleshooting-guide.md](./troubleshooting-guide.md)
- **代码规范是什么？** → [best-practices.md](./best-practices.md)

### 我想查看...

- **API 参考** → [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)
- **历史文档** → [archive/](./archive/)
- **测试报告** → [verification/](./verification/)
- **项目截图** → [screenshots/](./screenshots/)

---

## 📝 文档维护

### 文档分类原则

1. **核心文档** - 保留在根目录，经常使用
2. **历史文档** - 移至 archive/，供参考
3. **API 文档** - 放在 api/ 子目录
4. **截图资源** - 放在 screenshots/ 子目录

### 更新文档

- 修改文档后，更新本 README 的索引
- 过时的文档移至 archive/ 目录
- 重复的文档进行合并整理

---

**最后更新**: 2026-03-07
**维护者**: AihangSOP 开发团队
