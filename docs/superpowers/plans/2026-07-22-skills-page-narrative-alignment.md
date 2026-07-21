# Skills 页叙事对齐（方案 B）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按 spec 将技能页对齐提示词页的叙事结构：原则 → 公式 → 目录 → 路径 → 规则 → 页脚，且目录试用链路不回归。

**Architecture:** 纯前端模板/样式/轻量 DOM 适配。静态 HTML 承担新叙事板块；`index.ts` 仅调整指标与空库 chrome 的选择器与 Banner 文案；`skillRegistry` 与 Deep Chat handoff 不动。样式平行提示词页（`skill-source-card` 等独立 class），不 import prompts 模块。

**Tech Stack:** Vite + TypeScript + Alpine-free 原生 DOM；Tailwind utility classes in template；`skills_style.css`；现有 `skillRegistry` / `AppModal`。

**Spec:** `docs/superpowers/specs/2026-07-22-skills-page-narrative-alignment-design.md`

## Global Constraints

- 结构顺序固定：Hero → 原则 → 公式 → 目录 → 路径 → 规则 → 页脚
- Banner：`wb-theme-violet`；不新增硬编码主色
- `.skills-catalog-sticky` 保持 `position: static`（不吸顶）
- 主 CTA 仍为「在 Deep Chat 试用」；不暴露 skillId 复制
- 不改 `skillRegistry`、vendor SKILL.md、Deep Chat 协议
- 删除 `details.skills-secondary` 折叠区
- 空库：指标「—」、Banner「技能库为空」

---

## File map

| 文件 | 职责 |
|------|------|
| `src/modules/more/views/explore/skills/template.html` | 页面 IA 与全部静态板块 HTML |
| `src/modules/more/views/explore/skills/skills_style.css` | 公式/路径/规则/页脚样式；source-card 平行 prompts |
| `src/modules/more/views/explore/skills/index.ts` | `renderMetrics` / `syncEmptyLibraryChrome` DOM 适配；空库对目录区 |
| `tests/e2e/release-smoke.spec.ts` | 若依赖 skills DOM，确认选择器仍有效（一般无需改） |

---

### Task 1: 重组 template 静态结构（原则 + 公式 + 目录位）

**Files:**
- Modify: `src/modules/more/views/explore/skills/template.html`
- Modify: `src/modules/more/views/explore/skills/skills_style.css`（仅保证目录区不被破坏）

**Interfaces:**
- Consumes: 现有 `#skill-search`、`#skill-category-container`、`#skill-list`、`#skill-result-count`、`#skill-banner-total`、`#metric-*`
- Produces: 稳定 DOM id，供 Task 2–3 与 `index.ts` 使用

- [ ] **Step 1: 备份当前 template 心智模型**

打开对照：
- 提示词：`src/modules/more/views/explore/prompts/template.html`（原则 36–81、公式 83–145、库 264–300）
- 技能现状：`skills/template.html`

- [ ] **Step 2: 改写 Banner 文案（结构类名不变）**

```html
<p class="wb-description">
  按场景浏览可挂载方法论：在 Deep Chat 试用，或复制全文到外部 Agent；工作台可自动加载，无需填 ID。
</p>
```

Tags 保持三枚：`#skill-banner-total`、正式/试用版、中文外壳/英文原文。

- [ ] **Step 3: 在 Banner 后插入「使用原则」四卡**

放在 `wb-container` 闭合后、`skills-catalog` **之前**：

```html
<section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6" aria-label="技能使用原则">
  <!-- 四 article：场景对齐 / 读清边界 / 一键试用 / 结果可验收
       结构对标 prompts 原则卡：w-10 h-10 rounded-lg bg-*-50 text-*-600 + h2 + p -->
</section>
```

文案以 spec §4.2 为准（中文完整句，不要占位符）。

- [ ] **Step 4: 插入「技能使用公式」区块**

对标 prompts Prompt Formula：

```html
<section class="bg-white border border-slate-200 rounded-lg p-6 mb-6" aria-label="技能使用公式">
  <div class="flex ... mb-5">
    <p class="text-xs font-semibold text-violet-600 uppercase">Skill Formula</p>
    <h2 class="text-xl font-bold text-slate-900 mt-1">技能使用公式</h2>
  </div>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-5">
    <div class="lg:col-span-3 bg-slate-950 rounded-lg p-5 text-slate-100">
      <!-- ol 六步：选场景 → 读边界 → 准备输入 → 挂载试用 → 补数据 → 验收归档 -->
    </div>
    <div class="lg:col-span-2 grid grid-cols-1 gap-3">
      <!-- 上线前五问；不要这样用 (bg-violet-50) -->
    </div>
  </div>
</section>
```

