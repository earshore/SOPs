# TD-THM-01 S 档迁移契约（rc.5 S 批）

> 生成日期：2026-08-15（rc.5 B 批完成后）· 数据口径：`audit-token-overrides.ts` @ main `addbc453`
> B 批结果：76 处零消费 only-handwritten 已归档，遗留池 240 → 164（`THM01_LEGACY_POOL_LEDGER.md` 已销账 `addbc453`）
>
> **进度（rc.5-S1，完成）**：本批已消化 13 处映射（text 六族 + focus-ring + spacing 六族），全库 2,434 处消费点迁移至 generated 对等物；variables.css 声明行加 [S1-THM01] 契约注释，值不变、零新增键（settings-scale 1199/1200 未触发）；content-surface 表面基线 -1,318（只降不升）；验收 ci:quality 20/20 · build · smoke 93/93。
>
> **进度（rc.5-S3 / B 批 2，完成）**：S1/S2 零消费空壳归档（25 行）+ focus-ring 衍生链清理 + module-accent-focus 降级（[B2-THM01]），遗留池 164 → 141；bg-secondary/bg-tertiary/surface-card-hover/surface-workbench/success-dark/error-dark/spacing-2xl/spacing-3xl 因 Tailwind arbitrary 消费残留留待下批。DARKFIX：S1 后 dark block 未重定义 slate-* 原子键导致深色模式文字不可见，已新增 4 行反色翻转（slate-900→slate-50、slate-500→slate-400、slate-400→slate-500、slate-300→slate-600），恢复 S1 前等价表现；NPI dark 基线（S1 re-seed 时被 light 截图覆盖）以正确 dark 渲染重 seed 三引擎 6 基线；验收 ci:quality 20/20 · build ✓ · smoke 无新增失败。rc.5-B4（`b1949f2f`）：bg-secondary 归档——151 处消费点迁移至手写键 --bg-secondary（light slate-50 / dark slate-800，dark 翻转与 bg-slate-50 bridge 契约一致），26 处 Tailwind 类错误映射桥接修正，design-tokens.ts 剔除 bg.secondary 键；验收 ci:quality 20/20 · build ✓ · smoke 93/93。

## 1. S 档口径（脚本实测）

对 164 处剩余 only-handwritten 逐条全库引用扫描后分档：有消费的 147 个中，与 generated 有清晰对等物的归 S 档（**51 个，总消费 3,108 次**），其余 96 个归 A 档台账（`THM01_LEGACY_POOL_LEDGER.md` A 档清单补充）。S 档内按迁移可行性再分三级：

| 分级               | 数量 | 定义                                                                                                                    | 迁移方式                                                                   |
| ------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| S1（name-map）     | 28   | 命名可直接映射到 generated 键                                                                                           | 批量替换 + 别名过渡                                                        |
| S2（value-match）  | 2    | 值与 generated 键完全一致（`--spacing-2xs` / `--spacing-0.5` → `--spacing-1-5` / `--spacing-0-5`）                      | 同上                                                                       |
| S3（alias/bridge） | 21   | 无 generated 对等物（white/black alpha 族、rgba border、shadow-card 系），其中 `--surface-card` 消费 719 次为全库最高频 | **不入本批**，回流水台登记，随 workbench migration 或 surface 契约专项处理 |

S3 21 处高频 bridge（surface-card 719 / panel 263 / border-subtle 152 等）回流水台后，S 档本批实际消化 **30 处**（S1+S2），与 RC5 计划「S 批 1 约 15 + S 批 2 约 15」吻合。

## 2. S1 映射表（name-map，28 处）

| 族      | handwritten                              | 消费 | → generated 对等物                                                                        |
| ------- | ---------------------------------------- | ---- | ----------------------------------------------------------------------------------------- |
| text    | --color-text-secondary                   | 357  | --color-slate-500                                                                         |
| text    | --color-text-primary                     | 355  | --color-slate-900                                                                         |
| text    | --color-text-tertiary                    | 149  | --color-slate-400                                                                         |
| text    | --color-text-placeholder                 | 13   | --color-slate-400                                                                         |
| text    | --color-text-disabled                    | 12   | --color-slate-300                                                                         |
| text    | --color-text-link                        | —    | --color-primary                                                                           |
| bg      | --color-bg-secondary                     | 107  | --color-slate-50（**已归档 rc.5-B4**：迁移至手写 --bg-secondary，design-tokens 键已剔除） |
| bg      | --color-bg-tertiary                      | 46   | --color-slate-100                                                                         |
| bg      | --color-bg-disabled                      | —    | --color-slate-100                                                                         |
| surface | --surface-card-hover                     | 52   | --color-slate-50                                                                          |
| surface | --surface-workbench                      | 20   | --color-slate-50                                                                          |
| focus   | --color-focus-ring                       | 121  | --color-primary                                                                           |
| status  | --color-warning-dark                     | 10   | --color-amber-600                                                                         |
| status  | --color-warning-contrast                 | —    | 待 waterline（white 非 generated）                                                        |
| status  | --color-success-dark                     | 4    | --color-green-600                                                                         |
| status  | --color-error-dark                       | 16   | --color-red-600                                                                           |
| status  | --color-error-contrast                   | —    | 待 waterline                                                                              |
| spacing | --spacing-xs                             | 41   | --spacing-2                                                                               |
| spacing | --spacing-sm                             | 41   | --spacing-3                                                                               |
| spacing | --spacing-md                             | 42   | --spacing-4                                                                               |
| spacing | --spacing-lg                             | 38   | --spacing-6                                                                               |
| spacing | --spacing-xl                             | 18   | --spacing-8                                                                               |
| spacing | --spacing-2xl                            | —    | --spacing-12                                                                              |
| spacing | --spacing-3xl                            | —    | --spacing-16                                                                              |
| spacing | --spacing-2xs                            | 18   | --spacing-1-5（value-match）                                                              |
| spacing | --spacing-0.5                            | 1    | --spacing-0-5（value-match）                                                              |
| status  | --color-info-dark                        | —    | --color-blue-600                                                                          |
| focus   | --focus-ring-width / --focus-ring-offset | 1+1  | 保留 bridge（generated 无 focus-ring 族）                                                 |

