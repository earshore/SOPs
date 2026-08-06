# CSS 快速参考

> 本速查仅为实现参考，非规范决策源；类名/变量以 `src/css/components/*` 与 `foundation/variables*.css` 实际为准（THEME_SYSTEM_GUIDELINES §10）

## 🎨 CSS 变量速查

### 颜色

```css
/* 中性色 */
var(--color-slate-50)   /* #f8fafc - 最浅 */
var(--color-slate-500)  /* #64748b - 中等 */
var(--color-slate-900)  /* #0f172a - 最深 */

/* 主题色 */
var(--color-blue-500)   /* #3b82f6 - 主蓝色 */
var(--color-purple-500) /* #a855f7 - 紫色 */
var(--color-sky-500)    /* #0ea5e9 - 天蓝 */

/* 功能色 */
var(--color-green-500)  /* #22c55e - 成功 */
var(--color-red-500)    /* #ef4444 - 错误 */
var(--color-amber-500)  /* #f59e0b - 警告 */
```

### 间距

```css
var(--spacing-xs)   /* 8px */
var(--spacing-sm)   /* 12px */
var(--spacing-md)   /* 16px */
var(--spacing-lg)   /* 24px */
var(--spacing-xl)   /* 32px */
```

### 圆角

```css
var(--rounded-sm)    /* 4px */
var(--rounded-md)    /* 8px */
var(--rounded-lg)    /* 12px */
var(--rounded-xl)    /* 16px */
var(--rounded-full)  /* 9999px - 完全圆角 */
```

### 动画

```css
/* 曲线 */
var(--ease-smooth)  /* 丝滑过渡 */
var(--ease-spring)  /* Q弹效果 */

/* 时长 */
var(--duration-fast)    /* 200ms */
var(--duration-normal)  /* 300ms */
var(--duration-slow)    /* 400ms */
```

## 🧩 组件类速查

### 卡片

```html
<div class="card">基础卡片</div>
<div class="card card-accent">带装饰条</div>
<div class="card card-glass">玻璃效果</div>
<div class="card card-compact">紧凑</div>

<!-- 卡片网格 -->
<div class="card-grid">
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

### 按钮

```html
<button class="action-btn">默认</button>
<button class="action-btn action-btn-primary">主要</button>
<button class="action-btn action-btn-secondary">次要</button>
<button class="action-btn action-btn-glow">发光</button>
```

### 徽章

```html
<span class="badge badge-success">成功</span>
<span class="badge badge-warning">警告</span>
<span class="badge badge-error">错误</span>
<span class="badge badge-info">信息</span>
<span class="badge badge-neutral">中性</span>

<!-- 尺寸 -->
<span class="badge badge-sm">小</span>
<span class="badge">默认</span>
<span class="badge badge-lg">大</span>
```

### 通知

```html
<div class="toast toast-success">成功消息</div>
<div class="toast toast-error">错误消息</div>
<div class="toast toast-warning">警告消息</div>
<div class="toast toast-info">信息消息</div>
```

### 滚动条

```html
<div class="scrollbar-thin">细滚动条</div>
<div class="scrollbar-custom">自定义滚动条</div>
<div class="scrollbar-none">隐藏滚动条</div>
```

### 动画

```html
<div class="fade-in">淡入</div>
<div class="slide-in">滑入</div>
<div class="pulse-dot">脉冲</div>
<div class="spin">旋转</div>
<div class="view-fade-in">页面淡入</div>
```

## 💡 使用技巧

### 1. 组合使用

```html
<div class="card card-accent fade-in">
  <div class="card-header">
    <h3 class="card-title">标题</h3>
    <span class="badge badge-success">新</span>
  </div>
  <div class="card-body">内容</div>
  <div class="card-footer">
    <button class="action-btn action-btn-primary">操作</button>
  </div>
</div>
```

### 2. 自定义样式

```css
.my-custom-card {
  /* 基于通用卡片扩展 */
  @apply card;

  /* 使用CSS变量 */
  background: linear-gradient(135deg, var(--color-blue-50), var(--color-purple-50));
  padding: var(--spacing-xl);
  border-radius: var(--rounded-2xl);
}
```

### 3. 响应式

```css
.my-element {
  padding: var(--spacing-md);
}

@media (max-width: 768px) {
  .my-element {
    padding: var(--spacing-sm);
  }
}
```

## 🔗 相关文档

- 完整文档: `src/css/README.md`
- 迁移清单: `docs/css-refactor-checklist.md`
- 变量定义: `src/css/foundation/variables.css`
