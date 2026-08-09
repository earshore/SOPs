# 迭代路线与方案 Spec（2026-08-09 · 产品团队规划 · 技术审核修订版）

> 产出方式：PM（路线图/优先级）+ UX（长任务反馈交互）+ Tech Lead（实现 spec）三代理并行只读核查后汇总；
> **技术审核（本人，2026-08-09）**：对关键链路逐点复核，修订两处 spec（见 §7）。
> **v3.1 实现状态（2026-08-09 晚）**：R1 取消（AbortController 贯穿编排层 + 测试）✅；R2 页签标题 ✅；R3 总览运行中工件 ✅；R4 离开告知 toast ✅。见提交 `Add cancel and running-state feedback`。
> 关键确认（Tech Lead）：`llmService.callLLM` 的 signal/abort 链路**已完全就绪**（`resolveLLMOptions` L870 透传 signal → `createLLMAbortResources` L949-954 外部 abort → `fetchLLMResponse` L1002-1007 fetch 级中断 → `resolveLLMAttemptFailure` L1486 外部 abort 不重试；`tests/unit/llmService.test.ts` L549-617 已有 abort 用例）。缺的只是上游编排层不传 signal——取消机制从"大工程"降级为"~210 行最小集"。

---

## 一、路线图总览

### v3.1「长任务运行感知」（核心：deep 档 8-15 分钟不丢信任）

| 需求 | 说明 | 价值 | 工作量 | 依赖 |
|---|---|---|---|---|
| R1 取消分析（软+硬取消闭环） | 进度区取消按钮 + 确认弹窗；共享 AbortController 贯穿编排层 → callLLM；取消后保留已完成维度 + 清断点 + info toast | 高 | M（~210 行） | llmService 已就绪 |
| R2 页签标题运行中标识 | `document.title` 前缀「分析中 a/b · 页面名」，完成/取消/失败/离开还原 | 高 | S（~30 行） | store `isAnalyzing` 已就绪 |
| R3 总览最近作业运行中卡片 | 复用 artifact envelope 事件通道 upsert「分析中 x/y」进度工件，无轮询，分析期总览可见 | 高 | M（~45 行） | R1 的状态收尾 |
| R4 离开页面告知 | SPA 切换「告知式」toast（分析后台继续+断点保存）而非拦截；beforeunload 不注册（刷新/关标签无损，浏览器原生框不可定制） | 中 | S（~15 行） | — |

**v3.1 DoD**：① 取消后部分结果保留、断点不复活、无失败误报；② 页签标题四路径还原正确；③ 总览可看到运行中任务且有跳转入口；④ 离开告知 toast 仅运行中触发、含「查看进度」action；⑤ 新增单测（编排层 abort ×4、取消收尾、守卫/标题还原、envelope upsert）+ 全量回归 + build 通过。

### v3.2「链路收尾与工程清洁」（低成本高确定性）

| 需求 | 说明 | 价值 | 工作量 |
|---|---|---|---|
| R5 评审工件摘要注明人工复核位置 | `registerListingReviewFromSnapshot` 摘要追加「人工复核：SOP › Listing 极致优化」+ 最近作业透出 | 中 | S |
| R6 孤儿清理 | 删除 `estimateRunPlan.ts` + 其测试（-152 行，生产零引用已核实） | 低 | S |
| R7 文案修正 | `formatDurationLabel` 同值区间输出「约 N 秒/分钟」单位收起（修「约 1-1 秒」） | 低 | S |
| R8 恢复态按钮语义 | 断点恢复后按钮显示「继续分析（已完成 a/b）」；「清缓存」同步清断点（现缺失：清缓存后重启仍弹恢复 toast） | 中 | S |

**v3.2 DoD**：四项落地 + 单测覆盖 + grep 确认无引用残留（含 docs 提及同步更新）+ 回归 + build。

### v3.3 候选（单独评审）

