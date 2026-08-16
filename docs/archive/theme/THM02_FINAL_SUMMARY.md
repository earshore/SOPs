# TD-THM-02 最终清零总结报告与下一阶段计划

> 作者：Manus AI · 日期：2026-08-14 · 报告基线 commit：`397cf098`（main）

## 一、任务全景回顾

TD-THM-02 针对 Tailwind `blue-/indigo-*` 硬编码（D6 缺陷族）发起的系统性收敛，起始于技术债看板初评时的 **1,193 处**（全库五色合计约 6,047 处）旧口径。整条路线遵循"大工程不做大迁"的纪律：按模块分 Phase、按文件族分批次、每批单独验证提交，并在 Phase B 上线了 `theme:modules:gate` 门禁，Phase C 后扩展为双车道（shell / modules）+ per-file 增量校验，把"只降不升"写进了 CI。

## 二、历史数据对比表

| 阶段 | 时间 | 动作 | sops | app_center | amz_hub | more | shell | all scope |
|---|---|---|---|---|---|---|---|---|
| 看板初评（Phase A） | 08-14 | 基线建立，零门禁 | — | — | — | — | gate 锁 13 | **1,193**（旧口径） |
| Phase B 评估 | 08-13 `a66d96c9` | top10 清单 268 处 + 模块门禁方案，口径校准 | 334 | — | 163 | 40 | 13 | **746**（模块实测） |
| Phase B 批次一 | 08-13 `994250aa` | sops 13 文件 269 处 + **modules gate 上线** | 334→65 | — | 163 | 40 | 13 | 481 |
| Phase B 批次二 | 08-13 `c51d2d66` | mature_phase 17 + TS 渲染器 37 处 | 52 | — | 146 | 23 | 13 | 423 |
| Phase C 第一步 | 08-14 `8b000cc6` | app_center 清零 2 处 + 无效类修复 3 处 | 52 | **0** | 146 | 23 | 13 | 421 |
| Phase C 第二步 | 08-14 `3df5ac51` | more 模块 7 文件 40 处清零 | 52 | 0 | 146 | **0** | 13 | 381 |
| Phase C 第三步 | 08-14 `c9a4db71` | amz_hub 15 文件 146 处清零 + 死选择器清理 25 行 | 52 | 0 | **0** | 0 | 13 | 354* |
| 清零批次一 | 08-14 `b1cb39a8` | safety 族 18 处 + **P1 门禁双改进**（per-file 校验 + shell 盲区纳管 13→37） | 65→47 | 0 | 0 | 0 | 37 | — |
| 清零批次二 | 08-14 `96f5c687` | backend 族 11 处（fba_shipping + inventory） | 47→36 | 0 | 0 | 0 | 37 | — |
| 清零批次三 | 08-14 `35748c36` | growth 族 34 处（含 3 处 opacity 变体 color-mix 方案） | 36→2 | 0 | 0 | 0 | 37 | 39 |
| 清零批次四 | 08-14 `6544c529` | 收官 2 处，**sops 车道 100% 闭环** | **0** | 0 | 0 | 0 | 37 | **37** |
| 全库兜底核查 | 08-14 `397cf098` | 5,826 处 hex + 8,689 处他族逐文件归类，三类登记保留 | 0 | 0 | 0 | 0 | 37 | 37（↓97%） |

\* 清零批次一前的 all scope 354 按当时口径，后续门禁扩容（shell lane 13→37）后口径统一。

## 三、全部提交记录（23 个 thm-02 提交，按时间正序）

| # | Commit | 类型 | 内容摘要 |
|---|---|---|---|
| 1 | `a66d96c9` | docs | Phase B 评估完成：top10 清单 268 处 + modules 门禁方案 |
| 2 | `994250aa` | fix | Phase B 批次一：sops 269 处迁移 + modules gate 门禁上线 |
| 3 | `2cdff369` | docs | 批次一卡面同步（334→65） |
| 4 | `c51d2d66` | fix | Phase B 批次二：mature_phase 17 + TS 渲染器 37 处 |
| 5 | `2a4cfe80` | docs | top10 清单全部完成卡面同步 |
| 6 | `8b000cc6` | fix | Phase C 第一步：app_center 清零 2 处 + 无效类修复 3 处 |
| 7 | `abf4034b` | docs | app_center 清零卡面同步 |
| 8 | `3df5ac51` | fix | Phase C 第二步：more 模块 7 文件 40 处清零 |
| 9 | `b943a81b` | docs | more 清零卡面同步 |
| 10 | `c9a4db71` | fix | Phase C 第三步：amz_hub 146 处清零 + 死选择器清理 25 行 |
| 11 | `6aa1939d` | docs | Phase C 收官卡面同步 |
| 12 | `b1cb39a8` | fix | 清零批次一：safety 族 18 处 + P1 门禁双改进 |
| 13 | `49ad41f7` | fix | 基线刷新：sops 65→47、shell 13→37 盲区纳管 |
| 14 | `71aaadc7` | docs | 批次一卡面同步 + 门禁改进说明 |
| 15 | `96f5c687` | fix | 清零批次二：backend 族 11 处 |
| 16 | `c774fea5` | fix | 基线刷新：sops 47→36 |
| 17 | `a8747dd6` | docs | 批次二卡面同步 |
| 18 | `35748c36` | fix | 清零批次三：growth 族 34 处 |
| 19 | `d0d18e30` | fix | 基线刷新：sops 36→2 |
| 20 | `3e861850` | docs | 批次三卡面同步 + megaMenu glass 色盘评审结论 |
| 21 | `6544c529` | fix | 清零批次四：收官 2 处，sops 车道 100% 闭环 |
| 22 | `340053d1` | fix | 基线刷新：sops 2→0 + bridge 同步 |
| 23 | `397cf098` | docs | 收官卡面同步 + 全库兜底核查结论登记 |

