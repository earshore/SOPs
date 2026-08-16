# v3.1.1-rc.6 发版状态快照（2026-08-16）

## 事实确认
- 用户目标："rc.6 发版还未处理完毕的工作" → 当前候选线 = **v3.1.1-rc.6**（README/RELEASE_POLICY 均指向该线），仓库 HEAD main @ 79a8feb9。
- rc.6 锚点 commit：`75192a67`（rc.6 bump + 门禁修复 + 文档同步）；`1955e288` 补录锚点到 CHANGELOG；`79a8feb9` 修复 CI（build job 装 Playwright chromium，此前 ci:ui-audit 在 CI 必挂）。
- **GitHub 上 v3.1.1-rc.6 的 tag 尚未创建**（本地和远程均无），因此 release.yml 的 `push: tags` 未触发，release workflow 由 push 触发即失败（无 tag → tag 校验抛错 0s 失败，属于预期）。
- CHANGELOG 已有 [3.1.1-rc.6] 章节，锚点 commit 已填为 75192a67（注意：1955e288 之后还有 79a8feb9 CI 修复提交，锚点或应更新为最新 commit，需决定）。
- package.json version = 3.1.1-rc.6，与候选线一致。
- README 已写"当前 Pre-release 候选 v3.1.1-rc.6"；RELEASE_POLICY 已登记。

## 当前 Quality Gate（run 31949435265，触发于 79a8feb9）
- in_progress 中（截至快照）：type-check/lint/unit/build/npm audit = success；smoke e2e、business e2e、visual regression、performance 待出结果。
- 前一次 run（1955e288，31948872645）build 失败：ci:ui-audit 链需要 chromium，build job 无浏览器 → 已由 79a8feb9 修复（npx playwright install --with-deps chromium）。

## release.yml 发布条件（必须全部满足才能发 release）
1. push 带 tag `v3.1.1-rc.6`（annotated，指向 HEAD commit）。
2. 该 commit 在 main 上有一个成功的 test.yml Quality Gate run（gh run list --workflow test.yml --commit $tagSha）。
3. `npx tsx scripts/release/prepare-release.ts validate --tag v3.1.1-rc.6` 通过：
   - package.json version == 3.1.1-rc.6（已满足）
   - CHANGELOG 有 ## [3.1.1-rc.6] 章节（已满足）
   - annotated tag 指向 HEAD（待创建）
4. CHANGELOG 章节需完整包含变更内容（notes/package 会引用该节）。

## rc.6 CHANGELOG 章节内容概要
- Changed: CI 供应链 SHA pin 5 处 action；release.yml 生产探针 job；THM01 归档后测试契约同步（pc-design-token-css 6 例 / pc-motion-css 2 例 / themeConfig 2 例 / aiAnalysisPanelCurrent 3 例）；vite.config.js 未用导入清理。
- Fixed: aiAnalysisService.test.ts 补 MASTER_ANALYSIS_SYSTEM_PROMPT mock（e5a4e4f2 缺 mock 导致 runAIAnalysis 4+panel 2 例 0 调用）；a11y 断言同步（scraper/ui-p1-10）；README/RELEASE_POLICY 元数据同步至 rc.6。
- 门禁验收: type-check 0 error · lint 0/0 · vitest 全过 · build 零错 · 覆盖率达标。
- 锚点 commit: 75192a67。

## 待办
1. 等待 Quality Gate run 31949435265 全绿（等 smoke/visual/business 出结果）。
2. 决定锚点 commit：CI 修复 79a8feb9 也应计入 rc.6（CI 缺陷修复属于发版内容），更新 CHANGELOG 锚点为 79a8feb9（或保持 75192a67 —— 需查看 CI-QUALITY-GATES.md 与既有惯例）。
3. 创建 annotated tag v3.1.1-rc.6 指向发版 commit。
4. 若 GitHub API 无权限直接创建 release，可用 workflow_dispatch 的 release.yml publish，或 gh release create。
5. 文档清理：docs 顶层堆砌的 CMP02/THM01/SMOKE 等专项计划文档是否需要归档（docs/archive）——按 PROJECT_STRUCTURE.md 清理规则判断。

## 技术债务看板（TECH_DEBT_BOARD.md）Open 项（8 条）
| ID | 领域 | 状态 | 优先级 |
|---|---|---|---|
| TD-THM-01 | 主题 token | 部分消化：遗留池 66→48（C1 完成），C2 wash-indigo/z-overlay/color-bg-selected/color-white 甄别 → C3 surface/border 专项（待批 3 dark 翻转决策） | 待核 |
| TD-THM-02 | 主题 blue/indigo 硬编码 | Phase C 完成，残余 24 处全在 shell megaMenu glass 色盘（GUI014 豁免登记） | P3 |
| TD-CMP-04 | Badge | 已关闭（统一契约建立，门禁 20/20 全绿） | 已关 |
| TD-CMP-05 | 卡片/空态 | 收敛首轮完成，剩余 4 组自建保留 | P2→P3 |
| TD-CMP-06 | UI 审计 | 无头化完成入 CI；smoke 基线缺陷已闭环（TD-E2E-01，per-engine 基线 6 组） | 门禁守护 |
| TD-CMP-02 | 表单 | 摸底+批次1/2完成（focus-ring 契约固化、9.1 空壳瘦身 -975 行），P3（30 天复检窗口至 2026-09-14） | P3 |
| TD-OPS-02 | 可观测 | Sentry 默认关（产品决策） | P2 |
| TD-REL-01 | 发布 | main 提交粒度碎，review 成本高 | P3 |

## 收益排序观察（用于收口规划）
- 高收益-低成本：TD-THM-01 C2/C3 收尾（token 台账收敛，保护后续 theme 变更）、docs 归档清理（降低认知负担）。
- 高收益-中成本：TD-CMP-05 剩余空态自建组评估、TD-CMP-02 复检计划。
- 低收益/决策项：TD-OPS-02（产品决策维持）、TD-REL-01（流程改进，非阻塞）。

## 其他发现
- docs 顶层存在大量专项文档：CMP02_*（7 个）、THM01_*（4 个）、DEBT_*（3 个）、SMOKE_BASELINE_FIX_PLAN.md、REMAINING_DEBT_BLOCKERS_OPTIMIZATION.md、TD_THM_02_PHASE_B_PLAN.md、NEXT_PHASES_PLAN.md 等——PROJECT_STRUCTURE.md 规定"阶段性计划、一次性审计和历史执行记录"应进 docs/archive（只读）。发版前文档收口需整理这些文档（归档已完成/过时项）。
- 最新 GitHub release = v3.1.1-rc.5（2026-08-15）；Latest = v3.1.0 GA。
- 上一 GA = v3.0.12，当前 GA = v3.1.0，回滚基线 = v3.1.0。
