# DNA 提取器使用指南

## 概述

DNA 提取器是一个零硬编码、品类无关的产品信息提取系统，能够从 AI 分析报告中自动提取产品的核心要素（目标受众、核心卖点、技术参数）。

## 设计原则

### 1. 零硬编码（Zero Hardcoding）

**定义**: 不预设任何产品属性名称或品类假设。

**实现**:
- 不使用硬编码的类型翻译表
- 不假设产品属性（如"容量"、"香调"、"密度"）
- 直接使用 AI 报告中的原始字段值

**示例**:
```typescript
// ❌ 硬编码方式（旧）
const translations = {
  'size': '尺寸',
  'color': '颜色'
};

// ✅ 零硬编码方式（新）
specs.push(`${type}: ${keyword}`); // 直接使用原始值
```

### 2. 数据驱动（Data-Driven）

**定义**: 完全基于 AI 报告中实际存在的字段和值。

**数据来源**:
- `buyer-profile`: 目标受众信息
- `selling-points`: 核心卖点和功能
- `title-keywords`: 产品关键词和规格

**数据处理原则**:
- `secondary_keywords[].type`: 元数据标签，直接使用
- `secondary_keywords[].keyword`: AI 生成的内容，保持原样
- `bullet_analysis[].functions`: AI 生成的功能描述，模式匹配过滤

### 3. 品类无关（Category-Agnostic）

**定义**: 适用于所有产品品类，无需修改代码。

**支持的品类**:
- ✅ 假发产品
- ✅ 电子产品
- ✅ 化妆品
- ✅ 服装
- ✅ 香水
- ✅ 家电
- ✅ 任意新品类（无需代码修改）

## 使用方法

### 基本使用

```typescript
import { extractProductDNA, canExtractDNA } from './dnaExtractor';

// 1. 检查报告是否可提取
if (canExtractDNA(report)) {
  // 2. 提取产品 DNA
  const dna = extractProductDNA(report);

  if (dna) {
    console.log('目标受众:', dna.audience);
    console.log('核心卖点:', dna.usps);
    console.log('技术参数:', dna.specs);
    console.log('置信度:', dna.confidence);
  }
}
```

### 输出格式

#### 目标受众（audience）
格式: 逗号分隔的特征列表

示例:
```
25-35岁男性, 科技爱好者, 健身达人, 早期采用者, 提升生活品质
```

#### 核心卖点（usps）
格式: 多行列表，每行以 "- " 开头

示例:
```
- 40小时超长续航
- 主动降噪
- IPX7防水
- 蓝牙5.3连接
- 行业领先的续航能力
```

#### 技术参数（specs）
格式: 多行列表，两种格式混合
- `type: value` - 来自 secondary_keywords
- `- value` - 来自 bullet_analysis

示例:
```
battery: 5000mAh
screen_size: 6.7 inch
processor: Snapdragon 8 Gen 2
ram: 12GB
- 120Hz refresh rate
- 50MP main camera
```

### 置信度解读

置信度范围: 0-1（数值越高表示提取质量越好）

| 置信度 | 质量评估 | 说明 |
|--------|---------|------|
| 0.8-1.0 | 优秀 | 数据完整，来源多样 |
| 0.6-0.8 | 良好 | 数据较完整 |
| 0.4-0.6 | 中等 | 数据部分缺失 |
| 0.2-0.4 | 较低 | 数据严重缺失 |
| < 0.2 | 不可用 | 返回 null |

## 支持的产品品类

### 1. 假发产品（Wig Products）

**特有属性**:
- `hair_density`: 密度（如 180% density）
- `lace_size`: 蕾丝尺寸（如 13x4）
- `curl_pattern`: 卷度（如 Body Wave）
- `hair_origin`: 发源（如 Brazilian Hair）
- `cap_size`: 帽围（如 Medium）
- `hair_length`: 发长（如 22 inch）

**提取示例**:
```
hair_density: 180% density
lace_size: 13x4
curl_pattern: Body Wave
hair_origin: Brazilian Hair
color: Natural Black
hair_length: 22 inch
```

**技术规格识别**:
- ✅ 百分号: `180% density`
- ✅ 尺寸: `13x4 lace`
- ✅ 重量: `150g`

### 2. 电子产品（Electronics）

