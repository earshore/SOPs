# Workbench Radius Decision (D2)

Date: 2026-07-26  
Debt: D2 — 圆角语义名与像素不一致；工作台行为写死 ≤8px  
Related: [Token Override Inventory (D1)](./2026-07-26-token-override-inventory.md)、[THEME_SYSTEM_GUIDELINES §4.1](../../THEME_SYSTEM_GUIDELINES.md)

## 问题摘要

两套「同名不同义」的 radius 尺度并存：

1. **Generated**（`design-tokens.ts` → `variables.generated.css`）：Tailwind 式 rem 尺度  
2. **Handwritten**（`variables.css`）：产品 px 尺度，**有意覆盖** generated（cascade：generated 后加载 handwritten）

工作台规范要求面板圆角默认 **8px、最大 8px**，但组件常直接写 `var(--rounded-md)` / `var(--rounded-lg)` / `var(--rounded-xl)`。在 handwritten 尺度下这些分别是 8 / 12 / 16px；若未来去掉 override 或混用 Tailwind utility，语义会漂移。

D2 的根因不是「缺 8px」，而是 **缺少工作台专用语义 SSOT**，业务与共享组件绑定了 atom 名（`rounded-md`）而不是角色名（workbench panel）。

## Generated vs Handwritten radius

| Token | Generated | Generated ≈px (16px root) | Handwritten (runtime win) | Delta |
| --- | --- | --- | --- | --- |
| `--rounded-none` | `0` | 0 | _(identical, no override)_ | — |
| `--rounded-xs` | _(none)_ | — | `2px` | handwritten-only |
| `--rounded-sm` | `0.125rem` | 2px | `4px` | +2px |
| `--rounded` | `0.25rem` | 4px | _(no handwritten override)_ | generated |
| `--rounded-md` | `0.375rem` | 6px | `8px` | +2px |
| `--rounded-lg` | `0.5rem` | 8px | `12px` | +4px |
| `--rounded-xl` | `0.75rem` | 12px | `16px` | +4px |
| `--rounded-2xl` | `1rem` | 16px | `24px` | +8px |
| `--rounded-3xl` | `1.5rem` | 24px | `32px` | +8px |
| `--rounded-full` | `9999px` | full | _(identical, no override)_ | — |
| `--rounded-card` | _(none)_ | — | `var(--rounded-md)` → **8px** | semantic |
| `--rounded-panel` | _(none)_ | — | `var(--rounded-md)` → **8px** | semantic |

**命名陷阱（核心）：**

| 意图（规范） | 人读名 | Generated 实际 | Handwritten 实际 |
| --- | --- | --- | --- |
| 工作台 8px | 「md」? 「lg」? | `--rounded-lg` = 8px | `--rounded-md` = 8px |
| 稍大 12px | 「lg」? 「xl」? | `--rounded-xl` = 12px | `--rounded-lg` = 12px |

因此 **禁止**把「工作台 8px」写死为「永远等于 `--rounded-md`」的口头约定；应用语义 token。

## 决策

### 引入工作台语义 SSOT

```css
--workbench-radius: 8px;       /* 工作台面板 / 表单区 / 数据工作区默认圆角 */
--workbench-radius-lg: 12px;   /* 工作台内次级控件上限；非 entry 营销圆角 */
```

原则：

1. **Workbench panels / tool surfaces** → `var(--workbench-radius)`（或已指向它的 `--panel-radius` / `--card-radius` / `--rounded-panel` / `--rounded-card`）。
2. **不得**在新工作台代码里用 `12px` / `16px` / `--rounded-xl` 做主面板圆角（违反 §4.1 上限 8px）。
3. **保留** handwritten 对 `--rounded-sm…3xl` 的 px override 现状；本决策 **不** 一次性对齐 generated rem 尺度，也 **不** 批量改 `rounded-md/lg` 全库引用。
4. 既有别名链收敛到 SSOT：

```text
--rounded-card  → --workbench-radius
--rounded-panel → --workbench-radius
--card-radius   → --rounded-card   (已有)
--panel-radius  → --rounded-panel  (已有)
```

