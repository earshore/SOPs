# EU营销日历 → 运营作业日历 改造规划方案

**Date:** 2026-07-20  
**Status:** Approved — 闭环规格 **v3** · 实施计划与文案终稿已交付  
**Implementation plan:** `docs/superpowers/plans/2026-07-20-eu-marketing-calendar-ops.md`  
**Copy table:** `docs/superpowers/specs/2026-07-20-eu-marketing-calendar-copy.md`  
**Route:** `amz_marketing_calendar`  
**Path:** `/amz-hub/practice/marketing-calendar`  
**Product direction:** B · 运营作业日历（非个性化 OS）  
**时间策略：** **常青模板 + 年度实例**（不是「只做 2026 一年的快照页」）  
**产品完成线：** **M2**（M1 为可演示预览，无关注/清单持久化不算产品完成）  
**锁定决策摘要：**  
- 默认未来 60 天（含进行中）  
- 国家 **单选**（与现网一致）  
- 开放窗最多 **2 个主 CTA**（并行作战）  
- 广告期：**促销工具 + 广告 SOP 双入口**  
- 关注/清单 M2 · 年切换 M2 · pending S 专区

---

## 1. Goal

将现有「欧洲站营销百科浏览页」升级为**可打开即行动、且可跨年复用的运营作业日历**：

1. **作业体验**：默认看到接下来 60 天节点，带倒计时与作业阶段（备货 → 提报 → 广告 → 执行 → 复盘），并跳转配套 SOP/工具。
2. **时间寿命**：核心内容（策略、站点差异、阶段规则、可计算节日）**不因跨年作废**；每年只需做「小成本滚算 + 官方大促校准」，而不是重写 50 条百科。

**成功判据（Acceptance）：**

1. 首次进入默认落在「作业台」视图，无需折叠展开即可看到未来 60 天节点。
2. 每个节点卡片展示：日期区间、剩余天数、**当前开放作业窗**（可多个）、最多 2 个主推荐动作。
3. 支持按 **站点 / 事件类型 / 时间窗（本月·未来30·未来60·全年）** 过滤。
4. 「关注的节点」与页面级动作清单可本地持久化，刷新不丢（关注键绑 **模板 id**，跨年仍有效）。
5. 节点可跳转至：`amz_promo_activities`、`amz_promo_tools`、`sops_promotion_submission`、`sops_inventory_replenishment`、`sops_ppc_advertising`（广告期）。
6. 全年百科双视图（按月 / 按活动）仍可用，作为第二 Tab。
7. 现有单测 + smoke 在改造后仍通过，并补齐作业台 / **滚算引擎** 单测。
8. **多年复用**：给定 `activeYear`（如 2027），在不重写策略文案的前提下，可由模板 + 规则 + 少量年度覆盖生成全年实例；页面展示「运营年」与「待官方确认」状态。

---

## 1.5 核心原则：不是「某一年的日历页」，而是「可滚算的 EU 营销年历系统」

### 问题陈述

若把 50 个节点都写成写死的 `2026-06-23` 快照：

- 2027-01-01 起，作业台大量「已结束」，页面像过期海报；
- 策略文案、分国差异、备货节奏本可复用，却被迫整页重做 → **白费功夫**；
- Amazon 官方日（Prime Day 等）每年都变，本来就不可能一次写死永远准。

因此产品必须拆成两层寿命：

| 层 | 寿命 | 典型内容 |
|----|------|----------|
| **常青层 Evergreen** | 多年有效，偶尔修订 | 名称、描述、策略、tags、站点、类型、优先级、阶段规则、搜索别名 |
| **年度层 Annual** | 每年生成或覆盖 | 具体 `startDate/endDate`、官方来源链接、`verifiedAt`、公告态 |

**结论（产品定义）：**

> EU 营销日历 = **常青运营知识（模板）** × **按年解析出的日期实例** × **官方大促年度校准包**。  
> 用户始终在「当前运营年 / 可选年」上作业；不是在读一本 2026 年刊。

### 三类节点（决定怎么滚年）

```
A. 固定公历日（Fixed）
   元旦 1/1、情人 2/14、万圣 10/31、圣诞 12/25…
   → 规则: fixed(month, day)  自动投影任意 year

B. 可计算浮动日（Computed）
   复活节、多国母亲节（规则因国而异）、父亲节、黑五、网一、
   英国母亲节(Mothering Sunday)、耶稣升天(德父亲节)…
   → 规则: nthWeekday / easterOffset / black_friday …
   → 单测锁死算法，跨年零手工

C. 年度公告 / 约数（Announced | Approximate）
   Prime Day、Spring Deal Days、斋月/开斋、法意西 Soldes、部分音乐节…
   → 默认: 占位 + 状态「待官方确认」或「约数」
   → 每年: yearOverrides[year] 写入真实日期与来源链接
   → 未覆盖时仍展示节点与策略，但不假装精确到日
```

**工作量直觉（每年维护）：**

| 工作项 | 估时 | 说明 |
|--------|------|------|
| 跑滚算生成 year N 实例 | 分钟级 | 启动时 `resolveYear` 即可 |
| 校准 C 类 5～15 个官方/约数节点 | 0.5～1 人日 | 查 SC / AboutAmazon / 历法 |
| 修订常青策略（可选） | 按需 | 玩法变化才改 templates |
| ~~重写 50 条百科~~ | **不做** | 这就是要避免的浪费 |

### 用户可见的「年」

- 页头展示：**运营年 2026**（或用户切换 2027）+ 「常青模板 · 日期已生成」。
- C 类未校准：徽章 **待官方确认** / **约数窗口**，不伪造精确 D-day。
- 跨年关口（11–12 月）：作业台可混入下一年 Q1 已滚算节点，避免元旦白板。

