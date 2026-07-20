# EU营销日历 · UI 文案键值终稿表

**Date:** 2026-07-20  
**Status:** Final for implementation  
**Tone:** 资深运营同事指一下——短动词、可执行、敢标不确定；不鸡汤、不系统日志腔  
**Source design:** `docs/superpowers/specs/2026-07-20-eu-marketing-calendar-ops-design.md` v3  

实现时：所有用户可见字符串优先从此表取（或 `copy.ts` 常量与此表一一对应）。**禁止**在渲染里临时发明同义按钮文案。

---

## 1. 页头 / 信任区

| Key | 中文终稿 | 备注 |
|-----|----------|------|
| `page.title` | EU营销日历 | 菜单/路由名保持，不大改 |
| `page.description` | 按站点查看欧洲营销节点，理清备货、提报、广告与复盘节奏。官方大促以 Seller Central 为准。 | 替换「把握每个营销机会」 |
| `page.badge.hub` | 流量涌入 | 可保留现网徽章；非必须改 |
| `page.meta.practice` | 入门实操宝典 | 保留 |
| `page.meta.tag` | 营销日历 | 保留 |
| `page.meta.updated` | 更新时间：{yyyy-MM} | 由发布维护 |
| `page.yearLabel` | 运营年 {year} | 页头显式 |
| `page.yearHint.historical` | 当前查看历史年 | `yearPinned` 且 ≠ 系统年 |
| `page.yearHint.rules` | 规则生成 · 部分节点待官方确认 | 弱提示一行即可 |
| `source.panelLabel` | 官方口径 | **锚点标题**，与 pending CTA 一致 |
| `source.principle` | 节日可由规则推算；Amazon 官方活动的资格、报名窗、费用与门槛，以 Seller Central 当期为准。 | 永久展示 |
| `source.calibratedPrefix` | 已录入： | 仅有 override 精确大促时拼接 |
| `source.link.spring` | Spring Deal Days 公告 | 外链 |
| `source.link.prime` | Prime Day 公告 | 外链 |
| `source.link.adsCalendar` | Ads 零售节日表 | 外链 |

**锚点 id（冻结）：** `amzf_source_panel`（与 `data-amzf` / pending 主 CTA 一致）

---

## 2. 主 Tab / 百科内视图

| Key | 中文终稿 |
|-----|----------|
| `tab.ops` | 作业台 |
| `tab.encyclopedia` | 全年百科 |
| `encyclopedia.view.month` | 按月份 |
| `encyclopedia.view.event` | 按活动 |
| `year.switch.aria` | 选择运营年 |

---

## 3. 过滤器 / 搜索

| Key | 中文终稿 |
|-----|----------|
| `filter.time.month` | 本月 |
| `filter.time.d30` | 30 天内 |
| `filter.time.d60` | 60 天内 |
| `filter.time.all` | 全年 |
| `filter.time.hint` | 含正在进行中的活动 |
| `filter.type.all` | 全部类型 |
| `filter.type.holiday` | 节日礼赠 |
| `filter.type.shopping` | 电商大促 |
| `filter.type.cultural` | 文化场景 |
| `filter.type.financial` | 消费力窗口 |
| `filter.type.season` | 季节需求 |
| `filter.country.all` | 全部站点 |
| `filter.country.hint` | 一次查看一个站点；多站请切换后分别核对 |
| `filter.reset` | 恢复默认筛选 |
| `filter.showEnded` | 显示已结束 |
| `filter.hideEnded` | 隐藏已结束 |
| `search.aria` | 搜索节日、国家或关键词 |
| `search.placeholder` | 搜节日、站点、月份或品类，如：德国、3月、Prime Day |
| `search.clear` | 清除搜索 |
| `search.status` | 搜索「{term}」· {country} · {n} 个节点 |
| `search.history.title` | 搜索历史 |
| `search.history.clearAll` | 清空 |
| `search.history.empty` | 暂无搜索历史 |
| `search.quick.tags` | （沿用逻辑标签：圣诞、Prime Day、德国、3月、电商大促、黑五、复活节、情人节、母亲节、Spring Deal Days） |

---

## 4. 统计

| Key | 中文终稿 | title/说明（可选） |
|-----|----------|-------------------|
| `stats.nodes` | 排期节点 | 当前筛选下的节点数 |
| `stats.watched` | 已关注 | M2；M1 可隐藏 |
| `stats.inventoryOpen` | 备货窗内 | 按窗计数；与节点数可能不一致 |
| `stats.pending` | 待官方确认 | S 级 pending 数 |
| `stats.doubleCountNote` | 同一节点可同时处于多个窗口，分项之和可能大于节点总数 | 脚注或 title |

