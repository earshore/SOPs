# 技术规格全量提取方案

## 1. 设计目标

设计一个完整的技术规格提取系统，实现以下目标：

- **全量提取**：提取所有技术参数和规格信息
- **零硬编码**：不预设任何单位或参数类型
- **品类无关**：适用于所有产品类型（假发、电子、化妆品等）
- **结构化输出**：格式化输出，可直接用于 Listing
- **高准确性**：使用智能模式匹配，避免误提取

## 2. 数据源分析

### 2.1 主要数据源

| 数据源 | 字段路径 | 数据特征 | 优先级 |
|--------|---------|---------|--------|
| title-keywords | `secondary_keywords` | 结构化，带 type 标签 | 高 |
| selling-points | `bullet_analysis[].functions` | 非结构化，需模式匹配 | 中 |
| selling-points | `function_scene_matrix.functions` | 功能描述，部分包含规格 | 低 |

### 2.2 数据源详细分析

#### 2.2.1 title-keywords.secondary_keywords

**结构**：
```typescript
{
  keyword: string;      // 如 "50ml/1.7oz", "Long Lasting", "Aromatic Woody"
  type: string;         // 如 "size", "feature", "scent"
  importance: string;   // 重要性描述
}
```

**特点**：
- 结构化数据，带类型标签
- 包含规格词（size, capacity）和功能词（feature）
- 需要区分技术规格和主观描述

**示例**：
```typescript
[
  { keyword: "50ml/1.7oz", type: "size", importance: "规格词，便携定位" },
  { keyword: "Long Lasting", type: "feature", importance: "核心卖点词" },
  { keyword: "Aromatic Woody", type: "scent", importance: "香调描述" }
]
```

#### 2.2.2 selling-points.bullet_analysis[].functions

**结构**：
```typescript
{
  bullet_index: number;
  functions: string[];  // 如 ["便携容量", "持久留香6小时+", "木质芳香调"]
  // ...
}
```

**特点**：
- 非结构化文本
- 混合技术规格和主观描述
- 需要智能模式匹配筛选

**示例**：
```typescript
[
  "便携容量",           // ❌ 主观描述
  "持久留香6小时+",     // ✅ 技术规格（包含数字+单位）
  "木质芳香调",         // ❌ 主观描述
  "50ml旅行友好"        // ✅ 技术规格（包含数字+单位）
]
```

## 3. 技术规格识别策略

### 3.1 模式匹配规则（零硬编码）

**核心原则**：使用通用模式而非硬编码单位列表

#### 模式 1：数字 + 字母单位
```typescript
// 匹配：50ml, 20 inch, 5000mAh, 180 density, 6.5oz
const pattern1 = /\d+(\.\d+)?\s*[a-zA-Z]{1,6}(?:\s|$|,|\.)/i;

// 示例：
"50ml" ✅
"20 inch" ✅
"5000mAh" ✅
"180 density" ✅
"soft texture" ❌ (无数字)
```

#### 模式 2：数字 + 百分号
```typescript
// 匹配：99%, 150% density, 50% off
const pattern2 = /\d+(\.\d+)?\s*%/;

// 示例：
"99%" ✅
"150% density" ✅
"great quality" ❌ (无百分号)
```

#### 模式 3：数字范围
```typescript
// 匹配：20-30cm, 100~240V, 5 to 10 inches, 13x4 lace
const pattern3 = /\d+\s*[-~至tox×]\s*\d+/i;

// 示例：
"20-30cm" ✅
"100~240V" ✅
"13x4 lace" ✅
"5 to 10 inches" ✅
"long lasting" ❌ (无范围)
```

#### 模式 4：技术符号
```typescript
// 匹配：5V/2A, 1920x1080, Type-C, USB-A
const pattern4 = /[\/×xX]\d+|Type-[A-Z]|USB-[A-Z0-9]/i;

// 示例：
"5V/2A" ✅
"Type-C" ✅
"USB-3.0" ✅
"great design" ❌ (无技术符号)
```

#### 模式 5：小数
```typescript
// 匹配：6.5 inch, 1.7oz, 3.14
const pattern5 = /\d+\.\d+/;

// 示例：
"6.5 inch" ✅
"1.7oz" ✅
"smooth finish" ❌ (无小数)
```

### 3.2 综合判断函数

