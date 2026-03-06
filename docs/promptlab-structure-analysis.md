# Prompt 生成页面结构分析

## 📋 概述

**目标**：在 Prompt 生成页面展示 AI 分析报告的置信度，帮助用户筛选高质量分析结果。

**分析时间**：2026-03-06

---

## 🗂️ 关键文件

### 1. PromptlabPanel.ts
**路径**：`src/modules/app_center/views/master_analysis/promptlab/components/PromptlabPanel.ts`

**关键方法**：
- `renderReportAnalysis()` (第 294 行) - 主渲染入口
- `renderReportModules()` (第 381 行) - 渲染报告模块
- `renderNewFormatModules()` (第 636 行) - 渲染新格式报告
- `extractPreviewText()` (第 422 行) - 提取预览文本

**当前数据流**：
```
Zustand Store (appStore.getState().analysis.analysisReport)
  ↓
renderReportAnalysis()
  ↓
renderReportModules()
  ↓
renderNewFormatModules()
  ↓
生成 HTML (checkbox + 标题 + 预览文本)
```

### 2. template.html
**路径**：`src/modules/app_center/views/master_analysis/promptlab/template.html`

**关键容器**：
- `#report-sections-container` (第 296 行) - AI 分析报告列表容器
- `#lab-analysis-status` - 分析状态显示

---

## 🎨 当前 UI 结构

### AI 分析报告区域

每个分析维度渲染为一个复选框卡片：

```html
<div class="relative flex items-start p-3 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
  <!-- 复选框 -->
  <div class="flex h-5 items-center">
    <input type="checkbox"
           name="report-section"
           value="title-keywords"
           id="sect-title-keywords"
           class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
           checked
           @change="onReportSectionChange">
  </div>

  <!-- 标题和预览 -->
  <div class="ml-3 text-sm flex-1 min-w-0">
    <label for="sect-title-keywords" class="cursor-pointer select-none w-full block">
      <span class="font-medium text-slate-700 block mb-0.5 leading-snug">
        🔑 标题核心词根
      </span>
      <p class="text-xs text-slate-400 truncate font-normal" title="预览文本">
        预览文本
      </p>
    </label>
  </div>
</div>
```

**当前显示内容**：
- ✅ 图标 (emoji)
- ✅ 标题
- ✅ 预览文本
- ❌ **置信度** (缺失)

---

## 📊 数据结构

### AI 分析报告格式

```typescript
{
  "title-keywords": { /* 分析数据 */ },
  "selling-points": { /* 分析数据 */ },
  "fatal-flaws": { /* 分析数据 */ },
  "wow-moments": { /* 分析数据 */ },
  "hesitation-points": { /* 分析数据 */ },
  "buyer-profile": { /* 分析数据 */ },
  "vocab-gap": { /* 分析数据 */ },
  "promise-reality": { /* 分析数据 */ },
  "_metadata": {
    "confidence": {
      "title-keywords": 0.93,
      "selling-points": 0.93,
      "fatal-flaws": 0.37,
      "wow-moments": 1.0,
      "hesitation-points": 0.89,
      "buyer-profile": 0.90,
      "vocab-gap": 0.93,
      "promise-reality": 0.77
    },
    "overallConfidence": 0.84,
    "analyzedAt": "2026-03-06T05:04:15.683Z",
    "targetIds": [...],
    "language": "de"
  }
}
```

**置信度数据位置**：`report._metadata.confidence[targetId]`

---

## 🔧 需要修改的位置

### 1. PromptlabPanel.ts

**添加置信度相关方法** (参考 AlpinePanel.ts 第 238-325 行)：

```typescript
// 获取报告置信度
get reportConfidence() {
  const report = appStore.getState().analysis.analysisReport;
  if (!report || typeof report === 'string') return null;
  const reportObj = report as any;
  if (!reportObj._metadata) return null;
  return reportObj._metadata.confidence || null;
},

// 获取特定维度的置信度
getTargetConfidence(targetId: string): number {
  const confidence = this.reportConfidence as Record<string, number> | null;
  if (!confidence || !confidence[targetId]) return 0;
  return Math.round(confidence[targetId] * 100);
},

// 获取置信度颜色类
getConfidenceColorClass(percent: number): string {
  if (percent >= 70) return 'bg-green-100 text-green-700 border-green-300';
  if (percent >= 50) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
  return 'bg-orange-100 text-orange-700 border-orange-300';
},

// 获取置信度等级
getConfidenceLevel(percent: number): string {
  if (percent >= 70) return '高';
  if (percent >= 50) return '中';
  return '低';
},

// 检查是否有置信度数据
get hasConfidenceData(): boolean {
  return !!this.reportConfidence;
}
```

### 2. renderNewFormatModules 方法 (第 709-728 行)

**修改 HTML 模板**，在标题旁边添加置信度徽章：

```html
<div class="ml-3 text-sm flex-1 min-w-0">
  <label for="sect-${escapeHtml(targetId)}" class="cursor-pointer select-none w-full block">
    <div class="flex items-center justify-between mb-0.5">
      <span class="font-medium text-slate-700 leading-snug">
        ${config.icon} ${escapeHtml(config.title)}
      </span>
      <!-- 置信度徽章 -->
      <span x-show="hasConfidenceData && getTargetConfidence('${targetId}') > 0"
            class="text-xs px-2 py-0.5 rounded-full font-semibold"
            :class="getConfidenceColorClass(getTargetConfidence('${targetId}'))">
        <i class="fa-solid fa-chart-line text-[10px]"></i>
        <span x-text="getTargetConfidence('${targetId}') + '%'"></span>
        <span x-text="getConfidenceLevel(getTargetConfidence('${targetId}'))"></span>
      </span>
    </div>
    <p class="text-xs text-slate-400 truncate font-normal" title="${escapeHtml(previewText)}">
      ${escapeHtml(previewText)}
    </p>
  </label>
</div>
```

---

## 🎯 实现计划

### 阶段 1：添加置信度逻辑 (任务 #1)
- 在 PromptlabPanel.ts 中添加置信度相关的 getter 和方法
- 确保从 Zustand store 正确读取 `_metadata.confidence`

### 阶段 2：更新 UI 模板 (任务 #4)
- 修改 `renderNewFormatModules` 方法的 HTML 模板
- 添加置信度徽章显示

### 阶段 3：添加筛选功能 (任务 #5)
- 添加"仅显示高置信度"复选框
- 实现 `filteredResults` 计算属性
- 添加筛选状态提示

### 阶段 4：测试验证 (任务 #3)
- 手动测试置信度显示
- 验证筛选功能
- 截图验证

---

## 📝 注意事项

1. **Alpine.js 响应式**：
   - 使用 `x-show` 和 `x-text` 指令
   - 确保 getter 方法正确绑定

2. **样式一致性**：
   - 与 AI 分析页面的置信度样式保持一致
   - 使用相同的颜色编码（绿色/黄色/橙色）

3. **数据安全**：
   - 使用 `escapeHtml` 防止 XSS
   - 添加类型守卫检查

4. **用户体验**：
   - 低置信度项目显示警告
   - 提供快速筛选选项
   - 显示筛选状态

---

**分析完成时间**：2026-03-06
**分析者**：team-lead