### 年相关明确不做

- 不爬 Amazon 自动改 Prime Day。
- 不在首版做完整伊斯兰历精密库（斋月用年度覆盖或约数，标注 confidence）。
- **禁止** `events.2026.ts` / `events.2027.ts` 全文双份复制（只允许薄 `overrides/YYYY.ts`）。

---

## 2. Non-goals（本阶段明确不做）

| 不做 | 原因 |
|------|------|
| ASIN / 类目智能推荐 | 属方向 C |
| 多用户/团队共享 | 无账号体系 |
| 后端 CMS 改日期 | 客户端 + overrides 文件足够 |
| ICS/CSV 导出 | Phase 4 |
| 自定义卖家节点 | Phase 4 |
| 北美/日站扩展 | 边界 = 欧洲站 |
| 外部日历 API / 爬虫改档期 | 脆弱不可控 |
| 按年全文复制事件库 | **明确禁止** |

---

## 3. 用户与核心场景

### 3.1 主用户

- **EU 站运营（新人～中级）**：需要「现在该准备什么」。
- **二级**：资深运营查某站母亲节差异、黑五备货窗。

### 3.2 核心场景

| ID | 场景 | 期望体验 |
|----|------|----------|
| S1 | 周一打开日历 | 未来 60 天节点 + 当前该做什么（最多 2 个主按钮） |
| S2 | 主力做德国 | **单选**国家 Tab 切到 DE，扫该站节点；多站运营则切换 Tab 分次查看（首版不支持多选） |
| S3 | 进入执行 | 跳转库存 / 提报 / 促销工具 / 广告 SOP |
| S4 | 关注母亲节(DE) | 关注绑 templateId，跨年仍在 |
| S5 | 查全年对比 | 百科 Tab 看多国日期差 |
| S6 | 跨到下一年 | 模板自动出 2027 日期；Prime Day 未公告进「待确认」 |

---

## 4. 信息架构与 UX

### 4.1 页面结构

```
Welcome Banner（标题 + 运营年 + 官方口径）
[作业台 ★默认]  [全年百科]     年份：2026 | 2027（M2）

作业台：
  时间窗 Chip / 类型 Chip / 国家 Tabs / 搜索
  统计：节点 | 关注 | 备货窗内 | 待确认官方
  「接下来」列表 + 阶段条 + CTA
  「待确认官方日」分区（S 级 pending）
  页面级动作清单 + 常见误区

百科：
  按月 | 按活动（现有双视图）
  过滤条件与作业台共享
```

### 4.2 节点卡片最小信息

- 标题中英、类型、站点旗、**year 徽章**（跨年 horizon 时）、**confidence 徽章**
- 日期 + D-day / 进行中 / 已结束
- 阶段条：备货 → 提报 → 广告 → 执行 → 复盘（可多段同时「开放」，高亮全部 open 段）
- 策略摘要、tags
- **主 CTA 区：最多 2 个**（由当前开放窗决定，见 §16.2）
- 次要：关注 | 促销活动知识 | 百科对比 等

### 4.3 默认行为

| 项 | 规则 |
|----|------|
| 默认 Tab | 作业台 |
| 默认时间窗 | 未来 60 天；**含进行中**（见 §17.1 相交规则） |
| 国家 | **单选** ALL 或一国；不支持多选 |
| 默认年 | 当前公历年 |
| horizon | 仅当查看「系统当前年」且 11–12 月时，混入下一年 Q1；**手动锁历史年时不 horizon** |
| 已结束 | 作业台默认隐藏 |
| pending S 级 | 专区展示，不伪造精确倒计时 |
| pending B 级 | 作业台可隐藏，百科仍可见 |

### 4.4 免责声明

> 节日日期按运营年 `{year}` 由常青规则生成或经年度校准；**Amazon 官方活动资格、报名窗口、费用与门槛以 Seller Central 当期为准。** 标「待官方确认 / 约数」的节点请勿当作最终排期。

---

## 5. 领域模型（多年复用优先）

### 5.1 两层数据

```
templates.ts          ← 常青主资产（~50 条，无年份）
dateRules.ts          ← 固定日 / 浮动日算法
overrides/YYYY.ts     ← 薄校准包（通常 <15 条）
       ↓ resolveYear(year)
EventOccurrence[]     ← 运行时实例
       ↓ opsCalendarEngine
OpsEventView[]        ← UI
```

**禁止：** 每年全文复制 50 条。  
**允许：** 只新增/修改 `overrides/2027.ts`。

### 5.2 类型（概念）

