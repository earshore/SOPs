# DNA 提取器架构设计

**版本**: 2.0
**设计者**: Tech Lead
**日期**: 2026-03-06
**目标**: 支持 Downloads 目录中的实际报告格式

---

## 1. 扩展的 ExtractedDNA 接口

```typescript
/**
 * 提取的产品 DNA 接口（扩展版）
 */
export interface ExtractedDNA {
  // === 现有字段（保持向后兼容）===
  audience: string;      // 目标受众描述
  usps: string;          // 核心卖点（多行）
  specs: string;         // 技术参数（多行）

  // === 新增字段 ===
  keywords: {
    core: string[];           // 核心关键词
    longTail: string[];       // 长尾关键词
    attribute: string[];      // 属性关键词
    intent: string[];         // 意图关键词
  };
  highFrequencyPhrases: string[];  // 高频短语
  painPoints: string[];            // 痛点列表
  differentiationAngles: string[]; // 差异化角度

  // === 置信度 ===
  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;
    overall: number;
  };

  // === 元数据 ===
  metadata: {
    extractedAt: string;
    reportType: 'semantic' | 'copywriting' | 'negative' | 'fullAnalysis' | 'unknown';
    sourceFields: string[];
  };
}
```

---

## 2. 报告类型检测

```typescript
/**
 * 检测报告类型
 */
function detectReportType(report: any): 'semantic' | 'copywriting' | 'negative' | 'fullAnalysis' | 'unknown' {
  // 检查 meta.templateId
  if (report.meta?.templateId) {
    const templateId = report.meta.templateId;
    if (templateId === 'semantic') return 'semantic';
    if (templateId === 'copywriting') return 'copywriting';
    if (templateId === 'negative') return 'negative';
  }

  // 基于字段检测（支持字段名变体）
  const hasKeywordClusters = report.keyword_clusters || report.keywordClusters;
  const hasHighFrequencyPhrases = report.high_frequency_phrases || report.highFrequencyPhrases;
  const hasFeaturePoints = report.feature_points || report.featurePoints;

  // 语义分析报告特征
  if (hasKeywordClusters && (hasHighFrequencyPhrases || hasFeaturePoints)) {
    return 'semantic';
  }

  // 文案生成报告特征
  if (report.seo_title && report.bullet_points) {
    return 'copywriting';
  }

  // 质量问题报告特征
  if (report.top_quality_issues || report.customer_complaints) {
    return 'negative';
  }

  // FullAnalysisReport 特征
  if (report['buyer-profile'] || report['selling-points'] || report['title-keywords']) {
    return 'fullAnalysis';
  }

  return 'unknown';
}
```

---

## 3. 关键词提取函数

```typescript
/**
 * 从语义分析报告提取关键词
 *
 * 数据源：
 * - keyword_clusters.core / keywordClusters.core
 * - keyword_clusters.long_tail / keywordClusters.longTail
 * - keyword_clusters.attribute / keywordClusters.attribute
 * - keyword_clusters.intent / keywordClusters.intent
 * - backend_search_terms (文案报告)
 * - native_voice.native_phrasing
 */
function extractKeywords(report: any): {
  keywords: ExtractedDNA['keywords'];
  confidence: number;
} {
  const keywords = {
    core: [] as string[],
    longTail: [] as string[],
    attribute: [] as string[],
    intent: [] as string[]
  };

  let confidence = 0;

  // 支持两种命名方式：keyword_clusters 和 keywordClusters
  const clusters = report.keyword_clusters || report.keywordClusters;

  if (clusters) {
    // 提取核心关键词
    if (clusters.core && Array.isArray(clusters.core)) {
      keywords.core = clusters.core;
      confidence += 0.3;
    }

    // 提取长尾关键词（支持 long_tail 和 longTail）
    const longTail = clusters.long_tail || clusters.longTail;
    if (longTail && Array.isArray(longTail)) {
      keywords.longTail = longTail;
      confidence += 0.3;
    }

    // 提取属性关键词
    if (clusters.attribute && Array.isArray(clusters.attribute)) {
      keywords.attribute = clusters.attribute;
      confidence += 0.2;
    }

    // 提取意图关键词
    if (clusters.intent && Array.isArray(clusters.intent)) {
      keywords.intent = clusters.intent;
      confidence += 0.2;
    }
  }

  // 从文案报告补充后台搜索词
  if (report.backend_search_terms && Array.isArray(report.backend_search_terms)) {
    keywords.core.push(...report.backend_search_terms);
    confidence = Math.max(confidence, 0.5);
  }

  // 从 native_voice 补充本地化表达
  if (report.native_voice?.native_phrasing && Array.isArray(report.native_voice.native_phrasing)) {
    keywords.longTail.push(...report.native_voice.native_phrasing);
    confidence += 0.1;
  }

  return {
    keywords,
    confidence: Math.min(confidence, 1.0)
  };
}
```

