# CSS 架构系统使用指南

> **快速开始指南** - 5 分钟了解新的 CSS 架构系统

---

## 🚀 快速开始

### 1. 修改设计令牌

编辑 `src/common/config/design-tokens.ts`:

```typescript
export const COLOR_PALETTES = {
  // 添加新颜色
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    // ... 完整梯度
    950: '#042f2e'
  }
};
```

### 2. 生成配置文件

```bash
npm run generate:tokens
```

这会自动生成：
- CSS 变量 (485 行)
- Tailwind 配置 (468 行)
- TypeScript 类型 (182 行)

### 3. 在代码中使用

#### CSS 中使用
```css
.my-component {
  color: var(--color-teal-500);
  padding: var(--spacing-4);
  border-radius: var(--rounded-lg);
}
```

#### Tailwind 中使用
```html
<div class="bg-teal-500 p-4 rounded-lg">
  内容
</div>
```

#### TypeScript 中使用
```typescript
import { DESIGN_TOKENS } from '@/common/config/design-tokens';
import type { ColorPaletteName } from '@/common/types/design-tokens.generated';

const color: ColorPaletteName = 'teal';
const value = DESIGN_TOKENS.colors.palettes[color][500];
```

---

## 📋 可用命令

### 生成命令

```bash
# 生成所有令牌文件（推荐）
npm run generate:tokens

# 单独生成
npm run generate:css-vars    # 仅生成 CSS 变量
npm run generate:tailwind    # 仅生成 Tailwind 配置
npm run generate:types       # 仅生成 TypeScript 类型
```

### 审查命令

```bash
# 审查 CSS 变量命名规范
npm run css:audit
```

输出示例：
```
📊 统计信息:
   总变量使用: 2,017
   ✅ 符合规范: 305 (15.1%)
   ⚠️  不符合规范: 1,712
   🔄 已废弃: 0
```

### 迁移命令

```bash
# 预览迁移（不修改文件）
npm run css:migrate:dry

# 执行迁移
npm run css:migrate
```

---

## 🎨 设计令牌系统

### 颜色系统

#### 基础色板 (17 个)
```typescript
slate, gray, blue, sky, indigo, violet, purple, fuchsia,
pink, rose, red, orange, amber, yellow, lime, green,
emerald, teal, cyan
```

每个色板有 11 级梯度 (50-950)

#### 语义颜色
```typescript
primary, secondary, accent,
success, warning, danger, error, info
```

#### 使用示例
```css
/* 基础色板 */
color: var(--color-blue-500);
background: var(--color-slate-50);

/* 语义颜色 */
color: var(--color-primary);
background: var(--bg-surface);
border: 1px solid var(--border-default);
```

### 间距系统

基于 4px 倍数的 36 个间距值：

```css
--spacing-0: 0
--spacing-1: 0.25rem    /* 4px */
--spacing-2: 0.5rem     /* 8px */
--spacing-4: 1rem       /* 16px */
--spacing-8: 2rem       /* 32px */
/* ... */
--spacing-96: 24rem     /* 384px */
```

### 字体系统

#### 字体家族
```css
--font-sans: 'DM Sans', system-ui, sans-serif
--font-serif: Georgia, serif
--font-mono: 'JetBrains Mono', monospace
--font-display: 'Syne', 'DM Sans', sans-serif
```

#### 字号 (12 个)
```css
--text-2xs: 0.625rem    /* 10px */
--text-xs: 0.75rem      /* 12px */
--text-sm: 0.8125rem    /* 13px */
--text-base: 0.875rem   /* 14px - 应用默认 */
--text-md: 1rem         /* 16px */
/* ... */
--text-6xl: 3.75rem     /* 60px */
```

### 圆角系统

```css
--rounded-none: 0
--rounded-sm: 0.125rem    /* 2px */
--rounded: 0.25rem        /* 4px */
--rounded-md: 0.375rem    /* 6px */
--rounded-lg: 0.5rem      /* 8px */
--rounded-xl: 0.75rem     /* 12px */
--rounded-2xl: 1rem       /* 16px */
--rounded-3xl: 1.5rem     /* 24px */
--rounded-full: 9999px
```

