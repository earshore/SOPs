/**
 * EU marketing calendar UI copy — single source of truth.
 * Keys match docs/superpowers/specs/2026-07-20-eu-marketing-calendar-copy.md
 * Dynamic slots: {year} {n} {term} {country} {start} {end} {list} {label} {yyyy-MM}
 */
export const AMZF_COPY = {
  // 1. 页头 / 信任区
  'page.title': 'EU营销日历',
  'page.description':
    '按站点查看欧洲营销节点，理清备货、提报、广告与复盘节奏。官方大促以 Seller Central 为准。',
  'page.badge.hub': '流量涌入',
  'page.meta.practice': '入门实操宝典',
  'page.meta.tag': '营销日历',
  'page.meta.updated': '更新时间：{yyyy-MM}',
  'page.yearLabel': '运营年 {year}',
  'page.yearHint.historical': '当前查看历史年',
  'page.yearHint.rules': '规则生成 · 部分节点待官方确认',
  'source.panelLabel': '官方口径',
  'source.principle':
    '节日可由规则推算；Amazon 官方活动的资格、报名窗、费用与门槛，以 Seller Central 当期为准。',
  'source.calibratedPrefix': '已录入：',
  'source.link.spring': 'Spring Deal Days 公告',
  'source.link.prime': 'Prime Day 公告',
  'source.link.adsCalendar': 'Ads 零售节日表',

  // 2. 主 Tab / 百科内视图
  'tab.ops': '作业台',
  'tab.encyclopedia': '全年百科',
  'encyclopedia.view.month': '按月份',
  'encyclopedia.view.event': '按活动',
  'year.switch.aria': '选择运营年',

  // 3. 过滤器 / 搜索
  'filter.time.month': '本月',
  'filter.time.d30': '30 天内',
  'filter.time.d60': '60 天内',
  'filter.time.all': '全年',
  'filter.time.hint': '含正在进行中的活动',
  'filter.type.all': '全部类型',
  'filter.type.holiday': '节日礼赠',
  'filter.type.shopping': '电商大促',
  'filter.type.cultural': '文化场景',
  'filter.type.financial': '消费力窗口',
  'filter.type.season': '季节需求',
  'filter.country.all': '全部站点',
  'filter.country.hint': '一次查看一个站点；多站请切换后分别核对',
  'filter.reset': '恢复默认筛选',
  'filter.showEnded': '显示已结束',
  'filter.hideEnded': '隐藏已结束',
  'search.aria': '搜索节日、国家或关键词',
  'search.placeholder': '搜节日、站点、月份或品类，如：德国、3月、Prime Day',
  'search.clear': '清除搜索',
  'search.status': '搜索「{term}」· {country} · {n} 个节点',
  'search.history.title': '搜索历史',
  'search.history.clearAll': '清空',
  'search.history.empty': '暂无搜索历史',
  'search.quick.tags':
    '圣诞、Prime Day、德国、3月、电商大促、黑五、复活节、情人节、母亲节、Spring Deal Days',

  // 4. 统计
  'stats.nodes': '排期节点',
  'stats.watched': '已关注',
  'stats.inventoryOpen': '备货窗内',
  'stats.pending': '待官方确认',
  'stats.doubleCountNote': '同一节点可同时处于多个窗口，分项之和可能大于节点总数',

  // 5. 置信度徽章
  'confidence.exact': '已校准',
  'confidence.computed': '规则生成',
  'confidence.approximate': '约数',
  'confidence.pending_official': '待官方确认',

  // 6. 生命周期 / 倒计时
  'life.daysLeft': '还有 {n} 天',
  'life.daysLeft.zero': '今天开始',
  'life.active': '进行中',
  'life.active.remain': '进行中 · 剩 {n} 天',
  'life.ended': '已结束',
  'life.approxPrefix': '约',
  'life.pendingDate': '日期待官方确认',
  'date.range': '{start}–{end}',
  'phase.barLabel': '备货 · 提报 · 广告 · 执行 · 复盘',
  'phase.openSummary': '当前可推进：{list}',
  'phase.skippedTitle': '本类节点通常无需官方提报',
  'phase.inventory': '备货',
  'phase.enroll': '提报',
  'phase.ads': '广告',
  'phase.execute': '执行',
  'phase.review': '复盘',

  // 7. 主 CTA / 次要动作
  'cta.inventory': '去库存补货',
  'cta.enroll': '去促销提报',
  'cta.promoTools': '去促销工具',
  'cta.ppc': '去广告作业',
  'cta.promoKnowledge': '促销活动知识',
  'cta.executeLocal': '活动中检查',
  'cta.reviewMark': '标记已复盘',
  'cta.pendingSource': '看官方口径',
  'cta.endedReview': '看复盘要点',
  'cta.watch': '关注',
  'cta.watched': '已关注',
  'cta.more': '更多',
  'cta.encyclopedia': '在百科中对比',
  'cta.externalSource': '公告原文',

  // 8. 待确认专区
  'pending.sectionTitle': '待官方确认的大促',
  'pending.lead':
    '下列节点策略可先看；具体日期以 Amazon 公告 / 后台为准，确认后会显示倒计时。',

  // 9. 空态
  'empty.search.title': '没有匹配的节点',
  'empty.search.body': '没有匹配「{term}」的节点。可试站点名、月份或「电商大促」。',
  'empty.search.action': '清除搜索',
  'empty.filter.title': '当前筛选下没有节点',
  'empty.filter.body': '试试放宽类型、站点或时间范围。',
  'empty.filter.action': '恢复默认筛选',
  'empty.yearEnded.title': '今年可见节点已结束',
  'empty.yearEnded.body': '可查看已结束节点，或切换到下一年。',
  'empty.yearEnded.showEnded': '显示已结束',
  'empty.yearEnded.nextYear': '查看 {year}',
  'empty.onlyPending.title': '近 60 天暂无精确排期',
  'empty.onlyPending.body': '大促日期可能尚未公布，可先查看待确认节点。',
  'empty.onlyPending.action': '查看待确认',

  // 10. 卡片内容标签
  'card.strategyTitle': '怎么打',
  'card.descToggle': '活动说明',
  'card.doneBadge': '本节点作战完成',
  'card.eventChecklistTitle': '本节点动作',
  'card.yearBadge': '{year}',
  'eventCheck.inventory': '备货/入仓已确认',
  'eventCheck.enroll': '已提报或确认无需提报',
  'eventCheck.ads': '广告与促销工具已就绪',
  'eventCheck.execute': '活动期盯盘完成',
  'eventCheck.review': '复盘完成',

  // 11. 页面级清单 / 误区
  'pageChecklist.title': '本年度作战习惯',
  'pageChecklist.scan_month':
    '每月初扫描本月营销节点，标记与本品类相关的节日（至少提前 4 周）。',
  'pageChecklist.filter_core_markets':
    '按站点筛选，重点核对德国/英国/法国等主力市场节日。',
  'pageChecklist.inventory_lead':
    '节前 6–8 周完成备货入仓（海运周期 + 清关 + FBA 上架缓冲）。',
  'pageChecklist.promo_margin':
    '节前 2–4 周确认 Coupon/Deal/广告活动资格，核算促销折后利润 ≥ 0。',
  'pageChecklist.preflight_week':
    '节前 1 周检查 Prime 配送、广告预算、关键词本地化和节日素材是否齐全。',
  'pageChecklist.post_review': '节后 1 周内复盘：实际销量 vs 预期、库存周转、ACOS。',
  'pitfalls.title': '常见误区',
  'pitfalls.unified.title': '全站点统一营销节奏',
  'pitfalls.unified.body':
    '→ 各国节日不同（如母亲节日期差异大），需按国家单独规划广告投放。',
  'pitfalls.lateStock.title': '节前才备货',
  'pitfalls.lateStock.body':
    '→ 海运周期 4–6 周 + 清关 1–2 周，必须提前约 6 周完成入仓，否则断货。',
  'pitfalls.mt.title': '忽视小语种节日文案本地化',
  'pitfalls.mt.body':
    '→ 节日关键词必须用目标市场母语，机翻会严重拉低转化率。',
  'pitfalls.allSales.title': '把所有节日都当大促做',
  'pitfalls.allSales.body':
    '→ 区分购物类节日（黑五/Prime Day）与文化类节日；后者重在场景化文案而非一味折扣。',

  // 13. 百科（次级）
  'encyclopedia.monthBadge': '{n} 个活动',
  'encyclopedia.siteBadge': '{n} 个站点',
  'encyclopedia.joinOps': '关注并到作业台',

  // 14. 无障碍 / aria
  'aria.primaryCta': '推荐动作',
  'aria.watch': '关注此营销节点',
  'aria.openPhases': '当前开放作业窗：{list}',
  'aria.confidence': '日期可信度：{label}',
} as const;

export type AmzfCopyKey = keyof typeof AMZF_COPY;
