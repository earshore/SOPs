# Prompt 生成页面 - 置信度功能技术文档

## 🏗️ 架构概述

### 数据流

```
AI 分析服务 (aiAnalysisService.ts)
  ↓ 计算置信度
  ↓ 附加 _metadata
Zustand Store (appStore.analysis.analysisReport)
  ↓ 订阅变化
PromptlabPanel.ts (Alpine.js 组件)
  ↓ 读取置信度数据
  ↓ 渲染 HTML
template.html (UI 显示)
```

---

## 📁 关键文件

### 1. PromptlabPanel.ts
**路径**: `src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts`

**新增方法**:
- `reportConfidence` (getter) - 获取置信度数据
- `overallConfidence` (getter) - 获取总体置信度
- `overallConfidencePercent` (getter) - 获取百分比
- `hasConfidenceData` (getter) - 检查是否有置信度数据
- `getTargetConfidence(targetId)` - 获取特定维度置信度
- `getConfidenceColorClass(percent)` - 获取颜色类
- `getConfidenceLevel(percent)` - 获取等级文字
- `getConfidenceAriaLabel(percent)` - 获取 ARIA 标签
- `shouldShowTarget(targetId)` - 判断是否显示（筛选）
- `onConfidenceFilterChange()` - 处理筛选变化

**新增状态**:
```typescript
confidenceFilter: {
  showHighOnly: false,  // 仅显示高置信度 (≥70%)
  hideLow: false        // 隐藏低置信度 (<50%)
}
```

### 2. template.html
**路径**: `src/modules/app_center/views/master_analysis/promptlab/template.html`

**新增 UI 元素**:
- 置信度筛选控制面板 (第 294-308 行)
- 置信度徽章 (在 renderNewFormatModules 生成的 HTML 中)

---

## 🔧 实现细节

### 置信度数据读取

```typescript
get reportConfidence() {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === 'string') return null;
  const reportObj = report as any;
  if (!reportObj._metadata) return null;
  return reportObj._metadata.confidence || null;
}
```

**数据来源**: `appStore.getState().analysis.analysisReport._metadata.confidence`

**数据格式**:
```typescript
{
  "title-keywords": 0.93,
  "selling-points": 0.93,
  "fatal-flaws": 0.37,
  "wow-moments": 1.0,
  "hesitation-points": 0.89,
  "buyer-profile": 0.90,
  "vocab-gap": 0.93,
  "promise-reality": 0.77
}
```

### 置信度计算

置信度值范围: 0.0 - 1.0

转换为百分比:
```typescript
getTargetConfidence(targetId: string): number {
  const confidence = this.reportConfidence as Record<string, number> | null;
  if (!confidence || !confidence[targetId]) return 0;
  return Math.round(confidence[targetId] * 100);
}
```

### 颜色分类

```typescript
getConfidenceColorClass(percent: number): string {
  if (percent >= 70) return 'bg-green-100 text-green-700 border-green-300';
  if (percent >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-orange-100 text-orange-700 border-orange-300';
}
```

**阈值**:
- 高置信度: ≥70%
- 中等置信度: 50-69%
- 低置信度: <50%

### 筛选逻辑

```typescript
shouldShowTarget(targetId: string): boolean {
  const confidence = this.getTargetConfidence(targetId);

  if (this.confidenceFilter.showHighOnly && confidence < 70) {
    return false;
  }

  if (this.confidenceFilter.hideLow && confidence < 50) {
    return false;
  }

  return true;
}
```

**应用位置**: `renderNewFormatModules` 方法中的 `forEach` 循环

---

## 🎨 UI 组件

### 置信度徽章

**HTML 结构**:
```html
<span x-show="hasConfidenceData && getTargetConfidence('title-keywords') > 0"
      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0"
      :class="getConfidenceColorClass(getTargetConfidence('title-keywords'))"
      role="status"
      :aria-label="getConfidenceAriaLabel(getTargetConfidence('title-keywords'))">
  <i class="fa-solid fa-chart-line text-[10px]" aria-hidden="true"></i>
  <span x-text="getTargetConfidence('title-keywords') + '%'"></span>
  <span x-text="getConfidenceLevel(getTargetConfidence('title-keywords'))"></span>
</span>
```

**Alpine.js 指令**:
- `x-show` - 条件显示
- `x-text` - 文本绑定
- `:class` - 动态类绑定
- `:aria-label` - 可访问性标签

### 筛选控制面板

**HTML 结构**:
```html
<div x-show="hasConfidenceData" class="mx-4 mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
  <div class="flex items-center gap-4 flex-wrap">
    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox"
             x-model="confidenceFilter.showHighOnly"
             @change="onConfidenceFilterChange"
             class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
      <span class="text-slate-700 font-medium">仅显示高置信度 (≥70%)</span>
    </label>
    <label class="flex items-center gap-2 text-sm cursor-pointer">
      <input type="checkbox"
             x-model="confidenceFilter.hideLow"
             @change="onConfidenceFilterChange"
             class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500">
      <span class="text-slate-700 font-medium">隐藏低置信度 (<50%)</span>
    </label>
  </div>
</div>
```

**Alpine.js 指令**:
- `x-model` - 双向数据绑定
- `@change` - 事件监听

---

## 🔄 响应式更新

### Zustand 订阅

PromptlabPanel 已经订阅了 Zustand store 的变化:

```typescript
appStore.subscribe((state) => {
  if (state.analysis?.analysisReport) {
    if (typeof (this as any).$nextTick === 'function') {
      (this as any).$nextTick(() => {
        this.renderReportAnalysis();
      });
    }
  }
});
```

当 AI 分析报告更新时，会自动重新渲染，包括置信度数据。

### Alpine.js 响应式

