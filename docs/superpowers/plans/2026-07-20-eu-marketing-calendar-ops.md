# EU营销日历运营作业台 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `amz_marketing_calendar` 从「2026 节日百科浏览页」升级为可跨年滚算的运营作业台：默认 60 天排期、开放窗最多 2 主 CTA、五路出站闭环、关注/清单持久化（M2），策略与规则常青、官方大促靠年度 override。

**Architecture:** 常青 `templates` + `dateRules` + 薄 `overrides/YYYY` 经 `resolveYear` 生成 `EventOccurrence[]`；`opsCalendarEngine` 做时间窗相交、开放窗、双主 CTA；UI 拆 `renderOps` / `renderEncyclopedia`，文案统一 `copy.ts`（见文案终稿表）；用户状态 `amzf_ops_state_v2`。

**Tech Stack:** TypeScript、现有 BaseModule + SafeTemplateLoader、StorageService、Vitest、全站 `data-action="switch-tab"` 导航；不新增日历库。

**Spec:** `docs/superpowers/specs/2026-07-20-eu-marketing-calendar-ops-design.md`  
**Copy:** `docs/superpowers/specs/2026-07-20-eu-marketing-calendar-copy.md`

## Global Constraints

- **完成线 = M2**：M1 可演示但无关注/清单持久化不算产品完成。
- **禁止**按年全文复制 `events.YYYY.ts`；只允许 `templates` + `overrides/YYYY`。
- **主 CTA** 仅由 `getOpenPhases` + `getPrimaryCtas` 驱动，最多 2 个；**禁止**单 phase 赢家通吃。
- **ads 开时**：`cta.promoTools` 与 `cta.ppc` 至少一个在主区，另一个若被挤出必须在「更多」仍可见。
- **时间窗**：事件 `[start,end]` 与窗口相交；**含进行中**；pending 无精确日不进 d30/d60/month 主列表。
- **pending**：禁止假 D-day；无 sources 时主行动 = 滚到 `#amzf_source_panel`。
- **国家单选**；文案全部对齐 copy 终稿表。
- **日期解析**：禁止 `new Date('YYYY-MM-DD')` 裸解析；用 y/m/d 本地构造。
- **出站路由**：`amz_promo_activities` | `amz_promo_tools` | `sops_promotion_submission` | `sops_inventory_replenishment` | `sops_ppc_advertising`。
- **P1 DoD 反向链**：`inventory_replenishment`、`promo_activities`、`promo_tools` 必须有「EU营销日历」按钮；`promotion_submission` 保持。
- **高风险历法**：Mothering Sunday / Easter+39 Vatertag / BF / CM 必须有 2025–2028 夹具；禁止英爱母亲节写成 3 月固定 nth 周日。
- **跳转不自动勾 checklist**（引导闭环）；M2 手勾 + 可选回程高亮。
- **yearPinned**：仅用户点过年份切换才 pin；否则跟系统年。
- **保留**测试锚点 `#amzf_main` `#amzf_search` `#amzf_stats` `#amzf_country_tabs`；新增见 copy/契约。
- **YAGNI**：不做多站多选、ICS、自定义节点、CMS、ASIN 推荐。
- **债务记账**：storage 旧 event 键暂不清理；icon HTML 串沿用；Runbook 人事不进代码。

## File map

| Path | Responsibility |
|------|----------------|
| `src/modules/amz_hub/data/marketingCalendar/types.ts` | 类型 |
| `.../copy.ts` | 文案常量 = 终稿表 |
| `.../dateRules.ts` | 历法规则 |
| `.../prepRules.ts` | 阶段窗表 |
| `.../templates.ts` | 常青模板 |
| `.../overrides/2026.ts` + `index.ts` | 年度校准 |
| `.../resolveYear.ts` | resolve |
| `.../primaryCtas.ts` | 双主 CTA 选取 |
| `views/practice/marketing_calendar/opsCalendarEngine.ts` | 过滤/视图 |
| `.../userState.ts` | v2 持久化 |
| `.../activeYear.ts` | 运营年/horizon |
| `.../renderOps.ts` / `renderEncyclopedia.ts` | HTML |
| `.../index.ts` | BaseModule 编排 |
| `.../template.html` / `styles.css` | 骨架与样式 |
| `tests/unit/dateRules.test.ts` 等 | 单测 |
| SOP/促销模板 HTML | 反向链 |

