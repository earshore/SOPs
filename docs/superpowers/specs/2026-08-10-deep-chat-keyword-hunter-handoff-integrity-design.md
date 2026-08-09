# Deep Chat → Keyword Hunter 推送完整性加固设计

**Date:** 2026-08-10
**Status:** implemented (reviewed: approve after revisions; manual mock-gateway verification passed 2026-08-10)
**Scope:** `deep-chat` → `keyword_hunter_input` 推送链路完整性（生成中/失败/截断场景）

---

## 1. 问题与实测背景

用户报告：Deep Chat 生成 Listing 文案后「推送到 Keyword Hunter 复核」，**有时推过去不完整**。

本地对真实网关 `new.hongecb.store` 的实测（2026-08-10，deepseek-v4-flash / gpt-5.6-sol / grok-4.5）：

| 场景 | 实测结果 | 推送按钮行为 |
| --- | --- | --- |
| deepseek-v4-flash，推理默认关 | 请求 `thinking.type=disabled`+2000 tokens → 网关只推理无正文 → 气泡为「请求失败：模型完成了推理但未返回可见正文…」（DEEP_CHAT_001） | **按钮仍可点**，推出去的是错误文案 |
| deepseek-v4-flash，推理开 | `thinking.type=enabled`+`reasoning_effort=high`+16384 → 流 ~70s 被 `BodyStreamBuffer was aborted` 中断，气泡只剩部分/失败文案 | **按钮仍可点** |
| gpt-5.6-sol / grok-4.5 正常 | 生成完整，推送落地与气泡一致（前言被剥、无内容丢失） | 正常 |

## 2. 推送链路地图

```
气泡 toolbar「推送到 Keyword Hunter 复核」按钮
  └─ createMessageToolbar (composer/messageToolbar.ts)
       └─ getOutgoingMessageContent(bubble)   ← bubble.innerText 提取（DOM 实时状态）
       └─ actions.sendToKeywordHunter(content, storedMessage)
            └─ sendAssistantCopyToKeywordHunter (integrations/handoffs.ts)
                 ├─ getActiveListingPromptContext() 无 → toast warning
                 ├─ seoKeywords 空 → toast warning
                 ├─ trimmedContent 空 → return
                 ├─ buildListingCopyFromPrompt
                 └─ saveListingCopy / applyListingCopyToKeywordHunter / 导航
禁用条件：仅 syncToolbarContentBoundActions 在「正文为空」时禁用（TB2）
可用条件：canSendToKeywordHunter = Boolean(getActiveListingPromptContext())
```

**渐进式正文写入路径（推送内容不完整的来源）：**

1. **流式生成中**：`emitPendingAssistantDelta` 逐 chunk 写入 `displayedAssistantText` 并渲染到 DOM；请求未 settle 前 `sessionState.pendingRequests` 中 `isSettled=false`。
2. **settle 后打字机重放**（工具调用/一次性返回/recovery 恢复正文时，`revealAssistantTextWithTypewriter`）：`displayedAssistantText` 清空后按 `min(48, max(6, ceil(remaining/40)))` 字符/tick 重写 DOM，此时 `isSettled=true` 但 `displayedAssistantText.length < assistantText.length`。
3. **失败路径**：`handleRequest` 失败后渲染错误文案气泡；`assertDeepChatAssistantText`（llmCall.ts）抛 DEEP_CHAT_001 时正文为空、仅错误文案。失败 settle 后 pending 会随 displayed 同步被快速清理（`completeSettledPendingDisplay`），气泡残留部分正文 + 错误文案。
4. **手动停止 / 超时保留**：`stopPendingRequest` 保存部分正文并落 status `stopped`；`preserveTimedOutPartialResponse` 保存部分正文**但不落 status**（timeout 语义为 final retained text，无「未完成」badge）。

三种状态下 DOM 中 bubble 文本均与「最终完整正文」不同，而推送按钮无任何门禁。

## 3. 根因（已确认）

- **R1（主因）**：推送按钮无「内容已完整」门禁。`canSendToKeywordHunter` 只检查 Listing Prompt 上下文；`syncToolbarContentBoundActions` 只检查正文非空。流式/打字机进行中点击 = 提取部分 innerText。
- **R2**：失败/空正文场景仍可推送。DEEP_CHAT_001 时气泡正文是错误说明文本（非空），推送到 Keyword Hunter 的是无价值内容。
- **R3（已知限制，本次不做自动修复）**：`sanitizeListingCopy` 只剥正文开头前言，不剥模型结尾总结段（gpt-5.6-sol 实测结尾保留 "Copy strategy summary…"）；grok 系输出 `Title\n…`（无 `1. ` 前缀）时所有剥离不生效（实测无前言所以无损）。

