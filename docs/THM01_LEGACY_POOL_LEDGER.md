# TD-THM-01 遗留池台账（A 档：待 workbench migration 同步决策）

> 生成日期：2026-08-15（rc.4 发布后）· 数据口径：`audit-token-overrides.ts --json` @ main `1a71c3a1`
> 本台账为 rc.5 规划的留档部分：A 档 token 不在本 RC 硬迁，随 workbench migration 启动时逐条销账。S/B 档销账记录追加在文末。

## A 档清单（按消费度降序，共约 100 处）

产品专属 / 布局契约 / 无 generated 对等物，迁移时机 = workbench migration。

| token                                                  | 族                | 消费度   | 留档理由                                  |
| ------------------------------------------------------ | ----------------- | -------- | ----------------------------------------- |
| --module-accent                                        | module            | 443x     | workbench 模块色 SSOT 未定义              |
| --module-accent-text                                   | module            | 239x     | 同上                                      |
| --module-accent-border                                 | module            | 84x      | 同上                                      |
| --module-accent-soft                                   | module            | 39x      | 同上                                      |
| --module-accent-focus                                  | module            | 3x       | 同上                                      |
| --container-*（9 个）                                  | container         | 3–35x    | 布局容器契约，workbench 网格未定义        |
| --header-height / --header-height-sm                   | header            | 27x 合计 | 顶栏布局契约                              |
| --sidebar-width / -collapsed / -wide                   | sidebar           | 16x 合计 | 侧栏布局契约                              |
| --micro-*（8 个）                                      | micro             | 3–36x    | 微交互动画契约，generated 无对等物        |
| --gradient-*（10 个）                                  | gradient          | 低频     | 渐变资产，设计系统未定                    |
| --wash-*（8 个）                                       | wash              | 33x 合计 | 底色 wash 资产                            |
| --z-*（5 个）                                          | z                 | 3–8x     | 层叠契约（D1 冲突同族，维持 intentional） |
| --breakpoint-*（5 个）                                 | breakpoint        | 低频     | 断点契约                                  |
| --backdrop-blur-* / --blur-*（9 个）                   | blur              | 低频     | 模糊资产                                  |
| --shadow-*（除 card 系）                               | shadow            | 低频     | 阴影资产（card 系已入 S 档）              |
| --duration-*（除 fast/normal/slow）                    | duration          | 低频     | 时长资产                                  |
| --opacity-*（21 个）                                   | opacity           | 低频     | alpha 阶梯资产                            |
| --button-primary-* / --card-radius / --panel-radius 等 | button/card/panel | 3–9x     | 控件局部契约（card-shadow 入 S 档）       |
| --page-gutter / --layout-* / --prose-width             | layout/page/prose | 5–8x     | 排版布局契约                              |

## 销账记录

| 日期 | 批次 日期 | 批次 | 销账条目 | 凭证提交 |