- [ ] **Step 5: 调整目录区 eyebrow，删除 `details.skills-secondary`**

目录 section 标题改为：

```html
<p class="text-xs font-semibold text-violet-600 uppercase">Skill Library</p>
<h2 class="text-xl font-bold text-slate-900 mt-1">可试用方法论</h2>
```

副文案：`先读边界，再 Deep Chat 试用或复制全文。`

**删除**整个 `<details class="skills-secondary">...</details>` 块。

将原 `#metric-total|category|scripts|beta` 移到页脚占位（可先放在 catalog 后临时 footer，Task 2 完善路径/规则后再固定）：

```html
<footer class="skills-page-footer mb-6" aria-label="技能库统计与来源">
  <div class="grid grid-cols-2 gap-3 xl:grid-cols-4 mb-4">
    <!-- 保留四个 metric id -->
  </div>
  <p class="text-xs text-slate-500">... Amazon-Skills 链接 ...</p>
</footer>
```

保留 `#skills-library-empty-hint`（可放在目录 section 顶部，默认 hidden）。

- [ ] **Step 6: 浏览器或 dev 粗验**

Run: `npm run dev`（或已有 preview）  
打开 `/#/more/explore/skills`  
Expected: 顺序 Hero → 原则 → 公式 → 目录 → 页脚；搜索/分类/卡片仍可用；无 `skills-secondary`。

- [ ] **Step 7: Commit**

```bash
git add src/modules/more/views/explore/skills/template.html
git commit -m "feat(skills): restructure page IA with principles and formula sections"
```

---

### Task 2: 实战路径 + 业务规则板块

**Files:**
- Modify: `src/modules/more/views/explore/skills/template.html`
- Modify: `src/modules/more/views/explore/skills/skills_style.css`

**Interfaces:**
- Consumes: Task 1 的目录与页脚位置
- Produces: 路径区、规则区静态 HTML；`skill-source-card` / `skill-business-rule` 样式

- [ ] **Step 1: 在目录 section 与 footer 之间插入「高频实战路径」**

```html
<section class="mb-6" aria-label="高频实战路径">
  <div class="flex ... mb-4">
    <p class="text-xs font-semibold text-slate-500 uppercase">Seller Playbooks</p>
    <h2 class="text-xl font-bold text-slate-900 mt-1">四条高频实战路径</h2>
  </div>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
    <!-- Listing 转化 / 广告分诊 / 利润与定价 / 选品与竞品
         每卡：图标 + 标题 + 一句说明 + 输入/处理/输出 三格 (bg-slate-50) -->
  </div>
</section>
```

文案见 spec §4.5。

- [ ] **Step 2: 插入「业务规则如何进入技能」**

```html
<section class="bg-white border border-slate-200 rounded-lg p-6 mb-8" aria-label="业务规则">
  <div class="... mb-5">
    <p class="text-xs font-semibold text-slate-500 uppercase">Business Operating Rules</p>
    <h2 class="text-xl font-bold text-slate-900 mt-1">业务规则如何进入技能</h2>
  </div>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <article class="skill-source-card">
      <span class="skill-source-card__label">Listing合规</span>
      <strong>先合规，再转化</strong>
      <p>...</p>
      <div class="skill-business-rule">
        <span>技能要求</span>
        <p>...</p>
      </div>
    </article>
    <!-- 共 6 卡：关键词 / 广告样本量 / VOC / 利润 / 挂载复核 -->
  </div>
</section>
```

文案见 spec §4.6。

- [ ] **Step 3: 在 `skills_style.css` 增加 source-card 样式**

平行 `prompts_style.css` 的 `.prompt-source-card*`（约 209–258 行），使用 **skill-** 前缀与 violet token：

```css
.skill-source-card {
  /* border, padding, rounded — 对标 prompt 卡密度 */
}
.skill-source-card__label { /* violet-50 底 + violet-700 字 */ }
.skill-source-card strong { ... }
.skill-source-card p { ... }
.skill-business-rule { /* violet-50 子块 */ }
.skill-business-rule span { ... }
.skill-business-rule p { ... }
```

可选 hover：`box-shadow` 轻量，无夸张 transform。

- [ ] **Step 4: 固化页脚**

Footer 放在规则 section 之后：四指标 + 来源说明。确保 `#metric-total` 等 id **唯一且仍存在**。

- [ ] **Step 5: 视觉自检**

Expected: 全页顺序符合 Global Constraints；桌面三列规则卡、路径 2×2；无横向溢出。

- [ ] **Step 6: Commit**

