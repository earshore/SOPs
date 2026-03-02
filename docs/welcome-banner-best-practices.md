# Welcome Banner 组件最佳实践指南

## 目录

1. [徽章主题选择指南](#徽章主题选择指南)
2. [动画效果使用建议](#动画效果使用建议)
3. [性能优化建议](#性能优化建议)
4. [无障碍最佳实践](#无障碍最佳实践)
5. [响应式设计建议](#响应式设计建议)
6. [暗色模式适配建议](#暗色模式适配建议)
7. [代码组织建议](#代码组织建议)
8. [测试和验证建议](#测试和验证建议)

---

## 徽章主题选择指南

选择合适的徽章主题对于传达正确的信息和提升用户体验至关重要。

### 主题选择决策树

```
开始
  ├─ 是否与 AI/智能相关？
  │   └─ 是 → 使用 AI 主题 (wb-badge-ai)
  │
  ├─ 是否与数据增长/业务扩展相关？
  │   └─ 是 → 使用 Growth 主题 (wb-badge-growth)
  │
  ├─ 是否与安全/风险/警告相关？
  │   └─ 是 → 使用 Safety 主题 (wb-badge-safety)
  │
  ├─ 是否与客户服务/支持相关？
  │   └─ 是 → 使用 Service 主题 (wb-badge-service)
  │
  ├─ 是否与供应链/物流相关？
  │   └─ 是 → 使用 Supply 主题 (wb-badge-supply)
  │
  ├─ 是否与数据分析/报表相关？
  │   └─ 是 → 使用 Analytics 主题 (wb-badge-analytics)
  │
  ├─ 是否为高级/付费功能？
  │   └─ 是 → 使用 Pro 主题 (wb-badge-pro)
  │
  └─ 是否为功能中心/集成平台？
      └─ 是 → 使用 Hub 主题 (wb-badge-hub)
```

### 按页面类型推荐

| 页面类型 | 推荐主题 | 理由 | 示例 |
|---------|---------|------|------|
| AI 功能页面 | AI | 蓝色代表科技和智能 | Q&A 预研实验室、智能推荐 |
| 数据分析页面 | Analytics | 青色代表数据和分析 | 销售分析、流量统计 |
| 增长工具页面 | Growth | 绿色代表增长和活力 | 增长中心、业务扩展 |
| 安全中心页面 | Safety | 红色代表警告和重要性 | 安全检测、风险管理 |
| 客服系统页面 | Service | 紫色代表服务和支持 | 客服中心、工单系统 |
| 供应链页面 | Supply | 橙色代表物流和流动 | 库存管理、物流追踪 |
| 高级功能页面 | Pro | 金色代表专业和高端 | 专业版功能、付费工具 |
| 功能中心页面 | Hub | 灰色代表中立和集成 | 应用中心、控制台 |


### 主题组合建议

#### ✓ 推荐的组合

**AI + Pro**：适合高级 AI 功能
```html
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>
<span class="wb-badge wb-badge-pro" aria-label="专业功能">
  <i class="fa-solid fa-crown" aria-hidden="true"></i>
  <span>Pro</span>
</span>
```

**Analytics + Growth**：适合数据驱动的增长工具
```html
<span class="wb-badge wb-badge-analytics" aria-label="分析功能">
  <i class="fa-solid fa-chart-bar" aria-hidden="true"></i>
  <span>Analytics</span>
</span>
<span class="wb-badge wb-badge-growth" aria-label="增长功能">
  <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
  <span>Growth</span>
</span>
```

**Service + Hub**：适合服务集成中心
```html
<span class="wb-badge wb-badge-service" aria-label="服务功能">
  <i class="fa-solid fa-headset" aria-hidden="true"></i>
  <span>Service</span>
</span>
<span class="wb-badge wb-badge-hub" aria-label="中心功能">
  <i class="fa-solid fa-grid" aria-hidden="true"></i>
  <span>Hub</span>
</span>
```

#### ❌ 避免的组合

**Safety + Growth**：红色和绿色对比过强，视觉冲突
**AI + Analytics**：两者都是蓝色系，缺乏对比
**Pro + Hub**：金色和灰色组合缺乏吸引力

### 主题使用原则

1. **一致性原则**：同类功能使用相同主题
2. **对比度原则**：多个徽章组合时确保颜色对比明显
3. **语义化原则**：主题颜色应与功能含义匹配
4. **简洁性原则**：每个页面最多使用 2-3 个徽章
5. **可访问性原则**：确保所有徽章都有 `aria-label` 属性

### 自定义主题建议

如果 8 种预定义主题不满足需求，可以创建自定义主题：

```css
/* 创建自定义主题 */
.wb-badge-custom {
  --badge-gradient: linear-gradient(135deg, #ec4899, #f43f5e);
  --badge-shadow: 0 2px 8px rgba(236, 72, 153, 0.15);
}
```

**自定义主题注意事项**：
- 使用渐变背景而非纯色
- 确保文字对比度 ≥ 4.5:1
- 添加适当的阴影效果
- 在暗色模式下调整颜色亮度
- 为自定义主题添加 `aria-label` 属性

---

## 动画效果使用建议

动画效果可以提升用户体验，但过度使用会影响性能和可用性。

### 何时使用动画

#### ✓ 推荐使用动画的场景

1. **吸引注意力**：重要功能或新功能的徽章
   - 使用 Safety 主题的脉冲动画突出安全警告
   - 使用 Growth 主题的闪烁动画突出增长功能

2. **提供反馈**：用户交互的视觉反馈
   - 悬停时的颜色变化
   - 点击时的缩放效果

3. **增强美感**：背景装饰元素的微妙动画
   - 浮动光球的缓慢移动
   - 粒子元素的闪烁效果

#### ❌ 避免使用动画的场景

1. **频繁交互的元素**：避免在用户频繁点击的按钮上使用持续动画
2. **大量元素**：避免在同一页面上同时运行过多动画
3. **关键信息**：避免在重要文字或数据上使用分散注意力的动画
4. **低性能设备**：在移动端或低性能设备上减少动画

### 动画性能优化原则

#### 1. 仅使用 GPU 加速属性

```css
/* ✓ 推荐：使用 transform 和 opacity */
@keyframes goodAnimation {
  0% { transform: translateY(0) translateZ(0); opacity: 1; }
  100% { transform: translateY(-20px) translateZ(0); opacity: 0.5; }
}

/* ❌ 避免：使用触发重排的属性 */
@keyframes badAnimation {
  0% { top: 0; width: 100px; margin-top: 0; }
  100% { top: -20px; width: 120px; margin-top: 10px; }
}
```

#### 2. 添加 will-change 属性

```css
/* 为动画元素添加 will-change */
.wb-orb {
  will-change: transform;
}

.wb-particle {
  will-change: opacity;
}

/* 注意：不要过度使用 will-change */
/* ❌ 错误：为所有元素添加 will-change */
* {
  will-change: transform, opacity;
}
```

#### 3. 控制动画元素数量

```css
/* 在移动端隐藏装饰元素 */
@media (max-width: 768px) {
  .wb-orb,
  .wb-particle,
  .wb-grid-pattern {
    display: none;
  }
}
```

#### 4. 遵循 prefers-reduced-motion

```css
/* 尊重用户的减少动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .wb-orb,
  .wb-particle,
  .wb-icon-ring,
  .wb-badge-safety,
  .wb-badge-growth {
    animation: none !important;
  }
  
  .wb-card:hover,
  .wb-icon-main:hover {
    transform: none;
  }
}
```


### 动画时长建议

| 动画类型 | 推荐时长 | 理由 |
|---------|---------|------|
| 背景装饰动画 | 8-12秒 | 缓慢移动，不分散注意力 |
| 徽章脉冲动画 | 2-3秒 | 适度吸引注意力 |
| 徽章闪烁动画 | 1.5-2秒 | 快速闪烁，突出重要性 |
| 悬停效果 | 200-300ms | 快速响应，提供即时反馈 |
| 焦点效果 | 150-200ms | 快速响应，确保可访问性 |

### 动画缓动函数建议

```css
/* 自然流畅的动画 */
.natural-animation {
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 弹性效果 */
.bounce-animation {
  animation-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* 线性动画（适合渐变移动） */
.linear-animation {
  animation-timing-function: linear;
}

/* 缓入缓出（适合脉冲和闪烁） */
.ease-in-out-animation {
  animation-timing-function: ease-in-out;
}
```

### 自定义动画示例

#### 旋转动画

```css
@keyframes rotate {
  0% { transform: rotate(0deg) translateZ(0); }
  100% { transform: rotate(360deg) translateZ(0); }
}

.wb-icon-main.rotating {
  animation: rotate 3s linear infinite;
  will-change: transform;
}
```

#### 摇摆动画

```css
@keyframes shake {
  0%, 100% { transform: translateX(0) translateZ(0); }
  25% { transform: translateX(-5px) translateZ(0); }
  75% { transform: translateX(5px) translateZ(0); }
}

.wb-badge.shaking {
  animation: shake 0.5s ease-in-out;
  will-change: transform;
}
```

#### 呼吸动画

```css
@keyframes breathe {
  0%, 100% { opacity: 1; transform: scale(1) translateZ(0); }
  50% { opacity: 0.6; transform: scale(0.95) translateZ(0); }
}

.wb-icon-main.breathing {
  animation: breathe 3s ease-in-out infinite;
  will-change: opacity, transform;
}
```

---

## 性能优化建议

性能优化是确保 Welcome Banner 组件流畅运行的关键。

### CSS 性能优化

#### 1. 选择器优化

```css
/* ✓ 推荐：扁平化选择器 */
.wb-icon-main i {
  font-size: 26px;
}

.wb-badge {
  padding: 4px 12px;
}

/* ❌ 避免：深层嵌套选择器 */
.wb-container .wb-card .wb-content .wb-header .wb-icon-main i {
  font-size: 26px;
}

/* ❌ 避免：通配符选择器 */
.wb-container * {
  box-sizing: border-box;
}

/* ❌ 避免：属性选择器（性能较差） */
[class*="wb-badge-"] {
  padding: 4px 12px;
}
```

#### 2. 渲染优化

```css
/* 使用 contain 优化渲染 */
.wb-bg-gradient,
.wb-orb,
.wb-particle {
  contain: layout style paint;
}

/* 减少重绘 */
.wb-card {
  backface-visibility: hidden;
  perspective: 1000px;
}

/* 避免影响交互 */
.wb-particle,
.wb-grid-pattern {
  pointer-events: none;
}
```

#### 3. 动画优化

```css
/* 强制 GPU 加速 */
.wb-orb {
  transform: translateZ(0);
  will-change: transform;
}

/* 避免昂贵的 CSS 属性 */
/* ❌ 避免：box-shadow 动画 */
@keyframes badShadow {
  0% { box-shadow: 0 0 0 rgba(0, 0, 0, 0.1); }
  100% { box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3); }
}

/* ✓ 推荐：使用 opacity 模拟阴影变化 */
@keyframes goodShadow {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}
```

### 文件大小优化

#### 1. 移除重复样式

```css
/* ❌ 避免：重复定义 */
.wb-badge-ai {
  padding: 4px 12px;
  font-size: 0.625rem;
  border-radius: 12px;
}

.wb-badge-growth {
  padding: 4px 12px;
  font-size: 0.625rem;
  border-radius: 12px;
}

/* ✓ 推荐：使用基类 */
.wb-badge {
  padding: 4px 12px;
  font-size: 0.625rem;
  border-radius: 12px;
}

.wb-badge-ai {
  background: var(--badge-gradient);
}

.wb-badge-growth {
  background: var(--badge-gradient);
}
```

#### 2. 使用 CSS 变量

```css
/* ❌ 避免：重复颜色值 */
.wb-title {
  color: #0f172a;
}

.wb-description {
  color: #64748b;
}

.wb-tag span {
  color: #64748b;
}

/* ✓ 推荐：使用 CSS 变量 */
:root {
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
}

.wb-title {
  color: var(--color-text-primary);
}

.wb-description,
.wb-tag span {
  color: var(--color-text-secondary);
}
```

#### 3. 压缩 CSS 文件

```bash
# 使用 cssnano 压缩 CSS
npx cssnano src/css/components/welcome-banner.css dist/welcome-banner.min.css

# 使用 clean-css 压缩 CSS
npx clean-css -o dist/welcome-banner.min.css src/css/components/welcome-banner.css
```

### 加载性能优化

#### 1. 关键 CSS 内联

```html
<!-- 内联关键 CSS -->
<style>
  .wb-container {
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(255, 255, 255, 0.95) 35%);
  }
  
  .wb-content {
    position: relative;
    z-index: 10;
    padding: 3rem 4rem;
  }
</style>

<!-- 异步加载完整 CSS -->
<link rel="preload" href="/css/components/welcome-banner.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/css/components/welcome-banner.css"></noscript>
```

#### 2. 延迟加载非关键元素

```html
<!-- 使用 Intersection Observer 延迟加载装饰元素 -->
<script>
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('wb-loaded');
        observer.unobserve(entry.target);
      }
    });
  });

  document.querySelectorAll('.wb-orb, .wb-particle').forEach(el => {
    observer.observe(el);
  });
</script>

<style>
  .wb-orb,
  .wb-particle {
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .wb-orb.wb-loaded,
  .wb-particle.wb-loaded {
    opacity: 1;
  }
</style>
```


### 性能监控

#### 1. 监控动画帧率

```javascript
// 监控 FPS
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();
  
  if (currentTime >= lastTime + 1000) {
    const fps = Math.round((frames * 1000) / (currentTime - lastTime));
    console.log(`FPS: ${fps}`);
    
    // 如果 FPS < 60，禁用部分动画
    if (fps < 60) {
      document.querySelectorAll('.wb-orb, .wb-particle').forEach(el => {
        el.style.animation = 'none';
      });
    }
    
    frames = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

#### 2. 监控渲染时间

```javascript
// 使用 Performance Observer 监控渲染时间
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
    
    // 如果渲染时间 > 100ms，记录警告
    if (entry.duration > 100) {
      console.warn(`Slow render detected: ${entry.duration}ms`);
    }
  }
});

observer.observe({ entryTypes: ['measure'] });

// 测量渲染时间
performance.mark('wb-start');
// ... Welcome Banner 渲染
performance.mark('wb-end');
performance.measure('Welcome Banner Render', 'wb-start', 'wb-end');
```

#### 3. 使用 Lighthouse 测试

```bash
# 使用 Lighthouse CLI 测试性能
npx lighthouse https://your-site.com --only-categories=performance --view

# 关注以下指标：
# - First Contentful Paint (FCP): < 1.8s
# - Largest Contentful Paint (LCP): < 2.5s
# - Cumulative Layout Shift (CLS): < 0.1
# - Total Blocking Time (TBT): < 200ms
```

### 性能优化清单

- [ ] 所有动画仅使用 `transform` 和 `opacity`
- [ ] 为动画元素添加 `will-change` 属性
- [ ] 为装饰元素添加 `pointer-events: none`
- [ ] 在移动端隐藏装饰元素
- [ ] CSS 选择器嵌套不超过 3 层
- [ ] 避免使用通配符选择器
- [ ] 使用 CSS 变量减少重复值
- [ ] CSS 文件压缩后 < 8KB
- [ ] 首次渲染时间 < 100ms
- [ ] 动画帧率 ≥ 60fps
- [ ] 遵循 `prefers-reduced-motion` 偏好

---

## 无障碍最佳实践

确保 Welcome Banner 组件对所有用户都可访问。

### ARIA 属性使用

#### 1. 为徽章添加描述性标签

```html
<!-- ✓ 推荐：清晰的描述 -->
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>

<!-- ❌ 避免：模糊的描述 -->
<span class="wb-badge wb-badge-ai" aria-label="AI">
  <i class="fa-solid fa-sparkles"></i>
  <span>AI</span>
</span>
```

#### 2. 隐藏装饰性元素

```html
<!-- ✓ 推荐：隐藏装饰性图标 -->
<div class="wb-icon-main" aria-label="人工智能功能图标">
  <i class="fa-solid fa-robot" aria-hidden="true"></i>
</div>

<!-- ✓ 推荐：隐藏装饰性背景元素 -->
<div class="wb-orb wb-orb-1" aria-hidden="true"></div>
<div class="wb-particle wb-particle-1" aria-hidden="true"></div>

<!-- ❌ 避免：装饰性元素未隐藏 -->
<div class="wb-icon-main">
  <i class="fa-solid fa-robot"></i>
</div>
```

#### 3. 为可点击元素添加角色

```html
<!-- ✓ 推荐：使用 button 标签 -->
<button class="wb-badge wb-badge-ai" 
        aria-label="人工智能功能，点击了解更多"
        type="button">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</button>

<!-- 可接受：使用 role 属性 -->
<a href="#ai-features" 
   class="wb-badge wb-badge-ai" 
   aria-label="人工智能功能，点击了解更多">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</a>

<!-- ❌ 避免：使用 div 且缺少 role -->
<div class="wb-badge wb-badge-ai" onclick="showAIFeatures()">
  <i class="fa-solid fa-sparkles"></i>
  <span>AI</span>
</div>
```

### 语义化 HTML

#### 1. 使用正确的标题层级

```html
<!-- ✓ 推荐：正确的标题层级 -->
<h1 class="page-title">应用中心</h1>
<div class="wb-container">
  <h2 class="wb-title">Q&A 预研实验室</h2>
</div>

<!-- ❌ 避免：跳过标题层级 -->
<h1 class="page-title">应用中心</h1>
<div class="wb-container">
  <h3 class="wb-title">Q&A 预研实验室</h3>
</div>

<!-- ❌ 避免：使用 div 代替标题 -->
<div class="wb-container">
  <div class="wb-title">Q&A 预研实验室</div>
</div>
```

#### 2. 使用列表标签

```html
<!-- ✓ 推荐：使用 ul/li -->
<ul class="wb-tags" role="list">
  <li class="wb-tag" role="listitem">
    <div class="wb-tag-dot" aria-hidden="true"></div>
    <span>智能生成</span>
  </li>
  <li class="wb-tag" role="listitem">
    <div class="wb-tag-dot" aria-hidden="true"></div>
    <span>多维度分析</span>
  </li>
</ul>

<!-- ❌ 避免：使用 div -->
<div class="wb-tags">
  <div class="wb-tag">
    <div class="wb-tag-dot"></div>
    <span>智能生成</span>
  </div>
  <div class="wb-tag">
    <div class="wb-tag-dot"></div>
    <span>多维度分析</span>
  </div>
</div>
```

### 键盘导航

#### 1. 确保焦点可见

```css
/* ✓ 推荐：清晰的焦点样式 */
.wb-badge:focus-visible,
.wb-tag:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* 移除鼠标点击时的焦点样式 */
.wb-badge:focus:not(:focus-visible) {
  outline: none;
  box-shadow: var(--badge-shadow);
}

/* ❌ 避免：移除所有焦点样式 */
.wb-badge:focus {
  outline: none;
}
```

#### 2. 支持键盘操作

```javascript
// 为可点击徽章添加键盘支持
document.querySelectorAll('.wb-badge[role="button"]').forEach(badge => {
  badge.addEventListener('keydown', (e) => {
    // Enter 或 Space 键触发点击
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      badge.click();
    }
  });
});
```

### 对比度要求

#### 1. 验证文字对比度

使用对比度检查工具验证所有文字：

**在线工具**：
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Contrast Ratio: https://contrast-ratio.com/

**要求**：
- 标题文字：≥ 4.5:1 (WCAG AA)
- 描述文字：≥ 4.5:1 (WCAG AA)
- 标签文字：≥ 4.5:1 (WCAG AA)
- 徽章文字：≥ 4.5:1 (WCAG AA)

#### 2. 确保暗色模式对比度

```css
/* 明亮模式 */
.wb-title {
  color: #0f172a; /* slate-900, 对比度 16.1:1 ✓ */
}

.wb-description {
  color: #64748b; /* slate-600, 对比度 4.6:1 ✓ */
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .wb-title {
    color: #f1f5f9; /* slate-100, 对比度 12.5:1 ✓ */
  }

  .wb-description {
    color: #cbd5e1; /* slate-300, 对比度 8.2:1 ✓ */
  }
}
```

### 无障碍测试

#### 1. 使用屏幕阅读器测试

**macOS (VoiceOver)**：
```bash
# 启用 VoiceOver
Cmd + F5

# 导航命令
# Tab: 下一个可交互元素
# Shift + Tab: 上一个可交互元素
# Ctrl + Option + 右箭头: 下一个元素
# Ctrl + Option + 左箭头: 上一个元素
```

**Windows (NVDA)**：
```bash
# 下载 NVDA: https://www.nvaccess.org/

# 导航命令
# Tab: 下一个可交互元素
# Shift + Tab: 上一个可交互元素
# 下箭头: 下一个元素
# 上箭头: 上一个元素
```

#### 2. 使用自动化测试工具

**axe DevTools**：
```javascript
// 安装 axe-core
npm install --save-dev axe-core

// 运行测试
const axe = require('axe-core');

axe.run(document, {
  rules: {
    'color-contrast': { enabled: true },
    'aria-required-attr': { enabled: true },
    'button-name': { enabled: true }
  }
}).then(results => {
  console.log(results.violations);
});
```

**Lighthouse**：
```bash
# 运行无障碍测试
npx lighthouse https://your-site.com --only-categories=accessibility --view
```

### 无障碍清单

- [ ] 所有徽章都有 `aria-label` 属性
- [ ] 所有装饰性图标都有 `aria-hidden="true"` 属性
- [ ] 使用正确的标题层级 (h1, h2, h3)
- [ ] 使用语义化 HTML 标签 (ul, li, button)
- [ ] 可点击元素有清晰的焦点样式
- [ ] 支持键盘导航 (Tab, Enter, Space)
- [ ] 所有文字对比度 ≥ 4.5:1
- [ ] 暗色模式下对比度 ≥ 4.5:1
- [ ] 通过屏幕阅读器测试
- [ ] 通过自动化无障碍测试工具


---

## 响应式设计建议

确保 Welcome Banner 在所有设备上都有良好的显示效果。

### 断点策略

#### 移动优先策略

```css
/* 基础样式（移动端） */
.wb-content {
  padding: 0.75rem 1rem;
}

.wb-icon-main {
  width: 48px;
  height: 48px;
}

/* 平板 */
@media (min-width: 481px) {
  .wb-content {
    padding: 1.5rem 1rem;
  }

  .wb-icon-main {
    width: 56px;
    height: 56px;
  }
}

/* 桌面 */
@media (min-width: 769px) {
  .wb-content {
    padding: 3rem 4rem;
  }

  .wb-icon-main {
    width: 64px;
    height: 64px;
  }
}
```

### 触摸目标优化

#### 1. 确保最小触摸目标尺寸

```css
/* 所有可点击元素 ≥ 44x44px */
.wb-badge,
.wb-tag,
button,
a {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* 移动端增加内边距 */
@media (max-width: 768px) {
  .wb-badge,
  .wb-tag {
    padding: 8px 12px;
  }
}
```

#### 2. 增加元素间距

```css
/* 避免误触 */
.wb-title-row {
  gap: 0.75rem;
}

.wb-tags {
  gap: 0.75rem;
}

/* 移动端增加间距 */
@media (max-width: 768px) {
  .wb-title-row {
    gap: 1rem;
  }

  .wb-tags {
    gap: 1rem;
  }
}
```

### 流式布局

#### 1. 使用 Flexbox

```css
/* ✓ 推荐：流式布局 */
.wb-header {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.wb-text {
  flex: 1;
  min-width: 0; /* 允许文字换行 */
}

/* ❌ 避免：固定宽度 */
.wb-text {
  width: 600px;
}
```

#### 2. 确保文字换行

```css
/* 允许文字换行 */
.wb-title,
.wb-description {
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* 避免水平滚动 */
.wb-container,
.wb-card {
  max-width: 100%;
  overflow-x: hidden;
}
```

### 图片和图标优化

#### 1. 使用 SVG 图标

```html
<!-- ✓ 推荐：SVG 图标（可缩放） -->
<svg class="wb-icon" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
</svg>

<!-- 可接受：Font Awesome 图标 -->
<i class="fa-solid fa-robot" aria-hidden="true"></i>

<!-- ❌ 避免：位图图标（不可缩放） -->
<img src="icon.png" alt="图标">
```

#### 2. 响应式图标尺寸

```css
/* 使用相对单位 */
.wb-icon-main i {
  font-size: 1.625rem; /* 26px */
}

@media (max-width: 768px) {
  .wb-icon-main i {
    font-size: 1.5rem; /* 24px */
  }
}

@media (max-width: 480px) {
  .wb-icon-main i {
    font-size: 1.25rem; /* 20px */
  }
}
```

### 测试不同设备

#### 常见设备尺寸

| 设备类型 | 屏幕尺寸 | 测试要点 |
|---------|---------|---------|
| iPhone SE | 375x667 | 最小移动端尺寸 |
| iPhone 12/13 | 390x844 | 标准移动端尺寸 |
| iPhone 12/13 Pro Max | 428x926 | 大屏移动端 |
| iPad Mini | 768x1024 | 小平板 |
| iPad Pro | 1024x1366 | 大平板 |
| 桌面 | 1920x1080 | 标准桌面 |
| 桌面 | 2560x1440 | 高分辨率桌面 |

#### 测试方法

```javascript
// 使用 Chrome DevTools 测试
// 1. 打开 DevTools (F12)
// 2. 点击设备工具栏图标 (Ctrl+Shift+M)
// 3. 选择设备或自定义尺寸
// 4. 测试以下功能：
//    - 布局是否正确
//    - 文字是否可读
//    - 触摸目标是否足够大
//    - 是否出现水平滚动条
```

### 响应式清单

- [ ] 支持最小屏幕宽度 375px
- [ ] 在平板和移动端隐藏装饰元素
- [ ] 触摸目标 ≥ 44x44px
- [ ] 元素间距足够避免误触
- [ ] 使用流式布局，避免固定宽度
- [ ] 文字可以正常换行
- [ ] 不出现水平滚动条
- [ ] 在所有断点下测试通过

---

## 暗色模式适配建议

确保 Welcome Banner 在暗色模式下有良好的视觉效果。

### 颜色选择原则

#### 1. 提高亮度

```css
/* 明亮模式 */
.wb-badge-ai {
  --badge-gradient: linear-gradient(135deg, #3b82f6, #6366f1);
}

/* 暗色模式：提高亮度 */
@media (prefers-color-scheme: dark) {
  .wb-badge-ai {
    --badge-gradient: linear-gradient(135deg, #60a5fa, #818cf8);
  }
}
```

#### 2. 调整对比度

```css
/* 明亮模式 */
.wb-title {
  color: #0f172a; /* slate-900 */
}

.wb-description {
  color: #64748b; /* slate-600 */
}

/* 暗色模式：提高对比度 */
@media (prefers-color-scheme: dark) {
  .wb-title {
    color: #f1f5f9; /* slate-100 */
  }

  .wb-description {
    color: #cbd5e1; /* slate-300 */
  }
}
```

#### 3. 调整透明度

```css
/* 明亮模式 */
.wb-tag {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 暗色模式：调整透明度 */
@media (prefers-color-scheme: dark) {
  .wb-tag {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
}
```

### 使用 CSS 变量

```css
/* 定义颜色变量 */
.wb-container,
.wb-card {
  --wb-text-primary: #0f172a;
  --wb-text-secondary: #64748b;
  --wb-border-color: rgba(0, 0, 0, 0.1);
  --wb-tag-bg: rgba(255, 255, 255, 0.7);
}

/* 暗色模式：覆盖变量 */
@media (prefers-color-scheme: dark) {
  .wb-container,
  .wb-card {
    --wb-text-primary: #f1f5f9;
    --wb-text-secondary: #cbd5e1;
    --wb-border-color: rgba(255, 255, 255, 0.1);
    --wb-tag-bg: rgba(0, 0, 0, 0.3);
  }
}

/* 使用变量 */
.wb-title {
  color: var(--wb-text-primary);
}

.wb-description {
  color: var(--wb-text-secondary);
}

.wb-tag {
  background: var(--wb-tag-bg);
  border-color: var(--wb-border-color);
}
```

### 平滑过渡

```css
/* 添加过渡效果 */
.wb-container,
.wb-card,
.wb-title,
.wb-description,
.wb-tag,
.wb-badge {
  transition: 
    background-color 300ms ease,
    color 300ms ease,
    border-color 300ms ease;
}
```

### 测试暗色模式

#### 1. 系统级测试

**macOS**：
- 系统偏好设置 → 通用 → 外观 → 深色

**Windows**：
- 设置 → 个性化 → 颜色 → 选择模式 → 深色

#### 2. 浏览器级测试

**Chrome DevTools**：
```bash
# 1. 打开 DevTools (F12)
# 2. 按 Cmd+Shift+P (Mac) 或 Ctrl+Shift+P (Windows)
# 3. 输入 "dark" 并选择 "Emulate CSS prefers-color-scheme: dark"
```

#### 3. 自动化测试

```javascript
// 测试暗色模式样式
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function testDarkMode() {
  if (darkModeQuery.matches) {
    console.log('暗色模式已启用');
    
    // 验证文字颜色
    const title = document.querySelector('.wb-title');
    const titleColor = getComputedStyle(title).color;
    console.log('标题颜色:', titleColor);
    
    // 验证背景颜色
    const container = document.querySelector('.wb-container');
    const bgColor = getComputedStyle(container).backgroundColor;
    console.log('背景颜色:', bgColor);
  }
}

// 监听暗色模式变化
darkModeQuery.addEventListener('change', testDarkMode);
testDarkMode();
```

### 暗色模式清单

- [ ] 所有文字对比度 ≥ 4.5:1
- [ ] 徽章颜色提高亮度
- [ ] 背景颜色调整为暗色调
- [ ] 边框颜色可见
- [ ] 标签背景可见
- [ ] 添加平滑过渡效果
- [ ] 使用 CSS 变量实现主题切换
- [ ] 在系统暗色模式下测试
- [ ] 在浏览器 DevTools 中测试

---

## 代码组织建议

保持代码清晰、可维护和易于扩展。

### 文件结构

```
src/css/components/
└── welcome-banner.css          # 组件主样式文件
    ├── 基础样式
    ├── 容器样式
    ├── 背景装饰样式
    ├── 内容样式
    ├── 徽章主题样式
    ├── 动画定义
    ├── 响应式样式
    └── 暗色模式样式
```

### CSS 组织

#### 1. 使用注释分隔

```css
/* ============================================
   Welcome Banner 组件
   ============================================ */

/* 基础样式
   -------------------------------------------- */
.wb-container {
  /* ... */
}

/* 容器样式
   -------------------------------------------- */
.wb-card {
  /* ... */
}

/* 背景装饰样式
   -------------------------------------------- */
.wb-bg-gradient {
  /* ... */
}

/* 徽章主题样式
   -------------------------------------------- */
.wb-badge-ai {
  /* ... */
}

/* 动画定义
   -------------------------------------------- */
@keyframes floatSlow {
  /* ... */
}

/* 响应式样式
   -------------------------------------------- */
@media (max-width: 768px) {
  /* ... */
}

/* 暗色模式样式
   -------------------------------------------- */
@media (prefers-color-scheme: dark) {
  /* ... */
}
```

#### 2. 使用一致的命名

```css
/* BEM 命名规范 */
.wb-container {}           /* Block */
.wb-container__header {}   /* Element */
.wb-container--large {}    /* Modifier */

/* 或使用简化命名 */
.wb-container {}
.wb-header {}
.wb-header-large {}
```

#### 3. 按功能分组

```css
/* 布局相关 */
.wb-container {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* 视觉相关 */
.wb-container {
  background: var(--wb-gradient);
  border-radius: var(--rounded-2xl);
  box-shadow: var(--shadow-lg);
}

/* 交互相关 */
.wb-container:hover {
  transform: translateY(-2px);
}
```

### HTML 组织

#### 1. 使用语义化结构

```html
<!-- 清晰的层级结构 -->
<div class="wb-container">
  <!-- 背景装饰层 -->
  <div class="wb-card">
    <div class="wb-bg-gradient"></div>
    <div class="wb-orb wb-orb-1"></div>
    
    <!-- 内容层 -->
    <div class="wb-content">
      <!-- 头部 -->
      <div class="wb-header">
        <!-- 图标 -->
        <div class="wb-icon-wrapper">
          <!-- ... -->
        </div>
        
        <!-- 文本 -->
        <div class="wb-text">
          <!-- ... -->
        </div>
      </div>
    </div>
  </div>
</div>
```

#### 2. 添加注释

```html
<!-- Welcome Banner: Q&A 预研实验室 -->
<div class="wb-container">
  <!-- 背景装饰层 -->
  <div class="wb-card">
    <!-- ... -->
  </div>
  
  <!-- 内容区 -->
  <div class="wb-content">
    <!-- ... -->
  </div>
</div>
<!-- End Welcome Banner -->
```

### 代码复用

#### 1. 使用 CSS 变量

```css
/* 定义可复用的变量 */
:root {
  --wb-spacing-sm: 0.75rem;
  --wb-spacing-md: 1rem;
  --wb-spacing-lg: 1.5rem;
  --wb-rounded-sm: 8px;
  --wb-rounded-md: 12px;
  --wb-rounded-lg: 16px;
}

/* 使用变量 */
.wb-badge {
  padding: var(--wb-spacing-sm);
  border-radius: var(--wb-rounded-md);
}
```

#### 2. 使用基类

```css
/* 基类 */
.wb-badge {
  padding: 4px 12px;
  font-size: 0.625rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* 主题类 */
.wb-badge-ai {
  background: var(--badge-gradient);
  box-shadow: var(--badge-shadow);
}
```

### 代码清单

- [ ] 使用注释分隔不同部分
- [ ] 使用一致的命名规范
- [ ] 按功能分组 CSS 属性
- [ ] 使用语义化 HTML 结构
- [ ] 添加必要的注释
- [ ] 使用 CSS 变量提高复用性
- [ ] 使用基类减少重复代码

---

## 测试和验证建议

确保 Welcome Banner 组件在所有场景下都能正常工作。

### 自动化测试

#### 1. 使用验证脚本

```bash
# 验证所有页面的徽章主题类
python3 scripts/validate-welcome-banner.py --dir src/modules --verbose

# 查看验证报告
cat validation-report.json
```

#### 2. 使用 Lighthouse

```bash
# 性能测试
npx lighthouse https://your-site.com --only-categories=performance --view

# 无障碍测试
npx lighthouse https://your-site.com --only-categories=accessibility --view
```

#### 3. 使用 axe DevTools

```javascript
// 安装 axe-core
npm install --save-dev axe-core

// 运行测试
const axe = require('axe-core');

axe.run(document).then(results => {
  if (results.violations.length > 0) {
    console.error('无障碍问题:', results.violations);
  } else {
    console.log('无障碍测试通过');
  }
});
```

### 手动测试

#### 1. 视觉测试清单

- [ ] 徽章主题颜色正确
- [ ] 动画流畅（≥60fps）
- [ ] 暗色模式适配正确
- [ ] 响应式布局正确
- [ ] 文字清晰可读
- [ ] 触摸目标足够大
- [ ] 无水平滚动条

#### 2. 功能测试清单

- [ ] 可点击元素可以点击
- [ ] 键盘导航正常工作
- [ ] 焦点样式可见
- [ ] 屏幕阅读器可以读取
- [ ] 动画可以禁用（prefers-reduced-motion）
- [ ] 暗色模式可以切换

#### 3. 浏览器兼容性测试

| 浏览器 | 版本 | 测试要点 |
|--------|------|---------|
| Chrome | 最新版 | 所有功能 |
| Firefox | 最新版 | 所有功能 |
| Safari | 最新版 | 所有功能 |
| Edge | 最新版 | 所有功能 |
| Chrome (移动端) | 最新版 | 响应式布局、触摸目标 |
| Safari (移动端) | 最新版 | 响应式布局、触摸目标 |

### 性能测试

#### 1. 测试首次渲染时间

```javascript
// 测量首次渲染时间
performance.mark('wb-start');

// Welcome Banner 渲染完成后
performance.mark('wb-end');
performance.measure('Welcome Banner Render', 'wb-start', 'wb-end');

const measure = performance.getEntriesByName('Welcome Banner Render')[0];
console.log(`渲染时间: ${measure.duration}ms`);

// 要求: < 100ms
if (measure.duration > 100) {
  console.warn('渲染时间过长');
}
```

#### 2. 测试动画帧率

```javascript
// 测量 FPS
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();
  
  if (currentTime >= lastTime + 1000) {
    const fps = Math.round((frames * 1000) / (currentTime - lastTime));
    console.log(`FPS: ${fps}`);
    
    // 要求: ≥ 60fps
    if (fps < 60) {
      console.warn('动画帧率过低');
    }
    
    frames = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

### 测试清单

- [ ] 运行验证脚本
- [ ] 运行 Lighthouse 测试
- [ ] 运行 axe DevTools 测试
- [ ] 完成视觉测试清单
- [ ] 完成功能测试清单
- [ ] 完成浏览器兼容性测试
- [ ] 测试首次渲染时间 < 100ms
- [ ] 测试动画帧率 ≥ 60fps

---

## 总结

本最佳实践指南涵盖了 Welcome Banner 组件开发和使用的各个方面：

1. **徽章主题选择**：根据页面类型选择合适的主题，遵循一致性和语义化原则
2. **动画效果使用**：适度使用动画，优化性能，遵循 prefers-reduced-motion 偏好
3. **性能优化**：使用 GPU 加速，优化 CSS 选择器，减少文件大小
4. **无障碍支持**：添加 ARIA 属性，使用语义化 HTML，确保键盘导航和对比度
5. **响应式设计**：支持多种设备，优化触摸目标，使用流式布局
6. **暗色模式适配**：调整颜色和对比度，使用 CSS 变量，添加平滑过渡
7. **代码组织**：保持代码清晰，使用一致的命名，提高复用性
8. **测试和验证**：使用自动化工具，完成手动测试，确保性能和兼容性

遵循这些最佳实践，您可以创建高质量、高性能、无障碍友好的 Welcome Banner 组件。

如需更多信息，请参考：
- [使用指南](./welcome-banner-usage-guide.md)
- [故障排查指南](./welcome-banner-troubleshooting.md)
- [迁移指南](./welcome-banner-migration-guide.md)
