# Downloads 报告格式完整分析

**分析日期**: 2026-03-06
**分析人**: developer (Claude Opus 4.6)

## 执行摘要

用户在 Downloads 目录中有多种 AI 生成的产品分析报告格式。现有的 `dnaExtractor.ts` 仅支持 `FullAnalysisReport` 格式（buyer-profile, selling-points, title-keywords），无法处理这些实际报告。

**发现**: 3 种主要报告格式，每种格式的字段结构和数据组织方式都不同。

## 报告格式分类

### 格式 1: Competitor Report（竞品分析报告）

**示例文件**:
- `competitor_report_1766776582362.json`
- `competitor_report_1766514840905.json`

**识别特征**:
- 文件名前缀: `competitor_report_`
- 包含 `competitor_insights` 对象
- 包含 `feature_points` 数组

**完整字段结构**:
```typescript
interface CompetitorReport {
  product_summary: string;
  feature_points: string[];
  intents: string[];
  competitor_insights: {
    strengths: string[];
    weaknesses: string[];
    user_profile: string[];
    differentiation_angles: string[];
  };
  keyword_clusters: {
    core: string[];
    attribute: string[];
    long_tail: string[];
    banned?: string[];
  };
  high_frequency_phrases: string[];
  negative_drivers: string[];
  compliance_risks: Array<{
    type: string;
    examples: string[];
    suggestion: string;
  }>;
  qa_opportunities: Array<{
    question: string;
    answer_strategy: string;
  }>;
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
  };
}
```

**DNA 提取映射**:
- **关键词**: `keyword_clusters.core[]` + `keyword_clusters.long_tail[]` + `keyword_clusters.attribute[]`
- **受众**: `competitor_insights.user_profile[]`
- **卖点**: `feature_points[]` + `competitor_insights.strengths[]`
- **技术规格**: `keyword_clusters.attribute[]` (需过滤技术参数)
- **痛点**: `competitor_insights.weaknesses[]` + `negative_drivers[]`
- **差异化**: `competitor_insights.differentiation_angles[]`

---

### 格式 2: Product Overview Report（产品概览报告）

**示例文件**:
- `report_B09XBHXKKL_B0FB3M6ZMZ.json`

**识别特征**:
- 文件名前缀: `report_` + ASIN
- 包含 `productOverview` 对象
- 包含 `coreFeatures` 对象
- 包含结构化的 `user_profile` 对象

**完整字段结构**:
```typescript
interface ProductOverviewReport {
  meta: {
    generatedAt: string;
    engine: string;
    asins: string[];
  };
  productOverview: {
    itemsAnalyzed: number;
    asins: string[];
    market: string;
    category: string;
    summary: string;
  };
  coreFeatures: {
    materials?: string;
    packContents?: string;
    assembly?: string;
    flightCharacteristics?: string;
    useCases?: string;
    safetyClaims?: string;
    positioning?: string;
    // 动态字段，根据产品类型变化
    [key: string]: string | undefined;
  };
  user_profile: {
    demographics: {
      age_ranges: string[];
      locations: string[];
      household: string[];
    };
    goals: string[];
    pain_points: string[];
    scenarios: string[];
    objections: string[];
    price_sensitivity: string;
    decision_drivers: string[];
  };
  strengths: string[];
  weaknesses: string[];
  differentiationAngles: string[];
  keywordClusters: {
    core: string[];
    longTail: string[];
    intent: string[];
  };
  complianceRisks: Array<{
    type: string;
    risk: string;
    suggestion: string;
  }>;
}
```

**DNA 提取映射**:
- **关键词**: `keywordClusters.core[]` + `keywordClusters.longTail[]`
- **受众**: `user_profile.demographics` + `user_profile.scenarios[]`
- **卖点**: `coreFeatures` (所有字段) + `strengths[]`
- **技术规格**: `coreFeatures` 中的技术参数字段
- **痛点**: `user_profile.pain_points[]` + `weaknesses[]`
- **差异化**: `differentiationAngles[]`

---

### 格式 3: Semantic Analysis Report（语义分析报告）

**示例文件**:
- `report_1767153992996.json`

**识别特征**:
- 文件名前缀: `report_` + 时间戳
- `meta.templateId`: "semantic"
- `meta.templateUsed`: "语义与竞品分析"
- 包含 `pain_point_gaps` 对象
- 包含 `native_voice` 对象

**完整字段结构**:
```typescript
interface SemanticAnalysisReport {
  high_frequency_phrases: {
    attribute: string[];
    use_cases: string[];
  };
  pain_point_gaps: {
    top_quality_issues: string[];
    unmet_need: string[];
    differentiation_angles: string[];  // 包含 "Killer Feature" 标记
  };
  native_voice: {
    native_phrasing: string[];
    emotional_hook: string[];
  };
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
    templateUsed: string;
    templateId: string;
    dataScope: string[];
  };
}
```

