# Prompt 生成页面 - 置信度展示 UI 设计方案

## 🎯 设计目标

在 Prompt 生成页面的 AI 分析报告区域，为每个分析维度添加置信度显示，帮助用户：
1. 快速识别高质量分析结果
2. 直观了解每个维度的数据质量
3. 做出更明智的维度选择决策

---

## 🎨 UI 设计方案

### 方案 1：徽章显示（推荐）

**位置**：在每个分析维度卡片的标题右侧

**视觉效果**：
```
┌─────────────────────────────────────────────────────────┐
│ ☑ 🔑 标题核心词根              [📊 93% 高]              │
│    Schlüsselanhänger, Sneaker, Turnschuh...            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ ☑ ⚠️ 致命缺陷                  [📊 37% 低]              │
│    无致命缺陷                                           │
└─────────────────────────────────────────────────────────┘
```

**优点**：
- ✅ 清晰直观，一目了然
- ✅ 不占用额外空间
- ✅ 与 AI 分析页面风格一致

**缺点**：
- 可能在小屏幕上显示拥挤

---

### 方案 2：进度条显示

**位置**：在预览文本下方

**视觉效果**：
```
┌─────────────────────────────────────────────────────────┐
│ ☑ 🔑 标题核心词根                                       │
│    Schlüsselanhänger, Sneaker, Turnschuh...            │
│    ████████████████░░░░ 93% 高                          │
└─────────────────────────────────────────────────────────┘
```

**优点**：
- ✅ 视觉化程度高
- ✅ 适合展示置信度范围

**缺点**：
- ❌ 占用更多垂直空间
- ❌ 可能过于复杂

---

### 方案 3：颜色边框指示

**位置**：卡片左侧边框

**视觉效果**：
```
┃ ☑ 🔑 标题核心词根              93%
┃    Schlüsselanhänger, Sneaker...
┃ (绿色边框)

┃ ☑ ⚠️ 致命缺陷                  37%
┃    无致命缺陷
┃ (橙色边框)
```

**优点**：
- ✅ 简洁优雅
- ✅ 不干扰内容阅读

**缺点**：
- ❌ 可能不够明显
- ❌ 色盲用户可能难以区分

---

## ✅ 最终选择：方案 1（徽章显示）

**理由**：
1. 与 AI 分析页面保持一致
2. 信息密度适中
3. 清晰直观，易于理解

---

## 🎨 详细设计规范

### 1. 置信度徽章

**HTML 结构**：
```html
<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
      :class="getConfidenceColorClass(getTargetConfidence(targetId))">
  <i class="fa-solid fa-chart-line text-[10px]"></i>
  <span x-text="getTargetConfidence(targetId) + '%'"></span>
  <span x-text="getConfidenceLevel(getTargetConfidence(targetId))"></span>
</span>
```

**颜色方案**：
- **高置信度 (≥70%)**：
  - 背景：`bg-green-100`
  - 文字：`text-green-700`
  - 边框：`border-green-300`

- **中等置信度 (50-69%)**：
  - 背景：`bg-yellow-100`
  - 文字：`text-yellow-700`
  - 边框：`border-yellow-300`

- **低置信度 (<50%)**：
  - 背景：`bg-orange-100`
  - 文字：`text-orange-700`
  - 边框：`border-orange-300`

### 2. 卡片布局调整

**修改前**：
```html
<div class="ml-3 text-sm flex-1 min-w-0">
  <label>
    <span class="font-medium text-slate-700">🔑 标题核心词根</span>
    <p class="text-xs text-slate-400">预览文本</p>
  </label>
</div>
```

**修改后**：
```html
<div class="ml-3 text-sm flex-1 min-w-0">
  <label>
    <div class="flex items-center justify-between gap-2 mb-0.5">
      <span class="font-medium text-slate-700">🔑 标题核心词根</span>
      <!-- 置信度徽章 -->
      <span x-show="hasConfidenceData && getTargetConfidence('title-keywords') > 0"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
            :class="getConfidenceColorClass(getTargetConfidence('title-keywords'))">
        <i class="fa-solid fa-chart-line text-[10px]"></i>
        <span x-text="getTargetConfidence('title-keywords') + '%'"></span>
        <span x-text="getConfidenceLevel(getTargetConfidence('title-keywords'))"></span>
      </span>
    </div>
    <p class="text-xs text-slate-400 truncate">预览文本</p>
  </label>
</div>
```

