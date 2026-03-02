# Welcome Banner 徽章样式设计方案

## 设计理念

为不同类型的页面设计不同风格的徽章，通过颜色、渐变和图标的组合来体现页面的功能特性，让界面更有活力和辨识度。

## 徽章分类与配色方案

### 1. AI 智能类 (蓝色系)
**适用页面**: Q&A Lab, 智能分析等 AI 驱动的功能
- **主色**: 蓝色到靛蓝色渐变
- **图标**: `fa-sparkles` / `fa-clipboard-question` / `fa-brain`
- **渐变**: `linear-gradient(135deg, #3b82f6, #6366f1)`
- **阴影**: `0 2px 8px rgba(59, 130, 246, 0.15)`

### 2. 增长运营类 (绿色系)
**适用页面**: NPI Tracker, PPC 广告, Listing SEO, 促销活动
- **主色**: 翠绿色到祖母绿渐变
- **图标**: `fa-chart-line` / `fa-rocket` / `fa-seedling`
- **渐变**: `linear-gradient(135deg, #10b981, #059669)`
- **阴影**: `0 2px 8px rgba(16, 185, 129, 0.15)`

### 3. 安全合规类 (红色系)
**适用页面**: 账号安全, 品牌侵权, GPSR合规, 绩效通知
- **主色**: 玫瑰红到深红渐变
- **图标**: `fa-shield-halved` / `fa-lock` / `fa-exclamation-triangle`
- **渐变**: `linear-gradient(135deg, #f43f5e, #dc2626)`
- **阴影**: `0 2px 8px rgba(244, 63, 94, 0.15)`

### 4. 客服服务类 (紫色系)
**适用页面**: QA 维护, 差评处理, 邮件模板
- **主色**: 紫色到深紫渐变
- **图标**: `fa-headset` / `fa-comments` / `fa-envelope`
- **渐变**: `linear-gradient(135deg, #a855f7, #7c3aed)`
- **阴影**: `0 2px 8px rgba(168, 85, 247, 0.15)`

### 5. 后端供应链类 (橙色系)
**适用页面**: 库存补货, FBA 发货, 采购质检
- **主色**: 橙色到深橙渐变
- **图标**: `fa-boxes` / `fa-truck` / `fa-warehouse`
- **渐变**: `linear-gradient(135deg, #f97316, #ea580c)`
- **阴影**: `0 2px 8px rgba(249, 115, 22, 0.15)`

### 6. 数据分析类 (青色系)
**适用页面**: 竞品监控, 数据采集
- **主色**: 青色到深青渐变
- **图标**: `fa-chart-bar` / `fa-magnifying-glass-chart` / `fa-database`
- **渐变**: `linear-gradient(135deg, #06b6d4, #0891b2)`
- **阴影**: `0 2px 8px rgba(6, 182, 212, 0.15)`

### 7. 专业工具类 (琥珀色系)
**适用页面**: Master Prompt, 炼金术工场
- **主色**: 琥珀色到金色渐变
- **图标**: `fa-flask` / `fa-wand-magic-sparkles` / `fa-gem`
- **渐变**: `linear-gradient(135deg, #f59e0b, #d97706)`
- **阴影**: `0 2px 8px rgba(245, 158, 11, 0.15)`

### 8. 概览导航类 (灰色系)
**适用页面**: 应用中心, SOPs 概览, Amazon 智库, 更多功能
- **主色**: 石板灰到深灰渐变
- **图标**: `fa-star` / `fa-grid` / `fa-book`
- **渐变**: `linear-gradient(135deg, #64748b, #475569)`
- **阴影**: `0 2px 8px rgba(100, 116, 139, 0.15)`

## CSS 实现方案

### 方案 A: CSS 变量 + 修饰类 (推荐)

```css
/* 基础徽章样式 */
.wb-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: var(--rounded-full, 9999px);
  font-size: var(--text-2xs, 0.625rem);
  font-weight: var(--font-bold, 700);
  color: white;
  background: var(--badge-gradient, linear-gradient(135deg, #3b82f6, #6366f1));
  box-shadow: var(--badge-shadow, 0 2px 8px rgba(59, 130, 246, 0.15));
  letter-spacing: var(--tracking-wider, 0.05em);
  text-transform: uppercase;
  transition: all 200ms ease;
}

/* 徽章主题变体 */
.wb-badge-ai {
  --badge-gradient: linear-gradient(135deg, #3b82f6, #6366f1);
  --badge-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.wb-badge-growth {
  --badge-gradient: linear-gradient(135deg, #10b981, #059669);
  --badge-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

.wb-badge-safety {
  --badge-gradient: linear-gradient(135deg, #f43f5e, #dc2626);
  --badge-shadow: 0 2px 8px rgba(244, 63, 94, 0.15);
}

.wb-badge-service {
  --badge-gradient: linear-gradient(135deg, #a855f7, #7c3aed);
  --badge-shadow: 0 2px 8px rgba(168, 85, 247, 0.15);
}

.wb-badge-supply {
  --badge-gradient: linear-gradient(135deg, #f97316, #ea580c);
  --badge-shadow: 0 2px 8px rgba(249, 115, 22, 0.15);
}

.wb-badge-analytics {
  --badge-gradient: linear-gradient(135deg, #06b6d4, #0891b2);
  --badge-shadow: 0 2px 8px rgba(6, 182, 212, 0.15);
}

.wb-badge-pro {
  --badge-gradient: linear-gradient(135deg, #f59e0b, #d97706);
  --badge-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.wb-badge-hub {
  --badge-gradient: linear-gradient(135deg, #64748b, #475569);
  --badge-shadow: 0 2px 8px rgba(100, 116, 139, 0.15);
}

/* Hover 效果 */
.wb-badge:hover {
  transform: translateY(-1px);
  box-shadow: var(--badge-shadow-hover, 0 4px 12px rgba(59, 130, 246, 0.25));
}
```

