# TD-CMP-02 体系 A 第一阶段实施计划（settings-control 收敛）

**日期**：2026-08-15 · **依据**：`CMP02_FORM_DEBT_PLAN.md` §2.1 + 批次 3 交付（`b0d9358c`）+ 看板 TD-CMP-02 行现状

## 1. 现状盘点（主 HEAD `aa046943` 实测）

体系 A 定义为 settings-control 类引用 **112 处 / 14 文件**（11 个 settings section HTML + `systemSettings.html`）。批次 3 已将尺寸与焦点契约下沉（6 个 `--settings-control-*` 尺寸 token + focus-ring 合并），当前剩余工作量集中在三个层面：

| 层面                      | 残留内容                                                                                      | 规模    | 状态                             |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------- | -------------------------------- |
| CSS 选择器残留            | `llmSection.css` 2 处、`networkSection.css` 3 处                                              | 5 处    | 待迁移/合并                      |
| systemSettings.css 自建值 | `.settings-control` box-shadow 内联值、transition 时间常量、select 的 `padding-right: 2.5rem` | 约 5 处 | 待 token 化或裁决保留            |
| sections CSS 非 token 值  | appearance 36 / data 48 / diagnostics 78 / llm 76 / network 76 / toolStrategy 78              | 392 处  | 需甄别 settings-control 相关部分 |
| HTML 类消费               | sections html + systemSettings.html 共 95 处                                                  | 95 处   | DOM 契约不变，保留类名           |

其中 HTML 消费与 CSS 选择器属「DOM 契约层」，按批次 3 既定模式（类名保留、语义下沉）不做重构；第一阶段聚焦 CSS 侧的自建值收敛与选择器合并。

## 2. 第一阶段范围（批 1-1：systemSettings.css 收敛）

选择 systemSettings.css 作为第一批，理由：该文件是 settings-control 契约的**单一登记点**（根 token 块 + 主体块 + 六族按钮基线），批次 3 的 token 体系在此建立，剩余自建值收敛在此闭合最符合「单一登记点」原则，且风险最低（只动 CSS 变量定义，不改选择器结构）。

具体动作：

1. **box-shadow 下沉**：新增 `--settings-control-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);`（根 token 块），`.settings-control` 主体引用。该阴影为控件浮层感基准，全 settings 面板通用。
2. **transition 常量收敛**：`.settings-control` 的 `200ms ease` 双属性 transition 替换为共享 token `--settings-control-transition`；六族按钮基线的 `150ms ease` 五项 transition 收敛为 `--settings-btn-transition`（消除两处不同的手写时间常量，统一登记）。
3. **select 让位 padding 裁决**：`padding-right: 2.5rem`（chevron 让位）保留为带注释的登记值（语义上属于控件内布局契约，下沉为 `--settings-control-padding-select-bleed` 会增加 token 面但未带来复用收益，按「token 需有复用消费」原则登记保留）。
4. **settings-scale 限额**：新增 3 个 token + 注释合并，预计净增 ≤4 行，守住 1200 行限额。

## 3. 后续批次规划（第一阶段完成后排期）

| 批次           | 范围                                                                | 预估   | 说明                            |
| -------------- | ------------------------------------------------------------------- | ------ | ------------------------------- |
| 批 1-1（本批） | systemSettings.css 自建值收敛                                       | 0.5 天 | 单一登记点闭合                  |
| 批 1-2         | sections CSS 第一组：appearance + data（84 处非 token 值）          | 1-2 天 | 最浅组，建立 section 级迁移模板 |
| 批 1-3         | sections CSS 第二组：llm + network（152 处，含 5 处残留选择器收口） | 1-2 天 | 选择器合并在此完成              |
| 批 1-4         | sections CSS 第三组：diagnostics + toolStrategy（156 处）收官       | 1-2 天 | 全组清零                        |

每批纪律不变：独立 commit、`ci:quality + build + smoke` 全绿后推送。

## 4. 验收基线（本轮启动前全绿实证）

`ci:quality` 20 项（主 HEAD `aa046943` 实测，exit=0）：

| #   | 门禁项                                         | 实测状态                                                                             |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1   | architecture:audit                             | routes 50 / errors 0；SOP shell 18 + shared shell 33                                 |
| 2   | css:audit                                      | variables 审计通过                                                                   |
| 3   | doc-classnames:audit                           | passed                                                                               |
| 4   | z-index:audit                                  | passed                                                                               |
| 5   | theme:hardcode-baseline:gate                   | shell 24/24 · sops/app_center/amz_hub/more/other 0/0 · **semantic (sops) 4087/4087** |
| 6   | theme:hardcode-baseline:modules:gate           | 全 0/0                                                                               |
| 7   | theme:bridge:gate                              | Utility Bridge 深色映射同步通过                                                      |
| 8   | content-surface:gate                           | bg-white 162/196（delta -34）· text-slate 2233/2391（delta -158）                    |
| 9   | token:override-audit:gate                      | identical 0 / unallowlisted 0 / stale 0                                              |
| 10  | action-names:audit                             | passed                                                                               |
| 11  | import-paths:audit                             | passed                                                                               |
| 12  | source-names:audit                             | passed                                                                               |
| 13  | type-check（含 type-check:tests / lint:tests） | passed                                                                               |
| 14  | settings-scale                                 | 41 files, 11 html fragments                                                          |
| 15  | lint + lint:warning-gate + ci:test-quality     | 0/0 warnings                                                                         |
| 16  | ci:format                                      | passed                                                                               |
| 17  | button-ui:gate                                 | passed                                                                               |
| 18  | ci:ui-audit                                    | card-ui 5 targets / callout-ui 15+2 / workbench-ui 5 全通过                          |

（smoke 31/31、build 8.4s 为独立命令，非 ci:quality 内项，同属检查点三件套。）

## 5. 回滚与风险

本批为纯 CSS token 定义收敛（值不变、选择器不变），视觉零差异风险；`settings-scale` 限额压力已通过批次 3 实测（注释合并回压至 1196 行），本批新增 3 token 预计净增 ≤4 行，若超限额则合并相邻注释行。回滚基线：main `aa046943`，GitHub Latest v3.1.0。
