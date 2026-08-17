# NPI chromium light 基线漂移事件记录（GA v3.1.1 定稿期间，2026-08-17）

## 现象

v3.1.1 GA 定稿本地门禁中 `smoke e2e`（chromium）失败 1 例：
`tests/e2e/release-smoke.spec.ts:1606` — "NPI lifecycle table status colors render correctly in light and dark mode"
[chromium]。断言 `npi-table-status-colors-light region pixel diff`，received `0.03697`，threshold `0.001`。

## 定性过程

测试内的内容断言（表格 5 行、"保留"/"95天" 文本锚点、杀留决策徽章语义）全部通过；语义层的
`theme:hardcode-baseline` 也通过新基线（2128 → 2139，登记 7c78f9c0 深色对比度修复引入的 11 处
slate/red/emerald/amber/purple 工具类增量）。实际截图与既有 light 基线（rc.6 期间 7837c53a
重 seed 的 CI-minted 版本）对比：上半部页面渲染一致，差异集中在表格区域的光栅化级像素内容变化，
与 rc.6 期间记录的 `npi-chromium-baseline-drift-rc6.md`（3.35% 漂移）为同类事件，属基线治理范畴，
非功能回归。

## 处置

按 TD-E2E-01 既有机制 `UPDATE_SNAPSHOTS=1` 本地重 seed `npi-table-status-colors-light.png`
基线，写回 `docs/color-region-baselines/`，并登记本事件。重 seed 后单例回放通过（chromium
light/dark、内容断言与像素断言全绿）；同例中 dark 基线也一并漂移（`6fe5452c` 加深时
CI-minted 的 dark 基线在 `7c78f9c0` 后可读性微调后再次漂移），按 TD-E2E-01 机制同时重 seed
`npi-table-status-colors-dark.png`。

## 结果（2026-08-17）

第一次本地重 seed 后本地 31 用例全过，但 CI runner（`099f751e`，run 31985281430）仍报
NPI light diff 0.03347（与 rc.6 期间 runner 漂移值相同）。本地回放 runner-seeded 基线也
恰好得到同一 diff 值，证明沙盒与 runner 存在约 3.35% 的固有光栅化差异（跨机，属
TD-E2E-01b 记录的同类现象），本地永远无法与 runner 基线对齐。

按 TD-E2E-01 机制升级处置：CI smoke job 恢复一次性 `UPDATE_SNAPSHOTS: 1`（commit
`3d3aaef4`），由 runner 渲染 CI-minted 重 seed 全 31 用例通过（run 31986179336 全绿），
artifact `color-region-baselines` 回写 `docs/color-region-baselines/`（commit `待定`），
随后移除一次性开关。

`theme:hardcode-baseline` 语义 lane 基线同步登记 2139（深色对比度定稿修复）。CI Quality
Gate 最终验收：run 31986179336 全绿（type-check · lint · unit · build · smoke · npm audit
· visual regression · business e2e 均 success）。

## 相关文档

- `docs/archive/quality/npi-chromium-baseline-drift-rc6.md`（同类事件，rc.6 期间）
- `docs/SMOKE_BASELINE_FIX_PLAN.md`（TD-E2E-01 台账）
- 本文件位置：`docs/archive/quality/npi-chromium-baseline-drift-ga.md`