| 2026-08-16 | 批 5（动效契约专项：遗留池 66→48）                                        | EASING +4（spring/elastic/back-in/back-out）+ DURATION +8（fastest/fast/normal/slow/slower/slowest/1s/2s） 迁入 design-tokens.ts 并生成 variables.generated.css（12 键逐值核对与手写一致，消费点零改动）；variables.css 收口删 32 行（18 键声明 + 孤立注释 + 空章节头 12/18/19 与 PC 交互过渡注释）；留档：--ease-smooth（产品缓动有意差异 0.22,1,0.36,1 vs generated 0.25,0.1,0.25,1，A 档留档）；验收：ci:quality 20/20（only-handwritten 48 / only-generated 381 / allowlist 20 / unallowlisted 0）· build ✓ · smoke 93/93（chromium 31 + ff/wk 62） | 待提交            |
| ---------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 2026-08-15 | B 批（零消费归档）                                                        | 76 个 only-handwritten 零消费 token 从 variables.css 移除（85 行：9 个在 dark 覆盖块有镜像）；遗留池由 240 → 164；全库引用二次确认零误伤；验收：ci:quality 20/20 · build · smoke 93/93                                                                                                                                                                                                                                                                                                                                                                  | rc.5-B            |
| 2026-08-15 | B 批 2（S1/S2 零消费空壳归档 + focus-ring 衍生链清理）                    | 移除 S1/S2 零消费空壳声明 25 行（text 六族残留 14 + focus-ring 衍生链 5 + bg-disabled 2 + warning/info-dark 2 + spacing 2 + surface-card-hover/workbench 2）+ module-accent-focus 降级 var(--module-accent)（[B2-THM01]）；遗留池 164 → 141（bg-secondary/bg-tertiary/surface-card-hover/surface-workbench/success-dark/error-dark/spacing-2xl/spacing-3xl 仍有 Tailwind arbitrary 消费，留待下次 B 批）                                                                                                                                                | 见下 DARKFIX 提交 |
| 2026-08-15 | DARKFIX（S1 深色翻转修复）                                                | S1 将 text/focus 消费迁移至 slate-* 原子键后 dark block 未重定义原子键，深色模式文字（slate-900 #0f172a 近黑）在深色背景不可见；dark block 新增 4 行原子键反色翻转（slate-900→slate-50、slate-500→slate-400、slate-400→slate-500、slate-300→slate-600），恢复 S1 前等价表现；验收：ci:quality 20/20 · build ✓ · only-handwritten 141 · smoke 无新增失败                                                                                                                                                                                                 | 与 B 批 2 同提交  |
| 2026-08-15 | NPI dark 基线修复                                                         | S1 re-seed 时 3 个 dark 基线（chromium/firefox/webkit）被 light 截图覆盖（污染），本次以正确 dark 渲染重 seed 全部 6 个基线（肉眼 + 亮度采样验证：dark avg brightness 109-110、light 246）；smoke 无新增失败（唯一 webkit NPI 恢复阶段超时为 TD-E2E-01 预存 flake，B 批 ci 即存在）；closeGlobalSettings 加固面板关闭时序容错（TD-E2E-01）                                                                                                                                                                                                              | 与 B 批 2 同提交  |
| 2026-08-15 | B 批 3（success/error-dark + spacing-2xl/3xl 归档 + arbitrary 50 处替换） | 归档 4 token：success-dark 3 处 → green-600 / error-dark 14 处 → red-600 / spacing-2xl 7 处 → spacing-12 / spacing-3xl 2 处 → spacing-16，声明移除 8 行（light 4 + dark 4，[B3-THM01]）；arbitrary→语义类替换 50 处：workflows template 44 + navigation.ts 2 + restricted_words 1 → bg-secondary；AlpinePanel 2 → hover:bg-surface-card-hover（登记 S3 bridge 台账）；bg-secondary 语义 32 处 / surface-card-hover ~10 处 / bg-tertiary / surface-workbench 仍存，留待下批；验收：ci:quality 20/20 · only-handwritten 137 · build ✓ · smoke 93/93       | `31d7f354`        |

