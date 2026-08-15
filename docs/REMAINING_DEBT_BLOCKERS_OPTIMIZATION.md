# 剩余债务、阻塞项与优化点盘点（v3.1.1-rc.4 后）

作者：Manus AI · 日期：2026-08-15

## 1. 门禁健康度实测

`ci:quality` 20 项全绿（exit=0）：theme:hardcode-baseline:gate semantic 2128/2128 · modules 0/0 · shell 24/24（megaMenu glass 豁免 24 处），theme:hardcode-baseline:modules:gate 全 0/0，theme:bridge:gate 通过，content-surface:gate 通过，token:override-audit:gate identical 0 / unallowlisted 0 / stale 0，settings-scale 1199/1200（1 行余量），lint:warning-gate 0/0，ci:format 通过。GitHub Actions API 额度充裕（core 14986/15000 剩余），无 CI 额度阻塞。

## 2. 剩余债务清单

| 债务                      | 规模                   | 性质                                                                         | 处置                                                                                                |
| ------------------------- | ---------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TD-THM-01 allowlist 20 处 | 20 处                  | intentional override（easing 1 / radius 6 / shadow 7 / z-index 7）已受控登记 | 统一时机 workbench migration，按 only-handwritten 240 / only-generated 361 候选池消化；卡片 P2 维持 |
| TD-CMP-02 复检            | 单点人工复检           | 2026-09-14 到期，CI 门禁全覆盖复检判据                                       | 到期跑 ci:quality + settings 相关提交审查 → 归档 TD-CMP-02 为 Closed                                |
| TD-CMP-05 兼容壳          | sharedModals.html 5 行 | 0 接线兼容壳                                                                 | 随旧构建路径清理时机评估，登记保留                                                                  |
| TD-THM-02 glass 豁免      | 24 处                  | 设计系统级渐变光效，豁免规范 GUI014 齐备                                     | 豁免维持，无新增即无债务增长（门禁锁死）                                                            |
| smoke 3 例 baseline 缺陷  | 3 例                   | 断言层 dpr 耦合 + webkit 时序误判                                            | 专项计划已立（SMOKE_BASELINE_FIX_PLAN.md，次序 14）                                                 |

## 3. 阻塞项

当前**无生产阻塞项**：release-smoke 3 例失败为既登记缺陷（非回归），rc.4 已正常发布；GitHub Actions 额度已恢复（用户此前月限额用尽问题已解除，核心 API 剩余 14986）；settings-scale 限额 1199/1200 尚有 1 行余量（未来新增 settings token 前需先做注释合并）；无未决 PR/未合并分支阻塞 main。

## 4. 优化点候选

| 优化点                                                                                                            | 收益                                | 工作量             | 优先级建议   |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------ | ------------ |
| dark-content-compat.css 瘦身（3,070 行，全库最大 CSS 组件文件）                                                   | 减小 CSS 体积、消除迁移基础设施残留 | 中                 | 中           |
| smoke 基线断言 dpr 归一化（见专项计划）                                                                           | 93 用例全浏览器绿，补齐深色翻转盲区 | 小（一行语义改动） | 高（已立项） |
| code-highlight.css（2,082 行）按需加载评估                                                                        | 首屏 CSS 精简                       | 中                 | 低           |
| bundle 主 JS（index 193KB / deep-chat 203KB / charts 203KB）分包现状已合理，deepChat.bundle.js 404KB 为第三方依赖 | 首屏性能                            | 大                 | 低           |
| callout/workbench 暗色断言纳入 ci:ui-audit（TD-CMP-06 遗留）                                                      | 暗色 UI 回归覆盖                    | 小                 | 中           |
| 基线文件浏览器维度拆分（若 Step 1 后仍有渲染差异）                                                                | 三浏览器视觉契约完整                | 小                 | 低（兜底）   |

## 5. 结论

收尾专项（次序 10-13 + CMP-04）后，可动手代码债仅 TD-THM-01（20 处受控 allowlist，等待 workbench migration 统一时机）与 smoke baseline 专项（已立项，修复成本小收益大，建议优先执行）。无生产阻塞项。优化点中最高性价比为 smoke 断言修复与 ci:ui-audit 暗色扩面。