---

## 📊 统计信息显示

### 置信度分布摘要

**位置**：在 AI 分析报告区域上方（可选）

**HTML 结构**：
```html
<div class="mb-3 p-3 bg-white rounded-lg border border-slate-200">
  <div class="flex items-center justify-between text-sm">
    <span class="text-slate-600 font-medium">置信度分布</span>
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-green-500"></span>
        <span class="text-slate-600">高: <span class="font-semibold" x-text="highConfidenceCount"></span></span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
        <span class="text-slate-600">中: <span class="font-semibold" x-text="mediumConfidenceCount"></span></span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-orange-500"></span>
        <span class="text-slate-600">低: <span class="font-semibold" x-text="lowConfidenceCount"></span></span>
      </div>
    </div>
  </div>
</div>
```

---

## 🎯 交互行为

### 1. 悬停效果

**低置信度项目悬停时显示警告**：
```html
<div class="relative group">
  <!-- 卡片内容 -->

  <!-- 警告提示（仅低置信度显示） -->
  <div x-show="getTargetConfidence(targetId) < 50"
       class="absolute inset-0 bg-orange-50/0 group-hover:bg-orange-50/50 transition-colors pointer-events-none rounded-lg">
  </div>
</div>
```

### 2. 点击行为

**点击置信度徽章显示详细信息**（可选）：
```html
<span @click.stop="showConfidenceDetails(targetId)"
      class="cursor-help"
      title="点击查看置信度详情">
  <!-- 徽章内容 -->
</span>
```

---

## 📱 响应式设计

### 移动端适配

**小屏幕 (<768px)**：
- 徽章文字简化：只显示百分比，不显示等级文字
- 筛选控制面板垂直排列

```html
<!-- 移动端简化版徽章 -->
<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-semibold border md:px-2">
  <i class="fa-solid fa-chart-line text-[10px]"></i>
  <span x-text="getTargetConfidence(targetId) + '%'"></span>
  <span class="hidden md:inline" x-text="getConfidenceLevel(getTargetConfidence(targetId))"></span>
</span>
```

---

## ♿ 可访问性

### ARIA 标签

```html
<span role="status"
      :aria-label="`置信度: ${getTargetConfidence(targetId)}%, 等级: ${getConfidenceLevel(getTargetConfidence(targetId))}`"
      class="...">
  <!-- 徽章内容 -->
</span>
```

### 键盘导航

- 筛选复选框支持 Tab 键导航
- 空格键切换复选框状态

---

## 🎨 CSS 类定义

```css
/* 置信度徽章基础样式 */
.confidence-badge {
  @apply inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border transition-all;
}

/* 高置信度 */
.confidence-high {
  @apply bg-green-100 text-green-700 border-green-300;
}

/* 中等置信度 */
.confidence-medium {
  @apply bg-yellow-100 text-yellow-700 border-yellow-300;
}

/* 低置信度 */
.confidence-low {
  @apply bg-orange-100 text-orange-700 border-orange-300;
}

/* 低置信度警告效果 */
.confidence-low-warning {
  @apply hover:ring-2 hover:ring-orange-300 hover:ring-offset-2;
}
```

---

## 📋 实现清单

- [ ] 在 PromptlabPanel.ts 中添加置信度方法
- [ ] 修改 renderNewFormatModules 的 HTML 模板
- [ ] 添加筛选控制面板 HTML
- [ ] 实现筛选逻辑
- [ ] 添加统计信息显示（可选）
- [ ] 测试响应式布局
- [ ] 验证可访问性

---

**设计完成时间**：2026-03-06
**设计者**：team-lead
