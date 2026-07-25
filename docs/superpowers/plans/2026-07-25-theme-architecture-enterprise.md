# Theme Architecture Enterprise + Minimal Preset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Appearance 运行时收敛为 `ThemeManager` 单一事实源，落实 A2 双层契约，新增工业素色 `minimal` preset，并同步收紧主题/视觉设计语言文档。

**Architecture:** Layer A（`THEME_PRESETS` + `ThemeManager`）只写 `--color-primary*` / `--color-focus-ring`；Layer B（`menuConfig` / `wb-theme-*`）不受 Appearance 切换影响。删除无引用的 `themes.ts`。`minimal` 使用 `colorScheme: 'slate'` + `customVars` 将 primary/focus 抬到 `slate-700` 工业档。

**Tech Stack:** TypeScript, Vitest, CSS custom properties via `updateRuntimeCssRule`, existing `StorageService` / `EventBus`.

**Spec:** `docs/superpowers/specs/2026-07-25-theme-architecture-enterprise-design.md`（第 1–3 节均已确认）

## Global Constraints

- 范围：架构收口优先；不做 `variables.css` 全量迁移、dark 重构、banner 大扫除、Deep Chat 色改、换字体。
- A2：Appearance 可换全局 primary 色相；模块归属色独立；冲突优先级：状态色 > 模块归属 > Appearance primary > 中性 surface。
- `minimal`：工业 `slate-700` + 显式 focus；禁止营销措辞与展示字体。
- Token：`customVars` 只引用 `var(--color-slate-*)`，禁止散落新 hex。
- 存储 key：`app-theme`（勿改回 `app_theme`）。
- 测试：TDD；每个 Task 结束时相关单测绿；最终 `type-check` 通过。
- 文档权威链：`THEME_SYSTEM_GUIDELINES` > `VISUAL_DESIGN_GUIDELINES` > CSS 速查。

---

## File Map

| Path | Responsibility |
| --- | --- |
| `src/common/config/themeConfig.ts` | `THEME_PRESETS`（含 `minimal`）、排序、企业化描述、A2：不再调用 `ColorContext.setModuleColor` |
| `src/common/config/themeConfig.test.ts` | minimal 应用/变量/存储；A2 不调用 setModuleColor；preset 顺序 |
| `src/common/config/themes.ts` | **删除**（无运行时引用） |
| `docs/THEME_SYSTEM_GUIDELINES.md` | 宪法：A2、presets、运行时、债务 D1–D4、验收 |
| `docs/VISUAL_DESIGN_GUIDELINES.md` | 消冲突：圆角二分、Playground=orange、appearance/`minimal` 短节 |
| `src/components/settings/systemSettings.ts` | 无需改逻辑（已 `Object.values(THEME_PRESETS)`）；Task 1 后手工/单测确认选项含 minimal |

---

### Task 1: `minimal` preset + A2 解耦 ColorContext（TDD）

**Files:**
- Modify: `src/common/config/themeConfig.test.ts`
- Modify: `src/common/config/themeConfig.ts`
- Test: `src/common/config/themeConfig.test.ts`

**Interfaces:**
- Consumes: `ThemeManager.applyTheme`, `THEME_PRESETS`, `getRuntimeCssRuleText`, `StorageService`, `ColorContext` mock
- Produces:
  - `THEME_PRESETS.minimal: ThemeConfig` with `id: 'minimal'`, `colorScheme: 'slate'`, `customVars` as below
  - `ThemeManager.applyTheme` does **not** call `ColorContext.setModuleColor`
  - Preset insertion order: `default`, `minimal`, `ocean`, `forest`, `sunset`, `purple`, `rose`

**`minimal.customVars` (exact):**

```ts
{
  '--color-primary': 'var(--color-slate-700)',
  '--color-primary-light': 'var(--color-slate-100)',
  '--color-primary-dark': 'var(--color-slate-800)',
  '--color-primary-darker': 'var(--color-slate-900)',
  '--color-focus-ring': 'var(--color-slate-700)',
}
```

- [ ] **Step 1: Write failing tests for minimal + A2 + order**

In `themeConfig.test.ts`, add (keep existing tests, but **update** the ocean test that expects `setModuleColor`):