M1 最小集：`stats.nodes` + `stats.pending`（+ 可选 inventoryOpen）。

---

## 5. 置信度徽章

| Key | 中文终稿 |
|-----|----------|
| `confidence.exact` | 已校准 |
| `confidence.computed` | 规则生成 |
| `confidence.approximate` | 约数 |
| `confidence.pending_official` | 待官方确认 |

---

## 6. 生命周期 / 倒计时

| Key | 中文终稿 | 参数 |
|-----|----------|------|
| `life.daysLeft` | 还有 {n} 天 | n≥1 未开始 |
| `life.daysLeft.zero` | 今天开始 | |
| `life.active` | 进行中 | |
| `life.active.remain` | 进行中 · 剩 {n} 天 | |
| `life.ended` | 已结束 | |
| `life.approxPrefix` | 约 | 接在日期或倒计时前 |
| `life.pendingDate` | 日期待官方确认 | **禁止**假 D-day |
| `date.range` | {start}–{end} | 同日则只显示一日 |
| `phase.barLabel` | 备货 · 提报 · 广告 · 执行 · 复盘 | |
| `phase.openSummary` | 当前可推进：{list} | list 如「备货、提报」 |
| `phase.skippedTitle` | 本类节点通常无需官方提报 | enroll 跳过时 title |

阶段短名：

| phase | 文案 |
|-------|------|
| inventory | 备货 |
| enroll | 提报 |
| ads | 广告 |
| execute | 执行 |
| review | 复盘 |

---

## 7. 主 CTA / 次要动作（闭环出口文案 · 冻结）

| Key | 中文终稿 | 行为 |
|-----|----------|------|
| `cta.inventory` | 去库存补货 | `sops_inventory_replenishment` |
| `cta.enroll` | 去促销提报 | `sops_promotion_submission` |
| `cta.promoTools` | 去促销工具 | `amz_promo_tools` |
| `cta.ppc` | 去广告作业 | `sops_ppc_advertising` |
| `cta.promoKnowledge` | 促销活动知识 | `amz_promo_activities` |
| `cta.executeLocal` | 活动中检查 | 展开事件清单 |
| `cta.reviewMark` | 标记已复盘 | 勾选 review |
| `cta.pendingSource` | 看官方口径 | 滚到 `#amzf_source_panel`；有 sources 可另给外链 |
| `cta.endedReview` | 看复盘要点 | 展开策略/误区 |
| `cta.watch` | 关注 | |
| `cta.watched` | 已关注 | |
| `cta.more` | 更多 | 折叠次要 |
| `cta.encyclopedia` | 在百科中对比 | 切全年百科 |
| `cta.externalSource` | 公告原文 | 外链 sources[0] |

**规则（与设计 §16.2 一致）：**

- 主区最多 **2** 个 `cta.*` 主按钮，文案必须用上表，不得改写成长句。  
- `ads` 开且主区挤不下时：落选的 `cta.promoTools` 或 `cta.ppc` **必须**出现在「更多」里（应做债：广告入口不丢）。  
- pending 无 sources：只用 `cta.pendingSource`（页内锚点），禁止空 `href`。

---

## 8. 待确认专区

| Key | 中文终稿 |
|-----|----------|
| `pending.sectionTitle` | 待官方确认的大促 |
| `pending.lead` | 下列节点策略可先看；具体日期以 Amazon 公告 / 后台为准，确认后会显示倒计时。 |

---

## 9. 空态

| Key | 中文终稿 |
|-----|----------|
| `empty.search.title` | 没有匹配的节点 |
| `empty.search.body` | 没有匹配「{term}」的节点。可试站点名、月份或「电商大促」。 |
| `empty.search.action` | 清除搜索 |
| `empty.filter.title` | 当前筛选下没有节点 |
| `empty.filter.body` | 试试放宽类型、站点或时间范围。 |
| `empty.filter.action` | 恢复默认筛选 |
| `empty.yearEnded.title` | 今年可见节点已结束 |
| `empty.yearEnded.body` | 可查看已结束节点，或切换到下一年。 |
| `empty.yearEnded.showEnded` | 显示已结束 |
| `empty.yearEnded.nextYear` | 查看 {year} |
| `empty.onlyPending.title` | 近 60 天暂无精确排期 |
| `empty.onlyPending.body` | 大促日期可能尚未公布，可先查看待确认节点。 |
| `empty.onlyPending.action` | 查看待确认 |

