# 关键词全量提取方案

## 1. 设计目标

设计一个完整的关键词提取系统，实现以下目标：

- **全量提取**：提取所有类型的关键词（核心词、长尾词、场景词、受众词）
- **结构化输出**：按类型分类，便于后续使用
- **零遗漏**：不丢失任何有价值的关键词数据
- **高置信度**：提供可靠的置信度评估

## 2. 数据源分析

### 2.1 title-keywords 报告结构

```typescript
export interface TitleKeywordsReport {
  // 核心关键词（主要搜索词）
  primary_keywords: {
    keyword: string;
    weight: 'high' | 'medium' | 'low';
    search_volume_estimate: string;
  }[];

  // 次要关键词（功能、规格、属性）
  secondary_keywords: {
    keyword: string;
    type: string;  // 如 "feature", "size", "scent"
    importance: string;
  }[];

  // 场景关键词（使用场景）
  scene_keywords: {
    keyword: string;
    usage_context: string;
  }[];

  // 受众关键词（目标人群）
  audience_keywords: {
    keyword: string;
    target_group: string;
  }[];

  // 其他字段（不用于关键词提取）
  removed_modifiers: string[];
  removed_brand_terms: string[];
  optimization_suggestions: string[];
}
```

### 2.2 数据特征

| 字段类型 | 数量范围 | 重要性 | 用途 |
|---------|---------|--------|------|
| primary_keywords | 2-5 个 | 极高 | SEO 核心词，标题优化 |
| secondary_keywords | 5-15 个 | 高 | 长尾词，功能描述 |
| scene_keywords | 3-8 个 | 中 | 场景营销，使用场景 |
| audience_keywords | 2-5 个 | 中 | 受众定位，广告投放 |

## 3. 提取策略

### 3.1 核心关键词提取

**目标**：提取最重要的搜索词，用于标题和广告

**数据源**：`primary_keywords`

**提取规则**：
1. 优先提取 `weight='high'` 的关键词
2. 如果 high 权重关键词少于 2 个，补充 `weight='medium'` 的关键词
3. 保持原始顺序（AI 已按重要性排序）

**伪代码**：
```typescript
function extractPrimaryKeywords(
  primaryKeywords: TitleKeywordsReport['primary_keywords']
): string[] {
  // 1. 提取 high 权重关键词
  const highWeightKeywords = primaryKeywords
    .filter(k => k.weight === 'high')
    .map(k => k.keyword);

  // 2. 如果不足 2 个，补充 medium 权重
  if (highWeightKeywords.length < 2) {
    const mediumWeightKeywords = primaryKeywords
      .filter(k => k.weight === 'medium')
      .map(k => k.keyword)
      .slice(0, 2 - highWeightKeywords.length);

    return [...highWeightKeywords, ...mediumWeightKeywords];
  }

  return highWeightKeywords;
}
```

**输出示例**：
```typescript
// 输入：
[
  { keyword: "Perfume Men", weight: "high", search_volume_estimate: "极高" },
  { keyword: "Cologne for Men", weight: "high", search_volume_estimate: "极高" },
  { keyword: "Fragrance", weight: "medium", search_volume_estimate: "高" }
]

// 输出：
["Perfume Men", "Cologne for Men"]
```

### 3.2 次要关键词提取

**目标**：提取所有功能、规格、属性关键词

**数据源**：`secondary_keywords`

**提取规则**：
1. 提取所有 `keyword` 字段（全量提取）
2. 保留 `type` 信息用于分类（可选）
3. 不过滤任何关键词

**伪代码**：
```typescript
function extractSecondaryKeywords(
  secondaryKeywords: TitleKeywordsReport['secondary_keywords']
): string[] {
  // 全量提取，不过滤
  return secondaryKeywords.map(k => k.keyword);
}

// 可选：按 type 分组
function extractSecondaryKeywordsByType(
  secondaryKeywords: TitleKeywordsReport['secondary_keywords']
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  secondaryKeywords.forEach(k => {
    const type = k.type || 'other';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(k.keyword);
  });

  return grouped;
}
```

**输出示例**：
```typescript
// 输入：
[
  { keyword: "Long Lasting", type: "feature", importance: "核心卖点词" },
  { keyword: "50ml/1.7oz", type: "size", importance: "规格词" },
  { keyword: "Aromatic Woody", type: "scent", importance: "香调描述" },
  { keyword: "Mint", type: "scent", importance: "香调元素" },
  { keyword: "Lemon", type: "scent", importance: "香调元素" }
]

// 输出（简单列表）：
["Long Lasting", "50ml/1.7oz", "Aromatic Woody", "Mint", "Lemon"]

// 输出（按 type 分组）：
{
  "feature": ["Long Lasting"],
  "size": ["50ml/1.7oz"],
  "scent": ["Aromatic Woody", "Mint", "Lemon"]
}
```

