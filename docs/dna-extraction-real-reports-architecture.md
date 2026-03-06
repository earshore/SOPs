# DNA 提取架构设计（基于实际报告格式）

## 1. 问题根源分析

### 1.1 代码期望 vs 实际报告

**代码期望的格式** (`analysisReportData.ts`):
```typescript
interface FullAnalysisReport {
  'buyer-profile'?: BuyerProfileReport;
  'selling-points'?: SellingPointsReport;
  'title-keywords'?: TitleKeywordsReport;
  'fatal-flaws'?: FatalFlawsReport;
  'wow-moments'?: WowMomentsReport;
  'hesitation-points'?: HesitationPointsReport;
  'buyer-profile'?: BuyerProfileReport;
  'vocab-gap'?: VocabGapReport;
  'promise-reality'?: PromiseRealityReport;
}
```

**实际报告格式** (Downloads 目录):
```json
{
  "keyword_clusters": { "core": [], "attribute": [], "long_tail": [] },
  "high_frequency_phrases": [],
  "feature_points": [],
  "pain_point_gaps": {},
  "competitor_insights": {},
  "meta": { "templateId": "semantic" }
}
```

**结论**: 完全不匹配！这就是为什么"关键词都没有加载进来"。

## 2. 实际报告类型分析

### 2.1 竞品分析报告 (最常用)

**文件命名**: `competitor_report_*.json`

**完整字段结构**:
```typescript
interface CompetitorAnalysisReport {
  product_summary: string;
  feature_points: string[];
  intent: string[];
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

**数据丰富度**: ⭐⭐⭐⭐⭐ (最完整)

### 2.2 语义与竞品分析报告

**识别**: `meta.templateId === "semantic"`

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
    differentiation_angles: string[];
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
    templateId: "semantic";
    dataScope: string[];
  };
}
```

**数据丰富度**: ⭐⭐⭐ (中等)

### 2.3 营销文案生成报告

**识别**: `meta.templateId === "copywriting"`

**完整字段结构**:
```typescript
interface CopywritingReport {
  seo_title: string;
  bullet_points: string[];
  product_description: string;
  backend_search_terms: string[];
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
    templateUsed: string;
    templateId: "copywriting";
    dataScope: string[];
  };
}
```

**数据丰富度**: ⭐⭐ (较少，主要是生成的文案)

### 2.4 差评痛点挖掘报告

**识别**: `meta.templateId === "negative"`

**完整字段结构**:
```typescript
interface NegativeAnalysisReport {
  top_quality_issues: string[];
  customer_complaints: Array<{
    issue: string;
    frequency: "High" | "Medium" | "Low";
  }>;
  improvement_suggestions: string[];
  meta: {
    targetMarket: string;
    analyzedASINs: string[];
    generatedByModel: string;
    generatedAt: string;
    templateUsed: string;
    templateId: "negative";
    dataScope: string[];
  };
}
```

**数据丰富度**: ⭐⭐⭐ (专注于痛点)

## 3. DNA 字段映射策略

### 3.1 keywords 字段提取

| DNA 子字段 | 数据源 | 提取策略 |
|-----------|--------|---------|
| `primary` | `keyword_clusters.core` | 直接提取所有核心关键词 |
| `secondary` | `keyword_clusters.attribute` | 直接提取所有属性关键词 |
| `longTail` | `keyword_clusters.long_tail` | 直接提取所有长尾关键词 |
| `scene` | `intent` | 提取使用场景关键词 |

**提取函数**:
```typescript
function extractKeywords(report: CompetitorAnalysisReport): ExtractedKeywords {
  return {
    primary: report.keyword_clusters?.core || [],
    secondary: report.keyword_clusters?.attribute || [],
    longTail: report.keyword_clusters?.long_tail || [],
    scene: report.intent || []
  };
}
```

### 3.2 audience 字段提取

| 数据源 | 提取策略 |
|--------|---------|
| `competitor_insights.user_profile` | 合并为逗号分隔的描述 |

**提取函数**:
```typescript
function extractAudience(report: CompetitorAnalysisReport): string {
  const userProfile = report.competitor_insights?.user_profile || [];
  return userProfile.join(', ');
}
```

### 3.3 usps 字段提取