默认筛选 = 作业台 + 60 天内 + 全部类型 + 全部站点 + 隐藏已结束。

---

## 10. 卡片内容标签

| Key | 中文终稿 |
|-----|----------|
| `card.strategyTitle` | 怎么打 |
| `card.descToggle` | 活动说明 |
| `card.doneBadge` | 本节点作战完成 |
| `card.eventChecklistTitle` | 本节点动作 |
| `card.yearBadge` | {year} |

事件清单项（M2）：

| Key | 中文终稿 |
|-----|----------|
| `eventCheck.inventory` | 备货/入仓已确认 |
| `eventCheck.enroll` | 已提报或确认无需提报 |
| `eventCheck.ads` | 广告与促销工具已就绪 |
| `eventCheck.execute` | 活动期盯盘完成 |
| `eventCheck.review` | 复盘完成 |

---

## 11. 页面级清单 / 误区

| Key | 中文终稿 |
|-----|----------|
| `pageChecklist.title` | 本年度作战习惯 |
| `pageChecklist.scan_month` | 每月初扫描本月营销节点，标记与本品类相关的节日（至少提前 4 周）。 |
| `pageChecklist.filter_core_markets` | 按站点筛选，重点核对德国/英国/法国等主力市场节日。 |
| `pageChecklist.inventory_lead` | 节前 6–8 周完成备货入仓（海运周期 + 清关 + FBA 上架缓冲）。 |
| `pageChecklist.promo_margin` | 节前 2–4 周确认 Coupon/Deal/广告活动资格，核算促销折后利润 ≥ 0。 |
| `pageChecklist.preflight_week` | 节前 1 周检查 Prime 配送、广告预算、关键词本地化和节日素材是否齐全。 |
| `pageChecklist.post_review` | 节后 1 周内复盘：实际销量 vs 预期、库存周转、ACOS。 |
| `pitfalls.title` | 常见误区 |
| `pitfalls.unified.title` | 全站点统一营销节奏 |
| `pitfalls.unified.body` | → 各国节日不同（如母亲节日期差异大），需按国家单独规划广告投放。 |
| `pitfalls.lateStock.title` | 节前才备货 |
| `pitfalls.lateStock.body` | → 海运周期 4–6 周 + 清关 1–2 周，必须提前约 6 周完成入仓，否则断货。 |
| `pitfalls.mt.title` | 忽视小语种节日文案本地化 |
| `pitfalls.mt.body` | → 节日关键词必须用目标市场母语，机翻会严重拉低转化率。 |
| `pitfalls.allSales.title` | 把所有节日都当大促做 |
| `pitfalls.allSales.body` | → 区分购物类节日（黑五/Prime Day）与文化类节日；后者重在场景化文案而非一味折扣。 |

storage key 映射：

- `page:{year}:scan_month` ← `pageChecklist.scan_month`  
- 其余同理：`filter_core_markets` / `inventory_lead` / `promo_margin` / `preflight_week` / `post_review`

---

## 12. 反向链（他页 → 日历）

| 出现位置 | 按钮文案 | data-tab |
|----------|----------|----------|
| 促销提报 / 库存补货 / 促销活动 / 促销工具 | **EU营销日历** | `amz_marketing_calendar` |
| 可选副文案 | 按节点看备货与提报节奏 | — |

统一用目的地名称，不用「返回」。

---

## 13. 百科（次级）

| Key | 中文终稿 |
|-----|----------|
| `encyclopedia.monthBadge` | {n} 个活动 |
| `encyclopedia.siteBadge` | {n} 个站点 |
| `encyclopedia.joinOps` | 关注并到作业台 | M2 |

---

## 14. 无障碍 / aria（摘要）

| Key | 文案 |
|-----|------|
| `aria.primaryCta` | 推荐动作 |
| `aria.watch` | 关注此营销节点 |
| `aria.openPhases` | 当前开放作业窗：{list} |
| `aria.confidence` | 日期可信度：{label} |

---

## 15. 实现约定

1. 新建 `src/modules/amz_hub/data/marketingCalendar/copy.ts`，导出 `AMZF_COPY` 常量对象，键名与上表 `key` 一致（可用嵌套或扁平 `dot` 路径）。  
2. 模板 HTML 中静态文案与 `copy.ts` 保持同步；动态拼接只允许占位替换 `{year}` `{n}` `{term}` 等。  
3. 单测可对主 CTA 文案做 snapshot/断言，防止回归成「查看备货节奏 SOP」类长句。  
4. 改文案只改本表 + `copy.ts`，不在 PR 里散改字符串。

---

*终稿表结束。与实施计划同批交付。*