### 方案 B: 内联样式 (快速实现)

直接在 HTML 中使用内联样式:

```html
<!-- AI 类 -->
<span class="wb-badge" style="background: linear-gradient(135deg, #3b82f6, #6366f1); box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);">
  <i class="fa-solid fa-sparkles"></i>AI
</span>

<!-- 增长类 -->
<span class="wb-badge" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);">
  <i class="fa-solid fa-chart-line"></i>GROWTH
</span>
```

## 页面映射表

| 页面 | 分类 | 徽章类 | 图标 | 文字 |
|------|------|--------|------|------|
| Q&A Lab | AI 智能 | `wb-badge-ai` | `fa-clipboard-question` | AI |
| 智能分析 | AI 智能 | `wb-badge-ai` | `fa-circle-up` | PRO |
| NPI Tracker | 增长运营 | `wb-badge-growth` | `fa-seedling` | GROWTH |
| PPC 广告 | 增长运营 | `wb-badge-growth` | `fa-chart-line` | GROWTH |
| Listing SEO | 增长运营 | `wb-badge-growth` | `fa-rocket` | SEO |
| 促销活动 | 增长运营 | `wb-badge-growth` | `fa-tags` | PROMO |
| 账号安全 | 安全合规 | `wb-badge-safety` | `fa-shield-halved` | SAFE |
| 品牌侵权 | 安全合规 | `wb-badge-safety` | `fa-lock` | SAFE |
| GPSR合规 | 安全合规 | `wb-badge-safety` | `fa-certificate` | SAFE |
| 绩效通知 | 安全合规 | `wb-badge-safety` | `fa-exclamation-triangle` | ALERT |
| QA 维护 | 客服服务 | `wb-badge-service` | `fa-headset` | SERVICE |
| 差评处理 | 客服服务 | `wb-badge-service` | `fa-comments` | SERVICE |
| 邮件模板 | 客服服务 | `wb-badge-service` | `fa-envelope` | SERVICE |
| 库存补货 | 后端供应链 | `wb-badge-supply` | `fa-boxes` | SUPPLY |
| FBA 发货 | 后端供应链 | `wb-badge-supply` | `fa-truck` | SUPPLY |
| 采购质检 | 后端供应链 | `wb-badge-supply` | `fa-warehouse` | SUPPLY |
| 竞品监控 | 数据分析 | `wb-badge-analytics` | `fa-magnifying-glass-chart` | DATA |
| 数据采集 | 数据分析 | `wb-badge-analytics` | `fa-database` | DATA |
| Master Prompt | 专业工具 | `wb-badge-pro` | `fa-flask` | MASTER |
| 炼金术工场 | 专业工具 | `wb-badge-pro` | `fa-wand-magic-sparkles` | PRO |
| 应用中心 | 概览导航 | `wb-badge-hub` | `fa-star` | HUB |
| SOPs 概览 | 概览导航 | `wb-badge-hub` | `fa-book` | HUB |
| Amazon 智库 | 概览导航 | `wb-badge-hub` | `fa-lightbulb` | HUB |
| 更多功能 | 概览导航 | `wb-badge-hub` | `fa-grid` | MORE |

## 实施步骤

### 步骤 1: 更新 CSS
在 `src/css/components/welcome-banner.css` 中添加徽章主题变体样式。

### 步骤 2: 创建批量更新脚本
创建 Python 脚本根据页面类型自动添加对应的徽章类名和图标。

### 步骤 3: 测试验证
创建测试页面展示所有徽章样式，确保视觉效果符合预期。

### 步骤 4: 批量应用
运行脚本批量更新所有页面的徽章样式。

## 视觉效果预览

```
┌─────────────────────────────────────────────────────────────┐
│  AI 智能类    [✨ AI]     蓝色渐变                          │
│  增长运营类   [📈 GROWTH]  绿色渐变                         │
│  安全合规类   [🛡️ SAFE]    红色渐变                         │
│  客服服务类   [🎧 SERVICE] 紫色渐变                         │
│  后端供应链类 [📦 SUPPLY]  橙色渐变                         │
│  数据分析类   [📊 DATA]    青色渐变                         │
│  专业工具类   [⚗️ PRO]     琥珀色渐变                       │
│  概览导航类   [⭐ HUB]     灰色渐变                         │
└─────────────────────────────────────────────────────────────┘
```

## 优势

1. **视觉层次**: 不同颜色快速区分页面类型
2. **品牌一致性**: 保持统一的设计语言和圆角胶囊形状
3. **可扩展性**: 易于添加新的徽章主题
4. **可维护性**: 使用 CSS 变量，修改方便
5. **用户体验**: 颜色语义化，降低认知负担

## 后续优化

1. **动画效果**: 添加微妙的脉冲或闪烁动画
2. **暗色模式**: 为暗色主题设计对应的徽章样式
3. **响应式**: 移动端自动调整徽章大小和间距
4. **无障碍**: 确保颜色对比度符合 WCAG AA 标准
