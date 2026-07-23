# 真·多协议 LLM 传输设计

**日期：** 2026-07-23  
**状态：** Implemented  
**范围：** `chat/completions` + `responses` 双 surface；Claude / Gemini 真实 mapper（非 label 假实现）

## 架构

```
resolveModelCapability(model)
  → preferredSurface + mapRequest (per surface)
buildRequestBodyForSurface
  → path: /chat/completions | /responses
  → body: surface-specific fields
fetch(endpoint + path)
stream/non-stream parse (completions | responses)
```

## Surfaces

| Surface            | Path                | 推理字段（启用时）                                                                                                             |
| ------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `chat_completions` | `/chat/completions` | OpenAI: `reasoning_effort`；Claude: `thinking.budget_tokens`；Gemini: `reasoning_effort` + `extra_body.google.thinking_config` |
| `responses`        | `/responses`        | `reasoning: { effort }`                                                                                                        |

关闭推理：mapper 返回 `{}`，不写字段。

## 禁止 label 假实现

- 某 surface 的 `supportsReasoning: true` **必须** 带 `mapRequest`
- UI：`shouldShowReasoningControls` = supportsReasoning && mapRequest
- Claude / Gemini 均有真实 mapper；网关 400 时走明确错误文案，而不是静默隐藏能力

## 默认 preferredSurface

| 族                      | 默认                                        |
| ----------------------- | ------------------------------------------- |
| OpenAI o-series / GPT-5 | `responses`（completions 为备选 surface）   |
| Grok / DeepSeek / Hy3   | `chat_completions`（responses 备选）        |
| Claude / Gemini         | `chat_completions`（Anthropic/Gemini 字段） |

## 实测（new.hongecb.store）

| 路径                           | 模型                         | 结果                                                  |
| ------------------------------ | ---------------------------- | ----------------------------------------------------- |
| `/responses` + reasoning       | grok-4.5                     | 200，含 reasoning output item                         |
| `/chat/completions` + effort   | grok-4.5 / deepseek-v4-flash | 200                                                   |
| `/chat/completions` + thinking | claude-sonnet-4-5            | 当前 channel 可能 400（客户端仍发标准 thinking 字段） |
| gemini-\*                      | —                            | 当前 key 403（无模型权限）                            |

## 代码入口

- `src/services/modelCapability/types.ts` — ApiSurface
- `src/services/modelCapability/mappers.ts` — 各协议 mapper
- `src/services/modelCapability/registry.ts` — 多 surface 目录
- `src/services/modelCapability/applyToRequest.ts` — body builders
- `src/services/modelCapability/responsesParse.ts` — Responses 解析
- `src/services/llmService.ts` — 按 surface 发请求