---

### Task 0: Types + copy + dateRules 核心

**Files:**
- Create: `src/modules/amz_hub/data/marketingCalendar/types.ts`
- Create: `src/modules/amz_hub/data/marketingCalendar/copy.ts`
- Create: `src/modules/amz_hub/data/marketingCalendar/dateRules.ts`
- Create: `tests/unit/marketingCalendar-dateRules.test.ts`

**Interfaces:**
- Produces:
  - `export type IsoDate = string`
  - `export type DateRule = { kind: 'fixed'; month: number; day: number; durationDays?: number } | { kind: 'range_fixed'; ... } | { kind: 'nth_weekday'; month: number; weekday: 0|1|2|3|4|5|6; nth: number | 'last'; durationDays?: number } | { kind: 'easter_offset'; offsetDays: number; durationDays?: number } | { kind: 'black_friday' } | { kind: 'cyber_monday' } | { kind: 'approximate_window'; startMonth: number; startDay: number; endMonth: number; endDay: number } | { kind: 'annual_override_only' } | { kind: 'mothering_sunday' }`
  - `export function parseIsoDateLocal(iso: IsoDate): { y: number; m: number; d: number }`
  - `export function toIsoDate(y: number, m: number, d: number): IsoDate`
  - `export function resolveDateRule(rule: DateRule, year: number): { start: IsoDate; end: IsoDate } | null`
  - `export const AMZF_COPY` — keys from copy final table

- [ ] **Step 1: Write failing dateRules tests**

```ts
// tests/unit/marketingCalendar-dateRules.test.ts
import { describe, expect, it } from 'vitest';
import { resolveDateRule, toIsoDate } from '@/modules/amz_hub/data/marketingCalendar/dateRules';

describe('resolveDateRule', () => {
  it('fixed new year', () => {
    expect(resolveDateRule({ kind: 'fixed', month: 1, day: 1 }, 2026)).toEqual({
      start: '2026-01-01',
      end: '2026-01-01',
    });
  });

  it('black friday 2026 is 2026-11-27', () => {
    expect(resolveDateRule({ kind: 'black_friday' }, 2026)?.start).toBe('2026-11-27');
  });

  it('cyber monday is black friday + 3', () => {
    expect(resolveDateRule({ kind: 'cyber_monday' }, 2026)?.start).toBe('2026-11-30');
  });

  it('easter 2026 is 2026-04-05', () => {
    expect(resolveDateRule({ kind: 'easter_offset', offsetDays: 0 }, 2026)?.start).toBe('2026-04-05');
  });

  it('vatertag 2026 easter+39 is 2026-05-21', () => {
    expect(resolveDateRule({ kind: 'easter_offset', offsetDays: 39 }, 2026)?.start).toBe('2026-05-21');
  });

  it('mothering sunday 2026 is 2026-03-15', () => {
    expect(resolveDateRule({ kind: 'mothering_sunday' }, 2026)?.start).toBe('2026-03-15');
  });

  it('annual_override_only returns null', () => {
    expect(resolveDateRule({ kind: 'annual_override_only' }, 2027)).toBeNull();
  });
});
```