### 为何不直接改 generated / design-tokens.ts

- generated 仍服务 Tailwind 兼容与通用 scale；工作台 8px 是 **产品角色约束**，不是 atom 重命名。
- 改 `BORDER_RADIUS.md = 8px` 会牵动命名陷阱与全库 utility，属于 rebrand 级，超出 D2 首刀。
- 语义 token 可在不触碰 20 个 atomic radius conflict 的情况下稳定 M2。

## 映射建议：谁用 workbench-radius vs entry radius

| 表面类型 | 场景 | 推荐 token | 像素 |
| --- | --- | --- | --- |
| Workbench panel | 表单、表格壳、分析结果、配置区、数据工作区 | `--workbench-radius` / `--panel-radius` / `--rounded-panel` | **8px** |
| Workbench card | 工具页内卡片、filter bar、data toolbar | `--workbench-radius` / `--card-radius` / `--rounded-card` | **8px** |
| Workbench control (次级) | 输入框、小 chip 容器、工具条按钮（非 CTA 造型） | `--workbench-radius` 或 `--workbench-radius-lg` | 8–12px |
| Entry card | 模块总览入口、overview accent card | `--rounded-xl`（16px handwritten）或本地 `--overview-card-radius` | 8–16px |
| Marketing / story | 案例、hero 叙事 | 模块前缀 token；可 >16px | 按模块 |
| Badge / pill | 状态标签 | `--rounded-full` | full |
| Icon well | `card-icon` 等 | 可继续 atom scale（md/lg/xl） | 按组件 |

### 当前共享消费者（已间接 8px）

以下已走 `--rounded-card` / `--rounded-panel`，在别名改挂 SSOT 后 **无需改选择器** 即可吃到 `--workbench-radius`：

- `src/css/components/cards.css` — `.card`, `.sop-card`, keyword-hunter cards, `.content-callout`
- `src/css/components/buttons.css` — `.category-filter-btn`
- `src/css/components/data-scan.css` — toolbar / table wrap / list item
- `src/modules/amz_hub/**` — filter panel、overview 局部

### 明确应迁到 workbench-radius 的偏差（后续 Shell UI，非本 PR 全改）

| 位置 | 现状 | 风险 | 建议 |
| --- | --- | --- | --- |
| `.analysis-widget-card` | **已迁** `var(--workbench-radius…)` | — | R2 done |
| `.progress-card` | **已迁** `var(--workbench-radius…)` | — | long-tail #2 |
| `.sops-overview-collapsible` | **已迁** `var(--workbench-radius…)` | — | 对齐 app-center collapsible |
| `.amz_card-hover` | **已迁** `var(--workbench-radius…)` | — | long-tail #3 |
| `.zn-notice-card` | **已迁** `var(--workbench-radius…)` | — | long-tail #3 |
| `.route-loading-skeleton__card` | **已迁** `var(--workbench-radius…)` | — | long-tail #3 |
| `.app-center-card` | **已迁** `var(--workbench-radius…)` | — | long-tail #4（legacy → card 映射） |
| Settings `--settings-radius-card` / `.settings-card` | **已迁** `var(--workbench-radius…)` | — | long-tail #4 |
| Settings section/LLM/collapsible/nav shells | **已迁** `var(--settings-radius-card…)` | — | long-tail #5 |
| Shared `.insight-card` / `.stat-card` | **已迁** `var(--workbench-radius…)` | — | long-tail #5 |
| Skills/Prompts catalog tool cards + search field | **已迁** `var(--workbench-radius…)` | — | long-tail #5 |
| `.app-overview-card` | `--rounded-xl` | **允许**（entry） | 保持 entry 映射 |
| 各模块 scraper / PPC / keyword hunter 内联 panel | 混用 lg/xl / hardcode（部分已覆盖） | M2 审计热点 | 按 `workbench-ui:audit` 逐模块 |

