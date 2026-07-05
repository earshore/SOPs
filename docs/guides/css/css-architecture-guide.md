# CSS 架构指南

> **版本**: 2.0  
> **更新时间**: 2026-04-17  
> **适用范围**: sops 项目

---

## 📚 目录

1. [架构概览](#架构概览)
2. [设计令牌系统](#设计令牌系统)
3. [文件组织结构](#文件组织结构)
4. [命名规范](#命名规范)
5. [主题系统](#主题系统)
6. [模块 CSS 开发](#模块-css-开发)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)

---

## 架构概览

### 设计原则

1. **单一数据源 (Single Source of Truth)**
   - 所有设计令牌定义在 `src/common/config/design-tokens.ts`
   - 自动生成 CSS 变量、Tailwind 配置和 TypeScript 类型
   - 确保所有配置保持同步

2. **分层架构 (Layered Architecture)**
   ```
   Foundation (基础层)
      ↓
   Components (组件层)
      ↓
   Layouts (布局层)
      ↓
   Animations (动画层)
      ↓
   Utilities (工具层)
      ↓
   Tailwind (框架层)
   ```

3. **模块化设计 (Modular Design)**
   - 全局样式与模块样式分离
   - 组件样式可复用
   - 模块样式按需懒加载

4. **性能优先 (Performance First)**
   - CSS 代码分割
   - 模块懒加载
   - 关键 CSS 内联

---

## 设计令牌系统

### 什么是设计令牌？

设计令牌是设计系统的最小单位，包括颜色、间距、字体、圆角、阴影等视觉属性。

### 令牌定义

所有设计令牌定义在 `src/common/config/design-tokens.ts`:

```typescript
export const DESIGN_TOKENS = {
  colors: {
    palettes: { /* 基础色板 */ },
    semantic: { /* 语义颜色 */ }
  },
  spacing: { /* 间距系统 */ },
  typography: { /* 字体系统 */ },
  borderRadius: { /* 圆角系统 */ },
  boxShadow: { /* 阴影系统 */ },
  zIndex: { /* 层级系统 */ },
  animation: { /* 动画系统 */ },
  breakpoints: { /* 断点系统 */ },
  container: { /* 容器系统 */ }
};
```

### 自动生成

修改设计令牌后，运行以下命令自动生成所有配置文件：

```bash
npm run generate:tokens
```

这会生成：
- `src/css/foundation/variables.generated.css` - CSS 变量
- `tailwind.config.generated.js` - Tailwind 配置
- `src/common/types/design-tokens.generated.ts` - TypeScript 类型

### 使用设计令牌

#### 在 CSS 中使用

```css
.my-component {
  /* 使用颜色令牌 */
  color: var(--color-primary);
  background: var(--color-slate-50);
  
  /* 使用间距令牌 */
  padding: var(--spacing-4);
  margin: var(--spacing-2);
  
  /* 使用圆角令牌 */
  border-radius: var(--rounded-lg);
  
  /* 使用阴影令牌 */
  box-shadow: var(--shadow-md);
  
  /* 使用动画令牌 */
  transition: all var(--duration-200) var(--ease-out);
}
```

#### 在 Tailwind 中使用

```html
<div class="bg-primary text-white p-4 rounded-lg shadow-md">
  使用 Tailwind 工具类
</div>
```

#### 在 TypeScript 中使用

```typescript
import { DESIGN_TOKENS } from '@/common/config/design-tokens';
import type { ColorPaletteName, SpacingValue } from '@/common/types/design-tokens.generated';

const primaryColor = DESIGN_TOKENS.colors.palettes.blue[500];
const spacing: SpacingValue = '4';
```

---

## 文件组织结构

### 目录结构

```
src/css/
├── foundation/              # 基础层
│   ├── variables.css        # 手动维护的变量（已废弃）
│   ├── variables.generated.css  # 自动生成的变量 ✅
│   └── reset.css            # CSS Reset
├── components/              # 组件层
│   ├── badges.css
│   ├── buttons.css
│   ├── cards.css
│   ├── forms.css
│   ├── modals.css
│   └── ...
├── layouts/                 # 布局层
│   ├── container.css
│   ├── grid.css
│   └── sidebar.css
├── animations/              # 动画层
│   ├── transitions.css
│   └── keyframes.css
├── utilities/               # 工具层
│   ├── spacing.css
│   └── typography.css
└── main.css                 # CSS 入口文件

src/modules/
└── {module_name}/
    └── {module_name}_style.css  # 模块特有样式
```

### 导入顺序

在 `src/css/main.css` 中按照以下顺序导入：

```css
/* 1. 基础层 */
@import './foundation/variables.generated.css';
@import './foundation/reset.css';

/* 2. 组件层 */
@import './components/buttons.css';
@import './components/cards.css';
/* ... */

/* 3. 布局层 */
@import './layouts/container.css';
/* ... */

/* 4. 动画层 */
@import './animations/transitions.css';
/* ... */

/* 5. 工具层 */
@import './utilities/spacing.css';
/* ... */

/* 6. Tailwind (最后加载，优先级最高) */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 命名规范

### CSS 变量命名

遵循 `--{category}-{property}-{variant}` 格式：

```css
/* 基础色板: --color-{palette}-{shade} */
--color-blue-500: #3b82f6;
--color-slate-200: #e2e8f0;

/* 语义令牌: --{category}-{property}-{variant} */
--text-primary: var(--color-slate-900);
--bg-surface: var(--color-white);
--border-default: var(--color-slate-200);

/* 组件令牌: --{component}-{property}-{state} */
--button-bg-default: var(--color-primary);
--button-bg-hover: var(--color-primary-dark);
--card-shadow-default: var(--shadow-md);
```

### CSS 类命名

遵循 BEM (Block Element Modifier) 规范：

```css
/* Block */
.card { }

/* Element */
.card__header { }
.card__body { }
.card__footer { }

/* Modifier */
.card--primary { }
.card--large { }
.card__header--sticky { }
```

### TypeScript 命名

```typescript
// 类型使用 PascalCase
export type ColorPaletteName = 'blue' | 'purple';
export interface ThemeConfig { }

// 变量和函数使用 camelCase
export const colorSchemes: Record<string, ColorScheme>;
export function applyTheme(config: ThemeConfig): void;

// 常量使用 UPPER_SNAKE_CASE
export const DESIGN_TOKENS = { };
export const DEFAULT_THEME = 'blue';
```

---

## 主题系统

### 主题配置

主题配置在 `src/common/config/themeConfig.ts`:

```typescript
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认主题',
    colorScheme: 'blue'
  },
  ocean: {
    id: 'ocean',
    name: '海洋主题',
    colorScheme: 'cyan'
  }
  // ... 更多主题
};
```

### 应用主题

```typescript
import { ThemeManager } from '@/common/config/themeConfig';

// 应用预设主题
ThemeManager.applyTheme('ocean');

// 应用自定义主题
ThemeManager.applyTheme({
  id: 'custom',
  name: '自定义主题',
  colorScheme: 'purple',
  customVars: {
    '--color-primary': '#9333ea'
  }
});
```

### 主题切换性能优化

使用 CSS 类而非运行时修改变量：

```css
/* 预编译主题样式 */
.theme-blue {
  --color-primary: var(--color-blue-500);
  --color-primary-light: var(--color-blue-400);
}

.theme-purple {
  --color-primary: var(--color-purple-500);
  --color-primary-light: var(--color-purple-400);
}
```

```typescript
// 运行时只需切换 class
document.documentElement.className = `theme-${themeName}`;
```

---

## 模块 CSS 开发

### 模块 CSS 职责

模块 CSS 应该只包含：
- ✅ 模块特有的布局结构
- ✅ 模块特有的组件变体
- ✅ 模块特有的动画效果

模块 CSS 不应该包含：
- ❌ 通用组件样式 (应在 `src/css/components/`)
- ❌ 全局工具类 (应在 `src/css/utilities/`)
- ❌ 基础样式重置 (应在 `src/css/foundation/`)

### 创建模块 CSS

1. 在模块目录创建样式文件：
   ```
   src/modules/my_module/my_module_style.css
   ```

2. 在模块入口静态导入模块样式：
   ```typescript
   // src/modules/my_module/index.ts
   import './my_module_style.css';
   ```

3. 编写模块样式：
   ```css
   /**
    * My Module 样式
    * 仅包含模块特有样式
    */
   
   /* 模块容器 */
   #my_module_container {
     /* 使用设计令牌 */
     padding: var(--spacing-4);
     background: var(--bg-surface);
   }
   
   /* 模块特有组件 */
   .my-module-special-card {
     /* 继承通用卡片样式，添加特有样式 */
     border-left: 4px solid var(--color-primary);
   }
   ```

### 模块 CSS 审查清单

在提交代码前，检查以下项目：

- [ ] 是否包含通用组件样式？(应提取到 `src/css/components/`)
- [ ] 是否使用了硬编码颜色值？(应使用 CSS 变量)
- [ ] 是否遵循命名规范？
- [ ] 是否有重复的样式定义？
- [ ] 是否正确使用了设计令牌？
- [ ] 是否添加了必要的注释？

---

## 最佳实践

### 1. 始终使用设计令牌

❌ 不好的做法：
```css
.button {
  color: #3b82f6;
  padding: 16px;
  border-radius: 8px;
}
```

✅ 好的做法：
```css
.button {
  color: var(--color-primary);
  padding: var(--spacing-4);
  border-radius: var(--rounded-lg);
}
```

### 2. 避免硬编码值

❌ 不好的做法：
```css
.card {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}
```

✅ 好的做法：
```css
.card {
  box-shadow: var(--shadow-md);
  transition: all var(--duration-300) var(--ease-out);
}
```

### 3. 使用语义化命名

❌ 不好的做法：
```css
.blue-button { }
.big-text { }
```

✅ 好的做法：
```css
.button--primary { }
.text--heading { }
```

### 4. 保持样式作用域

❌ 不好的做法：
```css
/* 在模块 CSS 中定义全局样式 */
.card {
  /* 影响所有卡片 */
}
```

✅ 好的做法：
```css
/* 使用模块前缀 */
.my-module-card {
  /* 只影响当前模块 */
}
```

### 5. 优化性能

```css
/* 使用 transform 和 opacity 进行动画 */
.animated-element {
  transition: transform var(--duration-200) var(--ease-out),
              opacity var(--duration-200) var(--ease-out);
}

.animated-element:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

/* 避免动画 width、height、top、left */
```

### 6. 响应式设计

```css
/* 移动优先 */
.container {
  padding: var(--spacing-4);
}

/* 平板 */
@media (min-width: 768px) {
  .container {
    padding: var(--spacing-6);
  }
}

/* 桌面 */
@media (min-width: 1024px) {
  .container {
    padding: var(--spacing-8);
  }
}
```

---

## 常见问题

### Q: 如何添加新的颜色？

A: 在 `src/common/config/design-tokens.ts` 中添加颜色，然后运行 `npm run generate:tokens`。

### Q: 如何修改现有的设计令牌？

A: 修改 `design-tokens.ts` 后运行 `npm run generate:tokens`，所有配置会自动同步。

### Q: 模块 CSS 和组件 CSS 的区别？

A: 
- 组件 CSS: 可复用的通用组件样式，位于 `src/css/components/`
- 模块 CSS: 模块特有的样式，位于 `src/modules/{module}/`

### Q: 如何调试 CSS 变量？

A: 在浏览器开发者工具中查看 `:root` 的计算样式，或使用以下代码：

```javascript
// 获取 CSS 变量值
getComputedStyle(document.documentElement).getPropertyValue('--color-primary');

// 设置 CSS 变量值
document.documentElement.style.setProperty('--color-primary', '#9333ea');
```

### Q: 如何处理 CSS 优先级问题？

A: 遵循以下优先级顺序：
1. 内联样式 (避免使用)
2. ID 选择器 (避免使用)
3. 类选择器 (推荐)
4. 元素选择器 (基础样式)

### Q: 如何确保主题切换不影响性能？

A: 使用预编译的主题 class，避免运行时修改大量 CSS 变量。

---

## 相关文档

- [CSS 架构优化方案](./css-architecture-optimization-plan.md)
- [设计令牌配置](../src/common/config/design-tokens.ts)
- [主题配置](../src/common/config/themeConfig.ts)
- [颜色方案](../src/common/constants/colorSchemes.ts)

---

**最后更新**: 2026-03-01  
**维护者**: AihangSOP 开发团队
