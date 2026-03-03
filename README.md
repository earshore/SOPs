# AihangSOP - 亚马逊运营管理平台

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
AihangSOP/
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