```ts
export type IsoDate = string;
export type EventType = 'holiday' | 'shopping' | 'cultural' | 'financial' | 'season';
export type EventPriority = 'S' | 'A' | 'B';
export type PrepPhaseId = 'inventory' | 'enroll' | 'ads' | 'execute' | 'review';
export type DateConfidence = 'exact' | 'computed' | 'approximate' | 'pending_official';

export type DateRule =
  | { kind: 'fixed'; month: number; day: number; durationDays?: number }
  | { kind: 'range_fixed'; startMonth: number; startDay: number; endMonth: number; endDay: number }
  | { kind: 'nth_weekday'; month: number; weekday: 0|1|2|3|4|5|6; nth: number | 'last'; durationDays?: number }
  | { kind: 'easter_offset'; offsetDays: number; durationDays?: number }
  | { kind: 'black_friday' }
  | { kind: 'cyber_monday' }
  | { kind: 'approximate_window'; startMonth: number; startDay: number; endMonth: number; endDay: number }
  | { kind: 'annual_override_only' };

export interface MarketingEventTemplate {
  id: string;              // 无年份：prime-day, christmas, mothers-day-gb-ie
  name: string;
  nameEn: string;
  emoji: string;
  type: EventType;
  priority: EventPriority;
  countries: string[];
  description: string;     // 避免写死「仅 2026」
  strategy: string;
  tags: string[];
  dateRule: DateRule;
  dateLabelPattern?: string;
  prepOverrides?: Partial<Record<PrepPhaseId, { offsetStart: number; offsetEnd: number }>>;
  links?: Array<{ label: string; routeId: string }>;
  amazonOfficial?: boolean;
  contentVerifiedAt?: IsoDate;
}

export interface YearEventOverride {
  templateId: string;
  year: number;
  startDate: IsoDate;
  endDate: IsoDate;
  dateLabel?: string;
  confidence?: DateConfidence;
  /** 覆盖模板站点（Amazon 当年大促覆盖站可能变化） */
  countries?: string[];
  priority?: EventPriority;
  sources?: Array<{ label: string; url: string; verifiedAt?: IsoDate }>;
  disabled?: boolean;
  note?: string;
}

export interface EventOccurrence {
  occurrenceId: string;    // `${templateId}:${year}`
  templateId: string;
  year: number;
  name: string;
  nameEn: string;
  emoji: string;
  type: EventType;
  priority: EventPriority;
  countries: string[];
  description: string;
  strategy: string;
  tags: string[];
  startDate: IsoDate;
  endDate: IsoDate;
  dateLabel: string;
  confidence: DateConfidence;
  sources?: YearEventOverride['sources'];
  links?: MarketingEventTemplate['links'];
  amazonOfficial?: boolean;
  prepOverrides?: MarketingEventTemplate['prepOverrides'];
}

export interface UserCalendarState {
  version: 2;
  activeYear: number;
  selectedCountry: string;
  selectedTypes: EventType[];
  timeWindow: 'month' | 'd30' | 'd60' | 'all';
  mainTab: 'ops' | 'encyclopedia';
  watchedTemplateIds: string[];  // 跨年有效
  checklist: Record<string, boolean>;
  showEnded: boolean;
  updatedAt: string;
}
```

### 5.3 resolveYear 流水线

```
for template in templates:
  override = overrides[year][template.id]
  if override?.disabled → skip
  if override → dates from override, confidence = exact（或指定）
  else by dateRule:
    fixed / nth / easter / bf / cm → computed
    approximate_window → approximate
    annual_override_only → pending_official（占位，不装精确日）
  merge → EventOccurrence
```

### 5.4 阶段规则（常青，与年无关）

窗口**允许重叠**（真实作战并行）。主 CTA **不再**用「单一 phase 赢家通吃」，而用 §16.2 **最多 2 个开放窗主按钮**。

| 类型 / 优先级 | 备货 inventory | 提报 enroll | 广告 ads | 执行 execute | 复盘 review |
|---------------|----------------|-------------|----------|--------------|-------------|
| shopping + S | T-56～T-14 | T-28～T-7 | T-21～T-1 | T0～Tend | Tend+1～+7 |
| shopping + A/B | T-42～T-14 | T-21～T-7 | T-14～T-1 | T0～Tend | Tend+1～+7 |
| holiday / cultural | T-42～T-14 | —（跳过） | T-21～T-1 | T-3～Tend | Tend+1～+7 |
| financial / season | T-35～T-14 | —（跳过） | T-14～T-1 | T0～Tend | Tend+1～+7 |

- 	oday 落在窗内 → 该 phase **open**；阶段条高亮全部 open 段。
- pproximate：示意 +「约」；pending_official：不走精确阶段窗。
- **priority：** Amazon 官方大促 = S；跨国礼赠/大促高峰 = A；单站文化/小节点 = B。

### 5.4.1 高风险历法（禁止图省事）

| 节点 | 正确取向 | 禁止 |
|------|----------|------|
| 英/爱母亲节 | Mothering Sunday（随复活）或年度 override | 3 月固定第 N 周日 |
| 德父亲节 | Easter+39 | 固定公历日 |
| 复活节及相关 | easter_offset | 固定 4 月某日 |
| 黑五/网一 | computed 近似 + 允许 override | 宣称官方唯一日 |
| 斋月/开斋 | override 或 approximate | 首版自研伊斯兰历 |

P0 黄金夹具：Easter、Mothering Sunday、Vatertag、Black Friday、Cyber Monday 的 2025–2028。

### 5.5 跨年衔接

`	s
// 仅查看「系统当前年」时，11–12 月混入下一年 Q1
function getOpsHorizonYears(today: Date, activeYear: number): number[] {
  const systemYear = today.getFullYear();
  if (activeYear !== systemYear) return [activeYear];
  if (today.getMonth() >= 10) return [systemYear, systemYear + 1];
  return [systemYear];
}
`

跨年卡片必须带 **year**；百科分组键为 year + month（避免 1 月撞车）。

### 5.6 年度 Runbook（防腐朽）

| 时间 | 动作 | 产出 |
|------|------|------|
| 每年 11 月 | 预览下一年 computed；准备 override 空壳 | `overrides/YYYY.ts` |
| 官方公告日 | 填 Prime Day / Deal Days + sources | 小 PR |
| 斋月前 2 个月 | 确认伊斯兰节点 | override |
| 每季度 | 抽检策略是否过时 | 只改 templates |
| 元旦 | 自动切运营年；检查 pending | smoke |

**年度 diff 目标：** override ≪ templates；策略一处生效。

### 5.7 现有 50 条归类（迁移打标）

| 归类 | 示例 | 滚年 |
|------|------|------|
| A Fixed | 元旦、情人、万圣、圣诞、国庆类 | 自动 |
| B Computed | 复活、多国母亲节/父亲节、黑五、网一 | 算法 |
| C Override | Prime Day、Spring Deal Days、斋月、Tomorrowland | 每年补丁 |
| C' Approximate | 返校季、Soldes、Holiday Money | 约数窗 |