Add 2025–2028 table assertions for Easter / Mothering Sunday / Black Friday in the same file (at least 2025 and 2027 one each).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx vitest run tests/unit/marketingCalendar-dateRules.test.ts`  
Expected: FAIL module not found

- [ ] **Step 3: Implement types, copy.ts (full keys from final table), dateRules.ts**

```ts
// dateRules.ts — 本地 y/m/d，西方复活节 Anonymous Gregorian algorithm
export function resolveDateRule(rule: DateRule, year: number): { start: IsoDate; end: IsoDate } | null {
  // mothering_sunday: 4th Sunday of Lent = Easter − 21 days
  // black_friday: day after 4th Thursday of November
  // cyber_monday: black_friday + 3 days
  // annual_override_only → null
}
```

`copy.ts` must export every key used in Task 4+ rendering; paste values from `2026-07-20-eu-marketing-calendar-copy.md`.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npx vitest run tests/unit/marketingCalendar-dateRules.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/amz_hub/data/marketingCalendar tests/unit/marketingCalendar-dateRules.test.ts docs/superpowers/specs/2026-07-20-eu-marketing-calendar-copy.md
git commit -m "feat(amz-hub): add marketing calendar dateRules and copy constants"
```

---

### Task 1: prepRules + primaryCtas + opsCalendarEngine

**Files:**
- Create: `src/modules/amz_hub/data/marketingCalendar/prepRules.ts`
- Create: `src/modules/amz_hub/data/marketingCalendar/primaryCtas.ts`
- Create: `src/modules/amz_hub/views/practice/marketing_calendar/opsCalendarEngine.ts`
- Create: `tests/unit/marketingCalendar-engine.test.ts`

**Interfaces:**
- Consumes: `EventOccurrence`, `DateRule` resolution outputs, `AMZF_COPY` cta keys
- Produces:
  - `export function getPhaseWindows(occ: EventOccurrence): Array<{ id: PrepPhaseId; start: IsoDate; end: IsoDate }>`
  - `export function getOpenPhases(occ: EventOccurrence, today: IsoDate): PrepPhaseId[]`
  - `export function getLifecycle(occ: EventOccurrence, today: IsoDate): 'upcoming'|'active'|'ended'|'pending'`
  - `export type PrimaryCta = { key: string; label: string; routeId?: string; kind: 'route'|'local'|'anchor'; anchorId?: string }`
  - `export function getPrimaryCtas(occ: EventOccurrence, today: IsoDate): PrimaryCta[]` // length 0..2
  - `export function eventIntersectsWindow(occ: EventOccurrence, window: { start: IsoDate; end: IsoDate } | null): boolean`
  - `export function buildOpsViews(...): OpsEventView[]`

**CTA urgency (frozen):** closer `phaseWindow.end` first; same day: enroll > inventory > promoTools > ppc > execute > review.  
If `ads` open and only one of promoTools/ppc fits in top-2, the other is **not** discarded from UI later — Task 4 renders overflow in「更多」via `getSecondaryCtas`.

Also export:

```ts
export function getSecondaryCtas(occ: EventOccurrence, today: IsoDate, primary: PrimaryCta[]): PrimaryCta[]
// includes any ads candidate not in primary, plus promoKnowledge, etc.
```

- [ ] **Step 1: Write failing engine tests**

```ts
import { describe, expect, it } from 'vitest';
import { getOpenPhases, getPrimaryCtas, eventIntersectsWindow } from '@/modules/amz_hub/views/practice/marketing_calendar/opsCalendarEngine';
// or from primaryCtas / prepRules paths as implemented

const primeLike = {
  occurrenceId: 'prime-day:2026',
  templateId: 'prime-day',
  year: 2026,
  type: 'shopping' as const,
  priority: 'S' as const,
  startDate: '2026-06-23',
  endDate: '2026-06-26',
  confidence: 'exact' as const,
  // ...minimal required fields
};

it('T-25 opens inventory and enroll', () => {
  expect(getOpenPhases(primeLike, '2026-05-29').sort()).toEqual(['enroll', 'inventory'].sort());
});

it('primary ctas max 2 at T-25 are inventory + enroll', () => {
  const ctas = getPrimaryCtas(primeLike, '2026-05-29');
  expect(ctas).toHaveLength(2);
  expect(ctas.map(c => c.routeId).sort()).toEqual([
    'sops_inventory_replenishment',
    'sops_promotion_submission',
  ].sort());
});

it('d60 includes active event', () => {
  expect(
    eventIntersectsWindow(primeLike, { start: '2026-06-24', end: '2026-08-23' })
  ).toBe(true);
});

it('pending has no open phases', () => {
  const p = { ...primeLike, confidence: 'pending_official' as const, startDate: '', endDate: '' };
  expect(getOpenPhases(p as any, '2026-05-01')).toEqual([]);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npx vitest run tests/unit/marketingCalendar-engine.test.ts`

