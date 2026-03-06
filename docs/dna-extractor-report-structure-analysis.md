# DNA 提取器 - 报告结构分析

**分析日期**: 2026-03-06
**分析人**: Tech Lead
**数据源**: D:\Users\Administrator\Downloads 目录下的 8 个报告文件

## 执行摘要

Downloads 目录中存在**三种不同类型**的 AI 分析报告，每种报告有不同的数据结构和用途。现有 DNA 提取器期望的 `FullAnalysisReport` 格式（buyer-profile, selling-points, title-keywords）在实际报告中**不存在**。

**关键发现**：用户抱怨"关键词都没有加载进来"是因为现有提取器在查找不存在的字段。实际报告使用完全不同的字段名称。

---

## 报告类型分类

### 类型 1: 语义与竞品分析报告 ⭐⭐⭐⭐⭐
**最有价值，应优先支持**

**文件示例**:
- `report_1767153992996.json` (猫玩具 Matatabi)
- `report_B09XBHXKKL_B0FB3M6ZMZ.json` (泡沫飞机)
- `competitor_report_1766609667240.json` (香水)
- `competitor_report_1766641167740.json` (香水)
- `competitor_report_1766776582362.json` (手摇铃)

**模板标识**: `templateId: "semantic"` 或无明确标识

**核心字段结构**:
```typescript
{
  // 关键词集群 - 最重要的字段
  keyword_clusters: {
    core: string[];           // 核心关键词 (5-10个)
    attribute?: string[];     // 属性关键词 (材质、尺寸等)
    long_tail: string[];      // 长尾关键词 (完整短语)
    intent?: string[];        // 意图关键词 (购买意图)
    banned?: string[];        // 禁用词
  },

  // 高频短语 - 用户真实表达
  high_frequency_phrases: {
    attribute?: string[];     // 属性短语
    use_cases?: string[];     // 使用场景
  } | string[],               // 有时是简单数组

  // 产品特性
  feature_points: string[];   // 结构化特性列表 (5-10个)
  product_summary: string;    // 产品概述 (1-2段)

  // 痛点和差异化
  pain_point_gaps?: {
    top_quality_issues: string[];
    unmet_need: string[];
    differentiation_angles: string[];
  },

  // 用户画像
  user_profile?: {
    demographics: object;
    goals: string[];
    pain_points: string[];
    scenarios: string[];
  },

  // 竞品洞察
  competitor_insights?: {
    strengths: string[];
    weaknesses: string[];
    user_profile: string[];
    differentiation_angles: string[];
  },

  // 本地化表达
  native_voice?: {
    native_phrasing: string[];
    emotional_hook: string[];
  },

  // 合规风险
  compliance_risks?: Array<{
    type: string;
    examples: string[];
    suggestion: string;
  }>,

  // 元数据
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
    templateUsed?: string;
    templateId?: string;
  }
}
```

**提取优先级**:
1. ⭐⭐⭐⭐⭐ `keyword_clusters` - 核心关键词、长尾词、属性词
2. ⭐⭐⭐⭐⭐ `high_frequency_phrases` - 高频短语
3. ⭐⭐⭐⭐⭐ `feature_points` - 技术规格和特性
4. ⭐⭐⭐⭐ `pain_point_gaps.differentiation_angles` - 差异化角度
5. ⭐⭐⭐⭐ `competitor_insights.differentiation_angles` - 竞品差异化
6. ⭐⭐⭐ `user_profile` - 目标受众
7. ⭐⭐⭐ `native_voice.native_phrasing` - 本地化表达
8. ⭐⭐ `product_summary` - 产品概述

---

### 类型 2: 营销文案生成报告 ⭐⭐
**次要价值，可选支持**

**文件示例**:
- `report_1766985541161.json` (猫玩具文案)

**模板标识**: `templateId: "copywriting"`, `templateUsed: "✍️ 营销文案生成"`

**核心字段结构**:
```typescript
{
  seo_title: string;              // SEO 标题
  bullet_points: string[];        // 五点描述
  product_description: string;    // 产品描述
  backend_search_terms: string[]; // 后台搜索词
  meta: { ... }
}
```

**提取价值**: 低 - 这是生成的输出，不是分析输入。但 `backend_search_terms` 可作为关键词补充。

---

### 类型 3: 质量问题分析报告 ⭐⭐⭐
**中等价值，用于痛点提取**

**文件示例**:
- `report_1767018799383.json` (香水质量问题)

**模板标识**: `templateId: "negative"`, `templateUsed: "🤬 差评痛点挖掘"`

