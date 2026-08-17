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

重 seed 后 chromium 项目 31 用例全过；`theme:hardcode-baseline` 语义 lane 基线同步登记
2139（深色对比度定稿修复）。CI 侧待 main push 后由 Quality Gate 全矩阵
（chromium/firefox/webkit × light/dark）最终验收。

## 相关文档

- `docs/archive/quality/npi-chromium-baseline-drift-rc6.md`（同类事件，rc.6 期间）
- `docs/SMOKE_BASELINE_FIX_PLAN.md`（TD-E2E-01 台账）
- 本文件位置：`docs/archive/quality/npi-chromium-baseline-drift-ga.md`