- [ ] **Step 3: Implement prepRules (offset tables from design §5.4), primaryCtas, engine filters**

Phase offsets relative to `startDate` / `endDate` as IsoDate addDays helpers in `dateRules.ts` if needed.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/modules/amz_hub/data/marketingCalendar/prepRules.ts src/modules/amz_hub/data/marketingCalendar/primaryCtas.ts src/modules/amz_hub/views/practice/marketing_calendar/opsCalendarEngine.ts tests/unit/marketingCalendar-engine.test.ts
git commit -m "feat(amz-hub): ops calendar engine and dual primary CTAs"
```

---

### Task 2: templates 迁移 + overrides/2026 + resolveYear

**Files:**
- Create: `src/modules/amz_hub/data/marketingCalendar/templates.ts`
- Create: `src/modules/amz_hub/data/marketingCalendar/overrides/2026.ts`
- Create: `src/modules/amz_hub/data/marketingCalendar/overrides/index.ts`
- Create: `src/modules/amz_hub/data/marketingCalendar/resolveYear.ts`
- Create: `tests/unit/marketingCalendar-resolveYear.test.ts`
- Create: `tests/unit/marketingCalendar-golden-2026.ts` (expected critical dates map)
- Modify: `src/modules/amz_hub/constants/amz_hub_constants.ts` — re-export compatibility layer

**Interfaces:**
- Produces:
  - `export const MARKETING_EVENT_TEMPLATES: MarketingEventTemplate[]`
  - `export function getOverridesForYear(year: number): YearEventOverride[]`
  - `export function resolveYear(year: number): EventOccurrence[]`
- Compatibility:
  - `AMZF_EVENTS` becomes `resolveYear(2026)` mapped to legacy shape **or** deprecated re-export used only until calendar fully switched (prefer single source: calendar imports `resolveYear` only; constants re-exports `resolveYear` helpers for any stragglers).

**Migration rules:**
1. Every current `AMZF_EVENTS` row → one template `id` slug without year.
2. Tag A/B/C/`approximate` per design §5.7.
3. Prime Day / Spring Deal Days → `annual_override_only` + rows in `overrides/2026.ts` with sources URLs from current template.html.
4. Mothering Sunday → `mothering_sunday` rule.
5. Strategy/description: strip hard-coded「仅 2026」where possible (content pass can continue in Task 7).

- [ ] **Step 1: Write resolveYear + golden tests**

```ts
import { resolveYear } from '@/modules/amz_hub/data/marketingCalendar/resolveYear';
import { GOLDEN_2026 } from './marketingCalendar-golden-2026';

it('resolves 2026 prime day from override', () => {
  const prime = resolveYear(2026).find(e => e.templateId === 'prime-day');
  expect(prime?.startDate).toBe('2026-06-23');
  expect(prime?.endDate).toBe('2026-06-26');
  expect(prime?.confidence).toBe('exact');
});

it('2027 prime day is pending without override', () => {
  const prime = resolveYear(2027).find(e => e.templateId === 'prime-day');
  expect(prime?.confidence).toBe('pending_official');
});