```ts
it('applies minimal with industrial slate customVars and does not touch ColorContext', () => {
  ThemeManager.applyTheme('minimal');

  expect(document.documentElement.dataset.theme).toBe('minimal');
  expect(ColorContext.setModuleColor).not.toHaveBeenCalled();
  const rule = getRuntimeCssRuleText('theme-manager-vars');
  expect(rule).toContain('--color-primary:var(--color-slate-700)');
  expect(rule).toContain('--color-primary-light:var(--color-slate-100)');
  expect(rule).toContain('--color-primary-dark:var(--color-slate-800)');
  expect(rule).toContain('--color-primary-darker:var(--color-slate-900)');
  expect(rule).toContain('--color-focus-ring:var(--color-slate-700)');
  expect(StorageService.set).toHaveBeenCalledWith('app-theme', 'minimal');
  expect(ThemeManager.getCurrentTheme()).toBe('minimal');
  expect(THEME_PRESETS.minimal.colorScheme).toBe('slate');
});

it('lists appearance presets with minimal second after default', () => {
  const ids = ThemeManager.getAllThemes().map(t => t.id);
  expect(ids.slice(0, 2)).toEqual(['default', 'minimal']);
  expect(ids).toEqual(
    expect.arrayContaining(['default', 'minimal', 'ocean', 'forest', 'sunset', 'purple', 'rose'])
  );
});
```

Update existing ocean test — replace:

```ts
expect(ColorContext.setModuleColor).toHaveBeenCalledWith('cyan');
```

with:

```ts
expect(ColorContext.setModuleColor).not.toHaveBeenCalled();
```

Keep remaining ocean assertions (`dataset.theme`, primary cyan-500 from getColorVars, storage, event).

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npx vitest run src/common/config/themeConfig.test.ts
```

Expected: FAIL — `minimal` undefined and/or `setModuleColor` still called.

- [ ] **Step 3: Implement THEME_PRESETS + remove ColorContext coupling**

In `themeConfig.ts`:

1. Replace `THEME_PRESETS` with ordered presets and enterprise-neutral copy (no 营销氛围词):

```ts
export const THEME_PRESETS: Record<string, ThemeConfig> = {
  default: {
    id: 'default',
    name: '默认',
    description: '经典蓝色主色，适合通用商务工作台',
    colorScheme: 'blue',
  },
  minimal: {
    id: 'minimal',
    name: '极简素色',
    description:
      '工业中性主色，低刺激、高对比，适合长时间运营作业；不改变模块归属色',
    colorScheme: 'slate',
    customVars: {
      '--color-primary': 'var(--color-slate-700)',
      '--color-primary-light': 'var(--color-slate-100)',
      '--color-primary-dark': 'var(--color-slate-800)',
      '--color-primary-darker': 'var(--color-slate-900)',
      '--color-focus-ring': 'var(--color-slate-700)',
    },
  },
  ocean: {
    id: 'ocean',
    name: '海洋',
    description: '青色主色，偏清爽的全局强调',
    colorScheme: 'cyan',
  },
  forest: {
    id: 'forest',
    name: '森林',
    description: '绿色主色，偏自然的全局强调',
    colorScheme: 'green',
  },
  sunset: {
    id: 'sunset',
    name: '日落',
    description: '橙色主色，偏暖的全局强调',
    colorScheme: 'orange',
  },
  purple: {
    id: 'purple',
    name: '紫罗兰',
    description: '紫色主色，偏沉稳的全局强调',
    colorScheme: 'purple',
  },
  rose: {
    id: 'rose',
    name: '玫瑰',
    description: '玫红主色，偏醒目的全局强调',
    colorScheme: 'rose',
  },
};
```

2. In `applyTheme`, **delete** these lines:

```ts
// 应用颜色方案
ColorContext.setModuleColor(theme.colorScheme);
```

3. Remove unused import:

```ts
import { ColorContext } from '../utils/ColorContext';
```

Do **not** change `getColorVars`, storage key, event name, or selector helper.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
npx vitest run src/common/config/themeConfig.test.ts
```

Expected: PASS (all tests in file).

- [ ] **Step 5: Commit**

```bash
git add src/common/config/themeConfig.ts src/common/config/themeConfig.test.ts
git commit -m "$(cat <<'EOF'
feat(theme): add minimal preset and decouple appearance from ColorContext

Introduce industrial slate minimal appearance theme and stop ThemeManager
from overwriting module ColorContext so A2 ownership colors stay independent.
EOF
)"
```

---

### Task 2: Delete dead `themes.ts` dual runtime

**Files:**
- Delete: `src/common/config/themes.ts`
- Verify: no imports remain

