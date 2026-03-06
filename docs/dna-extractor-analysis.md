# DNA 提取器问题分析报告

## 📋 执行摘要

dnaExtractor.ts 存在严重的硬编码问题，导致其只适用于特定产品类别（香水），完全不适用于其他产品类别（假发、电子产品、家具等）。

---

## 🔍 问题详细分析

### 问题 1: 硬编码的规格类型过滤

**位置**: `extractSpecs()` 函数，第 163-188 行

**问题代码**:
```typescript
const sizeKeywords = titleKeywords.secondary_keywords
  .filter(k => k.type === 'size')
  .map(k => k.keyword);

const featureKeywords = titleKeywords.secondary_keywords
  .filter(k => k.type === 'feature')
  .map(k => k.keyword);

const scentKeywords = titleKeywords.secondary_keywords
  .filter(k => k.type === 'scent')
  .map(k => k.keyword);

if (sizeKeywords.length > 0) {
  specs.push(`容量: ${sizeKeywords.join(', ')}`);
}

if (scentKeywords.length > 0) {
  specs.push(`香调: ${scentKeywords.join(', ')}`);
}

if (featureKeywords.length > 0) {
  specs.push(`特性: ${featureKeywords.join(', ')}`);
}
```

**为什么这是问题**:
- 只处理 3 种固定的 type：'size', 'scent', 'feature'
- 使用硬编码的中文标签：'容量', '香调', '特性'
- 这些 type 和标签完全是香水产品特定的

**实际情况**:
- AI 分析会根据产品类别动态生成不同的 type
- 假发产品可能有：'length', 'color', 'material', 'texture'
- 电子产品可能有：'battery', 'screen', 'processor', 'storage'
- 家具产品可能有：'dimension', 'material', 'weight', 'style'

**影响**:
- 假发产品的规格信息会被完全忽略
- 只有恰好使用 'size', 'scent', 'feature' 这三个 type 的数据才会被提取
- 导致 specs 字段为空或置信度极低

---

### 问题 2: 硬编码的单位过滤

**位置**: `extractSpecs()` 函数，第 197 行

**问题代码**:
```typescript
const techSpecs = sellingPoints.bullet_analysis
  .filter(b => b.functions && b.functions.length > 0)
  .slice(0, 3)
  .flatMap(b => b.functions)
  .filter(f => f.includes('小时') || f.includes('dB') || f.includes('cm') || f.includes('ml'));
```

**为什么这是问题**:
- 只识别 4 种特定单位：'小时', 'dB', 'cm', 'ml'
- 这些单位主要适用于香水和某些电子产品
- 使用字符串包含检查，不够灵活

**实际情况**:
- 不同产品有完全不同的单位
- 假发：'inch', 'g', 'oz', 'cm'（长度和重量）
- 电子产品：'mAh', 'GB', 'Hz', 'W', 'V'
- 家具：'kg', 'lbs', 'inch', 'cm', 'm'
- 食品：'g', 'ml', 'oz', 'kcal'

**影响**:
- 大量有价值的技术规格被忽略
- 假发的长度（如 "20 inch"）不会被提取
- 电子产品的电池容量（如 "5000mAh"）不会被提取

---

## 📊 数据结构分析

### secondary_keywords 结构

```typescript
interface SecondaryKeyword {
  keyword: string;      // 关键词内容
  type: string;         // 动态类型，由 AI 生成
  importance: string;   // 重要性说明
}
```

**关键发现**:
- `type` 字段是**动态的**，不是预定义的枚举
- AI 会根据产品实际情况生成合适的 type
- 示例数据（香水产品）显示的 type 只是一个特例

**示例数据**（来自 analysisReportData.ts）:
```typescript
secondary_keywords: [
  { keyword: "Long Lasting", type: "feature", importance: "核心卖点词" },
  { keyword: "50ml/1.7oz", type: "size", importance: "规格词" },
  { keyword: "Aromatic Woody", type: "scent", importance: "香调描述" },
  { keyword: "Mint", type: "scent", importance: "香调元素" }
]
```

---

## 🎯 根本原因

1. **设计缺陷**: 基于单一产品类别（香水）的假设进行设计
2. **缺乏抽象**: 没有考虑不同产品类别的通用性
3. **硬编码思维**: 使用具体值而非通用模式

---

## 💡 正确的设计原则

### 原则 1: 数据驱动，零硬编码
- 不预设任何产品特定的 type 值
- 不使用产品特定的标签（如"容量"、"香调"）
- 完全基于 AI 分析报告中实际存在的数据

### 原则 2: 动态适应
- 接受所有 type 值，不进行过滤
- 根据 type 动态生成标签，或直接使用 keyword
- 使用通用的模式识别而非具体值匹配

### 原则 3: 通用性优先
- 设计应适用于所有产品类别
- 不依赖特定产品的特征
- 可扩展到未来的新产品类别

---

## 📈 影响范围

### 受影响的产品类别
- ❌ 假发：规格信息完全丢失
- ❌ 电子产品：大部分技术参数丢失
- ❌ 家具：尺寸和材质信息丢失
- ❌ 服装：尺码和材质信息丢失
- ❌ 食品：营养成分和规格丢失
- ✅ 香水：正常工作（因为代码就是为香水设计的）

### 用户体验影响
- DNA 提取的 specs 字段经常为空
- 置信度异常低
- 用户无法获得完整的产品规格信息
- 降低了 DNA 提取功能的价值

---

## 🔧 修复方向

### 方向 1: 动态提取所有 secondary_keywords
```typescript
// 不过滤 type，提取所有关键词
const allKeywords = titleKeywords.secondary_keywords
  .map(k => `${k.keyword}`)  // 或者 `${k.type}: ${k.keyword}`
  .join(', ');
```

### 方向 2: 智能识别技术规格
```typescript
// 使用正则表达式识别包含数字+单位的文本
const techSpecs = sellingPoints.bullet_analysis
  .flatMap(b => b.functions)
  .filter(f => /\d+\s*[a-zA-Z]+/.test(f));  // 匹配 "数字+单位" 模式
```

### 方向 3: 基于 importance 而非 type
```typescript
// 根据重要性而非类型提取
const importantKeywords = titleKeywords.secondary_keywords
  .filter(k => k.importance.includes('核心') || k.importance.includes('规格'))
  .map(k => k.keyword);
```

---

## 📝 下一步行动

1. ✅ 完成问题分析（本文档）
2. ⏳ 设计新的动态提取方案
3. ⏳ 实现重构代码
4. ⏳ 更新单元测试
5. ⏳ 验证多种产品类别
6. ⏳ 创建 Pull Request

---

**分析完成时间**: 2026-03-06
**分析者**: team-lead
**严重程度**: 高 - 影响所有非香水产品的 DNA 提取