it('2026 golden critical dates', () => {
  const map = Object.fromEntries(resolveYear(2026).map(e => [e.templateId, e.startDate]));
  for (const [id, start] of Object.entries(GOLDEN_2026)) {
    expect(map[id], id).toBe(start);
  }
});
```

`GOLDEN_2026` must include at least: `easter`, `mothers-day-gb-ie`, `fathers-day-de`, `black-friday`, `cyber-monday`, `prime-day`, `spring-deal-days` (ids as chosen in templates).

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Migrate all ~50 events; implement resolveYear merge (override wins; countries override optional)**

```ts
export function resolveYear(year: number): EventOccurrence[] {
  // for each template:
  //   if override?.disabled skip
  //   if override → dates + confidence + countries?
  //   else resolveDateRule → computed/approximate or pending if null
}
```

- [ ] **Step 4: Run — PASS**; fix any golden mismatches by correcting rules/overrides (not by deleting tests)

- [ ] **Step 5: Commit**

```bash
git add src/modules/amz_hub/data/marketingCalendar src/modules/amz_hub/constants/amz_hub_constants.ts tests/unit/marketingCalendar-resolveYear.test.ts tests/unit/marketingCalendar-golden-2026.ts
git commit -m "feat(amz-hub): evergreen templates and resolveYear for marketing calendar"
```

---

### Task 3: userState v2 + activeYear

**Files:**
- Create: `src/modules/amz_hub/views/practice/marketing_calendar/userState.ts`
- Create: `src/modules/amz_hub/views/practice/marketing_calendar/activeYear.ts`
- Create: `tests/unit/marketingCalendar-userState.test.ts`

**Interfaces:**
- Produces:
  - `export const OPS_STATE_KEY = 'amzf_ops_state_v2'`
  - `export interface UserCalendarState { version: 2; activeYear: number; yearPinned: boolean; selectedCountry: string; selectedTypes: EventType[]; timeWindow: 'month'|'d30'|'d60'|'all'; mainTab: 'ops'|'encyclopedia'; watchedTemplateIds: string[]; checklist: Record<string, boolean>; showEnded: boolean; updatedAt: string; lastFocusedTemplateId?: string }`
  - `export function loadUserState(storage, systemYear): UserCalendarState`
  - `export function saveUserState(storage, state): void`
  - `export function defaultUserState(systemYear: number): UserCalendarState`
  - `export function getOpsHorizonYears(today: Date, activeYear: number, yearPinned: boolean): number[]`

Default: `timeWindow: 'd60'`, `mainTab: 'ops'`, `selectedCountry: 'ALL'`, `yearPinned: false`.

- [ ] **Step 1: Failing tests for default, pin, checklist year keys, corrupt JSON fallback**

```ts
it('defaults follow system year when not pinned', () => {
  const s = defaultUserState(2026);
  expect(s.activeYear).toBe(2026);
  expect(s.yearPinned).toBe(false);
  expect(s.timeWindow).toBe('d60');
});

it('horizon only when viewing system year', () => {
  expect(getOpsHorizonYears(new Date(2026, 11, 1), 2026, false)).toEqual([2026, 2027]);
  expect(getOpsHorizonYears(new Date(2026, 11, 1), 2025, true)).toEqual([2025]);
});
```

- [ ] **Step 2–4: Implement + PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(amz-hub): marketing calendar userState v2 and activeYear"
```

---

### Task 4: template.html 骨架 + renderOps + styles（作业台 M1 UI）

**Files:**
- Modify: `src/modules/amz_hub/views/practice/marketing_calendar/template.html`
- Create: `src/modules/amz_hub/views/practice/marketing_calendar/renderOps.ts`
- Modify: `src/modules/amz_hub/views/practice/marketing_calendar/styles.css`
- Modify: `src/modules/amz_hub/views/practice/marketing_calendar/index.ts` (wire ops path; may still use old event view until Task 5)

