# Theme System Landing Status Board

**日期**: 2026-07-26（refresh @ post-`5ad7b1c1` wave · D6#9 / App overview focus / D11 cards / D12×12 / D4 audit / D8 tests）  
**范围**: `main` ahead of `sops/main` 主题收敛链（Phase 0 起 → HEAD）  
**角色**: Tech Lead / Release docs  
**诚实声明**: **Code gates 可运营；Visual / XO 未签收（Yellow）。** 不得宣称「主题体验 RC 已过」。

权威链：  
[企业审查路线图](../specs/2026-07-26-theme-system-enterprise-audit-and-roadmap.md) ·  
[作战手册](./2026-07-26-theme-system-team-operating-playbook.md) ·  
[体验矩阵](./2026-07-26-theme-system-experience-acceptance-matrix.md) ·  
[XO 签字状态](./2026-07-26-theme-system-xo-signoff-status.md) ·  
[Token 覆盖库存](./2026-07-26-token-override-inventory.md) ·  
[Workbench radius 决策](./2026-07-26-workbench-radius-decision.md) ·  
[Ownership Role → Palette 映射](./2026-07-26-ownership-role-palette-map.md) ·  
[Local token 前缀生命周期 (D9)](./2026-07-26-local-token-prefix-lifecycle.md)

---

## 1. Executive status

| 层                 | 灯         | 一句话                                                                                                                                                                                                                                           |
| ------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Code / 契约**    | **Green**  | HEAD `5ad7b1c1` + **本波**: D6 #9 KH process · App overview focus hybrid · D11 `cards.css` tri-selector ×19 · D12 scaffold **12** shots · D4 misuse audit clean · D8 unit 加厚 |
| **Visual / XO**    | **Yellow** | 人类 30 min **仍未跑**；D12 opt-in 非 Pass / 非 CI gate；**不得宣称 visual Pass** |
| **主题 RC 体验门** | **Open**   | Tech Lead 可预签 code only；**不可**仅凭 code 关体验 RC |

**一句话**: 工程债继续收敛；体验关闸仍只靠 **人工 XO**。

**Nav ownership（产品决策）**: megaMenu + left sidebar = **Layer B Module Ownership**，**非** Appearance 全控。多色 wayfinding 来自 `menuConfig` / `inferColorFromModule`；壳层 hardcode 基线 megaMenu **13** 是 **有意 Ownership**，不是未清 D6。详见 [THEME_SYSTEM_GUIDELINES §2.2 导航 = Ownership](../../THEME_SYSTEM_GUIDELINES.md)。

---

## 2. Done by phase

| Phase                          | 目标             | 状态                                          | 已落地（证据）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------ | ---------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0** 治理与防回归             | 锁边界、不改视觉 | **Done (code)**                               | 作战手册、UX 矩阵、D7–D12 入宪、`theme:hardcode-baseline`、ThemeColors 收窄（D10 部分）                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **1** Color Mode × Appearance  | 修 D3/D11 运行时 | **Done (code)** / **Visual open**             | `data-appearance` + `data-color-mode`；Settings 颜色模式 UI；壳层 nav/search/modal primary；unit + smoke 文档根属性                                                                                                                                                                                                                                                                                                                                                                                          |
| **2** Token 事实源             | 修 D1/D2 结构    | **Partial**                                   | 清点文档；192 条原子 identical 删除；allowlist **20**；`--workbench-radius` SSOT + 多批消费者（含 buttons glow / radius batch 3）；**未**完成 `variables.semantic.css` 全拆                                                                                                                                                                                                                                                                                                                                  |
| **3** 壳层 Appearance 可见面   | 用户看得见换肤   | **Partial**                                   | Settings primary chrome + form tokens/focus；buttons primary glow 跟 Appearance；壳层部分 CTA；sidebar 去 marketing scale；**XO 未签「肉眼明确变化」**                                                                                                                                                                                                                                                                                                                                                       |
| **4** Ownership / colorSchemes | 修 D4/D7/D8      | **Partial (D7 code Done; D4 long tail open)** | **Role → Palette 映射文档**（19 roles）+ smoke KH `wb-theme-rose`；**helpers**: `getWorkbenchCardClasses` / `getWorkbenchIconContainerClasses` + `colorSchemes.test.ts`；**sidebar** category icon 去 scale；**调用点**: AI/PromptLab/Scraper + KH report + AI JSON icons；**D7 @ f7268f93**: `setModuleColor` **@deprecated** + **ESLint hard-gate**（禁生产新调；allow test/legacy）+ `ColorContext.test.ts`（infer / legacy write / 解耦）；**剩余**: 调用点清零审计 / dual-channel 彻底下线 **optional** |
| **5** D6 业务页分期            | 业务 `blue-*` 降 | **Partial (samples)**                         | 业务 ~900+ 仍 Informational 基线；**样本**: KH CTA → #8 input → **#9 process/filter/snapshot**；Scraper / AI Analysis / PPC / PromptLab / Skills #6 / Deep Chat #7；coverage 多色梯度与 rose ownership **保留**；壳层 megaMenu **13**（Ownership，非 D6 债）                                                                |

