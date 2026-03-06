# DNA 提取完整架构设计

## 1. 设计目标

设计一个完整的产品 DNA 提取系统，实现以下目标：

- **零硬编码**：不预设任何产品属性名称
- **品类无关**：适用于所有产品类型
- **全量提取**：不遗漏任何有价值的数据
- **数据驱动**：基于实际报告结构设计

## 2. 扩展的 DNA 数据结构

### 2.1 新增字段

在现有的 `ExtractedDNA` 接口基础上，新增以下字段：

```typescript
export interface ExtractedDNA {
  // 现有字段
  audience: string;      // 目标受众描述
  usps: string;          // 核心卖点（多行）
  specs: string;         // 技术参数（多行）

  // 新增字段
  keywords: {
    primary: string[];        // 核心关键词
    secondary: string[];      // 次要关键词
    scene: string[];          // 场景关键词
    audience: string[];       // 受众关键词
  };

  painPoints: string[];       // 痛点列表

  differentiationAngles: {
    primary: string;          // 核心差异化角度
    secondary: string[];      // 次要差异化角度
  };

  // 扩展的置信度
  confidence: {
    audience: number;
    usps: number;
    specs: number;
    keywords: number;         // 新增
    painPoints: number;       // 新增
    differentiationAngles: number;  // 新增
  };

  // 扩展的元数据
  metadata: {
    extractedAt: string;
    sourceFields: string[];
    unknownTypes?: string[];
    stats?: {
      totalKeywords: number;
      technicalSpecs: number;
      painPoints: number;
      differentiationAngles: number;
    };
  };
}
```

## 3. 关键词全量提取方案

### 3.1 数据源映射

| 字段类型 | 数据源 | 提取策略 |
|---------|--------|---------|
| primary | `title-keywords.primary_keywords` | 提取所有 weight='high' 的关键词 |
| secondary | `title-keywords.secondary_keywords` | 提取所有 keyword 字段 |
| scene | `title-keywords.scene_keywords` | 提取所有 keyword 字段 |
| audience | `title-keywords.audience_keywords` | 提取所有 keyword 字段 |

### 3.2 提取函数设计

```typescript
/**
 * 从 title-keywords 报告提取完整关键词
 *
 * 提取策略：
 * - 核心关键词：weight='high' 的 primary_keywords
 * - 次要关键词：所有 secondary_keywords
 * - 场景关键词：所有 scene_keywords
 * - 受众关键词：所有 audience_keywords
 *
 * 置信度计算：
 * - 有核心关键词：+0.4
 * - 有次要关键词：+0.3
 * - 有场景关键词：+0.2
 * - 有受众关键词：+0.1
 */
function extractKeywords(report: TitleKeywordsReport): {
  keywords: ExtractedDNA['keywords'];
  confidence: number;
} {
  const keywords: ExtractedDNA['keywords'] = {
    primary: [],
    secondary: [],
    scene: [],
    audience: []
  };

  let confidence = 0;

  // 1. 提取核心关键词（high weight）
  if (report.primary_keywords) {
    keywords.primary = report.primary_keywords
      .filter(k => k.weight === 'high')
      .map(k => k.keyword);

    if (keywords.primary.length > 0) {
      confidence += 0.4;
    }
  }

  // 2. 提取次要关键词（全量）
  if (report.secondary_keywords) {
    keywords.secondary = report.secondary_keywords
      .map(k => k.keyword);

    if (keywords.secondary.length > 0) {
      confidence += 0.3;
    }
  }

  // 3. 提取场景关键词（全量）
  if (report.scene_keywords) {
    keywords.scene = report.scene_keywords
      .map(k => k.keyword);

    if (keywords.scene.length > 0) {
      confidence += 0.2;
    }
  }

  // 4. 提取受众关键词（全量）
  if (report.audience_keywords) {
    keywords.audience = report.audience_keywords
      .map(k => k.keyword);

    if (keywords.audience.length > 0) {
      confidence += 0.1;
    }
  }

  return {
    keywords,
    confidence: Math.min(confidence, 1.0)
  };
}
```

### 3.3 输出示例

