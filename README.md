# SOPs - 亚马逊运营管理平台

> Amazing Amazon Architect - 专业的亚马逊运营管理解决方案

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

---

## 📚 项目文档

### 核心文档
- [CSS 架构系统](./docs/CSS-ARCHITECTURE-README.md) - CSS 架构快速开始指南
- [CSS 架构指南](./docs/css-architecture-guide.md) - 完整的 CSS 架构使用指南
- [路由系统分析](./docs/routing-system-analysis-2026-02-28.md) - 路由系统架构分析

### 技术文档
- [最佳实践](./docs/best-practices.md) - 开发最佳实践
- [性能优化](./docs/promptlab-performance-report.md) - 性能优化报告
- [安全指南](./docs/security-low-severity-issues.md) - 安全问题处理

---

## 🎨 CSS 架构系统

项目采用现代化的 CSS 架构系统，基于设计令牌的单一数据源。

### 核心特性
- ✅ 300+ 个设计令牌统一管理
- ✅ 自动生成 CSS 变量、Tailwind 配置和 TypeScript 类型
- ✅ 完整的类型安全支持
- ✅ 审查和迁移工具
- ✅ 17 种颜色方案，11 级梯度

### 快速使用

```bash
# 生成所有设计令牌配置
npm run generate:tokens

# 审查 CSS 变量使用
npm run css:audit

# 迁移已废弃变量
npm run css:migrate
```

详细文档: [CSS 架构系统使用指南](./docs/CSS-ARCHITECTURE-README.md)

---

## 🛠️ 技术栈

### 核心框架
- **Vite** - 构建工具
- **TypeScript** - 类型安全
- **Alpine.js** - 轻量级响应式框架
- **Tailwind CSS** - 实用优先的 CSS 框架

### 路由和状态管理
- **Navigo** - 现代化路由系统
- **Zustand** - 轻量级状态管理

### UI 组件
- **Chart.js** - 图表库
- **Marked** - Markdown 解析
- **GridStack** - 拖拽布局

### 开发工具
- **ESLint** - 代码检查
- **Prettier** - 代码格式化
- **Playwright** - E2E 测试
- **Vitest** - 单元测试

---

## 📦 项目结构

```
SOPs/
├── src/
│   ├── common/              # 公共模块
│   │   ├── config/          # 配置文件
│   │   │   └── design-tokens.ts  # 设计令牌（单一数据源）
│   │   ├── router/          # 路由系统
│   │   ├── utils/           # 工具函数
│   │   └── types/           # 类型定义
│   ├── css/                 # 样式文件
│   │   ├── foundation/      # 基础层（变量、Reset）
│   │   ├── components/      # 组件层
│   │   ├── layouts/         # 布局层
│   │   ├── animations/      # 动画层
│   │   └── utilities/       # 工具层
│   ├── modules/             # 业务模块
│   └── services/            # 服务层
├── scripts/                 # 构建和工具脚本
│   ├── generate-css-variables.ts      # 生成 CSS 变量
│   ├── generate-tailwind-config.ts    # 生成 Tailwind 配置
│   ├── generate-design-token-types.ts # 生成 TypeScript 类型
│   ├── audit-css-variables.ts         # 审查 CSS 变量
│   └── migrate-deprecated-variables.ts # 迁移已废弃变量
├── docs/                    # 项目文档
├── tests/                   # 测试文件
└── examples/                # 示例代码
```

---

## 🔧 可用命令

### 开发命令
```bash
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run preview          # 预览生产版本
```

### 代码质量
```bash
npm run lint             # 运行 ESLint
npm run lint:fix         # 自动修复 ESLint 问题
npm run format           # 格式化代码
npm run type-check       # TypeScript 类型检查
```

### 测试命令
```bash
npm run test             # 运行单元测试
npm run test:e2e         # 运行 E2E 测试
npm run test:coverage    # 生成测试覆盖率报告
```

