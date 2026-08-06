# 图表规范（Chart.js Guidelines）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-08-06  
**Owner:** 前端 / 设计系统  
**适用范围:** 全部 Chart.js 图表（现状：Amazon 智库知识模块 radar ×2、doughnut ×1）  
**目标:** 图表用色、图例、可访问性与动效统一；禁止页内随手配色。

> **上位法：** [PRODUCT_PRINCIPLES](./PRODUCT_PRINCIPLES.md) · [THEME_SYSTEM_GUIDELINES](./THEME_SYSTEM_GUIDELINES.md) · [VISUAL_DESIGN_GUIDELINES](./VISUAL_DESIGN_GUIDELINES.md) · [ACCESSIBILITY.md](./ACCESSIBILITY.md)  
> **实现入口：** 图表库唯一入口 `src/common/utils/lazyLibs.ts` 的 `loadChartJs()`（`chart.js/auto`，^4.5.1）；图表数据常量集中在 `src/modules/amz_hub/constants/amz_hub_constants.ts`。

---

## 1. 现状盘点

| 图表 | 位置 | 类型 | 数据 |
| --- | --- | --- | --- |
| A10 算法贡献 | `amz_hub/views/knowledge/ecosystem/index.ts` | doughnut（环形，cutout 70%） | `A10_CHART_DATA`（6 片） |
| SEO 关键词雷达 | `amz_hub/views/knowledge/seo_strategy/index.ts` | radar | `SEO_RADAR_DATA` |
| EU 市场倾向雷达 | `amz_hub/views/knowledge/eu_insights/index.ts` | radar（动态 `updateChart()`） | 国家数据内联 |

现状提示：A10 环形图恰为 6 片（符合 §4 上限），系列色为 `amz_hub_constants.ts` 内硬编码 hex，与固定序列同源（slate / amber / emerald / indigo / blue + slate-400 兜底）；本文规范对新图与重构生效，存量硬编码迁移另计。

## 2. 系列色板（固定序列）

- 数据系列色从全局色阶导出**固定序列**，禁止页内随手配色、禁止按页面主题临时换色。
- 来源：`src/common/config/design-tokens.ts` 的 `COLOR_PALETTES`（生成 CSS 变量 `--color-*`）。模块归属色板 `src/common/constants/colorSchemes.ts` 用于导航 / banner，**不作为**数据系列来源。
- `<canvas>` 不继承 CSS 变量：统一从 `COLOR_PALETTES` 取 500 档值（或运行时 `getComputedStyle` 解析 `--color-*`），禁止页内裸 hex。
- 固定序列（按序取色，禁止跳号自选；≥8 色 + 中性兜底）：

| 序号 | Token（500 档） | 值 |
| --- | --- | --- |
| 1 | `--color-slate-500` | `#64748b`（中性兜底） |
| 2 | `--color-blue-500` | `#3b82f6` |
| 3 | `--color-sky-500` | `#0ea5e9` |
| 4 | `--color-indigo-500` | `#6366f1` |
| 5 | `--color-violet-500` | `#8b5cf6` |
| 6 | `--color-fuchsia-500` | `#d946ef` |
| 7 | `--color-emerald-500` | `#10b981` |
| 8 | `--color-amber-500` | `#f59e0b` |
| 9 | `--color-rose-500` | `#f43f5e` |

- 相邻色相（blue/sky、indigo/violet/fuchsia）在相邻系列中必须配合文字/形状双通道（§5），不得只靠色相差。
- 深色模式：500 档在深底明度不足时，允许同色相 400 档或加边框/点样式提升可辨性；对比度验收见 [ACCESSIBILITY.md](./ACCESSIBILITY.md) §2。

## 3. 图例与数值

- 图例必备（`plugins.legend`）：多系列图开启 legend；环形/饼图图例放右侧（现状 A10 已如此）。
- tooltip 必备：含系列名 + 数值（占比图含百分比）。
- 关键数值**常显**，不只 hover：图例带数值、图下数据表、环形中心文本，三选一（Chart.js 未内置 datalabel 插件，不为此新增依赖）。

## 4. 图表类型与切片

- 饼图/环形图 ≤6 切片；>6 片改用堆叠条形。
- 切片 ≤5% 合并进「Other」。
- 占比图同时展示百分比与绝对数（tooltip 与数据表）。

## 5. 双通道与可访问性

- 颜色 + 形状/文字双通道，不只用颜色表达含义（THEME §3.1 条款 4）。
- `<canvas>` 对屏幕阅读器不可读：图表旁/下方提供**数据表 fallback**（与图数值一致）；canvas 补 `role="img"` + `aria-label` 简述。
- 图例/标注文字对比度遵守 ACCESSIBILITY §2（正文 ≥4.5:1）。

## 6. 动效

- 动画时长 ≤300ms：`options.animation.duration: 300`（对应 `design-tokens.ts` `DURATION` 300 档）。
- 尊重 `prefers-reduced-motion`：`matchMedia('(prefers-reduced-motion: reduce)')` 命中时 `animation: false`；降级后不丢失信息。

## 7. 验收清单

- [ ] 系列色来自固定序列，无页内裸 hex
- [ ] 图例 + tooltip 存在；关键数值常显
- [ ] 环形/饼图 ≤6 片；≤5% 已并入 Other
- [ ] 双通道（文字/形状）；canvas 有 `aria-label`
- [ ] 数据表 fallback 与图数值一致
- [ ] 动效 ≤300ms；`prefers-reduced-motion` 生效

---

## 相关文档

- [THEME_SYSTEM_GUIDELINES.md](./THEME_SYSTEM_GUIDELINES.md)（§3.1 颜色决策 · §4 组件视觉底线）
- [VISUAL_DESIGN_GUIDELINES.md](./VISUAL_DESIGN_GUIDELINES.md)
- [ACCESSIBILITY.md](./ACCESSIBILITY.md)（§2 对比度与 focus）
- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)