```typescript
// 输入：title-keywords 报告
// 输出：
{
  keywords: {
    primary: ["Perfume Men", "Cologne for Men"],
    secondary: ["Long Lasting", "50ml/1.7oz", "Aromatic Woody", "Mint", "Lemon"],
    scene: ["Nightclub Essential", "Daily Elegance", "Ideal Occasions"],
    audience: ["Men", "Gent's"]
  },
  confidence: 1.0
}
```

## 4. 痛点全量提取方案

### 4.1 数据源映射

| 数据源 | 字段路径 | 提取策略 |
|--------|---------|---------|
| selling-points | `function_scene_matrix.pain_points` | 提取所有痛点 |
| selling-points | `bullet_analysis[].pain_points_addressed` | 提取所有 bullet 的痛点 |
| fatal-flaws | `critical_issues[].issue` | 提取严重问题作为痛点 |
| hesitation-points | `common_doubts` | 提取常见疑虑作为痛点 |

### 4.2 提取函数设计

```typescript
/**
 * 从多个报告提取完整痛点列表
 *
 * 提取策略：
 * 1. 从 selling-points 提取功能场景矩阵中的痛点
 * 2. 从 selling-points 提取 bullet 分析中的痛点
 * 3. 从 fatal-flaws 提取严重问题
 * 4. 从 hesitation-points 提取常见疑虑
 *
 * 去重策略：
 * - 使用 Set 去除完全重复的痛点
 * - 保持原始顺序（按数据源优先级）
 *
 * 置信度计算：
 * - 有功能场景矩阵痛点：+0.3
 * - 有 bullet 痛点：+0.3
 * - 有严重问题：+0.2
 * - 有常见疑虑：+0.2
 */
function extractPainPoints(
  sellingPoints: SellingPointsReport | undefined,
  fatalFlaws: FatalFlawsReport | undefined,
  hesitationPoints: HesitationPointsReport | undefined
): {
  painPoints: string[];
  confidence: number;
} {
  const painPointsSet = new Set<string>();
  let confidence = 0;

  // 1. 从 function_scene_matrix 提取痛点
  if (sellingPoints?.function_scene_matrix?.pain_points) {
    sellingPoints.function_scene_matrix.pain_points.forEach(p => {
      painPointsSet.add(p);
    });
    confidence += 0.3;
  }

  // 2. 从 bullet_analysis 提取痛点
  if (sellingPoints?.bullet_analysis) {
    sellingPoints.bullet_analysis.forEach(bullet => {
      if (bullet.pain_points_addressed) {
        bullet.pain_points_addressed.forEach(p => {
          painPointsSet.add(p);
        });
      }
    });
    if (painPointsSet.size > 0) {
      confidence += 0.3;
    }
  }

  // 3. 从 fatal-flaws 提取严重问题
  if (fatalFlaws?.critical_issues) {
    fatalFlaws.critical_issues
      .filter(issue => issue.severity === 'critical' || issue.severity === 'major')
      .forEach(issue => {
        painPointsSet.add(issue.issue);
      });

    if (fatalFlaws.critical_issues.length > 0) {
      confidence += 0.2;
    }
  }

  // 4. 从 hesitation-points 提取常见疑虑
  if (hesitationPoints?.common_doubts) {
    hesitationPoints.common_doubts.forEach(doubt => {
      painPointsSet.add(doubt);
    });

    if (hesitationPoints.common_doubts.length > 0) {
      confidence += 0.2;
    }
  }

  return {
    painPoints: Array.from(painPointsSet),
    confidence: Math.min(confidence, 1.0)
  };
}
```

### 4.3 输出示例

```typescript
// 输入：selling-points, fatal-flaws, hesitation-points 报告
// 输出：
{
  painPoints: [
    "香味不持久",
    "不便携带",
    "送礼选择难",
    "皮肤刺激",
    "包装不档次",
    "产品真实性遭严重质疑",
    "留香时间与宣传严重不符",
    "性价比质疑 - 价格与容量不匹配",
    "香味是否真的好闻？",
    "是否是正品？",
    "50ml够用多久？",
    "留香时间真的有6小时吗？"
  ],
  confidence: 1.0
}
```

## 5. 差异化角度全量提取方案

### 5.1 数据源映射

| 数据源 | 字段路径 | 提取策略 |
|--------|---------|---------|
| selling-points | `overall_strategy.primary_differentiation` | 核心差异化 |
| selling-points | `bullet_analysis[].differentiation_angle` | 次要差异化角度 |
| wow-moments | `copywriting_angles` | 营销角度作为差异化 |

