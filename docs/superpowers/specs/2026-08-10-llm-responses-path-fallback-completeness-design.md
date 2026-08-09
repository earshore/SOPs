# LLM Responses 路径回落补全设计（tool loop 流式首请求）

**Date:** 2026-08-10
**Status:** implemented — v4 peer-level fallback (reviewed: approve; manual mock-gateway verification passed 2026-08-10)
**Scope:** `llmService` responses 工具循环流式首请求的路径回落；不触碰 `callLLMWithRetry` 主路径

---

## 1. 问题与实测背景

用户环境：设置页保存 LLM 配置后 `llm_new_api.apiPath` 被写为 `responses`（OpenAI 家族默认，`apiPathIdForFamily` → `'responses'`）。多数自部署 OpenAI 兼容网关只实现 `/v1/chat/completions`，无 `/v1/responses`。

实测（2026-08-10，mock 网关 + 浏览器抓包）：

| 场景 | 请求序列 | 结果 |
| --- | --- | --- |
| `deepseek-v4-flash`（匹配 registry 规则，supportsTools=true）+ apiPath=responses | `/v1/responses`（带 tools）→ **仅 1 次请求，无回落** | `请求失败：not found: POST /v1/responses` |
| `deepseek-v4-stream-abort`（被 `deepseek-v4-*` 通配匹配，同样带工具） | 同上，无回落 | 同上 |
| `random-model-x`（无 registry 规则、无工具） | `/v1/responses` 404 → **自动回落 `/v1/chat/completions` 重试** | 回落生效（对照组） |

结论：**路径回落只在无工具主干（`callLLMWithRetry`）存在；Deep Chat 实际生产路径（业务工具默认开 + 注册表模型 supportsTools=true → responses tool loop）没有回落**。

## 2. 链路地图

```
callLLM (llmService.ts)
├─ shouldUseResponsesToolLoop?  ──> callLLMStreamFirstThenToolLoop ──> executeLLMAttemptPayload(首请求)  ← 无回落（本方案修复点）
│                                     └─ 成功后进入 streamFirst → tool loop
├─ shouldUseChatToolLoop?       ──> callLLMChatStreamFirstThenToolLoop ──> executeLLMAttemptPayload(首请求)  ← 无回落（有意不动，见 §4.2）
└─ 其余                        ──> callLLMWithRetry ← 已有回落（triedPathFallback → forcePath='chat_completions'）不动

回落判定（既有，复用）：
isAlternatePathUnsupportedError(error)：
  - statusCode === 404 → true
  - statusCode === 400 且文本匹配 /\/responses|\/messages|generatecontent|unknown url|not found|no route|invalid url path|does not exist/ → true
```

hasToolLoopPrerequisites = `enableToolLoop && executeTool 函数 && tools 非空`（llmService.ts L1537）。Deep Chat `resolveDeepChatResponsesChainOptions` 在 apiPath='responses' 时注入工具选项；runtime `deepChat.enableBusinessTools` 默认 true → 生产必走 responses tool loop。

## 3. 根因（已确认）

`callLLMStreamFirstThenToolLoop`（L2138-2171）首请求直接 `executeLLMAttemptPayload`，无 try/catch 回落分支；`callLLMChatStreamFirstThenToolLoop` 同构。`callLLMWithRetry`（L2416-2459）是唯一带回落的执行器，但**只服务无工具主干**。

错误是标准 ApiError：`createLLMResponseError` 对 404 构造 statusCode=404 的 ApiError（L1066-1083），`isAlternatePathUnsupportedError` 可直接命中。

## 4. 修复方案

### 4.1 核心：分派层平级回落（responses → chat tool loop，保留工具语义）

**产品策略（用户层零感知）**：OpenAI 类型默认 `responses` 路径（设置层不动，`apiPathIdForFamily` 保持）；网关不支持 `/v1/responses` 时传输层自动回落 `chat/completions`，用户无感。