### 3.3 场景关键词提取

**目标**：提取所有使用场景关键词

**数据源**：`scene_keywords`

**提取规则**：
1. 提取所有 `keyword` 字段
2. 可选：保留 `usage_context` 用于场景描述

**伪代码**：
```typescript
function extractSceneKeywords(
  sceneKeywords: TitleKeywordsReport['scene_keywords']
): string[] {
  return sceneKeywords.map(k => k.keyword);
}

// 可选：带上下文
function extractSceneKeywordsWithContext(
  sceneKeywords: TitleKeywordsReport['scene_keywords']
): Array<{ keyword: string; context: string }> {
  return sceneKeywords.map(k => ({
    keyword: k.keyword,
    context: k.usage_context
  }));
}
```

**输出示例**：
```typescript
// 输入：
[
  { keyword: "Nightclub Essential", usage_context: "夜店场景，差异化定位" },
  { keyword: "Daily Elegance", usage_context: "日常通勤，扩大使用场景" },
  { keyword: "Ideal Occasions", usage_context: "泛场景覆盖" }
]

// 输出（简单列表）：
["Nightclub Essential", "Daily Elegance", "Ideal Occasions"]

// 输出（带上下文）：
[
  { keyword: "Nightclub Essential", context: "夜店场景，差异化定位" },
  { keyword: "Daily Elegance", context: "日常通勤，扩大使用场景" },
  { keyword: "Ideal Occasions", context: "泛场景覆盖" }
]
```

### 3.4 受众关键词提取

**目标**：提取所有目标受众关键词

**数据源**：`audience_keywords`

**提取规则**：
1. 提取所有 `keyword` 字段
2. 可选：保留 `target_group` 用于受众描述

**伪代码**：
```typescript
function extractAudienceKeywords(
  audienceKeywords: TitleKeywordsReport['audience_keywords']
): string[] {
  return audienceKeywords.map(k => k.keyword);
}

// 可选：带目标人群
function extractAudienceKeywordsWithTarget(
  audienceKeywords: TitleKeywordsReport['audience_keywords']
): Array<{ keyword: string; target: string }> {
  return audienceKeywords.map(k => ({
    keyword: k.keyword,
    target: k.target_group
  }));
}
```

**输出示例**：
```typescript
// 输入：
[
  { keyword: "Men", target_group: "男性主体用户" },
  { keyword: "Gent's", target_group: "绅士定位，暗示品味" }
]

// 输出（简单列表）：
["Men", "Gent's"]

// 输出（带目标人群）：
[
  { keyword: "Men", target: "男性主体用户" },
  { keyword: "Gent's", target: "绅士定位，暗示品味" }
]
```

## 4. 完整提取函数

### 4.1 主提取函数

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
 *
 * @param report title-keywords 报告
 * @returns 提取的关键词和置信度
 */
export function extractKeywords(
  report: TitleKeywordsReport | undefined
): {
  keywords: {
    primary: string[];
    secondary: string[];
    scene: string[];
    audience: string[];
  };
  confidence: number;
} {
  // 默认返回值
  const defaultResult = {
    keywords: {
      primary: [],
      secondary: [],
      scene: [],
      audience: []
    },
    confidence: 0
  };

  if (!report) {
    return defaultResult;
  }

  const keywords = {
    primary: [] as string[],
    secondary: [] as string[],
    scene: [] as string[],
    audience: [] as string[]
  };

  let confidence = 0;

  try {
    // 1. 提取核心关键词（high weight）
    if (report.primary_keywords && report.primary_keywords.length > 0) {
      keywords.primary = report.primary_keywords
        .filter(k => k.weight === 'high')
        .map(k => k.keyword);

      // 如果 high 权重不足 2 个，补充 medium 权重
      if (keywords.primary.length < 2) {
        const mediumKeywords = report.primary_keywords
          .filter(k => k.weight === 'medium')
          .map(k => k.keyword)
          .slice(0, 2 - keywords.primary.length);

        keywords.primary.push(...mediumKeywords);
      }

      if (keywords.primary.length > 0) {
        confidence += 0.4;
      }
    }

    // 2. 提取次要关键词（全量）
    if (report.secondary_keywords && report.secondary_keywords.length > 0) {
      keywords.secondary = report.secondary_keywords.map(k => k.keyword);
      confidence += 0.3;
    }

    // 3. 提取场景关键词（全量）
    if (report.scene_keywords && report.scene_keywords.length > 0) {
      keywords.scene = report.scene_keywords.map(k => k.keyword);
      confidence += 0.2;
    }

    // 4. 提取受众关键词（全量）
    if (report.audience_keywords && report.audience_keywords.length > 0) {
      keywords.audience = report.audience_keywords.map(k => k.keyword);
      confidence += 0.1;
    }

    return {
      keywords,
      confidence: Math.min(confidence, 1.0)
    };
  } catch (error) {
    Logger.error('[关键词提取器] 提取失败:', error);
    return defaultResult;
  }
}
```

### 4.2 辅助函数：按类型分组次要关键词

```typescript
/**
 * 按 type 分组次要关键词
 *
 * 用途：
 * - 技术规格提取时需要按类型分组
 * - UI 展示时可以按类型分类显示
 *
 * @param secondaryKeywords 次要关键词数组
 * @returns 按 type 分组的关键词
 */
