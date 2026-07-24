# Chat Completions True-Full Parity Spec

**Date:** 2026-07-24  
**Status:** Implemented (client true-full Create + CRUD; evidence below)  
**Standard:** OpenAI official Chat Completions **Create** + **resource CRUD** client surface  
**Code root:** `src/services/llmService.ts`, `src/services/modelCapability/*`

## Definition of “真全量”

### In scope (must implement + prove)

1. **POST Create** — every documented body field when caller supplies it (pass-through):
   - Core: model, messages, stream, stream_options, temperature, max_tokens / max_completion_tokens
   - Structured: response_format (json_object | json_schema)
   - Tools: tools, tool_choice, parallel_tool_calls + multi-round tool loop
   - Multimodal: content parts (text, image_url); input_audio part type accepted
   - Sampling: top_p, frequency_penalty, presence_penalty, stop, n, seed, logit_bias, logprobs, top_logprobs
   - Identity/store: service_tier, store, metadata, prompt_cache_key, safety_identifier, user
   - Extended: modalities, audio, prediction, web_search_options
   - Reasoning (capability mapper): reasoning_effort / thinking / etc.
2. **Create response / stream**
   - Text + tool_calls + stream delta merge + empty-body diagnostics
   - **usage** exposed via `onUsage` callback (stream + non-stream)
   - **choices** full array available via `onCompletion` optional callback (default still returns primary text)
3. **Resource CRUD client** (HTTP verbs against `{endpoint}/chat/completions[...]`)
   - GET list, GET by id, POST update, DELETE — thin authenticated client; gateways may 404

### Explicitly cannot complete in this SPA (with reasons)

| Item                                           | Reason                                                                                                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI-hosted stored completion durability** | CRUD only talks to **user’s BYOK endpoint**. If the gateway is not OpenAI and does not implement stored completions, methods return ApiError — we cannot invent server storage. |
| **Realtime / WebRTC audio duplex**             | Different API surface (`/realtime`), not Chat Completions Create.                                                                                                               |
| **Batch / Fine-tune / Assistants**             | Separate APIs; not Chat Completions.                                                                                                                                            |
| **Gateway channel quirks**                     | Claude/Gemini fields on chat are best-effort mappers; 400 is environmental, not client omission of OpenAI fields.                                                               |
| **Deterministic seed across providers**        | Official docs already say seed is best-effort; we pass the field only.                                                                                                          |

## Architecture

```
LLMOptions extras
  → createLLMTransport(chat_completions)
      → buildChatCompletionsBody (all Create fields)
  → fetch
  → parse + onUsage / onCompletion
  → chat tool loop (stream-first or non-stream)

list/get/update/deleteChatCompletion(endpoint, apiKey, ...)
  → fetch {base}/chat/completions[/{id}]
```

## Evidence required

| Proof                                         | Command / artifact                                                 |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Unit: body emits all configured Create keys   | `tools/verify-chat-create-parity.mts` + `chatCreateParity.test.ts` |
| Unit: callLLM posts tools/sampling/extended   | `llmService.stream.test.ts`                                        |
| Unit: stream tool loop via callLLM            | `llmService.stream.test.ts`                                        |
| Unit: onUsage from non-stream body            | `llmService.stream.test.ts`                                        |
| Unit: CRUD client builds correct URLs/methods | `chatCompletionsResource.test.ts`                                  |
| Live smoke (optional key)                     | `npm run probe:chat`                                               |

## Checkpoints

- CP1 Spec committed
- CP2 Extended Create fields wired end-to-end
- CP3 onUsage + onCompletion
- CP4 Stream tool loop test via callLLM
- CP5 CRUD client + tests
- CP6 Structural verifier green + unit suite green