---

## 4. 高频短语提取函数

```typescript
/**
 * 提取高频短语
 *
 * 数据源：
 * - high_frequency_phrases (数组或对象格式)
 * - native_voice.emotional_hook
 */
function extractHighFrequencyPhrases(report: any): {
  phrases: string[];
  confidence: number;
} {
  const phrases: string[] = [];
  let confidence = 0;

  const hfp = report.high_frequency_phrases || report.highFrequencyPhrases;

  if (hfp) {
    // 处理对象格式：{ attribute: [...], use_cases: [...] }
    if (typeof hfp === 'object' && !Array.isArray(hfp)) {
      if (hfp.attribute && Array.isArray(hfp.attribute)) {
        phrases.push(...hfp.attribute);
      }
      if (hfp.use_cases && Array.isArray(hfp.use_cases)) {
        phrases.push(...hfp.use_cases);
      }
      confidence = 0.8;
    }
    // 处理数组格式
    else if (Array.isArray(hfp)) {
      phrases.push(...hfp);
      confidence = 0.8;
    }
  }

  // 从 native_voice 补充情感钩子
  if (report.native_voice?.emotional_hook && Array.isArray(report.native_voice.emotional_hook)) {
    phrases.push(...report.native_voice.emotional_hook);
    confidence = Math.max(confidence, 0.6);
  }

  return {
    phrases,
    confidence
  };
}
```

---

## 5. 技术规格提取函数

```typescript
/**
 * 提取技术规格
 *
 * 数据源：
 * - feature_points
 * - coreFeatures (对象格式，需要展开)
 * - product_summary (提取关键信息)
 */
function extractSpecsFromSemanticReport(report: any): {
  specs: string;
  confidence: number;
} {
  const specsList: string[] = [];
  let confidence = 0;

  // 1. 从 feature_points 提取
  const featurePoints = report.feature_points || report.featurePoints;
  if (featurePoints && Array.isArray(featurePoints)) {
    specsList.push(...featurePoints.map(f => `- ${f}`));
    confidence += 0.5;
  }

  // 2. 从 coreFeatures 提取（如果存在）
  if (report.coreFeatures && typeof report.coreFeatures === 'object') {
    Object.entries(report.coreFeatures).forEach(([key, value]) => {
      if (typeof value === 'string') {
        specsList.push(`- ${key}: ${value}`);
      }
    });
    confidence += 0.3;
  }

  // 3. 从 product_summary 提取关键信息（可选）
  if (report.product_summary && specsList.length < 3) {
    // 简单提取：将 product_summary 作为概述添加
    specsList.push(`- ${report.product_summary}`);
    confidence += 0.2;
  }

  return {
    specs: specsList.join('\n') || '未能提取技术参数',
    confidence: Math.min(confidence, 1.0)
  };
}
```

---

## 6. 受众提取函数

```typescript
/**
 * 提取目标受众
 *
 * 数据源：
 * - user_profile (demographics, goals, scenarios)
 * - competitor_insights.user_profile
 */
function extractAudienceFromSemanticReport(report: any): {
  audience: string;
  confidence: number;
} {
  const parts: string[] = [];
  let confidence = 0;

  // 1. 从 user_profile 提取
  if (report.user_profile) {
    const profile = report.user_profile;

    // demographics
    if (profile.demographics) {
      const demo = profile.demographics;
      if (demo.age_ranges && Array.isArray(demo.age_ranges)) {
        parts.push(...demo.age_ranges.slice(0, 2));
        confidence += 0.3;
      }
    }

    // goals
    if (profile.goals && Array.isArray(profile.goals)) {
      parts.push(...profile.goals.slice(0, 2));
      confidence += 0.3;
    }

    // scenarios
    if (profile.scenarios && Array.isArray(profile.scenarios)) {
      parts.push(...profile.scenarios.slice(0, 2));
      confidence += 0.2;
    }
  }

  // 2. 从 competitor_insights.user_profile 补充
  if (report.competitor_insights?.user_profile && Array.isArray(report.competitor_insights.user_profile)) {
    if (parts.length < 3) {
      parts.push(...report.competitor_insights.user_profile.slice(0, 3 - parts.length));
      confidence = Math.max(confidence, 0.5);
    }
  }

  return {
    audience: parts.join(', ') || '未能提取目标受众信息',
    confidence: Math.min(confidence, 1.0)
  };
}
```

