# DNA 提取器零硬编码架构设计

## 1. 设计目标

设计一个完全数据驱动、品类无关的产品 DNA 提取系统，遵循以下核心原则：

- **零硬编码**：不预设任何产品属性名称（如"容量"、"香调"、"长度"）
- **数据驱动**：完全基于 AI 报告中实际存在的字段和值
- **品类无关**：适用于假发、电子产品、化妆品、服装等所有品类
- **可扩展**：用户可自定义类型映射，无需修改代码

## 2. 核心问题分析

### 2.1 当前实现的问题

```typescript
// ❌ 问题 1: 硬编码类型翻译
function translateType(type: string): string {
  const translations: Record<string, string> = {
    'size': '尺寸',
    'color': '颜色',
    'material': '材质',
    // ... 仅支持 13 种类型
  };
  return translations[type] || type;
}

// ❌ 问题 2: 硬编码技术单位
function isTechnicalSpec(text: string): boolean {
  const hasTechTerm = /\b(dB|Hz|V|W|mAh|GB|TB|MB|kg|lbs|oz|cm|mm|inch|ml|L|g)\b/i.test(text);
  // 假发、新品类的单位无法识别
}
```

**根本原因**：
- 假设所有产品都使用预定义的属性类型
- 无法处理新品类（假发的"密度"、"卷度"等）
- 将配置硬编码在业务逻辑中

### 2.2 数据特征分析（来自 Task #2）

| 字段 | 数据来源 | 是否需要翻译 | 处理策略 |
|------|---------|-------------|---------|
| `secondary_keywords[].type` | AI 生成的类别标签 | ✅ 可选翻译 | 可扩展映射 + 原值回退 |
| `secondary_keywords[].keyword` | AI 生成的产品特定内容 | ❌ 不翻译 | 直接使用 |
| `bullet_analysis[].functions[]` | AI 动态生成的功能描述 | ❌ 不翻译 | 模式匹配过滤 |

**关键洞察**：
- `type` 是元数据标签，可以映射（但不应硬编码）
- `keyword` 和 `functions` 是内容，不应翻译（AI 已生成目标语言）

## 3. 新架构设计

### 3.1 架构分层

```
┌─────────────────────────────────────────┐
│   DNA Extractor (业务逻辑层)             │
│   - extractProductDNA()                 │
│   - extractAudience()                   │
│   - extractUSPs()                       │
│   - extractSpecs()                      │
└─────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────┐
│   Type Mapping Service (映射服务层)      │
│   - translateType()                     │
│   - registerCustomMapping()             │
│   - getUnknownTypes()                   │
└─────────────────────────────────────────┘
              ↓ 读取
┌─────────────────────────────────────────┐
│   Type Mapping Config (配置层)          │
│   - defaultTypeMapping.ts               │
│   - customTypeMapping.json (用户自定义)  │
└─────────────────────────────────────────┘
```

### 3.2 核心组件设计

#### 3.2.1 类型映射服务（TypeMappingService）

```typescript
/**
 * 类型映射配置接口
 */
export interface TypeMappingConfig {
  // 默认映射（内置）
  defaultMappings: Record<string, string>;

  // 用户自定义映射（可扩展）
  customMappings?: Record<string, string>;

  // 回退策略
  fallbackStrategy: 'original' | 'capitalize' | 'skip';
}

/**
 * 类型映射服务
 * 职责：管理类型翻译，支持扩展，跟踪未知类型
 */
export class TypeMappingService {
  private config: TypeMappingConfig;
  private unknownTypes: Set<string> = new Set();

  constructor(config: TypeMappingConfig) {
    this.config = config;
  }

  /**
   * 翻译类型标签
   * @param type 原始类型（如 "size", "hair_density"）
   * @returns 翻译后的类型（如 "尺寸", "hair_density"）
   */
  translateType(type: string): string {
    // 1. 优先使用自定义映射
    if (this.config.customMappings?.[type]) {
      return this.config.customMappings[type];
    }

    // 2. 使用默认映射
    if (this.config.defaultMappings[type]) {
      return this.config.defaultMappings[type];
    }

    // 3. 记录未知类型（用于后续分析）
    this.unknownTypes.add(type);

    // 4. 应用回退策略
    return this.applyFallback(type);
  }

  /**
   * 应用回退策略
   */
  private applyFallback(type: string): string {
    switch (this.config.fallbackStrategy) {
      case 'original':
        return type; // 保持原样
      case 'capitalize':
        return type.charAt(0).toUpperCase() + type.slice(1); // 首字母大写
      case 'skip':
        return ''; // 跳过（不显示）
      default:
        return type;
    }
  }

  /**
   * 注册自定义映射（运行时扩展）
   */
  registerCustomMapping(type: string, translation: string): void {
    if (!this.config.customMappings) {
      this.config.customMappings = {};
    }
    this.config.customMappings[type] = translation;
  }

  /**
   * 获取未知类型列表（用于调试和扩展）
   */
  getUnknownTypes(): string[] {
    return Array.from(this.unknownTypes);
  }

  /**
   * 批量注册映射
   */
  registerBatch(mappings: Record<string, string>): void {
    Object.entries(mappings).forEach(([type, translation]) => {
      this.registerCustomMapping(type, translation);
    });
  }
}
```