## 4. 修复方案

### P0：推送按钮门禁（生成中/打字机中/正文未完成 → 禁用并提示）

**入口**：`composer/messageToolbar.ts` + `shell/shellUi.ts`。

1. `MessageToolbarActions` 新增字段：
   ```ts
   /** 生成完全结束且正文已完整落 DOM（流式 settle + 打字机放完）时才允许推送 */
   isPushReady?: () => boolean;
   ```
   默认缺省视为 `true`（不破坏其他宿主/测试）。

2. `shellUi.ts` `setupMessageToolbars` actions 注入实现：
   ```ts
   isPushReady: () => {
     const pending = sessionState.pendingRequests.get(sessionState.threadStore.activeThreadId);
     if (!pending) return true; // 无进行中请求 → 就绪
     if (!pending.isSettled) return false; // 流式/等待中
     // settle 后打字机未放完：displayed < full
     return pending.displayedAssistantText.length >= pending.assistantText.length;
   },
   ```

3. `syncToolbarContentBoundActions(toolbar, content)` 增加可选第三参 `isPushReady = true`；keyword-hunter 按钮禁用条件从 `!copyable` 扩展为 `!copyable || !isPushReady`，禁用提示文案区分：
   - 正文为空 → 沿用 `'暂无正文可推送'`
   - 生成未完成 → `'生成完成后可推送'`

4. `installOrUpdateMessageToolbar` 调用处（`installOrUpdateMessageToolbar` 内 `syncToolbarContentBoundActions(toolbar, meaningfulContent)`，约 L249-250）传入 `args.actions.isPushReady?.() ?? true`。每次 toolbar 刷新的既有路径（`refreshMessageToolbarStatuses`）会自动重算按钮状态，无需额外 wiring。
   5. **竞态兜底（可选但建议）**：按钮 click handler 内（`createMessageToolbar` 的 keyword-hunter onClick）再查一次 `isPushReady?.()`，为 false 时直接 warning toast 返回，消除 rAF 同步间隙的 1 帧窗口。

**范围**：仅 keyword-hunter 按钮；复制/编辑按钮行为不变（不属本方案）。

### P1：推送内容有效性校验（失败/错误文案不得推送）

**入口**：`composer/listingCopySanitize.ts` + `integrations/handoffs.ts`。

1. `listingCopySanitize.ts` 新增纯函数：
   ```ts
   /**
    * Listing 工作流下判断正文是否包含真实 Listing 文案起始标记。
    * 宽松匹配（兼容 grok "Title  \n…"、gpt "1. Title"、德语 "Titel:" 等），
    * 用于拦截 DEEP_CHAT_001 错误文案 / 纯推理无正文等无价值推送。
    */
   export function hasListingCopyStart(text: string): boolean;
   ```
   匹配规则（复用并扩展现有标记）：
   - 行首 `1. Title` / `1) Titel` / `1、Title` / `1．Title`（已有 `LISTING_START_PATTERN`）
   - 包含 `Title:` / `Titel:`（已有 `TITLE_START_MARKERS`）
   - **新增**：行首独立词 `Title` / `Titel`，词边界为「空白或半角/全角冒号或行尾」，避免德语连字符构词（如 `Title-Verifikation`）误命中。精确规则示例：
     ```ts
     const TITLE_WORD_START_PATTERN = /(?:^|\n)\s*(?:Title|Titel)(?=[\s:：]|$)/i;
     ```
   - 全角冒号 `Title：…` 也匹配（`[\s:：]`）；grok 实测 `Title  \nOrganizer Box…`（两空格）匹配 ✓

2. `handoffs.ts` `sendAssistantCopyToKeywordHunter` 在 `trimmedContent` 非空检查后增加：
   ```ts
   // 生成未完成（手动停止 / 失败保留的部分正文 + 错误文案）：直接拒推
   if (message?.status === 'partial' || message?.status === 'stopped') {
     showToast('回复生成未完成，无法推送复核', { type: 'warning' });
     return;
   }
   // Listing 工作流下正文不含真实 Listing 起始标记（仅推理 / 空正文报错）→ 拒绝推送
   if (!hasListingCopyStart(trimmedContent)) {
     showToast('当前回复未生成完整产品文案（可能仅推理或请求失败），无法推送复核', { type: 'warning' });
     return;
   }
   ```
   说明：
   - `sendAssistantCopyToKeywordHunter` 入口已对 `getActiveListingPromptContext()` null 早退，且按钮仅在 `canSendToKeywordHunter` 时渲染——到达校验点时必为 Listing 上下文，故不再重复 `isListingPromptContext()` 判断（P1 仅对 Listing 工作流生效）。
   - 非 Listing 上下文（普通聊天）按钮不渲染，行为不变。
   - **前置依赖**：`pendingRuntime` 失败保留路径需为存储消息落 `status: 'partial'`（当前 `saveFailedDeepChatResponse` 未落 status，审核 M1；手动停止路径 `preserveStoppedResponse` 已落 `stopped`）。实施第 2 步验证现状并补齐。