---

## 7. 卖点提取函数

```typescript
/**
 * 提取核心卖点
 *
 * 数据源：
 * - feature_points (前5个)
 * - competitor_insights.strengths
 * - bullet_points (文案报告)
 */
function extractUSPsFromSemanticReport(report: any): {
  usps: string;
  confidence: number;
} {
  const usps: string[] = [];
  let confidence = 0;

  // 1. 从 feature_points 提取
  const featurePoints = report.feature_points || report.featurePoints;
  if (featurePoints && Array.isArray(featurePoints)) {
    usps.push(...featurePoints.slice(0, 5).map(f => `- ${f}`));
    confidence += 0.5;
  }

  // 2. 从 competitor_insights.strengths 补充
  if (usps.length < 3 && report.competitor_insights?.strengths) {
    const strengths = report.competitor_insights.strengths.slice(0, 3 - usps.length);
    usps.push(...strengths.map(s => `- ${s}`));
    confidence += 0.3;
  }

  // 3. 从 bullet_points 补充（文案报告）
  if (usps.length < 3 && report.bullet_points && Array.isArray(report.bullet_points)) {
    const bullets = report.bullet_points.slice(0, 3 - usps.length);
    usps.push(...bullets.map(b => `- ${b}`));
    confidence = Math.max(confidence, 0.6);
  }

  return {
    usps: usps.join('\n') || '未能提取核心卖点',
    confidence: Math.min(confidence, 1.0)
  };
}
```

---

## 8. 痛点提取函数

```typescript
/**
 * 提取痛点
 *
 * 数据源：
 * - pain_point_gaps.top_quality_issues
 * - pain_point_gaps.unmet_need
 * - user_profile.pain_points
 * - competitor_insights.weaknesses
 * - top_quality_issues (质量问题报告)
 * - customer_complaints (质量问题报告)
 */
function extractPainPoints(report: any): {
  painPoints: string[];
  confidence: number;
} {
  const painPoints: string[] = [];
  let confidence = 0;

  // 1. 从 pain_point_gaps 提取
  if (report.pain_point_gaps) {
    if (report.pain_point_gaps.top_quality_issues && Array.isArray(report.pain_point_gaps.top_quality_issues)) {
      painPoints.push(...report.pain_point_gaps.top_quality_issues);
      confidence += 0.3;
    }
    if (report.pain_point_gaps.unmet_need && Array.isArray(report.pain_point_gaps.unmet_need)) {
      painPoints.push(...report.pain_point_gaps.unmet_need);
      confidence += 0.3;
    }
  }

  // 2. 从 user_profile.pain_points 提取
  if (report.user_profile?.pain_points && Array.isArray(report.user_profile.pain_points)) {
    painPoints.push(...report.user_profile.pain_points);
    confidence += 0.2;
  }

  // 3. 从 competitor_insights.weaknesses 提取
  if (report.competitor_insights?.weaknesses && Array.isArray(report.competitor_insights.weaknesses)) {
    painPoints.push(...report.competitor_insights.weaknesses);
    confidence += 0.2;
  }

  // 4. 从质量问题报告提取
  if (report.top_quality_issues && Array.isArray(report.top_quality_issues)) {
    painPoints.push(...report.top_quality_issues);
    confidence = Math.max(confidence, 0.7);
  }

  if (report.customer_complaints && Array.isArray(report.customer_complaints)) {
    const complaints = report.customer_complaints.map(c => c.issue || c);
    painPoints.push(...complaints);
    confidence = Math.max(confidence, 0.7);
  }

  return {
    painPoints,
    confidence: Math.min(confidence, 1.0)
  };
}
```

---

## 9. 差异化角度提取函数

