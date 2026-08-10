# Deep Chat 会话设置加固：需求审核 + Spec 评审 + 实施计划

**Date:** 2026-08-10
**Status:** planned（4 份 Spec 已评审通过，本文件为实施路线）
**Scope:** `src/modules/app_center/views/playground/deep-chat/`、`src/components/modelSelect/`、`src/services/`（llmService 只读）、`tests/e2e/deep-chat-*.spec.ts`

---

## 1. 需求审核整理（现状核实 → 结论）

| # | 需求 | 现状核实（file:line 证据） | 结论 |
| --- | --- | --- | --- |
| R1 | 模型/调试参数会话级持久化 | 模型：`sessionState.selectedModel` 仅内存（`session/sessionState.ts:57`），unmount 清空（`controller.ts:131`），刷新回落全局（`shell/shellUi.ts:1032-1036`）；**thread 无 model 字段**（`types.ts:86-123`）。调参：`thread.{systemPrompt,temperature,reasoning}` 已持久化（即改即存 + 切换/卸载恢复闭环） | 模型缺失，调参已就绪 → **Spec-01** |
| R2 | 调试参数生效性确认 | 四链路全部生效（系统提示词→`budget.ts`；温度→`llmCall.ts:326`；推理→WYSIWYG→`reasoningPrefs`；重置→三处复位）。边界：推理模型忽略温度（能力层正常语义）、技能覆盖无提示（设计如此）、重置语义 | 审计结论"无功能级不生效项" → **Spec-03** |
| R3 | 页面默认沿用 + 切换模型显式提示 | 新线程不继承页面设置（`createThread` 不写字段）；切换模型无提示、不落线程（`onModelChange` 只联动能力控件） | 缺失 → **Spec-01** |
| R4 | 历史会话切换模型联动 + fallback | `switchThread` 只恢复调参（`threadStore.ts:558-597`），不碰模型框；ModelSelect 无编程式设值 API（`modelSelectController.ts` 仅 refresh/setProvider） | 缺失 → **Spec-02** |
| R5 | 最高推理档位超时放大 | 超时固定 `deepChat.requestTimeoutMs`（默认 90s，`runtimeStrategyService.ts:594-596`）；思考预算 `max(2×timeout,120s)`（`llmService.ts:972-981`）；与 effort 档位无关 | 缺失 → **Spec-03** |
| R6 | Prompt 气泡仅 hover 触发 | `pointerover`+1000ms dwell 已实现；但 `focusin` 立即显示（`promptPreview.ts:57-66`）→ **鼠标点击即弹泡**（点击必伴随 focus）；点击后 dwell timer 未取消、`activePromptPreviewId` 残留 | 缺陷 → **Spec-04** |

## 2. Spec 评审结论（4 份，全部通过）

| Spec | 文件 | 评审结论 | 关键拍板 |
| --- | --- | --- | --- |
| S1 | `docs/superpowers/specs/2026-08-10-deep-chat-session-model-persistence-design.md` | ✅ 通过。`thread.model` 契约、页面默认存储、system 通知消息三块设计均与代码事实一致（抽查：`mergeThreadHistoryWithRequest` 丢 system ✓、`normalizeStoredMessage` 丢 system ✓、`getSanitizedThreadOptionalFields` ✓） | 见 §3 拍板 1-4 |
| S2 | `docs/superpowers/specs/2026-08-10-deep-chat-thread-model-sync-design.md` | ✅ 通过。`setModel` UI-only API、`applyThreadTuningToSession` 尾部集成点、fallback 判定（只看列表成员资格，不看能力）合理；"成功切换不弹消息"与 S1 静默原则一致 | 见 §3 拍板 5-7 |
| S3 | `docs/superpowers/specs/2026-08-10-deep-chat-tuning-audit-timeout-design.md` | ✅ 通过。审计表与代码事实一致；超时放大作用点（llmCall 层显式覆盖）与现有 `resolveDeepChatMaxOutputTokens` 模式一致，llmService 零改动 | 见 §3 拍板 8-11 |
| S4 | `docs/superpowers/specs/2026-08-10-deep-chat-prompt-preview-hover-design.md` | ✅ 通过。根因准确（focusin 立即显示 + dwell timer 未取消 + 残留 `activePromptPreviewId`）；-11/+2 行最小修复；a11y 取舍有论证 | 见 §3 拍板 12-14 |