### 阴影系统

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05)
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), ...
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), ...
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), ...
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), ...
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25)
--shadow-inner: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)
```

### Z-index 系统

```css
--z-auto: auto
--z-0: 0
--z-10: 10
--z-dropdown: 1000
--z-sticky: 1020
--z-fixed: 1030
--z-modal-backdrop: 1040
--z-modal: 1050
--z-popover: 1060
--z-tooltip: 1070
--z-toast: 1080
--z-max: 9999
```

### 动画系统

#### 缓动函数
```css
--ease-linear: linear
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)
--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1)
```

#### 动画时长
```css
--duration-75: 75ms
--duration-100: 100ms
--duration-150: 150ms
--duration-200: 200ms
--duration-300: 300ms
--duration-500: 500ms
--duration-700: 700ms
--duration-1000: 1000ms
```

---

## 📝 命名规范

### 全局设计令牌

| 类型 | 格式 | 示例 |
|------|------|------|
| 基础色板 | `--color-{palette}-{shade}` | `--color-blue-500` |
| 语义颜色 | `--color-{semantic}(-{variant})?` | `--color-primary-light` |
| 文本颜色 | `--text-{variant}` | `--text-primary` |
| 背景颜色 | `--bg-{variant}` | `--bg-surface` |
| 边框颜色 | `--border-{variant}` | `--border-default` |
| 间距 | `--spacing-{value}` | `--spacing-4` |
| 圆角 | `--rounded(-{size})?` | `--rounded-lg` |
| 阴影 | `--shadow(-{size})?` | `--shadow-md` |
| Z-index | `--z-{level}` | `--z-modal` |
| 缓动 | `--ease-{variant}` | `--ease-out` |
| 时长 | `--duration-{value}` | `--duration-200` |

### 组件作用域变量

```css
--{component}-{property}(-{variant})?
```

示例：
- `--header-height`, `--header-bg`
- `--mega-menu-radius`, `--mega-menu-padding`
- `--check-size`, `--check-border`

---

## 🎯 最佳实践

### ✅ 推荐做法

```css
/* 使用设计令牌 */
.button {
  color: var(--color-primary);
  padding: var(--spacing-4);
  border-radius: var(--rounded-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--duration-200) var(--ease-out);
}

/* 使用语义化命名 */
.button--primary { }
.button--secondary { }
.button--large { }
```

### ❌ 避免做法

```css
/* 硬编码值 */
.button {
  color: #3b82f6;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

/* 非语义化命名 */
.blue-button { }
.big-text { }
```

---

## 🔧 工作流程

### 日常开发

```bash
# 1. 开发新功能
vim src/modules/my-module/my-module.css

# 2. 使用设计令牌
.my-component {
  color: var(--color-primary);
  padding: var(--spacing-4);
}

# 3. 如需新令牌，修改配置
vim src/common/config/design-tokens.ts

# 4. 重新生成
npm run generate:tokens

# 5. 审查变量使用
npm run css:audit
```

### 添加新颜色

```typescript
// 1. 编辑 design-tokens.ts
export const COLOR_PALETTES = {
  // ... 现有颜色
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    // ... 完整 11 级梯度
    950: '#042f2e'
  }
};

// 2. 运行生成命令
npm run generate:tokens

// 3. 自动生成:
// - CSS: --color-teal-50, --color-teal-100, ...
// - Tailwind: bg-teal-500, text-teal-600, ...
// - TypeScript: type ColorPaletteName = ... | 'teal'
```

### 修改间距

```typescript
// 1. 编辑 design-tokens.ts
export const SPACING = {
  // ... 现有间距
  13: '3.25rem'  // 新增 52px
};

// 2. 运行生成命令
npm run generate:tokens

// 3. 自动生成:
// - CSS: --spacing-13: 3.25rem
// - Tailwind: p-13, m-13, gap-13, ...
// - TypeScript: type SpacingValue = ... | '13'
```

---

## 📚 相关文档

### 详细文档
- [CSS 架构指南](./css-architecture-guide.md) - 完整使用指南

### 示例代码
- [最佳实践示例](../../../examples/css-best-practices/component-example.css) - 6 个组件示例

### 源代码
- [设计令牌配置](../../../src/common/config/design-tokens.ts) - 令牌定义
- [生成脚本](../../../scripts/) - 自动化脚本

---

## ❓ 常见问题

### Q: 如何添加新的颜色？
A: 在 `design-tokens.ts` 中添加颜色，然后运行 `npm run generate:tokens`。

### Q: 如何修改现有的设计令牌？
A: 修改 `design-tokens.ts` 后运行 `npm run generate:tokens`，所有配置会自动同步。

### Q: 生成的文件可以手动编辑吗？
A: 不可以。生成的文件（`*.generated.*`）会在下次运行时被覆盖。

### Q: 如何检查变量使用是否符合规范？
A: 运行 `npm run css:audit` 查看详细报告。

### Q: 如何迁移已废弃的变量？
A: 运行 `npm run css:migrate:dry` 预览，然后运行 `npm run css:migrate` 执行迁移。

---

## 🎉 总结

新的 CSS 架构系统提供：
- ✅ 300+ 个设计令牌
- ✅ 自动生成配置
- ✅ 类型安全支持
- ✅ 审查和迁移工具
- ✅ 完整的文档体系

**开始使用**: 运行 `npm run generate:tokens` 生成所有配置文件！

---

**维护者**: sops 开发团队  
**更新时间**: 2026-03-01