**特有属性**:
- `battery_capacity`: 电池容量（如 5000mAh）
- `screen_size`: 屏幕尺寸（如 6.7 inch）
- `processor`: 处理器（如 Snapdragon 8 Gen 2）
- `memory`: 内存（如 12GB RAM）
- `storage`: 存储（如 256GB）
- `refresh_rate`: 刷新率（如 120Hz）

**提取示例**:
```
battery_capacity: 5000mAh
screen_size: 6.7 inch
processor: Snapdragon 8 Gen 2
memory: 12GB RAM
storage: 256GB
refresh_rate: 120Hz
camera: 50MP
```

**技术规格识别**:
- ✅ 容量单位: `5000mAh`, `256GB`
- ✅ 尺寸: `6.7 inch`
- ✅ 频率: `120Hz`
- ✅ 电压范围: `100-240V`
- ✅ 技术符号: `5V/2A`, `Type-C`

### 3. 化妆品/美妆（Cosmetics/Beauty）

**特有属性**:
- `volume`: 容量（如 50ml）
- `sun_protection`: 防晒指数（如 SPF 50+）
- `shade`: 色号（如 Shade 3）
- `finish`: 效果（如 Matte）
- `coverage`: 遮瑕度（如 Full Coverage）
- `texture`: 质地（如 Lightweight）
- `scent_family`: 香调（如 Floral）

**提取示例**:
```
volume: 50ml
sun_protection: SPF 50+
shade: Shade 3
finish: Matte
coverage: Full Coverage
texture: Lightweight
```

**技术规格识别**:
- ✅ 容量: `50ml`, `1.7oz`
- ✅ 防晒指数: `SPF 50+`
- ✅ 色号: `Shade 3`
- ✅ 百分比: `99% natural`

### 4. 服装（Clothing）

**特有属性**:
- `size_range`: 尺码范围（如 S-XL）
- `material`: 材质（如 Cotton）
- `fit_type`: 版型（如 Slim Fit）
- `sleeve_length`: 袖长（如 Short Sleeve）
- `style`: 风格（如 Casual）
- `color`: 颜色（如 Black）

**提取示例**:
```
size_range: S-XL
material: Cotton
fit_type: Slim Fit
sleeve_length: Short Sleeve
style: Casual
color: Black
```

### 5. 香水（Perfume）

**特有属性**:
- `volume`: 容量（如 50ml/1.7oz）
- `scent`: 香调（如 Aromatic Woody）
- `concentration`: 浓度（如 EDT）
- `longevity`: 留香时间（如 8-hour）

**提取示例**:
```
volume: 50ml/1.7oz
scent: Aromatic Woody
concentration: EDT
feature: Long Lasting
```

### 6. 未知品类（Unknown Categories）

**示例：家电产品**

**特有属性**:
- `capacity`: 容量（如 500L）
- `noise_level`: 噪音（如 40dB）
- `energy_rating`: 能效等级（如 A+++）
- `material`: 材质（如 Stainless Steel）

**提取示例**:
```
capacity: 500L
noise_level: 40dB
energy_rating: A+++
material: Stainless Steel
feature: Smart Control
```

**关键点**: 无需修改代码，系统自动处理任意新品类。

## 技术规格识别

### 识别模式

DNA 提取器使用 6 种通用模式识别技术规格：

#### 1. 数字 + 单位
匹配: `50ml`, `20 inch`, `5000mAh`, `180 density`

正则: `/\d+\s*[a-zA-Z]+/`

#### 2. 字母 + 数字
匹配: `SPF 50`, `Shade 3`, `Type-C`

正则: `/[a-zA-Z]+\s*\d+/`

#### 3. 百分号
匹配: `99%`, `180% density`

正则: `/\d+\s*%/`

#### 4. 范围
匹配: `20-30cm`, `100-240V`, `13x4 lace`

正则: `/\d+\s*[-~x]\s*\d+/i`

#### 5. 小数
匹配: `6.7 inch`, `1.7oz`

正则: `/\d+\.\d+/`

#### 6. 数字-连字符-单位
匹配: `24-hour`, `8-day`, `3-year`

正则: `/\d+\s*-\s*[a-zA-Z]+/`

### 识别示例

| 文本 | 是否识别 | 匹配模式 |
|------|---------|---------|
| `180% density` | ✅ | 百分号 |
| `13x4 lace` | ✅ | 范围 |
| `5000mAh battery` | ✅ | 数字+单位 |
| `SPF 50+ protection` | ✅ | 字母+数字 |
| `6.7 inch screen` | ✅ | 小数 |
| `24-hour wear` | ✅ | 数字-连字符-单位 |
| `soft texture` | ❌ | 无数字 |
| `high quality` | ❌ | 无数字 |

