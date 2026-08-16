# 深色模式债务消除方案 Spec（收口准备）

> 作者：Zed AI · 2026-08-16 · 口径基线：main `3b2a9384`（S3 水台销账后）
> 定位：TD-THM-01 四契约专项的分批执行计划与收口判据 SSOT；关联台账 `THM01_LEGACY_POOL_LEDGER.md`、契约 `THM01_S_MAP.md`、看板 `TECH_DEBT_BOARD.md`。

## 1. 目标

把深色模式剩余债务从「台账留档」推进到「可执行批次」，定义 TD-THM-01 降级/关闭与深色模式「完成」的判据，为 rc.5 收口做准备。约束不变：**所有 baseline 只降不升、每批独立验证提交、不做无立项的硬迁**。

## 2. 现状快照（2026-08-16 实测）

| 指标 | 实测值 | 护栏 |
| --- | --- | --- |
| only-handwritten 遗留键 | **66**（A 档台账留档） | `token:override-audit:gate` |
| variables.css dark-mode keys | 42 | 同 gate + DARKFIX-CHAIN 契约 |
| atomic 冲突（allowlisted） | 20（easing 1 / radius 6 / shadow 7 / z-index 7） | unallowlisted 必须 = 0 |
| `[data-color-mode-resolved='dark']` 规则 | 1,510 处 / 53 文件 | — |
| 兼容选择器 `[data-theme='dark']` | **1,075 处 / 34 文件**（D3/D11 残留） | 待批 7 清理 |
| `dark-content-compat.css`（T4） | 3,069 行 / 592 规则 | 规则数只降不升 |
| content-surface 存量 | bg-white 162 / text-slate 1,073（67 文件） | 门禁只降不升（基线 196/2391） |
| hardcode baseline | shell 24（glass 豁免）/ modules 0 / semantic 2128 | 双锁只降不升 |
| 视觉回归 | smoke 93/93（三引擎 per-engine light/dark 基线） | 每批必须全绿 |

## 3. 债务分组与销账策略

### 3.1 四契约专项（66 键销账组，S3 逐键评审结论）

| 专项 | 键 | 代表消费 | 销账动作 | 立项依赖 |
| --- | --- | --- | --- | --- |
| **dark 翻转契约** | border-subtle/default/light/strong/muted、bg-hover、bg-selected、white/black alpha 族（~13 键） | border-subtle 156x、border-default 153x | generated 层补 dark 语义（方案 A）或手写层正式契约（方案 B），见 §4 批 3 | **无**（可立即立项） |
| **shadow 契约** | shadow-card/hover/xs/sm/panel + 手写 shadow-sm | shadow-card 78x | 产品阴影尺度迁入 design-tokens 或正式登记 | 无 |
| **动效契约** | duration/ease/micro 15 键 | duration-fast 246x | 动效族进 design-tokens（generated 补 motion 族）或正式登记 | 无 |
| **workbench migration** | module-accent 5 键 + workbench 半径 4 键 + surface-card/panel/hover/workbench + bg-primary + 布局契约（container/header/sidebar 等）+ 20 处 allowlist 冲突 | surface-card 723x、module-accent 450x | 工作台 SSOT 定义后逐条销账；glass 豁免同机复审 | 需独立立项（最大项，另立执行文档） |

### 3.2 深色基建债（非 token）

| 项 | 规模 | 处置 |
| --- | --- | --- |
| ci:ui-audit 暗色断言扩面 | card/callout/workbench 三审计仅测浅色 | **批 1 ✅ 已完成（2026-08-16）** |
| D14 badge -400 派残留 | 2 处（cards.css 14 条 dark 规则、amz_hub_style.css L403-408） | **批 2 ✅ 已完成（2026-08-16）** |
| D3/D11 兼容选择器清理 | 1,075 处 | 批 7（先定兼容窗口） |
| content-surface 存量迁移 | 162 + 1,073 | 批 8（长期，随模板整改） |
| D12 Appearance preset 视觉矩阵入 CI | opt-in scaffold 升级 | 批 7 同批评估 |
| D5/D13 focus-ring 蓝 fallback 接线 | 消费点已登记保留 | 随 workbench migration（批 6） |

