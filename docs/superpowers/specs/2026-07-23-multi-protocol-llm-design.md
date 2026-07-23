# 真·多协议 LLM 传输设计

**日期：** 2026-07-23  
**状态：** Implemented（四路径原生 + 用户可选默认路径）  
**范围：** `chat/completions` · `responses` · Anthropic `messages` · Gemini `generateContent`

## 架构

```
settings.llm.apiPath (用户默认)
  → hydrateReasoningOptionsFromStorage (callLLM 缺省)
  → createLLMTransport
      pathId = apiPath | jsonMode→chat_completions (Gemini 保留)
      resolveModelCapability(preferredSurface=pathId)
      buildBodyForApiPath + buildFullApiUrl
  → fetch(fullUrl, protocol headers)
  → stream/non-stream parse per surface
```

## Surfaces / 路径

| Path id              | URL 规则                                         | 推理字段（启用时）                                                      |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------------- |
| `chat_completions`   | `{endpoint}/chat/completions`                    | OpenAI: `reasoning_effort`；Claude: `thinking`；Gemini 网关 dual fields |
| `responses`          | `{endpoint}/responses`                           | `reasoning: { effort }`                                                 |
| `anthropic_messages` | `{endpoint}/messages`                            | `thinking.budget_tokens` + `anthropic-version` / `x-api-key`            |
| `gemini_generate`    | `{origin}/v1beta/models/{model}:generateContent` | `thinkingConfig` + `x-goog-api-key`                                     |

关闭推理：mapper 返回 `{}`，不写字段。

## 设置 UI

系统设置 → AI 模型与连接：**API Endpoint** 右侧 **API 路径** 下拉，下方 **完整 URL** 预览（`buildFullApiUrl`）。  
配置持久化字段：`LLMProviderConfig.apiPath`。

## 禁止 label 假实现

- 某 surface 的 `supportsReasoning: true` **必须** 带 `mapRequest`
- UI：`shouldShowReasoningControls` = supportsReasoning && mapRequest
- Claude / Gemini 均有真实 body builder；网关 400 时走明确错误文案

## 默认 preferredSurface（Registry，可被用户 apiPath 覆盖）

| 族                      | Registry 默认 preferredSurface |
| ----------------------- | ------------------------------ |
| OpenAI o-series / GPT-5 | `responses`                    |
| Grok / DeepSeek / Hy3   | `chat_completions`             |
| Claude                  | `anthropic_messages`           |
| Gemini                  | `gemini_generate`              |

用户在设置里选的 `apiPath` 作为 `preferredSurface` 传入 resolve（路径与 body 一致）。

## 可靠性规则

| 规则                 | 行为                                                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| jsonMode             | **Responses** 且 `supportsStructuredOutput` → `text.format: { type: 'json_object' }`；否则 chat + `response_format`；Gemini → mime type |
| 路径 404/unsupported | 一次性回退 `chat_completions`                                                                                                           |
| 模型 id 别名         | `normalizeModelIdForCapability`（如 `5.6-terra` → `gpt-5.6-terra`）                                                                     |
| 推理正文隔离         | 最终 `content` 不含 reasoning 通道；Deep Chat 可折叠展示                                                                                |
| Responses store      | 默认 `store: false`（BYOK）；可选 `store: true` + `previous_response_id`                                                                |

## Responses 子集 vs 官方全量

详见 **`2026-07-24-responses-capability-roadmap.md`**。当前已实现文本 + 推理 + structured（text.format）+ tools/vision/previous_response_id **请求管道**；agent 循环与 built-in tools 运行时未做。

## Hydrate 范围（文档约定）

`hydrateReasoningOptionsFromStorage` 对 **所有** `callLLM` 调用生效（非仅 playground）：

- 缺省时注入：`reasoningPrefs`、`modelsEntry`、`apiPath`
- 显式传入的 options 字段优先（Deep Chat 会话覆盖等）
- **不**收窄为 playground-only：分析等模块同样需要全局默认路径与推理偏好

## 代码入口

- `src/services/modelCapability/apiPaths.ts` — 路径 id / URL 拼接
- `src/services/modelCapability/protocolBodies.ts` — 各路径 body
- `src/services/modelCapability/protocolParse.ts` — Anthropic / Gemini 解析
- `src/services/modelCapability/mappers.ts` — 推理字段 mapper
- `src/services/modelCapability/registry.ts` — 多 surface 目录
- `src/services/llmService.ts` — transport + hydrate + stream（含 reasoning 通道回调）
- `src/components/settings/systemSettings.*` — Endpoint + 路径 UI
