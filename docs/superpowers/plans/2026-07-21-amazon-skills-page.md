# Amazon Skills 页 + Skill Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在「更多 → 大模型探索」落地 Skills 页与全站 `skillRegistry`，以 git submodule 接入 Amazon-Skills，使工作台可按 skillId 同步加载全部 skill，并补齐总览入口。

**Architecture:** `vendor/amazon-skills` submodule 为唯一资产源；`import.meta.glob` 构建期打入 `SKILL.md`；`src/services/skillRegistry` 解析索引并 export 单例；Skills 页与更多总览只消费 Registry；工作台通过 `loadSkillContext(id)` 注入 LLM 上下文。

**Tech Stack:** TypeScript, Vite (`import.meta.glob` + `?raw` / `?url`), Vitest, 现有 BaseModule / SafeTemplateLoader / app-modal / design tokens / Font Awesome / Tailwind explore violet 体系。

**Spec:** `docs/superpowers/specs/2026-07-21-amazon-skills-page-design.md`

## Global Constraints

- 一期不做工作台 UI、不执行 scripts、不调 LLM、不强制改 PPC/日报 Agent 业务绑定。
- 零新 npm 依赖（frontmatter 自研最小解析）。
- 不挂 DI；`export const skillRegistry` 单例。
- 中文外壳 + 英文 `SKILL.md` 原文；默认 `loadSkillContext` format = `raw`。
- scripts 仅 `?url` 路径探测，禁止 `?raw` 内联脚本正文。
- 禁止默认一次注入全部 53 skill；按 id 显式 load。
- UI 禁止孤岛：对齐 explore violet + 提示词页交互；DOM 用 `textContent`/`createElement`。
- 总览技能卡徽章文案固定为 **已接入**；顺序：智能体 → 技能 → 提示词 → 工作流。
- 每个 Task 结束必须：**测试通过 → 自检清单 → commit**；全部 Task 结束后执行 **终态闭环**（type-check + 相关单测 + build）。

## Checkpoints（硬门禁）

| CP | 时机 | 通过条件 | 未通过 |
|---|---|---|---|
| **CP0** | Task 1 后 | submodule 有 `*/SKILL.md`；`*.md?raw` 类型存在 | 禁止写 Registry |
| **CP1** | Task 4 后 | `skillRegistry` 单测全绿；fixture 可 load | 禁止写 UI |
| **CP2** | Task 5 后 | `routeIdToPath('more_skills')` 断言绿 | 禁止依赖路由的页面冒烟 |
| **CP3** | Task 7 后 | 路由/总览/页面文件齐；相关单测绿 | 禁止宣称完成 |
| **CP4 终态** | Task 8 | `type-check` + Registry/路由单测 + `build:app` 通过；无未跟踪债务 | 禁止 merge/收工 |

每个 Task 的 **自检** 至少勾：

- [ ] 无新增 `TODO`/`FIXME`/调试 `console.log`
- [ ] 无硬编码用户可见色值绕过 token（可用现有 Tailwind violet/slate）
- [ ] 错误码与 spec 一致（`SKILL_REG_001/002/003`）
- [ ] 测试命令已实际跑过并记录期望结果

---

## File Structure

| Path | Responsibility |
|---|---|
| `vendor/amazon-skills/` | Submodule 资产（只读上游） |
| `.gitmodules` | Submodule 注册 |
| `src/types/global.d.ts` | `*.md?raw` 模块声明 |
| `src/services/skillRegistry/types.ts` | 公共类型 |
| `src/services/skillRegistry/parseSkillMd.ts` | Frontmatter + body 解析 |
| `src/services/skillRegistry/categoryMap.ts` | id → 中文分类/status |
| `src/services/skillRegistry/loadSkillModules.ts` | glob 加载入口（可注入 mock） |
| `src/services/skillRegistry/skillRegistryService.ts` | Registry 实现 + 单例 |
| `src/services/skillRegistry/index.ts` | 公共导出 |
| `src/services/skillRegistry/*.test.ts` | 单测 |
| `src/modules/more/module.manifest.ts` | 路由注册 |
| `src/common/router/legacyRouteAliases.ts` | 别名 |
| `src/common/config/menuConfig.ts` | explore 描述 |
| `src/modules/more/views/explore/skills/*` | Skills 页 |
| `src/modules/more/views/overview/template.html` | 总览入口卡 |
| `src/modules/more/views/explore/agents/template.html` | Skill Library → 技能页链（闭环，避免死占位） |
| `tests/unit/routerUtilities.test.ts` | more_skills 路径断言 |

---

### Task 1: Submodule + `*.md?raw` 类型（CP0）

**Files:**
- Create: `.gitmodules`
- Create: `vendor/amazon-skills/` (via git submodule)
- Modify: `src/types/global.d.ts`

**Interfaces:**
- Consumes: none
- Produces: 磁盘上可读的 `vendor/amazon-skills/*/SKILL.md`；TS 识别 `import x from '...md?raw'`

- [ ] **Step 1: 添加 submodule**

```bash
git submodule add https://github.com/nexscope-ai/Amazon-Skills.git vendor/amazon-skills
git submodule update --init --recursive
```

Expected: `vendor/amazon-skills/amazon-keyword-research/SKILL.md` 存在。

- [ ] **Step 2: 确认 skill 目录数量**

```bash
# PowerShell
(Get-ChildItem vendor/amazon-skills -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'SKILL.md') }).Count
```

Expected: ≥ 50（上游约 53）。

- [ ] **Step 3: 声明 `*.md?raw`**

在 `src/types/global.d.ts` 的 `*.html?raw` 块后插入：

```ts
declare module '*.md?raw' {
  const content: string;
  export default content;
}
```

- [ ] **Step 4: Commit**

```bash
git add .gitmodules vendor/amazon-skills src/types/global.d.ts
git commit -m "chore: add Amazon-Skills submodule and md?raw module types"
```