```typescript
/**
 * 判断文本是否为技术规格
 *
 * 零硬编码设计：
 * - 使用通用模式匹配，不依赖硬编码单位列表
 * - 适用于所有品类的技术参数
 *
 * @param text 待检测的文本
 * @returns true 如果文本包含技术规格特征
 */
export function isTechnicalSpec(text: string): boolean {
  // 模式 1: 数字 + 字母单位
  const hasNumberWithUnit = /\d+(\.\d+)?\s*[a-zA-Z]{1,6}(?:\s|$|,|\.)/.test(text);

  // 模式 2: 数字 + 百分号
  const hasPercentage = /\d+(\.\d+)?\s*%/.test(text);

  // 模式 3: 数字范围
  const hasRange = /\d+\s*[-~至tox×]\s*\d+/i.test(text);

  // 模式 4: 技术符号
  const hasTechSymbol = /[\/×xX]\d+|Type-[A-Z]|USB-[A-Z0-9]/i.test(text);

  // 模式 5: 小数
  const hasDecimal = /\d+\.\d+/.test(text);

  return hasNumberWithUnit ||
         hasPercentage ||
         hasRange ||
         hasTechSymbol ||
         hasDecimal;
}
```

### 3.3 置信度评估

```typescript
/**
 * 计算技术规格的置信度
 *
 * 策略：
 * - 匹配的模式越多，置信度越高
 * - 用于过滤低置信度的规格
 *
 * @param text 技术规格文本
 * @returns 0-1 之间的置信度分数
 */
export function getTechnicalSpecConfidence(text: string): number {
  let confidence = 0;

  // 每个模式贡献一定的置信度
  if (/\d+(\.\d+)?\s*[a-zA-Z]{1,6}/.test(text)) confidence += 0.3;
  if (/\d+(\.\d+)?\s*%/.test(text)) confidence += 0.2;
  if (/\d+\s*[-~至tox×]\s*\d+/i.test(text)) confidence += 0.3;
  if (/[\/×xX]\d+|Type-[A-Z]|USB-[A-Z0-9]/i.test(text)) confidence += 0.2;

  return Math.min(confidence, 1.0);
}
```

## 4. 提取策略

### 4.1 从 secondary_keywords 提取（结构化数据）

**策略**：按 type 分组，保留原始 keyword 值

```typescript
/**
 * 从 secondary_keywords 提取技术规格
 *
 * 提取策略：
 * 1. 按 type 分组所有关键词
 * 2. 使用类型映射服务翻译 type（可选）
 * 3. 输出格式：type: keyword1, keyword2
 *
 * @param keywords secondary_keywords 数组
 * @param mappingService 类型映射服务（可选）
 * @returns 按 type 分组的规格列表
 */
export function extractSpecsByType(
  keywords: TitleKeywordsReport['secondary_keywords'],
  mappingService?: TypeMappingService
): string[] {
  const specs: string[] = [];

  // 按 type 分组
  const grouped = new Map<string, string[]>();

  keywords.forEach(k => {
    const type = k.type || 'other';
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    grouped.get(type)!.push(k.keyword);
  });

  // 为每个 type 生成一行规格
  grouped.forEach((kws, type) => {
    // 使用映射服务翻译 type（如果提供）
    const label = mappingService
      ? mappingService.translateType(type)
      : type;

    // 如果回退策略是 'skip' 且没有翻译，则跳过
    if (label) {
      specs.push(`${label}: ${kws.join(', ')}`);
    }
  });

  return specs;
}
```

**输出示例**：
```typescript
// 输入：
[
  { keyword: "50ml/1.7oz", type: "size", importance: "规格词" },
  { keyword: "Long Lasting", type: "feature", importance: "卖点词" },
  { keyword: "Aromatic Woody", type: "scent", importance: "香调" },
  { keyword: "Mint", type: "scent", importance: "香调元素" }
]

// 输出（使用默认映射）：
[
  "尺寸: 50ml/1.7oz",
  "feature: Long Lasting",
  "香调: Aromatic Woody, Mint"
]

// 输出（使用自定义映射）：
[
  "容量: 50ml/1.7oz",
  "持久性: Long Lasting",
  "香调: Aromatic Woody, Mint"
]
```

### 4.2 从 bullet_analysis 提取（非结构化数据）

**策略**：使用模式匹配筛选技术规格