### 5.2 提取函数设计

```typescript
/**
 * 从多个报告提取差异化角度
 *
 * 提取策略：
 * 1. 从 overall_strategy 提取核心差异化
 * 2. 从 bullet_analysis 提取各 bullet 的差异化角度
 * 3. 从 wow-moments 提取营销角度
 *
 * 去重策略：
 * - 核心差异化：单一值
 * - 次要差异化：使用 Set 去重
 *
 * 置信度计算：
 * - 有核心差异化：+0.5
 * - 有 bullet 差异化角度：+0.3
 * - 有营销角度：+0.2
 */
function extractDifferentiationAngles(
  sellingPoints: SellingPointsReport | undefined,
  wowMoments: WowMomentsReport | undefined
): {
  differentiationAngles: ExtractedDNA['differentiationAngles'];
  confidence: number;
} {
  const secondaryAngles = new Set<string>();
  let confidence = 0;
  let primaryAngle = '';

  // 1. 提取核心差异化
  if (sellingPoints?.overall_strategy?.primary_differentiation) {
    primaryAngle = sellingPoints.overall_strategy.primary_differentiation;
    confidence += 0.5;
  }

  // 2. 从 bullet_analysis 提取差异化角度
  if (sellingPoints?.bullet_analysis) {
    sellingPoints.bullet_analysis.forEach(bullet => {
      if (bullet.differentiation_angle) {
        secondaryAngles.add(bullet.differentiation_angle);
      }
    });

    if (secondaryAngles.size > 0) {
      confidence += 0.3;
    }
  }

  // 3. 从 wow-moments 提取营销角度
  if (wowMoments?.copywriting_angles) {
    wowMoments.copywriting_angles.forEach(angle => {
      secondaryAngles.add(angle);
    });

    if (wowMoments.copywriting_angles.length > 0) {
      confidence += 0.2;
    }
  }

  return {
    differentiationAngles: {
      primary: primaryAngle,
      secondary: Array.from(secondaryAngles)
    },
    confidence: Math.min(confidence, 1.0)
  };
}
```

### 5.3 输出示例

```typescript
// 输入：selling-points, wow-moments 报告
// 输出：
{
  differentiationAngles: {
    primary: "夜店/Club场景定位 + 6小时持久留香承诺",
    secondary: [
      "便携性强调",
      "持久时间承诺 + 情感价值(自信)",
      "礼品定位，视觉吸引力",
      "安全性承诺",
      "信任建立",
      "多国用户验证的好闻香味",
      "一开瓶就知道选对了",
      "Great Smell - 来自真实买家的评价",
      "跨越语言的香味认可"
    ]
  },
  confidence: 1.0
}
```

## 6. 完整提取流程

### 6.1 主提取函数