- [ ] **Step 5: CP0 自检**

- [ ] submodule 指针已提交（gitlink）
- [ ] 工作树无意外大文件（`banner.png` 可随 submodule 存在，勿复制到 `src/`）
- [ ] 无业务代码半成品

---

### Task 2: `parseSkillMd`（TDD）

**Files:**
- Create: `src/services/skillRegistry/types.ts`
- Create: `src/services/skillRegistry/parseSkillMd.ts`
- Test: `src/services/skillRegistry/parseSkillMd.test.ts`

**Interfaces:**
- Produces:
  - `parseSkillMd(raw: string): ParseSkillMdResult | null`
  - `ParseSkillMdResult = { name?: string; description: string; body: string; frontmatter: Record<string, unknown>; emoji?: string }`

- [ ] **Step 1: 写失败测试**

```ts
// src/services/skillRegistry/parseSkillMd.test.ts
import { describe, expect, it } from 'vitest';
import { parseSkillMd } from './parseSkillMd';

const SAMPLE = `---
name: amazon-keyword-research
description: "Amazon keyword research for sellers."
metadata: {"nexscope":{"emoji":"🔍","category":"amazon"}}
---

# Amazon Keyword Research

Body line one.
`;

describe('parseSkillMd', () => {
  it('parses name, description, body, and emoji', () => {
    const result = parseSkillMd(SAMPLE);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('amazon-keyword-research');
    expect(result!.description).toContain('keyword research');
    expect(result!.body).toContain('# Amazon Keyword Research');
    expect(result!.body).not.toContain('---');
    expect(result!.emoji).toBe('🔍');
  });

  it('returns null for empty input', () => {
    expect(parseSkillMd('')).toBeNull();
    expect(parseSkillMd('   ')).toBeNull();
  });

  it('treats body-only markdown as valid without name', () => {
    const result = parseSkillMd('# Title Only\n\nHello');
    expect(result).not.toBeNull();
    expect(result!.name).toBeUndefined();
    expect(result!.body).toContain('# Title Only');
    expect(result!.description).toBe('');
  });

  it('handles unquoted description values', () => {
    const raw = `---
name: demo-skill
description: plain description text
---

# Demo
`;
    const result = parseSkillMd(raw);
    expect(result!.name).toBe('demo-skill');
    expect(result!.description).toBe('plain description text');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
npx vitest run src/services/skillRegistry/parseSkillMd.test.ts
```

Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现 types + parseSkillMd**

```ts
// src/services/skillRegistry/types.ts
export type SkillCategoryId =
  | 'product_research'
  | 'competitor'
  | 'pricing_profit'
  | 'advertising'
  | 'listing'
  | 'analytics'
  | 'growth'
  | 'other';

export type SkillStatus = 'available' | 'beta' | 'unknown';

export type SkillLoadFormat = 'raw' | 'body';

export interface SkillMeta {
  id: string;
  title: string;
  description: string;
  category: SkillCategoryId;
  categoryLabel: string;
  emoji?: string;
  status: SkillStatus;
  hasScripts: boolean;
  source: 'amazon-skills';
  repoPath: string;
}

export interface Skill extends SkillMeta {
  body: string;
  raw: string;
  frontmatter: Record<string, unknown>;
}

export interface SkillLoadOptions {
  format?: SkillLoadFormat;
}

export interface SkillSearchQuery {
  keyword?: string;
  category?: SkillCategoryId | 'all';
  status?: SkillStatus | 'all';
  hasScripts?: boolean;
}

export interface SkillCategoryInfo {
  id: SkillCategoryId;
  label: string;
  count: number;
}

export interface SkillRegistryStats {
  total: number;
  parseFailures: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ParseSkillMdResult {
  name?: string;
  description: string;
  body: string;
  frontmatter: Record<string, unknown>;
  emoji?: string;
}
```

```ts
// src/services/skillRegistry/parseSkillMd.ts
import type { ParseSkillMdResult } from './types';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalarMap(block: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    map[match[1]] = stripQuotes(match[2] ?? '');
  }
  return map;
}

function extractEmoji(metadataRaw: string | undefined): string | undefined {
  if (!metadataRaw) return undefined;
  try {
    const parsed = JSON.parse(metadataRaw) as { nexscope?: { emoji?: string } };
    const emoji = parsed?.nexscope?.emoji;
    return typeof emoji === 'string' && emoji.length > 0 ? emoji : undefined;
  } catch {
    return undefined;
  }
}

export function parseSkillMd(raw: string): ParseSkillMdResult | null {
  if (!raw || !raw.trim()) return null;

  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return {
      description: '',
      body: raw.trimStart(),
      frontmatter: {},
    };
  }

  const fmBlock = match[1] ?? '';
  const body = raw.slice(match[0].length);
  const scalars = parseScalarMap(fmBlock);
  const name = scalars.name?.trim() || undefined;
  const description = scalars.description ?? '';
  const emoji = extractEmoji(scalars.metadata);

  return {
    name,
    description,
    body,
    frontmatter: { ...scalars },
    emoji,
  };
}

export function extractTitleFromBody(body: string, fallbackId: string): string {
  const h1 = body.match(/^#\s+(.+)$/m);
  if (!h1?.[1]) return fallbackId;
  return h1[1].replace(/\s*[^\w\s\-/&().,:+]+\s*$/u, '').trim() || fallbackId;
}
```

- [ ] **Step 4: 跑测试确认通过**