迁移：**先打标再填规则**，禁止先抄成 2026-only。

### 5.8 迁移步骤

1. `templates.ts` 从 `AMZF_EVENTS` 抽常青字段，id 去年代。  
2. 每条 `dateRule` + `dateRules` 引擎 + 2025–2028 夹具。  
3. 现网 2026 精确日 → `overrides/2026.ts`（第一年校准包，**不是唯一真理源**）。  
4. `resolveYear(2026)` 黄金对比现网。  
5. `resolveYear(2027)` 冒烟：A/B 有日期，C 可 pending。  
6. constants re-export 兼容；类型统一；脏数据在规则层修。

---

## 6. 技术架构

### 6.1 文件

| 路径 | 职责 |
|------|------|
| `data/marketingCalendar/types.ts` | 类型 |
| `data/marketingCalendar/templates.ts` | 常青模板 |
| `data/marketingCalendar/dateRules.ts` | 历法规则 |
| `data/marketingCalendar/prepRules.ts` | 阶段规则 |
| `data/marketingCalendar/overrides/2026.ts` | 年度薄包 |
| `data/marketingCalendar/overrides/index.ts` | year 注册 |
| `data/marketingCalendar/resolveYear.ts` | 解析 |
| `.../opsCalendarEngine.ts` | 过滤/阶段/排序 |
| `.../activeYear.ts` | 运营年 / horizon |
| `.../userState.ts` | `amzf_ops_state_v2` |
| `.../renderOps.ts` / `renderEncyclopedia.ts` | 渲染 |
| `.../index.ts` | 编排 |
| `tests/unit/dateRules.test.ts` 等 | 单测 |

### 6.2 状态

```
activeYear, filters, mainTab, encyclopediaView,
expandedSections, searchHistory, occurrences[], user
```

### 6.3 导航 CTA（出站路由全集）

| CTA | routeId |
|-----|---------|
| 促销活动知识 | `amz_promo_activities` |
| 促销工具 | `amz_promo_tools` |
| 促销提报 | `sops_promotion_submission` |
| 库存补货 | `sops_inventory_replenishment` |
| 广告作业（PPC） | `sops_ppc_advertising` |

### 6.4 约束

- `escapeHtml` / `setSafeHtml`；日期用 y/m/d 本地构造，禁止裸 `new Date('YYYY-MM-DD')`。  
- 不新增日历库。  
- 保留 `#amzf_main`、`#amzf_search` 等关键选择器。

---

## 7. 分阶段交付

### Phase 0 — 多年模型奠基（2.5～3.5 人日）必要投资

- templates 打标 A/B/C + dateRules + overrides/2026  
- resolveYear(2026) 黄金对比；resolveYear(2027) 冒烟  
- opsCalendarEngine + clock  
- 页面先消费 resolve 结果  

**验收：** 2026 不回归；**同一套模板可出 2027**；规则多年度夹具绿。

### Phase 1 — 作业台 MVP（2.5～3.5 人日）

**目标：** 可演示作业台；双主 CTA + 出站/回程；**无持久化 = 技术预览**。

- 主 Tab + 时间窗/类型 Chip + 国家**单选**
- 阶段条 + D-day + **最多 2 主 CTA**（§16.2）
- 默认 60 天**含进行中**；pending 专区（无 sources → 页内官方口径锚点）
- 出站：库存 / 提报 / 促销工具 / **广告 SOP** / 促销活动
- **DoD 反向链：** inventory_replenishment、promo_activities、promo_tools 补回日历
- 页头运营年；单测 + e2e smoke

**验收：** 判据 1–3、5、7、8。**不含**判据 4。

### Phase 2 — 持久化 / 百科 / 跨年（2～2.5 人日）

- watchedTemplateIds、清单、年切换、Nov–Dec horizon  
- 百科 Tab；Runbook README  

### Phase 3 — 内容增强（1～2 人日）

- S 级 sources；BE/IE/TR 审核；overrides/2027 空壳；文案中性化  

### Phase 4 — Backlog

ICS、自定义节点、类目亲和、报名窗字段、深链、精密伊斯兰历。

---

## 8. 测试计划

| 层级 | 覆盖 |
|------|------|
| dateRules | 复活/母亲节/黑五等，锁定 2025–2028 |
| resolveYear | override 优先、disabled、pending |
| 黄金对比 | 2026 关键日与现网对齐 |
| engine | 时间窗、阶段、confidence |
| userState | v2、templateId 关注跨年 |
| module / e2e | mount、年展示、flag smoke |
| 年度回归 | 每年加夹具，不复制业务代码 |

---

## 9. 内容审核清单

1. Amazon 节点站点列表跟**当年**公告进 override。  
2. 斋月/Soldes 允许约数 + 标注。  
3. 网一由规则生成，按 start 月分组。  
4. S 级有 override 时必须有来源链接。  
5. templates 策略不得依赖「仅 2026 正确」的表述。

---

## 10. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 做成 2026 年刊 → 白费 | 模板/规则/override；P0 含 resolve(2027) |
| 算法/日期错 | 多年度夹具 + 黄金对比 + SC 免责 |
| UTC 差一天 | 本地 y/m/d 构造 |
| C 类长期 pending | S 级专区 + Runbook |
| 策略写死年份 | 迁移中性化 + UI 注 year |
| 范围膨胀到 C | Non-goals |

---

## 11. 工作量

| 里程碑 | 内容 | 累计人日 |
|--------|------|----------|
| M0 | 多年模型 + 2026 对齐 | 3～3.5 |
| M1 | 作业台 MVP | 6～7 |
| M2 | 持久化 + 年切换 | 8～9.5 |
| M3 | 内容 + 2027 空壳 | 10～11.5 |

