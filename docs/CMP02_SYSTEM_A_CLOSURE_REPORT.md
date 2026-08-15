# 次序 11 验收报告：TD-CMP-02 体系 A 闭环（settings-control 112 处/14 文件）

**日期**：2026-08-15 · **提交**：`4265966d`（代码闭环）+ `1e34a523`（文档同步） · **依据**：`CMP02_FORM_DEBT_PLAN.md` §2.1 + `CMP02_SYSTEM_A_PHASE1_PLAN.md`

## 1. 闭环判定

体系 A 定义为 settings-control 类引用 **112 处/14 文件**。经本轮摸底与甄别，该专项 CSS 实现侧已全部闭合，112 处 HTML 类消费判定为 DOM 契约（保留类名、语义下沉，与 TD-THM-02 Phase B 既定模式一致），不构成未闭环工作量。各层面闭环判据如下：

| 层面                            | 规模                                    | 处置结论                                                                                                                                                                                    | 提交/依据   |
| ------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| systemSettings.css 主体契约     | 主块 + 六族按钮基线                     | **已 token 化**：主块 hover/focus/disabled/--sm/.settings-label 全 token 链（批次 3，`b0d9358c`）                                                                                           | `b0d9358c`  |
| 根 token 块自建值               | 阴影 + 过渡时间约 5 处                  | **已登记**：新增 `--settings-control-shadow` / `--settings-control-transition`（200ms）/ `--settings-btn-secondary-shadow` / `-transition`（160ms），控件浮层阴影与过渡时间全面板单一登记点 | `4265966d`  |
| select padding-right 2.5rem     | 1 处                                    | **裁决保留**：chevron 让位属单控件内布局契约，无复用消费，带注释登记                                                                                                                        | `4265966d`  |
| sections 残留选择器             | 5 处（llmSection 2 + networkSection 3） | **甄别为布局契约保留**：均为 min-height/height/font-size/line-height/padding 尺寸覆盖（model-select 2.125rem、proxy-form `--field-height` 行高对齐、secret input 字号），非自建色值/阴影    | `4265966d`  |
| .settings-api-path-trigger 契约 | 1 处（toolStrategySection）             | **已收敛**：自建 200ms transition + rgba 阴影 → 全局 `--settings-control-shadow` / `-transition`                                                                                            | `4265966d`  |
| HTML 类消费                     | 112 处/14 文件                          | **DOM 契约不变**：类名保留、语义下沉，零 diff 风险                                                                                                                                          | 既定模式    |
| sections 非 token 值            | 392 处                                  | **不在体系 A 范围**：appearance/data 两文件无 settings-control 选择器；其余文件剩余值为 gap/padding/font-size/媒体查询/backdrop-filter/grid 布局契约，非 settings-control 契约              | §6 甄别结论 |

## 2. 验收实证

### 2.1 ci:quality 20 项全绿（`4265966d` 后实测，exit=0）

| 门禁项                                     | 实测状态                                                       |
| ------------------------------------------ | -------------------------------------------------------------- |
| architecture:audit                         | routes 50 / errors 0；SOP shell 18 + shared shell 33           |
| css:audit                                  | variables 审计通过                                             |
| doc-classnames:audit / z-index:audit       | 全通过                                                         |
| theme:hardcode-baseline:gate               | **semantic (sops) 4087/4087**，gate「只降不升」零回退          |
| theme:hardcode-baseline:modules:gate       | 全 0/0                                                         |
| theme:bridge:gate                          | Utility Bridge 深色映射同步通过                                |
| content-surface:gate                       | bg-white 162/196 · text-slate 2233/2391                        |
| token:override-audit:gate                  | identical 0 / unallowlisted 0 / stale 0                        |
| action-names / import-paths / source-names | 全通过                                                         |
| type-check（含 tests）                     | 通过                                                           |
| settings-scale                             | **41 files, 11 html fragments**（限额 1200 行守住，实测 1199） |
| lint / lint:warning-gate                   | 0/0 warnings                                                   |
| ci:test-quality / ci:format                | 通过                                                           |
| button-ui:gate                             | 通过                                                           |
| ci:ui-audit                                | card 5 / callout 15+2 / workbench 5 全通过                     |

### 2.2 独立检查点（三件套）

`npm run build` EXIT=0（8.3s，零错误零 warning）；`CI=1 npm run test:e2e:smoke` **31/31 通过**，含 NPI 表格 light/dark 双 baseline 像素级断言与设置面板全流程用例（appearance 深色模式、LLM 配置、storage 阈值等 settings-control 消费场景全部命中）。

## 3. 主要改动明细（`4265966d`）

| 文件                          | 改动                                                                                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| systemSettings.css            | 根 token 块新增 4 个登记 token（control shadow/transition 200ms + btn-secondary 组 160ms）；主体块、六族按钮基线、.settings-label--focus-accent 引用 token；注释行合并 2 处守住 1200 行限额 |
| toolStrategySection.css       | .settings-api-path-trigger 自建阴影/过渡 → 全局控制 token                                                                                                                                   |
| CMP02_SYSTEM_A_PHASE1_PLAN.md | 立项文档（现状盘点 + 分批规划 + 20 项验收基线 + §6 闭环裁决）                                                                                                                               |

## 4. 视觉与风险结论

本批为纯 CSS 变量定义收敛：值不变（200ms/0.04 alpha 原样登记）、选择器不变、类名不变、DOM 结构不变，属零 diff 风险迁移；smoke 31/31 与 ui-audit 全过构成实证。settings-scale 限额余量从 4 行回压至 1 行（1199/1200），后续若需新增登记 token 仍需注释合并策略。

## 5. 同步状态

技术债看板 TD-CMP-02 卡、`TECH_DEBT_TIGHTENING_ROADMAP.md`（剩余项更新为次序 13）、`NEXT_PHASES_PLAN.md`（卡片快照/次序 11 章节/触发条件）均已同步，提交 `1e34a523`。TD-CMP-02 降级 P3 的触发条件（次序 11 体系 A 闭环）已满足，是否执行 P2→P3 降级由产品侧确认。

## 6. 后续路线

剩余高价值项为次序 13（slate 结构性灰调统一化，TD-SOP-NPI-02 候选，template/index.ts 约 180 处）；TD-THM-01 20 处 intentional override 统一迁移时机为 workbench migration，其余按既定纪律推进。