## 3. 拍板记录（评审时对 Spec 待确认问题的裁决）

1. **通知文案格式（S1 Q1）**：按需求原文示例字面执行 —— `切换至{model} · {effort key|推理关}`（如 `切换至gpt-5.6-sol · medium`、`切换至grok-4.5 · 推理关`）。effort 用 key（medium/high/…）而非中文标签，与示例一致；`REASONING_EFFORT_NOTICE_LABELS` 不需要，直接输出 key。
2. **页面默认 vs 全局覆盖（S1 Q2）**：需求原文"在系统设置界面进行全局设置进行覆盖"必须落地。规则：**模型** — 页面默认与系统设置同存储（工具策略默认模型），全局改动天然覆盖，零额外工作；**推理等级** — 页面默认写入时记录 provider `reasoningPrefs` 指纹，读取时指纹变化 → 丢弃页面默认推理、跟随全局；**temperature/systemPrompt** — 无全局对应物，页面默认长期有效（全局覆盖不适用）。
3. **onRefresh 回落算切换（S1 Q3）**：是。回落值 ≠ 当前生效值时：写 `thread.model` + 通知 + 补链失效（修复现状 `onRefresh` 缺失的 `lastResponseId` 清理，属正确性修复）。
4. **通知触发排序 bump（S1 Q4）**：接受（通知即会话活动）。
5. **Spec-01 先行（S2 Q1）**：实施顺序 S1 → S2（`thread.model` 编译期依赖），可同 PR。
6. **空 model 存量会话（S2 Q2）**：**静默**——回落到全局是现状默认行为，不弹 toast；仅"有记录但切不过去"才弹（toast：`该会话的模型当前不可用，已切换至全局默认模型`，warning）。
7. **成功切换提示（S2 Q3）**：不弹（选择框即指示，与 temperature/systemPrompt 恢复不弹保持一致）。
8. **超时系数（S3 Q1）**：k=2.0、cap 300s（默认 90s→180s，思考预算→360s）。
9. **作用点（S3 Q2）**：llmCall 层显式覆盖（方案 A），`getRuntimeDeepChatOptions` 签名不变。
10. **恢复路径不放大（S3 Q3）**：接受（recovery 强制推理 off，天然不触发）。
11. **重置语义（S3 Q4）**：保持现状（重置后回退 provider 全局推理默认），并同步清空页面默认对应字段（S1 已设计）。
12. **键盘可达性（S4 Q1）**：接受"键盘用户无预览"（主操作 Enter 使用保留；需求原文即"仅鼠标停留触发"）。
13. **点击后隐藏（S4 Q2）**：点击列表任意 action 立即隐藏气泡并取消 dwell timer。
14. **新增 `promptPreview.test.ts`（S4 Q3）**：做（零可测化改造，回归价值高）；移动端触控（S4 Q4）不纳入本迭代。

## 4. 实施路线（5 个阶段，严格串行；评审修正 F1）

> **实施策略（评审修正）**：源码交集（`shellUi.ts` 被 Phase 1/2/4 共改、`index.test.ts` 被 4 个 Phase 共改）与测试文件交集决定**串行推进**：Phase 1 → 2 → 3 → 4 → 5，每 Phase 验证通过再进入下一 Phase。e2e 用例在各 Phase 编写、运行统一在 Phase 5（依赖 dev server，分批跑成本高）。

### Phase 1 — Spec-01 数据契约与切换提示
**依赖：无。产出：`thread.model` 字段 + system 通知消息 + 页面默认存储。**