```typescript
/**
 * 从完整分析报告中提取产品 DNA（完整版）
 *
 * @param report 完整的 AI 分析报告
 * @param mappingService 类型映射服务（可选）
 * @returns 提取的产品 DNA，如果提取失败返回 null
 */
export function extractProductDNA(
  report: FullAnalysisReport | null | undefined,
  mappingService?: TypeMappingService
): ExtractedDNA | null {
  if (!report) {
    Logger.warn('[DNA提取器] 报告为空，无法提取');
    return null;
  }

  Logger.debug('[DNA提取器] 开始提取产品 DNA');

  try {
    // 1. 提取现有字段
    const audienceResult = report['buyer-profile']
      ? extractAudience(report['buyer-profile'])
      : { text: '', confidence: 0 };

    const uspsResult = report['selling-points']
      ? extractUSPs(report['selling-points'])
      : { text: '', confidence: 0 };

    const specsResult = extractSpecs(
      report['title-keywords'],
      report['selling-points'],
      mappingService
    );

    // 2. 提取新增字段
    const keywordsResult = report['title-keywords']
      ? extractKeywords(report['title-keywords'])
      : { keywords: { primary: [], secondary: [], scene: [], audience: [] }, confidence: 0 };

    const painPointsResult = extractPainPoints(
      report['selling-points'],
      report['fatal-flaws'],
      report['hesitation-points']
    );

    const differentiationResult = extractDifferentiationAngles(
      report['selling-points'],
      report['wow-moments']
    );

    // 3. 计算总体置信度
    const avgConfidence = (
      audienceResult.confidence +
      uspsResult.confidence +
      specsResult.confidence +
      keywordsResult.confidence +
      painPointsResult.confidence +
      differentiationResult.confidence
    ) / 6;

    // 4. 如果总体置信度太低，返回 null
    if (avgConfidence < 0.2) {
      Logger.warn('[DNA提取器] 提取置信度过低，放弃提取');
      return null;
    }

    // 5. 构建完整 DNA 对象
    const dna: ExtractedDNA = {
      audience: audienceResult.text,
      usps: uspsResult.text,
      specs: specsResult.text,
      keywords: keywordsResult.keywords,
      painPoints: painPointsResult.painPoints,
      differentiationAngles: differentiationResult.differentiationAngles,
      confidence: {
        audience: audienceResult.confidence,
        usps: uspsResult.confidence,
        specs: specsResult.confidence,
        keywords: keywordsResult.confidence,
        painPoints: painPointsResult.confidence,
        differentiationAngles: differentiationResult.confidence
      },
      metadata: {
        extractedAt: new Date().toISOString(),
        sourceFields: [
          report['buyer-profile'] ? 'buyer-profile' : '',
          report['selling-points'] ? 'selling-points' : '',
          report['title-keywords'] ? 'title-keywords' : '',
          report['fatal-flaws'] ? 'fatal-flaws' : '',
          report['hesitation-points'] ? 'hesitation-points' : '',
          report['wow-moments'] ? 'wow-moments' : ''
        ].filter(Boolean),
        unknownTypes: mappingService?.getUnknownTypes(),
        stats: {
          totalKeywords:
            keywordsResult.keywords.primary.length +
            keywordsResult.keywords.secondary.length +
            keywordsResult.keywords.scene.length +
            keywordsResult.keywords.audience.length,
          technicalSpecs: specsResult.text.split('\n').length,
          painPoints: painPointsResult.painPoints.length,
          differentiationAngles:
            1 + differentiationResult.differentiationAngles.secondary.length
        }
      }
    };

    Logger.debug('[DNA提取器] 提取完成:', {
      audienceLength: dna.audience.length,
      uspsLength: dna.usps.length,
      specsLength: dna.specs.length,
      totalKeywords: dna.metadata.stats?.totalKeywords,
      painPoints: dna.painPoints.length,
      differentiationAngles: dna.metadata.stats?.differentiationAngles,
      confidence: dna.confidence
    });

    return dna;
  } catch (error) {
    Logger.error('[DNA提取器] 提取过程出错:', error);
    return null;
  }
}
```

## 7. 置信度计算逻辑

### 7.1 各字段置信度权重

| 字段 | 基础分 | 数量加分 | 来源加分 | 最大值 |
|------|--------|---------|---------|--------|
| audience | 0.3 (有年龄/性别) | 0.2 (生活方式) | 0.3 (买家类型) + 0.2 (动机) | 1.0 |
| usps | 0.4 (功能卖点) | - | 0.3 (差异化) + 0.3 (bullet) | 1.0 |
| specs | 0.3 (有数据) | 0.2 (≥3个) + 0.2 (≥5个) | 0.15 (keywords) + 0.15 (bullet) | 1.0 |
| keywords | 0.4 (核心) | - | 0.3 (次要) + 0.2 (场景) + 0.1 (受众) | 1.0 |
| painPoints | 0.3 (矩阵) | - | 0.3 (bullet) + 0.2 (严重问题) + 0.2 (疑虑) | 1.0 |
| differentiationAngles | 0.5 (核心) | - | 0.3 (bullet) + 0.2 (营销角度) | 1.0 |

### 7.2 总体置信度计算

```typescript
// 简单平均
const avgConfidence = (
  audienceConfidence +
  uspsConfidence +
  specsConfidence +
  keywordsConfidence +
  painPointsConfidence +
  differentiationConfidence
) / 6;

// 阈值：低于 0.2 拒绝提取
if (avgConfidence < 0.2) {
  return null;
}
```

## 8. 使用示例

### 8.1 基本使用