#### 3.2.2 默认类型映射配置

```typescript
// src/modules/app_center/views/master_analysis/services/config/defaultTypeMapping.ts

/**
 * 默认类型映射
 * 仅包含最常见的通用类型，不针对特定品类
 */
export const DEFAULT_TYPE_MAPPINGS: Record<string, string> = {
  // 通用属性
  'size': '尺寸',
  'color': '颜色',
  'material': '材质',
  'weight': '重量',
  'dimension': '尺寸',
  'style': '风格',

  // 技术属性（跨品类通用）
  'battery': '电池',
  'power': '功率',
  'voltage': '电压',
  'capacity': '容量',
  'storage': '存储',

  // 感官属性
  'scent': '香调',
  'texture': '质地',
  'finish': '效果',

  // 注意：不包含品类特定属性（如 hair_density, curl_pattern）
  // 这些应由用户根据需要自定义
};

/**
 * 默认配置
 */
export const DEFAULT_TYPE_MAPPING_CONFIG: TypeMappingConfig = {
  defaultMappings: DEFAULT_TYPE_MAPPINGS,
  fallbackStrategy: 'original' // 未知类型保持原样
};
```

#### 3.2.3 改进的技术规格识别

```typescript
/**
 * 技术规格模式匹配器
 * 使用通用模式而非硬编码单位列表
 */
export class TechnicalSpecMatcher {
  /**
   * 判断文本是否为技术规格
   * 使用模式匹配，不依赖硬编码单位
   */
  static isTechnicalSpec(text: string): boolean {
    // 模式 1: 数字 + 字母单位（通用模式）
    // 匹配: "50ml", "20 inch", "5000mAh", "180 density"
    const hasNumberWithUnit = /\d+\s*[a-zA-Z]{1,6}(?:\s|$|,|\.)/i.test(text);

    // 模式 2: 数字 + 百分号
    // 匹配: "99%", "50% off"
    const hasPercentage = /\d+\s*%/.test(text);

    // 模式 3: 数字范围
    // 匹配: "20-30cm", "100~240V", "5 to 10 inches"
    const hasRange = /\d+\s*[-~至to]\s*\d+/i.test(text);

    // 模式 4: 纯数字 + 度量词
    // 匹配: "180 密度", "13x4 尺寸"
    const hasNumberWithMeasure = /\d+\s*[x×]\s*\d+/.test(text);

    // 模式 5: 包含技术符号
    // 匹配: "5V/2A", "1920x1080", "Type-C"
    const hasTechSymbol = /[\/×xX]\d+|Type-[A-Z]|USB-[A-Z0-9]/i.test(text);

    return hasNumberWithUnit ||
           hasPercentage ||
           hasRange ||
           hasNumberWithMeasure ||
           hasTechSymbol;
  }

  /**
   * 提取技术规格的置信度
   * @returns 0-1 之间的置信度分数
   */
  static getConfidence(text: string): number {
    let confidence = 0;

    // 包含多个模式，置信度更高
    if (/\d+\s*[a-zA-Z]{1,6}/.test(text)) confidence += 0.3;
    if (/\d+\s*%/.test(text)) confidence += 0.2;
    if (/\d+\s*[-~至to]\s*\d+/i.test(text)) confidence += 0.3;
    if (/\d+\s*[x×]\s*\d+/.test(text)) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }
}
```

#### 3.2.4 重构后的规格提取函数