```bash
npx vitest run src/services/skillRegistry/parseSkillMd.test.ts
```

Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/services/skillRegistry/types.ts src/services/skillRegistry/parseSkillMd.ts src/services/skillRegistry/parseSkillMd.test.ts
git commit -m "feat(skillRegistry): parse SKILL.md frontmatter without new deps"
```

- [ ] **Step 6: 自检** — 无 yaml 依赖；空输入返回 null；body-only 可解析。

---

### Task 3: `categoryMap`（全量映射表）

**Files:**
- Create: `src/services/skillRegistry/categoryMap.ts`
- Test: `src/services/skillRegistry/categoryMap.test.ts`

**Interfaces:**
- Produces:
  - `CATEGORY_LABELS: Record<SkillCategoryId, string>`
  - `resolveSkillCategory(id: string): { category: SkillCategoryId; categoryLabel: string; status: SkillStatus }`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS, resolveSkillCategory } from './categoryMap';

describe('categoryMap', () => {
  it('maps known advertising skill', () => {
    const r = resolveSkillCategory('amazon-ppc-campaign');
    expect(r.category).toBe('advertising');
    expect(r.categoryLabel).toBe(CATEGORY_LABELS.advertising);
    expect(r.status).toBe('available');
  });

  it('maps beta growth skills', () => {
    expect(resolveSkillCategory('amazon-global-selling').status).toBe('beta');
    expect(resolveSkillCategory('amazon-fba-prep').status).toBe('beta');
  });

  it('falls back to other/unknown for unmapped ids', () => {
    const r = resolveSkillCategory('totally-unknown-skill');
    expect(r.category).toBe('other');
    expect(r.status).toBe('unknown');
    expect(r.categoryLabel).toBe(CATEGORY_LABELS.other);
  });
});
```

- [ ] **Step 2: 跑测失败 → 实现 categoryMap**

实现时 **必须覆盖上游全部已知 id**（下列表以 submodule 目录为准；若上游增减，以目录扫描为准，未列出的 id 走 other）。

```ts
// src/services/skillRegistry/categoryMap.ts
import type { SkillCategoryId, SkillStatus } from './types';

export const CATEGORY_LABELS: Record<SkillCategoryId, string> = {
  product_research: '选品与关键词',
  competitor: '竞品分析',
  pricing_profit: '定价与利润',
  advertising: '广告投放',
  listing: 'Listing 优化',
  analytics: '分析与监控',
  growth: '增长与扩展',
  other: '其他',
};

type Entry = { category: SkillCategoryId; status?: SkillStatus };

/** 完整映射：未出现的 id → other/unknown */
const SKILL_CATEGORY_MAP: Record<string, Entry> = {
  // product_research
  'amazon-keyword-research': { category: 'product_research' },
  'amazon-trending-products': { category: 'product_research' },
  'amazon-product-research': { category: 'product_research' },
  'amazon-niche-finder': { category: 'product_research' },
  'amazon-seller-analytics': { category: 'product_research' },
  'amazon-private-label': { category: 'product_research' },
  'amazon-wholesale-sourcing': { category: 'product_research' },
  'amazon-category-ungating': { category: 'product_research' },
  // competitor
  'amazon-competitor-monitoring': { category: 'competitor' },
  'amazon-brand-analytics': { category: 'competitor' },
  'amazon-competitor-analysis': { category: 'competitor' },
  'amazon-review-analyzer': { category: 'competitor' },
  // pricing_profit
  'amazon-fba-calculator': { category: 'pricing_profit' },
  'tariff-calculator-amazon': { category: 'pricing_profit' },
  'amazon-profit-analyzer': { category: 'pricing_profit' },
  'amazon-repricing-strategy': { category: 'pricing_profit' },
  'amazon-buy-box': { category: 'pricing_profit' },
  'amazon-deal-finder': { category: 'pricing_profit' },
  'amazon-shipping-calculator': { category: 'pricing_profit' },
  'amazon-coupon-strategy': { category: 'pricing_profit' },
  // advertising
  'amazon-ppc-campaign': { category: 'advertising' },
  'amazon-advertising-strategy': { category: 'advertising' },
  'amazon-negative-keywords': { category: 'advertising' },
  'amazon-display-ads': { category: 'advertising' },
  'amazon-dayparting-strategy': { category: 'advertising' },
  'amazon-brand-tailored-promotions': { category: 'advertising' },
  // listing
  'amazon-listing-optimization': { category: 'listing' },
  'amazon-a-plus-content': { category: 'listing' },
  'amazon-backend-keywords': { category: 'listing' },
  'amazon-search-optimization': { category: 'listing' },
  'amazon-listing-images': { category: 'listing' },
  'amazon-enhanced-brand-content': { category: 'listing' },
  'amazon-storefront-design': { category: 'listing' },
  'amazon-variation-strategy': { category: 'listing' },
  'amazon-product-bundling': { category: 'listing' },
  // analytics
  'amazon-sales-estimator': { category: 'analytics' },
  'amazon-rank-tracker': { category: 'analytics' },
  'amazon-keyword-tracker': { category: 'analytics' },
  'amazon-price-tracker': { category: 'analytics' },
  'amazon-product-photography': { category: 'analytics', status: 'beta' },
  'amazon-inventory-management': { category: 'analytics' },
  'amazon-seasonal-planning': { category: 'analytics' },
  'amazon-return-reduction': { category: 'analytics' },
  'amazon-review-strategy': { category: 'analytics' },
  // growth
  'amazon-global-selling': { category: 'growth', status: 'beta' },
  'amazon-fba-prep': { category: 'growth', status: 'beta' },
  'amazon-international-listings': { category: 'growth' },
  'amazon-brand-registry': { category: 'growth' },
  'amazon-product-compliance': { category: 'growth' },
  'amazon-suspension-appeal': { category: 'growth' },
  'amazon-subscribe-save': { category: 'growth' },
  'amazon-vine-program': { category: 'growth' },
};

export function resolveSkillCategory(id: string): {
  category: SkillCategoryId;
  categoryLabel: string;
  status: SkillStatus;
} {
  const entry = SKILL_CATEGORY_MAP[id];
  if (!entry) {
    return {
      category: 'other',
      categoryLabel: CATEGORY_LABELS.other,
      status: 'unknown',
    };
  }
  return {
    category: entry.category,
    categoryLabel: CATEGORY_LABELS[entry.category],
    status: entry.status ?? 'available',
  };
}
```

