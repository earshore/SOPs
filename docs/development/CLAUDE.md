# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview


## Essential Commands

### Development
```bash
npm run dev              # 启动开发服务器 (端口 5173)
npm run build            # 构建生产版本
npm run preview          # 预览生产构建
```

### Code Quality
```bash
npm run type-check       # TypeScript 类型检查
npm run lint             # ESLint 检查
npm run lint:fix         # 自动修复 ESLint 问题
npm run format           # Prettier 格式化代码
```

### Testing
```bash
npm run test             # 运行 Vitest 单元测试
npm run test:coverage    # 生成测试覆盖率报告
npm run test:e2e         # 运行 Playwright E2E 测试
npm run test:e2e:ui      # E2E 测试 UI 界面
```

### Design Token System
```bash
npm run generate:tokens  # 生成所有设计令牌配置（CSS 变量、Tailwind 配置、TypeScript 类型）
npm run css:audit        # 审查 CSS 变量命名规范
npm run css:migrate      # 迁移已废弃的 CSS 变量
npm run css:migrate:dry  # 预览迁移（不修改文件）
```

### Code Cleanup & Technical Debt
```bash
# 技术债务扫描
npm run tech-debt:scan           # 扫描技术债务（未使用代码、复杂度、代码异味等）

# 代码清理工具
npm run code:clean:comments      # 清理注释掉的代码
npm run code:clean:todos         # 清理 TODO 注释
npm run code:analyze:complexity  # 分析代码复杂度
npm run code:clean:all           # 运行所有清理工具

# 未使用导入清理
npm run unused-imports:scan      # 扫描并清理未使用的导入

# Console 语句替换
npm run replace-console          # 将 console 语句替换为 Logger 服务

# 批量类型替换
npm run batch-replace-any        # 批量替换 any 类型为具体类型
npm run batch-replace-any:dry    # 预览替换（不修改文件）
npm run batch-replace-any:safe   # 仅替换安全的 any 类型

# CSS 清理
npm run css:migrate-hardcoded    # 迁移硬编码的颜色/尺寸值到设计令牌
npm run css:migrate-hardcoded:dry # 预览迁移（不修改文件）
npm run css:analyze              # 分析模块 CSS 使用情况
npm run css:cleanup              # 清理未使用的 CSS
```

### Release Management
```bash
# 发布前检查
npm run release:check            # 运行所有发布前检查（类型、测试、构建、安全）
npm run release:rollback-plan    # 生成回滚计划
npm run release:monitoring       # 生成监控配置
npm run release:canary-plan      # 生成金丝雀部署计划
npm run release:prepare          # 准备发布（运行所有检查和计划生成）

# 质量监控
npm run quality:monitor          # 运行质量监控
npm run quality:trend            # 生成质量趋势报告
npm run quality:track            # 跟踪质量进度
npm run quality:baseline         # 建立质量基线
npm run quality:dashboard        # 生成质量仪表板
```

## Architecture Overview

### Design Token System (Single Source of Truth)

项目采用设计令牌系统作为所有视觉属性的唯一数据源：

1. **数据源**: `src/common/config/design-tokens.ts` 定义所有设计令牌（颜色、间距、字体、阴影等）
2. **自动生成**:
   - `src/css/foundation/variables.generated.css` - CSS 自定义属性
   - `tailwind.config.generated.js` - Tailwind 配置
   - `src/common/types/design-tokens.generated.ts` - TypeScript 类型定义

**工作流程**:
- 修改 `design-tokens.ts` 后必须运行 `npm run generate:tokens`
- 使用设计令牌而非硬编码值（如 `var(--color-blue-500)` 而非 `#3b82f6`）
- 生成的文件不应手动编辑

### Dependency Injection Container

项目使用自定义 DI 容器管理服务依赖：