**DOM contracts:**
- `#amzf_source_panel` on official口径 section
- `#amzf_ops_root`, `#amzf_pending_section`, `#amzf_page_checklist`
- Tabs: `[data-amzf-main-tab="ops|encyclopedia"]`
- Time chips: `[data-amzf-time-window="month|d30|d60|all"]`
- Type chips: `[data-amzf-type]`
- Cards: `[data-amzf-occurrence]` `[data-amzf-template]` `[data-amzf-open-phases]` `[data-amzf-primary-cta]` `[data-amzf-secondary-cta]`
- Copy: all labels from `AMZF_COPY`

**Layout debt tight:** mobile — primary CTAs stack full-width or 50/50 flex; min tap 40px.

- [ ] **Step 1: Extend `tests/unit/marketingCalendar.test.ts`** for mount shows 作业台 tab text `AMZF_COPY['tab.ops']`, default 60 天 chip active, source panel id present

- [ ] **Step 2: FAIL then implement template + renderOps list/pending/empty**

Empty actions must call same handlers as filter reset / clear search.

- [ ] **Step 3: PASS unit tests**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(amz-hub): marketing calendar ops workbench UI shell"
```

---

### Task 5: index 编排完整 + 搜索/过滤 + 百科 renderEncyclopedia

**Files:**
- Modify: `index.ts` — consume `resolveYear`, engine, renderOps/Encyclopedia, userState (load filters even if M1 does not persist until Task 6 — **M1: memory only**; Task 6 flips persistence)
- Create: `renderEncyclopedia.ts` — port country/event views from current index
- Keep search history key `amzf_search_history`

**Behavior M1:**
- Filters in module state only (no save) OR save early — **Constraint: product M1 = no watch/checklist persist; filters may persist early if cheap — prefer persist all userState from Task 6 only to avoid half states.** M1: in-memory defaults each mount except search history.

- [ ] **Step 1: Update marketingCalendar.test.ts** for country filter, time window, dual CTA presence on a known fixture date via injected today if needed

Expose test hook only if required:

```ts
// optional for tests
export function setTodayForTests(iso: IsoDate | null): void
```

Prefer pure render functions tested with fixed `today` without private hooks.

- [ ] **Step 2–4: Implement switch main tab, encyclopedia month/event, search score (reuse logic from current index, operate on EventOccurrence)**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(amz-hub): wire marketing calendar filters encyclopedia and search"
```

---

### Task 6: 出站五路由 + 反向链三页 + pending 锚点（L5 闭环）

**Files:**
- Modify: `renderOps.ts` / `index.ts` — primary CTA buttons
- Modify: `src/modules/sops/views/backend/inventory_replenishment/template.html`
- Modify: `src/modules/amz_hub/views/practice/promo_activities/template.html`
- Modify: `src/modules/amz_hub/views/practice/promo_tools/template.html`
- Optionally: `sops/.../promotion_submission/template.html` subtitle only

**Reverse link snippet (exact copy):**

```html
<button type="button" data-action="switch-tab" data-tab="amz_marketing_calendar"
  class="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs text-indigo-700 hover:bg-indigo-100 transition-colors">
  <i class="fas fa-calendar-alt mr-1"></i>EU营销日历
</button>
```

Place in existing「相关知识」or dual-card row.

- [ ] **Step 1: Unit test primary CTA data-tab attributes for open ads window includes ppc and/or promo tools; secondary includes the other**

- [ ] **Step 2: Grep test or simple file assertion test that three templates contain `amz_marketing_calendar`**

```ts
// tests/unit/marketingCalendar-backlinks.test.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const files = [
  'src/modules/sops/views/backend/inventory_replenishment/template.html',
  'src/modules/amz_hub/views/practice/promo_activities/template.html',
  'src/modules/amz_hub/views/practice/promo_tools/template.html',
];
for (const f of files) {
  it(`backlink in ${f}`, () => {
    expect(readFileSync(join(process.cwd(), f), 'utf8')).toContain('amz_marketing_calendar');
  });
}
```

