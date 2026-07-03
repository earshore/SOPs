# Welcome Banner 中优先级问题修复总结

## 修复内容

### ✅ #1 - 在桌面端启用装饰元素并调整到可见程度

**修改文件**: `src/css/components/welcome-banner.css`

**变更**:
1. **光球 (orbs)** - 启用并增强可见度
   ```css
   .wb-orb {
     display: block;          /* 从 display: none 改为 block */
     animation: floatSlow 12s ease-in-out infinite;  /* 启用动画 */
     opacity: 0.28;           /* 从 0.18 提升到 0.28 */
   }
   ```

2. **粒子 (particles)** - 启用显示
   ```css
   .wb-particle {
     display: block;          /* 从 display: none 改为 block */
   }
   ```

3. **脉冲环 (icon-ring)** - 启用动画
   ```css
   .wb-icon-ring {
     display: block;          /* 从 display: none 改为 block */
     animation: pulseRing 2s ease-out infinite;  /* 启用动画 */
   }
   ```

4. **移除平板端隐藏** - 删除 `@media (max-width: 768px)` 中的 `.wb-orb { display: none; }`

**效果**:
- 桌面端可见 3 个浮动光球 + 8 个闪烁粒子 + 图标脉冲环
- 平板/移动端保持显示（不再强制隐藏）
- 动画循环时长：光球 12s，粒子 3s，脉冲环 2s

---

### ✅ #2 - 启用徽章动画

**修改文件**: `src/css/components/welcome-banner.css`

**变更**:
1. **Safety 徽章脉冲动画**
   ```css
   .wb-badge-safety {
     animation: pulse 2s ease-in-out infinite;  /* 从 animation: none */
     will-change: transform;
   }
   ```

2. **Growth 徽章闪烁动画**
   ```css
   .wb-badge-growth {
     animation: blink 3s ease-in-out infinite;  /* 从 animation: none */
     will-change: opacity;
   }
   ```

3. **渐变徽章背景动画**
   ```css
   .wb-badge-animated {
     animation: gradientShift 4s ease-in-out infinite;  /* 从 animation: none */
   }
   ```

**效果**:
- `.wb-badge-safety` 类徽章会轻微缩放脉冲
- `.wb-badge-growth` 类徽章会淡入淡出
- `.wb-badge-animated` 类徽章背景渐变会移动

---

### ✅ #12 - 策略指南拆分为独立板块

**修改文件**: `src/modules/app_center/views/master_analysis/scraper/template.html`

**变更**:

**之前** - 嵌套在 `.wb-card` 内部:
```html
<div class="wb-card">
  <div class="wb-content">...</div>
  <!-- 分割线 -->
  <!-- 策略指南头部 -->
  <div @click="toggleRefineGuide()">...</div>
  <!-- 展开内容 -->
  <div x-show="refineGuideOpen">...</div>
</div>
```

**之后** - 独立板块:
```html
<div class="wb-card">
  <div class="wb-content">...</div>
</div>

<!-- 独立的策略指南板块 -->
<div class="strategy-guide-panel" x-data="{ guideOpen: false }">
  <div @click="guideOpen = !guideOpen">...</div>
  <div x-show="guideOpen">...</div>
</div>
```

**收益**:
1. **语义清晰** - Banner 与策略指南职责分离
2. **独立状态** - 使用独立的 `guideOpen` 变量，不依赖父组件
3. **样式解耦** - 可单独设置 `.strategy-guide-panel` 样式
4. **可维护性** - 策略指南可独立复用到其他页面

**图标可访问性**:
- 为所有装饰性图标添加 `aria-hidden="true"`

---

## 验证结果

```bash
npm run type-check
# ✓ TypeScript 类型检查通过
```

## 视觉效果对比

### 修复前
- ❌ 光球和粒子不可见
- ❌ 徽章静态无动画
- ❌ 策略指南嵌套在 Banner 内

### 修复后
- ✅ 光球缓慢浮动，不透明度 28%
- ✅ 粒子闪烁，增强深度感
- ✅ 图标周围脉冲环扩散
- ✅ Safety/Growth 徽章有动画
- ✅ 策略指南独立展示，视觉层级清晰

---

## 性能考虑

### 动画性能优化
- 所有动画使用 `transform` 和 `opacity`（GPU 加速）
- 添加 `will-change` 属性提前通知浏览器
- 使用 `contain: layout style paint` 隔离渲染
- `@media (prefers-reduced-motion)` 自动禁用动画

### 响应式策略
- 桌面端：完整装饰元素 + 动画
- 平板/移动端：保留装饰元素（性能损耗可接受）
- 用户设置减少动画：自动禁用所有动画

---

## 后续优化建议

### 低优先级（可选）
1. **#3** - 统一响应式断点（避免 768/769px 盲区）
2. **#6** - 标准化变体命名（`wb-banner--card` / `wb-banner--minimal`）
3. **#11** - 移除 "PC 自用版" 样式到用户配置

### 扩展主题示例
```css
/* 绿色主题（示例） */
.wb-theme-emerald {
  --wb-gradient-1: rgba(236, 253, 245, 0.95);
  --wb-gradient-2: rgba(209, 250, 229, 0.90);
  --wb-orb-1-color: rgba(52, 211, 153, 0.15);
  --wb-particle-color: rgba(16, 185, 129, 0.6);
}
```

---

## 代码变更统计

- **CSS 修改**: ~50 行
- **HTML 重构**: ~40 行
- **删除冗余**: ~10 行
- **净增加**: +30 行（主要是独立板块结构）

---

完成时间: 2026-06-10