回落必须是**平级**的：Deep Chat 业务工具（默认开启）在回落场景必须继续可用。上一版「streamFirst 内剥离 tools 的降级回落」会导致业务工具静默失效（模型无法调用工具），不满足该策略。升级为**首请求平级回落**——注意**不能在 callLLM 分派层包整个 streamFirst**：分派层 try/catch 会捕获 tool loop 中途轮次错误（如 follow-up 404），此时 responses 已执行若干工具轮次，回落会从头重放 → 工具重复调用。因此回落必须精确包住**首请求**：

```ts
// llmService.ts（callLLMStreamFirstThenToolLoop 内，只包首请求）
async function callLLMStreamFirstThenToolLoop(
  request: LLMCallRequest,
  baseOptions: ResolvedLLMOptions,
  normalizedEndpoint: string
): Promise<string> {
  const streamOptions: ResolvedLLMOptions = {
    ...baseOptions,
    stream: true,
    enableToolLoop: false,
  };
  const firstAttemptState: LLMAttemptState = {
    timedOut: false,
    externallyAborted: false,
  };
  const context = createInitialLLMContext(request, streamOptions, normalizedEndpoint);
  let firstPayload: LLMResponsePayload;
  try {
    firstPayload = await executeLLMAttemptPayload(context, 0, firstAttemptState);
  } catch (errorValue) {
    if (isResponsesPathFallbackEligible(errorValue, context)) {
      // responses 不可用（404/400 unsupported）→ 平级切 chat tool loop：
      // tools/executeTool 保留（chat 机器原生处理 tool_calls），store 剥离（chat 无链式语义）
      return callLLMChatStreamFirstThenToolLoop(
        request,
        { ...streamOptions, apiPath: 'chat_completions', store: undefined },
        normalizedEndpoint
      );
    }
    throw errorValue;
  }
  // …（首请求成功后原 continuation 不变：resolveStreamFirstResponsesResult）
}
```

**同时移除** 上一版降级回落的剥离清单（tools/toolChoice/parallelToolCalls/executeTool 不再需要剥离——chat tool loop 原生消费）；`store` 仍须显式剥离（chat 分支消费该字段，严格网关可能 400，M3 同款）。

**首请求 vs 中途轮次语义**：catch 精确包住首请求 `executeLLMAttemptPayload`；tool loop 中途错误不在 catch 内 → 不回落（避免已执行工具轮次被重放）。

守卫函数（保留上一版，命名导出便于测试）：

```ts
/** 仅 responses → chat_completions 的路径回落：显式限定 apiPath==='responses'，
 *  避免 anthropic/gemini 等原生路径被错误强制切到 chat_completions（认证头/消息结构不兼容）。 */
export function isResponsesPathFallbackEligible(
  errorValue: unknown,
  context: { apiPath?: ApiPathId }
): boolean {
  return (
    context.apiPath === 'responses' &&
    errorValue instanceof ApiError &&
    isAlternatePathUnsupportedError(errorValue)
  );
}
```

**平级回落的正确性依据**：
- chat tool loop 原生处理 tool_calls（`callLLMChatStreamFirstThenToolLoop` → `executeChatToolCalls` → `callLLMChatToolLoop`），回落响应含 tool_calls 时工具正常执行、continuation 正确——不再有「responses 专属机器」问题
- `previousResponseId` / `followUpInputItems` / `include` 等 responses 专属字段：chat body 不消费，自动丢弃；仅需显式剥离 `store`（chat 分支消费该字段，严格网关可能 400，M3 同款）
- 回落后 `enableToolLoop`/`tools`/`executeTool` 保留 → `shouldUseChatToolLoop` 判定成立 → chat 分支自洽
- **只回落一次**：回落 path 已是 `chat_completions`；且回落只发生在首请求 catch 内，中途轮次错误原样抛出 → 天然单次
- 错误面闭合：超时（NetworkError）、网络错误（非 ApiError）、200+error body 均不满足守卫 → 原样抛出

**错误可诊断性（定稿）**：回落路径（chat tool loop）也失败时，wrap 错误并附注回落上下文，保留 code/statusCode/response 以便上层错误映射：