**误伤评估**：Keyword Hunter 复核输入要求产品文案格式（Title/Bullets/Description），无 Title 起始标记的正文推送过去同样无复核价值；阻断 + 明确提示优于推送垃圾内容。

### P2（明确不做，记录为已知限制）

- 结尾总结段剥离：模型自述文案语言/风格多变，自动剥离误伤风险高，不实施。
- 未开推理时 maxOutputTokens 过小的提示/抬高：实测网关忽略 `max_completion_tokens`（300 → 仍输出 5979 字符），且 2000 默认值对已测模型足够；仅在网关层真正截断时才有意义，本次不改预算逻辑。
- 超时保留的部分正文可推送：`preserveTimedOutPartialResponse` 不落 status（timeout 内容按 final retained text 处理，补落 `partial` 会翻转语义并让气泡多出「未完成」badge），保持现状，验收标准第 3 条不覆盖 timeout 路径。若后续需要，可在独立方案中引入 timeout 专属标记。

## 5. 影响面与兼容性

| 变更点 | 影响 |
| --- | --- |
| `MessageToolbarActions.isPushReady?` 可选字段 | 向后兼容；`messageToolbar.test.ts` 已有用例沿用（缺省 true） |
| `syncToolbarContentBoundActions` 第三可选参 | 现有调用点/测试不改仍编译通过 |
| `sendAssistantCopyToKeywordHunter` 新增校验 | 普通聊天不拦截；仅 Listing 工作流且正文无起始标记时阻断 |
| 按钮禁用文案 | UI 文案变化，无 e2e 断言依赖（先 grep 确认） |

## 6. 测试计划

| 层级 | 用例 |
| --- | --- |
| 单测 `messageToolbar.test.ts` | ① 有正文 + `isPushReady=false` → keyword-hunter 按钮 disabled + title「生成完成后可推送」；② `isPushReady=true` → 可点；③ 缺省（不传）→ 可点；④ **同 fixture 断言 copy/edit 按钮不受影响（范围回归）** |
| 单测 `isPushReady` 判定纯函数（P0 提取至 `lifecycle.ts` 或 `pendingRuntime.ts`，如 `isPendingPushReady(pending)`） | ① pending 未 settle → false；② settle + `displayed < full` → false；③ settle + `displayed === full` → true；④ 无 pending → true；⑤ null/undefined → true |
| 单测 `listingCopySanitize.test.ts` | `hasListingCopyStart`：grok 格式 `Title  \n…`（两空格）✓；gpt 格式（前言 + `1. Title`）✓；德语 `Titel:` ✓；全角 `Title：…` ✓；德语连字符 `Title-Verifikation…` ✗；DEEP_CHAT_001 错误文案 ✗；普通句子 ✗ |
| 最小单测（纯函数层） | `sendAssistantCopyToKeywordHunter` 依赖 threadStore/StorageService/路由，不做脆弱 mock 单测；校验逻辑的不可测部分由手测覆盖（审核 m6） |
| 手测（mock 网关 `tools/mock-llm-server.mjs` 新增两个场景） | ① `deepseek-v4-reasoning-only-fail`：推理后正文空 + recovery 也空（复现 DEEP_CHAT_001 气泡）→ 按钮/推送被拦；② `deepseek-v4-stream-abort`：流中中断（部分正文）→ settle 后推送被拦（status=partial）；③ 正常模型确认恢复可推 |

## 7. 实施路线

1. **P1 纯函数**：`hasListingCopyStart` + 单测 → 最快闭环，拦截最严重场景（推错误文案）。
2. **失败路径落 status（M1 前置）**：验证 `saveFailedDeepChatResponse` 现状；补 `status: 'partial'` 落盘（含单测，若该路径有现成测试文件）。
3. **P0 门禁**：提取 `isPendingPushReady(pending)` 纯函数（`lifecycle.ts`，含单测）→ `shellUi.ts` 注入 `isPushReady` → `syncToolbarContentBoundActions` 第三参 + click 兜底 + 单测。
4. **handoffs 校验接线**（status 拒推 + `hasListingCopyStart` 拒推）。
5. **回归**：`npm test`（messageToolbar / listingCopySanitize / lifecycle 相关套件）；跑业务相关 lint。
6. 手动链路复核（可选，使用 mock 网关新增失败场景）。