**核心字段结构**:
```typescript
{
  top_quality_issues: string[];        // 主要质量问题
  customer_complaints: Array<{         // 客户投诉
    issue: string;
    frequency: "High" | "Medium" | "Low";
  }>,
  improvement_suggestions: string[];   // 改进建议
  meta: { ... }
}
```

**提取价值**: 中 - 可用于提取痛点信息，但不包含关键词和规格。

---

## 字段对比：现有 vs 实际

| 现有提取器期望 | 实际报告字段 | 匹配度 |
|--------------|------------|-------|
| `buyer-profile` | `user_profile` | ❌ 字段名不同 |
| `selling-points` | `feature_points` | ❌ 字段名不同 |
| `title-keywords` | `keyword_clusters` | ❌ 字段名和结构都不同 |
| - | `high_frequency_phrases` | ❌ 缺失 |
| - | `pain_point_gaps` | ❌ 缺失 |
| - | `differentiation_angles` | ❌ 缺失 |

**结论**: 现有提取器与实际报告格式**完全不兼容**。

---

## 跨品类数据结构对比

### 猫玩具 (Matatabi)
```json
{
  "keyword_clusters": { "core": [...], "long_tail": [...] },
  "high_frequency_phrases": { "attribute": [...], "use_cases": [...] },
  "pain_point_gaps": { "top_quality_issues": [...], "differentiation_angles": [...] }
}
```

### 泡沫飞机
```json
{
  "keywordClusters": { "core": [...], "longTail": [...], "intent": [...] },
  "coreFeatures": { "materials": "...", "packContents": "..." },
  "user_profile": { "demographics": {...}, "goals": [...] }
}
```

### 香水
```json
{
  "keyword_clusters": { "core": [...], "attribute": [...], "long_tail": [...] },
  "high_frequency_phrases": [...],
  "feature_points": [...]
}
```

### 手摇铃
```json
{
  "keyword_clusters": { "core": [...], "attribute": [...], "long_tail": [...], "banned": [...] },
  "high_frequency_phrases": [...],
  "feature_points": [...],
  "competitor_insights": { "differentiation_angles": [...] }
}
```

**观察**:
1. 字段名称有时使用下划线 (`keyword_clusters`)，有时使用驼峰 (`keywordClusters`)
2. `high_frequency_phrases` 有时是对象，有时是数组
3. 不同报告包含不同的可选字段
4. 核心结构相似，但细节有差异

---

## 推荐的 DNA 提取策略

### 新的 ExtractedDNA 接口

```typescript
export interface ExtractedDNA {
  // 现有字段（保持向后兼容）
  audience: string;
  usps: string;
  specs: string;

  // 新增字段
  keywords: {
    core: string[];           // 核心关键词
    longTail: string[];       // 长尾关键词
    attribute: string[];      // 属性关键词
    intent: string[];         // 意图关键词
  };
  highFrequencyPhrases: string[];  // 高频短语
  painPoints: string[];            // 痛点
  differentiationAngles: string[]; // 差异化角度

  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;
    overall: number;
  };

  metadata: {
    extractedAt: string;
    reportType: 'semantic' | 'copywriting' | 'negative' | 'unknown';
    sourceFields: string[];
  };
}
```

### 提取函数设计

```typescript
// 1. 关键词提取（最高优先级）
function extractKeywords(report: any): KeywordsResult {
  // 支持 keyword_clusters 和 keywordClusters 两种命名
  const clusters = report.keyword_clusters || report.keywordClusters;

  return {
    core: clusters?.core || [],
    longTail: clusters?.long_tail || clusters?.longTail || [],
    attribute: clusters?.attribute || [],
    intent: clusters?.intent || []
  };
}

// 2. 高频短语提取
function extractHighFrequencyPhrases(report: any): string[] {
  const phrases = report.high_frequency_phrases;

  // 处理对象格式 { attribute: [...], use_cases: [...] }
  if (phrases && typeof phrases === 'object' && !Array.isArray(phrases)) {
    return [
      ...(phrases.attribute || []),
      ...(phrases.use_cases || [])
    ];
  }

  // 处理数组格式
  return phrases || [];
}

// 3. 技术规格提取（从 feature_points）
function extractSpecs(report: any): string[] {
  return report.feature_points || [];
}

// 4. 差异化角度提取
function extractDifferentiationAngles(report: any): string[] {
  const angles = [];

  // 从 pain_point_gaps 提取
  if (report.pain_point_gaps?.differentiation_angles) {
    angles.push(...report.pain_point_gaps.differentiation_angles);
  }

  // 从 competitor_insights 提取
  if (report.competitor_insights?.differentiation_angles) {
    angles.push(...report.competitor_insights.differentiation_angles);
  }

  return angles;
}

// 5. 受众提取（从 user_profile）
function extractAudience(report: any): string {
  const profile = report.user_profile;
  if (!profile) return '';

  const parts = [];

  // demographics
  if (profile.demographics) {
    // 提取年龄、性别等
  }

  // goals
  if (profile.goals) {
    parts.push(...profile.goals.slice(0, 3));
  }

  return parts.join(', ');
}
```