**DNA 提取映射**:
- **关键词**: `high_frequency_phrases.attribute[]` + `native_voice.native_phrasing[]`
- **受众**: 无直接字段（需从 `high_frequency_phrases.use_cases[]` 推断）
- **卖点**: `pain_point_gaps.differentiation_angles[]` (Killer Features)
- **技术规格**: `high_frequency_phrases.attribute[]` (需过滤技术参数)
- **痛点**: `pain_point_gaps.top_quality_issues[]` + `pain_point_gaps.unmet_need[]`
- **差异化**: `pain_point_gaps.differentiation_angles[]`

---

## 格式对比矩阵

| 数据维度 | Competitor Report | Product Overview | Semantic Analysis |
|---------|-------------------|------------------|-------------------|
| **关键词** | keyword_clusters (core/attribute/long_tail) | keywordClusters (core/longTail/intent) | high_frequency_phrases (attribute/use_cases) |
| **受众画像** | competitor_insights.user_profile[] | user_profile (structured) | ❌ 无直接字段 |
| **产品特性** | feature_points[] | coreFeatures (object) | ❌ 无直接字段 |
| **优势/卖点** | competitor_insights.strengths[] | strengths[] | pain_point_gaps.differentiation_angles[] |
| **劣势/痛点** | competitor_insights.weaknesses[] + negative_drivers[] | user_profile.pain_points[] + weaknesses[] | pain_point_gaps.top_quality_issues[] + unmet_need[] |
| **差异化角度** | competitor_insights.differentiation_angles[] | differentiationAngles[] | pain_point_gaps.differentiation_angles[] |
| **高频短语** | high_frequency_phrases[] (flat) | ❌ 无 | high_frequency_phrases (categorized) |
| **合规风险** | compliance_risks[] | complianceRisks[] | compliance_risks[] |
| **本地化语言** | ❌ 无 | ❌ 无 | native_voice (native_phrasing/emotional_hook) |

## 技术规格识别策略

由于三种格式都没有明确的"技术规格"字段，需要使用智能模式匹配：

### 数据源
1. **Competitor Report**: `keyword_clusters.attribute[]`
2. **Product Overview**: `coreFeatures` 对象的值
3. **Semantic Analysis**: `high_frequency_phrases.attribute[]`

### 识别模式（复用现有 isTechnicalSpec 函数）
- 数字 + 单位: "50ml", "20 inch", "5000mAh", "180 density"
- 数字 + 百分号: "99%", "150% density"
- 数字范围: "20-30cm", "100-240V", "13x4 lace"
- 尺寸规格: "11 x 5,5 x 5,5 cm", "ca. 38 cm"
- 小数: "6.5 inch", "1.7oz"

## 报告类型检测策略

### 方法 1: 基于文件名
```typescript
function detectReportTypeByFilename(filename: string): ReportType {
  if (filename.startsWith('competitor_report_')) {
    return 'competitor';
  }
  if (filename.match(/^report_[A-Z0-9]+_[A-Z0-9]+\.json$/)) {
    return 'product_overview';
  }
  if (filename.match(/^report_\d+\.json$/)) {
    return 'semantic';  // 可能需要进一步验证
  }
  return 'unknown';
}
```

### 方法 2: 基于字段特征（更可靠）
```typescript
function detectReportTypeByFields(report: any): ReportType {
  // Competitor Report 特征
  if (report.competitor_insights && report.feature_points) {
    return 'competitor';
  }

  // Product Overview 特征
  if (report.productOverview && report.coreFeatures) {
    return 'product_overview';
  }

  // Semantic Analysis 特征
  if (report.pain_point_gaps && report.native_voice) {
    return 'semantic';
  }

  // 通过 meta.templateId 检测
  if (report.meta?.templateId === 'semantic') {
    return 'semantic';
  }

  return 'unknown';
}
```

## 推荐架构：适配器模式

### 核心接口
```typescript
/**
 * 统一的 DNA 提取结果接口
 */
interface ExtractedDNA {
  keywords: {
    core: string[];
    longTail: string[];
    attributes: string[];
  };
  audience: string;
  usps: string[];
  specs: string[];
  painPoints: string[];
  differentiation: string[];
  metadata: {
    extractedAt: string;
    reportType: ReportType;
    sourceFields: string[];
    confidence: {
      keywords: number;
      audience: number;
      usps: number;
      specs: number;
    };
  };
}

/**
 * 报告适配器接口
 */
interface ReportAdapter {
  canHandle(report: any): boolean;
  extractDNA(report: any): ExtractedDNA;
}
```

### 适配器实现
```typescript
class CompetitorReportAdapter implements ReportAdapter {
  canHandle(report: any): boolean {
    return !!(report.competitor_insights && report.feature_points);
  }

  extractDNA(report: CompetitorReport): ExtractedDNA {
    // 实现 Competitor Report 的提取逻辑
  }
}

class ProductOverviewAdapter implements ReportAdapter {
  canHandle(report: any): boolean {
    return !!(report.productOverview && report.coreFeatures);
  }

  extractDNA(report: ProductOverviewReport): ExtractedDNA {
    // 实现 Product Overview 的提取逻辑
  }
}

class SemanticAnalysisAdapter implements ReportAdapter {
  canHandle(report: any): boolean {
    return !!(report.pain_point_gaps && report.native_voice);
  }

  extractDNA(report: SemanticAnalysisReport): ExtractedDNA {
    // 实现 Semantic Analysis 的提取逻辑
  }
}
```