Alpine.js 的 getter 会自动追踪依赖，当 `appStore.getState().analysis.analysisReport` 变化时，所有使用 `reportConfidence`、`hasConfidenceData` 等 getter 的 UI 元素会自动更新。

---

## 🐛 调试

### 控制台日志

置信度相关的日志前缀: `[Promptlab 置信度]`

**关键日志**:
```javascript
console.debug('[Promptlab 置信度] reportConfidence:', confidence);
console.debug('[Promptlab 置信度] hasConfidenceData:', hasData);
console.debug('[Promptlab 置信度] overallConfidence:', overall);
```

### 调试步骤

1. **检查数据是否存在**:
```javascript
const report = appStore.getState().analysis.analysisReport;
console.log('报告:', report);
console.log('_metadata:', report?._metadata);
console.log('confidence:', report?._metadata?.confidence);
```

2. **检查 Alpine 组件**:
```javascript
const el = document.querySelector('[x-data="promptlabPanel"]');
const data = el?.__x?.$data;
console.log('hasConfidenceData:', data?.hasConfidenceData);
console.log('reportConfidence:', data?.reportConfidence);
```

3. **检查筛选状态**:
```javascript
console.log('confidenceFilter:', data?.confidenceFilter);
```

---

## 🔧 维护指南

### 修改置信度阈值

**位置**: `PromptlabPanel.ts`

```typescript
// 修改颜色分类阈值
getConfidenceColorClass(percent: number): string {
  if (percent >= 80) return 'bg-green-100 text-green-700 border-green-300'; // 改为 80%
  if (percent >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300'; // 改为 60%
  return 'bg-orange-100 text-orange-700 border-orange-300';
}

// 修改等级文字
getConfidenceLevel(percent: number): string {
  if (percent >= 80) return '高'; // 改为 80%
  if (percent >= 60) return '中'; // 改为 60%
  return '低';
}

// 修改筛选阈值
shouldShowTarget(targetId: string): boolean {
  const confidence = this.getTargetConfidence(targetId);

  if ((this.confidenceFilter as any).showHighOnly && confidence < 80) { // 改为 80
    return false;
  }

  if ((this.confidenceFilter as any).hideLow && confidence < 60) { // 改为 60
    return false;
  }

  return true;
}
```

**注意**: 修改后需要同步更新 UI 文本（template.html 中的"≥70%"等）。

### 添加新的筛选选项

**步骤**:

1. 在 `confidenceFilter` 状态中添加新字段:
```typescript
confidenceFilter: {
  showHighOnly: false,
  hideLow: false,
  showMediumOnly: false  // 新增
}
```

2. 在 `shouldShowTarget` 中添加逻辑:
```typescript
if ((this.confidenceFilter as any).showMediumOnly && (confidence < 50 || confidence >= 70)) {
  return false;
}
```

3. 在 template.html 中添加 UI 控件:
```html
<label class="flex items-center gap-2 text-sm cursor-pointer">
  <input type="checkbox"
         x-model="confidenceFilter.showMediumOnly"
         @change="onConfidenceFilterChange"
         class="h-4 w-4 rounded border-slate-300 text-blue-600">
  <span class="text-slate-700 font-medium">仅显示中等置信度 (50-69%)</span>
</label>
```

### 自定义徽章样式

**位置**: `PromptlabPanel.ts` 的 `getConfidenceColorClass` 方法

**示例 - 使用渐变背景**:
```typescript
getConfidenceColorClass(percent: number): string {
  if (percent >= 70) return 'bg-gradient-to-r from-green-100 to-green-200 text-green-700 border-green-300';
  if (percent >= 50) return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-700 border-yellow-300';
  return 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 border-orange-300';
}
```

---

## 🧪 测试

### 单元测试（建议添加）

```typescript
describe('PromptlabPanel - Confidence', () => {
  it('should calculate target confidence correctly', () => {
    const panel = createPromptlabPanel();
    // Mock appStore
    // Test getTargetConfidence
  });

  it('should filter targets based on confidence', () => {
    const panel = createPromptlabPanel();
    panel.confidenceFilter.showHighOnly = true;
    // Test shouldShowTarget
  });
});
```

### 集成测试

1. 完成 AI 分析（确保有置信度数据）
2. 导航到 Prompt 生成页面
3. 验证置信度徽章显示
4. 测试筛选功能
5. 验证筛选后的渲染结果

---

## 📊 性能考虑

### 优化点

1. **Getter 缓存**: Alpine.js 会自动缓存 getter 结果，只在依赖变化时重新计算

2. **条件渲染**: 使用 `x-show` 而不是 `x-if`，避免频繁的 DOM 操作

3. **筛选性能**: 筛选在渲染时执行，不会影响数据源

### 潜在问题

1. **大量分析维度**: 如果有 20+ 个分析维度，渲染可能较慢
   - **解决**: 考虑虚拟滚动或分页

2. **频繁筛选**: 每次筛选都会重新渲染
   - **解决**: 添加防抖（debounce）

---

## 🔐 安全性

### XSS 防护

所有动态内容都使用 `escapeHtml` 函数转义:

```typescript
const template = `
  <span>${escapeHtml(config.title)}</span>
`;
```

### 数据验证

所有置信度数据读取都有类型守卫:

```typescript
if (!report || typeof report === 'string') return null;
if (!reportObj._metadata) return null;
```

---

## 📚 相关文档

- 用户指南: `docs/promptlab-confidence-user-guide.md`
- 实现总结: `docs/promptlab-confidence-implementation-summary.md`
- UI 设计: `docs/promptlab-confidence-ui-design.md`
- 结构分析: `docs/promptlab-structure-analysis.md`

---

**文档版本**: 1.0
**最后更新**: 2026-03-06
**作者**: tech-lead