### 3.3 豁免/保留登记（本轮不动，维持门禁锁死）

- glass 色盘 24 处（GUI014 契约，复审时机 = workbench migration 触导航体系）；
- slate 甄别台账 89 处（次序 13 收官登记）；
- arbitrary hex 回退值 / Chart.js / devtools 三类（THM02_FINAL_SUMMARY §六登记）；
- `dark-content-compat.css` 本体（T4 基础设施，规则数只降不升）。

## 4. 批次执行计划

| 批次 | 内容 | 预估 | 依赖 | 验收判据 |
| --- | --- | --- | --- | --- |
| **批 1 ✅** | ci:ui-audit 暗色扩面：三审计脚本注入 dark 标记（复用 `_preview-server.ts` + `applyColorMode`），断言深色 hover rail/border/surface 契约 | 0.5–1 天 | 无 | ci:quality 20/20 + 三审计 dark 断言通过 + build + smoke 93/93 |
| **批 2 ✅** | D14 收敛：`cards.css` overview-accent 14 条 dark 规则 -400/16% → -500/18%；`amz_hub_style.css` L403-408 重复规则删除（后者已被 -500 规则覆盖） | 0.5 天 | 无 | button-ui:gate + badge 相关审计 + smoke（NPI dark 基线零漂移） |
| **批 3** | dark 翻转契约专项：先做决策点评审——方案 A：`design-tokens.ts` 增加 dark 轴，`generate:tokens` 输出 generated dark 块（结构性解债）；方案 B：border/alpha 族在手写层升格正式契约注释（维持现状但登记）｜决策后按族分批：border 族（~440 消费）→ bg-hover/bg-selected → white/black → S2 的 563 处/64 文件消费点跟随替换 | 2–3 天 | 决策点评审通过 | token:override 键数下降 + 每族 smoke 零 diff + DARKFIX-CHAIN 契约复核（暗块禁引反色键） |
| **批 4** | shadow 契约专项：shadow-card/hover/xs/sm/panel 产品尺度迁入 `design-tokens.ts`（generated 对齐产品值），手写声明移除；-sm 不等值键择一登记 | 1 天 | 无 | 同上 + shadow 相关视觉基线不漂移 |
| **批 5** | 动效契约专项：duration/ease/micro 15 键迁入 generated（补 motion 族）或正式登记为手写保留组 | 1 天 | 无 | 同上 |
| **批 6** | workbench migration（独立立项执行，本 spec 只定接口）：模块色 SSOT、workbench 半径、布局契约、20 处 allowlist 冲突、glass 复审 | 5+ 天 | 独立执行文档 | 销账 20 冲突 + 对应键组，allowlist 清零或逐条迁移 |
| **批 7** | D3/D11 清理：先定兼容窗口（建议 v3.1.1 GA 发布后满 1 个 minor 版本），脚本化删除第三选择器 `[data-theme='dark']`（1,075 处）；D12 矩阵升格 CI 同批评估 | 0.5–1 天 | 兼容窗口决策 | 全库无 `[data-theme='dark']` 残留（脚本校验）+ smoke + 主题矩阵测试通过 |
| **批 8** | content-surface 存量迁移：bg-white 162 + text-slate 1,073 → `.ui-card`/语义 token，按 top 文件分批（quality_listing 116 居首） | 长期（不设死线） | 随模板整改自然推进 | 门禁只降不升（每批刷新基线）+ 批 3 之后 compat 规则数应同步下降 |

每批通用纪律：`ci:quality` 20 项全绿 + `npm run build` EXIT=0 + smoke 93/93（三引擎）；涉及 token 时 `generate:tokens` 并核对 diff；涉及 dark 值时必须核对 NPI dark 基线（亮度采样）。

## 4.1 执行记录（2026-08-16 round 1）