相对「只做一年快照」，M0 **多 1～1.5 人日**，换每年维护 ≪1 人日。  
**首版完成线：M2**（M0 必须含可滚年）。

---

## 12. 系统关系

```
templates + dateRules + overrides/YYYY
        → resolveYear
EU营销日历作业台
  → amz_promo_activities / amz_promo_tools
  → sops_promotion_submission / sops_inventory_replenishment
  → sops_ppc_advertising
```

---

## 13. 已锁定决策（产品批准 · v3）

| # | 决策 | 锁定值 |
|---|------|--------|
| 1 | 默认时间窗 | **未来 60 天，含进行中**（区间相交） |
| 2 | Amazon 站点列表 | **override 可覆写 `countries`** |
| 3 | 关注 | **M2**；键 = `templateId` |
| 4 | 清单 | **M2**；页面级按**年**重置键；事件级可选 |
| 5 | 年切换 UI | **M1 仅当前年**；**M2 暴露切换** |
| 6 | C 类 pending | **S 级作业台专区**；B 级可隐藏 |
| 7 | 国家筛选 | **单选**（不支持多选；多站靠切换 Tab） |
| 8 | 主 CTA 策略 | **开放窗并行，最多 2 个主按钮**（非单一 phase 通吃） |
| 9 | 广告期跳转 | **促销工具 + `sops_ppc_advertising` 双入口** |
| 10 | 产品完成线 | **M2**（M1 = 技术预览） |

---

## 14. 下一步

1. ~~产品批准 / 闭环 v3 / 文案终稿 / Implementation Plan~~ → 已完成  
2. 按 `docs/superpowers/plans/2026-07-20-eu-marketing-calendar-ops.md` **Task 0→8** 执行  
3. 产品完成线仍为 **M2**（Task 7+）

---

## 15. 动作闭环总图（必须全部可走通）

闭环定义：**用户从意图出发 → 系统给出可执行动作 → 状态可回写 → 可再次进入同一上下文，不丢进度。**

```
                    ┌──────────────────────────────────────┐
                    │     常青 templates + dateRules         │
                    │     + overrides[year]                  │
                    └──────────────────┬───────────────────┘
                                       │ resolveYear(activeYear)
                                       ▼
┌──────────┐   过滤/搜索    ┌─────────────────┐   派生阶段    ┌──────────────┐
│ 用户意图  │──────────────▶│ EventOccurrence[]│─────────────▶│ OpsEventView │
└──────────┘                └─────────────────┘              └──────┬───────┘
     ▲                                                              │
     │ 回写 checklist / watch                                       │ 渲染 CTA
     │                                                              ▼
┌────┴─────┐   switch-tab    ┌────────────────────────────────────────────┐
│ userState │◀──返回可再进───│ 库存 / 提报 / 促销工具 / 广告SOP / 促销活动 │
└──────────┘                 └────────────────────────────────────────────┘
```

### 15.1 六条主闭环清单

| 闭环 ID | 名称 | 入口 | 关键动作 | 回写 | 出口/再进入 | 里程碑 |
|---------|------|------|----------|------|-------------|--------|
| L1 | 发现与过滤 | 打开作业台 | 时间窗/国家单选/类型/搜索 | filters → userState（M2） | 列表刷新；空态一键重置 | M1 可用 / M2 持久 |
| L2 | 节点作战 | 节点卡 | 阶段条 + **最多 2 主 CTA** | event checklist（M2） | 跳转后返回可再勾 | M1 CTA / M2 勾选 |
| L3 | 关注作战板 | 关注 | watch toggle | watchedTemplateIds | 置顶；跨年有效 | M2 |
| L4 | 页面节奏清单 | 页底 | 勾选 6 条 | `page:{year}:…` | 刷新不丢；跨年新键 | M2 |
| L5 | 跨模块执行 | CTA | switch-tab | 无 | **反向链回日历** | M1 DoD |
| L6 | 年度滚算与校准 | 年/pending | resolve + override | 内容仓 | pending→可倒计时 | P0+ |

任一条缺「回写」或「再进入」= 方案未闭环，实现不得省略。

---

## 16. L2 节点作战闭环（核心）

### 16.1 生命周期 vs 置信度（正交，勿混成一种状态）

**lifecycle（时间位置）：**

```
upcoming  ──(today ∈ [start,end])──▶ active
upcoming  ──(today > end)──────────▶ ended
active    ──(today > end)──────────▶ ended
pending_official：无可靠 start/end 时单独列表，不参与精确 D-day
```

**confidence（可信度，独立徽章）：** `exact | computed | approximate | pending_official`  
- approximate **仍可以是** upcoming/active，但 UI 一律加「约」，主 CTA 文案避免「必须今日完成」口吻。  
- **禁止**把 approximate「升级成」假 exact。

**开放窗 openPhases：** 由 §5.4 算出今天 open 的 phase 集合（0～N 个）。

### 16.2 主 CTA：最多 2 个（产品锁定）

#### 窗 → 候选按钮

| open phase | 按钮文案 | routeId / 行为 |
|------------|----------|----------------|
| `inventory` | 去库存补货 | `sops_inventory_replenishment` |
| `enroll` | 去促销提报 | `sops_promotion_submission` |
| `ads` | 去促销工具 | `amz_promo_tools` |
| `ads`（第二） | 去广告作业 | `sops_ppc_advertising` |
| `execute` | 活动中清单 | 本地展开事件 checklist |
| `review` | 标记复盘 | 勾选 `event:…:review` |
| （无 open 且 before） | 去库存补货 | `sops_inventory_replenishment` |
| （ended/after） | 查看复盘要点 | 本地展开策略/误区 |
| `pending_official` | 查看官方口径 | **页内锚点** `#amzf_source_panel`；若有 `sources[0]` 再给外链 |