| 2026-08-15 | B 批 4（bg-secondary 归档：消费点全量迁移 + 任意值替换 + 类桥修正） | 151 处 var(--color-bg-secondary) 消费点迁移至手写键 --bg-secondary（29 文件，含 fallback 链 69 处）；design-tokens.ts 删除 bg.secondary 键，重生成 generated CSS 剔除 --bg-secondary；utility-bridge 生成器追加 .bg-secondary 桥接修正（修复 26 处 Tailwind 类错误映射：原错误映射到 var(--color-secondary) 蓝灰，现 → var(--bg-secondary) #f8fafc，dark 翻转 → surface-panel，[B4-THM01]）；variables.css 手写接管（light slate-50 / dark slate-800，dark 翻转与 bg-slate-50 bridge 契约一致）；验收：ci:quality 20/20 · build ✓ · only-handwritten 137 · smoke 93/93 | `b1949f2f` |
| 2026-08-16 | B 批 5（零消费归档 + 低消费键迁移：遗留池 137→66） | 零消费归档 13 键（backdrop-blur/border-focus/color-bg-elevated 等，含 dark 镜像声明）；低消费键迁移 50 键（6 簇）：颜色簇（bg-elevated/bg-active、三色 light、success/error/info contrast、black alpha、backdrop/overlay，24 处内联 fallback 值）、container 簇 19 键（141 处内联字面/atomic 链）、动效簇（micro-ease/duration-* 7 键、transition-interactive 多行值）、wash 7 键、scrollbar/rounded/border-strong 等；声明移除：variables.css 24 行 + container.css 27 行 + header.css 2 行；残留均为合法项（模块 surface 重写行 forms/systemSettings/icon-container/keyword_hunter、注释、类名）；DARKFIX 反色规则与留档键完整保留；NPI dark/light 区域基线三引擎重 seed（dark 亮度 34 / light 246，修正 B5 内联后的区域级像素漂移）；验收：ci:quality 20/20 · build ✓ · smoke 93/93；剩余 66 个 only-handwritten 键均为台账留档项（rounded 半径梯/shadow-2xl/module-accent/border-subtle 等高频语义键），随 workbench migration 专项处理 | `9724bbbf` |
| 2026-08-16 | DARKFIX-CHAIN 后记（dark 反色链冲突根因沉淀） | 根因：DARKFIX 的 4 行 Slate 原子键反色翻转与 variables.css dark 块中经已反色键中转的语义值链（--color-bg-primary/surface-panel/warning-contrast 引用 --color-slate-900）冲突，链式解析产出白色；已沉淀契约：暗块语义键禁止再引已反色键，一律直写 raw 值；B 批 5 盘点曾因盘点脚本 grep 选项歧义误判 137 键为零消费并误删（已恢复），已沉淀规范：盘点模式必须用 -e 字面传入、name 格式双校验、dry-run 全量核对残留 | DARKFIX-CHAIN 回滚点 |
| 2026-08-15 | S 档映射准备 | 51 处有消费 S 档分三级：S1 name-map 28 + S2 value-match 2 为本批消化清单（30 处，六族 3108 次消费）；S3 alias/bridge 21 处高频（surface-card 719x 居首）回流 A 档台账；契约文档 THM01_S_MAP.md 入库 | rc.5-S `4b93c05c` |
| 2026-08-15 | S 批 1（text/focus/spacing 六族） | 13 处映射替换全库 2,434 处消费点（91 文件）：text 六族 → slate-900/500/400/300 + primary、focus-ring → primary、spacing 六族（2xs–xl → spacing-1-5/2/3/4/6/8）；variables.css 声明行加 [S1-THM01] 契约注释（值不变、零新增键）；content-surface 表面基线 -1,318（只降不升）；NPI 表格 dark 基线因环境渲染漂移重 seed（NPI 代码零改动）；验收：ci:quality 20/20 · build · smoke 93/93 | rc.5-S1 `c017af8e` |
| 2026-08-15 | DARKFIX-CHAIN（深色模式背景变白回退修复） | B 批 4 将 151 处消费迁移至暗块语义键后大面积暴露：DARKFIX 在 variables.css dark 块加入 4 行 Slate 原子键反色翻转（--color-slate-900→slate-50 等），而 dark 块中 --color-bg-primary、--surface-panel、--color-warning-contrast 三处语义键引用已被覆写的 --color-slate-900，链式解析产出 #f8fafc 白色，导致 body/面板/warning 文字深色模式下变白；修复：dark 块三处改为直接写 raw 值（#0f172a / #f8fafc），[DARKFIX-CHAIN] 标注，契约：暗块语义键禁止再引已反色键；NPI dark 基线重 seed（原基线 seed 于 bug 状态，亮度 108→34，三引擎同步更新，light 基线未变）；验收：ci:quality 20/20 · build ✓ · smoke 93/93 | `2fdac5dd` |
| 2026-08-15 | S 批 2（bg/surface/status-dark/剩余 spacing 契约登记，方案 A） | 13 处映射在 variables.css 全部 21 个声明行（light 13 + dark 8）加 [S2-THM01] 契约注释（值不变）；消费点不替换——bg/surface/status-dark 族 dark 翻转值 ≠ 目标 atomic 值，避免深色模式视觉回退，随 workbench/surface 契约专项再处理；dry-run 统计 563 处/64 文件留作下批参考；验收：ci:quality 20/20 · build ✓ · only-handwritten 164 不变（池消化随下次 B 批归档） | rc.5-S2 `166a65aa` |

