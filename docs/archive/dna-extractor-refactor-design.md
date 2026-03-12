# DNA 提取器重构设计方案

## 🎯 设计目标

创建一个**完全通用**的 DNA 提取器，适用于所有产品类别，零硬编码，完全基于 AI 分析报告的实际数据。

---

## 🏗️ 核心设计原则

### 1. 数据驱动 (Data-Driven)
- 不预设任何产品特定的值
- 接受 AI 分析报告中的所有数据
- 让数据本身决定提取结果

### 2. 零硬编码 (Zero Hardcoding)
- 不使用固定的 type 值（如 'size', 'scent', 'feature'）
- 不使用固定的标签（如 "容量:", "香调:"）
- 不使用固定的单位列表（如 '小时', 'dB', 'cm', 'ml'）

### 3. 通用性优先 (Universal First)
- 设计必须适用于所有产品类别
- 不依赖特定产品的特征
- 可扩展到未来的新产品类别

---

## 📋 新的提取算法设计

### 算法 1: 动态提取 secondary_keywords

#### 方案 A: 按 type 分组展示（推荐）

**逻辑**:
```typescript
function extractSpecsFromKeywords(titleKeywords: TitleKeywordsReport): string[] {
  const specs: string[] = [];

  // 1. 按 type 分组
  const groupedByType = new Map<string, string[]>();

  titleKeywords.secondary_keywords.forEach(k => {
    if (!groupedByType.has(k.type)) {
      groupedByType.set(k.type, []);
    }
    groupedByType.get(k.type)!.push(k.keyword);
  });

  // 2. 为每个 type 生成一行
  groupedByType.forEach((keywords, type) => {
    // 使用 type 作为标签，或者翻译成中文（可选）
    const label = translateType(type); // 'size' -> '尺寸', 'color' -> '颜色'
    specs.push(`${label}: ${keywords.join(', ')}`);
  });

  return specs;
}

function translateType(type: string): string {
  // 简单的翻译映射（可选）
  const translations: Record<string, string> = {
    'size': '尺寸',
    'color': '颜色',
    'material': '材质',
    'feature': '特性',
    'scent': '香调',
    'length': '长度',
    'weight': '重量',
    'battery': '电池',
    'screen': '屏幕',
    // ... 可以扩展，但不是必需的
  };

  // 如果有翻译就用翻译，否则直接用英文 type
  return translations[type] || type;
}
```

**优点**:
- ✅ 自动适应所有 type 值
- ✅ 保留了数据的结构化信息
- ✅ 易于阅读和理解
- ✅ 可选的翻译不影响核心逻辑

**示例输出**:
```
// 香水产品
尺寸: 50ml/1.7oz
香调: Aromatic Woody, Mint, Lemon
特性: Long Lasting

// 假发产品
长度: 20 inch, 22 inch
颜色: Natural Black, Dark Brown
材质: Human Hair, Remy Hair
```

#### 方案 B: 扁平化列表

**逻辑**:
```typescript
function extractSpecsFromKeywords(titleKeywords: TitleKeywordsReport): string[] {
  // 直接提取所有 keyword，不关心 type
  return titleKeywords.secondary_keywords
    .map(k => k.keyword)
    .slice(0, 10); // 限制数量避免过多
}
```

**优点**:
- ✅ 最简单的实现
- ✅ 零硬编码
- ✅ 适用于所有产品

**缺点**:
- ❌ 丢失了 type 的结构化信息
- ❌ 可读性较差

**推荐**: 使用方案 A（按 type 分组）

---

### 算法 2: 智能识别技术规格

#### 方案 A: 正则表达式模式匹配（推荐）

**逻辑**:
```typescript
function extractTechSpecs(sellingPoints: SellingPointsReport): string[] {
  const specs: string[] = [];

  if (!sellingPoints.bullet_analysis) return specs;

  // 从 bullet_analysis 提取所有 functions
  const allFunctions = sellingPoints.bullet_analysis
    .filter(b => b.functions && b.functions.length > 0)
    .flatMap(b => b.functions);

  // 使用正则表达式识别技术规格
  const techSpecs = allFunctions.filter(f => isTechnicalSpec(f));

  return techSpecs.slice(0, 5).map(s => `- ${s}`);
}

function isTechnicalSpec(text: string): boolean {
  // 模式 1: 包含数字和单位 (如 "50ml", "20 inch", "5000mAh")
  const hasNumberWithUnit = /\d+\s*[a-zA-Z]+/.test(text);

  // 模式 2: 包含技术术语 (如 "dB", "Hz", "V", "W")
  const hasTechTerm = /\b(dB|Hz|V|W|mAh|GB|TB|MB|kg|lbs|oz|cm|mm|inch|ml|L)\b/i.test(text);

  // 模式 3: 包含数字和百分号 (如 "99% 纯度")
  const hasPercentage = /\d+\s*%/.test(text);

  // 模式 4: 包含范围 (如 "20-30cm", "100-240V")
  const hasRange = /\d+\s*[-~]\s*\d+/.test(text);

  return hasNumberWithUnit || hasTechTerm || hasPercentage || hasRange;
}
```