- **批 1 完成**：三审计脚本（`audit-card-ui.ts` / `audit-callout-ui.ts` / `audit-workbench-ui.ts`）增加 dark pass——注入与 ThemeManager 一致的深色标记，断言「翻转发生」（背景变化且亮度显著下降、文字变亮）+ 结构契约复用，失败信息 `[dark]` 前缀；`color(srgb …)` 计算值解析补齐（修复亮度断言静默跳过）；card 审计默认态 rail 断言在深色等价为「无可见 rail」。
- **批 2 完成**：`cards.css` overview-accent 14 条 dark 规则收敛为规范配方 `color-mix(in srgb, var(--color-{hue}-500, hex) 18%, var(--surface-card))`（含 slate 14%→18%）；`amz_hub_style.css` 删除两前缀重复块，`border-color` 移植进三前缀后置块，16%→18%。浅色规则零改动。
- **附带修复 TD-E2E-01b**：`release-smoke.spec.ts` ① `URL.pathname` 丢盘符（Windows ENOENT `D:\D:\...`）改用 `fileURLToPath`；② 像素基线 per-OS 维度——Linux 保持裸名（CI 不受影响），非 Linux 追加 `-{platform}` 后缀并 seed 本机 win32 基线 6 张（数值验证：尺寸一致、平均 RGB 一致、mismatch 3.2% 为渲染级漂移）。
- **验收**：`ci:quality` 20/20（三审计 light+dark 全绿）· `ci:security` 通过 · smoke **93/93**（31 chromium + 62 firefox/webkit）。


## 4.2 批 4/5 可行性评估结论（2026-08-16 调研）

调研证据（generated 家族已有 EASING/DURATION/BOX_SHADOW；生成器按家族硬编码但家族内加键纯数据驱动；Tailwind 主题**内联** generated 字面量而非 `var(--shadow-*)`；variables.css 覆盖顺序有单测锁定）推翻了批 4 的「等价迁移」假设，修订如下：

**批 5（动效契约）——判定：可执行，安全等价迁移 ✅**

| 组 | 键 | 证据 |
| --- | --- | --- |
| duration 命名键 8 个 | fastest/fast(242x)/normal(188x)/slow(54x)/slower/slowest/1s/2s | 无 dark 镜像；Tailwind 类只用数字键（duration-200 等）与命名键互不相干；加入 DURATION 即生成，critical.css 的 300ms 别名与迁入值一致 |
| ease 4 个 + ease-smooth（447x，冲突） | spring/elastic/back-in/back-out | 无 dark 镜像；`ease-smooth` 类 src 零使用（447 处全为 var 消费）；tailwind.config.js 硬编码的 ease-spring 类与迁入值同值不冲突 |
| animations-enabled / animation-speed-multiplier | 2 键 | 运行时被 animation-manager.ts 内联覆写，样式表定义仅 JS 执行前默认值 |

预计 only-handwritten 66 → 约 51（含 4 个 micro 键零消费归档：src 零实际消费，值已在 animation-config.ts 常量中，buttons.css 注释登记 micro 未落地）。

**批 4（shadow 契约）——判定：有条件执行，行为变更需升级验收 ⚠️**

- 变量消费者（var(--shadow-*) 约 123 处）等价；但 **Tailwind 主题内联字面量**：浅色 `shadow-sm/md/lg/xl/2xl/inner` 类（约 150 处）今天有效值 = Tailwind 默认值，深色经 bridge 走 var(--shadow-*) 产品值——**浅深本来就不一致**；generated 对齐产品值后浅色类消费者**有意变值**（修复浅深不一致，但属行为变更，非等价迁移）。
- dark 镜像承载：generated 无 dark 层 → 迁移拆分为「light 值进 generated + 手写层只保留 dark 块镜像」，与批 3 决策联动。
- 验收升级：全量 smoke + shadow-sm 等高消费类的浅/深双模式视觉抽查（compat 三引擎），NPI 基线不涉 shadow 区域。

**执行建议**：批 5 先做（纯等价、低风险）；批 4 待批 3 决策后按修订方案执行。

## 4.3 批 3 决策点评审（dark 翻转契约）

**问题定义**：generated 层无 dark 块机制，凡 dark 下需换值的语义（border/alpha 族 ~13 键、shadow 10 条 dark 镜像、color-mix 比例差）只能留在手写层——这是 only-handwritten 66 键中大部分键的销账卡点。

