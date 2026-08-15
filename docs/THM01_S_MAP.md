# TD-THM-01 S 档迁移契约（rc.5 S 批）

> 生成日期：2026-08-15（rc.5 B 批完成后）· 数据口径：`audit-token-overrides.ts` @ main `addbc453`
> B 批结果：76 处零消费 only-handwritten 已归档，遗留池 240 → 164（`THM01_LEGACY_POOL_LEDGER.md` 已销账 `addbc453`）
>
> **进度（rc.5-S1，完成）**：本批已消化 13 处映射（text 六族 + focus-ring + spacing 六族），全库 2,434 处消费点迁移至 generated 对等物；variables.css 声明行加 [S1-THM01] 契约注释，值不变、零新增键（settings-scale 1199/1200 未触发）；content-surface 表面基线 -1,318（只降不升）；验收 ci:quality 20/20 · build · smoke 93/93。13 处声明消费清零后将随下次 B 批归档离开 only-handwritten 池（届时 164 → 151）。

## 1. S 档口径（脚本实测）

对 164 处剩余 only-handwritten 逐条全库引用扫描后分档：有消费的 147 个中，与 generated 有清晰对等物的归 S 档（**51 个，总消费 3,108 次**），其余 96 个归 A 档台账（`THM01_LEGACY_POOL_LEDGER.md` A 档清单补充）。S 档内按迁移可行性再分三级：

| 分级 | 数量 | 定义 | 迁移方式 |
| --- | --- | --- | --- |
| S1（name-map） | 28 | 命名可直接映射到 generated 键 | 批量替换 + 别名过渡 |
| S2（value-match） | 2 | 值与 generated 键完全一致（`--spacing-2xs` / `--spacing-0.5` → `--spacing-1-5` / `--spacing-0-5`） | 同上 |
| S3（alias/bridge） | 21 | 无 generated 对等物（white/black alpha 族、rgba border、shadow-card 系），其中 `--surface-card` 消费 719 次为全库最高频 | **不入本批**，回流水台登记，随 workbench migration 或 surface 契约专项处理 |

S3 21 处高频 bridge（surface-card 719 / panel 263 / border-subtle 152 等）回流水台后，S 档本批实际消化 **30 处**（S1+S2），与 RC5 计划「S 批 1 约 15 + S 批 2 约 15」吻合。

## 2. S1 映射表（name-map，28 处）

| 族 | handwritten | 消费 | → generated 对等物 |
| --- | --- | --- | --- |
| text | --color-text-secondary | 357 | --color-slate-500 |
| text | --color-text-primary | 355 | --color-slate-900 |
| text | --color-text-tertiary | 149 | --color-slate-400 |
| text | --color-text-placeholder | 13 | --color-slate-400 |
| text | --color-text-disabled | 12 | --color-slate-300 |
| text | --color-text-link | — | --color-primary |
| bg | --color-bg-secondary | 107 | --color-slate-50 |
| bg | --color-bg-tertiary | 46 | --color-slate-100 |
| bg | --color-bg-disabled | — | --color-slate-100 |
| surface | --surface-card-hover | 52 | --color-slate-50 |
| surface | --surface-workbench | 20 | --color-slate-50 |
| focus | --color-focus-ring | 121 | --color-primary |
| status | --color-warning-dark | 10 | --color-amber-600 |
| status | --color-warning-contrast | — | 待 waterline（white 非 generated） |
| status | --color-success-dark | 4 | --color-green-600 |
| status | --color-error-dark | 16 | --color-red-600 |
| status | --color-error-contrast | — | 待 waterline |
| spacing | --spacing-xs | 41 | --spacing-2 |
| spacing | --spacing-sm | 41 | --spacing-3 |
| spacing | --spacing-md | 42 | --spacing-4 |
| spacing | --spacing-lg | 38 | --spacing-6 |
| spacing | --spacing-xl | 18 | --spacing-8 |
| spacing | --spacing-2xl | — | --spacing-12 |
| spacing | --spacing-3xl | — | --spacing-16 |
| spacing | --spacing-2xs | 18 | --spacing-1-5（value-match） |
| spacing | --spacing-0.5 | 1 | --spacing-0-5（value-match） |
| status | --color-info-dark | — | --color-blue-600 |
| focus | --focus-ring-width / --focus-ring-offset | 1+1 | 保留 bridge（generated 无 focus-ring 族） |

映射核验方式：`THM01_S_MAP.md` 附脚本 `scripts/quality/audit-token-overrides.ts --json` 消费计数 + generated 键存在性双重断言；每批替换后跑 `audit-token-overrides` 确认 S1 目标键在 generated 中存在且 only-handwritten 数只降不升。

## 3. S3 水台登记（21 处 alias/bridge，高频）

| token | 消费 | 水台理由 |
| --- | --- | --- |
| --surface-card | 719 | 全库最高频；generated 无 --color-white（alpha 族保留在 handwritten），需 surface 契约专项 |
| --surface-panel | 263 | 同上 |
| --border-subtle | 152 | rgba 无对等 |
| --color-border-default | 151 | 同上 |
| --color-border-light | 68 | 同上 |
| --color-bg-hover | 53 | rgba |
| --color-bg-primary | 36 | white 非 generated |
| --color-bg-selected | 34 | color-mix 派生 |
| --border-muted | 31 | rgba |
| --color-white / --color-black | 23/11 | alpha 族保留位置 |
| --color-border-strong | 21 | rgba |
| --color-bg-elevated | 16 | white 非 generated |
| --shadow-xs / -sm / -md / -card(73) / -card-hover(23) / -panel | 37 | shadow 契约未定 |
| --section-gap 系 / --color-success-light / --color-info-light / --border-strong | — | rgba/派生 |

## 4. 批次执行计划

| 批次 | 内容 | 验收 |
| --- | --- | --- |
| S 批 1 | text 族（6 处）+ focus（1 处）+ 高频 spacing（6 处），共 13 处 | **已完成** rc.5-S1：2,434 处消费点迁移，91 文件；ci:quality 20/20 · build · smoke 93/93 ✓ |
| S 批 2 | bg 族（3 处）+ surface（2 处）+ status（3 处）+ 剩余 spacing（5 处），约 13 处 | 待执行：ci:quality 20/20 · build · smoke 93/93 · only-handwritten 只降不升 |

物理约束：settings-scale 限额 1200（当前 1199/1200），别名过渡期若触及限额需同步注释合并守限额；semantic baseline 2128 只降不升；`token:override-audit:gate` 全程在线。每批沿用「批次独立验证提交」纪律，凭证提交号见 LEDGER。

## 5. 与 B 批、A 档的关系

B 批（`addbc453`）完成零消费 76 处归档后遗留池 164；本契约 S1/S2 30 处消化后预计降至 134（其中 S3 21 处高频 bridge 回流水台后，真正「遗留」为 A 档台账约 113 处，随 workbench migration 决策）。
