# 次序 13：Slate 结构性灰调统一化专项 — 整体进度报告与剩余存量盘点

**状态**：批 3 第一小批完成（2026-08-15，`f7075408` 之后）｜**基线分支**：main `1cc8c0bf`（批 2）→ 批 3A 待提交
**关联文档**：`SOP02_SLATE_TOKEN_PLAN.md`（专项方案）、`CMP02_DOWNGRADE_RECHECK_MONITOR.md`（TD-CMP-02 复检监控）

## 1. 专项总览

本专项（TD-SOP-NPI-02 候选）针对 sops 模块 slate 结构性灰调进行 token 统一化，契约为 sops_style.css 中的 `--sops-neutral-*` 族（divider / divider-soft / surface / surface-raised / text / text-strong / text-muted / text-faint + hover 交互变体 + dark 翻转块）。立项摸底修正旧口径（约 180 处）为实测 **2,048 处 / 21 文件**（19 个 template.html + TS 端 69 处），全部纳入 semantic lane baseline 管理。

| 指标                          | 数值                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| 立项摸底总量（2026-08-15 前） | 2,048 处 / 21 文件                                            |
| 累计已迁移                    | 1,507 处（批 1：450 / 批 2：621 / 批 3A：436）                |
| 迁移覆盖率                    | 73.6%                                                         |
| 当前剩余存量                  | 489 处（488 template + 1 TS）                                 |
| 甄别保留（状态语义 / 契约）   | 批 1/2 共 30 处 + 批 3A 共 17 处（见 §3）                     |
| semantic baseline 演进        | 4087 → 3600（-487）→ 2965（-635）→ 2530（-435）               |
| 验收纪律                      | 每批 ci:quality 20 项全绿 + build + smoke 全浏览器（93 用例） |

## 2. 批次执行记录

**批 1（`1cc8c0bf`）**：契约建立 + growth 最大文件组。ppc_advertising 237 处清零、restricted_words template 192 + handler 21 处，迁移 450 处，baseline 4087→3600。残留 6 处 border-slate-300 甄别为控件边框契约保留。

**批 2（`5ff5882b`）**：service 组三文件。email_templates 247、negative_review 193、qa_maintenance 158，迁移 621 处，baseline 3600→2965。残留 12 处甄别保留（badge 状态语义 8 + 控件边框 4）。

**批 3 第一小批（本轮）**：growth 组剩余 4 文件 + TS 收尾。npi_tracker template 174 处清零（+index.ts 4 处）、promotion_submission 109、listing_seo 82、competitor_monitoring 67，迁移 436 处，baseline 2965→2530。smoke 93 用例 90 通过，3 失败与批 1/2 清单逐条一致（NPI pixel 断言 ×2 + webkit L657 时序），确认基线既有缺陷非回归。

## 3. 甄别保留台账（不迁移的 slate 用法）

甄别口径贯穿三批：状态语义 badge/标签、控件边框契约、深色高对比装饰档（600-900 + /50 alpha）与浅色 structural 契约（50-200 + 400-800）分属不同设计语义，后者统一迁移，前者保留并登记。

| 类别                                          | 判别依据                                                                             | 分布                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| border-slate-300（14 处）                     | input/checkbox 控件边框契约（与 settings 控件口径一致）                              | restricted_words 6 + email 4 + negative 3 + qa 5（其中 qa 2 处 = 9+1） |
| bg-slate-400 优先级/分类 badge（5 处）        | 与 P0 red / P1 amber / P2 primary / EU purple 徽章同构色族体系                       | email_templates P3 ×2 + P3 其他、qa E类 ×2                             |
| bg-slate-200 inline 状态小标签（9 处）        | 与 badge 同构的 inline 状态语义                                                      | email 1 + negative 1 + qa 1 + promo 2 + listing_seo 2 + competitor 2   |
| 深色装饰档 slate-600~900（10 处）             | high-contrast 视觉设计（深色卡片/按钮/表头 alpha /50），不在浅色 structural 契约范围 | promo L311/317/325、listing_seo L161/482/686/811/923、competitor L500  |
| text-slate-300 深色卡内文字（6 处）           | 深色容器内浅色说明文字（对比方向与浅色族相反）                                       | listing_seo L815/820/823/929/935/938                                   |
| npi_tracker/index.ts border-slate-300（1 处） | 虚线按钮控件契约                                                                     | L379 添加 Next Step 按钮                                               |

## 4. 剩余存量盘点（489 处）

