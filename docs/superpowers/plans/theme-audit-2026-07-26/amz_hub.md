# AMZ Hub 模块双主题审查报告（2026-07-26）

- 审查范围：11 个路由页面 × 浅色/深色（深色逐页细读，浅色抽查 overview / ecosystem / promo_activities / quality_listing，无浅色回归）
- 截图：`$CLAUDE_JOB_DIR/tmp/audit-amz/batch{1,2,3}/<routeId>-{light,dark}.png`
- 结论：缺陷 15 项（P0×7 / P1×6 / P2×2）。amz_mature_phase 深浅两态基本达标，是唯一近乎干净的页面。

## 缺陷清单

- [P0] amz_promo_activities | 深色桌面端「官方招商经理反复强调的底层逻辑」高亮框：桌面卡片化补丁把背景翻成深色 surface-card-hover，但文字仍是硬编码 #7c2d12 → 深底深字不可读 | src/modules/amz_hub/views/practice/promo_activities/styles.css:365-373 + 761-764 | B
- [P0] amz_promo_activities | 深色桌面端全部节标题/数值深底深字：amzpa_card_title、amzpa_dual_title、amzpa_nav_step_title、amzpa_metric_value、amzpa_sub_title 用不随主题翻转的 var(--color-slate-900)，而桌面补丁(@media min-width:1024px)已把卡片背景翻成深色 token | styles.css:20-24,60-64,351-355,399-403,489-493 + 728-758 | B
- [P0] amz_promo_tools | 同上模式：amzpt_dual_title、amzpt_card_title 等标题 slate-900 压在翻转后的深色卡面上；桌面补丁仅给 --insight/--core 两类 callout 补了文字 token，其余标题全部深底深字 | src/modules/amz_hub/views/practice/promo_tools/styles.css:35-39,363-367 + 786-875（局部修补仅 826-837） | B
- [P0] amz_ecosystem | 顶部三张 content-callout 卡（A10 算法 / Project COSMO / Rufus AI）：组件用 !important 锁死浅色 *-50 背景且无深色变体，内部 text-slate-600/500 被桥接调亮 → 浅底浅字；h2 标题无任何颜色类，继承页面浅色文字后完全不可见 | src/modules/amz_hub/views/knowledge/ecosystem/template.html:22-79 + src/css/components/cards.css:623-706 | B（h2 无色类兼 D）
- [P0] amz_quality_listing | 「对算法：关键词索引」「对买家：0.3 秒决策」两组 content-callout--info/--success：浅底锁死 + text-blue-800/text-emerald-800 被桥接为 300 系浅色 → 浅底浅字 | src/modules/amz_hub/views/practice/quality_listing/template.html:127-146,840 + cards.css:623-706 | B
- [P0] amz_conversion_optimization | 全页 16 处 content-callout 同机制浅底浅字（产品力决定转化阈值 L87、成功产品特征 L95、账号健康 AHR L146、政策合规性 L161、定价/促销策略 L255、配送方式与时效 L276 等） | src/modules/amz_hub/views/advanced/conversion_optimization/template.html + cards.css:623-706 | B
- [P0] amz_new_product_30days | 全页 18 处 content-callout 同机制浅底浅字（实战拆解 L166、特别警示 L173、L187、L195 等） | src/modules/amz_hub/views/advanced/new_product_30days/template.html + cards.css:623-706 | B
- [P1] amz_hub_overview | Hero 横幅深色下仍是浅色渐变孤岛：!important 锁死浅色 radial+linear 渐变背景、wb-title 锁 slate-900、badge 锁 #c2410c | src/modules/amz_hub/amz_hub_style.css:173-204,225-238 | B
- [P1] amz_marketing_calendar | 「官方口径」来源面板深色下为浅色孤岛：硬编码 background #f7fefb / color #134e4a，内部链接 chips 白底 #ffffff | src/modules/amz_hub/views/practice/marketing_calendar/styles.css:170-181,207-215 | B
- [P1] amz_marketing_calendar | 顶部统计 pills（amzf_stat_item）硬编码 #ffffff 白底 + slate-900 文字，深色下成排白色药丸 | styles.css:734-744（由 index.ts:742-777 renderStats 注入） | B
- [P1] amz_eu_insights | 统计卡说明文字深底深字：text-orange-900/75、text-indigo-900/75 —— 带透明度后缀的文字类不在桥接映射内（bg 的 /NN 变体有映射，text 没有） | src/modules/amz_hub/views/knowledge/eu_insights/template.html:99-104 | A（类名：text-orange-900/75、text-indigo-900/75）
- [P1] amz_seo_strategy | 同上：text-blue-900/75、text-purple-900/75 未映射 → 深色 tinted 统计卡上说明文字不可读 | src/modules/amz_hub/views/knowledge/seo_strategy/template.html:81-86 | A（类名：text-blue-900/75、text-purple-900/75）
- [P1] amz_ecosystem | A10 权重环图第一段 backgroundColor '#1E293B'（JS 常量硬编码）深色下与卡片背景融为一体，扇区消失 | src/modules/amz_hub/constants/amz_hub_constants.ts:139 | B
- [P2] amz_hub_overview（全模块编辑态） | contenteditable 聚焦强制 background: white、编辑模式 editable-item 用不翻转的 amber-50 → 深色下白/浅黄块 | amz_hub_style.css:55-59,64-68 | B
- [P2] amz_promo_activities | amzpa_text 正文硬编码 #475569，深色桌面卡上对比度偏低（可读性降级） | styles.css:27-31 | B

## 三条最普遍的跨页模式

1. content-callout 组件浅色锁死 + 桥接调亮文字 = 浅底浅字（4 页命中：ecosystem、quality_listing、conversion_optimization、new_product_30days，合计约 48 处）。cards.css:623-706 用 `background: var(--callout-bg) !important` 固定 *-50 浅底且全部变体无深色覆盖，桥接管不到（非 Tailwind 类），而卡内 Tailwind 文字类被桥接翻亮。修 cards.css 一处（补深色 --callout-bg/--callout-fg）即可批量解决全部相关 P0。
2. 模块 CSS 文字用不翻转的 primitive/hex + 桌面卡片化补丁翻转背景 = 深底深字（promo_activities、promo_tools）。补丁只翻了背景（surface-card / surface-card-hover）没翻文字（--color-slate-900、#7c2d12、#475569），因此缺陷仅出现在 ≥1024px 桌面宽度。文字改用 --color-text-primary/secondary 语义 token 即根治。
3. 桥接够不到的硬编码浅色背景 = 深色浅色孤岛（overview hero 的 !important 渐变、marketing_calendar 的 #f7fefb 面板与 #ffffff pills）。另有一个桥接映射缺口：带透明度后缀的文字类 text-*-900/75 无对应映射（eu_insights、seo_strategy），建议在 utility-bridge 生成器里补 text 端 /NN 变体。

## 达标项

- amz_mature_phase：0 处 content-callout、深浅两态均正常，可作为该模块的目标基线。
- quality_listing 的 48 个 bg-white 绝大多数被桥接正确翻转，仅上述 callout 例外。
- 浅色模式 4 页抽查（overview、ecosystem、promo_activities、quality_listing）无桥接回归。