说明：`ads` 开放时，**促销工具 + 广告 SOP 算两个候选**（广告期双入口锁定）。

#### 选取算法（冻结）

```
1. 收集今天 open 的 phase → 映射为候选按钮列表（保序：inventory, enroll, ads工具, ads广告, execute, review）
2. 若候选 > 2：按紧急度排序取前 2
   紧急度 = 该窗 offsetEnd 对应日历日越近越优先（越快关窗越靠前）
   同日：enroll > inventory > ads工具 > ads广告 > execute > review
3. 若候选 = 0：用 before / ended / pending 的默认单按钮
4. 其余动作进「更多」次要区（关注、促销活动知识、百科…）
5. 主按钮 DOM：data-amzf-primary-cta；最多 2 个
6. route 类：data-action="switch-tab" data-tab="..."
```

**示例（shopping + S，T-25）：** inventory 与 enroll 同开 → 主区「去库存补货」「去促销提报」。  
**示例（T-10）：** enroll + ads → 「去促销提报」+（ads 两候选时取紧急度前 2，可能是提报+促销工具，广告 SOP 进更多；若 enroll 已关仅 ads 开 → 「促销工具」「广告作业」并列）。

#### 其它规则

- holiday/cultural：**无 enroll 候选**。  
- pending **无 sources**：禁止死链主按钮；主行动 = 滚动到官方口径区。  
- 跳转 **不自动**勾 checklist（引导闭环）；M2 返回后用户手勾；可选 session 回程高亮卡片。

### 16.3 事件级迷你清单（M2；键名冻结）

```
event:{templateId}:{year}:inventory
event:{templateId}:{year}:enroll
event:{templateId}:{year}:ads
event:{templateId}:{year}:execute
event:{templateId}:{year}:review
```

- 勾选即写 storage。  
- 跳过的 phase 视作自动完成。  
- 全完成 → 角标「本节点作战完成」。  
- 换年用新年键；旧键保留不删。

### 16.4 页面级清单（L4，M2；**按年**键名）

| key | 文案 |
|-----|------|
| `page:{year}:scan_month` | 每月初扫描本月节点… |
| `page:{year}:filter_core_markets` | 按国家筛选，核对 DE/GB/FR… |
| `page:{year}:inventory_lead` | 节前 6–8 周备货入仓… |
| `page:{year}:promo_margin` | 节前 2–4 周确认资格与利润… |
| `page:{year}:preflight_week` | 节前 1 周检查 Prime/预算/素材… |
| `page:{year}:post_review` | 节后 1 周复盘… |

`{year}` = 当前 `activeYear`。换年后清单为空，避免「去年勾过、今年仍勾着」。

---

## 17. L1 发现与过滤闭环

### 17.1 过滤器真值表

| 控件 | 状态字段 | 默认 | 持久化(M2) | 变更后 |
|------|----------|------|------------|--------|
| 主 Tab | `mainTab` | `ops` | 是 | 重渲染对应区 |
| 时间窗 | `timeWindow` | `d60` | 是(M2) | 重算列表 |
| 类型 Chip | `selectedTypes[]` | `[]`=全部 | 是(M2) | 类型多选；再点取消 |
| 国家 Tab | `selectedCountry` | `ALL` 或上次 | 是(M2) | **单选**；与搜索 AND |
| 搜索 | `searchTerm` | `''` | 否 | 300ms debounce |
| 显示已结束 | `showEnded` | false | 是(M2) | 仅作业台 |
| 运营年 | `activeYear` | 当前年 | 是(M2) | re-resolve |

**时间窗相交（冻结，含进行中）：**

```
窗口 W = 
  month: [本月1日, 本月最后一日]
  d30:   [today, today+30]
  d60:   [today, today+60]
  all:   不限制

节点命中 ⇔ 事件区间 [startDate, endDate] 与 W 相交
  即 endDate >= W.start AND startDate <= W.end

pending_official 无精确日：不进 d30/d60/month 主列表；只进「待确认」专区（S）或百科
```

**组合语义：**  
horizon 合并的 occurrences → country → types → timeWindow → (!showEnded) → search → sort。  
**关注优先（M2）：** watched 置顶，再按 startDate 升序。

### 17.2 空态闭环（必须可恢复）

| 空态原因 | 文案要点 | 恢复动作（按钮） |
|----------|----------|------------------|
| 搜索无命中 | 未找到「x」 | 清除搜索 |
| 过滤过窄 | 当前过滤无节点 | 重置为：60 天 + 全部类型 + ALL 站 |
| 全年已结束且隐藏 | 今年节点已过 | 显示已结束 / 切换下一年 |
| pending 且无 upcoming | 大促日未公告 | 查看「待确认」分区 / 打开官方口径 |

每个恢复按钮必须 **一次点击** 回到有内容态（或明确仍无数据的全局空）。

### 17.3 搜索闭环

1. focus → 历史 + 快捷标签  
2. input → debounce → 列表  
3. Enter → 写入 history（≥2 字）+ 收起下拉  
4. 点历史/标签 → 填入 + 搜索 + 可选写入 history  
5. 清除 → term 空 + 恢复时间窗排序  
6. 状态条：`当前搜索 · 站点 · N 个节点 · [清除]`  

保留现有 body portal 下拉定位，避免裁切。

---

## 18. L5 跨模块执行闭环（出得去、回得来）

### 18.1 出站（日历 → 他页）

| 来源 | 机制 | 目标 |
|------|------|------|
| 主/次 CTA | `data-action="switch-tab" data-tab="{routeId}"` | 五条业务路由（含广告 SOP） |
| 官方源 | `<a href sources>` | 外链 |
| 百科内链 | 同页 Tab 切换 | 不丢 filters |