图例：Done (code) = 契约/门禁/实现；Visual open = 浏览器签收缺失；Partial (samples) = 个别业务面已动手，非全量 D6 清零。

---

## 3. Gates live in CI

并入 `npm run ci:quality`（`prebuild` → security + quality）：

| 门                                | npm script                                                 | 用途                                                                                                     |
| --------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| CSS vars                          | `npm run css:audit`                                        | 变量命名 / 结构                                                                                          |
| 壳层 blue 基线 (D6)               | `npm run theme:hardcode-baseline:gate`                     | shell `blue-*` **只降不升**                                                                              |
| D1 原子覆盖                       | `npm run token:override-audit:gate`                        | unallowlisted atomic **失败**                                                                            |
| Theme 契约（PR 必跑）             | `npx vitest run src/common/config/themeConfig.test.ts`     | Appearance / Color Mode                                                                                  |
| colorSchemes workbench（D4 子集） | `npx vitest run src/common/constants/colorSchemes.test.ts` | entry 保留 motion；workbench 禁 translate/scale                                                          |
| ColorContext（D7 子集）           | `npx vitest run src/common/utils/ColorContext.test.ts`     | infer SSOT；deprecated write 兼容；与 infer 解耦                                                         |
| D7 ESLint 硬门                    | ESLint ban `setModuleColor`（生产）                        | 禁生产新调；test/legacy allow                                                                            |
| UI 结构                           | `npm run ui:audit`（含 `workbench-ui:audit`）              | card/callout/workbench                                                                                   |
| Token 生成                        | `npm run generate:tokens`                                  | Phase 2+ 无手工污染 generated                                                                            |
| 类型 / 全量                       | `npm run type-check` · `npm run ci:all`                    | merge / 发版                                                                                             |
| 发布烟雾                          | `npm run test:e2e:smoke`                                   | 路由 + **Appearance / color-mode** 文档根 + **KH ownership** + **dark×minimal** 契约（**无**色差） |
| 报告（不阻断）                    | `theme:hardcode-baseline` · `token:override-audit`         | 本地 diff 诊断                                                                                           |

顺序（quality 内主题相关）: `css:audit` → `theme:hardcode-baseline:gate` → `token:override-audit:gate` → …

### 3.1 E2E 主题契约（smoke 子集 · 诚实边界）