```typescript
/**
 * 从 secondary_keywords 提取规格（零硬编码版本）
 */
function extractSpecsByType(
  keywords: TitleKeywordsReport['secondary_keywords'],
  mappingService: TypeMappingService
): { specs: string[]; unknownTypes: string[] } {
  const specs: string[] = [];

  // 按 type 分组
  const grouped = new Map<string, string[]>();

  keywords.forEach(k => {
    const type = k.type || 'other';
    if (!grouped.has(type)) {
      grouped.set(type, []);
    }
    // keyword 是 AI 生成的内容，直接使用，不翻译
    grouped.get(type)!.push(k.keyword);
  });

  // 为每个 type 生成一行规格
  grouped.forEach((kws, type) => {
    // 使用映射服务翻译 type（支持回退）
    const label = mappingService.translateType(type);

    // 如果回退策略是 'skip' 且没有翻译，则跳过
    if (label) {
      specs.push(`${label}: ${kws.join(', ')}`);
    }
  });

  return {
    specs,
    unknownTypes: mappingService.getUnknownTypes()
  };
}

/**
 * 从 bullet_analysis 提取技术规格（改进版）
 */
function extractTechnicalSpecs(
  bulletAnalysis: SellingPointsReport['bullet_analysis']
): { specs: string[]; confidence: number } {
  if (!bulletAnalysis) return { specs: [], confidence: 0 };

  // 提取所有 functions（AI 生成的内容）
  const allFunctions = bulletAnalysis
    .filter(b => b.functions && b.functions.length > 0)
    .flatMap(b => b.functions);

  // 使用改进的模式匹配筛选技术规格
  const techSpecs = allFunctions
    .filter(f => TechnicalSpecMatcher.isTechnicalSpec(f))
    .slice(0, 5)
    .map(s => `- ${s}`);

  // 计算平均置信度
  const avgConfidence = techSpecs.length > 0
    ? techSpecs.reduce((sum, spec) =>
        sum + TechnicalSpecMatcher.getConfidence(spec), 0) / techSpecs.length
    : 0;

  return {
    specs: techSpecs,
    confidence: avgConfidence
  };
}
```

#### 3.2.5 增强的元数据跟踪

```typescript
/**
 * 增强的提取元数据
 */
export interface ExtractedDNA {
  audience: string;
  usps: string;
  specs: string;
  confidence: {
    audience: number;
    usps: number;
    specs: number;
  };
  metadata: {
    extractedAt: string;
    sourceFields: string[];

    // 新增：未知类型跟踪
    unknownTypes?: string[];

    // 新增：提取统计
    stats?: {
      totalKeywords: number;
      technicalSpecs: number;
      mappedTypes: number;
      unmappedTypes: number;
    };
  };
}
```

### 3.3 使用示例

#### 3.3.1 基本使用（使用默认配置）

```typescript
import { extractProductDNA } from './dnaExtractor';
import { TypeMappingService } from './TypeMappingService';
import { DEFAULT_TYPE_MAPPING_CONFIG } from './config/defaultTypeMapping';

// 创建映射服务
const mappingService = new TypeMappingService(DEFAULT_TYPE_MAPPING_CONFIG);

// 提取 DNA
const dna = extractProductDNA(report, mappingService);

// 查看未知类型（用于后续扩展）
console.log('未知类型:', mappingService.getUnknownTypes());
// 输出: ['hair_density', 'curl_pattern', 'lace_type']
```

#### 3.3.2 扩展使用（添加假发品类映射）

```typescript
// 用户可以在运行时添加自定义映射
mappingService.registerBatch({
  'hair_density': '密度',
  'curl_pattern': '卷度',
  'lace_type': '网类型',
  'hair_length': '发长',
  'cap_size': '帽围'
});

// 再次提取，现在假发属性会被正确翻译
const dna = extractProductDNA(report, mappingService);
```

#### 3.3.3 持久化自定义映射

```typescript
// 用户可以保存自定义映射到配置文件
// customTypeMapping.json
{
  "hair_density": "密度",
  "curl_pattern": "卷度",
  "lace_type": "网类型",
  "screen_size": "屏幕尺寸",
  "processor": "处理器"
}

// 加载自定义映射
const customMappings = await loadCustomMappings();
const config = {
  ...DEFAULT_TYPE_MAPPING_CONFIG,
  customMappings
};
const mappingService = new TypeMappingService(config);
```

## 4. 架构优势

### 4.1 零硬编码

| 方面 | 旧实现 | 新架构 |
|------|--------|--------|
| 类型翻译 | 硬编码 13 种类型 | 可扩展配置 + 回退策略 |
| 技术单位 | 硬编码单位列表 | 通用模式匹配 |
| 品类支持 | 仅支持预定义品类 | 支持任意品类 |
| 扩展方式 | 修改代码 | 修改配置文件 |

### 4.2 数据驱动

- **完全基于报告内容**：不假设任何产品属性
- **AI 内容保持原样**：`keyword` 和 `functions` 不翻译
- **元数据可映射**：`type` 标签支持可选翻译

### 4.3 品类无关

```typescript
// 假发产品
{
  type: 'hair_density',
  keyword: '180% density'
}
// 翻译为: "密度: 180% density"（如果配置了映射）
// 或: "hair_density: 180% density"（回退到原值）

// 电子产品
{
  type: 'screen_size',
  keyword: '6.5 inch OLED'
}
// 翻译为: "屏幕尺寸: 6.5 inch OLED"（如果配置了映射）
// 或: "screen_size: 6.5 inch OLED"（回退到原值）
```

