# Welcome Banner 组件故障排查指南

## 目录

1. [徽章主题不生效](#徽章主题不生效)
2. [动画卡顿](#动画卡顿)
3. [暗色模式不适配](#暗色模式不适配)
4. [响应式布局错乱](#响应式布局错乱)
5. [无障碍属性缺失](#无障碍属性缺失)
6. [背景装饰元素不显示](#背景装饰元素不显示)
7. [徽章动画不工作](#徽章动画不工作)
8. [文字对比度不足](#文字对比度不足)
9. [触摸目标过小](#触摸目标过小)
10. [CSS 文件未加载](#css-文件未加载)

---

## 徽章主题不生效

### 症状

- 徽章显示为默认蓝色渐变,而不是预期的主题颜色
- 徽章没有正确的阴影效果
- 徽章动画(脉冲、闪烁)不工作

### 可能原因

1. **缺少主题类**：徽章元素没有添加 `wb-badge-*` 主题类
2. **主题类名错误**：使用了不存在的主题类名
3. **CSS 优先级问题**：页面特定样式覆盖了徽章主题样式
4. **CSS 文件未加载**：welcome-banner.css 文件未正确引入

### 解决方案

#### 1. 检查主题类是否存在

确保徽章元素包含正确的主题类:

```html
<!-- ✓ 正确 -->
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>

<!-- ❌ 错误：缺少主题类 -->
<span class="wb-badge" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>
```

#### 2. 验证主题类名

确保使用的是 8 种预定义主题之一:

- `wb-badge-ai` - AI 主题(蓝色)
- `wb-badge-growth` - 增长主题(绿色,带闪烁动画)
- `wb-badge-safety` - 安全主题(红色,带脉冲动画)
- `wb-badge-service` - 服务主题(紫色)
- `wb-badge-supply` - 供应主题(橙色)
- `wb-badge-analytics` - 分析主题(青色)
- `wb-badge-pro` - 专业主题(金色)
- `wb-badge-hub` - 中心主题(灰色)

#### 3. 检查 CSS 优先级

如果页面有特定样式覆盖了徽章主题,使用浏览器开发者工具检查:

1. 右键点击徽章元素,选择"检查"
2. 查看 Styles 面板中的 `background` 属性
3. 如果看到被划掉的样式,说明被其他样式覆盖

**解决方法**：在页面特定样式中使用更高的优先级:

```css
/* 提高优先级 */
.custom-page .wb-badge.wb-badge-ai {
  background: var(--badge-gradient) !important;
}
```

#### 4. 使用验证脚本

运行验证脚本检查所有页面的徽章主题类:

```bash
python3 scripts/validate-welcome-banner.py --dir src/modules --verbose
```

查看生成的 `validation-report.json` 文件,找出缺少主题类的徽章。

#### 5. 使用迁移工具自动修复

使用迁移工具自动添加徽章主题类:

```bash
# 预览模式
python3 scripts/migrate-welcome-banner-v2.py --dir src/modules --add-theme --dry-run

# 实际修复
python3 scripts/migrate-welcome-banner-v2.py --dir src/modules --add-theme --backup
```

---

## 动画卡顿

### 症状

- 浮动光球动画不流畅,出现跳帧
- 脉冲环动画卡顿
- 徽章动画(脉冲、闪烁)不流畅
- 页面滚动时动画掉帧

### 可能原因

1. **使用了触发重排的 CSS 属性**：动画使用了 `width`、`height`、`top`、`left` 等属性
2. **动画元素过多**：页面同时运行太多动画
3. **缺少 GPU 加速**：动画元素没有使用 `transform: translateZ(0)` 强制 GPU 加速
4. **缺少 will-change 属性**：浏览器没有提前优化动画
5. **设备性能不足**：在低性能设备上运行复杂动画

### 解决方案

#### 1. 检查动画属性

确保所有动画仅使用 GPU 加速属性(`transform`、`opacity`):

```css
/* ✓ 正确：使用 transform */
@keyframes floatSlow {
  0%, 100% { transform: translateY(0) translateZ(0); }
  50% { transform: translateY(-20px) translateZ(0); }
}

/* ❌ 错误：使用 top */
@keyframes floatBad {
  0%, 100% { top: 0; }
  50% { top: -20px; }
}
```

#### 2. 添加 GPU 加速

为动画元素添加 `transform: translateZ(0)` 强制 GPU 加速:

```css
.wb-orb {
  transform: translateZ(0);
  will-change: transform;
}

.wb-particle {
  transform: translateZ(0);
  will-change: opacity;
}
```

#### 3. 减少动画元素

在移动端隐藏装饰元素以提升性能:

```css
@media (max-width: 768px) {
  .wb-orb,
  .wb-particle,
  .wb-grid-pattern {
    display: none;
  }
}
```

#### 4. 监控动画性能

使用浏览器开发者工具监控帧率:

1. 打开 Chrome DevTools
2. 切换到 Performance 面板
3. 点击录制按钮,滚动页面
4. 停止录制,查看 FPS 图表
5. 确保帧率保持在 60fps 以上

#### 5. 禁用动画(临时方案)

如果性能问题严重,可以临时禁用动画:

```css
.low-performance-page .wb-orb,
.low-performance-page .wb-particle,
.low-performance-page .wb-icon-ring,
.low-performance-page .wb-badge-safety,
.low-performance-page .wb-badge-growth {
  animation: none !important;
}
```

---

## 暗色模式不适配

### 症状

- 在暗色模式下,文字难以阅读(对比度不足)
- 背景颜色没有变化,仍然是明亮模式的颜色
- 徽章颜色在暗色模式下不够明显
- 边框和标签在暗色模式下不可见

### 可能原因

1. **浏览器不支持 prefers-color-scheme**：旧版浏览器不支持暗色模式媒体查询
2. **CSS 变量未覆盖**：暗色模式的 CSS 变量没有正确定义
3. **样式优先级问题**：页面特定样式覆盖了暗色模式样式
4. **系统未启用暗色模式**：操作系统或浏览器未启用暗色模式

### 解决方案

#### 1. 检查浏览器支持

确保使用支持 `prefers-color-scheme` 的现代浏览器:

- Chrome 76+
- Firefox 67+
- Safari 12.1+
- Edge 79+

#### 2. 验证系统暗色模式

确认操作系统已启用暗色模式:

**macOS**:
- 系统偏好设置 → 通用 → 外观 → 深色

**Windows**:
- 设置 → 个性化 → 颜色 → 选择模式 → 深色

**浏览器测试**:
在 Chrome DevTools 中模拟暗色模式:
1. 打开 DevTools (F12)
2. 按 Cmd+Shift+P (Mac) 或 Ctrl+Shift+P (Windows)
3. 输入 "dark" 并选择 "Emulate CSS prefers-color-scheme: dark"

#### 3. 检查 CSS 变量

确保暗色模式的 CSS 变量已正确定义:

```css
@media (prefers-color-scheme: dark) {
  .wb-container,
  .wb-card {
    --wb-text-primary: #f1f5f9;
    --wb-text-secondary: #cbd5e1;
    --wb-border-color: rgba(255, 255, 255, 0.1);
    --wb-tag-bg: rgba(0, 0, 0, 0.3);
    --wb-tag-border: rgba(255, 255, 255, 0.1);
  }
}
```

#### 4. 验证文字对比度

使用对比度检查工具验证文字可读性:

**在线工具**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Contrast Ratio: https://contrast-ratio.com/

**要求**:
- 标题文字对比度 ≥ 4.5:1 (WCAG AA)
- 描述文字对比度 ≥ 4.5:1 (WCAG AA)
- 标签文字对比度 ≥ 4.5:1 (WCAG AA)

#### 5. 自定义暗色模式颜色

如果默认暗色模式颜色不合适,可以在页面特定样式中覆盖:

```css
@media (prefers-color-scheme: dark) {
  .custom-page .wb-container {
    --wb-text-primary: #e2e8f0;
    --wb-text-secondary: #94a3b8;
    --wb-border-color: rgba(255, 255, 255, 0.15);
  }
}
```

---

## 响应式布局错乱

### 症状

- 在移动端,图标和文本重叠
- 徽章文字被截断
- 特性标签超出容器边界
- 出现水平滚动条
- 触摸目标过小,难以点击

### 可能原因

1. **断点未生效**：媒体查询断点设置不正确
2. **固定宽度**：元素使用了固定宽度而非流式布局
3. **内边距过大**：在小屏幕上内边距占用过多空间
4. **文字不换行**：标题或描述使用了 `white-space: nowrap`
5. **触摸目标过小**：可点击元素尺寸小于 44x44px

### 解决方案

#### 1. 检查媒体查询

确保媒体查询断点正确:

```css
/* 平板 */
@media (max-width: 768px) {
  .wb-content {
    padding: 1.5rem 1rem;
  }
}

/* 移动端 */
@media (max-width: 480px) {
  .wb-badge {
    padding: 2px 6px;
    font-size: 0.5rem;
  }
}

/* 超小屏幕 */
@media (max-width: 375px) {
  .wb-icon-main {
    width: 48px;
    height: 48px;
  }
}
```

#### 2. 使用流式布局

避免使用固定宽度,使用百分比或 flex 布局:

```css
/* ✓ 正确：流式布局 */
.wb-text {
  flex: 1;
  min-width: 0;
  max-width: 100%;
}

/* ❌ 错误：固定宽度 */
.wb-text {
  width: 600px;
}
```

#### 3. 确保文字换行

为标题和描述添加换行属性:

```css
.wb-title,
.wb-description {
  white-space: normal;
  word-wrap: break-word;
  overflow-wrap: break-word;
}
```

#### 4. 调整触摸目标尺寸

确保可点击元素满足最小触摸目标尺寸(44x44px):

```css
.wb-badge,
.wb-tag {
  min-height: 44px;
  min-width: 44px;
}

@media (max-width: 768px) {
  .wb-badge,
  .wb-tag {
    padding: 8px 12px;
  }
}
```

#### 5. 测试不同屏幕尺寸

使用浏览器开发者工具测试响应式布局:

1. 打开 Chrome DevTools (F12)
2. 点击设备工具栏图标(Ctrl+Shift+M)
3. 测试以下尺寸:
   - 桌面: 1920x1080, 1440x900
   - 平板: 768x1024, 834x1194
   - 移动端: 375x667, 414x896, 360x640

#### 6. 避免水平滚动

确保容器不超出视口宽度:

```css
.wb-container,
.wb-card {
  max-width: 100%;
  overflow-x: hidden;
}
```

---

## 无障碍属性缺失

### 症状

- 屏幕阅读器无法正确读取徽章内容
- 装饰性图标被屏幕阅读器读取
- 键盘无法聚焦到可点击元素
- 焦点样式不可见

### 可能原因

1. **缺少 aria-label**：徽章和图标元素没有添加 `aria-label` 属性
2. **装饰性图标未隐藏**：图标元素没有添加 `aria-hidden="true"` 属性
3. **缺少 role 属性**：可点击徽章没有添加 `role="button"` 属性
4. **焦点样式缺失**：没有定义 `:focus-visible` 样式
5. **非语义化 HTML**：使用 `<div>` 而非 `<button>` 或 `<ul>`/`<li>`

### 解决方案

#### 1. 添加 aria-label 属性

为所有徽章和图标添加描述性的 `aria-label`:

```html
<!-- 图标徽章 -->
<div class="wb-icon-main" aria-label="人工智能功能图标">
  <i class="fa-solid fa-robot" aria-hidden="true"></i>
</div>

<!-- 徽章标签 -->
<span class="wb-badge wb-badge-ai" aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>
```

#### 2. 隐藏装饰性图标

为所有装饰性图标添加 `aria-hidden="true"`:

```html
<!-- ✓ 正确 -->
<i class="fa-solid fa-sparkles" aria-hidden="true"></i>

<!-- ❌ 错误：装饰性图标未隐藏 -->
<i class="fa-solid fa-sparkles"></i>
```

#### 3. 使用语义化 HTML

为可点击徽章使用 `<button>` 标签:

```html
<!-- ✓ 正确：使用 button -->
<button class="wb-badge wb-badge-ai" 
        aria-label="人工智能功能,点击了解更多"
        type="button">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</button>

<!-- ❌ 错误：使用 span + role -->
<span class="wb-badge wb-badge-ai" 
      role="button"
      aria-label="人工智能功能">
  <i class="fa-solid fa-sparkles" aria-hidden="true"></i>
  <span>AI</span>
</span>
```

为特性标签使用列表标签:

```html
<!-- ✓ 正确：使用 ul/li -->
<ul class="wb-tags" role="list">
  <li class="wb-tag" role="listitem">
    <div class="wb-tag-dot" aria-hidden="true"></div>
    <span>智能生成</span>
  </li>
</ul>

<!-- ❌ 错误：使用 div -->
<div class="wb-tags">
  <div class="wb-tag">
    <div class="wb-tag-dot"></div>
    <span>智能生成</span>
  </div>
</div>
```

#### 4. 添加焦点样式

为可交互元素添加清晰的焦点样式:

```css
.wb-badge:focus-visible,
.wb-tag:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

/* 移除鼠标点击时的焦点样式 */
.wb-badge:focus:not(:focus-visible) {
  outline: none;
}
```

#### 5. 使用验证脚本

运行验证脚本检查无障碍属性:

```bash
python3 scripts/validate-welcome-banner.py --dir src/modules --verbose
```

查看报告中的无障碍问题:
- 缺少 `aria-label` 的徽章
- 缺少 `aria-hidden="true"` 的图标

#### 6. 使用迁移工具自动修复

使用迁移工具自动添加无障碍属性:

```bash
# 预览模式
python3 scripts/migrate-welcome-banner-v2.py --dir src/modules --add-aria --dry-run

# 实际修复
python3 scripts/migrate-welcome-banner-v2.py --dir src/modules --add-aria --backup
```

#### 7. 测试屏幕阅读器

使用屏幕阅读器测试无障碍支持:

**macOS**:
- 启用 VoiceOver: Cmd+F5
- 使用 Tab 键导航
- 听取元素描述

**Windows**:
- 使用 NVDA (免费): https://www.nvaccess.org/
- 使用 Tab 键导航
- 听取元素描述

---

## 背景装饰元素不显示

### 症状

- 浮动光球不可见
- 粒子元素不显示
- 网格图案不显示
- 背景渐变不正确

### 可能原因

1. **z-index 层级问题**：装饰元素被内容层遮挡
2. **overflow 隐藏**：容器的 `overflow: hidden` 裁剪了装饰元素
3. **颜色透明度过高**：装饰元素颜色过于透明,不可见
4. **CSS 变量未定义**：渐变色 CSS 变量未正确定义
5. **移动端隐藏**：在移动端装饰元素被隐藏

### 解决方案

#### 1. 检查 z-index 层级

确保装饰元素的 z-index 低于内容层:

```css
/* 背景装饰层 */
.wb-bg-gradient,
.wb-orb,
.wb-particle {
  position: absolute;
  z-index: 1; /* 或不设置 */
}

/* 内容层 */
.wb-content {
  position: relative;
  z-index: 10;
}
```

#### 2. 检查容器 overflow

确保容器允许装饰元素溢出:

```css
.wb-card {
  overflow: hidden; /* 这是正确的,装饰元素在容器内 */
}

/* 如果装饰元素在容器外,需要调整 */
.wb-container {
  overflow: visible; /* 允许溢出 */
}
```

#### 3. 调整颜色透明度

如果装饰元素不可见,可能是透明度过高:

```css
/* 增加不透明度 */
.wb-orb-1 {
  background: radial-gradient(
    circle,
    rgba(59, 130, 246, 0.15) 0%, /* 从 0.10 增加到 0.15 */
    transparent 70%
  );
}
```

#### 4. 自定义渐变色

通过 CSS 变量自定义背景渐变色:

```html
<div class="wb-container" style="--wb-gradient-1: #e0e7ff; --wb-gradient-2: #fce7f3;">
  <!-- 内容 -->
</div>
```

或在页面特定样式中:

```css
.custom-page .wb-container {
  --wb-gradient-1: var(--color-purple-100);
  --wb-gradient-2: var(--color-pink-100);
}
```

#### 5. 检查移动端样式

在移动端,装饰元素默认被隐藏以提升性能:

```css
@media (max-width: 768px) {
  .wb-orb {
    display: none; /* 默认隐藏 */
  }
}
```

如果需要在移动端显示,覆盖此样式:

```css
@media (max-width: 768px) {
  .custom-page .wb-orb {
    display: block;
  }
}
```

#### 6. 使用浏览器开发者工具

检查装饰元素是否存在:

1. 右键点击页面,选择"检查"
2. 在 Elements 面板中查找 `.wb-orb`、`.wb-particle` 等元素
3. 检查元素的 computed styles
4. 查看 `display`、`opacity`、`visibility` 属性

---

## 徽章动画不工作

### 症状

- Safety 徽章的脉冲动画不工作
- Growth 徽章的闪烁动画不工作
- 动画在某些浏览器中不工作
- 用户启用减少动画偏好后动画仍然运行

### 可能原因

1. **缺少动画类**：徽章没有正确的主题类
2. **CSS 优先级问题**：页面样式覆盖了动画
3. **浏览器不支持**：旧版浏览器不支持 CSS 动画
4. **prefers-reduced-motion 未生效**：减少动画媒体查询未正确实现
5. **will-change 冲突**：多个 will-change 属性冲突

### 解决方案

#### 1. 检查徽章主题类

确保使用正确的主题类:

```html
<!-- Safety 徽章 - 脉冲动画 -->
<span class="wb-badge wb-badge-safety" aria-label="安全警告">
  <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
  <span>Safety</span>
</span>

<!-- Growth 徽章 - 闪烁动画 -->
<span class="wb-badge wb-badge-growth" aria-label="增长功能">
  <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
  <span>Growth</span>
</span>
```

#### 2. 检查动画定义

确保 CSS 中定义了动画:

```css
/* 脉冲动画 */
@keyframes pulse {
  0%, 100% {
    transform: scale(1) translateZ(0);
  }
  50% {
    transform: scale(1.05) translateZ(0);
  }
}

.wb-badge-safety {
  animation: pulse 2s ease-in-out infinite;
  will-change: transform;
}

/* 闪烁动画 */
@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.wb-badge-growth {
  animation: blink 1.5s ease-in-out infinite;
  will-change: opacity;
}
```

#### 3. 检查浏览器支持

确保浏览器支持 CSS 动画:

- Chrome 43+
- Firefox 16+
- Safari 9+
- Edge 12+

对于旧版浏览器,动画会被忽略,徽章仍然可见。

#### 4. 测试 prefers-reduced-motion

确保减少动画偏好正确实现:

```css
@media (prefers-reduced-motion: reduce) {
  .wb-badge-safety,
  .wb-badge-growth {
    animation: none !important;
  }
}
```

**测试方法**:

**macOS**:
- 系统偏好设置 → 辅助功能 → 显示 → 减少动态效果

**Windows**:
- 设置 → 轻松使用 → 显示 → 在 Windows 中显示动画

**浏览器测试**:
在 Chrome DevTools 中模拟:
1. 打开 DevTools (F12)
2. 按 Cmd+Shift+P (Mac) 或 Ctrl+Shift+P (Windows)
3. 输入 "reduce" 并选择 "Emulate CSS prefers-reduced-motion: reduce"

#### 5. 禁用特定页面的动画

如果需要在特定页面禁用动画:

```css
.no-animation-page .wb-badge-safety,
.no-animation-page .wb-badge-growth {
  animation: none !important;
}
```

---

## 文字对比度不足

### 症状

- 标题或描述文字难以阅读
- 在明亮或暗色模式下文字不清晰
- 标签文字颜色过浅
- 无障碍测试工具报告对比度不足

### 可能原因

1. **颜色选择不当**：文字颜色与背景颜色对比度 < 4.5:1
2. **CSS 变量覆盖**：页面样式覆盖了默认文字颜色
3. **暗色模式未适配**：暗色模式下文字颜色未调整
4. **背景透明度过高**：半透明背景导致对比度降低

### 解决方案

#### 1. 验证对比度

使用对比度检查工具验证:

**在线工具**:
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Contrast Ratio: https://contrast-ratio.com/

**要求**:
- 标题文字: ≥ 4.5:1 (WCAG AA)
- 描述文字: ≥ 4.5:1 (WCAG AA)
- 标签文字: ≥ 4.5:1 (WCAG AA)

#### 2. 检查默认颜色

确保使用正确的文字颜色:

**明亮模式**:
```css
.wb-title {
  color: #0f172a; /* slate-900, 对比度 16.1:1 */
}

.wb-description,
.wb-tag span {
  color: #64748b; /* slate-600, 对比度 4.6:1 */
}
```

**暗色模式**:
```css
@media (prefers-color-scheme: dark) {
  .wb-title {
    color: #f1f5f9; /* slate-100, 对比度 12.5:1 */
  }

  .wb-description,
  .wb-tag span {
    color: #cbd5e1; /* slate-300, 对比度 8.2:1 */
  }
}
```

#### 3. 调整文字颜色

如果对比度不足,调整文字颜色:

```css
/* 增加对比度 */
.custom-page .wb-description {
  color: #475569; /* slate-600 → slate-700, 对比度更高 */
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .custom-page .wb-description {
    color: #e2e8f0; /* slate-300 → slate-200, 对比度更高 */
  }
}
```

#### 4. 调整背景透明度

如果背景透明度过高,增加不透明度:

```css
/* 增加标签背景不透明度 */
.wb-tag {
  background: rgba(255, 255, 255, 0.9); /* 从 0.7 增加到 0.9 */
}

/* 暗色模式 */
@media (prefers-color-scheme: dark) {
  .wb-tag {
    background: rgba(0, 0, 0, 0.5); /* 从 0.3 增加到 0.5 */
  }
}
```

#### 5. 使用浏览器开发者工具

Chrome DevTools 提供对比度检查:

1. 右键点击文字元素,选择"检查"
2. 在 Styles 面板中找到 `color` 属性
3. 点击颜色方块,打开颜色选择器
4. 查看底部的对比度信息
5. 调整颜色直到满足 WCAG AA 标准

---

## 触摸目标过小

### 症状

- 在移动端难以点击徽章
- 标签点击区域过小
- 触摸时经常点击到错误的元素
- 无障碍测试工具报告触摸目标过小

### 可能原因

1. **元素尺寸过小**：徽章或标签尺寸 < 44x44px
2. **内边距不足**：元素内边距过小
3. **响应式样式未生效**：移动端样式未正确应用
4. **缺少 min-height/min-width**：元素没有最小尺寸限制

### 解决方案

#### 1. 检查最小尺寸

确保所有可点击元素满足最小触摸目标尺寸(44x44px):

```css
.wb-badge,
.wb-tag {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

#### 2. 增加移动端内边距

在移动端增加内边距以满足触摸目标要求:

```css
@media (max-width: 768px) {
  .wb-badge {
    padding: 8px 12px; /* 增加内边距 */
  }

  .wb-tag {
    padding: 8px 12px; /* 增加内边距 */
  }
}
```

#### 3. 测试触摸目标

使用浏览器开发者工具测试:

1. 打开 Chrome DevTools (F12)
2. 切换到设备工具栏(Ctrl+Shift+M)
3. 选择移动设备(如 iPhone 12)
4. 点击徽章和标签,确保容易点击

#### 4. 使用无障碍测试工具

**Lighthouse**:
1. 打开 Chrome DevTools
2. 切换到 Lighthouse 面板
3. 选择 "Accessibility" 类别
4. 点击 "Generate report"
5. 查看 "Tap targets are not sized appropriately" 问题

**axe DevTools**:
1. 安装 axe DevTools 扩展
2. 打开扩展面板
3. 点击 "Scan"
4. 查看触摸目标相关问题

#### 5. 调整元素间距

增加元素间距以避免误触:

```css
.wb-title-row {
  gap: 0.75rem; /* 徽章之间的间距 */
}

.wb-tags {
  gap: 0.75rem; /* 标签之间的间距 */
}

@media (max-width: 768px) {
  .wb-title-row {
    gap: 1rem; /* 移动端增加间距 */
  }

  .wb-tags {
    gap: 1rem; /* 移动端增加间距 */
  }
}
```

---

## CSS 文件未加载

### 症状

- Welcome Banner 完全没有样式
- 元素显示为纯文本,没有背景和装饰
- 布局混乱,元素堆叠在一起
- 浏览器控制台显示 404 错误

### 可能原因

1. **CSS 文件路径错误**：引用的 CSS 文件路径不正确
2. **CSS 文件不存在**：welcome-banner.css 文件未创建或被删除
3. **构建失败**：CSS 文件未被正确编译或打包
4. **缓存问题**：浏览器缓存了旧版本的 CSS 文件
5. **权限问题**：服务器无法访问 CSS 文件

### 解决方案

#### 1. 检查 CSS 文件路径

确保 HTML 中正确引用了 CSS 文件:

```html
<!-- 检查路径是否正确 -->
<link rel="stylesheet" href="/css/components/welcome-banner.css">

<!-- 或使用相对路径 -->
<link rel="stylesheet" href="../../css/components/welcome-banner.css">
```

#### 2. 验证 CSS 文件存在

检查 CSS 文件是否存在:

```bash
# 检查文件是否存在
ls -la src/css/components/welcome-banner.css

# 查看文件大小
du -h src/css/components/welcome-banner.css
```

#### 3. 检查浏览器控制台

打开浏览器控制台查看错误:

1. 打开 Chrome DevTools (F12)
2. 切换到 Console 面板
3. 查找 404 错误或 CSS 加载失败的消息
4. 点击错误消息查看详细信息

#### 4. 清除浏览器缓存

清除缓存并强制刷新:

**Chrome/Edge**:
- Windows: Ctrl+Shift+R
- Mac: Cmd+Shift+R

**Firefox**:
- Windows: Ctrl+F5
- Mac: Cmd+Shift+R

**Safari**:
- Mac: Cmd+Option+E (清空缓存) + Cmd+R (刷新)

#### 5. 检查构建配置

如果使用构建工具,检查配置:

**Webpack**:
```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

**Vite**:
```javascript
// vite.config.js
export default {
  css: {
    preprocessorOptions: {
      css: {
        charset: false
      }
    }
  }
};
```

#### 6. 检查服务器配置

确保服务器正确提供 CSS 文件:

**Nginx**:
```nginx
location ~* \.css$ {
  add_header Content-Type text/css;
  expires 1y;
  access_log off;
}
```

**Apache**:
```apache
<FilesMatch "\.css$">
  Header set Content-Type "text/css"
</FilesMatch>
```

#### 7. 使用内联样式(临时方案)

如果 CSS 文件无法加载,可以临时使用内联样式:

```html
<style>
  /* 复制 welcome-banner.css 的关键样式 */
  .wb-container {
    position: relative;
    border-radius: 24px;
    overflow: hidden;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(255, 255, 255, 0.95) 35%);
    padding: 3rem 4rem;
  }
  /* ... 其他关键样式 */
</style>
```

---

## 常见问题快速参考

| 问题 | 快速检查 | 快速修复 |
|------|---------|---------|
| 徽章主题不生效 | 检查是否有 `wb-badge-*` 类 | 添加正确的主题类 |
| 动画卡顿 | 检查是否使用 transform/opacity | 添加 `will-change` 属性 |
| 暗色模式不适配 | 检查系统是否启用暗色模式 | 在 DevTools 中模拟暗色模式 |
| 响应式布局错乱 | 检查媒体查询是否生效 | 使用 DevTools 测试不同尺寸 |
| 无障碍属性缺失 | 检查是否有 `aria-label` | 运行验证脚本 |
| 背景装饰不显示 | 检查 z-index 和 opacity | 调整颜色透明度 |
| 徽章动画不工作 | 检查是否有正确的主题类 | 确认动画定义存在 |
| 文字对比度不足 | 使用对比度检查工具 | 调整文字颜色 |
| 触摸目标过小 | 检查元素尺寸 | 增加 min-height/min-width |
| CSS 文件未加载 | 检查浏览器控制台 | 清除缓存并刷新 |

---

## 获取帮助

如果以上解决方案无法解决您的问题,请:

1. **查看使用指南**: [welcome-banner-usage-guide.md](./welcome-banner-usage-guide.md)
2. **查看最佳实践**: [welcome-banner-best-practices.md](./welcome-banner-best-practices.md)
3. **查看迁移指南**: [welcome-banner-migration-guide.md](./welcome-banner-migration-guide.md)
4. **运行验证脚本**: `python3 scripts/validate-welcome-banner.py --verbose`
5. **联系开发团队**: 提供详细的错误信息和浏览器控制台截图

---

## 总结

本故障排查指南涵盖了 Welcome Banner 组件最常见的 10 个问题:

1. 徽章主题不生效
2. 动画卡顿
3. 暗色模式不适配
4. 响应式布局错乱
5. 无障碍属性缺失
6. 背景装饰元素不显示
7. 徽章动画不工作
8. 文字对比度不足
9. 触摸目标过小
10. CSS 文件未加载

每个问题都提供了详细的症状描述、可能原因分析和具体解决方案。通过本指南,您应该能够快速诊断和解决 Welcome Banner 组件的常见问题。

