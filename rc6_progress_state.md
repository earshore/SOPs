# rc.6 发版进度状态（沙箱持久文件，压缩后恢复用）

## 关键 commit 时间线（main）
- 75192a67 rc.6 锚点 commit（Clear rc.6 release gates and sync docs）
- 1955e288 CHANGELOG 3.1.1-rc.6 章节
- 79a8feb9 CI fix：build job 装 Playwright chromium（Quality Gate 该 run 31949435265 smoke 失败 1 例）
- 05d49587 seed commit：test.yml smoke job UPDATE_SNAPSHOTS=1 + 上传 color-region-baselines artifact（该 run 被 cancel，因为后续 push concurrency cancel-in-progress）
- 64ebc815 docs 删除 worknotes/（in_progress，也会被 cancel）
- 7837c53a docs 归档 26 份专项文档 + 引用修复（pending → 将触发完整 Quality Gate）

## smoke 失败定性结论（已完成）
- npi-table-status-colors-light 3.35% 像素漂移 = 光栅化级（文字抗锯齿/灰度），dy=0 对齐，runner clip y=89 精确复现 0.03347048660725884；非回归。
- 处置：UPDATE_SNAPSHOTS=1 CI 重 seed + 事件记录 docs/archive/quality/npi-chromium-baseline-drift-rc6.md。
- 机制说明见 tests/e2e/release-smoke.spec.ts assertPixelDiff（TD-E2E-01 per-engine/per-OS 基线）。

## 剩余步骤
1. 等 7837c53a 的 Quality Gate 完成（全 job）；该 run 中 smoke job 会重 seed 基线并上传 artifact `color-region-baselines`。
2. 下载 artifact，取 npi-table-status-colors-light.png，commit 回 docs/color-region-baselines/。
3. 移除 test.yml 的一次性 UPDATE_SNAPSHOTS env 与基线上传 step，更新 docs/archive/quality/ 事件记录、TECH_DEBT_BOARD（smoke 基线漂移条目）。
4. 重新跑 Quality Gate 全绿（93/93）。
5. 打 annotated tag v3.1.1-rc.6（附发版说明），推送触发 release.yml：
   - release.yml 要求：tag 在 main 上、有一个成功的 test.yml run、`scripts/release/prepare-release.ts validate` 通过（版本对齐、CHANGELOG 章节、无 uncommitted changes）。
   - 用 `gh release create v3.1.1-rc.6 --prerelease`（release.yml 是 push tag 触发构建产物+发布，若 workflow 未跑可用 gh release 直接创建 prerelease）。
   - GitHub Latest 保持 v3.1.0（prerelease 不抢 Latest）。
6. 交付报告：收口规划 + 执行记录。

## 其他事实
- package.json version = 3.1.1-rc.6；CHANGELOG [3.1.1-rc.6] 章节已就绪（锚点 75192a67）。
- TECH_DEBT_BOARD Open 债务 29 项：TD-THM-01（P2，C1 完成 48→46）、TD-THM-02（P3 closed-verified）、TD-CMP-01..06、TD-CMP-BTN/DOC-UPDATE/MDL、TD-OPS-01/02、TD-REL-01、TD-SET-*、TD-TEST-*、TD-DOC-*。
- docs 顶层现为 33 份文档（归档后）。
- 本地沙箱 chromium 几何与 runner 差 80px（本地 711 vs runner 631），不影响 CI。