```typescript
/**
 * 提取差异化角度
 *
 * 数据源：
 * - pain_point_gaps.differentiation_angles
 * - competitor_insights.differentiation_angles
 * - differentiationAngles (直接字段)
 */
function extractDifferentiationAngles(report: any): {
  angles: string[];
  confidence: number;
} {
  const angles: string[] = [];
  let confidence = 0;

  // 1. 从 pain_point_gaps 提取
  if (report.pain_point_gaps?.differentiation_angles && Array.isArray(report.pain_point_gaps.differentiation_angles)) {
    angles.push(...report.pain_point_gaps.differentiation_angles);
    confidence += 0.4;
  }

  // 2. 从 competitor_insights 提取
  if (report.competitor_insights?.differentiation_angles && Array.isArray(report.competitor_insights.differentiation_angles)) {
    angles.push(...report.competitor_insights.differentiation_angles);
    confidence += 0.4;
  }

  // 3. 从直接字段提取（支持驼峰和下划线）
  const directAngles = report.differentiation_angles || report.differentiationAngles;
  if (directAngles && Array.isArray(directAngles)) {
    angles.push(...directAngles);
    confidence = Math.max(confidence, 0.6);
  }

  return {
    angles,
    confidence: Math.min(confidence, 1.0)
  };
}
```

---

## 10. 主提取函数

```typescript
/**
 * 从任意报告格式提取产品 DNA
 *
 * 支持的报告类型：
 * - semantic: 语义分析报告
 * - copywriting: 文案生成报告
 * - negative: 质量问题报告
 * - fullAnalysis: FullAnalysisReport 格式（现有支持）
 */
export function extractProductDNA(report: any): ExtractedDNA | null {
  if (!report) {
    Logger.warn('[DNA提取器] 报告为空，无法提取');
    return null;
  }

  Logger.debug('[DNA提取器] 开始提取产品 DNA');

  // 检测报告类型
  const reportType = detectReportType(report);
  Logger.debug('[DNA提取器] 报告类型:', reportType);

  try {
    let dna: ExtractedDNA;

    // 根据报告类型选择提取策略
    if (reportType === 'semantic' || reportType === 'copywriting' || reportType === 'negative') {
      // 从语义分析报告提取
      dna = extractFromSemanticReport(report, reportType);
    } else if (reportType === 'fullAnalysis') {
      // 从 FullAnalysisReport 提取（使用现有逻辑）
      dna = extractFromFullAnalysisReport(report);
    } else {
      Logger.warn('[DNA提取器] 未知报告类型，尝试通用提取');
      dna = extractFromSemanticReport(report, 'unknown');
    }

    // 计算总体置信度
    const avgConfidence = (
      dna.confidence.audience +
      dna.confidence.usps +
      dna.confidence.specs +
      dna.confidence.keywords
    ) / 4;

    dna.confidence.overall = avgConfidence;

    // 如果总体置信度太低，返回 null
    if (avgConfidence < 0.2) {
      Logger.warn('[DNA提取器] 提取置信度过低，放弃提取');
      return null;
    }

    Logger.debug('[DNA提取器] 提取完成:', {
      reportType: dna.metadata.reportType,
      confidence: dna.confidence
    });

    return dna;
  } catch (error) {
    Logger.error('[DNA提取器] 提取过程出错:', error);
    return null;
  }
}

/**
 * 从语义分析报告提取 DNA
 */
function extractFromSemanticReport(report: any, reportType: string): ExtractedDNA {
  // 提取各个部分
  const keywordsResult = extractKeywords(report);
  const phrasesResult = extractHighFrequencyPhrases(report);
  const audienceResult = extractAudienceFromSemanticReport(report);
  const uspsResult = extractUSPsFromSemanticReport(report);
  const specsResult = extractSpecsFromSemanticReport(report);
  const painPointsResult = extractPainPoints(report);
  const anglesResult = extractDifferentiationAngles(report);

  return {
    // 现有字段
    audience: audienceResult.audience,
    usps: uspsResult.usps,
    specs: specsResult.specs,

    // 新增字段
    keywords: keywordsResult.keywords,
    highFrequencyPhrases: phrasesResult.phrases,
    painPoints: painPointsResult.painPoints,
    differentiationAngles: anglesResult.angles,

    // 置信度
    confidence: {
      audience: audienceResult.confidence,
      usps: uspsResult.confidence,
      specs: specsResult.confidence,
      keywords: keywordsResult.confidence,
      overall: 0 // 将在主函数中计算
    },

    // 元数据
    metadata: {
      extractedAt: new Date().toISOString(),
      reportType: reportType as any,
      sourceFields: [
        'keyword_clusters',
        'high_frequency_phrases',
        'feature_points',
        'user_profile',
        'pain_point_gaps',
        'competitor_insights'
      ]
    }
  };
}

/**
 * 从 FullAnalysisReport 提取 DNA（保持现有逻辑）
 */
function extractFromFullAnalysisReport(report: any): ExtractedDNA {
  // 使用现有的提取函数
  const audienceResult = report['buyer-profile']
    ? extractAudience(report['buyer-profile'])
    : { text: '', confidence: 0 };

  const uspsResult = report['selling-points']
    ? extractUSPs(report['selling-points'])
    : { text: '', confidence: 0 };

  const specsResult = extractSpecs(
    report['title-keywords'],
    report['selling-points']
  );

  return {
    audience: audienceResult.text,
    usps: uspsResult.text,
    specs: specsResult.text,

    // 新字段为空（FullAnalysisReport 不包含这些数据）
    keywords: { core: [], longTail: [], attribute: [], intent: [] },
    highFrequencyPhrases: [],
    painPoints: [],
    differentiationAngles: [],

    confidence: {
      audience: audienceResult.confidence,
      usps: uspsResult.confidence,
      specs: specsResult.confidence,
      keywords: 0,
      overall: 0
    },

    metadata: {
      extractedAt: new Date().toISOString(),
      reportType: 'fullAnalysis',
      sourceFields: ['buyer-profile', 'selling-points', 'title-keywords']
    }
  };
}
```