**Interfaces:**
- Consumes: Task 1 `ThemeManager` as sole Appearance API
- Produces: repository has no `src/common/config/themes.ts`

- [ ] **Step 1: Confirm zero runtime imports**

Run:

```bash
rg -n "config/themes|from ['\"].*/themes['\"]|from ['\"]@/common/config/themes" --glob "*.{ts,js,tsx,jsx}" src tests
```

Expected: no matches under `src/` or `tests/` (docs may still mention historically).

- [ ] **Step 2: Delete the file**

Delete `src/common/config/themes.ts`.

- [ ] **Step 3: Type-check**

Run:

```bash
npm run type-check
```

Expected: exit 0 (no missing-module errors for themes).

- [ ] **Step 4: Commit**

```bash
git add src/common/config/themes.ts
git commit -m "$(cat <<'EOF'
chore(theme): remove unused themes.ts dual runtime

ThemeManager in themeConfig.ts is the only appearance theme entry point.
EOF
)"
```

---

### Task 3: Update `THEME_SYSTEM_GUIDELINES.md` (宪法)

**Files:**
- Modify: `docs/THEME_SYSTEM_GUIDELINES.md`

**Interfaces:**
- Consumes: Spec §2–§3, §6–§7; Task 1–2 outcomes
- Produces: document sections listed below (must exist by title or equivalent H2/H3)

- [ ] **Step 1: Bump header metadata**

Set:

- 更新时间: `2026-07-25`
- 目标句保留内部运营工作台定位，并加一句：支持用户 Appearance 切换全局 primary，**不**覆盖模块归属色。

- [ ] **Step 2: Insert section「双层主题模型（A2）」after 主题分层（§2）**

Include exact priority list:

1. 语义状态色  
2. 模块归属色  
3. 外观主色（Appearance）  
4. 中性 surface / text / border  

Include Layer A vs B table:

| 层 | 数据源 | 可写 | 不可改 |
| --- | --- | --- | --- |
| A Appearance | `themeConfig.ts` / `ThemeManager` | `--color-primary*`、`--color-focus-ring` | `wb-theme-*`、menu 归属、状态色 |
| B Module Ownership | `menuConfig` + banner/colorSchemes | 导航/banner/入口归属 | 不被 Appearance 覆盖 |

State: 唯一 API `ThemeManager`；存储 key `app-theme`；**已删除** `themes.ts`。

- [ ] **Step 3: Insert section「Appearance Presets」**

Table:

| id | 名称 | colorScheme | 备注 |
| --- | --- | --- | --- |
| default | 默认 | blue | 商务默认 |
| minimal | 极简素色 | slate | primary/focus → slate-700 工业档（customVars） |
| ocean | 海洋 | cyan | |
| forest | 森林 | green | |
| sunset | 日落 | orange | |
| purple | 紫罗兰 | purple | |
| rose | 玫瑰 | rose | |

Document `minimal` customVars mapping (slate-700/100/800/900 + focus-ring). Explicitly: 切换 Appearance **不得**调用/覆盖模块 `ColorContext` 归属（由路由/menu 推断）。

- [ ] **Step 4: Insert section「已知债务」**

| ID | 内容 |
| --- | --- |
| D1 | `variables.css` 重定义基础色阶/字号覆盖 generated |
| D2 | 圆角语义名像素不一致；工作台行为写死 ≤8px |
| D3 | `[data-theme='dark']` 与 appearance preset id 共用 `data-theme` |
| D4 | `colorSchemes` 营销向 hover 与工作台底线冲突 |

- [ ] **Step 5: Extend 验收标准**

Add checklist bullets:

- Appearance 切换后模块 banner/`wb-theme-*` 归属色不变  
- `npx vitest run src/common/config/themeConfig.test.ts` 通过  
- 仓库无 `src/common/config/themes.ts`  

Keep existing `css:audit` / `ui:audit` / `generate:tokens` guidance.

- [ ] **Step 6: Commit**

```bash
git add docs/THEME_SYSTEM_GUIDELINES.md
git commit -m "$(cat <<'EOF'
docs(theme): codify A2 layers, minimal preset, and runtime SSOT

Expand THEME_SYSTEM_GUIDELINES with appearance vs ownership contract,
preset inventory, debts D1–D4, and acceptance checks.
EOF
)"
```

---

### Task 4: Update `VISUAL_DESIGN_GUIDELINES.md`（执行细则）

**Files:**
- Modify: `docs/VISUAL_DESIGN_GUIDELINES.md`