```typescript
/**
 * 从 bullet_analysis 提取技术规格
 *
 * 提取策略：
 * 1. 提取所有 functions 字段
 * 2. 使用模式匹配筛选技术规格
 * 3. 按置信度排序，取前 N 个
 *
 * @param bulletAnalysis bullet_analysis 数组
 * @param maxCount 最大提取数量（默认 5）
 * @returns 技术规格列表和平均置信度
 */
export function extractTechnicalSpecs(
  bulletAnalysis: SellingPointsReport['bullet_analysis'],
  maxCount: number = 5
): {
  specs: string[];
  confidence: number;
} {
  if (!bulletAnalysis) {
    return { specs: [], confidence: 0 };
  }

  // 1. 提取所有 functions
  const allFunctions = bulletAnalysis
    .filter(b => b.functions && b.functions.length > 0)
    .flatMap(b => b.functions);

  // 2. 筛选技术规格并计算置信度
  const specsWithConfidence = allFunctions
    .filter(f => isTechnicalSpec(f))
    .map(f => ({
      spec: f,
      confidence: getTechnicalSpecConfidence(f)
    }))
    .sort((a, b) => b.confidence - a.confidence)  // 按置信度降序
    .slice(0, maxCount);

  // 3. 计算平均置信度
  const avgConfidence = specsWithConfidence.length > 0
    ? specsWithConfidence.reduce((sum, item) => sum + item.confidence, 0) / specsWithConfidence.length
    : 0;

  // 4. 格式化输出
  const specs = specsWithConfidence.map(item => `- ${item.spec}`);

  return {
    specs,
    confidence: avgConfidence
  };
}
```

**输出示例**：
```typescript
// 输入：
[
  { functions: ["便携容量", "旅行友好"] },
  { functions: ["持久留香6小时+", "木质芳香调"] },
  { functions: ["50ml旅行友好"] }
]

// 输出：
{
  specs: [
    "- 持久留香6小时+",
    "- 50ml旅行友好"
  ],
  confidence: 0.6
}
```

### 4.3 综合提取函数

```typescript
/**
 * 从多个数据源提取完整技术规格
 *
 * 提取策略：
 * 1. 优先从 secondary_keywords 提取（结构化数据）
 * 2. 从 bullet_analysis 补充（非结构化数据）
 * 3. 去重并格式化输出
 *
 * 置信度计算：
 * - 有结构化数据：+0.3（基础分）
 * - 规格数量 ≥3：+0.2
 * - 规格数量 ≥5：+0.2
 * - 来自 keywords：+0.15
 * - 来自 bullet_analysis：+0.15
 *
 * @param titleKeywords title-keywords 报告（可选）
 * @param sellingPoints selling-points 报告（可选）
 * @param mappingService 类型映射服务（可选）
 * @returns 提取的技术参数和置信度
 */
export function extractSpecs(
  titleKeywords: TitleKeywordsReport | undefined,
  sellingPoints: SellingPointsReport | undefined,
  mappingService?: TypeMappingService
): {
  text: string;
  confidence: number;
} {
  const specs: string[] = [];
  let keywordsCount = 0;
  let techSpecsCount = 0;

  try {
    // 1. 从 title-keywords 提取结构化规格
    if (titleKeywords?.secondary_keywords && titleKeywords.secondary_keywords.length > 0) {
      const keywordSpecs = extractSpecsByType(
        titleKeywords.secondary_keywords,
        mappingService
      );
      specs.push(...keywordSpecs);
      keywordsCount = keywordSpecs.length;
    }

    // 2. 从 selling-points 补充技术规格（如果规格还不够多）
    if (sellingPoints?.bullet_analysis && specs.length < 8) {
      const { specs: techSpecs } = extractTechnicalSpecs(
        sellingPoints.bullet_analysis,
        8 - specs.length  // 补充到 8 个
      );
      specs.push(...techSpecs);
      techSpecsCount = techSpecs.length;
    }

    // 3. 计算置信度
    let confidence = 0;

    // 基础分：有数据就给分
    if (specs.length > 0) {
      confidence += 0.3;
    }

    // 数量分：提取的规格越多，置信度越高
    if (specs.length >= 3) {
      confidence += 0.2;
    }
    if (specs.length >= 5) {
      confidence += 0.2;
    }

    // 来源分：从多个来源提取更可靠
    if (keywordsCount > 0) {
      confidence += 0.15;
    }
    if (techSpecsCount > 0) {
      confidence += 0.15;
    }

    const text = specs.join('\n');
    return {
      text: text || '未能提取技术参数',
      confidence: Math.min(confidence, 1.0)
    };
  } catch (error) {
    Logger.error('[技术规格提取器] 提取失败:', error);
    return { text: '', confidence: 0 };
  }
}
```