**出站前（M2 建议，低成本）：**  
`sessionStorage.setItem('amzf_return_context', JSON.stringify({ templateId, year, tab:'ops' }))`  
不阻塞导航；目标页**不强制**读（无协议侵入），日历页 on mount 可读并 **scroll/高亮** 对应卡（增强项，P2 可做）。

### 18.2 入站（他页 → 日历）— 必须补齐的反向链

现状：`sops_promotion_submission` 已有回链 `amz_marketing_calendar`。  
改造要求检查并补齐：

| 页面 | 是否已有回日历 | 改造动作 |
|------|----------------|----------|
| `sops_promotion_submission` | 有 | 保持；文案可加「按节点排期」 |
| `sops_inventory_replenishment` | 无（当前代码无回链） | **必须增加**「EU营销日历」按钮 |
| `amz_promo_activities` | 无（仅互链 tools） | **必须增加**日历入口 |
| `amz_promo_tools` | 无（仅互链 activities） | **必须增加**日历入口 |
| `amz_hub` overview | 有入口卡 | 保持 |

反向链也是闭环一部分：**做完 SOP 能回到日历勾选阶段**。

### 18.3 模块内双 Tab 闭环

- 作业台节点 →「在百科中查看」→ 切 encyclopedia + 可选展开对应月/活动组。  
- 百科卡片 →「加入作业 / 关注」→ 切回 ops 并 watch（M2）。  
- 过滤器在两 Tab 间共享，避免「百科筛了德国、作业台又变全部」的断裂。

---

## 19. L3 关注闭环

| 动作 | 行为 |
|------|------|
| 点「关注」 | `watchedTemplateIds` 加入 `templateId`；按钮变「已关注」 |
| 再点 | 移除 |
| 列表 | watched 置顶（同 window 内） |
| 统计 | 「已关注」= 当前 resolve 结果 ∩ watched 的数量 |
| 跨年 | 仍显示已关注模板；新年份自动出现对应 occurrence |
| 清空 | 不提供「一键清空关注」（防误触）；单项取消即可 |

存储：`amzf_ops_state_v2.watchedTemplateIds: string[]`。

---

## 20. L6 年度与内容运营闭环

### 20.1 日期可信度状态 → UI

| confidence | 徽章 | 倒计时 | 阶段条 | 主 CTA |
|------------|------|--------|--------|--------|
| exact | 已校准 | 精确 | 高亮 open 窗 | 最多 2 主 CTA（§16.2） |
| computed | 规则生成 | 精确 | 高亮 open 窗 | 同上 |
| approximate | 约数 | 显示约 / 窗口 | 示意+「约」 | 同上，文案降调 |
| pending_official | 待官方确认 | **不显示假 D-day** | 隐藏 | 页内官方口径锚点 + 可选 sources + 关注 |

### 20.2 内容补丁闭环（人）

```
公告出现 → 编辑 overrides/YYYY.ts
  → sources + start/end + confidence=exact
  → 单测/黄金日更新（若锁定）
  → 发布
  → 用户刷新后 pending 卡自动变 upcoming + 倒计时
```

无需改 templates，除非策略变化。

### 20.3 跨年自动闭环（系统）

```
系统日期进入新年
  → activeYear 默认变新（若用户未手动锁年）
  → resolveYear(newYear)
  → A/B 类立即有日期
  → C 类进 pending 专区直到 override
  → watched 仍有效
  → 旧年 event checklist 保留；新年键为空待勾选
```

用户若在 M2 手动选了 2026，不强制打断；页头提示「当前查看历史年」。

---

## 21. 交互时序（验收剧本）

### 剧本 P-A：周一作战（L1+L2+L5）

1. 进入 `/amz-hub/practice/marketing-calendar`  
2. 默认作业台 + 未来 60 天 + 当前年  
3. 看到 ≥1 张卡（或 pending 专区/空态可恢复）  
4. 点国家 DE → 列表仅含 DE  
5. 若库存+提报窗同开：主区见 **两个**按钮；点「去促销提报」→ `sops_promotion_submission`  
6. 点该页「EU营销日历」回链 → 回到日历  
7. 广告窗开启时主区可见「促销工具」与/或「广告作业」  
8. （M2）勾选该节点 `enroll` → 刷新仍勾选 

### 剧本 P-B：关注跨年（L3+L6）

1. 关注 `prime-day`  
2. 切换 activeYear 2027（或 mock）  
3. 仍显示已关注；若 2027 无 override → pending 专区出现 Prime Day  
4. 写入 override 后变为可倒计时  

### 剧本 P-C：过滤空态恢复（L1）

1. 搜索「不存在的词 xyzabc」→ 空态 + 清除搜索  
2. 清除后列表恢复  
3. 类型只选 financial + 小站可能空 → 「重置过滤」一键恢复默认  

### 剧本 P-D：百科往返（L1 模块内）

1. 作业台 → 百科  
2. 按活动看母亲节多国  
3. 回作业台，国家/搜索条件仍在  

---

## 22. 数据契约（实现冻结名）

### 22.1 Storage

| Key | 内容 |
|-----|------|
| `amzf_search_history` | `string[]` 搜索历史（现有） |
| `amzf_ops_state_v2` | `UserCalendarState` |

### 22.2 DOM 稳定锚点（测试/回归）