---

## 11. 实现清单

### Phase 1: 核心功能（优先实现）

1. ✅ 扩展 `ExtractedDNA` 接口
2. ✅ 实现 `detectReportType()` 函数
3. ✅ 实现 `extractKeywords()` 函数
4. ✅ 实现 `extractHighFrequencyPhrases()` 函数
5. ✅ 实现 `extractSpecsFromSemanticReport()` 函数
6. ✅ 修改主 `extractProductDNA()` 函数，添加报告类型分支
7. ✅ 实现 `extractFromSemanticReport()` 函数

### Phase 2: 完整支持

8. ✅ 实现 `extractAudienceFromSemanticReport()` 函数
9. ✅ 实现 `extractUSPsFromSemanticReport()` 函数
10. ✅ 实现 `extractPainPoints()` 函数
11. ✅ 实现 `extractDifferentiationAngles()` 函数
12. ✅ 保留现有的 `extractFromFullAnalysisReport()` 逻辑

### Phase 3: 测试和优化

13. 使用 Downloads 目录中的 8 个报告文件测试
14. 验证关键词提取完整性
15. 验证技术规格可用性
16. 添加单元测试

---

## 12. 测试策略

### 测试文件

| 文件 | 报告类型 | 测试重点 |
|-----|---------|---------|
| `report_1767153992996.json` | semantic | 关键词、高频短语 |
| `competitor_report_1766776582362.json` | semantic | 完整提取 |
| `competitor_report_1766609667240.json` | semantic | 差异化角度 |
| `report_B09XBHXKKL_B0FB3M6ZMZ.json` | semantic | coreFeatures 提取 |
| `report_1766985541161.json` | copywriting | 文案字段提取 |
| `report_1767018799383.json` | negative | 痛点提取 |

### 验证点

1. **关键词完整性**：
   - core, longTail, attribute, intent 都应该被提取
   - 数量应该 > 0

2. **技术规格可用性**：
   - 格式化为列表（带 "- " 前缀）
   - 可直接用于 Listing

3. **字段名变体支持**：
   - keyword_clusters 和 keywordClusters 都能识别
   - long_tail 和 longTail 都能识别

4. **置信度合理性**：
   - 每个字段的置信度应该在 0-1 之间
   - overall 置信度应该是平均值

---

## 13. 向后兼容性

- 保留现有的 `ExtractedDNA` 接口字段（audience, usps, specs）
- 保留现有的提取函数（extractAudience, extractUSPs, extractSpecs）
- 新增字段使用默认值（空数组），不影响现有代码
- API 签名保持不变：`extractProductDNA(report: any): ExtractedDNA | null`

---

## 14. 下一步行动

**Developer 立即实现**：
1. 复制此文档中的所有函数到 `dnaExtractor.ts`
2. 更新 `ExtractedDNA` 接口
3. 按照实现清单逐步完成
4. 使用实际报告文件测试

**预计时间**：1-2 小时

---

**文档结束**