**Interfaces:**
- Consumes: Spec §4.3; Task 3 authority chain
- Produces: resolved conflicts + short Appearance section

- [ ] **Step 1: Bump 更新时间 to `2026-07-25`**

- [ ] **Step 2: Fix color mapping table for Playground**

Wherever Playground / banner mapping appears, set:

- 目录 `color`: **`orange`**
- Banner theme: 与 orange 归属一致（`wb-theme` 或等价 orange 系；**删除** indigo/cyan 作为 Playground 归属的表述）

Align with `menuConfig.ts`:

- `modules.playground.themeColor: 'orange'`
- `categories.playground.color: 'orange'`

- [ ] **Step 3: Tighten 圆角 section**

Replace ambiguous “普通卡片 8px 到 16px” with two rows:

| 元素 | 圆角 |
| --- | --- |
| 工作台面板 / 表单工作区 | **≤ 8px** |
| Welcome banner / 模块总览入口卡 | **12–16px**（不得复制到工具面板） |

- [ ] **Step 4: Add subsection under 颜色体系 —「用户 Appearance 主题」**

Content requirements:

- 系统设置外观主题只改全局 `--color-primary*` / focus  
- **不**改左侧目录色、welcome banner 归属、`wb-theme-*`  
- `minimal`（极简素色）：工业 slate-700，适合长时作业；反例：用 Appearance 冲掉模块归属、引入展示字体、彩色 glow  

- [ ] **Step 5: Note colorSchemes motion boundary**

In 组件优先 or 卡片相关段落加一句：`colorSchemes` 的 scale / 彩色阴影仅用于总览/入口卡；工作台面板禁止 hover 位移与 scale。

- [ ] **Step 6: Commit**

```bash
git add docs/VISUAL_DESIGN_GUIDELINES.md
git commit -m "$(cat <<'EOF'
docs(visual): resolve theme conflicts and document appearance layer

Fix Playground ownership to orange, split workbench vs entry radii,
and document minimal appearance behavior for long-session ops.
EOF
)"
```

---

### Task 5: Final verification gate

**Files:**
- None required (verify only)

- [ ] **Step 1: Unit tests**

```bash
npx vitest run src/common/config/themeConfig.test.ts
```

Expected: PASS.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: exit 0.

- [ ] **Step 3: Structural checks**

```bash
# dead dual runtime gone
test ! -f src/common/config/themes.ts && echo "themes.ts absent OK"

# minimal present in source
rg -n "id: 'minimal'|极简素色" src/common/config/themeConfig.ts

# docs mention A2 / minimal / Playground orange
rg -n "双层主题|Appearance|minimal|极简素色" docs/THEME_SYSTEM_GUIDELINES.md
rg -n "Playground|orange|Appearance|极简素色|≤ 8px|12–16px" docs/VISUAL_DESIGN_GUIDELINES.md
```

Expected: file absent; source + docs hits as planned.

- [ ] **Step 4: Optional settings smoke (if app running)**

Open 系统设置 → 外观 → 确认下拉含「极简素色」且排在默认后。切换后控制台/计算样式中 primary 为 slate-700 引用；进入 Keyword Hunter 等模块 banner 归属色仍为菜单色。

- [ ] **Step 5: Final commit only if uncommitted doc/code fixes from verification**

If clean:

```bash
git status
```

No extra commit required.

---

## Spec Coverage Checklist (plan self-review)

| Spec requirement | Task |
| --- | --- |
| A2 双层模型 + 优先级 | Task 1 (code: no ColorContext), Task 3 (docs) |
| 唯一 ThemeManager / 删 themes.ts | Task 1–2 |
| `minimal` slate-700 + focus customVars | Task 1 |
| Preset 顺序 default → minimal → … | Task 1 |
| 设置面板自动出现 | Task 1（既有 `Object.values`）+ Task 5 smoke |
| THEME_SYSTEM 大修 | Task 3 |
| VISUAL 消冲突 + Playground orange | Task 4 |
| 债务 D1–D4 登记不修 | Task 3 |
| 非目标：token 全量迁移 / dark / banner / Deep Chat / 字体 | 全任务不触碰 |
| 验收 vitest + type-check | Task 5 |

**Placeholder scan:** none intentional.  
**Type consistency:** `ThemeConfig.customVars?: Record<string, string>`; storage `'app-theme'`; runtime rule id `'theme-manager-vars'`.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-25-theme-architecture-enterprise.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with `executing-plans`, checkpoints between tasks  

**Which approach?**