- [ ] **Step 3: 与 submodule 对账**

```bash
# 列出 submodule 有但 map 无的 id（应尽量为空）
# PowerShell 片段：对比目录名与 SKILL_CATEGORY_MAP keys
```

对账发现缺项 → 补 map 后再测。未识别的仍允许 other。

- [ ] **Step 4: 测试 PASS → Commit**

```bash
npx vitest run src/services/skillRegistry/categoryMap.test.ts
git add src/services/skillRegistry/categoryMap.ts src/services/skillRegistry/categoryMap.test.ts
git commit -m "feat(skillRegistry): add Chinese category map for Amazon skills"
```

---

### Task 4: `skillRegistry` 服务（CP1）

**Files:**
- Create: `src/services/skillRegistry/loadSkillModules.ts`
- Create: `src/services/skillRegistry/skillRegistryService.ts`
- Create: `src/services/skillRegistry/index.ts`
- Test: `src/services/skillRegistry/skillRegistryService.test.ts`

**Interfaces:**
- Consumes: `parseSkillMd`, `extractTitleFromBody`, `resolveSkillCategory`, `CATEGORY_LABELS`
- Produces:
  - `createSkillRegistry(deps?: SkillRegistryDeps): SkillRegistryApi`
  - `skillRegistry: SkillRegistryApi`（生产单例，用真实 glob）
  - Methods: `ensureInitialized`, `listSkills`, `getSkill`, `hasSkill`, `getCategories`, `loadSkillContext`, `loadSkillsContext`, `getStats`

设计要点：**Deps 可注入**，单测不依赖真实 submodule。

```ts
export interface SkillRegistryDeps {
  skillModules?: Record<string, string>; // path -> raw md
  scriptModules?: Record<string, string>; // path -> url string
}
```

- [ ] **Step 1: 写失败测试（核心行为）**

```ts
// src/services/skillRegistry/skillRegistryService.test.ts
import { describe, expect, it } from 'vitest';
import { ValidationError, SystemError } from '@/common/errors';
import { createSkillRegistry } from './skillRegistryService';

const KW = `---
name: amazon-keyword-research
description: "Keyword research skill"
metadata: {"nexscope":{"emoji":"🔍"}}
---

# Amazon Keyword Research

Do research.
`;

const PPC = `---
name: amazon-ppc-campaign
description: "PPC campaign skill"
---

# Amazon PPC Campaign

Build campaigns.
`;

function createTestRegistry() {
  return createSkillRegistry({
    skillModules: {
      '/virtual/amazon-keyword-research/SKILL.md': KW,
      '/virtual/amazon-ppc-campaign/SKILL.md': PPC,
      '/virtual/broken/SKILL.md': '', // parse fail
    },
    scriptModules: {
      '/virtual/amazon-keyword-research/scripts/research.sh': '/url/research.sh',
    },
  });
}

describe('skillRegistry', () => {
  it('indexes skills and marks hasScripts', () => {
    const reg = createTestRegistry();
    reg.ensureInitialized();
    expect(reg.getStats().total).toBe(2);
    expect(reg.getStats().parseFailures).toBe(1);
    expect(reg.getSkill('amazon-keyword-research')?.hasScripts).toBe(true);
    expect(reg.getSkill('amazon-ppc-campaign')?.hasScripts).toBe(false);
  });

  it('searches by keyword case-insensitively', () => {
    const reg = createTestRegistry();
    const hits = reg.listSkills({ keyword: 'PPC' });
    expect(hits.map(s => s.id)).toEqual(['amazon-ppc-campaign']);
  });

  it('loadSkillContext returns raw by default', () => {
    const reg = createTestRegistry();
    const ctx = reg.loadSkillContext('amazon-keyword-research');
    expect(ctx).toContain('name: amazon-keyword-research');
    expect(ctx).toContain('# Amazon Keyword Research');
  });

  it('loadSkillContext throws SKILL_REG_001 for missing id', () => {
    const reg = createTestRegistry();
    try {
      reg.loadSkillContext('nope');
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).code).toBe('SKILL_REG_001');
    }
  });

  it('loadSkillContext throws SKILL_REG_002 when empty', () => {
    const reg = createSkillRegistry({ skillModules: {}, scriptModules: {} });
    try {
      reg.loadSkillContext('any');
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(SystemError);
      expect((e as SystemError).code).toBe('SKILL_REG_002');
    }
  });

  it('loadSkillsContext respects strict flag', () => {
    const reg = createTestRegistry();
    const loose = reg.loadSkillsContext(['amazon-ppc-campaign', 'missing'], { strict: false });
    expect(loose).toContain('amazon-ppc-campaign');
    expect(() =>
      reg.loadSkillsContext(['amazon-ppc-campaign', 'missing'], { strict: true })
    ).toThrow(ValidationError);
  });

  it('keeps first skill on id conflict', () => {
    const reg = createSkillRegistry({
      skillModules: {
        '/a/amazon-ppc-campaign/SKILL.md': PPC,
        '/b/amazon-ppc-campaign/SKILL.md': PPC.replace('Build campaigns', 'SECOND'),
      },
      scriptModules: {},
    });
    reg.ensureInitialized();
    expect(reg.getSkill('amazon-ppc-campaign')!.body).toContain('Build campaigns');
    expect(reg.getSkill('amazon-ppc-campaign')!.body).not.toContain('SECOND');
  });
});
```

- [ ] **Step 2: 跑测失败**

```bash
npx vitest run src/services/skillRegistry/skillRegistryService.test.ts
```

- [ ] **Step 3: 实现 loadSkillModules + skillRegistryService + index**

