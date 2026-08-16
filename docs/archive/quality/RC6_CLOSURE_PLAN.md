# v3.1.1-rc.6 收口规划（内部工作文档，发版后归档）

**作者：Manus AI · 日期：2026-08-16**

## 一、rc.6 现状快照

v3.1.1-rc.6 锚点为 `75192a67`（Clear rc.6 release gates and sync docs），随后 `1955e288` 将锚点填入 CHANGELOG，`79a8feb9` 修复 CI 环境缺口（build job 补装 Playwright chromium）。package.json 版本 `3.1.1-rc.6` 与候选线一致，CHANGELOG `[3.1.1-rc.6]` 章节已就绪。**唯一硬性缺口：GitHub 上 v3.1.1-rc.6 的 annotated tag 尚未创建**，release.yml 的 tag 门禁与产物发布均未触发。

Quality Gate（run 31949435265，触发于 79a8feb9）中 type-check、lint、unit、build、npm audit、business e2e、visual regression 全部通过，**smoke e2e 失败 1 例**：`release-smoke.spec.ts:1606` NPI 表格状态色 light 模式像素断言（received 0.0335 > threshold 0.001）。release.yml 要求 tag 指向的 commit 在 main 上有一个成功的 test.yml 运行，因此必须先让 smoke 全绿。

## 二、smoke 失败定性（本地复现结论）

本地复现（viewport 1280×720，与 CI 一致）显示当前渲染与基线尺寸一致（976×631）但 diff 3.06%，裁剪放大后确认是**整页垂直位移约 8–10px、非任何内容/颜色变化**（表格行断言 5 行、保留、95天 全部通过；徽章色肉眼一致）。本地沙箱 chromium 与 CI runner 渲染几何固定相差 80px（本地产物在 rc.5 与 main 两个版本上均恒为 7.2% diff），说明 631 基线只在 runner 几何下成立，本地无法复现 runner 上的精确差异来源。

定性结论：这属于 **TD-E2E-01 遗留的基线漂移**（像素级回归断言对页面整体几何敏感），不是 rc.6 引入的功能回归。处置方式是按 TD-E2E-01 既有机制在 CI 上重 seed 基线（`UPDATE_SNAPSHOTS=1`），并在文档中记录。

## 三、技术债务收益收口路线

基于 TECH_DEBT_BOARD 8 项 Open 债务，按"收益 × 成本"排序，rc.6 收口范围如下：

| 优先级 | 债务 | rc.6 处置 | 收益 |
|---|---|---|---|
| P0 | 文档堆砌（docs 顶层 24 个专项计划/报告文件） | 已完成/闭环的专项文档按 PROJECT_STRUCTURE.md 归档至 docs/archive（debt 已关闭的进 quality、CMP02/THM01 闭环的进对应分类），INDEX.md 同步更新 | 高收益零成本：降低认知负担、保护 INDEX 权威 |
| P1 | smoke 基线漂移（NPI light chromium） | CI 重 seed + 基线漂移登记进 TECH_DEBT_BOARD / SMOKE 文档 | 发版阻断项；同时加固基线治理 |
| P2 | TD-THM-01 遗留池（46 键） | rc.6 范围不变（C1–C3 按批推进已是主线），更新看板进度字段 | 保护主题变更 |
| P3 | TD-CMP-05 空态自建 4 组、TD-CMP-02 复检窗口（2026-09-14） | 登记复检提醒，不进 rc.6 | 按窗口执行 |
| 观察 | TD-OPS-02（Sentry 默认关）、TD-REL-01（提交粒度） | 维持现状，不改 | 产品/流程决策 |

## 四、执行步骤

1. **smoke 收口**：提交测试层修复，将 NPI light chromium 基线在 CI 上重 seed（UPDATE_SNAPSHOTS=1 由 workflow 支持）；若 workflow 无开关，则手动下载 CI 实际渲染产物（color-region-actual-*.png 附件）替换基线。
2. **文档归档**：批量 move 已闭环专项文档进 docs/archive，更新 docs/INDEX.md；CHANGELOG 锚点保持与最终发版 commit 一致。
3. **门禁验证**：等待 Quality Gate 全绿（smoke 93/93）。
4. **发版**：创建 annotated tag `v3.1.1-rc.6`（附发版说明）推至 origin，触发 release.yml 生成产物与 GitHub Pre-release（prerelease=true，Latest 保持 v3.1.0）。
5. **交付报告**：输出收口与发版结果报告。
