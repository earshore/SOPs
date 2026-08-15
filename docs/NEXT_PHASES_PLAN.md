# 后续收紧规划（v3.1.1-rc.3 发布后）

**制定日期**：2026-08-15
**前置里程碑**：v3.1.1-rc.3 已发布（pre-release，3 产物归档 SHA256）；TD-CMP-02 批次 4B 三批收官（semantic baseline 4282→4087）；TD-THM-02 100% 清零闭环；执行纪律：每次收紧满足 `ci:quality` 全绿 + `build` 成功 + `smoke` 通过，看板与代码冲突时以代码实测为准。

## 一、当前看板状态快照

| 卡片            | 优先级 | 状态                                                                                                                                                                         |
| --------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD-THM-02       | P1     | 100% 清零闭环 + gate 在线「只降不升」，**建议降级 P3**                                                                                                                       |
| TD-CMP-02       | P2     | 批次 1-3 + 4A（登记关闭）+ 4B（三批收官）完成；**体系 A 闭环（`4265966d`，2026-08-15）：CSS 契约全量 token 化，112 处/14 文件 HTML 类消费属 DOM 契约（保留类名、语义下沉）** |
| TD-THM-01       | P2     | generated token 被手写 variables 覆盖 20 处，实测修正进行中                                                                                                                  |
| TD-OPS-02       | P2     | Sentry 默认关（产品决策，保持）                                                                                                                                              |
| TD-REL-01       | P3     | RC 前 notes 整理（CHANGELOG 已覆盖）                                                                                                                                         |
| TD-CMP-04/05/06 | P2→P3  | 已收敛完成                                                                                                                                                                   |

## 二、后续次序规划（建议）

### 次序 10：TD-THM-02 降级 + 豁免复审（**已完成**，`44739732`）

TD-THM-02 已是全库最干净的项（modules 576→48 降 92%，清零批次一至四 + 收尾 A/B，per-file 双锁 + S8 边界压测收口）。建议：看板降级 P1→P3，附清零实绩；shell lane glass 色盘 24 处豁免按 `GUI014_GLASS_COLOR_PALETTE.md` 做一次复审登记（专项评审结论已立，复审确认无新增豁免即可冻结）。

### 次序 11：TD-CMP-02 体系 A 收敛（**已完成**，`4265966d` + `CMP02_SYSTEM_A_PHASE1_PLAN.md`）

settings-control CSS 契约全量 token 化：systemSettings.css 根 token 块新增 --settings-control-shadow/-transition（200ms）/-btn-secondary 组（160ms）单一登记点；主块 hover/focus/disabled/--sm/.settings-label 全 token 链（批次 3 已覆盖）；sections 残留 .settings-api-path-trigger 契约收敛；5 处 sections 残留选择器（llmSection 2 + networkSection 3）甄别为 height/font-size/line-height 布局契约（model-select 2.125rem、proxy-form --field-height 行高对齐），非自建值，保留；112 处/14 文件 HTML 类消费属 DOM 契约（保留类名、语义下沉，与 TD-THM-02 Phase B 模式一致）。settings-scale 限额守住（1199/1200）；验收 ci:quality 20 项全绿（semantic 4087/4087 · modules 0/0 · shell 24/24）+ build EXIT=0 + smoke 31/31。

### 次序 12：TD-THM-01 覆盖冲突收敛（**已完成**，`fd4463d0`）

generated token 被手写 variables 覆盖 20 处（D1 类），逐个裁决：覆盖方 token 化 or 生成方扩容。需先按文件族摸底裁决表，再分批迁移，模式同 TD-THM-02。。**执行结论（`fd4463d0`）**：审计摸底确认 20 处 atomic 冲突全部为产品 intentional override（easing 1 / radius 6 / shadow 7 / z-index 7），已在 `config/token-atomic-override-allowlist.json` 登记理由，统一迁移时机为 workbench migration，故裁决全部保留；同步清理 9 处与 generated 值完全相同的语义色冗余声明（identical 9→0），收敛实绩见 `THM01_CONVERGENCE.md`。。**执行结论（`fd4463d0`）**：审计摸底确认 20 处 atomic 冲突全部为产品 intentional override（easing 1 / radius 6 / shadow 7 / z-index 7），已在 `config/token-atomic-override-allowlist.json` 登记理由，统一迁移时机为 workbench migration，故裁决全部保留；同步清理 9 处与 generated 值完全相同的语义色冗余声明（identical 9→0），收敛实绩见 `THM01_CONVERGENCE.md`。

### 次序 13：slate 结构性灰调统一化（**已立项**，`SOP02_SLATE_TOKEN_PLAN.md`，2026-08-15）

立项摸底修正旧口径（约 180 处）：实测全 sops 模块 slate 族 **2,048 处 / 21 文件**（19 个 template.html + restrictedWordsHandler.ts 45 + index.ts ×2），全部在 semantic lane baseline 4087 内。专项方案：`--sops-neutral-*` 五档契约族（divider/surface/text/text-muted/text-faint + dark 翻转）在 sops_style.css 建立，按 file-group 分 4 批迁移（批 1 契约+ppc_advertising/restricted_words ≈430 处起步，批 2 service 组 ≈620，批 3 剩余 9 文件 ≈700 分两小批，批 4 TS 端收尾 ≈57）。甄别规则：纯结构性上下文迁移至 token，承担状态语义的 slate 用法甄别保留记表。每批独立验证提交（ci:quality + build + smoke + baseline 刷新双锁）；门禁兼容（只降不升方向，模式复用 CMP-02 4B（-195 零回退实证）。**批 1 已完成（2026-08-15）**：契约族 + growth 最大文件组迁移 450 处（ppc_advertising 237 清零、restricted_words 192 + handler 21），semantic baseline 4087→3600（-487），验收全绿（ci:quality 20 项 / build / smoke 90/93，3 例失败为 NPI pixel 断言的 chromium-only 基线既有缺陷，非回归，归后续路线）。

## 三、门禁体系后续动作

| 动作                   | 触发条件                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| TD-THM-02 降级 P3      | 次序 10 完成后更新看板与路线                                                                                  |
| TD-CMP-02 降级 P3      | 次序 11 体系 A 闭环（`4265966d`）已满足触发条件，看板同步更新为“体系 A 闭环”；是否执行 P2→P3 降级由产品侧确认 |
| 自动化发布流水线回归   | GitHub Actions 月度限额恢复后（v3.1.1-rc.3 为手动发布）                                                       |
| semantic lane 扩容评审 | 次序 13 已立项（2026-08-15）；每批迁移后刷新 baseline 保持双锁，专项收官时评审 slate 族是否继续保留于锁 lane  |

## 四、风险与纪律

批次 4B 全程已验证「契约登记 → 分批迁移 → 每批独立验证提交」的模式在语义色 lane 上有效（-195 且零回退），后续次序沿用同一纪律（次序 11 已完成，4265966d）。settings-scale 1200 行限额是次序 11 的主要物理约束，批 1-1 通过注释合并守住 1199/1200（新增 4 登记 token）；剩余 TD-THM-01（20 处 intentional override 统一迁移时机为 workbench migration）与次序 13 slate 专项按既定时机推进。