### 主提取器
```typescript
class UniversalDNAExtractor {
  private adapters: ReportAdapter[] = [
    new CompetitorReportAdapter(),
    new ProductOverviewAdapter(),
    new SemanticAnalysisAdapter()
  ];

  extractDNA(report: any): ExtractedDNA | null {
    const adapter = this.adapters.find(a => a.canHandle(report));
    if (!adapter) {
      Logger.warn('未识别的报告格式');
      return null;
    }
    return adapter.extractDNA(report);
  }
}
```

## 实现优先级建议

### Phase 1: 核心功能（必需）
1. 实现报告类型检测
2. 实现 CompetitorReportAdapter（最常见格式）
3. 实现关键词提取（所有格式都有）
4. 实现基本的置信度计算

### Phase 2: 完整支持（推荐）
1. 实现 ProductOverviewAdapter
2. 实现 SemanticAnalysisAdapter
3. 完善技术规格识别
4. 增强置信度计算

### Phase 3: 增强功能（可选）
1. 支持混合报告（同时包含多种格式特征）
2. 智能字段映射（AI 辅助识别新字段）
3. 用户自定义提取规则
4. 提取结果可视化

## 测试策略

### 单元测试
- 每种报告格式的适配器独立测试
- 报告类型检测测试
- 边界情况测试（缺失字段、空数组等）

### 集成测试
- 使用 Downloads 目录中的实际报告文件
- 验证提取结果的完整性和准确性
- 性能测试（大文件处理）

### 测试数据
- `competitor_report_1766776582362.json` - Competitor Report
- `report_B09XBHXKKL_B0FB3M6ZMZ.json` - Product Overview
- `report_1767153992996.json` - Semantic Analysis

## 向后兼容性

### 保留现有 dnaExtractor.ts
- 现有的 `extractProductDNA(FullAnalysisReport)` 保持不变
- 新增 `extractDNAFromDownloadsReport(any)` 函数
- 两个提取器可以共存

### 统一接口
```typescript
// 统一的提取函数
function extractDNA(report: FullAnalysisReport | DownloadsReport): ExtractedDNA | null {
  // 检测报告类型
  if (isFullAnalysisReport(report)) {
    return extractProductDNA(report);  // 使用现有提取器
  } else {
    return extractDNAFromDownloadsReport(report);  // 使用新提取器
  }
}
```

## 下一步行动

### Architect 需要决策
1. 是否采用适配器模式？
2. ExtractedDNA 接口是否需要扩展？
3. 是否需要支持所有三种格式，还是优先支持某一种？
4. 置信度计算策略？

### Developer 准备实现
1. 等待 architect 完成接口设计
2. 实现报告类型检测逻辑
3. 实现各个适配器
4. 编写单元测试和集成测试

## 附录：实际数据示例

### Competitor Report 示例（部分）
```json
{
  "product_summary": "Kleine Handglocken (metallisch) mit Griff...",
  "feature_points": [
    "Kompakte, tragbare Größe (ca. 11 x 5,5 x 5,5 cm)",
    "Metallkonstruktion (Zinklegierung oder massiv Messing)",
    "Klarer, lauter Klang durch innere Metallkugel"
  ],
  "keyword_clusters": {
    "core": ["Handglocke", "Tischglocke", "Serviceglocke"],
    "attribute": ["Messing", "Zinklegierung", "laut", "klarer Klang"],
    "long_tail": ["Handglocke für Kinder zum Essen rufen"]
  }
}
```

### Product Overview 示例（部分）
```json
{
  "coreFeatures": {
    "materials": "EPP / Styrofoam-style foam",
    "packContents": "4 gliders per pack (approx. 38 cm length)",
    "assembly": "Tool-free push-fit assembly"
  },
  "user_profile": {
    "demographics": {
      "age_ranges": ["Parents of young children (approx. 3–12 years)"]
    },
    "goals": ["Provide low-cost outdoor entertainment"]
  }
}
```

### Semantic Analysis 示例（部分）
```json
{
  "high_frequency_phrases": {
    "attribute": ["natürlich", "Matatabi / Silvervine", "zahnpflegend"],
    "use_cases": ["Spielzeug zum Kauen", "Zahnpflege"]
  },
  "pain_point_gaps": {
    "differentiation_angles": [
      "Killer Feature: Zwei-Härte-Sticks im Set"
    ]
  }
}
```

---

**文档状态**: ✅ 完成
**最后更新**: 2026-03-06
**下一步**: 等待 architect 设计方案