- **多标签页仲裁**：两标签同时跑分析会互相覆盖断点/重复计费。方案方向：storage 监听（有先例 `systemSettings.ts` L268-270）+ 另一标签进入只读态；跨标签撤销需 postMessage 协调，无证据收益先不做。
- **KH 流式取消**：`keywordHunterService.ts` L484 调用点收敛但页面无取消语义；signal 可复用，后续约一个文件 + UI 可落地。优先级低于 AI 分析（KH 评审 40s 级 vs AI deep 档 8-15 分钟）。

---

## 二、优先级矩阵

| 需求 | 价值 | 工作量 | 依赖 | 版本 |
|---|---|---|---|---|
| R1 取消分析 | 高 | M（~210 行） | llmService 已就绪；取消按钮/弹窗 | v3.1 |
| R2 页签标题 | 高 | S | 无 | v3.1 |
| R3 总览运行中卡片 | 中 | M | R1 状态收尾 | v3.1 |
| R4 离开告知 | 中 | S | 无 | v3.1 |
| R5 工件摘要注 SOP | 中 | S | 确认 `sops_listing_seo` 类 routeId | v3.2 |
| R8 继续分析语义 | 中 | S | 无 | v3.2 |
| R7 文案「约 1-1 秒」 | 低 | S | 无 | v3.2 |
| R6 孤儿清理 | 低 | S | 无 | v3.2 |
| 多标签只读 | 中 | M | v3.1 后 | v3.3 候选 |

---

## 三、v3.1 方案 Spec（UX 交互 × 技术实现汇总）

### 3.1 取消分析（R1）

**交互**（UX）：
- 入口：进度区底部 ghost 按钮 `<i class="fa-solid fa-xmark"></i> 取消分析`（琥珀/红弱化，不抢主按钮）
- 确认弹窗（复用 `confirmWithModal`）：title「取消本次分析？」/ content「已完成的维度将保留在报告中，未完成的维度会停止分析且不会重跑。」/ confirm「确定取消」/ storageKey `ai_analysis_cancel_confirm_v1`（非破坏性样式——文案不含危险正则词）
- 取消后：toast「已取消分析，保留已完成 a/b 个维度结果」（info）；hero 徽标「分析已取消 · 保留 a/b 个维度结果」（复用部分完成展示通道）；按钮回 idle「执行 AI 分析」；断点清除（后续进页不弹「恢复上次」）

**技术**（Tech Lead）：
- 共享单例 AbortController（整轮分析一个）：UI → `cancelAnalysisAction`（abort + 同步清 Alpine 态 + clearAnalysisSession + info toast）→ `runParallelAIAnalysis(config.signal)` → `AnalysisTaskExecutionOptions.signal` 新字段 → `executeTasksWithConcurrency` 两处 aborted 检查 + 收尾 `if (signal.aborted) throw AbortError` → 三条调用链全部经 2 个同名 `callAnalysisJson` 封装注入 signal（`reviewEvidencePipeline.ts` L921 / `sellingPointsPipeline.ts` L373，覆盖 map/reduce/oneshot/shared-Map/恢复轮）
- 关键守卫点：
  1. **防断点复活**：`onTaskSettledSnapshot`（actions.ts L525-527）persist 闭包加 `if (signal.aborted) return`
  2. **恢复轮逃逸**：`reasoningOnlyRecovery.ts` 捕获处先判 AbortError 直接 rethrow（不重试，避免"取消失效"）
  3. **abort 路径短路**：`runAnalysisAction` catch `isAbortError` → 静默降级（不弹「失败 8/N 维」错误 toast）
- 覆盖面：wave1/wave2/shared Map/恢复轮/重试等待全部覆盖；缓存的 preloaded 阶段（2-3s）不可取消，文档注明
- **不做每任务 signal**：本轮取消语义是"整轮"，共享 signal 一条路径走完

### 3.2 页签标题（R2）

- `AlpinePanel` `\$watch('isAnalyzing')` → 小工具 `syncAnalysisTabTitle(isAnalyzing, done, total)`：运行中 `document.title = '分析中 a/b · ' + 原标题`，完成/取消/失败/destroy 四路径还原；Navigo 中间件下次导航会重写 title，restore 场景在 init 恢复后再设置

### 3.3 总览运行中卡片（R3）