### CSS 架构命令
```bash
npm run generate:tokens  # 生成所有设计令牌配置
npm run css:audit        # 审查 CSS 变量命名规范
npm run css:migrate      # 迁移已废弃变量
npm run css:migrate:dry  # 预览迁移（不修改文件）
```

### 性能和质量
```bash
npm run lighthouse       # 运行 Lighthouse 测试
npm run quality:check    # 代码质量检查
npm run security:audit   # 安全审计
```

---

## 🎨 设计系统

### 颜色系统
- 17 个颜色色板（slate, blue, purple, emerald 等）
- 每个色板 11 级梯度（50-950）
- 完整的语义颜色系统

### 间距系统
- 基于 4px 倍数的 36 个间距值
- 从 0 到 96 的完整间距系统

### 字体系统
- 4 个字体家族（sans, serif, mono, display）
- 12 个字号（2xs-6xl）
- 9 个字重（thin-black）

### 视觉系统
- 8 个圆角预设
- 8 个阴影预设
- 14 个 Z-index 层级
- 完整的动画系统

详细文档: [CSS 架构指南](./docs/css-architecture-guide.md)

---

## 📈 性能优化

### 构建优化
- ✅ CSS 代码分割
- ✅ 模块懒加载
- ✅ 资源压缩（Gzip + Brotli）
- ✅ Tree Shaking

### 运行时优化
- ✅ 关键 CSS 内联
- ✅ 图片懒加载
- ✅ 路由预加载
- ✅ 状态管理优化

### 性能指标
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

---

## 🔒 安全性

### 安全措施
- ✅ XSS 防护
- ✅ CSRF 防护
- ✅ 内容安全策略（CSP）
- ✅ 安全的存储机制

### 安全审计
```bash
npm run security:audit   # 运行安全审计
npm run xss:scan         # XSS 扫描
```

---

## 🧪 测试

### 单元测试
```bash
npm run test             # 运行所有测试
npm run test:ui          # 测试 UI 界面
npm run test:coverage    # 生成覆盖率报告
```

### E2E 测试
```bash
npm run test:e2e         # 运行 E2E 测试
npm run test:e2e:ui      # E2E 测试 UI
npm run test:e2e:debug   # 调试模式
```

### 性能测试
```bash
npm run test:performance # 性能测试
npm run lighthouse       # Lighthouse 测试
```

---

## 📝 开发规范

### 代码风格
- 使用 ESLint 和 Prettier
- 遵循 TypeScript 最佳实践
- 使用语义化命名

### CSS 规范
- 使用设计令牌而非硬编码值
- 遵循 BEM 命名规范
- 组件样式模块化

### Git 规范
- 使用语义化提交信息
- 功能分支开发
- Code Review 流程

详细文档: [最佳实践](./docs/best-practices.md)

---

## 🏗️ amz_hub 模块挂载规范

> 以下规范同样适用于 sops、app_center、more 等其他模块下的子页面开发。

### 标准模式

所有子页面模块统一遵循以下结构：

```typescript
// 1. 模板用 ?raw 导入 —— 构建期打包，无运行时路径查找
import BaseModule from '../../../../../common/BaseModule';
import templateHTML from './template.html?raw';
import './styles.css'; // 如有独立样式

import { Logger } from '../../../../../services/loggerService';

class MyPageModule extends BaseModule {
  constructor() {
    super('route_id'); // 与 routes.ts 中的路由 ID 对应
  }

  // 2. render() —— 渲染模板，BaseModule.mount() 自动调用
  async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add('fade-in'); // 统一淡入动画
  }

  // 3. init() —— 可选，图表初始化、事件绑定等（render 完成后自动调用）
  async init(): Promise<void> {
    // 事件绑定、图表初始化等
    Logger.debug('✅ [MyPage] 模块初始化完成');
  }

  // 4. onUnmount() —— 可选，资源清理（图表销毁、定时器等）
  protected onUnmount(): void {
    // 清理图表实例、取消订阅等
  }
}

// 5. 导出 —— ModuleLoader 通过命名导出调用
const instance = new MyPageModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
```