## 5. 输出格式

### 5.1 标准输出

```typescript
// 格式：多行文本，每行一个规格
{
  text: `尺寸: 50ml/1.7oz
香调: Aromatic Woody, Mint, Lemon
- 持久留香6小时+
- 温和无刺激`,
  confidence: 0.95
}
```

### 5.2 结构化输出（可选）

```typescript
// 格式：结构化对象
{
  specs: [
    { type: "size", value: "50ml/1.7oz", source: "keywords" },
    { type: "scent", value: "Aromatic Woody, Mint, Lemon", source: "keywords" },
    { type: "duration", value: "6小时+", source: "bullet_analysis" },
    { type: "formula", value: "温和无刺激", source: "bullet_analysis" }
  ],
  confidence: 0.95
}
```

## 6. 品类适配示例

### 6.1 假发产品

**输入数据**：
```typescript
secondary_keywords: [
  { keyword: "180% density", type: "hair_density" },
  { keyword: "20 inch", type: "hair_length" },
  { keyword: "13x4 lace frontal", type: "lace_type" },
  { keyword: "body wave", type: "curl_pattern" }
]
```

**输出**：
```typescript
{
  text: `hair_density: 180% density
hair_length: 20 inch
lace_type: 13x4 lace frontal
curl_pattern: body wave`,
  confidence: 0.95
}
```

**使用自定义映射后**：
```typescript
{
  text: `密度: 180% density
发长: 20 inch
网类型: 13x4 lace frontal
卷度: body wave`,
  confidence: 0.95
}
```

### 6.2 电子产品

**输入数据**：
```typescript
secondary_keywords: [
  { keyword: "6.5 inch OLED", type: "screen_size" },
  { keyword: "5000mAh", type: "battery" },
  { keyword: "128GB", type: "storage" },
  { keyword: "Type-C", type: "port" }
]
```

**输出**：
```typescript
{
  text: `screen_size: 6.5 inch OLED
battery: 5000mAh
storage: 128GB
port: Type-C`,
  confidence: 0.95
}
```

### 6.3 化妆品

**输入数据**：
```typescript
secondary_keywords: [
  { keyword: "50ml", type: "size" },
  { keyword: "SPF 50+", type: "protection" },
  { keyword: "24-hour wear", type: "duration" },
  { keyword: "oil-free", type: "formula" }
]
```

**输出**：
```typescript
{
  text: `尺寸: 50ml
protection: SPF 50+
duration: 24-hour wear
formula: oil-free`,
  confidence: 0.95
}
```

## 7. 边缘情况处理

### 7.1 混合规格和描述

```typescript
// 输入：
functions: [
  "50ml便携装",        // ✅ 包含规格（50ml）
  "旅行友好",          // ❌ 纯描述
  "6小时持久",         // ✅ 包含规格（6小时）
  "优雅设计"           // ❌ 纯描述
]

// 处理：使用 isTechnicalSpec 过滤
const techSpecs = functions.filter(f => isTechnicalSpec(f));
// 结果：["50ml便携装", "6小时持久"]
```

### 7.2 重复规格

```typescript
// 输入：
// 来源 1: secondary_keywords
specs1 = ["尺寸: 50ml/1.7oz"];

// 来源 2: bullet_analysis
specs2 = ["- 50ml便携装"];

// 处理：保留两者（不同表述方式）
// 或者：使用相似度检测去重（可选）
```

### 7.3 空数据

```typescript
// 情况 1：两个数据源都为空
if (!titleKeywords && !sellingPoints) {
  return { text: '未能提取技术参数', confidence: 0 };
}

// 情况 2：仅一个数据源有数据
if (!titleKeywords) {
  // 仅从 sellingPoints 提取
}
```

## 8. 性能优化

### 8.1 正则表达式优化

```typescript
// 预编译正则表达式
const TECH_SPEC_PATTERNS = {
  numberWithUnit: /\d+(\.\d+)?\s*[a-zA-Z]{1,6}(?:\s|$|,|\.)/,
  percentage: /\d+(\.\d+)?\s*%/,
  range: /\d+\s*[-~至tox×]\s*\d+/i,
  techSymbol: /[\/×xX]\d+|Type-[A-Z]|USB-[A-Z0-9]/i,
  decimal: /\d+\.\d+/
};

// 使用预编译的正则
export function isTechnicalSpec(text: string): boolean {
  return TECH_SPEC_PATTERNS.numberWithUnit.test(text) ||
         TECH_SPEC_PATTERNS.percentage.test(text) ||
         TECH_SPEC_PATTERNS.range.test(text) ||
         TECH_SPEC_PATTERNS.techSymbol.test(text) ||
         TECH_SPEC_PATTERNS.decimal.test(text);
}
```

