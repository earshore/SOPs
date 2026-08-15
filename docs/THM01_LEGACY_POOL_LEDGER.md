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

| 2026-08-15 | S 档映射准备 | 51 处有消费 S 档分三级：S1 name-map 28 + S2 value-match 2 为本批消化清单（30 处，六族 3108 次消费）；S3 alias/bridge 21 处高频（surface-card 719x 居首）回流 A 档台账；契约文档 THM01_S_MAP.md 入库 | rc.5-S `4b93c05c` |
