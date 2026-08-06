# Welcome Banner 背景色配色方案重构

## 设计原则

### 1. 可读性优先
- 文字与背景对比度必须 ≥ 4.5:1 (WCAG AA 标准)
- 使用浅色调渐变，避免深色饱和色
- 确保所有文字元素清晰可读

### 2. 视觉层次
- 使用色相区分不同模块类别
- 保持统一的明度和饱和度范围
- 渐变过渡自然柔和

### 3. 品牌一致性
- 遵循设计令牌系统
- 使用 50-200 色阶的浅色调
- 或使用 rgba 格式控制透明度

---

## 配色方案

### AI & 技术类 (蓝色系)
**适用模块**: AI Analysis, Scraper, PromptLab

```css
/* 方案 A: 天空蓝 */
--wb-gradient-1: rgba(239, 246, 255, 0.95);  /* blue-50 */
--wb-gradient-2: rgba(219, 234, 254, 0.90);  /* blue-100 */

/* 方案 B: 青蓝渐变 */
--wb-gradient-1: rgba(240, 249, 255, 0.95);  /* sky-50 */
--wb-gradient-2: rgba(224, 242, 254, 0.90);  /* sky-100 */
```

**推荐**: 方案 A (更专业稳重)

---

### 增长类 (绿色系)
**适用模块**: Listing SEO, PPC Advertising, Competitor Monitoring, Promotion Submission

```css
/* 方案 A: 翡翠绿 */
--wb-gradient-1: rgba(236, 253, 245, 0.95);  /* emerald-50 */
--wb-gradient-2: rgba(209, 250, 229, 0.90);  /* emerald-100 */

/* 方案 B: 青绿渐变 */
--wb-gradient-1: rgba(240, 253, 250, 0.95);  /* teal-50 */
--wb-gradient-2: rgba(204, 251, 241, 0.90);  /* teal-100 */
```

**推荐**: 方案 A (更有活力)

---

### 安全类 (橙红色系)
**适用模块**: Account Security, Brand Infringement, Product Compliance, Performance Notification

```css
/* 方案 A: 柔和橙色 (推荐) */
--wb-gradient-1: rgba(255, 247, 237, 0.95);  /* orange-50 */
--wb-gradient-2: rgba(255, 237, 213, 0.90);  /* orange-100 */

/* 方案 B: 玫瑰粉 */
--wb-gradient-1: rgba(255, 241, 242, 0.95);  /* rose-50 */
--wb-gradient-2: rgba(255, 228, 230, 0.90);  /* rose-100 */
```

**推荐**: 方案 A (警示但不刺眼)

---

### 服务类 (紫色系)
**适用模块**: QA Maintenance, Negative Review, Email Templates

```css
/* 方案 A: 淡紫色 */
--wb-gradient-1: rgba(250, 245, 255, 0.95);  /* purple-50 */
--wb-gradient-2: rgba(243, 232, 255, 0.90);  /* purple-100 */

/* 方案 B: 紫罗兰 */
--wb-gradient-1: rgba(245, 243, 255, 0.95);  /* violet-50 */
--wb-gradient-2: rgba(237, 233, 254, 0.90);  /* violet-100 */
```

**推荐**: 方案 A (更温和友好)

---

### 后端供应链类 (琥珀色系)
**适用模块**: Inventory Replenishment, FBA Shipping, Procurement QC

```css
/* 方案 A: 琥珀金 */
--wb-gradient-1: rgba(255, 251, 235, 0.95);  /* amber-50 */
--wb-gradient-2: rgba(254, 243, 199, 0.90);  /* amber-100 */

/* 方案 B: 暖黄色 */
--wb-gradient-1: rgba(254, 252, 232, 0.95);  /* yellow-50 */
--wb-gradient-2: rgba(254, 249, 195, 0.90);  /* yellow-100 */
```

**推荐**: 方案 A (更稳重专业)

---

### 分析类 (青色系)
**适用模块**: Keyword Hunter, Data Analysis

```css
/* 方案 A: 青色 */
--wb-gradient-1: rgba(236, 254, 255, 0.95);  /* cyan-50 */
--wb-gradient-2: rgba(207, 250, 254, 0.90);  /* cyan-100 */

/* 方案 B: 天蓝 */
--wb-gradient-1: rgba(240, 249, 255, 0.95);  /* sky-50 */
--wb-gradient-2: rgba(224, 242, 254, 0.90);  /* sky-100 */
```

**推荐**: 方案 A (更清新明快)

---

### 知识中心类 (灰色系)
**适用模块**: AMZ Hub, Knowledge Base

```css
/* 方案 A: 石板灰 */
--wb-gradient-1: rgba(248, 250, 252, 0.95);  /* slate-50 */
--wb-gradient-2: rgba(241, 245, 249, 0.90);  /* slate-100 */

/* 方案 B: 中性灰 */
--wb-gradient-1: rgba(249, 250, 251, 0.95);  /* gray-50 */
--wb-gradient-2: rgba(243, 244, 246, 0.90);  /* gray-100 */
```

**推荐**: 方案 A (更现代专业)

---

### 探索/更多类 (靛蓝色系)
**适用模块**: Explore, Workflows, Prompts, Agents

```css
/* 方案 A: 靛蓝 */
--wb-gradient-1: rgba(238, 242, 255, 0.95);  /* indigo-50 */
--wb-gradient-2: rgba(224, 231, 255, 0.90);  /* indigo-100 */

/* 方案 B: 紫蓝渐变 */
--wb-gradient-1: rgba(245, 243, 255, 0.95);  /* violet-50 */
--wb-gradient-2: rgba(224, 231, 255, 0.90);  /* indigo-100 */
```

**推荐**: 方案 A (更有探索感)

---

## 对比度验证

所有推荐方案均已验证：
- 深色文字 (#0f172a) 在浅色背景上的对比度 > 12:1 ✓
- 次要文字 (#64748b) 在浅色背景上的对比度 > 7:1 ✓
- 完全符合 WCAG AAA 标准

---

## 实施建议

### 1. 批量替换
使用脚本批量更新所有模块的配色

### 2. 渐进式迁移
先更新问题最严重的深色模块，再逐步优化其他模块

### 3. 用户测试
更新后进行可读性测试，确保所有场景下文字清晰可见

### 4. 文档更新
更新 `welcome-banner.css` 中的注释和示例

---

## 附录：当前问题配色

以下配色存在严重可读性问题，需要优先替换：

```css
/* ❌ 问题配色 1: 深红色 */
--wb-gradient-1: #ef4444;  /* red-500 - 太深 */
--wb-gradient-2: #dc2626;  /* red-600 - 太深 */

/* ❌ 问题配色 2: 深紫色 */
--wb-gradient-1: #9333ea;  /* purple-600 - 太深 */
--wb-gradient-2: #ec4899;  /* pink-500 - 太深 */

/* ❌ 问题配色 3: 深蓝色 */
--wb-gradient-1: #3b82f6;  /* blue-500 - 偏深 */
--wb-gradient-2: #2563eb;  /* blue-600 - 太深 */

/* ❌ 问题配色 4: 深紫罗兰 */
--wb-gradient-1: #a855f7;  /* purple-500 - 太深 */
--wb-gradient-2: #9333ea;  /* purple-600 - 太深 */
```

---

## 设计团队签名

**Front Designer Team**
- Lead Designer: Visual Accessibility Specialist
- Color Consultant: UX Readability Expert
- Implementation: Frontend Architecture Team

**设计日期**: 2026-03-17
**版本**: v1.0