**Long-tail 记（2026-07-26）:** 高流量 CSS 主面板以 `--workbench-radius` / panel|card 别名为主；**#3** 再收 `.amz_card-hover` / `.zn-notice-card` / route loading shell；**#4** shared `.app-center-card` + Settings card radius token/shell；**#5** Settings 段壳 / insight·stat / forms bulk / PPC radius-lg 别名 / Skills·Prompts catalog 工具面；剩余偏差多为 Tailwind utility 类名、按钮/icon well、entry/overview、modal chrome、Settings 控件级 radius、Deep Chat brand——**不**在同一 PR 批量压到 8px。

## 迁移顺序（低风险优先）

| 阶段 | 动作 | 验证 | 风险 |
| --- | --- | --- | --- |
| **R0**（本决策） | 文档 + 增加 `--workbench-radius` / `--workbench-radius-lg`；`--rounded-card/panel` 改挂 SSOT | 视觉应无变化（仍为 8px） | 极低 |
| **R1** | 新代码 / 新 PR 强制用 workbench 语义；lint 或 code review 拒工作台 `rounded-xl` 主面板 | review checklist | 低 |
| **R2** | Shell 共享层：确认 `cards.css` 工作台变体无 entry 泄漏；修正 1–2 个明确超标共享类（如 analysis-widget） | 截图 diff 工具页 | 低–中 |
| **R3** | 按 M2 模块：Scraper → AI Analysis → PromptLab → Keyword Hunter → PPC | `workbench-ui:audit` + 视觉抽检 | 中 |
| **R4** | 清点直接 `var(--rounded-md)` 意图为「工作台 8px」的引用，改为语义 token（**不**批量改 atom 值） | grep + 分 PR | 中 |
| **R5**（可选，远期） | 评估是否停止 override generated radius，或把 product scale 写回 `design-tokens.ts` | token audit + 全站回归 | 高 — 非本决策范围 |

## 非目标（Explicit non-goals）

- **不做**全站视觉 rebrand 或统一「全部圆角变小/变大」。
- **不**在本轮把 generated rem 尺度改成 handwritten px 尺度（或反过来）。
- **不**一次性修复所有 `rounded-md` / `rounded-lg` / `rounded-xl` 误用。
- **不**改 shadow / z-index 债务（D1 库存中的其它 atomic conflicts）。
- **不**要求 entry / marketing 卡片压到 8px。
- **不**引入第三套完整 `rounded-*` 阶梯；仅 **+2 语义 token**。

## 实现落点（本轮允许）

| 文件 | 变更 |
| --- | --- |
| `src/css/foundation/variables.css` | 增加 `--workbench-radius`、`--workbench-radius-lg`；`--rounded-card/panel` → workbench |
| `docs/THEME_SYSTEM_GUIDELINES.md` | §4.1 短注 SSOT 链接 |
| 本文件 | 决策与迁移顺序 |

**不**改 `design-tokens.ts` / `variables.generated.css`（避免 generate 回流覆盖语义）。

## 给 Shell UI agent 的下一任务

1. R2：审计 `cards.css` 中非 entry 却 `>8px` 的类（优先 `.analysis-widget-card`），改为 `var(--workbench-radius)` 或 `var(--card-radius)`。
2. R3：按 M2 列表跑 `workbench-ui:audit`，模块 CSS 主面板 `border-radius` 收敛到 `var(--panel-radius)` / `var(--workbench-radius)`。
3. 新增组件模板：工作台默认 `border-radius: var(--workbench-radius)`，禁止 hardcode `8px` 以外的魔法数（可用 token 表达时）。
4. 勿在同一 PR 中改 atom `--rounded-md` 数值或删除 handwritten radius override。

## 验收（R0）

- [ ] `--workbench-radius` 在 `variables.css` 语义区可查，值为 `8px`
- [ ] `--rounded-card` / `--rounded-panel` 最终解析为 `8px`（与改前一致）
- [ ] 无全库 `rounded-md` 批量替换
- [ ] 本决策文档与 guidelines 交叉引用存在