export function groupSecondaryKeywordsByType(
  secondaryKeywords: TitleKeywordsReport['secondary_keywords']
): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};

  secondaryKeywords.forEach(k => {
    const type = k.type || 'other';
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(k.keyword);
  });

  return grouped;
}
```

### 4.3 辅助函数：获取高频短语

```typescript
/**
 * 从关键词中提取高频短语
 *
 * 策略：
 * - 提取包含 2-3 个单词的短语
 * - 过滤单个单词
 * - 用于长尾关键词优化
 *
 * @param keywords 关键词数组
 * @returns 高频短语列表
 */
export function extractHighFrequencyPhrases(
  keywords: string[]
): string[] {
  return keywords.filter(k => {
    const wordCount = k.trim().split(/\s+/).length;
    return wordCount >= 2 && wordCount <= 3;
  });
}
```

### 4.4 辅助函数：获取本地化表达

```typescript
/**
 * 识别本地化表达
 *
 * 策略：
 * - 识别非英文关键词
 * - 识别地区特定表达（如 "Gent's" 英式表达）
 * - 用于多语言市场优化
 *
 * @param keywords 关键词数组
 * @returns 本地化表达列表
 */
export function extractLocalizedExpressions(
  keywords: string[]
): string[] {
  return keywords.filter(k => {
    // 包含非 ASCII 字符（如中文、日文、德文等）
    const hasNonAscii = /[^\x00-\x7F]/.test(k);

    // 包含地区特定表达（可扩展）
    const regionalExpressions = ["Gent's", "Cologne", "Parfum"];
    const hasRegionalExpression = regionalExpressions.some(expr =>
      k.includes(expr)
    );

    return hasNonAscii || hasRegionalExpression;
  });
}
```

## 5. 置信度计算

### 5.1 置信度权重分配

| 关键词类型 | 权重 | 理由 |
|-----------|------|------|
| primary | 0.4 | 核心搜索词，对 SEO 最重要 |
| secondary | 0.3 | 长尾词，覆盖更多搜索场景 |
| scene | 0.2 | 场景词，帮助精准定位 |
| audience | 0.1 | 受众词，辅助广告投放 |

### 5.2 置信度计算逻辑

```typescript
// 基础置信度：有数据就给分
if (keywords.primary.length > 0) confidence += 0.4;
if (keywords.secondary.length > 0) confidence += 0.3;
if (keywords.scene.length > 0) confidence += 0.2;
if (keywords.audience.length > 0) confidence += 0.1;

// 最大值限制
confidence = Math.min(confidence, 1.0);
```

### 5.3 置信度等级

| 置信度范围 | 等级 | 说明 |
|-----------|------|------|
| 0.9 - 1.0 | 极高 | 所有类型关键词都已提取 |
| 0.7 - 0.8 | 高 | 核心和次要关键词已提取 |
| 0.4 - 0.6 | 中 | 仅核心关键词已提取 |
| 0.1 - 0.3 | 低 | 数据不完整 |
| 0.0 | 无 | 无可用数据 |

## 6. 输出格式

### 6.1 标准输出

```typescript
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

### 6.2 扩展输出（带元数据）

```typescript
{
  keywords: {
    primary: ["Perfume Men", "Cologne for Men"],
    secondary: ["Long Lasting", "50ml/1.7oz", "Aromatic Woody", "Mint", "Lemon"],
    scene: ["Nightclub Essential", "Daily Elegance", "Ideal Occasions"],
    audience: ["Men", "Gent's"]
  },
  confidence: 1.0,
  metadata: {
    totalCount: 11,
    primaryCount: 2,
    secondaryCount: 5,
    sceneCount: 3,
    audienceCount: 2,
    highFrequencyPhrases: ["Long Lasting", "Aromatic Woody", "Nightclub Essential"],
    localizedExpressions: ["Gent's"]
  }
}
```

## 7. 使用场景

### 7.1 SEO 优化

```typescript
const { keywords } = extractKeywords(report);

// 标题优化：使用核心关键词
const title = `${keywords.primary[0]} - ${keywords.secondary[0]}`;

// 描述优化：结合场景关键词
const description = `${keywords.primary.join(', ')} for ${keywords.scene[0]}`;
```