```bash
git add src/modules/more/views/explore/skills/template.html src/modules/more/views/explore/skills/skills_style.css
git commit -m "feat(skills): add playbooks and business-rule sections aligned with prompts"
```

---

### Task 3: index.ts 空库 / 指标适配

**Files:**
- Modify: `src/modules/more/views/explore/skills/index.ts`

**Interfaces:**
- Consumes: `#metric-total|category|scripts|beta`、`#skill-banner-total`、`.skills-catalog-sticky`、`#skills-library-empty-hint`、`.skills-page`
- Produces: 空库时 Banner/指标/筛选 chrome 正确

- [ ] **Step 1: 阅读并定位**

- `renderMetrics`（约 161–179）
- `syncEmptyLibraryChrome`（约 145–159）

- [ ] **Step 2: 移除对 `.skills-secondary` 的依赖**

`syncEmptyLibraryChrome` 中删除：

```ts
const secondary = moduleRoot.querySelector<HTMLDetailsElement>('.skills-secondary');
if (secondary) secondary.open = empty;
```

保留：Banner 文案、`skills-page--empty-library` class、sticky hidden、empty hint。

- [ ] **Step 3: 确认 metric 选择器仍命中 footer**

`setMetricText('metric-total', ...)` 等无需改 id；若 template 改名则同步。

- [ ] **Step 4: 空库时目录列表**

`renderList` 已有空态逻辑则不动；确认 empty 时 `skill-list` 显示引导、`skills-library-empty-hint` 可见。

- [ ] **Step 5: 手测两种状态**

| 状态 | Expected |
|------|----------|
| 有技能 | Banner 显示「N 个技能」；四指标为数字；筛选可见 |
| 模拟空库（若难模拟则 code-read） | Banner「技能库为空」；指标「—」；hint 显示 |

- [ ] **Step 6: Commit**

```bash
git add src/modules/more/views/explore/skills/index.ts
git commit -m "fix(skills): adapt metrics and empty-library chrome after secondary removal"
```

---

### Task 4: 回归验证与收尾

**Files:**
- 可能 Modify: `tests/e2e/release-smoke.spec.ts`（仅当 Skills 选择器失败时）

- [ ] **Step 1: 格式与类型**

```bash
npx prettier --config config/.prettierrc.json --write "src/modules/more/views/explore/skills/**/*.{ts,css,html}"
npx tsc --noEmit -p tsconfig.app.json
npx eslint "src/modules/more/views/explore/skills/index.ts"
```

Expected: 全部通过。

- [ ] **Step 2: 单元/冒烟相关**

```bash
npx vitest run src/services/skillRegistry --reporter=dot
npx playwright test --config=config/playwright.release.config.ts -g "Skills" 
```

Expected: skillRegistry 绿；Skills smoke 通过（路由可见 + 试用交接）。若 template 破坏了 `.skills-page` 或试用按钮，修复后重跑。

- [ ] **Step 3: 对照验收清单（spec §8）**

手测或 dev 核对：

- [ ] 顺序 Hero → 原则 → 公式 → 目录 → 路径 → 规则 → 页脚  
- [ ] 搜索 / 分类 / 卡片 / 详情 / 复制 / 试用  
- [ ] 不吸顶  
- [ ] 主 CTA 可见  

- [ ] **Step 4: 更新 spec 状态行（可选）**

将 design spec 状态改为：`Implemented` 或 `Ready for QA`。

- [ ] **Step 5: 最终 commit（若有残余）**

```bash
git add -A src/modules/more/views/explore/skills docs/superpowers/specs/2026-07-22-skills-page-narrative-alignment-design.md
git commit -m "feat(skills): complete narrative alignment with prompts page (plan B)"
```

---

## Plan self-review

| Spec 要求 | 对应 Task |
|-----------|-----------|
| 原则 ×4 | Task 1 |
| 技能使用公式 | Task 1 |
| 目录保留且近上 | Task 1 |
| 删除 secondary 折叠 | Task 1 + 3 |
| 实战路径 2×2 | Task 2 |
| 业务规则 6 卡 | Task 2 |
| 页脚指标 + 来源 | Task 1/2 + 3 |
| 视觉 violet / 无硬编码主色 | Task 1–2 CSS |
| 不吸顶 | 约束 + 既有 CSS |
| 交互不回归 | Task 4 smoke |
| 非目标：registry/Deep Chat | 无任务触碰 |

Placeholder scan: 无 TBD。  
Class 命名：`skill-source-card` / `skill-business-rule` 全篇一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-22-skills-page-narrative-alignment.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — 每任务派生子代理，任务间 review  
2. **Inline Execution** — 本会话按 `executing-plans` 连续执行并设检查点  

**Which approach?**
