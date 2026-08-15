# TD-THM-01 收敛实录（次序 12）

**执行日期**：2026-08-15
**执行提交**：待提交
**关联**：`NEXT_PHASES_PLAN.md` 次序 12；`config/token-atomic-override-allowlist.json`；`scripts/quality/audit-token-overrides.ts`

## 1. 门禁现状与裁决依据

TD-THM-01（generated token 被手写 variables 覆盖）的治理基础设施已于既有会话建成并接入 CI：

| 组件 | 状态 |
| --- | --- |
| `scripts/quality/audit-token-overrides.ts` 审计脚本 | 上线，报告五类关系（conflict / identical / only-handwritten / only-generated / allowlist stale） |
| `config/token-atomic-override-allowlist.json`（20 条目） | 覆盖全部当前 atomic 冲突，每条带 reason，stale=0 |
| `token:override-audit:gate`（`--fail-on-unallowlisted-atomic`） | 已接入 `ci:quality` 第 9 项，拦截新增未登记冲突 |

## 2. 20 处 atomic 冲突裁决（全部保留）

经逐条核实，20 处 atomic same-name 冲突均为产品 intentional override，保留且已在 allowlist 有理由登记：

| 族 | 数量 | Token | 裁决理由 |
| --- | --- | --- | --- |
| easing | 1 | `--ease-smooth` | 产品缓动曲线（emphasized-out），非 generated 默认 |
| radius | 6 | `--rounded-{sm,md,lg,xl,2xl,3xl}` | D2 产品半径梯（4–32px），与 Tailwind rem 梯不同 |
| shadow | 7 | `--shadow-{sm,md,lg,xl,2xl,inner}` | 产品投影柔和度偏好（单层/低不透明度） |
| z-index | 7 | `--z-{sticky,dropdown,modal-backdrop,modal,popover,tooltip,toast}` | 紧凑产品 z 梯（30–1080），非 Bootstrap 1000+ 标度 |

以上 20 处的统一迁移时机为 workbench migration（届时以 workbench design token 为 SSOT），当前强行对齐会破坏产品视觉规格。

## 3. 9 处 identical 冗余声明清理（已执行）

`src/css/foundation/variables.css` 中 9 个与 generated 值完全相同的语义色重复声明已删除（cascade 语义不变，generated 为唯一来源）：

`--color-primary / -primary-dark / -primary-darker / -accent / -accent-dark / -success / -warning / -error / -info`。

同时清理 2 处悬空小节标题（`/* ---- 主色 ---- */`、`/* ---- 次要色 ---- */`，其所属声明均已被删或另有主定义区）。文件 619 → 608 行。

## 4. 验收口径

清理后审计结果（`audit-token-overrides.ts --json`）：

| 指标 | 清理前 | 清理后 |
| --- | --- | --- |
| identical | 9 | 0 |
| atomic conflicts | 20 | 20（全 allowlisted） |
| unallowlisted atomic | 0 | 0 |
| allowlist stale | 0 | 0 |
| handwrittenRootCount | 269 | 260 |

`token:override-audit:gate` 在 ci:quality 内持续在线，identical 统计随 handwrittenRootCount 自然下降，无需更新基线文件（无基线文件，仅 gate 拦截）。