映射核验方式：`THM01_S_MAP.md` 附脚本 `scripts/quality/audit-token-overrides.ts --json` 消费计数 + generated 键存在性双重断言；每批替换后跑 `audit-token-overrides` 确认 S1 目标键在 generated 中存在且 only-handwritten 数只降不升。

## 3. S3 水台（21 处 alias/bridge，高频）— **已销账（rc.5，2026-08-16）**

逐键评审结论：**0 处可安全消化，全部转入 A 档正式留档**（销账时机：workbench migration / surface-shadow 契约 / dark 翻转契约专项重审）。评审依据与逐键理由见 `THM01_LEGACY_POOL_LEDGER.md`「S3 高频 bridge 水台销账」节。原登记表面理由保留如下（消费量以最新审计为准：surface-card 723 / surface-panel 267 / border-subtle 156 / color-border-default 153）：

| token                                                  | 水台理由（原登记）                     | 评审结论（rc.5）                                                                        |
| ------------------------------------------------------ | -------------------------------------- | --------------------------------------------------------------------------------------- |
| --surface-card / --surface-panel                       | 全库最高频；generated 无 --color-white | 表面 SSOT，dark 翻转依赖反色链/直写 raw，[DARKFIX-CHAIN] 维持；workbench migration 重审 |
| --border-subtle / -default / -light / -strong / -muted | rgba 无对等                            | dark 翻转专门调低 alpha，任何 atomic 映射都会深色回退；dark 翻转契约专项重审            |
| --color-bg-hover / --color-bg-selected                 | rgba / color-mix 派生                  | alpha 族保留位置；selected 的 dark mix 比例与 light 不同，非 atomic                     |
| --color-bg-primary                                     | white 非 generated                     | **已排除迁移至 --bg-primary**（dark 无覆盖，解析为 white = B5 变白回退同类风险）        |
| --color-white / --color-black / --color-bg-elevated    | alpha 族保留位置                       | generated 无 --color-white 声明，alpha 族保留                                           |
| --shadow-xs/-sm/-md/-card/-card-hover/-panel           | shadow 契约未定                        | 产品阴影尺度有意轻于 generated（D2 口径）；shadow 契约专项重审                          |
| --section-gap 系等                                     | rgba/派生                              | 随各自契约专项                                                                          |

## 4. 批次执行计划

| 批次                 | 内容                                                                                                                                                                                                                                                                       | 验收                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S 批 1               | text 族（6 处）+ focus（1 处）+ 高频 spacing（6 处），共 13 处                                                                                                                                                                                                             | **已完成** rc.5-S1：2,434 处消费点迁移，91 文件；ci:quality 20/20 · build · smoke 93/93 ✓                                                                                                                                                                                                                                                          |
| S 批 2               | bg 族（3 处）+ surface（2 处）+ status（3 处）+ 剩余 spacing（5 处），约 13 处                                                                                                                                                                                             | **已完成（方案 A，契约登记口径）** rc.5-S2：13 处映射在 variables.css 全部 21 个声明行（light+dark 块）加 [S2-THM01] 契约注释；消费点不替换（bg/surface/status-dark 族 dark 翻转值 ≠ 目标 atomic 值，避免深色回退）；dry-run 统计 563 处/64 文件留作下批参考；门禁 ci:quality 20/20 · build ✓ · only-handwritten 164 不变（池消化随下次 B 批归档） |
| S 批后续（消债方案） | 批 1 ✅ ci:ui-audit 暗色断言扩面 · 批 2 ✅ D14 badge 收敛（-500/18% 规范配方）· 批 3 dark 翻转契约决策点 pending（推荐方案 B 手写登记）· 批 4 shadow 契约有条件执行 ⚠️ · 批 5 动效契约可执行（66→~51）；执行计划与收口判据见 `docs/DARK_MODE_DEBT_CLOSURE_SPEC.md`（SSOT） | 消债方案 `867ac6e7` / 批 4-5 评估 `1adb4e21`                                                                                                                                                                                                                                                                                                       |

物理约束：settings-scale 限额 1200（当前 1199/1200），别名过渡期若触及限额需同步注释合并守限额；semantic baseline 2128 只降不升；`token:override-audit:gate` 全程在线。每批沿用「批次独立验证提交」纪律，凭证提交号见 LEDGER。

## 5. 与 B 批、A 档的关系

B 批（`addbc453`）完成零消费 76 处归档后遗留池 164；rc.5-S3（B 批 2，`e44e4b94`）再归档 25 行空壳后遗留池 141；rc.5-B3（`31d7f354`）归档 4 token（success-dark / error-dark / spacing-2xl / spacing-3xl，声明移除 8 行）后遗留池 137；rc.5-B4（`b1949f2f`）bg-secondary 归档（原 --color-bg-secondary 消费全量迁移至手写 --bg-secondary，design-tokens 键剔除）。rc.5-S3 专项（2026-08-16）完成 S3 水台销账：21 处高频 bridge 逐键评审，0 处可安全消化，全部转入 A 档留档（理由：generated 无 dark 块、rgba/shadow/alpha 无 atomic 对等、dark 翻转值 ≠ atomic）；遗留池 66 键全数 A 档登记，销账触发条件为对应契约专项立项（workbench migration / shadow 契约 / dark 翻转契约 / 动效专项）。