| 文件 | 改动 |
| --- | --- |
| `deep-chat/types.ts` | `DeepChatThread.model?: string`（L109-114 区间） |
| `deep-chat/session/threadStore.ts` | `getSanitizedThreadOptionalFields` 白名单 + model（L850-869）；新 `appendThreadNotice`；`createThread` 继承页面默认 + 末尾补 `applyThreadTuningToSession`（L475-506） |
| `deep-chat/session/conversationContext.ts` | `normalizeStoredMessage` 保留 system（L278/L283）；新 `carryOverSystemDisplayMessages`；`buildStoredThreadMessages` 接线（L172-222）；`mergeThreadHistoryWithRequest` 不动（保持仅展示不发送） |
| `deep-chat/session/pageDefaults.ts`（新） | `readPageDefaults`/`writePageDefaults`/`sanitizePageDefaults`（含推理指纹：记录 provider `reasoningPrefs`，读取时指纹变化 → 丢弃推理默认，见拍板 2） |
| `src/services/storageService.ts` | `STORAGE_KEYS.DEEP_CHAT_PAGE_DEFAULTS` |
| `deep-chat/integrations/handoffs.ts` | `buildModelSwitchNotice`（输出 `切换至{model} · {effort|推理关}`） |
| `deep-chat/shell/shellUi.ts` | 新 `applyEffectiveModelSwitch`（落 thread.model + 链失效 + 通知，onModelChange/onRefresh 共用）；`bindTuningControls`/`bindReasoningTuningControls` 补写页面默认；`onResetTuning` 清页面默认 |
| 测试 | 单测：`conversationContext.test.ts`（system 保留/排序/回归锚点）、新 `session/pageDefaults.test.ts`、`index.test.ts`（模型切换通知/防刷屏/空会话/onRefresh 回落/createThread 继承，约 8 条）；e2e（编写，Phase 5 运行）：Spec-01 §4.2 的 4 条用例 |

**实施要点（评审修正 F3-F6）**：
- `createThread` 追加 `uiHooks.applyThreadTuningToSession(container)` 放在现有 `applySkillContextsToSession`（L499）之后，与 switchThread L571-572 顺序一致、幂等（两者均技能优先）。
- 页面默认推理指纹：指纹不匹配时「忽略」页面默认推理（跟随全局），**不删除存储**；用户下次显式改动时刷新指纹（评审修正 F5）。
- **验证点**：`role:'system'` 通知在 deep-chat 中的渲染依赖 vendor 行为（假设居中提示 `deep-chat-message-system`）——index.test.ts 断言 + 加载历史渲染验证；若 vendor 不渲染 system 角色，退路为通知改用 `role:'ai'` + 专用文本样式类（成本略增，先验证再定）。

**验证：** `npx vitest run src/modules/app_center/views/playground/deep-chat` + `npm run type-check`

### Phase 2 — Track A2：Spec-02 历史会话模型联动（依赖 Phase 1）
**依赖：Phase 1（`thread.model`）。**

| 文件 | 改动 |
| --- | --- |
| `components/modelSelect/types.ts` | `ModelSelectController` + `setModel(model, opts?: {persist?: boolean})`（默认 UI-only） |
| `components/modelSelect/modelSelectController.ts` | `setModel` 实现（成员资格判定、同值早退、不触发 change/onModelChange）；`createNoopController` 补空实现 |
| `deep-chat/session/uiHooks.ts` | 新 slot `syncThreadModelToSession` |
| `deep-chat/integrations/handoffs.ts` | `applyThreadTuningToSession` 末尾追加 `uiHooks.syncThreadModelToSession(container)`（L326 后） |
| `deep-chat/shell/shellUi.ts` | `syncThreadModelToSession` 实现：thread.model 在列表 → setModel + sessionState 同步；不在列表/为空 → 回落 `resolveToolTargetModel('playground-deep-chat',...) || getFirstModel`，fallback 时覆盖 thread.reasoning 为全局 reasoningPrefs + 清链 + warning toast |
| 测试 | 单测：`modelSelect.test.ts`（setModel 6 条）、`index.test.ts`（切会话联动/fallback/reasoning 覆盖/链清空 5 条）；e2e（编写，Phase 5 运行）：Spec-02 §4.2 的 3 条用例 |

**实施要点（评审修正 F3）**：挂载路径正确性依赖 controller.ts 中 `refreshLLMConfig`（L97）先于 `bindControls`（L99）——`syncThreadModelToSession` 需要 `currentConfig` 已就绪才能恢复线程模型；若未来重构调整顺序需同步迁移。

**验证：** vitest（deep-chat 目录 + modelSelect）+ `npm run type-check`

### Phase 3 — Track B：Spec-03 超时放大 + 审计回归（可与 Phase 2 并行）
**依赖：无。** 与 Track A 文件交集仅 `index.test.ts`（测试文件），实现期协调分批提交即可。