- 复用事件总线（零 recentPanel 结构改动）：`artifactEnvelopeService.ts` 新增 `upsertAnalysisProgressArtifact({status: 'running'|'done'|'cancelled', ...})`（~30 行）；`startAnalysisAction`/并行 settle 节流（复用 persist 1s 节流）/`completeAnalysisAction`/`cancelAnalysisAction` 触发
- 临时 workItem（id 前缀 `inprogress:`），完成/取消删除或标记，避免索引污染
- 卡片视觉：meta 行徽标 `<i class="fa-spinner fa-spin"></i> 分析中 42%`（琥珀/蓝，`rounded-full px-2 py-0.5 text-xs`）+ `fa-brain` 图标 `animate-pulse`；aria 拼接函数追加「分析进行中」
- 可访问性：徽标必有文字（颜色不单独传义）；新增动画统一纳入 `prefers-reduced-motion` 块；进度每秒播报是噪音——只依赖 `role="status" aria-live="polite"` 的阶段文案变化

### 3.4 离开页面告知（R4）

- 定位「告知式」非拦截：断点机制使离开对结果无损（12h 有效自动恢复），提示强度应匹配损失（≈0）；与「UI 不承诺时间」一致
- 实现：`AlpinePanel.destroy()` 时若 `isAnalyzing && progress < 100` → toast「分析仍在后台进行，已完成的维度会自动保存」+ action「查看进度」（toast action 能力现成）
- **不注册 beforeunload**：刷新/关闭标签无损 + 浏览器原生框文案不可定制 + 破坏 SPA 一致性；把「刷新/关闭不丢失」写进恢复 toast 文案更可控（v3.2 R8 一并）

---

## 四、测试策略（v3.1）

| 层 | 用例 | 位置 |
|---|---|---|
| 编排层 | ④ 已 abort signal 传入 → 立即 throw AbortError、callLLM mock 未调用；⑤ 运行中 abort → 在跑调用收到 signal、不再调度新任务；⑥ abort 场景 onTaskSettledSnapshot 不再调用；⑦ 取消后 session 不被写入 | `parallelAnalysisService.test.ts` 追加 |
| 管线层 | signal 透传到 callLLM options；恢复轮 AbortError 不重试 | `reviewEvidencePipeline.test.ts` / `sellingPointsPipeline.test.ts` / `reasoningOnlyRecovery.test.ts` |
| actions | cancelAnalysisAction（abort+clear+状态+toast）；取消后 restoreInterruptedAnalysis 返回 false | 新建 `actions.cancel.test.ts` + `analysisSession.test.ts` 补 |
| 回归 | llmService（已有 abort 用例）、AlpineRegistry 挂载卸载、recentPanel envelope 事件 | 单文件 vitest |

命令：单文件 `npx vitest run <path>`，每文件 <60s。

## 五、风险清单

| # | 风险 | 等级 | 消解 |
|---|---|---|---|
| R1 | 取消 vs 完成竞态（取消瞬间任务 settle → 写回已删 session） | 高 | persist 闭包检查 signal.aborted（§3.1-守卫 1） |
| R2 | 透传遗漏（任一 pipeline 忘传 → 取消后单调用继续跑） | 中 | 调用点收敛在 2 个 `callAnalysisJson` 封装；按清单逐点核查 |
| R3 | 恢复轮重试导致取消失效 | 中 | §3.1-守卫 2 |
| R4 | 路由守卫对既有导航的扰动 | 中 | 本轮**不做路由守卫**（离开告知够用）；后续如做需核查 skipGuards 调用点 |
| R5 | 多标签时序（另一标签读到旧 session） | 中 | v3.3 处理；本轮只做单标签 |
| R6 | 流式 KH 取消 | — | 明确暂缓（40s 级 vs 收益；后续 1 文件+UI 可落地） |

## 六、执行路线建议

1. **v3.1 最小闭环先落地**：R1（取消）→ R2（页签）→ R3（总览徽标）→ R4（告知），每步独立验证；
2. v3.1 完成验收 → 发布 → 收集反馈（"用户以为结果丢了"频次决定是否补 beforeunload/守卫）；
3. **v3.2**：R5/6/7/8 一次收敛（S 级工作项）；
4. **v3.3 候选**：多标签只读保护、KH 评审取消（按反馈排期）。