- [ ] **Step 3: Implement + PASS**

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(amz-hub): calendar outbound CTAs and reverse links for closed loop"
```

---

### Task 7: 持久化 M2 — watch、page checklist、year switch、回程高亮

**Files:**
- Modify: `userState.ts`, `index.ts`, `renderOps.ts`, `template.html`
- Modify: `tests/unit/marketingCalendar-userState.test.ts`, `marketingCalendar.test.ts`

**Behavior:**
- load/save on change of filters, watch, checklist, mainTab, year
- page keys: `page:${activeYear}:scan_month` etc.
- event keys: `event:${templateId}:${year}:${phase}`
- year switch UI (M2); setting year sets `yearPinned=true`
- on outbound primary CTA: `sessionStorage.setItem('amzf_return_context', JSON.stringify({ templateId, year }))`
- on mount: read context, scrollIntoView `[data-amzf-template="..."]`, then remove key

- [ ] **Step 1: Tests — watch persists via storage.set; checklist year key; return context scroll (jsdom partial OK)**

- [ ] **Step 2–4: Implement + PASS**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(amz-hub): persist calendar ops state watch checklist and year pin"
```

---

### Task 8: 内容中性化 + overrides/2027 空壳 + 类型清理 + 回归

**Files:**
- Modify: templates strategy strings (remove obsolete 2026-only claims where safe)
- Create: `overrides/2027.ts` empty array or pending-only notes
- Modify: `src/types/modules-business.d.ts` MarketingEvent alignment or mark legacy
- Ensure `amz_hub_constants` does not dual-maintain full event bodies
- Run full related tests + e2e smoke if available

- [ ] **Step 1: Run unit suite**

```bash
npx vitest run tests/unit/marketingCalendar-dateRules.test.ts tests/unit/marketingCalendar-engine.test.ts tests/unit/marketingCalendar-resolveYear.test.ts tests/unit/marketingCalendar-userState.test.ts tests/unit/marketingCalendar.test.ts tests/unit/marketingCalendar-backlinks.test.ts tests/unit/amz-hub-smoke.test.ts
```

Expected: all PASS

- [ ] **Step 2: Run e2e smoke subset if env allows**

```bash
npx playwright test tests/e2e/release-smoke.spec.ts -g "marketing calendar"
```

Expected: flag icons / heading still pass; update selector if title unchanged `EU营销日历`

- [ ] **Step 3: Manual checklist (P-A..P-D from design §21)** — document results in PR body

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(amz-hub): calendar content cleanup type align and regression green"
```

---

## Closed-loop verification matrix (DoD)

| Loop | Task proof |
|------|------------|
| L1 过滤/空态 | Task 4–5 tests + reset copy |
| L2 双主 CTA | Task 1 unit + Task 4 DOM |
| L3 关注 | Task 7 |
| L4 页面清单按年 | Task 7 |
| L5 出站+回链 | Task 6 backlinks test |
| L6 滚年/pending | Task 2 resolve 2026/2027 |

## Debt register (accepted)

| Debt | Handling |
|------|----------|
| 引导闭环不自动勾选 | Documented; hand check M2 |
| storage 旧键不清理 | Accept |
| icon HTML | Accept |
| Runbook 无 owner | Process outside code |
| 页面清单按年非按月 | Copy =「本年度作战习惯」 |
| 多站多选 | Out of scope |
| M0 content accuracy residual | Golden set mandatory; expand later |

## Spec coverage self-check

| Spec requirement | Task |
|------------------|------|
| resolveYear / templates / overrides | T2 |
| dateRules multi-year | T0 |
| dual CTA + urgency | T1 |
| d60 intersection | T1 |
| ops UI + copy | T4 + copy.md |
| reverse links | T6 |
| userState v2 yearPinned | T3/T7 |
| encyclopedia | T5 |
| product complete M2 | T7+T8 |

No TBD placeholders in task steps.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-eu-marketing-calendar-ops.md`.  
Copy final table: `docs/superpowers/specs/2026-07-20-eu-marketing-calendar-copy.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with executing-plans checkpoints  

Which approach?