## 8. 验收标准

- [x] 生成中/打字机中：Keyword Hunter 推送按钮 disabled，title 提示「生成完成后可推送」。（P0：`isPendingPushReady` + button click 竞态兜底）
- [x] DEEP_CHAT_001 / 仅推理无正文：推送被拦截，warning toast 提示，keywordTracker 状态不被污染。（实测场景 A：toast「当前回复未生成完整产品文案…」+ 未跳转 + ktLen=0）
- [x] 失败保留 / 手动停止：部分正文（status `partial`/`stopped`）推送被拦截，即使其中已含 `Title` 起始行。（实测场景 B：部分正文含 Title + 未完成 badge → toast「回复生成未完成，无法推送复核」+ 未跳转 + ktLen=0）
- [x] 正常完整生成（mock deepseek-v4-flash 短文案回归）：按钮可用，推送落地与气泡正文一致（502 字符含 [END-OF-LISTING] 哨兵，无截断）。
- [x] 普通聊天（非 Listing 上下文）：推送按钮不出现（现状不变），复制/编辑不受影响（messageToolbar 单测范围断言）。
- [x] 相关单测通过：deep-chat 全目录 vitest 0 失败；tsc --noEmit 0 错误；eslint 0 错误。

## 9. 实施记录（2026-08-10）

| 步骤 | 文件 | 内容 |
| --- | --- | --- |
| P0 | `request/lifecycle.ts` | 新增 `isPendingPushReady(pending)` 纯判定（未 settle → false；settle 且 displayed<full → false） |
| P0 | `composer/messageToolbar.ts` | `MessageToolbarActions.isPushReady?`；`syncToolbarContentBoundActions` 第三参；keyword-hunter 按钮禁用文案区分「生成完成后可推送」；click 内 `isPushReady` 竞态兜底 |
| P0 | `shell/shellUi.ts` | actions 注入 `isPushReady: () => isPendingPushReady(pendingRequests.get(activeThreadId))` |
| P1 | `composer/listingCopySanitize.ts` | 新增 `hasListingCopyStart`（行首独立词 Title/Titel 边界正则，兼容 grok 格式、防德语连字符误命中） |
| P1 | `composer/pushGuard.ts`（新） | `resolveIncompleteGenerationGuard(stored, latestAi)`：失败路径 store 合并消息与 DOM 拆分渲染时按最新 AI 消息兜底拦截 |
| M1 前置 | `session/pendingRuntime.ts` | `saveFailedDeepChatResponse` 有部分正文时落 `assistantStatus: 'partial'` |
| P1 | `integrations/handoffs.ts` | `resolveKeywordHunterPushBlock`：status 守卫 + `hasListingCopyStart` 守卫，toast 拒推 |
| 测试 | `pushGuard.test.ts`（新）、`listingCopySanitize.test.ts`、`lifecycle.test.ts`、`messageToolbar.test.ts`、`index.test.ts` | 新增/调整用例；index.test 气泡文本改为含 Title 起始行的真实形态 |
| 工具 | `tools/mock-llm-server.mjs` | 新增 `deepseek-v4-reasoning-only-fail`（recovery 也空）与 `deepseek-v4-stream-abort`（40% 正文后断流）；补 CORS 头

**手动验证（mock 网关 + 浏览器，2026-08-10）**：
1. `deepseek-v4-reasoning-only-fail`：DEEP_CHAT_001 失败气泡 → 点击推送 → toast「当前回复未生成完整产品文案（可能仅推理或请求失败），无法推送复核」，未跳转，keywordTracker 未被污染。
2. `deepseek-v4-stream-abort`：787 字符部分正文（含 Title 起始行）+ 失败文案 + 「未完成」badge → 点击推送 → toast「回复生成未完成，无法推送复核」，未跳转。
3. `deepseek-v4-flash` 正常短文案：按钮可用，推送落地 502 字符（含 [END-OF-LISTING]），完整无截断。

**已知限制（P2 明确不做）**：
- 超时保留的部分正文可推送（`preserveTimedOutPartialResponse` 不落 status，timeout 语义为 final retained text）。
- 模型结尾总结段不自动剥离（语言/风格多变，误伤风险高）。
- 未开推理时 maxOutputTokens 不改（网关实测忽略 `max_completion_tokens`）。