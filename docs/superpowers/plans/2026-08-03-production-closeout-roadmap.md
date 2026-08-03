# 生产收口路线（v3.0.12-rc.5 → 可上线）

**日期**: 2026-08-03
**基线**: `main` @ `3b432417`（== `sops/main` == `origin/main`）
**版本**: `3.0.12-rc.5`
**目标**: 恢复 CI/覆盖率达到发布门禁，达成企业生产级、可上线状态
**前置结论**: React 组件库兼容性**不需要引入**（证据见 §3）

---

## 1. 债务真实性核验（以直接证据为准）

### 1.1 多环境同步

- 本地 `HEAD`、`origin/main`、`sops/main` 三者 SHA 完全一致：`3b432417`。本地无滞后、无分叉。
- 工作区有未提交改动（本期审计新增/修复），**未推送**；远端 CI 仍跑旧 main，故 CI 现状 ≠ 工作区现状。

### 1.2 全量测试

- 本地 `vitest run`：**312 files / 3448 tests 全绿**（含本期审计改动）。
- 基线 main（`git stash` 后）跑测试同样通过，但覆盖率低于门禁。

### 1.3 覆盖率门禁（P0 阻塞）

`vite.config.js` 门禁：lines **82** / statements **80** / functions **82** / branches **65**。

| 运行                      | lines      | statements | functions  | branches   | 结论                              |
| ------------------------- | ---------- | ---------- | ---------- | ---------- | --------------------------------- |
| main 基线（stash 后重置） | 81.36%     | 79.39%     | 82.73%     | 67.33%     | ❌ lines/stmts 未过               |
| 含本期审计改动            | 81.89%     | 79.94%     | 83.41%     | 67.91%     | ❌ 仍差 lines 35 行 / stmts 21 条 |
| **收口后（补测试）**      | **82.00%** | **80.05%** | **83.70%** | **68.02%** | ✅ 四项全过（2026-08-03）         |

- 缺口极小：**再补 35 行 / 21 条语句**即恢复门禁。
- 已补齐：`fieldNormalization`、`routeConfigLoader`、`envConfig` 新增测试；`computedProperties` 24.69% → 97.63%（并修复 null 崩溃缺陷）；`PriorityRequestPool` 100%。

### 1.4 远端 CI 状态（P0 红线）

最近 8 次 `Quality Gate` / `Release` / `Dependency Update` **全部 failure**：

- `Quality Gate @ 3b43247227`：`unit` job 失败 —— 根因是 `tests/unit/release-workflow.test.ts` 用 `powershell.exe`，在 ubuntu runner 上 `spawnSync` 返回 `status=null`（3 个断言红）。
  - 该问题**已在本期工作区修复**（按平台选择 `pwsh` / `powershell.exe`），但尚未提交推送 → 远端仍红。
- 覆盖率门禁同上，是 CI `unit` job 的另一失败源。

### 1.5 看板 Open 债核实（均属实）

| ID         | 声明                              | 核实证据                                                                                    |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------- |
| TD-SET-01  | systemSettings 巨型单体 ~2.5k+ 行 | 实测 `systemSettings.ts` **3249 行** / html 3677 / css 2635，属实                           |
| TD-THM-01  | generated token 被手写覆盖        | `main.css` 先 import `variables.generated.css` 再 import 手写 `variables.css`，同名覆盖存在 |
| TD-THM-02  | Tailwind `blue-*` 硬编码大量      | 全库 **1510 处** / 97 文件（比文档估 900+ 更严重），已由门禁基线控住                        |
| TD-CMP-01  | 业务页按钮/表单自由组合           | `COMPONENT_GUIDELINES.md` 存在于 2026-07-26 落地，无 lint 强制                              |
| TD-TEST-01 | 视觉回归未进 CI                   | 仓库 `COMPONENT_GUIDELINES` 有截图指引，但 CI 仅 smoke/performance，无视觉回归 job          |
| TD-OPS-02  | 事实闭环（Sentry 默认关）         | 无 DSN 时禁用（`EnvConfig.monitoring.sentryDsn                                              |     | null`），产品决策 |

### 1.6 本次审计直接产出（已写入工作区）