- **容器**: `src/common/di/Container.ts` - 核心 DI 容器实现
- **服务注册**: `src/common/di/ServiceRegistry.ts` - 集中注册所有服务
- **服务定义**:
  - `src/common/di/services/coreServices.ts` - 核心服务（Logger, Storage, HTTP 等）
  - `src/common/di/services/businessServices.ts` - 业务服务

**使用模式**:
```typescript
// 在模块中获取服务
const logger = this.getService('logger');
const storage = this.getService('storage');
```

### Module System

所有业务模块继承自 `BaseModule` 类：

- **基类**: `src/common/BaseModule.ts` 提供统一的生命周期管理
- **生命周期**: `mount()` → `unmount()` 自动清理资源
- **业务模块**: `src/modules/` 目录下的各个模块
  - `amz_hub/` - Amazon Hub 功能
  - `app_center/` - 应用中心
  - `home/` - 首页
  - `more/` - 更多功能
  - `sops/` - SOP 管理

**模块开发模式**:
```typescript
export default class MyModule extends BaseModule {
  constructor() {
    super('my-module-id');
  }

  async mount(container: HTMLElement): Promise<void> {
    this.container = container;
    // 初始化逻辑
  }

  unmount(): void {
    // 清理逻辑（BaseModule 自动处理大部分清理）
    super.unmount();
  }
}
```

### Routing System

使用 Navigo 作为路由系统：

- **路由配置**: `src/common/router/` 目录
- **初始化**: `src/common/router/initRouter.ts`
- **路由定义**: `src/common/config/defaults/routes.config.ts`

路由系统集成了模块生命周期管理，自动处理模块的挂载和卸载。

### Path Aliases

TypeScript 和 Vite 配置了以下路径别名：

```typescript
@/          → src/
@common/    → src/common/
@services/  → src/services/
@modules/   → src/modules/
@components/→ src/components/
@types/     → src/types/
@router/    → src/common/router/
```

使用别名而非相对路径导入。

## Build Configuration

### Code Splitting Strategy

Vite 配置了手动分包策略（`vite.config.js`）：

- `vendor-core` - Alpine.js 核心框架
- `vendor-charts` - Chart.js 图表库
- `vendor-markdown` - Marked Markdown 渲染
- `vendor-utils` - 工具库（clsx, tailwind-merge, jsonrepair, zod）

### Optimization

- **压缩**: Terser 压缩 + Gzip/Brotli 双重压缩
- **懒加载**: Chart.js 和 GridStack 按需加载
- **CSS**: 代码分割启用，使用 esbuild 压缩
- **资源内联**: 小于 4KB 的资源内联为 base64

## Development Practices

### CSS Architecture

- 使用设计令牌系统，避免硬编码值
- 遵循 BEM 命名规范
- CSS 文件组织：
  - `src/css/foundation/` - 基础层（变量、Reset）
  - `src/css/components/` - 组件层
  - `src/css/layouts/` - 布局层
  - `src/css/animations/` - 动画层
  - `src/css/utilities/` - 工具层

### TypeScript Configuration

- 严格模式启用（`strict: true`）
- 所有严格检查选项启用
- 不允许未使用的变量和参数
- 不允许隐式返回

### Security

- XSS 防护：使用 `escapeHtml` 工具函数（`@/common/utils/security`）
- 安全审计：`npm run security:audit`
- XSS 扫描：`npm run xss:scan`

## Documentation

核心文档位于 `docs/` 目录：

- `CSS-ARCHITECTURE-README.md` - CSS 架构快速开始
- `css-architecture-guide.md` - 完整 CSS 架构指南
- `routing-system-analysis-2026-02-28.md` - 路由系统架构分析
- `best-practices.md` - 开发最佳实践

## Notes

- Node.js 版本要求: >=18.0.0
- LLM 请求由浏览器直接调用 `https://new.hongecb.store/v1`，开发服务器不再配置 `/v1` 代理。
- TypeScript 检查由 `npm run type-check` 和 CI gate 独立执行，Vite 配置不再内置 checker 插件。
- 生产构建会移除所有 console 语句
