# 上线前双代理体检报告（2026-08-09）

> 方式：产品经理代理（业务/需求/体验面）+ 产品测试官代理（质量/回归/发布就绪面）并行只读审查，全部基于真实源码核查；本报告为汇总 + 阻塞项处置记录。
> 基线：`6c9617ab`（Tighten analysis time estimates and toasts）+ 本报告处置提交（KH-1 修复）。

---

## 一、上线结论

**可以上线。** 双代理结论：QA「有条件通过（无阻塞）」，PM「有条件上线（1 个一行级阻塞项）」；该阻塞项已核实、已修复、已验证（见第三节）。当前无未处置的 P0/P1 阻塞项。

## 二、双代理结论摘要

| 代理 | 结论 | 核心发现 |
|---|---|---|
| QA（发布就绪） | 有条件通过 | 7 处改动全部正确落地，无回归、无死代码；唯一中风险缺口：`estimateSingleCallTime` 无直接单测（已补齐）；一处过时注释（已修正） |
| PM（业务/体验） | 有条件上线 | 业务链路 ①→⑦ 连贯无断链；发现阻塞项 **KH-1**：KH 启动 toast 硬编码 off 档测算，与真实调用继承的全局推理等级不一致（已修复）；deep 档无取消机制属后续迭代 |

## 三、阻塞项处置记录（KH-1）

**发现**（PM 代理）：`keyword_hunter/analysis/index.ts` 启动 toast 硬编码 `{ enabled: false, effort: 'low' }`（off 档）做测算。

**核实**（本报告复核）：
- `keywordHunterService.ts` L497-504：`callLLM(...)` 未传 `reasoningPrefs`
- `llmService.ts` L826-843 + L873-877：`hydrateReasoningOptionsFromStorage` 对未显式传 `reasoningPrefs` 的调用注入**用户全局推理等级**
- 影响：用户开启全局推理（如 medium）时，KH 单次评审实际分钟级，toast 却提示 off 档区间 → 反向"假承诺"，与本次修复目标冲突

**修复**：toast 改为读 `getUserReasoningPrefs()`（与 AI 分析 toast 同源口径），off/null 时归一为 `{ enabled: false, effort: 'low' }`；保留 toolScale 系数。验证：tsc 0 错误、相关单测全绿。

## 四、业务链路完整性（PM 核查结论）

| 链路 | 结论 | 证据 |
|---|---|---|
| ① 数据采集导入（合并/导入新双模式+历史快照） | ✅ | `ScraperPanel.ts` L775-787 双模式；`importHandler.ts` L821-825 new 模式先存历史快照；L841-845 成功 toast |
| ② AI 智能分析（证据深度真联动+toast 测算） | ✅ | `AlpinePanel.ts` L991-1004 下拉「快速 · 推理低」无耗时；`actions.ts` L463-468 toast 含测算；`reasoningPolicy.ts` L68-83 fast/balanced/deep → low/medium/不限 |
| ③ Prompt 生成（从报告加载 DNA） | ✅ | `PromptlabPanel.ts` autoPopulateDNA + reportFingerprint 版本绑定 |
| ④ Deep Chat 生成文案 | ✅ | `controller.ts` L99-103 消费 handoff；`handoffs.ts` registerListingCopyArtifact 闭环 |
| ⑤ Keyword Hunter 复核 | ✅ | `keywordHunterListingHandoff.ts` 预填；完成态单一派生 `updateAnalyzeButtonState`（L500-525） |
| ⑥ Listing 评审（SEO 处理页） | ⚠️ 人工环节 | `listing_seo/index.ts` 是独立 SOP 手册页，无自动化 handoff（非断链，属人工复核环节，建议产品说明中注明） |
| ⑦ 工作台总览最近作业 | ✅ | `recentPanel.ts` 8 类工件 + 恢复跳转；`NEXT_ROUTE_BY_TYPE` 阶段衔接完整 |

## 五、质量审查（QA 核查结论）

- 逐文件审查 7 处改动：全部 ✅ 正确落地；`estimateAnalysisWorkload` 非死代码（仍被 `estimateAnalysisTime` 调用）；`mergeProducts/getProductsByAsins` 在 AlpinePanel 之外仍有调用方，删除 import 无影响
- 回归风险：无；`estimateRunAtDepth` 成为孤儿导出（仅测试引用），不影响构建，列入后续清理候选
- 发布就绪：工作区干净、HEAD=origin/main、version 3.0.12 与 tag 匹配、dist 已构建、无探针残留、全 src 无硬编码耗时承诺残留

## 六、本轮处置清单（在双代理结论之上）

| 项 | 内容 | 验证 |
|---|---|---|
| KH-1 修复 | KH toast 改读全局推理偏好（同源） | tsc ✅、单测 ✅ |
| 测试补齐（QA 中风险） | `estimateSingleCallTime` 3 个直接单测（缺省无放大 / toolScale 分钟级区间 / 档位影响） | 36/36 ✅ |
| 文案收敛（PM 建议 2） | 去掉「预计 约」双重"约"：`预计 ${label}` → `${label}`（AI 分析 + KH 两处 toast） | 断言已更新 ✅ |
| 过时注释（QA ⚠️） | `actions.ts`「与下拉选项的估算公式（estimateRunAtDepth）同源」→ 改为与执行路径同源 | — |
| 全量回归 | 325 文件 / **3607** 测试全绿（较上轮 +3） | ✅ |
| Build | `npm run build` 通过 | ✅ |

## 七、非阻塞优化建议（后续迭代，按收益降序）

1. **deep 档长任务（8-15 分钟）过程反馈**：已有进度条+阶段文案+断点续跑；建议补「离开页面提示 + 运行中徽标」，完整取消机制（AbortController）可后续再做
2. **SEO 处理页定位说明**：在 listing_review 工件摘要注明人工复核位置（SOP › Listing 极致优化）
3. **孤儿导出清理**：`estimateRunAtDepth` 生产零调用，评估移除
4. 全缓存命中时 toast「约 1 秒」文案略怪（正确，可优化措辞）

## 八、二次确认清单

1. 上线结论（可以上线）是否认可？确认后推送 `sops/main` + 部署（Cloudflare Pages）。
2. 第七节优化建议是否排入下一迭代？建议先做第 1 项（deep 档反馈）。
3. 说明：AI 分析/评审真实耗时取决于模型与端点（快速档实测 ~128s），toast 为保守测算区间，属产品预期行为。