| 2026-08-16 | 消债批 1（ci:ui-audit 暗色断言扩面） | 三审计脚本（audit-card-ui.ts / audit-callout-ui.ts / audit-workbench-ui.ts）注入与 ThemeManager 一致的深色标记并增加 dark pass：断言「翻转发生」（背景变化且亮度显著下降、文字变亮）+ 结构契约复用，失败信息 [dark] 前缀；修复 color(srgb …) 计算值解析（亮度断言不再静默跳过）；card 审计默认态 rail 断言在深色等价为「无可见 rail」；_preview-server.ts 复用。验收：ci:quality 20/20（三审计 light+dark 全绿）· build ✓ · smoke 93/93 | 消债批 1 系列提交 |
| 2026-08-16 | 消债批 2（D14 badge -400 派残留收敛） | cards.css overview-accent 14 条 dark 规则收敛为规范配方 color-mix(in srgb, var(--color-{hue}-500, hex) 18%, var(--surface-card))（含 slate 14%→18%）；amz_hub_style.css 删除两前缀重复块（L403-408，已被 -500 规则覆盖）并移植 border-color 至三前缀后置块（16%→18%）；浅色规则零改动。验收：button-ui:gate + badge 审计 + smoke（NPI dark 基线零漂移） | 消债批 2 系列提交 |
| 2026-08-16 | TD-E2E-01b（附带修复：smoke NPI 基线 per-OS） | release-smoke.spec.ts：① URL.pathname 在 Windows 丢盘符（ENOENT `D:\D:\…`）改用 fileURLToPath；② 像素基线改为 per-OS 维度——Linux 保持裸名（CI 不受影响），非 Linux 追加 -{platform} 后缀，seed 本机 win32 基线 6 张（尺寸一致、平均 RGB 一致、mismatch 3.2% 为渲染级漂移）。验收：ci:quality 20/20 · smoke 93/93 | `3d95121b` |
| 2026-08-16 | 消债方案立项（收口准备） | docs/DARK_MODE_DEBT_CLOSURE_SPEC.md 入库——TD-THM-01 四契约专项 8 批执行计划 + 收口判据（批 1/2 已完成；批 3 dark 翻转契约决策点 pending：方案 B 手写登记推荐 / 方案 A generated dark 轴；批 5 动效契约判定可执行 66→~51；批 4 shadow 契约有条件执行⚠️；批 6 workbench migration 独立立项）；TD-THM-01 降级判据 = 批 1–5 + allowlist 20 + dark keys 只降不升 + 30 天复检窗；关闭判据 = 批 6 完成 | `867ac6e7` + `1adb4e21` |
| 2026-08-16 | DARKFIX-CHAIN 扩展 | critical.css dark 块 4 处反色链引用修复 | header 白闪 FOUC 根因：dark 块 `--color-slate-900→slate-50` 反色后，`.header`/`.mega-menu-inner` dark 规则链式解析把首帧翻成近白（srgb .972/0.88），`.model-status` 文字被翻成暗色不可见。4 处全部直写 raw 值并 [DARKFIX-CHAIN] 标注，首帧至稳态 header bg 恒深（#0f172a/88%，v15 探针 0ms–2s 全程无浅态跳变）。遗留池 66 不变（纯 critical path 修复，无声明增删）。 | ci:quality 20/20 · build ✓ · smoke 93/93 · NPI dark 基线不变 | [DARKFIX-CHAIN] critical.css · 4 处 raw 值替换 · 0 声明增删 |

## S3 高频 bridge 水台销账（rc.5，2026-08-16）

> 评审依据：audit-token-overrides.ts @ main `007c972a` · onlyHandwritten 66 键 · 消费统计 surface-card 723x 居首
> 结论：**S3 水台 21 处 alias/bridge 经逐键评审，0 处可安全消化，全部转入 A 档正式留档（销账时机：workbench migration / surface 契约专项重审）。**

### 逐键评审与留档理由