```ts
// src/services/skillRegistry/loadSkillModules.ts
/** Production loaders — paths relative to this file */
export function loadProductionSkillModules(): Record<string, string> {
  return import.meta.glob('../../../vendor/amazon-skills/*/SKILL.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
}

export function loadProductionScriptModules(): Record<string, string> {
  return import.meta.glob('../../../vendor/amazon-skills/*/scripts/**', {
    query: '?url',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
}
```

```ts
// src/services/skillRegistry/skillRegistryService.ts
import { ValidationError, SystemError } from '@/common/errors';
import { Logger } from '@/services/loggerService'; // 若项目 Logger 路径不同，用现有 loggerService 导出
import { resolveSkillCategory, CATEGORY_LABELS } from './categoryMap';
import {
  loadProductionScriptModules,
  loadProductionSkillModules,
} from './loadSkillModules';
import { extractTitleFromBody, parseSkillMd } from './parseSkillMd';
import type {
  Skill,
  SkillCategoryId,
  SkillCategoryInfo,
  SkillLoadOptions,
  SkillMeta,
  SkillRegistryStats,
  SkillSearchQuery,
} from './types';

export interface SkillRegistryDeps {
  skillModules?: Record<string, string>;
  scriptModules?: Record<string, string>;
}

export interface SkillRegistryApi {
  ensureInitialized(): void;
  listSkills(query?: SkillSearchQuery): SkillMeta[];
  getSkill(id: string): Skill | undefined;
  hasSkill(id: string): boolean;
  getCategories(): SkillCategoryInfo[];
  loadSkillContext(id: string, options?: SkillLoadOptions): string;
  loadSkillsContext(ids: string[], options?: SkillLoadOptions & { strict?: boolean }): string;
  getStats(): SkillRegistryStats;
}

function skillDirFromPath(modulePath: string): string | null {
  // .../amazon-keyword-research/SKILL.md or .../amazon-keyword-research/scripts/x
  const skillMd = modulePath.match(/([^/\\]+)[/\\]SKILL\.md$/i);
  if (skillMd) return skillMd[1];
  const scripts = modulePath.match(/([^/\\]+)[/\\]scripts[/\\]/i);
  if (scripts) return scripts[1];
  return null;
}

function toMeta(skill: Skill): SkillMeta {
  const { body: _b, raw: _r, frontmatter: _f, ...meta } = skill;
  return meta;
}

export function createSkillRegistry(deps: SkillRegistryDeps = {}): SkillRegistryApi {
  let initialized = false;
  const byId = new Map<string, Skill>();
  let parseFailures = 0;

  function ensureInitialized(): void {
    if (initialized) return;
    initialized = true;

    const skillModules = deps.skillModules ?? loadProductionSkillModules();
    const scriptModules = deps.scriptModules ?? loadProductionScriptModules();

    const dirsWithScripts = new Set<string>();
    for (const path of Object.keys(scriptModules)) {
      const dir = skillDirFromPath(path);
      if (dir) dirsWithScripts.add(dir);
    }

    const entries = Object.entries(skillModules);
    // 稳定顺序：按 path 排序 → first-wins 可测
    entries.sort(([a], [b]) => a.localeCompare(b));

    for (const [modulePath, raw] of entries) {
      const dir = skillDirFromPath(modulePath) ?? 'unknown';
      const parsed = parseSkillMd(raw);
      if (!parsed) {
        parseFailures += 1;
        // Logger.warn optional
        continue;
      }

      const id = (parsed.name?.trim() || dir).trim();
      if (byId.has(id)) {
        // first-wins
        continue;
      }

      const resolved = resolveSkillCategory(id);
      const title = extractTitleFromBody(parsed.body, id);
      const skill: Skill = {
        id,
        title,
        description: parsed.description,
        category: resolved.category,
        categoryLabel: resolved.categoryLabel,
        emoji: parsed.emoji,
        status: resolved.status,
        hasScripts: dirsWithScripts.has(dir),
        source: 'amazon-skills',
        repoPath: `${dir}/SKILL.md`,
        body: parsed.body,
        raw,
        frontmatter: parsed.frontmatter,
      };
      byId.set(id, skill);
    }

    if (byId.size === 0) {
      // soft fail — log only
      // Logger.error('skillRegistry empty — run git submodule update --init --recursive')
    }
  }

  function listSkills(query: SkillSearchQuery = {}): SkillMeta[] {
    ensureInitialized();
    const keyword = query.keyword?.trim().toLowerCase() ?? '';
    return [...byId.values()]
      .filter(skill => {
        if (query.category && query.category !== 'all' && skill.category !== query.category) {
          return false;
        }
        if (query.status && query.status !== 'all' && skill.status !== query.status) {
          return false;
        }
        if (typeof query.hasScripts === 'boolean' && skill.hasScripts !== query.hasScripts) {
          return false;
        }
        if (!keyword) return true;
        return (
          skill.id.toLowerCase().includes(keyword) ||
          skill.title.toLowerCase().includes(keyword) ||
          skill.description.toLowerCase().includes(keyword)
        );
      })
      .map(toMeta)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function getSkill(id: string): Skill | undefined {
    ensureInitialized();
    return byId.get(id);
  }

  function hasSkill(id: string): boolean {
    return Boolean(getSkill(id));
  }

  function getCategories(): SkillCategoryInfo[] {
    ensureInitialized();
    const counts = new Map<SkillCategoryId, number>();
    for (const skill of byId.values()) {
      counts.set(skill.category, (counts.get(skill.category) ?? 0) + 1);
    }
    const order: SkillCategoryId[] = [
      'product_research',
      'competitor',
      'pricing_profit',
      'advertising',
      'listing',
      'analytics',
      'growth',
      'other',
    ];
    return order
      .filter(id => (counts.get(id) ?? 0) > 0)
      .map(id => ({ id, label: CATEGORY_LABELS[id], count: counts.get(id) ?? 0 }));
  }

  function formatSkill(skill: Skill, options?: SkillLoadOptions): string {
    return options?.format === 'body' ? skill.body : skill.raw;
  }

  function loadSkillContext(id: string, options?: SkillLoadOptions): string {
    ensureInitialized();
    if (byId.size === 0) {
      throw new SystemError(
        'Skill registry is empty. Run: git submodule update --init --recursive',
        'SKILL_REG_002',
        { module: 'skillRegistry', action: 'loadSkillContext' }
      );
    }
    const skill = byId.get(id);
    if (!skill) {
      throw new ValidationError(
        `Skill not found: ${id}`,
        'SKILL_REG_001',
        'skillId',
        id,
        { module: 'skillRegistry', action: 'loadSkillContext' }
      );
    }
    return formatSkill(skill, options);
  }

  function loadSkillsContext(
    ids: string[],
    options?: SkillLoadOptions & { strict?: boolean }
  ): string {
    ensureInitialized();
    if (byId.size === 0) {
      throw new SystemError(
        'Skill registry is empty. Run: git submodule update --init --recursive',
        'SKILL_REG_002',
        { module: 'skillRegistry', action: 'loadSkillsContext' }
      );
    }

    const blocks: string[] = [];
    for (const id of ids) {
      const skill = byId.get(id);
      if (!skill) {
        if (options?.strict) {
          throw new ValidationError(
            `Skill not found: ${id}`,
            'SKILL_REG_001',
            'skillId',
            id,
            { module: 'skillRegistry', action: 'loadSkillsContext' }
          );
        }
        continue;
      }
      blocks.push(`---\n# Skill: ${id}\n${formatSkill(skill, options)}\n---`);
    }
    return blocks.join('\n\n');
  }

  function getStats(): SkillRegistryStats {
    ensureInitialized();
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const skill of byId.values()) {
      byCategory[skill.category] = (byCategory[skill.category] ?? 0) + 1;
      byStatus[skill.status] = (byStatus[skill.status] ?? 0) + 1;
    }
    return {
      total: byId.size,
      parseFailures,
      byCategory,
      byStatus,
    };
  }

  return {
    ensureInitialized,
    listSkills,
    getSkill,
    hasSkill,
    getCategories,
    loadSkillContext,
    loadSkillsContext,
    getStats,
  };
}

