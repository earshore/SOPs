# NPI smoke 失败分析（2026-08-16）

## 现象
- Quality Gate run 31949435265（commit 79a8feb9）：smoke e2e 失败 1 例。
- 失败用例：release-smoke.spec.ts:1606 "NPI lifecycle table status colors render correctly in light and dark mode" [chromium]。
- 错误：npi-table-status-colors-light region pixel diff，received 0.03347 > threshold 0.001。

## 本地复现
- 基线 docs/color-region-baselines/npi-table-status-colors-light.png：976×631。
- 当前渲染 captureStableRegion：976×711（高度 +80px）。
- 侧边对比图 /tmp/npi_compare.png（左=基线，右=当前）：
  - 页面结构、NPI 表格、徽章颜色肉眼一致（状态色 badge 未见视觉差异）。
  - 高度差源于 NPI 页面内"流程卡片"区域渲染行数/布局高度变化 —— 需进一步确认是内容变化还是布局差异。
- 差异比 7.2%（高度归一化后），原 CI 断言用相同 clip 高度导致像素差 3.35%。

## 背景
- TD-E2E-01（SMOKE_BASELINE_FIX_PLAN）结论：NPI lifecycle 像素断言 firefox/webkit 基线尺寸不匹配 + webkit 时序，已升级为 per-engine 基线 6 组，验收 93/93 全绿（rc.5 锚点前）。
- rc.6 期间改动（v3.1.1-rc.5..HEAD）：C1-THM01 零消费归档（a75e6aec）、B5-THM01 动效契约（64e2596a）、DARKFIX（89e31b80）、NPI mockData/index wash-blue → #eff6ff 内联（TD-THM01 消费点迁移）——该改动是 value 等价替换，light 基线值本应一致。
- 高度差 631→711 说明页面元素高度变了 80px，可能原因是某模块布局变化（如 NPI 页内"适用站/人工确…"列或卡片内容）——需 grep NPI 页布局提交。

## 精确定位（第二轮）
- 基线 npi-table-status-colors-light.png（976×631）最后更新于 9724bbbf（rc.5-B，2026-08-15 23:35 UTC），当时 seed 验证通过。
- 本地在 main（79a8feb9）构建产物下渲染高度为 711；**且 rc.5 commit（c017af8e）产物在本地渲染也是 711 高**——本地沙箱 chromium（v1228 headless shell）与 CI runner 的 chromium 几何不同（本地多 80px）。
- 但 CI runner（79a8feb9）也失败（diff 3.35% > 0.1%）：CI runner 上基线 631 成立与否取决于 runner 字体/几何；失败时 diff 0.0335 说明 CI 上当前渲染与 631 基线确实有 3.35% 像素差——即 rc.6 提交确实改变了 NPI 页渲染几何或内容（比本地观察的更小，因为 runner 几何差异部分抵消/放大）。
- rc.6 相关提交：166a65aa(S2) e44e4b94(DARKFIX) 2fdac5dd(dark修复) 31d7f354(B3) b1949f2f(B4归档) 9724bbbf(B5,基线更新) ce25633b(badge dark) 3d95121b(per-OS) 89e31b80(DARKFIX-CHAIN) 64e2596a(B5动效) a75e6aec(C1) 75192a67(rc.6 门禁)。
- 高度 631→711 变化（+80px = 5 行 × 16px 行高？）需逐提交二分定位。

## 候选处置（待决定）
1. 若是真实但无害的布局增长 → 重新 seed 基线（UPDATE_SNAPSHOTS=1 或手动重截图），文档记录。
2. 若发现渲染缺陷 → 修复后重 seed。
3. release.yml 要求：tag commit 上必须有一个成功的 Quality Gate run → 必须先让 smoke 全绿。