| 维度 | 方案 A：generated 引入 dark 轴 | 方案 B：手写 dark 块正式登记（推荐） |
| --- | --- | --- |
| 做法 | design-tokens.ts 增加 dark 轴，三个生成器（CSS/Tailwind/类型）+ audit 分类器扩展，输出 generated dark 块 | variables.css dark 块加契约注释（S2 模式），暗块规则正式化（禁引反色键、raw 值、登记台账），销账条件改挂 workbench migration |
| 工作量 | 3–5 天（生成器+迁移校验） | 0.5 天 |
| 风险 | 高：DARKFIX/变白回退类链式反色事故风险集中在深色翻转；RC 冻结期大范围深色重排 | 零视觉风险（值不动） |
| 收益 | 单一事实源，border/alpha/shadow dark 原子化 | 债务受控不增长，门禁已锁增量 |
| 时机 | workbench migration 本来就要重构 generated 体系（模块色 SSOT、workbench 半径），dark 轴顺带落地可避免二次改生成器 | 立即可做 |

**推荐：方案 B 短期 + 方案 A 并入 workbench migration**。理由：① RC 冻结期深色翻转变更是全库风险最高的动作（B4/B5 两次事故均为 dark 链式反色）；② workbench migration 必然重构 generated 层，dark 轴与其同机落地只改一次生成器；③ 方案 B 实质工作极小且门禁（token:override gate + DARKFIX-CHAIN 契约 + smoke 93/93）已锁死增量。

**决策请求**：产品/工程负责人确认方案 B（默认推荐），或选择方案 A 提前执行。

## 5. 收口判据（Close-out Criteria）

### 5.1 TD-THM-01 降级（P2 → P3）

参照 `CMP02_DOWNGRADE_TO_P3_SPEC.md` 流程，全部满足后降级：

1. 批 1–5 完成：66 键全部销账，或未销账键均有正式立项并登记台账；
2. allowlist 仍为 20 条（无新增未登记冲突），unallowlisted = 0；
3. dark 翻转专项后 `variables.css` dark-mode keys 只降不升；
4. 复检窗口开启（30 天，新建硬编码即回滚 P2），对照基线快照冻结。

### 5.2 TD-THM-01 关闭

1. workbench migration（批 6）完成：20 处冲突消化 + 对应键组销账；
2. 复检窗口到期人工复检通过；
3. 移入看板 Closed，主题债交叉索引（D1–D12）同步移除 D1 条目。

### 5.3 深色模式「完成」的工程定义

不追求三源合一（bridge/compat 是存量兜底，长期保留），以以下四条件为完成口径：

1. **新增模板零深色债**：新页面无需 compat 兜底即通过 dark 断言（批 1 门禁在线）；
2. **存量只降不升**：content-surface（162/1073）、compat 规则数（592）、`[data-theme='dark']`（1,075）三条曲线持续下降；
3. **深色断言覆盖核心面**：card/callout/workbench 三审计含 dark + NPI 像素基线三引擎 + D12 矩阵入 CI；
4. **dark 语义单一登记点**：批 3 决策后，深色翻转值只存在于 generated dark 块或正式契约注释的手写层，无第三处暗值来源。

## 6. 风险与红线

| 风险 | 红线 |
| --- | --- |
| B5 变白回退类（暗块引反色键链式解析） | DARKFIX-CHAIN 契约：暗块语义键禁止引用已反色键，一律直写 raw 值；每批 smoke + NPI dark 亮度采样核对 |
| 盘点脚本误判（B5 曾误删 137 键） | 盘点必须 `-e` 字面传入 + name 格式双校验 + dry-run 全量核对残留 |
| settings-scale 限额 | variables.css 变更守 1200 行限额（当前 1199） |
| baseline 对冲绕过 | 所有 gate 双锁（total + per-file），每批只降不升 |
| S2 消费点替换致深色回退 | 替换前必须确认 dark 翻转值 = 目标 atomic 值（S3 评审口径），否则维持契约注释 |

## 7. 交付物

- 本 spec（决策 SSOT）；
- 批 6 workbench migration 独立执行文档（立项时新建）；
- 每批销账同步：台账 `THM01_LEGACY_POOL_LEDGER.md`、契约 `THM01_S_MAP.md`、看板 `TECH_DEBT_BOARD.md`、CHANGELOG rc.5 章节；
- 批 1/2/7 后更新 `THEME_SYSTEM_GUIDELINES.md` §8 债务表与 §9 验收标准。