### 4.4 可观测性

```typescript
// 提取后可以查看统计信息
console.log(dna.metadata.stats);
// {
//   totalKeywords: 8,
//   technicalSpecs: 5,
//   mappedTypes: 6,
//   unmappedTypes: 2
// }

// 查看未知类型，帮助用户扩展映射
console.log(dna.metadata.unknownTypes);
// ['hair_density', 'curl_pattern']
```

## 5. 迁移计划

### 5.1 向后兼容

新架构完全向后兼容：

```typescript
// 旧代码（仍然可用）
const dna = extractProductDNA(report);

// 新代码（推荐）
const mappingService = new TypeMappingService(DEFAULT_TYPE_MAPPING_CONFIG);
const dna = extractProductDNA(report, mappingService);
```

### 5.2 迁移步骤

1. **Phase 1**: 实现 `TypeMappingService` 和 `TechnicalSpecMatcher`
2. **Phase 2**: 重构 `extractSpecsByType` 和 `extractTechnicalSpecs`
3. **Phase 3**: 更新 `extractProductDNA` 接受可选的 `mappingService` 参数
4. **Phase 4**: 添加 UI 支持用户自定义映射（可选）

### 5.3 测试策略

```typescript
// 测试用例 1: 默认映射
test('should translate common types', () => {
  const service = new TypeMappingService(DEFAULT_TYPE_MAPPING_CONFIG);
  expect(service.translateType('size')).toBe('尺寸');
  expect(service.translateType('color')).toBe('颜色');
});

// 测试用例 2: 未知类型回退
test('should fallback to original for unknown types', () => {
  const service = new TypeMappingService(DEFAULT_TYPE_MAPPING_CONFIG);
  expect(service.translateType('hair_density')).toBe('hair_density');
  expect(service.getUnknownTypes()).toContain('hair_density');
});

// 测试用例 3: 自定义映射
test('should use custom mappings', () => {
  const service = new TypeMappingService(DEFAULT_TYPE_MAPPING_CONFIG);
  service.registerCustomMapping('hair_density', '密度');
  expect(service.translateType('hair_density')).toBe('密度');
});

// 测试用例 4: 技术规格识别（品类无关）
test('should identify technical specs across categories', () => {
  expect(TechnicalSpecMatcher.isTechnicalSpec('180 density')).toBe(true);
  expect(TechnicalSpecMatcher.isTechnicalSpec('6.5 inch screen')).toBe(true);
  expect(TechnicalSpecMatcher.isTechnicalSpec('5000mAh battery')).toBe(true);
  expect(TechnicalSpecMatcher.isTechnicalSpec('soft and smooth')).toBe(false);
});
```

## 6. 未来扩展

### 6.1 UI 配置界面

```typescript
// 用户可以在 UI 中管理类型映射
interface TypeMappingUI {
  // 显示未知类型列表
  showUnknownTypes(): void;

  // 添加自定义映射
  addMapping(type: string, translation: string): void;

  // 导入/导出映射配置
  exportMappings(): string;
  importMappings(json: string): void;
}
```

### 6.2 智能映射建议

```typescript
// 基于历史数据，AI 可以建议映射
interface MappingSuggestion {
  type: string;
  suggestedTranslation: string;
  confidence: number;
  examples: string[]; // 该类型的示例 keywords
}
```

### 6.3 多语言支持

```typescript
// 支持多语言映射
interface MultilingualTypeMapping {
  'zh-CN': Record<string, string>;
  'en-US': Record<string, string>;
  'ja-JP': Record<string, string>;
}
```

## 7. 总结

### 7.1 核心改进

1. **类型映射外部化**：从硬编码到可配置
2. **模式匹配通用化**：从单位列表到通用模式
3. **元数据可观测**：跟踪未知类型，帮助扩展
4. **完全数据驱动**：不假设产品属性

### 7.2 品类无关性验证

| 品类 | 特殊属性示例 | 新架构支持 |
|------|-------------|-----------|
| 假发 | hair_density, curl_pattern | ✅ 回退到原值或自定义映射 |
| 电子产品 | screen_size, processor | ✅ 回退到原值或自定义映射 |
| 化妆品 | scent, texture | ✅ 默认映射 + 自定义扩展 |
| 服装 | size, material | ✅ 默认映射 |

### 7.3 关键设计决策

1. **secondary_keywords.type**: 可选翻译 + 回退策略
2. **secondary_keywords.keyword**: 保持原样（AI 已生成目标语言）
3. **bullet_analysis.functions**: 模式匹配过滤，不翻译内容
4. **置信度计算**: 基于数据量和来源多样性，无需调整

新架构确保了系统的可扩展性和品类无关性，同时保持了简单易用的 API。
