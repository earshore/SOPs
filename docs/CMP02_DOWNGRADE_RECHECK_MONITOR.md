# TD-CMP-02 降级复检窗口自动化监控配置（2026-09-14 到期）

**状态**：已评估完成（2026-08-15）｜**关联**：`CMP02_DOWNGRADE_TO_P3_SPEC.md`、看板行 33（P3）

## 1. 复检判据回顾

TD-CMP-02 由 P2 降为 P3 时登记的复检判据：**复检窗口至 2026-09-14，若 settings-control 体系 A/B 出现新建硬编码（非 token 化引用），即回滚为 P2 并重新排入主路线**。

## 2. 现有自动化监控覆盖评估

| 判据                                            | 监控手段                                                                                                                                                                                             | 覆盖状态                                                                                            |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 体系 A/B 新建硬编码（CSS 自建值）               | `theme:hardcode-baseline:gate`（shell/modules/semantic 三 lane）+ 五族语义哨兵 lane，`--fail-on-increase` 语义为「只降不升」，CI 每次 push/PR 触发（`.github/workflows/test.yml` 覆盖 main/develop） | **已覆盖**：任何新增长文本硬编码（含新增 slate/hex/semantic 族）都会被 gate 拦截，baseline 只降不升 |
| 体系 A/B 非 token 引用（token 契约回退）        | `token:override-audit:gate`（identical 0 / unallowlisted 0 / stale 0）                                                                                                                               | **已覆盖**：新增未登记的 token 覆盖与回退即被拦截                                                   |
| settings-control CSS 契约（systemSettings.css） | `settings-scale`（1200 行限额 + 41 files / 11 html fragments 清单）                                                                                                                                  | **已覆盖**：契约文件与片段数量只增不减，新建失控 fragment 即被拦截                                  |
| 视觉回归                                        | `ci:ui-audit` + smoke 31 用例（NPI 深浅双 baseline 像素断言）                                                                                                                                        | **已覆盖**：UI 层回退产生视觉 diff 即被断言捕获                                                     |

**结论**：复检判据的「防新建硬编码」实质监控**已完全由 CI 门禁自动化覆盖**，无需新增专用监控流水线。门禁即监控：baseline 双锁 + override 审计 + scale 清单三件套在任何 push/PR 上持续运行，等价于 30 天内每行变更都经过复检判据的自动审查。

## 3. 缺口与到期提醒设计

唯一的非自动化缺口是**到期日单点确认**（2026-09-14 复检提交本身是人工动作）。当前不引入额外调度依赖（Manus 定时任务 / cron 属于用户订阅功能，且仓库 CI 无自调度能力），按以下轻量纪律执行：

1. **到期提醒登记**：本方案文档与看板行 33 状态列均登记「2026-09-14 复检」，开发期间打开仓库即可见。
2. **到期动作**（2026-09-14 或之前）：`npm run ci:quality` 确认三 lane baseline 未上升（预期 shell 24/24、modules 0/0、semantic ≤2965）+ `git log` 审查 settings 面板相关提交无新建硬编码 → 提交「复检通过」归档（`docs/CMP02_DOWNGRADE_RECHECK_PASS.md`），TD-CMP-02 由 P3 进入 Closed。
3. **提前触发**：复检窗口内任意时刻若 CI 出现 baseline 上升或 unallowlisted 新增，立即人工介入：定位来源 → 迁移或 allowlist 登记 → 若属失控新增即回滚 P2。

## 4. 配置清单

- `.github/workflows/test.yml`：push（main/develop/branch2-21）+ PR（main/develop）触发，含 `theme:hardcode-baseline:gate`、`token:override-audit:gate`、`settings-scale` 等 ci:quality 全 20 项。
- `config/theme-*-hardcode-baseline.json`：baseline 双锁（total + per-file）。
- `scripts/quality/theme-hardcode-baseline.ts`：`--fail-on-increase`（exit 1 于任何 lane 增长）。
- 到期确认脚本（2026-09-14 执行）：`npm run ci:quality && echo RECHECK_PASS`，结果归档至 `docs/CMP02_DOWNGRADE_RECHECK_PASS.md`。