```typescript
import { extractProductDNA } from './dnaExtractor';

// 提取完整 DNA
const dna = extractProductDNA(report);

if (dna) {
  console.log('目标受众:', dna.audience);
  console.log('核心卖点:', dna.usps);
  console.log('技术参数:', dna.specs);
  console.log('关键词:', dna.keywords);
  console.log('痛点:', dna.painPoints);
  console.log('差异化角度:', dna.differentiationAngles);
  console.log('置信度:', dna.confidence);
}
```

### 8.2 使用类型映射服务

```typescript
import { TypeMappingService } from './TypeMappingService';
import { DEFAULT_TYPE_MAPPING_CONFIG } from './config/defaultTypeMapping';

// 创建映射服务
const mappingService = new TypeMappingService(DEFAULT_TYPE_MAPPING_CONFIG);

// 添加自定义映射
mappingService.registerBatch({
  'hair_density': '密度',
  'curl_pattern': '卷度',
  'lace_type': '网类型'
});

// 提取 DNA
const dna = extractProductDNA(report, mappingService);

// 查看未知类型
console.log('未知类型:', mappingService.getUnknownTypes());
```

## 9. 架构优势

### 9.1 完整性

- **全量提取**：不遗漏任何有价值的数据
- **多数据源**：从 8 个报告类型中提取数据
- **结构化输出**：清晰的数据结构，易于使用

### 9.2 可靠性

- **置信度跟踪**：每个字段都有独立的置信度分数
- **错误处理**：优雅降级，不会因单个字段失败而崩溃
- **数据验证**：总体置信度低于阈值时拒绝提取

### 9.3 可扩展性

- **零硬编码**：不预设产品属性
- **品类无关**：适用于所有产品类型
- **可配置**：支持自定义类型映射

### 9.4 可观测性

- **详细元数据**：记录提取时间、数据源、统计信息
- **未知类型跟踪**：帮助用户扩展映射
- **日志记录**：完整的提取过程日志

## 10. 实施建议

### 10.1 实施顺序

1. **Phase 1**: 更新 `ExtractedDNA` 接口定义
2. **Phase 2**: 实现 `extractKeywords` 函数
3. **Phase 3**: 实现 `extractPainPoints` 函数
4. **Phase 4**: 实现 `extractDifferentiationAngles` 函数
5. **Phase 5**: 更新 `extractProductDNA` 主函数
6. **Phase 6**: 更新 UI 以显示新字段
7. **Phase 7**: 编写单元测试

### 10.2 测试策略

```typescript
// 测试用例 1: 完整报告提取
test('should extract all fields from complete report', () => {
  const dna = extractProductDNA(SAMPLE_ANALYSIS_REPORT);
  expect(dna).not.toBeNull();
  expect(dna.keywords.primary.length).toBeGreaterThan(0);
  expect(dna.painPoints.length).toBeGreaterThan(0);
  expect(dna.differentiationAngles.primary).toBeTruthy();
});

// 测试用例 2: 部分报告提取
test('should handle partial report gracefully', () => {
  const partialReport = {
    'title-keywords': SAMPLE_ANALYSIS_REPORT['title-keywords']
  };
  const dna = extractProductDNA(partialReport);
  expect(dna.keywords.primary.length).toBeGreaterThan(0);
  expect(dna.painPoints.length).toBe(0);
});

// 测试用例 3: 置信度计算
test('should calculate confidence correctly', () => {
  const dna = extractProductDNA(SAMPLE_ANALYSIS_REPORT);
  expect(dna.confidence.keywords).toBeGreaterThan(0.8);
  expect(dna.confidence.painPoints).toBeGreaterThan(0.5);
});
```

### 10.3 性能优化

- **懒加载**：仅在需要时提取特定字段
- **缓存**：缓存提取结果，避免重复计算
- **并行处理**：独立字段可并行提取

## 11. 总结

本架构设计实现了完整的产品 DNA 提取系统，具有以下特点：

1. **完整性**：提取所有有价值的数据（受众、卖点、规格、关键词、痛点、差异化）
2. **零硬编码**：不预设任何产品属性，完全数据驱动
3. **品类无关**：适用于假发、电子产品、化妆品等所有品类
4. **高可靠性**：置信度跟踪、错误处理、数据验证
5. **可扩展性**：支持自定义类型映射、新增字段
6. **可观测性**：详细的元数据、统计信息、日志记录

该架构为后续的实现提供了清晰的指导，确保系统的质量和可维护性。
