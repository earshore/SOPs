# TD-THM-01 遗留池台账（A 档：待 workbench migration 同步决策）

> 生成日期：2026-08-15（rc.4 发布后）· 数据口径：`audit-token-overrides.ts --json` @ main `1a71c3a1`
> 本台账为 rc.5 规划的留档部分：A 档 token 不在本 RC 硬迁，随 workbench migration 启动时逐条销账。S/B 档销账记录追加在文末。

## A 档清单（按消费度降序，共约 100 处）

产品专属 / 布局契约 / 无 generated 对等物，迁移时机 = workbench migration。

| token | 族 | 消费度 | 留档理由 |
| --- | --- | --- | --- |
| --module-accent | module | 443x | workbench 模块色 SSOT 未定义 |
| --module-accent-text | module | 239x | 同上 |
| --module-accent-border | module | 84x | 同上 |
| --module-accent-soft | module | 39x | 同上 |
| --module-accent-focus | module | 3x | 同上 |
| --container-*（9 个） | container | 3–35x | 布局容器契约，workbench 网格未定义 |
| --header-height / --header-height-sm | header | 27x 合计 | 顶栏布局契约 |
| --sidebar-width / -collapsed / -wide | sidebar | 16x 合计 | 侧栏布局契约 |
| --micro-*（8 个） | micro | 3–36x | 微交互动画契约，generated 无对等物 |
| --gradient-*（10 个） | gradient | 低频 | 渐变资产，设计系统未定 |
| --wash-*（8 个） | wash | 33x 合计 | 底色 wash 资产 |
| --z-*（5 个） | z | 3–8x | 层叠契约（D1 冲突同族，维持 intentional） |
| --breakpoint-*（5 个） | breakpoint | 低频 | 断点契约 |
| --backdrop-blur-* / --blur-*（9 个） | blur | 低频 | 模糊资产 |
| --shadow-*（除 card 系） | shadow | 低频 | 阴影资产（card 系已入 S 档） |
| --duration-*（除 fast/normal/slow） | duration | 低频 | 时长资产 |
| --opacity-*（21 个） | opacity | 低频 | alpha 阶梯资产 |
| --button-primary-* / --card-radius / --panel-radius 等 | button/card/panel | 3–9x | 控件局部契约（card-shadow 入 S 档） |
| --page-gutter / --layout-* / --prose-width | layout/page/prose | 5–8x | 排版布局契约 |

## 销账记录

| 日期 | 批次 | 销账条目 | 凭证提交 |
| --- | --- | --- | --- |
| 2026-08-15 | B 批（零消费归档） | 76 个 only-handwritten 零消费 token 从 variables.css 移除（85 行：9 个在 dark 覆盖块有镜像）；遗留池由 240 → 164；全库引用二次确认零误伤；验收：ci:quality 20/20 · build · smoke 93/93 | rc.5-B |
| 2026-08-15 | B 批 2（S1/S2 零消费空壳归档 + focus-ring 衍生链清理） | 移除 S1/S2 零消费空壳声明 25 行（text 六族残留 14 + focus-ring 衍生链 5 + bg-disabled 2 + warning/info-dark 2 + spacing 2 + surface-card-hover/workbench 2）+ module-accent-focus 降级 var(--module-accent)（[B2-THM01]）；遗留池 164 → 141（bg-secondary/bg-tertiary/surface-card-hover/surface-workbench/success-dark/error-dark/spacing-2xl/spacing-3xl 仍有 Tailwind arbitrary 消费，留待下次 B 批） | 见下 DARKFIX 提交 |
| 2026-08-15 | DARKFIX（S1 深色翻转修复） | S1 将 text/focus 消费迁移至 slate-* 原子键后 dark block 未重定义原子键，深色模式文字（slate-900 #0f172a 近黑）在深色背景不可见；dark block 新增 4 行原子键反色翻转（slate-900→slate-50、slate-500→slate-400、slate-400→slate-500、slate-300→slate-600），恢复 S1 前等价表现；验收：ci:quality 20/20 · build ✓ · only-handwritten 141 · smoke 无新增失败 | 与 B 批 2 同提交 |
| 2026-08-15 | NPI dark 基线修复 | S1 re-seed 时 3 个 dark 基线（chromium/firefox/webkit）被 light 截图覆盖（污染），本次以正确 dark 渲染重 seed 全部 6 个基线（肉眼 + 亮度采样验证：dark avg brightness 109-110、light 246）；smoke 无新增失败（唯一 webkit NPI 恢复阶段超时为 TD-E2E-01 预存 flake，B 批 ci 即存在）；closeGlobalSettings 加固面板关闭时序容错（TD-E2E-01） | 与 B 批 2 同提交 |
| 2026-08-15 | B 批 3（success/error-dark + spacing-2xl/3xl 归档 + arbitrary 50 处替换） | 归档 4 token：success-dark 3 处 → green-600 / error-dark 14 处 → red-600 / spacing-2xl 7 处 → spacing-12 / spacing-3xl 2 处 → spacing-16，声明移除 8 行（light 4 + dark 4，[B3-THM01]）；arbitrary→语义类替换 50 处：workflows template 44 + navigation.ts 2 + restricted_words 1 → bg-secondary；AlpinePanel 2 → hover:bg-surface-card-hover（登记 S3 bridge 台账）；bg-secondary 语义 32 处 / surface-card-hover ~10 处 / bg-tertiary / surface-workbench 仍存，留待下批；验收：ci:quality 20/20 · only-handwritten 137 · build ✓ · smoke 93/93 | `31d7f354` |

| 2026-08-15 | S 档映射准备 | 51 处有消费 S 档分三级：S1 name-map 28 + S2 value-match 2 为本批消化清单（30 处，六族 3108 次消费）；S3 alias/bridge 21 处高频（surface-card 719x 居首）回流 A 档台账；契约文档 THM01_S_MAP.md 入库 | rc.5-S `4b93c05c` |
| 2026-08-15 | S 批 1（text/focus/spacing 六族） | 13 处映射替换全库 2,434 处消费点（91 文件）：text 六族 → slate-900/500/400/300 + primary、focus-ring → primary、spacing 六族（2xs–xl → spacing-1-5/2/3/4/6/8）；variables.css 声明行加 [S1-THM01] 契约注释（值不变、零新增键）；content-surface 表面基线 -1,318（只降不升）；NPI 表格 dark 基线因环境渲染漂移重 seed（NPI 代码零改动）；验收：ci:quality 20/20 · build · smoke 93/93 | rc.5-S1 `c017af8e` |
| 2026-08-15 | S 批 2（bg/surface/status-dark/剩余 spacing 契约登记，方案 A） | 13 处映射在 variables.css 全部 21 个声明行（light 13 + dark 8）加 [S2-THM01] 契约注释（值不变）；消费点不替换——bg/surface/status-dark 族 dark 翻转值 ≠ 目标 atomic 值，避免深色模式视觉回退，随 workbench/surface 契约专项再处理；dry-run 统计 563 处/64 文件留作下批参考；验收：ci:quality 20/20 · build ✓ · only-handwritten 164 不变（池消化随下次 B 批归档） | rc.5-S2 `166a65aa` |