## 扩展支持新品类

### 无需修改代码

由于零硬编码设计，系统自动支持任意新品类，无需修改代码。

### 示例：添加珠宝品类

假设 AI 返回以下数据：

```json
{
  "title-keywords": {
    "secondary_keywords": [
      { "type": "metal_type", "keyword": "18K Gold" },
      { "type": "gemstone", "keyword": "Diamond" },
      { "type": "carat_weight", "keyword": "1.5ct" },
      { "type": "clarity", "keyword": "VS1" },
      { "type": "cut", "keyword": "Round Brilliant" }
    ]
  }
}
```

**提取结果**（无需修改代码）:
```
metal_type: 18K Gold
gemstone: Diamond
carat_weight: 1.5ct
clarity: VS1
cut: Round Brilliant
```

### 如果需要翻译 type

如果需要在 UI 中显示中文标签，应在 UI 层处理：

```typescript
// UI 层翻译（推荐）
const typeLabels: Record<string, string> = {
  'metal_type': '金属类型',
  'gemstone': '宝石',
  'carat_weight': '克拉重量',
  'clarity': '净度',
  'cut': '切工'
};

function displaySpec(type: string, value: string) {
  const label = typeLabels[type] || type;
  return `${label}: ${value}`;
}
```

**为什么在 UI 层翻译？**
1. 保持数据层的纯净性
2. 支持多语言切换
3. 用户可自定义映射
4. 不影响数据提取逻辑

## 最佳实践

### 1. 检查提取可行性

```typescript
if (!canExtractDNA(report)) {
  console.warn('报告数据不足，无法提取 DNA');
  return;
}
```

### 2. 处理提取失败

```typescript
const dna = extractProductDNA(report);

if (!dna) {
  console.warn('提取失败或置信度过低');
  // 显示默认内容或提示用户
  return;
}
```

### 3. 检查置信度

```typescript
if (dna.confidence.specs < 0.5) {
  console.warn('技术参数置信度较低，建议人工审核');
}
```

### 4. 使用元数据

```typescript
console.log('提取时间:', dna.metadata?.extractedAt);
console.log('数据来源:', dna.metadata?.sourceFields);
```

## 常见问题

### Q1: 为什么输出的 type 是英文而不是中文？

**A**: 这是零硬编码设计的核心特性。我们直接使用 AI 返回的原始 type，不做任何翻译。如果需要中文显示，应在 UI 层处理。

**原因**:
- 避免硬编码假设
- 支持任意新品类
- 保持数据层纯净

### Q2: 如何支持新的产品品类？

**A**: 无需任何操作。系统自动支持任意新品类，只要 AI 报告包含相应数据。

### Q3: 技术规格识别不准确怎么办？

**A**: 可以通过以下方式改进：
1. 优化 AI 报告质量
2. 调整 `isTechnicalSpec()` 的模式匹配
3. 在 UI 层添加人工审核功能

### Q4: 置信度如何计算？

**A**: 置信度基于以下因素：
- 数据完整性（有数据就给分）
- 数据数量（越多越好）
- 数据来源（多来源更可靠）

具体权重见源码中的注释。

### Q5: 输出格式可以自定义吗？

**A**: 可以。在调用 `extractProductDNA()` 后，可以对返回的数据进行任意格式化。

## 性能指标

- **执行时间**: 平均 ~61ms（包含测试框架开销）
- **内存占用**: 合理（O(n) 空间复杂度）
- **时间复杂度**: O(n)，其中 n 是数据项数量
- **测试覆盖率**: 96.79%

## 相关文档

- [历史验证归档](../archive/verification/README.md)
- [DNA 提取器相关类型](../../src/modules/app_center/views/master_analysis/types/extendedDNA.ts)
- [Universal DNA Extractor](../../src/modules/app_center/views/master_analysis/services/universalDNAExtractor.ts)

## 更新日志

### v2.0.0 (2026-03-06)
- ✅ 完全移除硬编码翻译（13 种类型）
- ✅ 实现零硬编码架构
- ✅ 支持任意产品品类
- ✅ 改进技术规格识别（6 种模式）
- ✅ 测试覆盖率 96.79%

### v1.0.0
- 初始版本（包含硬编码翻译）
