# 工具循环最终回答可靠性设计（企业级）

**Date:** 2026-07-25  
**Status:** approved for implementation  
**Scope:** Tool loop 结束后 **无模型最终正文** 时的可用性与稳定性（Deep Chat / callLLM 共用）

---

## 1. Problem

当前工具多轮结束后若模型不返回可见 `content`，`llmService` 使用本地兜底：

```text
根据工具检索结果，整理如下：
### search_x (1)
…原始 resultsText 截断…
（模型未给出最终总结，以上为工具结果摘要。可再问我做更细的解读。）
```

问题：

| 维度     | 现状                             | 企业可用性期望                         |
| -------- | -------------------------------- | -------------------------------------- |
| 答案质量 | 原始检索粘贴                     | 模型/或结构化的**可读总结**            |
| 用户认知 | 像「模型答完了」                 | 明确区分：**模型总结** vs **本地兜底** |
| 可靠性   | 一次 tool_choice:none 空答即降级 | **一次专用总结轮** 后再降级            |
| 稳定性   | 多处 `\|\| synthesize...` 分散   | 单一 `resolveToolLoopFinalAnswer`      |

---

## 2. Goals (checkable)

| ID        | Outcome                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| **TF-O1** | 工具有结果且模型最终正文为空时，**优先**发起 **1 次**「总结轮」LLM（无 tools、无 reasoning、足够 maxTokens）。 |
| **TF-O2** | 总结轮成功 → 用户看到**自然语言最终回答**（无「模型未给出最终总结」脚注）。                                    |
| **TF-O3** | 总结轮失败/空 → 才使用改进后的本地兜底（仍可读、标明本地摘要、单条工具块有标题与截断说明）。                   |
| **TF-O4** | 总结轮**不得**再进入 tool loop（fail-closed：`tools/executeTool/enableToolLoop` 关闭）。                       |
| **TF-O5** | chat_completions 与 responses 路径共用同一最终解析函数。                                                       |
| **TF-O6** | 纯函数可单测：prompt 构建、本地兜底格式、是否兜底文本检测。                                                    |

**Non-goals：** 改 search_x/web_search 检索源；改 深度思考 UI；无限重试总结。

---

## 3. Design

### 3.1 单一出口

```ts
async function resolveToolLoopFinalAnswer(args: {
  lastText: string;
  collected: CollectedToolOutput[];
  request: LLMCallRequest;
  baseOptions: ResolvedLLMOptions;
  normalizedEndpoint: string;
}): Promise<string>;
```

逻辑：

1. `lastText.trim()` 非空 → 直接返回（模型已答）。
2. `collected` 为空 → 返回 `''`。
3. `tryModelSynthesizeFromToolOutputs(...)` 一次；非空 → 返回。
4. `synthesizeAnswerFromToolOutputs(collected)` 本地兜底。

所有 tool loop 收尾改为 `return await resolveToolLoopFinalAnswer(...)`。

### 3.2 模型总结轮（优先）

请求约束：

- `stream: false`（降低半截流风险；Deep Chat 仍可 typewrite 整段）
- `tools: undefined`, `executeTool: undefined`, `enableToolLoop: false`, `toolChoice: undefined`
- `reasoningPrefs: { enabled: false }`, `reasoningSessionOverride: { enabled: false }`
- `maxTokens: max(base, 2048)`
- `retries: 0`
- 超时：沿用 base timeout 或略收紧

消息：

- 在 **原 request.messages** 后追加 **一条 user**（不污染历史 store——仅本 hop）：  
  `buildModelToolSynthesisUserMessage(collected)`
- 不依赖 previous_response_id 的 store 会话（stateless 重放更稳）；可选后续增强。

Prompt 要求（中文产品默认）：

- 直接回答用户问题
- 综合工具结果，**禁止**大段粘贴原始 JSON
- 有 URL 可简要引用
- 结果不足要说明

### 3.3 本地兜底（改进）

- 保留可识别 header/footer 常量，供 UI/测试检测。
- 单工具块：工具名 + 优先 `resultsText` / `message` / `error`。
- 总长度与单块截断保持可控（现有 ~2000/块）。
- Footer 保持诚实：「本地摘要，非模型最终回答」。

### 3.4 Deep Chat

无需特殊分支：`callLLM` 返回总结或兜底后，现有 `shouldTypewriteFinalAssistantText` + assert 即可。  
若返回兜底文本，用户可见脚注，可再追问。

---

## 4. Files

| File                                    | Role                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| `modelCapability/toolLoopFinal.ts`      | prompt 构建、本地兜底、检测 helper                      |
| `modelCapability/toolLoopFinal.test.ts` | 纯函数测试                                              |
| `llmService.ts`                         | `resolveToolLoopFinalAnswer` + 替换所有 synthesize 收尾 |

---

## 5. Risks

- 总结轮增加一次延迟与费用 → 仅 empty final 时触发。
- 总结轮再触发工具 → 强制关 tools 消除。
- 工具结果过长撑爆上下文 → prompt 内二次截断总 cap（如 8k chars）。

---

## 6. Success

工具调用后多数场景得到**模型写的最终回答**；仅在二次失败时出现改进后的本地摘要；无空气泡、无假成功。
