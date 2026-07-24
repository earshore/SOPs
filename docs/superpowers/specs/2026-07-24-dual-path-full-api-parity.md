# Dual-Path Full Official API Parity Spec

**Date:** 2026-07-24  
**Status:** Implemented (Create parity sprint 2026-07-24)  
**Standard:** OpenAI official **Create** surfaces — not “product subset”

## Goal

`chat/completions` and `responses` are **independent full protocols**. Fallback is transport-only (404/unsupported path), never an excuse to leave chat incomplete.

| Surface                   | Official target                                           | Fallback role                        |
| ------------------------- | --------------------------------------------------------- | ------------------------------------ |
| `POST …/chat/completions` | Full Create body + stream/non-stream parse + tools loop   | Default / max compatibility          |
| `POST …/responses`        | Full product Responses Create (existing + remaining gaps) | Preferred for GPT-5/o when available |

**Hard blockers (client cannot invent):** Realtime, Batch, Fine-tune, Assistants, Vector store product UI.  
**CRUD:** thin client wrappers exist (`chatCompletionsResource.ts`); **durability** requires gateway support.  
**n>1 policy:** `callLLM` returns `choices[0]` text only; full choices via `onCompletion`.

## Architecture

```
LLMOptions (shared extras)
  → createLLMTransport(pathId)
      → buildBodyForApiPath
           chat  → buildChatCompletionsBody  (full Create fields)
           resp  → buildResponsesBody
  → fetch
  → parse stream/non-stream
  → tool loop if enableToolLoop + tools + executeTool
       chat: messages[] with tool_calls / role=tool
       resp: previous_response_id or item replay
```

## Chat Completions Create — required parity

### Messages

- Roles: `system` | `developer` | `user` | `assistant` | `tool`
- `content`: `string | null | ContentPart[]`
- Content parts: `text`, `image_url` (chat shape), future audio deferred to matrix `partial`
- Assistant: `tool_calls[]`, `refusal`
- Tool: `tool_call_id`, `content`

### Request body fields (when set on LLMOptions)

- Core: model, messages, stream, stream_options, temperature, max_completion_tokens / max_tokens policy
- Structured: response_format json_object | json_schema
- Tools: tools, tool_choice, parallel_tool_calls
- Sampling: top_p, frequency_penalty, presence_penalty, stop, n, seed, logit_bias, logprobs, top_logprobs
- Identity/store: service_tier, store, metadata, prompt_cache_key, safety_identifier
- Reasoning (capability): reasoning_effort / thinking / etc. via mapRequest

### Response / stream

- choices[0] message content + tool_calls + refusal
- SSE delta.content + delta.tool_calls accumulation
- finish_reason tool_calls / stop / length
- usage when stream_options.include_usage

### Tool loop (chat)

- enableToolLoop + tools + executeTool works on **chat_completions**
- Multi-round: append assistant tool_calls message + tool results; re-POST until final text or maxToolRounds

## Responses — remaining gaps this sprint

- Ensure tools/tool_choice already work (keep)
- parallel_tool_calls pass-through if missing
- Document store/previous_id fail-closed gateway reality
- No regression on stream-first hybrid

## Capability registry

- chat surface: `supportsTools: true`, `supportsVision: true`, `supportsStructuredOutput: true` for OpenAI-compatible effort models
- Claude/Gemini chat surfaces: tools/vision as gateway-dependent but **do not block** pass-through when caller supplies fields

## Checkpoints

| CP  | Deliverable                             | Verify                                                  |
| --- | --------------------------------------- | ------------------------------------------------------- |
| CP1 | ChatMessage + content parts types       | unit types + normalizeMessages                          |
| CP2 | tools/tool_choice/parallel on chat body | applyToRequest + stream test body assert                |
| CP3 | chat tool loop                          | llmService.stream.test tool loop on chat path           |
| CP4 | vision parts → chat image_url           | applyToRequest test                                     |
| CP5 | sampling/identity fields                | body builder tests                                      |
| CP6 | unban tools on chat; settings/docs      | registry tests + no LLM_TOOLS_PATH_UNSUPPORTED for chat |
| CP7 | Responses parallel_tool_calls + matrix  | tests                                                   |
| CP8 | full unit suite + type-check            | **130 tests pass; tsc OK (2026-07-24)**                 |

## Non-goals

- Reimplement OpenAI dashboard
- Force store:true on incompatible gateways
- Audio modalities product UI
