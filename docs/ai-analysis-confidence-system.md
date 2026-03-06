# AI 分析报告置信度系统

## 概述

为 AI 分析报告添加了置信度评分系统,用于评估每个分析报告类型的数据质量和可靠性。

## 实现内容

### 1. 置信度计算服务

**文件**: `src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator.ts`

- 为 8 种报告类型实现置信度计算:
  - Title Keywords (标题关键词)
  - Selling Points (卖点分析)
  - Fatal Flaws (致命缺陷)
  - Wow Moments (惊喜时刻)
  - Hesitation Points (犹豫点)
  - Buyer Profile (买家画像)
  - Vocab Gap (词汇差距)
  - Promise Reality (承诺兑现)

- 置信度评分维度:
  - **数据完整性**: 必需字段是否存在
  - **数据质量**: 内容长度、结构合理性
  - **数据有效性**: 是否包含错误标记或空值

- 置信度等级:
  - **高置信度**: ≥ 0.7 (绿色)
  - **中等置信度**: 0.5 - 0.7 (黄色)
  - **低置信度**: < 0.5 (橙色)

### 2. AI 分析服务集成

**文件**: `src/modules/app_center/views/master_analysis/ai_analysis/services/aiAnalysisService.ts`

- 在 `runAIAnalysis()` 函数中自动计算置信度
- 将置信度附加到报告的 `_metadata` 字段
- 包含以下元数据:
  ```typescript
  {
    confidence: Record<string, number>,  // 各报告类型置信度
    overallConfidence: number,           // 总体置信度
    analyzedAt: string,                  // 分析时间
    targetIds: string[],                 // 分析目标列表
    language: string                     // 分析语言
  }
  ```

### 3. 类型定义更新

**文件**: `src/types/modules-business.d.ts`

- 为 `AnalysisReport` 接口添加 `_metadata` 字段
- 定义置信度元数据结构

**文件**: `src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData.ts`

- 为 `FullAnalysisReport` 接口添加 `AnalysisReportMetadata` 类型

### 4. UI 展示

**文件**: `src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanelOptimized.ts`

- 添加置信度相关计算属性:
  - `reportConfidence`: 各报告类型置信度
  - `overallConfidence`: 总体置信度
  - `overallConfidencePercent`: 总体置信度百分比
  - `hasConfidenceData`: 是否有置信度数据
  - `getTargetConfidence(targetId)`: 获取特定报告的置信度
  - `getConfidenceColorClass(targetId)`: 获取置信度颜色类

**文件**: `src/modules/app_center/views/master_analysis/ai_analysis/template.html`

- 在统计概览栏添加总体置信度卡片
- 在每个分析结果卡片头部添加置信度徽章
- 颜色编码:
  - 绿色: 高置信度 (≥70%)
  - 黄色: 中等置信度 (50-70%)
  - 橙色: 低置信度 (<50%)

### 5. 测试覆盖

**单元测试**: `test/unit/confidenceCalculator.test.ts` (11 个测试)
- 测试各报告类型的置信度计算
- 测试完整报告置信度计算
- 测试总体置信度计算
- 测试置信度等级分类
- 测试置信度颜色类生成

**集成测试**: `test/unit/confidenceSystem.integration.test.ts` (7 个测试)
- 测试置信度元数据集成
- 测试 Store 读写置信度数据
- 测试低质量报告处理
- 测试混合质量报告处理
- 测试部分报告类型处理
- 测试百分比计算
- 测试置信度等级分类

**测试结果**: ✅ 18/18 通过

## 使用示例

### 1. 自动计算置信度

```typescript
// AI 分析完成后自动计算置信度
const report = await runAIAnalysis(targetIds, product, onProgress, language);

// 报告包含置信度元数据
console.log(report._metadata.overallConfidence); // 0.75
console.log(report._metadata.confidence['title-keywords']); // 0.82
```

### 2. UI 展示置信度

```html
<!-- 总体置信度卡片 -->
<div x-show="hasConfidenceData">
  <span x-text="overallConfidencePercent"></span>%
</div>

<!-- 单个报告置信度徽章 -->
<span x-show="hasConfidenceData && getTargetConfidence(result.targetId) > 0"
      :class="getConfidenceColorClass(result.targetId)">
  <span x-text="`${getTargetConfidence(result.targetId)}%`"></span>
</span>
```

## 置信度计算逻辑

### Title Keywords
- 主关键词数量 (权重 1/3)
- 次要关键词数量 (权重 1/3)
- 优化建议质量 (权重 1/3)

### Selling Points
- 五点描述分析完整性 (权重 1/3)
- 整体策略质量 (权重 1/3)
- 功能场景矩阵完整性 (权重 1/3)

### Fatal Flaws
- 致命缺陷识别 (权重 1/3)
- 风险评估质量 (权重 1/3)
- 可行性修复建议 (权重 1/3)

### Wow Moments
- 惊喜时刻数量 (权重 1/3)
- 情感触发器质量 (权重 1/3)
- 文案角度质量 (权重 1/3)

### Hesitation Points
- 犹豫点识别 (权重 1/3)
- 常见疑虑分析 (权重 1/3)
- 信任建立建议 (权重 1/3)

### Buyer Profile
- 人口统计完整性 (权重 1/4)
- 买家类型分析 (权重 1/4)
- 使用场景分析 (权重 1/4)
- 购买动机分析 (权重 1/4)

### Vocab Gap
- 未覆盖术语识别 (权重 1/3)
- 术语翻译质量 (权重 1/3)
- Listing 优化建议 (权重 1/3)

### Promise Reality
- 承诺现实差距分析 (权重 1/3)
- 总体可信度评估 (权重 1/3)
- 已验证声明质量 (权重 1/3)

## 技术细节

- **置信度范围**: 0.0 - 1.0
- **最低可接受阈值**: 0.2
- **计算方式**: 各维度加权平均
- **总体置信度**: 所有报告类型置信度的算术平均值

## 未来改进

1. 根据实际使用数据调整权重
2. 添加置信度趋势分析
3. 实现置信度阈值告警
4. 支持自定义置信度计算规则
5. 添加置信度历史记录