| 文件 | 改动 |
| --- | --- |
| `deep-chat/request/llmCall.ts` | 新 `DEEP_CHAT_MAX_EFFORT_TIMEOUT_FACTOR = 2` / `DEEP_CHAT_MAX_EFFORT_TIMEOUT_CAP_MS = 300_000` / `resolveDeepChatScaledTimeout(base, effectiveEffort)`；`callDeepChatLLM` run 内按 `resolveEffectiveReasoning`（clamp 后 === 'max'）在 `getRuntimeDeepChatOptions()` 后覆盖 `timeout`；恢复路径不放大 |
| 测试 | `llmCall.test.ts`（helper 纯函数 + mock callLLM 断言 max 档 180s / 非 max 不变 / 恢复不放大）；`index.test.ts` 补 180s 文案用例（L3121 模式）+ R2 回归补充（温度透传、控件隐藏不带 reasoning 字段、重置三处复位） |

**验证：** vitest（llmCall/budget/index）+ `npm run type-check`

### Phase 4 — Track C：Spec-04 Prompt 气泡 hover-only（可与 Phase 2/3 并行）
**依赖：无。**

| 文件 | 改动 |
| --- | --- |
| `deep-chat/shell/promptPreview.ts` | 删除 `onPromptFocusIn` 及监听注册/清理（L57-66、L85、L92） |
| `deep-chat/shell/shellUi.ts` | `onPromptListClick` 开头 `hidePromptPreview(container)`（+2 行，清 dwell timer + 置空 activePromptPreviewId） |
| 测试 | `index.test.ts` L966-970 改为反断言（focusin 不弹泡）；新 `shell/promptPreview.test.ts`（dwell 显示/移出隐藏/点击取消 timer）；e2e `tests/e2e/deep-chat-prompt-preview.spec.ts`：test 2 改写为"点击/focus 不弹泡"（T3/T4），新增 T5-T8 |

**验证：** vitest（deep-chat 目录）+ `npx playwright test tests/e2e/deep-chat-prompt-preview.spec.ts`

### Phase 5 — 全量验证与收口
- `npm run type-check` + `npm run type-check:tests`
- `npx vitest run`（全量 3188 用例基线）
- `npm run test:e2e:functional`（deep-chat 组）或按 Phase 4 单跑
- `npm run lint` + `npm run lint:tests`、`npm run format:check`、`npm run xss:gate`、`npm run secret:scan`
- 文档：README「最新发布」条目 + CHANGELOG 记录（按仓库惯例）

## 5. 验收清单（对齐需求原文）

> **实施完成（2026-08-10）**：Phase 1-5 全部完成，清单逐项验证通过。

- [x] R1：切换模型后切走再切回，模型恢复；刷新页面当前会话模型恢复；threadStore 含 `model` 字段且经 sanitize 保留
- [x] R2：调试参数全项审计结论固化（Spec-03 §2 表），回归测试全绿
- [x] R3：页面选好模型+调参 → 新会话沿用；从未改过 → 跟随全局；每次切换显示 `切换至{model} · {effort|推理关}`；同模型不刷屏；历史会话加载恢复通知；全局设置（模型/推理）可覆盖页面默认
- [x] R4：切历史会话 → 模型框自动切到该会话模型（UI-only 不写持久化）；无法切换 → 回落全局模型+推理等级 + warning toast
- [x] R5：max 档（clamp 后）请求 timeout = min(base×2, 300s)；非 max 档与现状一致；超时文案秒数一致；停止按钮语义不变
- [x] R6：点击 Prompt 记录不弹气泡；hover 驻留 1s 才触发；移出隐藏；点击 use/delete 不被遮挡

## 6. 风险与回滚

- **Spec-01/02 同 PR 依赖**：S2 编译依赖 `thread.model`，合并顺序 S1 → S2（可同 PR）。
- **存量数据**：旧线程无 model → 静默跟随全局（拍板 6）；system 通知清洗改造对旧数据 no-op。
- **`index.test.ts` 多 Phase 共改**：串行实施（评审修正 F1）后无并发冲突；测试用例按 describe 分区隔离。
- **vendor system 渲染假设（评审修正 F4）**：通知渲染依赖 deep-chat 对 `role:'system'` 的默认样式；Phase 1 验证后若不支持，按退路方案（role:'ai' + 样式类）调整，不影响数据层设计。
- **回滚基线**：`v3.1.0-rc.1`（当前版本）；任何 Phase 单独回滚均不涉及 schema 迁移（新字段缺省 undefined）。
