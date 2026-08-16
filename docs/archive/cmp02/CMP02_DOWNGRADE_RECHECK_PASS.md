# TD-CMP-02 降级复检归档（2026-09-14 到期人工复检）
**状态**：复检前置准备完成（2026-08-15，`2c640226`）｜**到期执行**：2026-09-14｜**关联**：`CMP02_DOWNGRADE_RECHECK_MONITOR.md`、`CMP02_DOWNGRADE_TO_P3_SPEC.md`、看板 TD-CMP-02（P3）

## 1. 复检背景

TD-CMP-02（表单/settings 体系技术债）于 2026-08-15 由 P2 降级为 P3，触发条件为体系 A 112 处 settings-control CSS 契约全量 token 化闭环（提交 `4265966d`）与门禁对新建硬编码的持续拦截能力。复检窗口至 **2026-09-14**，判据为：settings-control 体系 A/B 若出现新建硬编码（非 token 化引用），即回滚为 P2 并重新排入主路线；若窗口内无失控新增，则通过复检归档，TD-CMP-02 由 P3 进入 Closed。

## 2. 复检执行清单（2026-09-14 或之前逐项执行）

| # | 步骤 | 命令 / 位置 | 通过判据 |
| --- | --- | --- | --- |
| 1 | CI 质量门禁全量运行 | `npm run ci:quality` | exit 0，20 项全绿 |
| 2 | shell lane 核对 | 门禁输出 `shell lane` 行 | `24/24`（允许持平，不允许上升） |
| 3 | modules lane 核对 | 门禁输出 `modules lane` 行 | `0/0`（双族锁死，不允许任何非零） |
| 4 | semantic lane 核对 | `config/theme-blue-hardcode-baseline.json` `total` | ≤ `2128`（只降不升，当前 2128） |
| 5 | per-file 增量校验 | `scripts/quality/theme-hardcode-baseline.ts` | 任何单文件增长即 exit 1 |
| 6 | token 覆盖审计 | 门禁 `token:override-audit:gate` 输出 | identical 0 / unallowlisted 0 |
| 7 | settings 契约规模 | 门禁 `settings-scale` 输出 | `1199/1200` 量级（限额未越界，fragment 清单未失控增长） |
| 8 | settings 相关提交审查 | `git log --oneline since 4265966d` 审查 settings 面板提交 | 无新建 long-text/hex 硬编码（对照 `theme:hardcode-baseline:gate` 未拦截的豁免情形：glass 色盘 12 处、common 层 24 处已登记豁免台账） |
| 9 | 视觉回归抽检 | `npm run build && CI=1 npm run test:e2e:smoke` | smoke 93/93（含 firefox/webkit per-engine NPI baseline 与 webkit 路由级阈值） |
| 10 | 归档 | 本文档追加「复检执行记录」章节并 commit | 提交信息 `docs(cmp-02): TD-CMP-02 复检通过归档（2026-09-14）` |

## 3. 复检通过判据

> shell `24/24`（持平）、modules `0/0`（持平）、semantic total `≤ 2128`（只降不升）、token:override unallowlisted `0`、settings-scale 未越 1200 限额、smoke 93/93 全绿，且 `git log` 审查确认窗口内无失控新建硬编码 → 复检通过，TD-CMP-02 由 P3 进入 Closed。

任意一项不满足即触发**提前回滚**：定位来源提交 → 迁移为 token 化引用或登记 allowlist → 若属失控新增（规避门禁意图的硬编码），TD-CMP-02 回滚为 P2 并重新排入主路线（`CMP02_DOWNGRADE_RECHECK_MONITOR.md` 第 3 节纪律）。

## 4. 复检前置准备（2026-08-15 完成，`2c640226`）

复检依赖的全部验收能力在降级当日已就位，窗口期内无需额外搭建：CI 门禁三件套（baseline 双锁 + override 审计 + scale 清单）覆盖每次 push/PR；次序 14 完成后 smoke 93 用例含 firefox/webkit per-engine NPI 视觉断言（`docs/color-region-baselines/` 六基线：chromium/firefox/webkit × light/dark），视觉回归抽检不再受 Chromium-only 基线缺陷干扰。当前门禁快照（`2c640226`）：semantic `2128/2128`、modules `0/0`、shell `24/24`、settings-scale `1199/1200`、lint `0/0`、bridge gate 通过——此快照即 9 月复检的对照基线。

## 5. 复检执行记录（2026-09-14 填写）

执行日期：____-__-__（预期 2026-09-14）
执行环境 commit：`__________`

| 步骤 | 结果 |
| --- | --- |
| 1 ci:quality exit code | |
| 2 shell lane | |
| 3 modules lane | |
| 4 semantic total | |
| 6 override audit | |
| 7 settings-scale | |
| 8 git log 审查结论 | |
| 9 smoke | |
| 10 归档提交 SHA | |

**复检结论**：通过 / 回滚 P2（二选一）