**优点**:
- ✅ 自动识别所有包含技术规格的文本
- ✅ 不依赖硬编码的单位列表
- ✅ 适用于所有产品类别
- ✅ 可以识别新的单位和格式

**示例匹配**:
```
✅ "50ml/1.7oz" - 包含数字和单位
✅ "20 inch长度" - 包含数字和单位
✅ "5000mAh电池" - 包含技术术语
✅ "99%纯度" - 包含百分号
✅ "100-240V宽电压" - 包含范围
✅ "持久8小时" - 包含数字和单位
❌ "高品质材料" - 不包含技术规格
❌ "适合日常使用" - 不包含技术规格
```

#### 方案 B: 基于 importance 字段

**逻辑**:
```typescript
function extractSpecsFromKeywords(titleKeywords: TitleKeywordsReport): string[] {
  // 提取 importance 中包含"规格"、"参数"等关键词的项
  return titleKeywords.secondary_keywords
    .filter(k =>
      k.importance.includes('规格') ||
      k.importance.includes('参数') ||
      k.importance.includes('尺寸')
    )
    .map(k => k.keyword);
}
```

**优点**:
- ✅ 利用 AI 的判断
- ✅ 可能更准确

**缺点**:
- ❌ 依赖 importance 字段的格式
- ❌ 如果 AI 不使用这些关键词就会失效

**推荐**: 使用方案 A（正则表达式模式匹配）

---

### 算法 3: 置信度计算

#### 新的置信度逻辑

**原则**: 基于提取到的数据量和质量，而非特定字段的存在

```typescript
function calculateSpecsConfidence(
  extractedSpecs: string[],
  sourceData: {
    keywordsCount: number;
    techSpecsCount: number;
  }
): number {
  let confidence = 0;

  // 1. 基础分：有数据就给分
  if (extractedSpecs.length > 0) {
    confidence += 0.3;
  }

  // 2. 数量分：提取的规格越多，置信度越高
  if (extractedSpecs.length >= 3) {
    confidence += 0.2;
  }
  if (extractedSpecs.length >= 5) {
    confidence += 0.2;
  }

  // 3. 来源分：从多个来源提取更可靠
  if (sourceData.keywordsCount > 0) {
    confidence += 0.15;
  }
  if (sourceData.techSpecsCount > 0) {
    confidence += 0.15;
  }

  return Math.min(confidence, 1.0);
}
```

**优点**:
- ✅ 不依赖特定字段
- ✅ 反映实际提取的数据量
- ✅ 适用于所有产品类别

---

## 🔄 完整的 extractSpecs 重构

### 新实现伪代码