| 数据源 | 提取策略 |
|--------|---------|
| `feature_points` | 每个特性一行，带 "- " 前缀 |

**提取函数**:
```typescript
function extractUSPs(report: CompetitorAnalysisReport): string {
  const featurePoints = report.feature_points || [];
  return featurePoints.map(f => `- ${f}`).join('\n');
}
```

### 3.4 specs 字段提取

| 数据源 | 提取策略 |
|--------|---------|
| `keyword_clusters.attribute` | 使用 isTechnicalSpec 过滤技术规格 |
| `high_frequency_phrases` (如果是对象) | 提取 attribute 数组中的技术规格 |

**提取函数**:
```typescript
function extractSpecs(report: CompetitorAnalysisReport | SemanticAnalysisReport): string {
  const specs: string[] = [];

  // 从 keyword_clusters.attribute 提取
  if ('keyword_clusters' in report && report.keyword_clusters?.attribute) {
    const techSpecs = report.keyword_clusters.attribute
      .filter(attr => isTechnicalSpec(attr));
    specs.push(...techSpecs.map(s => `- ${s}`));
  }

  // 从 high_frequency_phrases.attribute 提取（语义分析报告）
  if ('high_frequency_phrases' in report &&
      typeof report.high_frequency_phrases === 'object' &&
      'attribute' in report.high_frequency_phrases) {
    const techSpecs = report.high_frequency_phrases.attribute
      .filter(attr => isTechnicalSpec(attr));
    specs.push(...techSpecs.map(s => `- ${s}`));
  }

  return specs.join('\n');
}
```

### 3.5 painPoints 字段提取

| 数据源 | 提取策略 |
|--------|---------|
| `negative_drivers` | 直接提取 |
| `pain_point_gaps.top_quality_issues` | 直接提取 |
| `customer_complaints[].issue` | 提取 issue 字段 |
| `top_quality_issues` | 直接提取（差评报告） |

**提取函数**:
```typescript
function extractPainPoints(
  reports: Array<CompetitorAnalysisReport | SemanticAnalysisReport | NegativeAnalysisReport>
): string[] {
  const painPoints = new Set<string>();

  reports.forEach(report => {
    // 从竞品分析报告提取
    if ('negative_drivers' in report && report.negative_drivers) {
      report.negative_drivers.forEach(p => painPoints.add(p));
    }

    // 从语义分析报告提取
    if ('pain_point_gaps' in report && report.pain_point_gaps?.top_quality_issues) {
      report.pain_point_gaps.top_quality_issues.forEach(p => painPoints.add(p));
    }

    // 从差评报告提取
    if ('customer_complaints' in report && report.customer_complaints) {
      report.customer_complaints.forEach(c => painPoints.add(c.issue));
    }

    if ('top_quality_issues' in report && report.top_quality_issues) {
      report.top_quality_issues.forEach(p => painPoints.add(p));
    }
  });

  return Array.from(painPoints);
}
```

### 3.6 differentiationAngles 字段提取

| 数据源 | 提取策略 |
|--------|---------|
| `competitor_insights.differentiation_angles[0]` | 作为 primary |
| `competitor_insights.differentiation_angles[1..]` | 作为 secondary |
| `pain_point_gaps.differentiation_angles` | 合并到 secondary |

**提取函数**:
```typescript
function extractDifferentiationAngles(
  reports: Array<CompetitorAnalysisReport | SemanticAnalysisReport>
): { primary: string; secondary: string[] } {
  const allAngles: string[] = [];

  reports.forEach(report => {
    // 从竞品分析报告提取
    if ('competitor_insights' in report &&
        report.competitor_insights?.differentiation_angles) {
      allAngles.push(...report.competitor_insights.differentiation_angles);
    }

    // 从语义分析报告提取
    if ('pain_point_gaps' in report &&
        report.pain_point_gaps?.differentiation_angles) {
      allAngles.push(...report.pain_point_gaps.differentiation_angles);
    }
  });

  return {
    primary: allAngles[0] || '',
    secondary: allAngles.slice(1)
  };
}
```

## 4. 报告类型检测

### 4.1 检测策略