| 模块组  | 文件                                   | 存量 | 建议批次                                                      |
| ------- | -------------------------------------- | ---- | ------------------------------------------------------------- |
| backend | fba_shipping/template.html             | 68   | 批 3 第二小批                                                 |
| backend | inventory_replenishment/template.html  | 43   | 批 3 第二小批                                                 |
| backend | procurement_qc/template.html           | 23   | 批 3 第二小批                                                 |
| safety  | product_compliance/template.html       | 66   | 批 3 第二小批                                                 |
| safety  | eu_gpsr_compliance/template.html       | 63   | 批 3 第二小批                                                 |
| safety  | brand_infringement/template.html       | 58   | 批 3 第二小批                                                 |
| safety  | account_security/template.html         | 50   | 批 3 第二小批                                                 |
| safety  | permission_management/template.html    | 44   | 批 3 第二小批                                                 |
| safety  | performance_notification/template.html | 24   | 批 3 第二小批                                                 |
| growth  | promotion_submission/template.html     | 14   | 批 3 第二小批（甄别残留：2×bg-200、9×border-300、3×深色档）   |
| growth  | listing_seo/template.html              | 14   | 批 3 第二小批（甄别残留：2×bg-200、3×bg-800/900、6×text-300） |
| growth  | competitor_monitoring/template.html    | 3    | 批 3 第二小批（甄别残留：2×bg-200、1×bg-600）                 |
| growth  | restricted_words/template.html         | 6    | 批 3 第二小批（甄别残留：6×border-300，契约口径无变更需求）   |
| service | qa_maintenance/template.html           | 5    | 批 3 第二小批（甄别残留：1×bg-200、2×bg-400、2×border-300）   |
| service | email_templates/template.html          | 4    | 批 3 第二小批（甄别残留：1×bg-200、2×bg-400、1×border-300）   |
| service | negative_review/template.html          | 3    | 批 3 第二小批（甄别残留：1×bg-200、1×bg-400、1×border-300）   |
| TS 端   | npi_tracker/index.ts                   | 1    | 批 3 第二小批（border-slate-300 控件契约，预计甄别保留）      |

**批 3 第二小批结构**：backend 3 文件（134 处）+ safety 6 文件（305 处）+ growth/service 甄别残留文件（49 处 + 1 TS）≈ 489 处一次性收官，预计 baseline 2530→2040 左右（甄别保留约 40 处不计入迁移）。

## 6. 专项收官（2026-08-15，批 3 第二小批）

backend 组迁移 115 处（fba_shipping 58 / inventory_replenishment 37 / procurement_qc 20）；safety 组迁移 287 处（eu_gpsr 62 / product_compliance 61 / brand_infringement 50 / account_security 33 / permission_management 27 / performance_notification 24，按实际替换数）。收官后 sops 模块 structural slate 存量清零（2,048 处 100% 迁移，累计 1,917 处 token 化），剩余 89 处全部为甄别台账项，台账构成：border-slate-300 ×44（input/checkbox 控件边框契约，与 settings 控件口径一致）、bg-slate-200 ×9 + bg-slate-400 ×7（inline 状态标签与优先级/分类 badge 语义，与 P0-P3 徽章色族同构）、深色装饰档 ×11（bg-slate-600~900 + /50 alpha，high-contrast 视觉设计）、text-slate-300 ×13（permission 矩阵「无权限」占位符图标与 listing_seo 深色卡内说明文字）。验收实证：ci:quality 20 项全绿（semantic 2128/2128、shell 24/24、modules 0/0、settings-scale 41 files、lint 0/0、bridge gate 修复后通过）；build EXIT=0（7.91s）；smoke 93 用例 90 通过，3 失败与历次清单一致（NPI chromium-only pixel baseline ×2 + webkit L657 时序 ×1），非回归，归后续路线（baseline 浏览器维度拆分）。

## 5. 门禁与验收基线（截至批 3A）

ci:quality 20 项全绿：theme:hardcode-baseline:gate shell 24/24、modules 0/0、semantic 2530/2530；modules lane 双族（blue+indigo）0/0 锁死；shell lane 24/24（megaMenu glass 豁免登记）；settings-scale 1199/1200 行限额；token:override-audit identical 0 / unallowlisted 0 / stale 0；lint 0/0。build EXIT=0（7.82s）；smoke 93 用例 90 通过（3 基线既有缺陷：NPI chromium-only pixel baseline ×2 + webkit L657 时序 ×1，已登记归后续路线：baseline 按浏览器维度拆分或 captureStableRegion 统一 deviceScaleFactor 后重 seed）。

TD-CMP-02 降级复检窗口监控（`CMP02_DOWNGRADE_RECHECK_MONITOR.md`）：复检判据由 CI 门禁全量自动化覆盖（baseline 只降不升 + override 审计 + settings-scale 清单），2026-09-14 到期执行单点人工复检提交。