```ts
// callLLMStreamFirstThenToolLoop 首请求 catch 内
if (fallbackError instanceof ApiError) {
  throw new ApiError(
    `已尝试从 /responses 回落 Chat Completions 仍失败：${fallbackError.message}`,
    fallbackError.code,
    fallbackError.statusCode,
    fallbackError.response,
    { ...fallbackError.context, fallbackFrom: 'responses' },
    fallbackError
  );
}
throw new Error(`已尝试从 /responses 回落 Chat Completions 仍失败：${String(fallbackError)}`, {
  cause: fallbackError,
});
```

不发明合成 code（llmFailureUx 的 CODE_UX 按 code 映射模板会失效）；message 前缀不含 401/429/timeout 等 token，不影响 MESSAGE_HINTS 匹配。

### 4.2 有意不改的部分（防债务）

| 位置 | 原因 |
| --- | --- |
| `callLLMWithRetry`（L2416-2459） | 回落嵌入 `attempt -= 1` 重试循环，语义纠缠；重构主路径回归风险大于收益。接受两份 `~8` 行判定重复（注释互相引用），实测行为一致 |
| `callLLMChatStreamFirstThenToolLoop`（L2299-2356） | 首请求路径本身是 chat_completions（或 anthropic/gemini native）：chat 404 说明端点不支持该路径，回落同路径无收益（双倍延迟）；anthropic/gemini 原生端点回落 chat_completions 是协议不兼容（认证头/消息结构按 path 切换）——但注意双路网关（anthropic+chat 同端点同 key）下此类回落实际可 200 成功（静默协议切换，无害），本方案不涉及该场景（守卫限定 responses） |
| `callLLMResponsesToolLoop`（非流式，L1849-1904） | Deep Chat 及主要模块 stream 默认 true（`resolveLLMOptions` `stream ?? true`）；非流式 responses + tools 组合低频。本轮不接，文档记入已知限制 |

### 4.3 测试补强（改 2 例 + 增 1 例，基于现状）

现状：无工具主干回落 1 用例（L219-267）；v2 新增 4 用例中 3 例仍有效（chat 404 不回落、回落失败、守卫纯函数），用例 1 断言为 v2 语义需反转。变更：

| 用例 | 操作 | 断言 |
| --- | --- | --- |
| 带工具 responses 首请求 404 → 平级回落 | **改**（v2 用例反转，更名去掉 stripping） | 第二次请求 URL 为 `/v1/chat/completions`、**请求体保留 `tools` 且不含 `store`**、成功返回文本 |
| 回落响应含 tool_calls → 工具执行（平级核心） | **增** | 3 跳 stub（404 → chat SSE tool_calls delta → chat 非流式最终文本）；`executeTool` 被调用；最终文本包含工具结果；**全部请求 URL 均为 `/chat/completions`**（锁定 v4 切断 v2 污染路径） |
| chat_completions 首请求 404 → 不回落 | 保留 | 仅 1 次请求，抛原错误 |
| 回落请求也失败 | **改** | 抛错 message 含「已尝试从 /responses 回落」前缀且 `statusCode===404` 保留 |
| `isResponsesPathFallbackEligible` 纯函数 | 保留 | 不变 |

基建：现有链式 stub + `createSseResponse` helper 直接复用（SSE tool_calls delta 形态参考既有「SSE emits tool_calls deltas」用例 L1281），不新建测试文件。

## 5. 影响面与兼容性

| 变更点 | 影响 |
| --- | --- |
| `callLLMStreamFirstThenToolLoop` 首请求 | 仅当首请求 ApiError(404/400unsupported) 时多一次无 tools 的 chat_completions 请求；成功路径零改动（无 try/catch 开销之外的差异） |
| 新增 `isResponsesPathFallbackEligible` 导出 | 纯函数，无副作用 |
| 失败总耗时 | 最多 2 次请求（404 快速失败 + 重试），可忽略 |
| 与 Deep Chat `isResponsesChainUnsupportedError`（previous_response_id 链回退） | 剥离 `store` 后无叠加路径：链回退只匹配 400 previous_response_id/store 文本；路径回落只匹配 404/路径文本；两者判定不相交（store 泄漏路径已消除） |
| 重试/超时 | 回落重试独立计时；Deep Chat pending 状态延续，用户无感知（404 毫秒级失败） |

## 6. 实施路线

