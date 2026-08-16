# 空状态收敛与 Hex 深色翻转修复方案（2026-08-14）

> 配套 TECH_DEBT_TIGHTENING_ROADMAP 次序 4（TD-CMP-05 残留项）。

## 一、实测摸底结论

看板原文「9 套自建 vs 2 共享」为概数，实测结果为 **6 组自建空状态样式 + 4 处共享契约使用方**：

| #   | 自建空状态                               | 定义位置                          | 现状健康度                                          | 收敛判定                         |
| --- | ---------------------------------------- | --------------------------------- | --------------------------------------------------- | -------------------------------- |
| 1   | `settings-search-empty`                  | systemSettings.css:755            | 单行提示文案，语义接近共享契约                      | **收敛**：挂载 `.empty-state`    |
| 2   | `app-overview-recent-empty` 族（~10 类） | app_center_style.css:1771-1860    | grid 三列特化布局（icon+文案+操作），结构不可通用化 | 保留，登记                       |
| 3   | `app-overview-empty`                     | app_center_style.css:2303-2325    | token 体系健康，结构同共享契约                      | **协同**：加 `.empty-state` 挂载 |
| 4   | `keyword-hunter-input-snapshot-empty`    | keyword_hunter/styles.css:432-470 | token 体系完整，flex 居中布局特化                   | 保留，登记                       |
| 5   | `ppc-search-terms-empty-state`           | ppc style.results.table.css:1-167 | 已含 `.dark`/`[data-color-mode-resolved]` 双适配    | 保留，登记                       |
| 6   | `skills-library-empty-hint`              | skills_style.css:405-420 + dark   | 琥珀提示卡，已含深色规则                            | 保留，登记                       |

共享使用方：keyword_hunter/analysis、master_analysis/scraper、ppc_search_terms（2 处）。

## 二、arbitrary hex 实测结论

原看板示例 `text-[#15803d]` 在当前 `src`（html/ts）中仅剩 **1 处**：`promo_activities/template.html:134` 的棋子图标。其余分布：

| 区域                                                          | 性质                                                | 处置                                     |
| ------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `promo_activities/template.html` 棋子图标 `#15803d`           | 内容语义色（绿色棋子），无 dark 适配                | **修复**：改用 token 类 `text-green-700` |
| `amz_hub_constants.ts` emoji 图标色（FF9800 crown 等 ~40 处） | 品牌/节日视觉语义色，设计意图                       | **不动**（误报）                         |
| `devtools/*` 16 处                                            | 开发者工具，非用户 UI                               | 不纳入本轮（收益低，可登记）             |
| CSS 中 `#15803d`（5 处）                                      | 均为 token fallback 或 dark-content-compat 层，健康 | 不动                                     |

## 三、执行项

1. **扩充共享契约** `empty-state.css`：从 2 行扩充为 icon / title / copy 三级结构与居中容器规范（对齐各使用方现状的最大公约数），作为后续新建空状态的唯一入口。
2. **settings-search-empty**：template 挂载 `.empty-state`，CSS 仅保留差异行（字号/颜色层级）。
3. **app-overview-empty**：template 挂载 `.empty-state`（协同，不删原有特化行）。
4. **promo_activities 棋子图标**：`text-[#15803d]` → `text-green-700`（token 语义类，dark 自动翻转）。
5. **其余 4 组自建**：不动，登记于本方案；`sharedModals.html` 兼容壳另行评估（TD-CMP-03 已关闭）。

## 四、放行条件

`npm run ci:quality` 全绿、`npm run build` 成功、`npm run test:e2e:smoke` 通过；更新 TECH_DEBT_BOARD 与 ROADMAP。