## 七、技术审核结论（本人复核，修订 spec）

### 7.1 核心链路逐条验证（全部成立）

| 链路 | 验证结果 | 证据 |
|---|---|---|
| llmService signal 透传 | ✅ 闭环（外部 signal → controller → fetch 中断 → 不重试） | `resolveLLMOptions` L102、`createLLMAbortResources` L947-954（externallyAborted + abortFromExternalSignal）、`fetchLLMResponse` L1002-1007、`resolveLLMAttemptFailure` L1486-1491（shouldRetry=false） |
| 编排层接入点 | ✅ `executeTasksWithConcurrency` 循环头 + race 后 + 收尾三处检查点现成（L871-906） | `shouldStopScheduling` 模式可直接叠加 signal.aborted |
| LLM 调用收敛点 | ✅ 全部经 2 个 `callAnalysisJson` 封装（review L921 / selling L373），signal 从调用参数透传 | Tech 报告一致 |
| 断点续跑回调 | ✅ `onTaskSettledSnapshot`（actions L523-527 → service L1250-1253）→ persist 1s 节流 | 防复活守卫落点 |
| 恢复轮 | ✅ AbortError 天然穿透 | `callWithReasoningOnlyRecovery` catch 仅匹配 code API_EMPTY_RESPONSE/PARSE_LLM_001/002，AbortError（无 code）不命中 → 直接 threow |
| toast action | ✅ `showToast` 支持 action 按钮（查看进度） | `notifications.ts` L17-34, L84-102 |
| confirmModal storageKey（不再询问） | ✅ `confirmWithModal(title, content, storageKey, label)` 现成 | modal 组件 |
| AlpineContext 扩展 | ✅ `types.ts` L80-90 现状不含 abort 字段，加 `_abortController` 清晰 | — |
| 总览事件链 | ✅ `APP_CENTER_ARTIFACTS_CHANGED` → `recentPanel` re-render，envelope upsert 可行 | `artifactEnvelopeService.ts` / `recentPanel.ts` L1451-1459 |

### 7.2 spec 修订（两处简化）

1. **恢复轮无需代码守卫**：`callWithReasoningOnlyRecovery` 对非 reasoning-only 错误（AbortError 无 code）默认 thunk；恢复轮内的第二次 `callLLM` 在 signal 已 abort 时立即 reject（零网络消耗）。仅需补测试断言「abort 后不进入恢复重试」。
2. **编排层 abort 检查仅 2 处**：循环头 + 收尾 `Promise.all` 后；race 等待循环复用现有 `shouldStopScheduling` break（置 `signal.aborted` 时同步置该标志即可）。

### 7.3 工作量修正

| 项 | Tech 原估 | 修订 | 说明 |
|---|---|---|---|
| R1 取消 | ~210 | **~150** | 省去恢复轮守卫（原 +4）与 1 处透传点（+18→+8）；executeTasks 只加 2 处检查 |
| R3 总览广播 | ~45 | ~40 | 临时 workItem 结构简化（inprogress 前缀） |
| R2/R4 | ~45 | ~45 | 不变 |
| **v3.1 合计** | ~300 | **~235** | +测试 ~80 约 315 |

### 7.4 技术确定性结论

- 取消机制**技术上完全可行**（llmService 层零改动），风险点收敛为 1 个硬守卫（断点复活竞态）+ 1 个短路（isAbortError catch 分类），其余透传遗漏靠收敛到 2 个封装点可查。
- 不建议在 v3.1 引入每任务 signal（取消语义为整轮、复杂度高、收益低）。

## 八、待办决策清单（用户已审核）

1. **v3.1 范围**：确认 R1-R4 全做（修正后 ~315 行含测试）
2. **取消弹窗「不再询问」**：启用（storageKey `ai_analysis_cancel_confirm_v1`，确认按钮模版已支持）
3. **beforeunload**：不注册（UX 原则；损失≈0）
4. **取消后部分报告**：保留并持久化（与失败路径一致，用户已确认）