export const skillRegistry: SkillRegistryApi = createSkillRegistry();
```

> 实现时：`Logger` 导入路径以仓库现有 `loggerService` 为准；若无合适 Logger，用 `//` 省略 warn 亦可，但 **空库至少 `console` 禁用**——优先现有 `Logger`。若 Logger 导入导致测试噪声，测试里可不断言 log。

```ts
// src/services/skillRegistry/index.ts
export type {
  Skill,
  SkillMeta,
  SkillCategoryId,
  SkillLoadOptions,
  SkillSearchQuery,
  SkillRegistryStats,
  SkillCategoryInfo,
} from './types';
export { skillRegistry, createSkillRegistry } from './skillRegistryService';
export type { SkillRegistryApi, SkillRegistryDeps } from './skillRegistryService';
export { CATEGORY_LABELS, resolveSkillCategory } from './categoryMap';
```

- [ ] **Step 4: 全量 skillRegistry 测试 PASS**

```bash
npx vitest run src/services/skillRegistry/
```

Expected: 全部 PASS。

- [ ] **Step 5: 生产 glob 冒烟（Node/Vite 外可选）**

若 vitest 能解析 glob，增加 integration 测试文件 **或** 在 dev 控制台验证；至少保证 `loadProductionSkillModules` 在 `npm run build:app` 时不报路径错误（终态 CP4 验证）。

- [ ] **Step 6: Commit**

```bash
git add src/services/skillRegistry/
git commit -m "feat(skillRegistry): add injectable registry with loadSkillContext API"
```

- [ ] **Step 7: CP1 自检**

- [ ] `createSkillRegistry` 可测且生产单例分离
- [ ] 空库 soft-init，load 抛 `SKILL_REG_002`
- [ ] scripts 使用 `?url` 非 `?raw`
- [ ] 无 DI 改动

---

### Task 5: 路由 / 侧栏 / 别名（CP2）

**Files:**
- Modify: `src/modules/more/module.manifest.ts`
- Modify: `src/common/router/legacyRouteAliases.ts`
- Modify: `src/common/config/menuConfig.ts`（explore description）
- Modify: `tests/unit/routerUtilities.test.ts`

**Interfaces:**
- Produces: `routeId: 'more_skills'`, `path: '/more/explore/skills'`

- [ ] **Step 1: 在 `moreManifest.routes` 中于 AGENTS 与 PROMPTS 之间插入**

```ts
{
  key: 'SKILLS',
  routeId: 'more_skills',
  path: '/more/explore/skills',
  label: '技能',
  icon: 'fas fa-graduation-cap',
  category: 'explore',
  loaderPath: './views/explore/skills/index.ts',
},
```

- [ ] **Step 2: legacy alias**

在 `more_agents` 与 `more_prompts` 之间插入：

```ts
{
  alias: '/more_skills',
  routeId: 'more_skills',
  replace: true,
},
```

- [ ] **Step 3: menuConfig explore description**

```ts
description: '智能体、技能、提示词、工作流等实用功能。',
```

- [ ] **Step 4: 路由单测补充**

在 `routerUtilities.test.ts` 的 path 映射用例中增加：

```ts
expect(routeIdToPath('more_skills')).toBe('/more/explore/skills');
```

在 alias 用例中增加：

```ts
expect(getLegacyRouteAlias('/more_skills')).toMatchObject({
  alias: '/more_skills',
  routeId: 'more_skills',
  replace: true,
});
```

- [ ] **Step 5: 跑测**