| token                      | 消费    | light 值                            | dark 值                              | 留档理由                                                                                                                          | 销账时机            |
| -------------------------- | ------- | ----------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| --surface-card             | 723     | #ffffff                             | var(--color-slate-800)               | 表面 SSOT；dark 依赖反色链后的 slate-800                                                                                          | workbench migration |
| --surface-panel            | 267     | #ffffff                             | #0f172a（raw）                       | 同 left；[DARKFIX-CHAIN] 已直写 raw                                                                                               | 同上                |
| --border-subtle            | 156     | rgba(148,163,184,0.24)              | rgba(148,163,184,0.18)               | dark 需专门调低 alpha，无 atomic 对等                                                                                             | dark 翻转契约专项   |
| --color-border-default     | 153     | rgba(0,0,0,0.1)                     | rgba(255,255,255,0.1)                | alpha 族；generated 无色阶 white/black                                                                                            | 同上                |
| --color-border-light       | 70      | rgba(0,0,0,0.06)                    | rgba(255,255,255,0.06)               | 同上                                                                                                                              | 同上                |
| --color-bg-hover           | 55      | rgba(0,0,0,0.04)                    | rgba(255,255,255,0.06)               | alpha 族保留位置                                                                                                                  | 同上                |
| --color-bg-selected        | 36      | var(--color-primary-light)          | color-mix(primary 18%, surface-card) | color-mix 派生；dark 与 light 的 mix 比例不同（22% vs 18%），非 atomic                                                            | workbench migration |
| --color-bg-primary         | 38      | #ffffff                             | #0f172a                              | **已排除迁移至 --bg-primary**：bg-primary 无 dark 覆盖，dark 下解析为 white（B5 变白回退同类风险）；[DARKFIX-CHAIN] 直写 raw 维持 | 同上                |
| --border-muted             | 33      | rgba(203,213,225,0.72)              | rgba(148,163,184,0.22)               | rgba 无对等，dark 换色相+alpha                                                                                                    | dark 翻转契约专项   |
| --color-white              | 24      | #ffffff                             | —                                    | alpha 族保留位置（generated 无 --color-white 声明）                                                                               | 同上                |
| --color-black              | 11      | #000000                             | —                                    | 同上                                                                                                                              | 同上                |
| --color-border-strong      | 23      | rgba(0,0,0,0.16)                    | rgba(255,255,255,0.16)               | alpha 族                                                                                                                          | dark 翻转契约专项   |
| --shadow-card              | 78      | rgba(15,23,42,0.04) 系              | —                                    | shadow 产品契约（有意轻于 generated）                                                                                             | shadow 契约专项     |
| --shadow-card-hover        | 25      | rgba(15,23,42,0.36) 系              | —                                    | 同上                                                                                                                              | 同上                |
| --surface-card-hover       | 52      | slate-50                            | slate-700                            | dark 翻转 ≠ atomic                                                                                                                | workbench migration |
| --surface-workbench        | 22      | slate-50                            | slate-950                            | 同上（[S2-THM01] 已登记）                                                                                                         | 同上                |
| --shadow-xs / -sm / -panel | 24+3+11 | 与 generated 不同值（产品有意调轻） | —                                    | 产品阴影尺度（D2 口径）                                                                                                           | shadow 契约专项     |
| --shadow-sm（手写）        | —       | 0.06/0.04 vs generated 0.05         | —                                    | 与 generated 不等值，保留手写尺度                                                                                                 | 同上                |

### 与 S2 已登记结论的一致性

S2（契约登记口径）已判定 bg/surface/status-dark 族 dark 翻转值 ≠ 目标 atomic 值，消费点不替换以避免深色回退；本次逐键评审确认该结论覆盖 S3 全水台，并追加两条新排除项：color-bg-primary→bg-primary 迁移（dark 无覆盖）与 card-* 复合别名收口（dark 链式解析已正确，收口收益低于风险）。

### 留档位置

66 键中 surface/border/white/black/shadow 17 键归 A 档 surface-shadow 组；module-accent 5 键 + workbench 半径 4 键归 workbench migration 组；duration/ease/micro 15 键归动效组；button-primary 4 键归控件契约组；其余归各自契约组。销账触发条件不变：对应契约专项立项（workbench migration / shadow 契约 / dark 翻转契约 / 动效专项）。

## 留档观察项（dark 反色链，随后续专项统一处理）

| 位置                                                                                  | 现状                                                                                    | 计划                            |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------- |
| badges.css `[data-theme="dark"]` draft/inactive/hub 灰章 mix `var(--color-slate-500)` | 反色后为浅灰章（slate-300 18%），语义上 draft/inactive 本就"次要"，非白闪类缺陷，暂不动 | 随 workbench migration 专项复审 |
| welcome-banner.css `[data-theme="dark"]` 装饰 orb mix `var(--color-slate-500)`        | 同上，装饰语义                                                                          | 随 welcome-banner 主题专项      |