| id / attr | 用途 |
|-----------|------|
| `#amzf_main` | 主列表容器 |
| `#amzf_search` | 搜索框 |
| `#amzf_stats` | 统计 |
| `#amzf_country_tabs` | 国家 |
| `#amzf_ops_root` | 作业台根（新增） |
| `#amzf_pending_section` | 待确认专区（新增） |
| `#amzf_page_checklist` | 页面清单（新增） |
| `[data-amzf-occurrence]` | occurrenceId |
| `[data-amzf-template]` | templateId |
| `[data-amzf-open-phases]` | 开放窗列表（逗号分隔） |
| `[data-amzf-primary-cta]` | 主 CTA |
| `[data-amzf-watch]` | 关注按钮 |
| `data-action="switch-tab"` | 出站导航 |

### 22.3 纯函数 API（建议签名）

```ts
// dateRules.ts
function resolveDateRule(rule: DateRule, year: number): { start: IsoDate; end: IsoDate } | null;

// resolveYear.ts
function resolveYear(
  year: number,
  templates: MarketingEventTemplate[],
  overrides: YearEventOverride[]
): EventOccurrence[];

// opsCalendarEngine.ts
function buildOpsViews(
  occurrences: EventOccurrence[],
  filters: {...},
  today: IsoDate,
  watched: Set<string>
): OpsEventView[];

function getOpenPhases(occ: EventOccurrence, today: IsoDate): PrepPhaseId[];
/** 可选：仅用于展示「主状态」文案，不得单独驱动唯一主 CTA */
function getLifecycle(occ: EventOccurrence, today: IsoDate): 'upcoming' | 'active' | 'ended' | 'pending';

function getPrimaryCtas(view: OpsEventView): Array<{
  label: string;
  routeId?: string;
  kind: 'route' | 'link' | 'local' | 'anchor';
  anchorId?: string; // e.g. amzf_source_panel
}>; // length 0..2
```

全部 **可注入 today**，禁止读系统时间散落各处。

---

## 23. 反向依赖改造清单（闭环补洞）

实现日历时同步检查（小改 HTML 即可）：

| 文件 | 动作 |
|------|------|
| `sops/.../promotion_submission/template.html` | 已有回链 → 保持 |
| `sops/.../inventory_replenishment/template.html` | 增加「EU营销日历」按钮（若无） |
| `amz_hub/.../promo_activities/template.html` | 与 promo_tools 互链旁增加日历 |
| `amz_hub/.../promo_tools/template.html` | 同上 |
| `amz_hub/views/overview/template.html` | 卡片描述可改为「作业日历」导向 |

---

## 24. 验收矩阵（Goal ↔ 闭环）

| 成功判据 | 覆盖闭环 | 验证方式 |
|----------|----------|----------|
| 1 默认作业台 60 天 | L1 | 单测默认 filters + 手工 P-A |
| 2 日期/阶段/动作 | L2 | engine 单测 + DOM phase/cta |
| 3 过滤 | L1 | 单测真值表 + P-C |
| 4 关注与清单持久化 | L3 L4 | userState 单测 + 刷新 |
| 5 跳转路由（含广告 SOP） | L5 | 主 CTA data-tab 正确；反向链三页 |
| 6 百科仍在 | L1 模块内 | Tab 切换测试 |
| 7 测试不回退 | — | CI |
| 8 多年复用 | L6 | resolve 2026/2027 + P-B |

---

## 25. 实现任务切片预览（供后续 plans 拆解）

| 切片 | 交付物 | 闭环 |
|------|--------|------|
| T0 | types + templates 打标 + dateRules + overrides/2026 + resolveYear | L6 |
| T1 | opsCalendarEngine + **双主 CTA** 选取 + 时间窗相交 | L2 L1 |
| T2 | template 骨架 + 作业台渲染 + 过滤 Chip（国家单选） | L1 |
| T3 | CTA 五路由 + **三页反向链** + pending 锚点 | L5 |
| T4 | confidence/pending 专区 | L6 |
| T5 | userState v2 + 关注 + 页面清单 | L3 L4 |
| T6 | 百科 Tab + 年切换 + horizon | L1 L6 |
| T7 | 单测/e2e/内容中性化 | 全 |

顺序：T0→T1→T2→T3→T4→T5→T6→T7。每一刀结束应可演示对应闭环。

---

## 附录 A · 一句话产品定义

> **EU 营销日历不是 2026 年刊，而是一套「常青 EU 作战模板 + 每年可滚算日期 + 官方大促校准包」的运营作业系统；作业台消费当前运营年的实例，知识与节奏不随跨年作废。**

## 附录 B · 闭环完整性自检（方案级 · v3）

- [x] 过滤有重置；国家单选  
- [x] 时间窗含进行中（区间相交）  
- [x] 开放窗最多 2 主 CTA；紧急度选取  
- [x] 广告期双入口（工具 + PPC）  
- [x] 跳转 routeId 含广告 SOP  
- [x] 回程反向链列入 P1 DoD  
- [x] 勾选 key 按年；关注绑 templateId  
- [x] pending 无死链（页内锚点）  
- [x] override 可覆写 countries  
- [x] 历法高风险表  
- [x] 完成线 = M2  
- [x] 禁止一年快照式数据复制  

## 附录 C · v3 相对 v2 勘误摘要

| 原漏洞 | v3 处理 |
|--------|---------|
| 单 phase 通吃压死提报 | 最多 2 主 CTA + 紧急度 |
| S2 多站 vs 单 Tab | 场景改为单站切换；首版不支持多选 |
| ads 只去促销工具 | + `sops_ppc_advertising` |
| d60 可能丢掉进行中 | 区间相交规则 |
| override 无站点 | `countries?` |
| page 清单跨年不重置 | `page:{year}:*` |
| approximate 冒充 upcoming 语义 | lifecycle⊥confidence |
| 反向链无 DoD | 写入 Phase 1 |
| 完成线与判据 4 错位 | 完成线 M2 |

---

*方向 B · Approved · 闭环规格 v3。文案调性已认可。残留债务见实现前审计（对话归档）；下一步建议输出 Implementation Plan。*