```typescript
type ReportType = 'competitor' | 'semantic' | 'copywriting' | 'negative' | 'unknown';

function detectReportType(report: any): ReportType {
  // 1. 检查 meta.templateId
  if (report.meta?.templateId) {
    return report.meta.templateId as ReportType;
  }

  // 2. 基于字段特征检测
  if (report.keyword_clusters && report.competitor_insights && report.feature_points) {
    return 'competitor';
  }

  if (report.high_frequency_phrases &&
      typeof report.high_frequency_phrases === 'object' &&
      report.pain_point_gaps) {
    return 'semantic';
  }

  if (report.seo_title && report.bullet_points && report.backend_search_terms) {
    return 'copywriting';
  }

  if (report.top_quality_issues && report.customer_complaints) {
    return 'negative';
  }

  return 'unknown';
}
```

### 4.2 多报告合并策略

用户可能上传多个报告文件，需要合并提取：

```typescript
function extractFromMultipleReports(reports: any[]): ExtractedDNA {
  // 1. 检测每个报告的类型
  const typedReports = reports.map(r => ({
    type: detectReportType(r),
    data: r
  }));

  // 2. 按类型分组
  const competitorReports = typedReports
    .filter(r => r.type === 'competitor')
    .map(r => r.data);

  const semanticReports = typedReports
    .filter(r => r.type === 'semantic')
    .map(r => r.data);

  const negativeReports = typedReports
    .filter(r => r.type === 'negative')
    .map(r => r.data);

  // 3. 优先使用竞品分析报告（数据最完整）
  const primaryReport = competitorReports[0];

  if (!primaryReport) {
    throw new Error('至少需要一个竞品分析报告');
  }

  // 4. 提取各字段
  const keywords = extractKeywords(primaryReport);
  const audience = extractAudience(primaryReport);
  const usps = extractUSPs(primaryReport);
  const specs = extractSpecs(primaryReport);

  // 5. 合并多个报告的痛点和差异化角度
  const painPoints = extractPainPoints([
    ...competitorReports,
    ...semanticReports,
    ...negativeReports
  ]);

  const differentiationAngles = extractDifferentiationAngles([
    ...competitorReports,
    ...semanticReports
  ]);

  return {
    audience,
    usps,
    specs,
    keywords,
    painPoints,
    differentiationAngles,
    confidence: calculateConfidence(primaryReport),
    metadata: {
      extractedAt: new Date().toISOString(),
      sourceReports: typedReports.map(r => r.type),
      reportCount: reports.length
    }
  };
}
```

## 5. 完整接口定义

### 5.1 ExtractedDNA 接口（更新）

```typescript
export interface ExtractedDNA {
  // 基础字段
  audience: string;
  usps: string;
  specs: string;

  // 新增字段
  keywords: {
    primary: string[];      // 核心关键词
    secondary: string[];    // 属性关键词
    longTail: string[];     // 长尾关键词
    scene: string[];        // 场景关键词
  };

  painPoints: string[];     // 痛点列表

  differentiationAngles: {
    primary: string;        // 核心差异化角度
    secondary: string[];    // 次要差异化角度
  };

  // 置信度
  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;
    painPoints: number;
    differentiationAngles: number;
  };

  // 元数据
  metadata: {
    extractedAt: string;
    sourceReports: ReportType[];
    reportCount: number;
  };
}
```

### 5.2 报告类型定义

```typescript
// 竞品分析报告
export interface CompetitorAnalysisReport {
  product_summary: string;
  feature_points: string[];
  intent: string[];
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
  meta: ReportMeta;
}

// 语义分析报告
export interface SemanticAnalysisReport {
  high_frequency_phrases: {
    attribute: string[];
    use_cases: string[];
  };
  pain_point_gaps: {
    top_quality_issues: string[];
    unmet_need: string[];
    differentiation_angles: string[];
  };
  native_voice: {
    native_phrasing: string[];
    emotional_hook: string[];
  };
  meta: ReportMeta & { templateId: 'semantic' };
}

// 营销文案报告
export interface CopywritingReport {
  seo_title: string;
  bullet_points: string[];
  product_description: string;
  backend_search_terms: string[];
  meta: ReportMeta & { templateId: 'copywriting' };
}

// 差评分析报告
export interface NegativeAnalysisReport {
  top_quality_issues: string[];
  customer_complaints: Array<{
    issue: string;
    frequency: 'High' | 'Medium' | 'Low';
  }>;
  improvement_suggestions: string[];
  meta: ReportMeta & { templateId: 'negative' };
}

// 报告元数据
interface ReportMeta {
  targetMarket: string;
  analyzedASINs: string[];
  generatedByModel: string;
  generatedAt: string;
  templateUsed?: string;
  templateId?: string;
  dataScope?: string[];
}

// 联合类型
export type AnalysisReport =
  | CompetitorAnalysisReport
  | SemanticAnalysisReport
  | CopywritingReport
  | NegativeAnalysisReport;
```