配套文档提交另有 4 个（路线文档 4 次次序 8 更新、`TD_THM_02_PHASE_B_PLAN.md` 落地 docs/）。

## 四、关键工程成果

**语义化映射体系**：建立并验证了四级语义映射表——wash 淡底（`--wash-blue/indigo`）、强调淡态（`--module-accent-soft`）、主强调（`--module-accent`）、边框（`--module-accent-border`）与文字（`--module-accent-text`），另含渐变桥接（`from/to-[var(--wash-*)]`）与 opacity 变体（`color-mix(in srgb, var(--module-accent) x%, transparent)`）两套扩展方案。暗底特例按模块先例使用 `text-[var(--color-indigo-300)]`。

**CI 防回退体系**：ci:quality 20 项门禁中两项新增且已验证有效——`theme:hardcode-baseline` 双车道 gate（per-file 增量校验封堵"增 N 删 N"对冲，shell lane 纳管 common/components 与 components/settings 盲区 24 处）与 `ci:ui-audit` 三连无头化（自拉起 vite preview、真实指针 hover、9 维卡面断言）。每批均执行 ci:quality + build + smoke 30/30 三重验证。

**量化收官**：all scope 1,193 → **37**（回落 97%），业务代码侧（sops + 三模块）100% 清零，遗留 37 处全在 shell lane 且全部被 gate 锁死。

## 五、下一阶段清零计划（剩余 37 处）

剩余分布：`OverviewRenderer.ts` 14 / `megaMenu.ts` 13 / `localDataCopy.ts` 7 / `llmSection.ts` 2 / `settingsModelStatus.ts` 1。按"先易后难、一次一类型"排定四批：

| 批次 | 范围 | 类型特征 | 方案 | 预估 |
|---|---|---|---|---|
| A | common 层 4 文件 24 处（OverviewRenderer / localDataCopy / llmSection / settingsModelStatus） | 普通 utility 硬编码（bg/text/border/ring/gradient），TS 动态渲染 | 四族映射表直接迁移，无暗底特例（均为白底 settings/概览上下文）；OverviewRenderer 2 处 `from-blue-500 to-blue-600` 渐变用 gradient 桥接 | 1 次提交 |
| B | megaMenu 决策落地 | 13 处（L301 `focus-visible:ring-indigo-500/40` 为独立键盘焦点环，L55-88/223-224 为 glass 主题色盘定义键） | L301 迁移为 `ring-[var(--module-accent)]/40` 等价语义；glass 色盘按评审结论**登记保留**（12 族对称色盘、dark 已由 bridge 保障）并写入看板卡面 | 1 次提交 |
| C | 基线与 bridge 刷新 | shell 37 → **12** | `theme:hardcode-baseline:update` + `generate:tokens` + 探针回归 | — |
| D | 收尾 | 全链验证 + 文档同步 | ci:quality + build + smoke 30/30；看板 TD-THM-02 标记"shell 车道收官（glass 色盘除外登记）" | — |

决策说明：megaMenu glass 色盘保留的理由不变——该色盘是 12 族对称的导航装饰系统，语义化需新增 48+ 条渐变 token 且需同步其余 60 处跨族代码，收益远低于成本；L301 的键盘焦点环属可访问性类，迁移无副作用。

## 六、遗留与长期项

sops 与三模块清零后，slate/accent 族的长期战仍在路线文档次序 8 记录中；arbitrary hex 可绕过 gate 的工程缝隙作为 P2 待办（建议后续为 gate 增加 arbitrary-hex lane，基线约 400+）；TD-THM-02 卡面与路线文档次序 8 均已同步收官状态。