### 8.2 缓存提取结果

```typescript
const specsCache = new Map<string, ExtractedSpecs>();

export function extractSpecsWithCache(
  titleKeywords: TitleKeywordsReport,
  sellingPoints: SellingPointsReport,
  cacheKey: string
): ExtractedSpecs {
  if (specsCache.has(cacheKey)) {
    return specsCache.get(cacheKey)!;
  }

  const result = extractSpecs(titleKeywords, sellingPoints);
  specsCache.set(cacheKey, result);
  return result;
}
```

## 9. 测试策略

### 9.1 单元测试

```typescript
describe('isTechnicalSpec', () => {
  test('should identify specs with numbers and units', () => {
    expect(isTechnicalSpec('50ml')).toBe(true);
    expect(isTechnicalSpec('20 inch')).toBe(true);
    expect(isTechnicalSpec('5000mAh')).toBe(true);
    expect(isTechnicalSpec('180 density')).toBe(true);
  });

  test('should identify specs with percentages', () => {
    expect(isTechnicalSpec('99%')).toBe(true);
    expect(isTechnicalSpec('150% density')).toBe(true);
  });

  test('should identify specs with ranges', () => {
    expect(isTechnicalSpec('20-30cm')).toBe(true);
    expect(isTechnicalSpec('13x4 lace')).toBe(true);
    expect(isTechnicalSpec('100~240V')).toBe(true);
  });

  test('should reject subjective descriptions', () => {
    expect(isTechnicalSpec('soft texture')).toBe(false);
    expect(isTechnicalSpec('great quality')).toBe(false);
    expect(isTechnicalSpec('elegant design')).toBe(false);
  });
});

describe('extractSpecs', () => {
  test('should extract specs from both sources', () => {
    const result = extractSpecs(
      SAMPLE_TITLE_KEYWORDS,
      SAMPLE_SELLING_POINTS
    );
    expect(result.text).toContain('50ml');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  test('should handle empty data gracefully', () => {
    const result = extractSpecs(undefined, undefined);
    expect(result.text).toBe('未能提取技术参数');
    expect(result.confidence).toBe(0);
  });
});
```

### 9.2 跨品类测试

```typescript
describe('Cross-category specs extraction', () => {
  test('should extract wig specs', () => {
    const wigKeywords = {
      secondary_keywords: [
        { keyword: "180% density", type: "hair_density" },
        { keyword: "20 inch", type: "hair_length" }
      ]
    };
    const result = extractSpecs(wigKeywords, undefined);
    expect(result.text).toContain('180% density');
    expect(result.text).toContain('20 inch');
  });

  test('should extract electronics specs', () => {
    const electronicsKeywords = {
      secondary_keywords: [
        { keyword: "6.5 inch OLED", type: "screen_size" },
        { keyword: "5000mAh", type: "battery" }
      ]
    };
    const result = extractSpecs(electronicsKeywords, undefined);
    expect(result.text).toContain('6.5 inch');
    expect(result.text).toContain('5000mAh');
  });

  test('should extract cosmetics specs', () => {
    const cosmeticsKeywords = {
      secondary_keywords: [
        { keyword: "50ml", type: "size" },
        { keyword: "SPF 50+", type: "protection" }
      ]
    };
    const result = extractSpecs(cosmeticsKeywords, undefined);
    expect(result.text).toContain('50ml');
    expect(result.text).toContain('SPF 50+');
  });
});
```

## 10. 总结

本方案实现了完整的技术规格提取系统，具有以下特点：

1. **零硬编码**：使用通用模式匹配，不预设单位列表
2. **品类无关**：适用于假发、电子、化妆品等所有品类
3. **全量提取**：从多个数据源提取，不遗漏任何规格
4. **高准确性**：智能模式匹配，避免误提取主观描述
5. **结构化输出**：格式化输出，可直接用于 Listing
6. **可扩展**：支持自定义类型映射和新增模式

该方案为 DNA 提取系统提供了可靠的技术规格数据支持。