### 7.2 广告投放

```typescript
const { keywords } = extractKeywords(report);

// 广告关键词：核心 + 次要
const adKeywords = [...keywords.primary, ...keywords.secondary.slice(0, 3)];

// 受众定位：使用受众关键词
const targetAudience = keywords.audience.join(', ');
```

### 7.3 内容生成

```typescript
const { keywords } = extractKeywords(report);

// Prompt 生成：包含所有关键词
const prompt = `
Product: ${keywords.primary.join(', ')}
Features: ${keywords.secondary.join(', ')}
Scenes: ${keywords.scene.join(', ')}
Target: ${keywords.audience.join(', ')}
`;
```

## 8. 边缘情况处理

### 8.1 空数据处理

```typescript
// 情况 1：报告为空
if (!report) {
  return { keywords: { primary: [], secondary: [], scene: [], audience: [] }, confidence: 0 };
}

// 情况 2：某个字段为空
if (!report.primary_keywords || report.primary_keywords.length === 0) {
  keywords.primary = [];
  // 不增加置信度
}
```

### 8.2 数据质量问题

```typescript
// 情况 1：所有 primary_keywords 都是 low weight
const highWeightKeywords = report.primary_keywords.filter(k => k.weight === 'high');
if (highWeightKeywords.length === 0) {
  // 降级使用 medium weight
  keywords.primary = report.primary_keywords
    .filter(k => k.weight === 'medium')
    .map(k => k.keyword)
    .slice(0, 2);
}

// 情况 2：关键词包含特殊字符
keywords.secondary = report.secondary_keywords
  .map(k => k.keyword.trim())  // 去除首尾空格
  .filter(k => k.length > 0);  // 过滤空字符串
```

### 8.3 异常数据处理

```typescript
try {
  // 提取逻辑
} catch (error) {
  Logger.error('[关键词提取器] 提取失败:', error);
  return {
    keywords: { primary: [], secondary: [], scene: [], audience: [] },
    confidence: 0
  };
}
```

## 9. 性能优化

### 9.1 避免重复计算

```typescript
// 缓存提取结果
const keywordsCache = new Map<string, ExtractedKeywords>();

export function extractKeywordsWithCache(
  report: TitleKeywordsReport,
  reportId: string
): ExtractedKeywords {
  if (keywordsCache.has(reportId)) {
    return keywordsCache.get(reportId)!;
  }

  const result = extractKeywords(report);
  keywordsCache.set(reportId, result);
  return result;
}
```

### 9.2 懒加载

```typescript
// 仅在需要时提取特定类型
export function extractPrimaryKeywordsOnly(
  report: TitleKeywordsReport
): string[] {
  return report.primary_keywords
    .filter(k => k.weight === 'high')
    .map(k => k.keyword);
}
```

## 10. 测试策略

### 10.1 单元测试

```typescript
describe('extractKeywords', () => {
  test('should extract all keyword types', () => {
    const result = extractKeywords(SAMPLE_REPORT);
    expect(result.keywords.primary.length).toBeGreaterThan(0);
    expect(result.keywords.secondary.length).toBeGreaterThan(0);
    expect(result.keywords.scene.length).toBeGreaterThan(0);
    expect(result.keywords.audience.length).toBeGreaterThan(0);
    expect(result.confidence).toBe(1.0);
  });

  test('should handle empty report', () => {
    const result = extractKeywords(undefined);
    expect(result.keywords.primary).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  test('should fallback to medium weight if no high weight', () => {
    const report = {
      primary_keywords: [
        { keyword: "Test", weight: "medium", search_volume_estimate: "中" }
      ],
      secondary_keywords: [],
      scene_keywords: [],
      audience_keywords: []
    };
    const result = extractKeywords(report);
    expect(result.keywords.primary).toContain("Test");
  });
});
```

### 10.2 集成测试

```typescript
describe('Keyword Extraction Integration', () => {
  test('should work with real report data', () => {
    const result = extractKeywords(SAMPLE_ANALYSIS_REPORT['title-keywords']);
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.keywords.primary).toContain("Perfume Men");
  });
});
```

## 11. 总结

本方案实现了完整的关键词提取系统，具有以下特点：

1. **全量提取**：提取所有类型的关键词（核心、次要、场景、受众）
2. **结构化输出**：按类型分类，便于后续使用
3. **高置信度**：基于数据完整性的置信度评估
4. **零遗漏**：不过滤任何关键词，确保数据完整
5. **易扩展**：支持添加新的关键词类型和提取规则
6. **高性能**：支持缓存和懒加载优化

该方案为 DNA 提取系统提供了完整的关键词数据支持。
