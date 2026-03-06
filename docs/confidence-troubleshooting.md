# 置信度显示问题 - 诊断和修复指南

## 问题描述

AI 分析完成后，报告正常显示，但**置信度卡片和徽章没有显示**。

## 快速修复步骤

### 方法 1: 使用自动诊断脚本（推荐）

1. **在 AI 分析页面完成一次分析**
   - 打开应用：http://localhost:5173
   - 进入：应用中心 → 主分析 → AI 智能分析
   - 选择 ASIN 和分析目标
   - 点击"开始分析"并等待完成

2. **打开浏览器控制台**
   - 按 `F12` 或 `Ctrl+Shift+I`
   - 切换到 "Console" 标签

3. **运行诊断脚本**
   - 打开文件：`diagnose-and-fix-confidence.js`
   - 复制全部内容
   - 粘贴到控制台并按回车

4. **查看诊断结果**
   - 脚本会自动检测问题
   - 如果发现缺失数据，会自动修复
   - 按照提示操作（可能需要刷新页面）

### 方法 2: 手动快速检查

在控制台执行以下代码：

```javascript
// 快速检查
const el = document.querySelector('[x-data*="aiAnalysisPanel"]');
const report = el?.__x?.$data?.analysisReport;
console.log('1. 报告存在:', !!report);
console.log('2. 有 _metadata:', !!report?._metadata);
console.log('3. 有 confidence:', !!report?._metadata?.confidence);
console.log('4. 总体置信度:', report?._metadata?.overallConfidence);
console.log('5. hasConfidenceData:', el?.__x?.$data?.hasConfidenceData);
```

**预期结果**：
- 如果第 2-4 项为 `false`，说明后端没有附加置信度数据
- 如果第 5 项为 `false`，说明前端没有检测到置信度数据

## 可能的原因和解决方案

### 原因 1: 报告缺少 _metadata 字段

**症状**：
- `report._metadata` 为 `undefined` 或 `null`
- `hasConfidenceData` 返回 `false`

**原因**：
- 后端 `runAIAnalysis` 函数计算了置信度，但在某个环节被丢失
- 可能是报告被序列化/反序列化时丢失了 _metadata

**解决方案**：
1. 运行自动诊断脚本（会自动修复）
2. 或手动添加 _metadata：

```javascript
// 手动修复
const el = document.querySelector('[x-data*="aiAnalysisPanel"]');
const data = el.__x.$data;
const report = data.analysisReport;

// 动态导入并计算
import('/src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator.ts')
  .then(({ calculateFullReportConfidence, calculateOverallConfidence }) => {
    const confidence = calculateFullReportConfidence(report);
    const overall = calculateOverallConfidence(confidence);

    report._metadata = {
      confidence,
      overallConfidence: overall,
      analyzedAt: new Date().toISOString(),
      targetIds: data.selectedTargets || [],
      language: 'zh'
    };

    data.analysisReport = { ...report };
    console.log('✅ 修复完成！总体置信度:', Math.round(overall * 100) + '%');
  });
```

### 原因 2: Alpine 响应式未更新

**症状**：
- `report._metadata` 存在
- 但 `hasConfidenceData` 仍然是 `false`

**原因**：
- Alpine.js 的响应式系统没有检测到数据变化

**解决方案**：
```javascript
// 强制触发 Alpine 更新
const el = document.querySelector('[x-data*="aiAnalysisPanel"]');
const data = el.__x.$data;
data.analysisReport = { ...data.analysisReport };
```

### 原因 3: UI 元素被 CSS 隐藏

**症状**：
- 数据都正常
- `hasConfidenceData` 为 `true`
- 但 UI 仍然不可见

**原因**：
- CSS 样式问题
- `x-show` 指令问题

**解决方案**：
```javascript
// 检查 UI 元素
const card = document.querySelector('[x-show="hasConfidenceData"]');
console.log('元素存在:', !!card);
console.log('display 样式:', card?.style.display);

// 强制显示（临时）
if (card) {
  card.style.display = 'block';
}
```

## 永久修复方案

如果每次分析后都需要手动修复，说明后端代码有问题。需要检查：

### 检查点 1: aiAnalysisService.ts

确认 `runAIAnalysis` 函数返回的报告包含 _metadata：

```typescript
// 文件：src/modules/app_center/views/master_analysis/ai_analysis/services/aiAnalysisService.ts
// 第 181-204 行

// 计算置信度
const confidenceScores = calculateFullReportConfidence(report as Record<string, unknown>);
const overallConfidence = calculateOverallConfidence(confidenceScores);

// 将置信度附加到报告元数据
const reportWithConfidence = {
  ...report,
  _metadata: {
    confidence: confidenceScores,
    overallConfidence: overallConfidence,
    analyzedAt: new Date().toISOString(),
    targetIds: targetIds,
    language: language
  }
};

return reportWithConfidence as FullAnalysisReport;
```

### 检查点 2: actions.ts

确认报告被正确保存：

```typescript
// 文件：src/modules/app_center/views/master_analysis/ai_analysis/components/actions.ts
// 第 293-301 行

context.analysisReport = analysisReport;  // 应该包含 _metadata
appStore.getState().setAnalysisReport(analysisReport as any);
```

### 检查点 3: 类型定义

确认 TypeScript 类型包含 _metadata：

```typescript
// 文件：src/types/modules-business.d.ts
// 应该有类似这样的定义

interface FullAnalysisReport {
  [key: string]: any;
  _metadata?: {
    confidence: Record<string, number>;
    overallConfidence: number;
    analyzedAt: string;
    targetIds: string[];
    language: string;
  };
}
```

## 调试日志

如果问题仍然存在，在控制台查看这些日志：

```javascript
// 查看所有置信度相关日志
console.log(
  localStorage.getItem('debug') === 'true'
    ? '调试模式已启用'
    : '调试模式未启用，运行 localStorage.setItem("debug", "true") 启用'
);

// 过滤置信度日志
// 在 Network 标签查看 AI API 响应
// 在 Console 标签搜索 "[AI分析]" 或 "[置信度]"
```

## 联系支持

如果以上方法都无法解决问题，请提供以下信息：

1. 诊断脚本的完整输出
2. 浏览器控制台的截图
3. Network 标签中 AI API 请求的响应数据
4. 当前的 git commit hash：`git rev-parse HEAD`

---

**最后更新**: 2026-03-06
**维护者**: tech-lead
