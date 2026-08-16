# NPI chromium light 基线漂移事件记录（rc.6 期间，2026-08-16）

## 现象

Quality Gate run 31949435265（commit `79a8feb9`）中 `smoke e2e` 失败 1 例：
`tests/e2e/release-smoke.spec.ts:1606` — "NPI lifecycle table status colors render correctly in light and dark mode"
[chromium]。断言 `npi-table-status-colors-light region pixel diff`，received `0.03347`，threshold `0.001`。

## 定性过程

测试内的内容断言（5 行、保留/95天 文本、徽章语义）全部通过，徽章颜色肉眼一致。从 runner 产物
`smoke-e2e-report` 的 `test-failed-1.png`（1280×720 全视口）按 `captureStableRegion` 的 clip 逻辑
（x=0, width=976, height=631）重建，clip y=89 与基线逐位对齐后 pixelmatch diff 恰好等于
`0.03347048660725884`，证明 clip 几何未漂移，差异是像素内容变化。

垂直互相关显示 dy=0 即最优对齐（无整数像素整页位移），差异掩码强度低、散布于文字抗锯齿与浅色区
灰度，属光栅化级漂移，与 TD-E2E-01 处理过的 firefox 3.2% 漂移同量级。结论：非 rc.6 功能回归，
属于基线治理范畴的漂移事件。

## 处置

按 TD-E2E-01 既有机制 `UPDATE_SNAPSHOTS=1` 在 CI runner 上重 seed `npi-table-status-colors-light.png`
基线，写回 `docs/color-region-baselines/`，并登记本事件。

## 结果（2026-08-16）

Quality Gate run 31951014339（commit `7837c53a`）以 `UPDATE_SNAPSHOTS=1` 重 seed：
`smoke e2e` 93/93 通过、全门禁 10/10 成功；CI-minted 基线（artifact `color-region-baselines`
ID `9264835581`）已写回 docs 三引擎 12 份基线（light/dark × chromium/firefox/webkit × linux/win32），
light 基线 976×631 几何一致，内容为 runner 实际渲染。后续已移除一次性 env 开关。

## 相关文档

- `docs/SMOKE_BASELINE_FIX_PLAN.md`（TD-E2E-01 台账）
- `docs/TECH_DEBT_BOARD.md`（基线漂移条目引用本文件）
- 本文件位置：`docs/archive/quality/npi-chromium-baseline-drift-rc6.md`