```bash
npx vitest run tests/unit/routerUtilities.test.ts
```

Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add src/modules/more/module.manifest.ts src/common/router/legacyRouteAliases.ts src/common/config/menuConfig.ts tests/unit/routerUtilities.test.ts
git commit -m "feat(more): register more_skills route and sidebar entry"
```

- [ ] **Step 7: CP2 自检** — 侧栏顺序依赖 manifest 顺序；确认 SKILLS 夹在 AGENTS 与 PROMPTS 之间。

> 注意：此 Task 结束后 `loaderPath` 指向的文件尚不存在，**dev 点进技能会挂**。允许：在 Task 6 立即补齐。若希望中间态可导航，可先放最小 stub（下 Task 第一步）。

---

### Task 6: Skills 页 UI

**Files:**
- Create: `src/modules/more/views/explore/skills/template.html`
- Create: `src/modules/more/views/explore/skills/skills_style.css`
- Create: `src/modules/more/views/explore/skills/index.ts`
- Modify if needed: `src/common/config/apiEndpoints.test.ts`（静态 style 列表若需加入新 template 路径则补）

**Interfaces:**
- Consumes: `skillRegistry` from `@/services/skillRegistry`
- Produces: `mount` / `unmount` 导出，moduleId `more_skills`

- [ ] **Step 1: 写 `template.html` 骨架**

结构必须包含（id 固定，供 index 绑定）：

- `.module-container.py-6`
- Welcome banner `wb-theme-violet`，图标 `fa-graduation-cap`，标题「技能」，badge `SKILL OPS`
- `#skill-metrics` 四卡容器（或四卡静态结构 + 数字 span id）
- `#skill-workbench-hint` 只读代码说明区（可静态 HTML）
- `#skill-search` input
- `#skill-category-container`
- `#skill-result-count`（`aria-live="polite"`）
- `#skill-list` 网格
- `app-modal#skill-detail-modal`（对齐 prompts：no-header + 自定义 header/body/actions）

工作台说明区静态代码文本：

```ts
import { skillRegistry } from '@/services/skillRegistry';
skillRegistry.loadSkillContext('amazon-ppc-campaign');
```

- [ ] **Step 2: `skills_style.css`**

复用 prompts 语义：复制/镜像 `category-btn`、`btn-icon`、卡片 hover、modal 相关；新增：

```css
.skill-card { /* 同 prompt-card 结构 */ }
.skill-id { font-family: ui-monospace, monospace; font-size: 0.75rem; color: var(--color-slate-500); }
.skill-status-available { /* violet soft badge */ }
.skill-status-beta { /* amber soft badge */ }
.skill-status-unknown { /* slate soft badge */ }
```

禁止引入新色板 hex 孤岛；用 CSS 变量或 Tailwind 类。

- [ ] **Step 3: 实现 `index.ts`（对照 prompts，要点如下）**

```ts
import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';
import { copyTextToClipboard } from '@/common/utils/clipboard';
import { showToast } from '@/common/ui';
import { skillRegistry } from '@/services/skillRegistry';
import type { SkillCategoryId, SkillMeta } from '@/services/skillRegistry';
import '@/components/modal/AppModal';
import './skills_style.css';

// 状态：category, keyword, currentSkillId
// mount:
//   ensureInitialized → setSafeHtml → mount modal to body if needed
//   bind search (debounce 200ms), click delegation
//   renderMetrics / renderCategories / renderList
// renderList: createElement only; card data-skill-id
// openDetail: getSkill → fill pre with raw via textContent
// copy actions: raw | id | install cmd
// unmount: remove listeners, close modal, clear state

const INSTALL_CMD = (id: string) =>
  `npx skills add nexscope-ai/Amazon-Skills --skill ${id} -g`;

class SkillsModule extends BaseModule {
  async mount(container: HTMLElement): Promise<void> {
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/more/views/explore/skills/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
    skillRegistry.ensureInitialized();
    // ... init UI
  }
  unmount(): void {
    // cleanup
  }
}

const skillsModule = new SkillsModule('more_skills');
export const mount = (container: HTMLElement) => skillsModule.mount(container);
export const unmount = () => skillsModule.unmount();
```

实现细节强制：

- Banner tag 总数用 `getStats().total`，禁止写死 53
- 空库：`role="alert"` + `git submodule update --init --recursive`
- 无匹配：示例关键词 `ppc` / `listing` / `keyword`
- 复制失败 toast error
- Escape 关闭 modal

- [ ] **Step 4: 若 `apiEndpoints.test.ts` 有 migratedStaticStyleFiles 列表，追加**

```ts
'src/modules/more/views/explore/skills/template.html',
```

- [ ] **Step 5: 单测/类型**

```bash
npx vitest run src/services/skillRegistry/ tests/unit/routerUtilities.test.ts
npm run type-check
```

Expected: PASS（允许 template 无单测）。

- [ ] **Step 6: Commit**

```bash
git add src/modules/more/views/explore/skills/ src/common/config/apiEndpoints.test.ts
git commit -m "feat(more): add Skills explore page backed by skillRegistry"
```

- [ ] **Step 7: 自检**

- [ ] 无 `innerHTML` 注入 skill 正文
- [ ] 图标按钮均有 `aria-label`
- [ ] 与 prompts 视觉同系（violet）

---

### Task 7: 更多总览 + Agent 页链接（CP3）

**Files:**
- Modify: `src/modules/more/views/overview/template.html`
- Modify: `src/modules/more/views/explore/agents/template.html`

**Interfaces:**
- Produces: 总览可 `switch-tab` → `more_skills`；Agent Skill Library 可导航到技能页

- [ ] **Step 1: 总览探索副标题**

```html
<p class="text-sm text-slate-500">The Explore Layer · 智能体、技能、提示词、工作流等实用功能</p>
```

- [ ] **Step 2: 智能体卡后插入技能卡**

