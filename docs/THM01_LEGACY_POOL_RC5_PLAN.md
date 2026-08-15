# TD-THM-01 遗留池盘点与 rc.5 规划

> 作者：Manus AI · 2026-08-15（rc.4 发布后）· 版本 v3.1.1-rc.5 规划基线
> 数据口径：`npx tsx scripts/quality/audit-token-overrides.ts --json` 对当前 main（`1a71c3a1`）实测

## 1. 背景与卡片现状

TD-THM-01 主题债（P2）的 D1 冲突线已在次序 12（`fd4463d0`）闭环：20 处 atomic 冲突全部 allowlist 登记（easing 1 / radius 6 / shadow 7 / z-index 7，均为产品 intentional override，迁移时机为 workbench migration），identical 冗余 9→0 已清理，`token:override-audit:gate` 持续在线拦截新增未登记冲突。剩余池为 **only-handwritten 240 处**（D2 迁移候选，非阻塞），看板维持 P2，约定在 workbench migration 启动时关闭。

本次盘点聚焦这 240 处 only-handwritten 的现状与 rc.5 可消化部分。

## 2. 实测现状（main `1a71c3a1`）

| 指标 | 实测值 | 说明 |
| --- | --- | --- |
| generated :root keys | 390 | 生成侧 SSOT |
| handwritten :root keys | 260 | 手写侧 |
| dark-mode keys | 76 | 深色翻转 |
| conflicts（同名不同值） | 20 | 全部 allowlisted，unallowlisted = 0 |
| identical | 0 | 次序 12 已清零 |
| only-handwritten | **240** | 本次盘点对象 |
| only-generated | **370** | 看板旧口径 361，漂移 +9（需说明，见第 5 节） |

全部 240 处集中在单一文件 `src/css/foundation/variables.css`（L38–475），行分布均匀（每百行 40/57/50/51/42 处），说明这是同一文件的系统性存量，不具备"散点治理"特征，适合按族批量消化。

## 3. 分类分布

### 3.1 按审计 category

| category | 数量 | 性质 |
| --- | --- | --- |
| handwritten-semantic | 103 | 手写语义层（surface/text/border 之外的手写语义声明） |
| other | 51 | 容器/阴影/时长/渐变等通用层 |
| semantic-border-focus | 22 | 边框与焦点环语义 |
| semantic-surface | 15 | 表面语义（bg-* 族） |
| palette-primitive | 14 | 黑白原色与 alpha 阶梯 |
| semantic-status | 11 | 状态语义（error/info/success/warning 子色） |
| handwritten-spacing-alias | 10 | 间距别名 |
| semantic-text | 8 | 文字语义 |
| handwritten-radius-alias | 3 | 圆角别名 |
| semantic-brand | 2 | 品牌主辅色对比 |
| spacing | 1 | 间距原语 |

### 3.2 按命名族（top 12）

| 族 | 数量 | 族 | 数量 |
| --- | --- | --- | --- |
| color | 53 | duration | 9 |
| opacity | 21 | wash | 8 |
| container | 12 | blur | 7 |
| gradient | 12 | focus | 6 |
| micro | 11 | scrollbar | 6 |
| spacing | 11 | breakpoint | 5 |

### 3.3 按消费度（src/ 引用计数，扣除定义处）

| 消费度 | token 数 | 说明 |
| --- | --- | --- |
| ≥50 处高频 | 21 | 如 --surface-card 719x、--module-accent 443x、--color-text-secondary 357x |
| 10–49 处中频 | 51 | |
| 3–9 处低频 | 28 | |
| 1–2 处微量 | 46 | |
| **零消费** | **94** | 无任何 src/ 引用，可安全归档清理 |

高频头部：--surface-card (719) > --module-accent (443) > --color-text-secondary (357) > --color-text-primary (355) > --surface-panel (263) > --duration-fast (244) > --module-accent-text (239) > --duration-normal (188) > --border-subtle (152) > --color-border-default (151)。

## 4. 迁移难度分档

**S 档（脚本化批量映射，rc.5 可消化）**：与 generated 语义对等物有清晰一一映射的手写语义 token，集中在 surface / text / border-focus / status / spacing 五族，约 80 处。做法与 slate 专项（次序 13）相同：契约登记 → 别名过渡 → 批量替换 → baseline 双锁验收。迁移后 semantic baseline 只降不升，收益直接。

**A 档（需 workbench migration 同步决策，rc.5 不动）**：产品专属 token、无 generated 对等物或承载布局契约，包括 module-accent 系列（84+239+84 消费）、container、header-height / sidebar-width、micro-* 动画族、gradient / wash 系列、z-*、breakpoint。这些是 workbench 设计系统尚未定义的领域，硬迁会制造"手写 → 无归属"的新债，维持"待 workbench migration"的既定决策。

**B 档（零消费归档，rc.5 可消化）**：94 个无任何 src/ 引用的 token。清理动作：甄别是否属于测试/脚本间接消费 → 确认无消费后从 variables.css 移除 → 更新 audit 基线 → baseline 与门禁复核。收益为基线降噪与防御面缩小，风险极低（移除前加一次性全库引用扫描确认）。

## 5. rc.5 范围建议

| 批次 | 内容 | 预估 | 验收 |
| --- | --- | --- | --- |
| B 批 | 94 个零消费 token 归档清理 | 0.5 天 | 引用零残留 + ci:quality + build + smoke 93/93 |
| S 批 1 | surface/text 语义族映射（约 40 处） | 1 天 | 同上 + baseline 刷新双锁 |
| S 批 2 | border-focus/status/spacing 族映射（约 40 处） | 1 天 | 同上 |
| 留档 | A 档 100+ 处登记台账 | 0.5 天 | 台账入库，迁移时机 = workbench migration |

物理约束：settings-scale 限额 1200 行（当前 1199/1200），别名过渡期可能触及限额，S 档批内需同步注释合并守限额；semantic baseline 2128 只降不升；`token:override-audit:gate` 全程在线。

**基线漂移说明**：only-generated 由看板登记 361 漂移至实测 370（+9），属 slate/次序 14 基线刷新后的正常口径演化，非回退；rc.5 文档同步更新后以实测 370 为新登记值。

## 6. 与既有门禁的关系

rc.5 全程沿用"批次独立验证提交"纪律：每批 `npm run ci:quality` 20 项全绿 + `npm run build` + `npm run test:e2e:smoke`（93/93，三引擎 per-engine 基线在线）。TD-CMP-02 复检窗口（2026-09-14）不受影响——rc.5 仅涉及 variables.css 的 only-handwritten 清理与别名映射，不触碰 settings 表单与体系 A/B 已收口范围。

## 7. 交付物

- 本文档（SSOT 规划）
- `docs/THM01_LEGACY_POOL_LEDGER.md`（A 档台账，随 S/B 批消化逐条销账）
- audit 脚本基线随批刷新，CHANGELOG rc.5 章节随发布同步