| 断言                                         | 状态                     | 说明                                                                                                                                |
| -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `data-appearance` / `data-color-mode` 文档根 | **In smoke**             | Phase 1 双轴 API 可回归                                                                                                             |
| Appearance 切换后持久化 minimal 等           | **In smoke**             | 设置面板路径                                                                                                                        |
| KH ownership class 在 minimal 后仍在         | **In smoke @ a5079e23+** | `wb-theme-rose`（banner）或 `sidebar-theme-rose`；证明 A 不冲 B                                                                     |
| colorSchemes entry vs workbench helpers      | **Unit @ 0c3cb2be+**     | 非 e2e；契约在 `colorSchemes.test.ts`                                                                                               |
| ColorContext infer / deprecated write        | **Unit @ 5b6684f9+**     | 非 e2e；`ColorContext.test.ts`                                                                                                      |
| D7 ESLint ban `setModuleColor`               | **Lint @ f7268f93**      | 生产路径硬门；test/legacy allow；**非** e2e                                                                                         |
| AI/PromptLab/Scraper icon helpers 调用点     | **Code @ 5f602882**      | **无** e2e 断言；回归靠 unit + 人工 XO 抽检                                                                                         |
| PPC primary chrome 样本                      | **Code @ 5b6684f9**      | filter / resume / search focus → primary；**无** e2e；肉眼抽检可选                                                                  |
| PromptLab CTA 样本                           | **Code @ f7268f93**      | primary CTA → Appearance；**无** e2e；肉眼抽检可选                                                                                  |
| Skills CTA 样本 (#6)                         | **In HEAD `90914af1`**   | 试用 CTA / search·card focus → primary；保留分类紫与多色徽章；**无** e2e 色差；**非** visual Pass                                   |
| Deep Chat shell 样本 (#7)                    | **In HEAD `90914af1`**   | top chrome / 模型·设置·重命名 focus → primary；**禁止**重写 terracotta 引擎；**无** e2e 色差；**非** visual Pass                    |
| KH input 样本 (#8)                           | **Working tree / 跟进**  | keywords shell focus / count badge / section icon → primary；保留 Listing emerald 与 amber 重复徽章；**无** e2e；**非** visual Pass |
| `--shadow-primary*`                          | **In HEAD**              | `color-mix` 跟 `--color-primary`（Appearance）；**非** visual Pass                                                                  |
| dark×minimal **契约**                        | **In smoke**             | 文档根 + KH ownership；**非**色差                                                                                                   |
| default↔minimal 全路由色差 / 截图            | **Not in CI**            | 仍依赖人类 XO + D12 opt-in scaffold                                                                                                 |
| dark×minimal **视觉**签收                    | **Open / Yellow**        | 契约可测；**视觉未签**；**不得宣称 XO Pass**                                                                                        |

---

## 4. Metrics (now)

| 指标                             | 值                                                                 | 备注                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Shell blue 硬编码**            | **13**                                                             | **仅** `src/common/ui/megaMenu.ts`（模块玻璃色板 / Ownership，Informational）                                                                                                                       |
| **Workbench radius 已落区**      | R0–R3 + batch 3                                                    | 语义 token + cards/panel 别名；analysis-widget、PromptLab/AI/MA、KH、PPC import/filter/table/settings、Scraper 面板、forms、app-center 部分 → `var(--workbench-radius…)`；**entry/overview 卡未压** |
| **Atomic override allowlist**    | **20**                                                             | radius 6 + shadow 6 + z-index 7 + easing 1；unallowlisted **0**                                                                                                                                     |
| Handwritten `:root`（D1 首刀后） | ~267                                                               | 去 192 identical 后；语义 + intentional 冲突保留                                                                                                                                                    |
| XO 场景（签收文档）              | ~**16** automated / ~**20** code / ~**34** manual / visual **0 full Pass** | 见 XO status refresh；**人类 30 min 仍 required**；**Visual Yellow**                                                                                                                          |
| 业务 `blue-*`（D6）              | ~900+ 行级基线                                                     | Phase 5；**样本**: KH CTA…#8 input + **#9 process/filter/snapshot** + Scraper / AI / PPC / PromptLab / Skills #6 / Deep Chat #7；`--shadow-primary*` 跟 primary；**非**全量清零；不阻塞 code Green |
| Ownership Role 表                | **19 roles 文档**                                                  | `2026-07-26-ownership-role-palette-map.md`；实现未绑 `data-ownership-role` 全站                                                                                                                     |
| Workbench colorSchemes helpers   | **API + unit + 首批调用点 + misuse audit clean**                   | helpers 已导出；**AI / PromptLab / Scraper / KH report / AI JSON icons** 已迁；**§5.2**: 0 production entry-helper 误用 / 0 非 entry `scale-110`；`getWorkbenchCardClasses` 仍无生产调用（optional）                                                    |
| D7 `setModuleColor`              | **Deprecated + ESLint Done**                                       | JSDoc `@deprecated` + unit + **ESLint hard-gate**（禁生产新调）；**legacy write 仍可用**；调用点清零 / 双通道彻底下线 **optional**                                                                  |

---

## 5. Open debts D1–D12

| ID      | 严重度    | 状态                                | 剩余工作                                                                                                                                                                                                                         |
| ------- | --------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1**  | P0 结构   | **Partial**                         | 20 条 intentional atomic 仍手写覆盖；远期 semantic 文件拆分 / 消费者迁 workbench 后再收 allowlist                                                                                                                                |
| **D2**  | P1 语义   | **Partial**                         | SSOT 已有；长尾模块 `rounded-md/lg/xl` 误用与 R4 引用改名未清                                                                                                                                                                    |
| **D3**  | P0 运行时 | **Code fixed**                      | 双轴已拆；e2e dark×minimal **已进 smoke**；兼容 `data-theme` 读路径仍在；**视觉签 Open**                                                                                                                                         |
| **D4**  | P1 体验   | **Partial (helpers + MA/KH icons; misuse audit clean)** | Role 表 + workbench helpers + unit + sidebar scale 修 + **AI/PromptLab/Scraper/KH report/AI JSON icon 调用点** + **#2 residual** + **§5.2 调用点审计 (HEAD `5ad7b1c1`)**: **0** production `getCardClasses`/`getIconContainerClasses` 误用；**0** 非 entry `scale-110` chrome；**长尾 optional**: `getWorkbenchCardClasses` 尚未有生产调用点 / 其余模块 icon 渐进迁 |
| **D5**  | P2        | **Partial**                         | root `--focus-ring-soft` → `color-mix(focus-ring)`；header search / forms dark / Overview search / nav-focus 已跟 focus-ring；**剩余 intentional 例外见 §5.1**；业务页蓝 focus 仍 D6 长尾                                        |
| **D6**  | P1 可见面 | **Shell locked / biz samples**      | 壳层 megaMenu **13** = **有意 Ownership**；**样本**: KH…PromptLab + Skills #6 + Deep Chat #7 + #8 KH input + **#9 KH process/filter/snapshot** + shadow-primary；其余业务页 Informational 长尾 |
| **D7**  | P1        | **Done（deprecate + ESLint）**      | `setModuleColor` **@deprecated** + unit + **ESLint hard-gate** @ `f7268f93`；infer 为 ownership SSOT；**剩余 optional**: 调用点清零 / dual-channel 彻底下线                                                                      |
| **D8**  | P1        | **Partial (doc + code scaffold)**   | Role 表 + **`ownershipRoles.ts`**（19 roles / getPaletteForRole / getOwnershipRoleForModule + unit）；**未**全站 `data-ownership-role` 绑定                                                                                                                                                   |
| **D9**  | P2        | **Partial (Doc done)**              | 生命周期文档已落地：[`2026-07-26-local-token-prefix-lifecycle.md`](./2026-07-26-local-token-prefix-lifecycle.md)（库存 / elevate·keep·archive / PR 清单 / 与 D1 边界）；**未**做大量 rename 或死前缀删除；代码侧 F 波次 optional |
| **D10** | P1        | **Partial**                         | 类型已收窄 primary 族；调用方误用状态色文档/审计可再紧                                                                                                                                                                           |
| **D11** | P2        | **Code fixed / CSS residual**       | 运行时已拆 color-mode；**`cards.css` 19 规则**已 tri-selector；其余 forms/header/interactive 等仍见 §10                                                                                                                                          |
| **D12** | P2 | **Open（scaffold opt-in）** | `theme-appearance-scaffold`：**6 屏 × 2 = 12**（settings/KH/home + App Center/Scraper/PPC）；`test:visual:theme` opt-in；**不** visual Pass；人工首 8 张 XO 仍 required |

### 5.1 D5 — remaining intentional blue / non-Appearance focus

Leave alone unless product reclassifies ownership:

| Surface | Why leave | Note |
| --- | --- | --- |
| **megaMenu** GLASS / rings (shell **13**) | Layer B Ownership | **No** GLASS rewrite; not D5 bug |
| **sidebar-theme-blue** `--sidebar-focus` | Module ownership palette | Active/focus tracks sidebar scheme, not Appearance |
| **welcome-banner** `wb-theme-*` focus | Workbench ownership | Uses `--wb-theme-accent` / `--wb-focus-ring` |
| **chat** purple input focus | Product brand (Rufus/chat) | Not shell primary chrome |
| **ErrorBoundary** slate / severity color rings | Status/action semantics | Not Appearance brand |
| Shared focus fallbacks `#3b82f6` after `var(--color-focus-ring, …)` | Dead fallback only | Live path is CSS var; optional later cleanup |
| Business `focus:ring-blue-*` long tail | D6 Informational | KH/PromptLab/etc. sample pages only where already migrated |

### 5.2 D4 — marketing helper misuse audit (`5ad7b1c1`)

**Scope**: `src/modules` + shell consumers of `colorSchemes` helpers; residual `scale-110` on non-entry workbench chrome.

| Bucket | Sites | Verdict |
| --- | --- | --- |
| **OK entry / marketing lift** | `megaMenu.ts` card `hover:-translate-y-0.5` (intentional Layer B entry); `getCardClasses` / `getIconContainerClasses` keep translate + `scale-110` in API + `colorSchemes.test.ts` | **Keep** — do not strip megaMenu / entry motion |
| **OK workbench call sites** | `getWorkbenchIconContainerClasses`: AI Analysis (`AlpinePanel` selection + JSON icons), PromptLab section icons, Scraper strategy icon, KH analysis report icon; Scraper CSS `.section-header .header-icon` no scale/rotate; Sidebar category icon no marketing scale | **Correct** |
| **Misuse candidates** | Production `getCardClasses(` / `getIconContainerClasses(` under `src/` **outside** `colorSchemes.ts` + test | **None found** |
| **Residual `scale-110`** | Token only on entry helper (`iconScale` / `getIconContainerClasses`); no workbench template/TS/CSS chrome hit | **None on non-entry chrome** |
| **Not misuse (informational)** | `getWorkbenchCardClasses` has **no** production call sites yet (API+unit only); overview `sop-icon-container` / entry cards are overview surfaces, not tool chrome | Optional adoption later — **no code fix this wave** |

**Code fix this wave**: **none** (docs-only audit; no clear workbench misuse of marketing helpers).

---

## 6. Human XO — next action

**阻塞体验关闸的唯一最短路径**: 人类按 **30 分钟浏览器脚本**跑完并贴记录。**本 refresh 后仍 required**（文档根双轴 / KH ownership / dark×minimal smoke / D7 ESLint / 样本 primary **不**替代 XO）。

- 脚本与记录模板:  
  [`2026-07-26-theme-system-xo-signoff-status.md` §3](./2026-07-26-theme-system-xo-signoff-status.md#3-人类-xo-30-分钟手动浏览器脚本)
- 矩阵: [`experience-acceptance-matrix.md`](./2026-07-26-theme-system-experience-acceptance-matrix.md)
- 必测: X1 default↔minimal×3 · X2 ownership 抽检（**KH `wb-theme-rose` / PPC hero / MA indigo / Deep Chat terracotta**）· X5 dark×appearance · focus · 刷新持久化
- **可选肉眼（XO §1.8）**: **Skills 试用 CTA** + **Deep Chat shell** chrome/focus 跟 Appearance（terracotta **不变**）+ dark×minimal 肉眼复核；另可选 KH/Scraper/AI/PPC/PromptLab/#8 input
- **可选截图**: [D12 §6 首 8 张](./2026-07-26-theme-visual-baseline-d12.md#6-first-8-screenshots-to-capture-tomorrow) — **截图 ≠ visual Pass**
- **不测**: 全站 D6 仍蓝（允许 Informational）
- 签收后: 填 XO 结论 `PASS / PASS with debt / FAIL`；Tech Lead 仅勾 code gates §4.1；**Visual 保持 Yellow 直至 XO 签字**

---

## 7. Recommended next 3 agent waves

| #     | Wave                                              | 范围                                                                                                                         | 验证                                                                       |
| ----- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **1** | **Human XO（始终优先 · 阻塞体验关闸）**           | 30 min 浏览器脚本 + 记录模板；X1/X2/X5 + 可选 Skills CTA / Deep Chat shell                                                   | 矩阵勾选 + XO status 结论；**仍不宣称 visual Pass**                        |
| **2** | **D12 首 8 人工截图 + scaffold 对照（可并发）**   | 按 [D12 §6](./2026-07-26-theme-visual-baseline-d12.md#6-first-8-screenshots-to-capture-tomorrow) 归档 8 张；可选 `test:visual:theme` | 截图 + MANIFEST；**不** fail-closed CI；**不** visual Pass                 |
| **3** | **D6 下一业务样本（可并发 · 低优先）**            | Skills/Deep Chat shell **已合入 HEAD**；下一页 primary 样本（非 900+ 清零）；**禁止**重写 terracotta                         | hardcode gate 不升；**仍不宣称 visual Pass**                               |

**下一波优先**: **Human XO 30 min**（唯一体验关闸）；可选 D12 首 8 张；D6 长尾仅在 XO 不阻塞时穿插。  
**禁止本周扩 scope**: 一次清零 900+ blue、换字体、重写 Deep Chat terracotta、white-label 引擎、未走 map 扩表流程的新 `wb-theme-*`、把 megaMenu 强行 Appearance 化。

---

## 8. Commit list (`sops/main` → `HEAD`)

```
HEAD     feat(theme): D6 process chrome, cards dual-safe, D12x12
5ad7b1c1 feat(theme): D6 input focus, D8 roles, D5/D11 polish
90914af1 feat(theme): land nav ownership and D6/D12 batch
f7268f93 feat(theme): ESLint ban setModuleColor + PromptLab CTA
5b6684f9 feat(theme): deprecate setModuleColor and PPC primary chrome
5f602882 feat(theme): workbench icon helpers and AI Analysis primary CTAs
0c3cb2be feat(theme): workbench colorSchemes helpers and scraper primary chrome
a5079e23 feat(theme): ownership map, KH primary CTAs, e2e ownership check
9c6944c2 feat(theme): buttons primary glow, radius batch 3, status board
947fa398 feat(theme): token gate in CI, more workbench radii, forms focus
f094399a feat(theme): settings form tokens, workbench radius consumers, allowlist
29714c27 feat(theme): settings primary chrome, workbench radius, e2e
d1a8c774 feat(theme): settings color mode, token audit, XO status
7e47a711 feat(theme): Phase 1 color-mode split and shell primary tokens
26623ec8 feat(theme): team playbook, UX matrix, and Phase 0 gates
```

前置（`sops/main` tip，主题审查起点）:

```
f8f925a8 docs(theme): enterprise audit and convergence roadmap
```

**HEAD 要点 (`feat(theme): D6 process chrome, cards dual-safe, D12x12`)**:
- D6 #9 KH process/filter/snapshot；App overview focus hybrid
- D11 `cards.css` ×19 tri-selector；D12 scaffold **12** shots
- D4 misuse audit clean（§5.2）；D8 unit menuConfig 一致性
- **Code Green / Visual Yellow**；**不得宣称 visual XO Pass**

**前 HEAD (`5ad7b1c1`)**: D6 #8 input · D5 focus-soft · D8 scaffold · D11 抽样。

---

## 10. D11 residual — `data-theme='dark'` inventory & cleanup plan

**Inventory (2026-07-26, code tree):**

| 类别 | 数量 | 说明 |
| --- | --- | --- |
| CSS `[data-theme='dark']` 选择器出现次数 | **217** | 15 个 CSS 文件；**全部**已与 `.dark` 并列 |
| 已含 `[data-color-mode='dark']` 的 dark 规则 | **1 块** | `variables.css` 语义 token 覆盖（三选一） |
| 仍缺 color-mode / resolved 的 component 规则 | **~216** | 仅靠 `.dark` 运行时生效（ThemeManager 会加 class） |
| 运行时 `dataset.theme = 'dark'` 生产写 | **0** | 仅测试构造 + legacy 一次性迁移 |
| Appearance 兼容双写 `data-theme`=appearance id | **保留** | `ThemeManager.applyTheme` 故意双写；**禁止**当 dark 删 |

### 10.1 仍用 `data-theme` 的角色

| 属性 / 标记 | 角色 | dark？ |
| --- | --- | --- |
| `data-appearance` | Appearance preset id（SSOT） | 否 |
| `data-theme` | **兼容**：= appearance id（非 dark） | **否**；仅 legacy `dark` 迁移前瞬时 |
| `data-color-mode` | 用户偏好 light\|dark\|system | 偏好槽 |
| `data-color-mode-resolved` | 有效 light\|dark（含 system 解析） | 有效 dark 属性路径 |
| `.dark` on `<html>` | 有效 dark class（现网主路径） | **是** |

**禁止**: 把 appearance id（`default` / `minimal` / …）当 dark 选择器；dark 不得再写入 `data-theme`（migrate 清槽后 Appearance 独占兼容写）。

### 10.2 Migration checklist（prefer）

1. **新样式 / 改样式**: 优先  
   `.dark …, [data-color-mode-resolved='dark'] …`  
   （可选保留 legacy `[data-theme='dark'] …` 一版，勿单独依赖）  
2. **Token 层**: 继续对齐 `variables.css` 形态：  
   `.dark, [data-theme='dark'], [data-color-mode='dark']` 或加 resolved  
3. **分批迁 component CSS**（高流量先）: forms → cards → code-highlight → header → interactive → 其余  
4. **勿**在未证安全前去掉 ThemeManager 的 appearance→`data-theme` 双写  
5. **勿** bulk-delete `[data-theme='dark']` 直到 e2e/XO 确认 dark×appearance 与 system mode  
6. 可选门禁: audit/lint 禁止「仅有 `[data-theme='dark']` 且无 `.dark`」的新规则  

### 10.3 本轮已做的小安全样例

将双选组扩成 dual-safe（保留 legacy，**不**把 appearance id 当 dark）:

- `src/css/components/tabs.css` — pill tabs（2 规则）  
- `src/css/components/loading.css` — `.loading-overlay`  
- `src/css/animations/keyframes.css` — reduced-motion skeleton  
- **`src/css/components/cards.css` batch done** — 暗色覆盖 **19** 规则全部扩为 tri-selector  

模式: `.dark …, [data-color-mode-resolved='dark'] …, [data-theme='dark'] …`

### 10.4 Residual risk

| 风险 | 等级 | 备注 |
| --- | --- | --- |
| Component 暗色依赖 `.dark` class；若仅有 `data-color-mode` 无 class 会漏样式 | 低 | 现网 ThemeManager 始终同步 class + resolved |
| 遗留 `[data-theme='dark']` 与 appearance 双写槽位概念混淆（文档/新人） | 中 | 选择器字面只匹配 `dark`，**不**匹配 `minimal`；文档需持续写清 |
| 全量 200+ 规则未迁 color-mode/resolved | 中 | 无功能回归只要 class 路径在；属性路径完备性未完成 |
| 过早删除 `data-theme` 兼容写 | 高 | **不做**直至读者审计 + 测试 |

---

## 9. Doc map (quick)

| 文档                                           | 用途                                            |
| ---------------------------------------------- | ----------------------------------------------- |
| 本文件                                         | **站会/排期一眼板**                             |
| `ownership-role-palette-map.md`                | Phase 4 Role → palette / `wb-theme` SSOT 草案   |
| `local-token-prefix-lifecycle.md`              | D9 局部前缀库存 + 升全局/归档规则 + PR 清单     |
| `theme-system-xo-signoff-status.md`            | Code vs Visual 签收分层 + 30 min 脚本           |
| `theme-system-team-operating-playbook.md`      | RACI / DoD / gate 命令                          |
| `theme-system-experience-acceptance-matrix.md` | 路由 × preset 验收                              |
| `token-override-inventory.md`                  | D1 数字与 allowlist                             |
| `workbench-radius-decision.md`                 | D2 SSOT 与迁移阶梯                              |
| `theme-system-enterprise-audit-and-roadmap.md` | D1–D12 + Phase 0–5 权威                         |
| `theme-visual-baseline-d12.md`                 | D12 截图矩阵 / 命名 / 首 8 张 / opt-in scaffold |

---

**维护**: 每合入主题 PR 或 XO 签收后更新 §1 灯色、§2 表、§4 指标、§8 SHA。  
**Non-goal**: 本文不替代 CHANGELOG；不自动关 RC。