1. `llmService.ts`：新增 `isResponsesPathFallbackEligible`（导出）+ `callLLMStreamFirstThenToolLoop` 首请求回落接入；`callLLMWithRetry` 回落处加注释互相引用。
2. `llmService.stream.test.ts`：补上表 4 组用例（如需要先侦察现有 stub 基建）。
3. 回归：llmService.stream.test.ts + deep-chat 全目录测试 + `tsc --noEmit` + eslint。
4. 验收（见 §7）。

## 7. 验收标准

- [ ] mock 网关实测：apiPath=responses + `deepseek-v4-flash`（带工具）→ `/v1/responses` 404 后自动回落 `/v1/chat/completions`（**请求体不含 tools**）成功生成（抓包 2 条请求验证）
- [ ] 对照组：apiPath=responses + 无工具模型 → 回落行为与修复前一致（不回归）
- [ ] 单测用例（§4.3 表格 4 组）通过；deep-chat 全目录无失败；tsc/eslint 0 错误
- [ ] `callLLMWithRetry` / `callLLMChatStreamFirstThenToolLoop` / `callLLMResponsesToolLoop` 代码零改动（diff 确认）

## 8. 已知限制（本轮不做，后续可选）

- 非流式 `callLLMResponsesToolLoop` 首轮无回落（低频组合）
- chat 回落成功但返回空文本（maxTokens 截断等）：continuation 仍落 `callLLMResponsesToolLoop` → 404（与既有流式空文本兜底同路径，非本方案新引入）
- `callLLMWithRetry` 的 anthropic/gemini 404 也会强制回落 chat_completions（既有行为）：原生端点回落请求必然 404 快速失败（无该路由）；双路网关可能 200 成功（静默协议切换，无害）。不在本轮扩大改动面
- 网关把路径不支持包装为 HTTP 200 + error body 的伪成功不在回落判定内（`isAlternatePathUnsupportedError` 只处理 404/400；200 由 `throwIfResponsesPayloadFailed` 处理，本轮不改）
- 设置层 `apiPathIdForFamily('openai') → 'responses'` 默认值：推荐后续独立方案（改成默认 chat_completions 或 API 路径可选下拉），治配置漂移源头；设置侧注释已把回落视为既有契约（systemSettings.ts L147-157），本设计落地后才真正兑现该契约

## 9. 实施与验收记录（2026-08-10）

### v2（降级回落，已废弃）
`callLLMStreamFirstThenToolLoop` 首请求剥离 tools 回落后拉；因业务工具静默失效被 v4 取代，代码已移除。

### v4（平级回落，现行）

| 步骤 | 文件 | 内容 |
| --- | --- | --- |
| 1 | `src/services/llmService.ts` | `callLLMStreamFirstThenToolLoop` 首请求 catch → `isResponsesPathFallbackEligible` 命中时委托 `callLLMChatStreamFirstThenToolLoop`（`{...streamOptions, apiPath:'chat_completions', store:undefined}`，tools/executeTool 保留）；回落失败 wrap（ApiError 保留 code/statusCode/response + context.fallbackFrom，非 ApiError 包 Error 保留 name） |
| 2 | `src/services/llmService.stream.test.ts` | 用例 1 断言反转（tools 保留 + store 剥离）；新增「回落响应含 tool_calls → 工具执行」3 跳用例（404 → chat SSE tool_calls → chat 非流式最终文本，断言 executeTool 调用 + 回落请求全部走 chat）；回落失败用例加前缀/statusCode 断言 |

**回归**：llmService.stream.test.ts 31 用例全过；deep-chat + services 全目录 vitest 0 失败；tsc --noEmit 0 错误；eslint 0 错误。

**验收（manual，mock 网关 + 浏览器，2026-08-10）**：
1. apiPath=responses + `deepseek-v4-flash`（带工具）→ 抓包序列：`/v1/responses`（404，hasTools=true）→ `/v1/chat/completions`（**hasTools=true** 平级保留、**hasStore=false** 剥离）→ 气泡完整 498 字符，无错误。
2. `callLLMWithRetry` / `callLLMChatStreamFirstThenToolLoop` / `callLLMResponsesToolLoop` 函数体零改动（diff 确认，唯一 + 行为新调用点）。