- `computedProperties.ts`：修复 null/非法产品条目崩溃（`getCurrentProducts` / `availableAsins` 增加健全守卫），覆盖率 24.69% → 97.63%。
- `PriorityRequestPool.test.ts`：新增，覆盖率 100%（lines/functions）。
- `confidenceCalculator.test.ts` / `scraper-validators.test.ts`：补充空报告、非法输入、metadata 边界等分支。
- `release-workflow.test.ts`：修复 CI 平台兼容（pwsh vs powershell.exe），本地通过。

---

## 2. 是否需要 React 组件库兼容？——客观分析（基于现状）

- 本项目**不依赖 React**：`package.json` 仅 `@alpinejs/csp` 为前端框架依赖；`src/` 0 个文件 `from 'react'`。
- `COMPONENT_GUIDELINES.md` 已是原生组件体系（Tailwind + Alpine + 语义 token），组件位于 `src/components/`。
- **结论**：为兼容 React 引入运行时需 100KB+ 且需重写现有 Alpine 组件 → 收益低、风险高，**不需要 React 兼容层**。唯一「组件库兼容性」诉求若是第三方 React 生态组件（如 shadcn），代价大于收益，不建议在收口阶段引入。

---

## 3. P0 阻塞（先做，必须全绿）

1. 提交并推送本期工作区修复（release-workflow / computedProperties 测试与修复 / 覆盖率提升）**→ 让远端 CI 跑绿**（覆盖 `unit` 的 powershell 失败 + 覆盖率缺口）。
2. 补 35 行 / 21 条语句覆盖率：优先 `skills/index.ts`、`reviewEvidencePipeline.ts`、`promptlabService.ts` 分支。
3. 重跑 `Quality Gate` 至全部 job 通过；再跑 `Release` workflow 冒烟。
4. 更新 `TECH_DEBT_BOARD.md`：登记「覆盖率门禁红」为 Open（TD-TEST-03），修复后即关。

## 4. P1 进入企业级打磨

- TD-SET-01：按 section 拆分 `systemSettings.*`（P1 拆 5~6 个模块 + 域门面）。
- TD-CMP-01：✅ 已加最小门禁 `button-ui:gate`（`scripts/quality/audit-shared-ui.ts`，基线 29 处存量裸色按钮 + 禁新增 + `confirm(` 禁用，挂入 `ci:quality`）；存量迁移 + 组件示例站仍待做。
- TD-TEST-01：✅ 视觉回归已进默认 CI（`test.yml` visual job：ubuntu 环境 mint + 提交基线漂移门禁，36 用例/32 张 linux 快照入库 `daad7e5f`，9/9 jobs 绿 run #30807154543）。
- Security runbook 小结已具备，无需改动。

## 5. P2 可持续

- 补 `skills/index.ts`（408 行 0%）、`reviewEvidencePipeline.ts`（28%）等最低覆盖文件的最小单测，避免覆盖率再跌破 ratchet。
- `TD-THM-01/02` 主题债务按 D1/D6 路线图逐期治理（已有 spec）。

---

## 6. 验收标准（可上线判据）

- [x] 本地全量测试：312 files / 3448 tests 通过（已达成）
- [x] `npm run test:coverage` 门禁绿灯：lines 82.00% / stmts 80.05% / fn 83.70% / br 68.02%（2026-08-03）
- [x] 远端 `Quality Gate` 全 workflow 通过：8/8 jobs success（2026-08-03 run #30801669174；performance 首跑 89<90 为 CI 波动，重跑通过）
- [x] 视觉回归入 CI 后 Gate 9/9 jobs 绿（含 `visual regression` 基线比对 + `button-ui:gate`）：2026-08-03 run #30807154543
- [x] `TECH_DEBT_BOARD` 状态一致：TD-TEST-01 / TD-TEST-03 已关；TD-CMP-01 开门禁后仍 Open（存量迁移）
- [x] `TECH_DEBT_BOARD` 已核对：TD-TEST-03 修复复核后关闭（2026-08-03）
- [x] 提交推送完成：`fbd651bd` + `d7c3c916` + `8864e81`，HEAD 与 sops/main、origin/main 一致