## 6. 主提取函数

```typescript
/**
 * 从实际报告中提取产品 DNA
 *
 * @param reports 一个或多个分析报告
 * @returns 提取的产品 DNA
 */
export function extractProductDNA(
  reports: AnalysisReport | AnalysisReport[]
): ExtractedDNA | null {
  try {
    // 1. 标准化为数组
    const reportArray = Array.isArray(reports) ? reports : [reports];

    if (reportArray.length === 0) {
      Logger.warn('[DNA提取器] 报告为空');
      return null;
    }

    // 2. 检测报告类型
    const typedReports = reportArray.map(r => ({
      type: detectReportType(r),
      data: r
    }));

    // 3. 验证至少有一个竞品分析报告
    const hasCompetitorReport = typedReports.some(r => r.type === 'competitor');
    if (!hasCompetitorReport) {
      Logger.warn('[DNA提取器] 缺少竞品分析报告，无法提取完整 DNA');
      return null;
    }

    // 4. 提取 DNA
    const dna = extractFromMultipleReports(reportArray);

    // 5. 验证置信度
    const avgConfidence = Object.values(dna.confidence).reduce((a, b) => a + b, 0) / 6;
    if (avgConfidence < 0.2) {
      Logger.warn('[DNA提取器] 提取置信度过低');
      return null;
    }

    Logger.debug('[DNA提取器] 提取完成:', {
      reportCount: reportArray.length,
      reportTypes: typedReports.map(r => r.type),
      confidence: dna.confidence
    });

    return dna;
  } catch (error) {
    Logger.error('[DNA提取器] 提取失败:', error);
    return null;
  }
}
```

## 7. 置信度计算

```typescript
function calculateConfidence(report: CompetitorAnalysisReport): ExtractedDNA['confidence'] {
  return {
    // audience: 基于 user_profile 的完整性
    audience: report.competitor_insights?.user_profile?.length > 0 ? 0.9 : 0,

    // usps: 基于 feature_points 的数量
    usps: Math.min(
      (report.feature_points?.length || 0) * 0.2,
      1.0
    ),

    // specs: 基于 attribute 关键词中技术规格的比例
    specs: report.keyword_clusters?.attribute
      ? Math.min(
          report.keyword_clusters.attribute.filter(isTechnicalSpec).length * 0.2,
          1.0
        )
      : 0,

    // keywords: 基于关键词簇的完整性
    keywords: (
      (report.keyword_clusters?.core?.length > 0 ? 0.4 : 0) +
      (report.keyword_clusters?.attribute?.length > 0 ? 0.3 : 0) +
      (report.keyword_clusters?.long_tail?.length > 0 ? 0.3 : 0)
    ),

    // painPoints: 基于 negative_drivers 的数量
    painPoints: Math.min(
      (report.negative_drivers?.length || 0) * 0.2,
      1.0
    ),

    // differentiationAngles: 基于差异化角度的数量
    differentiationAngles: Math.min(
      (report.competitor_insights?.differentiation_angles?.length || 0) * 0.25,
      1.0
    )
  };
}
```

## 8. 使用示例

### 8.1 单个报告提取

```typescript
import { extractProductDNA } from './dnaExtractor';

// 加载报告
const report = await loadReport('competitor_report_1766641167740.json');

// 提取 DNA
const dna = extractProductDNA(report);

if (dna) {
  console.log('关键词:', dna.keywords);
  console.log('受众:', dna.audience);
  console.log('卖点:', dna.usps);
  console.log('规格:', dna.specs);
  console.log('痛点:', dna.painPoints);
  console.log('差异化:', dna.differentiationAngles);
}
```

### 8.2 多个报告合并提取