### 报告类型检测

```typescript
function detectReportType(report: any): 'semantic' | 'copywriting' | 'negative' | 'unknown' {
  // 检查 meta.templateId
  if (report.meta?.templateId === 'semantic') return 'semantic';
  if (report.meta?.templateId === 'copywriting') return 'copywriting';
  if (report.meta?.templateId === 'negative') return 'negative';

  // 基于字段检测
  if (report.keyword_clusters || report.keywordClusters) return 'semantic';
  if (report.seo_title && report.bullet_points) return 'copywriting';
  if (report.top_quality_issues) return 'negative';

  return 'unknown';
}
```

---

## 实现建议

### 方案 A: 创建新的提取器（推荐）

创建 `semanticReportExtractor.ts`，专门处理语义分析报告：

```typescript
// src/modules/app_center/views/master_analysis/services/semanticReportExtractor.ts
export function extractDNAFromSemanticReport(report: any): ExtractedDNA | null {
  // 实现新的提取逻辑
}
```

优点：
- 清晰分离两种不同的数据源
- 不影响现有代码
- 易于测试和维护

### 方案 B: 扩展现有提取器

在 `dnaExtractor.ts` 中添加报告类型检测和分支逻辑：

```typescript
export function extractProductDNA(report: any): ExtractedDNA | null {
  const reportType = detectReportType(report);

  if (reportType === 'semantic') {
    return extractFromSemanticReport(report);
  } else if (isFullAnalysisReport(report)) {
    return extractFromFullAnalysisReport(report);
  }

  return null;
}
```

优点：
- 统一的 API 接口
- 自动适配不同报告格式

**推荐**: 方案 B，因为用户期望一个统一的 DNA 提取器。

---

## 测试数据集

| 文件 | 报告类型 | 品类 | 关键字段 | 测试优先级 |
|-----|---------|------|---------|----------|
| `report_1767153992996.json` | semantic | 猫玩具 | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| `competitor_report_1766776582362.json` | semantic | 手摇铃 | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| `competitor_report_1766609667240.json` | semantic | 香水 | ✅ 完整 | ⭐⭐⭐⭐⭐ |
| `report_B09XBHXKKL_B0FB3M6ZMZ.json` | semantic | 泡沫飞机 | ✅ 完整 | ⭐⭐⭐⭐ |
| `report_1766985541161.json` | copywriting | 猫玩具 | ⚠️ 部分 | ⭐⭐ |
| `report_1767018799383.json` | negative | 香水 | ⚠️ 部分 | ⭐⭐ |

---

## 下一步行动

1. ✅ **数据结构分析** - 已完成（本文档）
2. ⏳ **架构设计** - architect 执行
   - 设计统一的提取接口
   - 设计报告类型检测逻辑
   - 设计各字段的提取函数
3. ⏳ **代码实现** - developer 执行
   - 扩展 ExtractedDNA 接口
   - 实现新的提取函数
   - 添加报告类型检测
   - 使用实际报告测试
4. ⏳ **测试验证**
   - 使用 6 个测试报告验证
   - 确保关键词完整提取
   - 确保规格可用

---

## 附录：完整字段清单

### 语义分析报告所有字段

```
keyword_clusters / keywordClusters
  ├─ core
  ├─ attribute
  ├─ long_tail / longTail
  ├─ intent
  └─ banned

high_frequency_phrases
  ├─ attribute (对象格式)
  ├─ use_cases (对象格式)
  └─ [直接数组] (数组格式)

feature_points
product_summary

pain_point_gaps
  ├─ top_quality_issues
  ├─ unmet_need
  └─ differentiation_angles

user_profile
  ├─ demographics
  ├─ goals
  ├─ pain_points
  ├─ scenarios
  └─ objections

competitor_insights
  ├─ strengths
  ├─ weaknesses
  ├─ user_profile
  └─ differentiation_angles

native_voice
  ├─ native_phrasing
  └─ emotional_hook

compliance_risks[]
  ├─ type
  ├─ examples
  └─ suggestion

qa_opportunities[]
  ├─ question
  └─ answer_strategy

meta
  ├─ targetMarket
  ├─ analyzedASINs
  ├─ generatedByModel
  ├─ generatedAt
  ├─ templateUsed
  └─ templateId
```

---

**文档版本**: 1.0
**最后更新**: 2026-03-06