```html
<!-- 技能 -->
<div class="sop-card overview-accent-card overview-accent-violet" data-action="switch-tab" data-tab="more_skills">
  <div class="flex items-start justify-between mb-3">
    <div class="sop-icon-container bg-violet-50 text-violet-600">
      <i class="fas fa-graduation-cap"></i>
    </div>
    <span class="sop-status-badge sop-status-active">已接入</span>
  </div>
  <h3 class="font-bold text-lg text-slate-800 mb-2">技能</h3>
  <p class="text-sm text-slate-500 mb-3">Amazon Skills 资产目录：浏览、检索、复制 skill 正文与 skillId；工作台经 skillRegistry 同源调用。</p>
  <div class="text-xs text-slate-400">
    <i class="fas fa-graduation-cap mr-1"></i>Agent Skill · 可调用 Registry
  </div>
</div>
```

- [ ] **Step 3: Agent 页 Skill Library 占位改为可点入口**

在 `agents/template.html` 的 Skill Library 卡片底部或标题旁增加：

```html
<button type="button" class="text-sm text-violet-700 hover:text-violet-800" data-action="switch-tab" data-tab="more_skills">
  打开技能目录
</button>
```

（若该页无全局 `data-action` 委托，改用项目已有导航方式：`navigateToRouteId('more_skills')` 的等价 UI 模式——**以仓库现有 switch-tab 机制为准**。）

- [ ] **Step 4: Commit**

```bash
git add src/modules/more/views/overview/template.html src/modules/more/views/explore/agents/template.html
git commit -m "feat(more): wire Skills entry on overview and agent skill library"
```

- [ ] **Step 5: CP3 自检**

- [ ] 总览顺序正确
- [ ] 徽章为「已接入」
- [ ] Agent 页不再是死占位

---

### Task 8: 终态闭环 — 测试 + 构建 + 债务清扫（CP4）

**Files:** 无新功能；仅验证与必要修复。

- [ ] **Step 1: Registry + 路由单测**

```bash
npx vitest run src/services/skillRegistry/ tests/unit/routerUtilities.test.ts
```

Expected: PASS。

- [ ] **Step 2: Typecheck**

```bash
npm run type-check
```

Expected: exit 0。

- [ ] **Step 3: Production build**

```bash
npm run build:app
```

Expected: exit 0；构建日志无 `amazon-skills` / `SKILL.md` 解析失败。若 glob 扫不到 submodule，**必须修复路径或 CI submodule**，不得留下「构建绿但 registry 空」的静默债——至少在 build 后抽检：

可选：临时脚本或 vitest 集成断言 `loadProductionSkillModules` key 数 ≥ 50（若 vitest 环境可 glob）。

- [ ] **Step 4: 债务扫描（本功能相关）**

```bash
# 搜索残留
rg -n "TODO|FIXME|more_skills|skillRegistry" src/services/skillRegistry src/modules/more/views/explore/skills
rg -n "innerHTML" src/modules/more/views/explore/skills
```

Expected：无 TODO/FIXME；skills 页无 skill 内容 `innerHTML`。

- [ ] **Step 5: 手工冒烟清单（执行者勾选）**

- [ ] `git submodule status` 显示 `vendor/amazon-skills` 已初始化  
- [ ] 侧栏「技能」可见且顺序正确  
- [ ] 打开 `/more/explore/skills`：TOTAL > 0，列表有卡  
- [ ] 搜索 `ppc` 有结果  
- [ ] 打开详情：复制 id / raw / install 命令成功  
- [ ] 总览「技能」→ 进入页  
- [ ] Agent 页「打开技能目录」→ 进入页  
- [ ] 控制台或临时调试：`skillRegistry.loadSkillContext('amazon-keyword-research').length > 0`

- [ ] **Step 6: 若有修复，单独 commit**

```bash
git add -A
git status   # 确认只有本功能相关修复
git commit -m "fix(skillRegistry): close build/test gaps for Skills page"
```

- [ ] **Step 7: CP4 完成声明条件**

仅当以下全部为真才可宣布完成：

1. Task 1–7 代码已提交  
2. Step 1–3 命令 exit 0  
3. Step 4 无新增债务  
4. Step 5 手工项全勾（或记录环境阻塞原因）  
5. `git status` clean（或仅剩与本任务无关的用户文件）  
6. Spec 每条目在计划 Task 中有落点（见下方 Coverage）

- [ ] **Step 8: 更新 spec 状态（可选但推荐）**

将 `docs/superpowers/specs/2026-07-21-amazon-skills-page-design.md` 状态改为 `Implemented` 并 commit：

```bash
git add docs/superpowers/specs/2026-07-21-amazon-skills-page-design.md
git commit -m "docs: mark Amazon Skills page design as implemented"
```

---

## Spec Coverage Map

| Spec 要求 | Task |
|---|---|
| Submodule 资产 | 1 |
| parse + 零依赖 | 2 |
| 中文分类 map | 3 |
| Registry API / 错误码 / 可注入测试 | 4 |
| 路由侧栏别名 | 5 |
| Skills 页 UI | 6 |
| 更多总览已接入 | 7 |
| Agent 发现入口闭环 | 7 |
| 工作台 loadSkillContext 契约 | 4（API） |
| type-check / test / build 闭环 | 8 |
| 不执行 scripts / 不挂 DI / 不翻译正文 | Constraints + 各 Task 自检 |

---

## Out of Scope（禁止在执行中扩张）

- PPC/日报 Agent 绑定具体 skill  
- markdown 渲染库  
- DI 注册  
- 虚拟列表 / URL `?skill=` 深链  
- 中文全文翻译  

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-amazon-skills-page.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — 每 Task 新 subagent + 两次审查；CP0–CP4 由主会话把关  
2. **Inline Execution** — 本会话按 `executing-plans` 批量执行，CP 处停顿确认  

**Which approach?**