```typescript
// 加载多个报告
const competitorReport = await loadReport('competitor_report_*.json');
const semanticReport = await loadReport('report_*.json');
const negativeReport = await loadReport('report_*.json');

// 合并提取
const dna = extractProductDNA([
  competitorReport,
  semanticReport,
  negativeReport
]);

// 痛点会从所有报告中合并
console.log('合并的痛点:', dna.painPoints);
```

## 9. 迁移计划

### 9.1 向后兼容

为了不破坏现有代码，提供兼容层：

```typescript
/**
 * 兼容旧的 FullAnalysisReport 格式
 * 如果检测到旧格式，返回 null 并记录警告
 */
export function extractProductDNACompat(
  report: FullAnalysisReport | AnalysisReport
): ExtractedDNA | null {
  // 检测是否为旧格式
  if ('buyer-profile' in report || 'selling-points' in report) {
    Logger.warn('[DNA提取器] 检测到旧的报告格式，请使用新的报告格式');
    return null;
  }

  // 使用新的提取逻辑
  return extractProductDNA(report as AnalysisReport);
}
```

### 9.2 迁移步骤

1. **Phase 1**: 更新类型定义
   - 创建新的报告接口
   - 保留旧接口用于兼容

2. **Phase 2**: 实现新的提取器
   - 实现基于实际报告的提取逻辑
   - 添加报告类型检测

3. **Phase 3**: 更新 UI
   - 修改文件上传逻辑
   - 支持多文件上传和合并

4. **Phase 4**: 测试和部署
   - 使用实际报告文件测试
   - 逐步替换旧代码

5. **Phase 5**: 清理
   - 移除旧的类型定义
   - 更新文档

## 10. 测试策略

### 10.1 单元测试

```typescript
describe('extractProductDNA (Real Reports)', () => {
  test('should extract from competitor report', () => {
    const report = loadTestReport('competitor_report_1766641167740.json');
    const dna = extractProductDNA(report);

    expect(dna).not.toBeNull();
    expect(dna.keywords.core.length).toBeGreaterThan(0);
    expect(dna.audience).toBeTruthy();
  });

  test('should merge multiple reports', () => {
    const reports = [
      loadTestReport('competitor_report.json'),
      loadTestReport('semantic_report.json'),
      loadTestReport('negative_report.json')
    ];

    const dna = extractProductDNA(reports);

    expect(dna.painPoints.length).toBeGreaterThan(5);
  });

  test('should detect report type correctly', () => {
    const competitorReport = loadTestReport('competitor_report.json');
    expect(detectReportType(competitorReport)).toBe('competitor');

    const semanticReport = loadTestReport('semantic_report.json');
    expect(detectReportType(semanticReport)).toBe('semantic');
  });
});
```

### 10.2 集成测试

```typescript
describe('DNA Extraction Integration', () => {
  test('should work with real report files', async () => {
    const files = [
      'D:/Users/Administrator/Downloads/competitor_report_1766641167740.json',
      'D:/Users/Administrator/Downloads/report_1767153992996.json'
    ];

    const reports = await Promise.all(files.map(loadReport));
    const dna = extractProductDNA(reports);

    expect(dna).not.toBeNull();
    expect(dna.metadata.reportCount).toBe(2);
  });
});
```

## 11. 总结

### 11.1 核心改进

1. **基于实际数据**: 完全基于 Downloads 目录中的真实报告格式设计
2. **多报告支持**: 支持合并多个报告的数据
3. **类型检测**: 自动检测报告类型并使用相应的提取策略
4. **零硬编码**: 不预设任何产品属性，完全数据驱动
5. **向后兼容**: 提供兼容层，不破坏现有代码

### 11.2 关键优势

- ✅ 解决"关键词都没有加载进来"的问题
- ✅ 支持 4 种实际报告类型
- ✅ 数据完整性高（竞品分析报告包含所有需要的字段）
- ✅ 可扩展（易于添加新的报告类型）
- ✅ 易于测试（使用实际报告文件）

### 11.3 实施优先级

1. **高优先级**: 竞品分析报告提取器（数据最完整）
2. **中优先级**: 多报告合并逻辑
3. **低优先级**: 其他报告类型的支持

该架构确保了系统能够正确处理实际的报告格式，彻底解决了数据不匹配的问题。