### 生命周期说明

`BaseModule.mount(container)` 按以下顺序执行，**不要覆盖 `mount()` 或 `unmount()`**：

```
mount(container)
  ├── 设置 this.container，标记 _isMounted
  ├── 调用 render()   ← 子类实现：渲染模板
  ├── 调用 init()     ← 子类实现（可选）：事件/图表初始化
  └── 错误由 handleError() 统一处理

unmount()
  ├── 取消进行中的 AbortController 请求
  ├── 执行所有注册的 disposables 清理函数
  ├── 调用 onUnmount()  ← 子类实现（可选）：自定义清理
  └── 重置 _isMounted 状态
```

### 模板加载：`?raw` vs `loadTemplate()`

| | `?raw` import | `loadTemplate()` |
|---|---|---|
| **路径校验** | ✅ 构建期报错 | ❌ 运行时才发现 |
| **网络请求** | ✅ 零额外请求，同 chunk | ❌ 独立 chunk，多一次请求 |
| **生产缓存** | ✅ 由浏览器 HTTP 缓存处理 | ⚠️ 额外占用 localStorage |
| **适用场景** | 子页面模板 | Shell 级 HTML 注入 |

**`loadTemplate()` 保留场景**：仅用于 `viewLoader` 内部的 Shell 级视图注入（`sops.html`、`amz_hub.html` 等顶层外壳），由 `initViews()` 和 `ensureViewLoaded()` 调用，不应在子页面模块中直接使用。

### 淡入动画

所有页面在 `render()` 中统一加 `fade-in` class：

```typescript
async render(): Promise<void> {
  this.container!.innerHTML = templateHTML;
  this.container!.classList.add('fade-in'); // 对应 CSS: animation: fadeIn ...
}
```

CSS 中已定义的动画 class 可按需选用：

| Class | 动画效果 | 时长 |
|---|---|---|
| `fade-in` | 标准淡入 | `--duration-normal` |
| `fade-in-up` | 向上淡入 | `--duration-slow` |
| `view-fade-in` | 页面级淡入（较慢） | `--duration-slower` |

### 常见反模式

```typescript
// ❌ 错误：覆盖 mount() 会绕开 BaseModule 的生命周期管理
async mount(container: HTMLElement): Promise<void> {
  container.innerHTML = templateHTML;
}

// ❌ 错误：覆盖 unmount() 会导致 disposables 和 AbortController 不被清理
unmount(): void {
  Logger.debug('卸载');
}

// ❌ 错误：运行时字符串路径，文件改名不报错，可能 miss 注册表
this.container!.innerHTML = await loadTemplate(
  'src/modules/amz_hub/views/practice/my_page/template.html'
);

// ✅ 正确：?raw 导入，构建期校验
import templateHTML from './template.html?raw';
this.container!.innerHTML = templateHTML;
```

### 模块注册流程

新增子页面需要同步更新以下 4 处：

1. **`src/common/constants/routes.ts`** — 在对应模块的 `ROUTES` 常量里添加路由 ID
2. **`src/common/router/navigo/route-ids.ts`** — 在 `RouteId` 类型和 `ALL_ROUTE_IDS` 数组中添加
3. **`src/common/config/menuConfig.ts`** — 在 `routes` 中添加菜单配置（label、icon、category 等）
4. **`src/modules/amz_hub/amz_hub.ts`** — 在 `MODULE_MAP` 中添加动态 import 映射


---

## 🤝 贡献指南

### 开发流程
1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码审查
- 确保所有测试通过
- 遵循代码规范
- 更新相关文档

---

## 📄 许可证

本项目采用 MIT 许可证。

---

## 📞 联系方式

如有问题或建议，请联系开发团队。

---

**维护者**: AihangSOP 开发团队  
**最后更新**: 2026-03-01