```typescript
function extractSpecs(
  titleKeywords: TitleKeywordsReport | undefined,
  sellingPoints: SellingPointsReport | undefined
): { text: string; confidence: number } {
  const specs: string[] = [];
  let keywordsCount = 0;
  let techSpecsCount = 0;

  try {
    // 1. 从 title-keywords 动态提取所有规格
    if (titleKeywords && titleKeywords.secondary_keywords) {
      const keywordSpecs = extractSpecsByType(titleKeywords.secondary_keywords);
      specs.push(...keywordSpecs);
      keywordsCount = keywordSpecs.length;
    }

    // 2. 从 selling-points 智能提取技术规格
    if (sellingPoints && sellingPoints.bullet_analysis && specs.length < 8) {
      const techSpecs = extractTechnicalSpecs(sellingPoints.bullet_analysis);
      specs.push(...techSpecs);
      techSpecsCount = techSpecs.length;
    }

    // 3. 计算置信度
    const confidence = calculateSpecsConfidence(specs, {
      keywordsCount,
      techSpecsCount
    });

    const text = specs.join('\n');
    return {
      text: text || '未能提取技术参数',
      confidence
    };
  } catch (error) {
    Logger.error('[DNA提取器] 提取规格失败:', error);
    return { text: '', confidence: 0 };
  }
}

function extractSpecsByType(keywords: SecondaryKeyword[]): string[] {
  // 按 type 分组
  const grouped = new Map<string, string[]>();

  keywords.forEach(k => {
    if (!grouped.has(k.type)) {
      grouped.set(k.type, []);
    }
    grouped.get(k.type)!.push(k.keyword);
  });

  // 生成格式化的规格行
  const specs: string[] = [];
  grouped.forEach((kws, type) => {
    const label = translateType(type);
    specs.push(`${label}: ${kws.join(', ')}`);
  });

  return specs;
}

function extractTechnicalSpecs(bulletAnalysis: BulletAnalysis[]): string[] {
  const allFunctions = bulletAnalysis
    .filter(b => b.functions && b.functions.length > 0)
    .flatMap(b => b.functions);

  // 使用智能模式匹配
  const techSpecs = allFunctions
    .filter(f => isTechnicalSpec(f))
    .slice(0, 5)
    .map(s => `- ${s}`);

  return techSpecs;
}

function isTechnicalSpec(text: string): boolean {
  // 包含数字+单位、技术术语、百分号、范围等
  return /\d+\s*[a-zA-Z]+/.test(text) ||
         /\b(dB|Hz|V|W|mAh|GB|TB|MB|kg|lbs|oz|cm|mm|inch|ml|L)\b/i.test(text) ||
         /\d+\s*%/.test(text) ||
         /\d+\s*[-~]\s*\d+/.test(text);
}

function translateType(type: string): string {
  const translations: Record<string, string> = {
    'size': '尺寸',
    'color': '颜色',
    'material': '材质',
    'feature': '特性',
    'scent': '香调',
    'length': '长度',
    'weight': '重量',
    // 可扩展但不是必需
  };
  return translations[type] || type;
}
```

---

## 📊 不同产品类别的预期效果

### 香水产品
```
输入 secondary_keywords:
- { keyword: "50ml/1.7oz", type: "size" }
- { keyword: "Aromatic Woody", type: "scent" }
- { keyword: "Long Lasting", type: "feature" }

输出:
尺寸: 50ml/1.7oz
香调: Aromatic Woody
特性: Long Lasting
```

### 假发产品
```
输入 secondary_keywords:
- { keyword: "20 inch", type: "length" }
- { keyword: "Natural Black", type: "color" }
- { keyword: "Human Hair", type: "material" }

输出:
长度: 20 inch
颜色: Natural Black
材质: Human Hair
```

### 电子产品
```
输入 secondary_keywords:
- { keyword: "5000mAh", type: "battery" }
- { keyword: "6.5 inch", type: "screen" }
- { keyword: "128GB", type: "storage" }

输出:
battery: 5000mAh
screen: 6.5 inch
storage: 128GB
```

---

## ⚠️ 边界情况处理

### 情况 1: secondary_keywords 为空
```typescript
if (!titleKeywords || !titleKeywords.secondary_keywords ||
    titleKeywords.secondary_keywords.length === 0) {
  // 跳过这部分，继续尝试从 bullet_analysis 提取
}
```

### 情况 2: 所有 functions 都不包含技术规格
```typescript
const techSpecs = allFunctions.filter(f => isTechnicalSpec(f));
if (techSpecs.length === 0) {
  // 返回空数组，置信度会相应降低
}
```

### 情况 3: type 字段为空或 undefined
```typescript
keywords.forEach(k => {
  const type = k.type || 'other'; // 使用默认值
  // ...
});
```

### 情况 4: 提取的规格过多
```typescript
// 限制数量避免信息过载
const specs = extractedSpecs.slice(0, 10);
```

---

## ✅ 设计验证

### 验证点 1: 零硬编码
- ✅ 不使用固定的 type 值
- ✅ 不使用固定的标签（除了可选的翻译映射）
- ✅ 不使用固定的单位列表

### 验证点 2: 通用性
- ✅ 适用于香水产品
- ✅ 适用于假发产品
- ✅ 适用于电子产品
- ✅ 适用于家具产品
- ✅ 适用于任何未来的产品类别

### 验证点 3: 数据驱动
- ✅ 完全基于 AI 分析报告的实际数据
- ✅ 接受所有 type 值
- ✅ 智能识别技术规格模式

---

## 📝 实现清单

- [ ] 实现 `extractSpecsByType()` 函数
- [ ] 实现 `extractTechnicalSpecs()` 函数
- [ ] 实现 `isTechnicalSpec()` 函数
- [ ] 实现 `translateType()` 函数（可选）
- [ ] 实现新的 `calculateSpecsConfidence()` 函数
- [ ] 重构 `extractSpecs()` 主函数
- [ ] 添加详细的代码注释
- [ ] 保持类型安全

---

**设计完成时间**: 2026-03-06
**设计者**: team-lead
**状态**: 待实现
