# Dual-Track API Convergence Spec (Responses + Chat Completions + Deep Chat)

**Date:** 2026-07-25  
**Status:** Active — infinite convergence toward official Create surfaces  
**Product stance:** Dual independent Create clients; transport fallback only; Deep Chat is the primary product workbench for validation.

## 1. Must-have Create fields

### 1.1 Chat Completions (`POST …/chat/completions`)

Wire-level emit when configured (already largely done — keep green):

- model, messages (roles + content string|parts), stream, stream_options
- temperature, max_tokens / max_completion_tokens (policy)
- response_format json_object | json_schema
- tools, tool_choice, parallel_tool_calls + tool loop
- vision image_url parts
- top_p, frequency_penalty, presence_penalty, stop, n, seed, logit_bias, logprobs, top_logprobs
- store, metadata, prompt_cache_key, safety_identifier, user, service_tier
- modalities, audio, prediction, web_search_options
- reasoning_effort (capability mapper)
- onUsage / onCompletion

### 1.2 Responses (`POST …/responses`) — **this sprint must-have pass-through**

Core (implemented): model, input, instructions, stream, max_output_tokens, temperature (when not ignored), text.format, tools, tool_choice, parallel_tool_calls, previous_response_id, store, service_tier, reasoning

**Must add (client emit when set):**

| Official field    | LLMOptions / extras | Notes                   |
| ----------------- | ------------------- | ----------------------- |
| top_p             | topP                | Sampling                |
| top_logprobs      | topLogprobs         |                         |
| metadata          | metadata            |                         |
| prompt_cache_key  | promptCacheKey      |                         |
| safety_identifier | safetyIdentifier    |                         |
| user              | user                | Deprecated but official |
| truncation        | truncation          | e.g. auto \| disabled   |
| background        | background          | boolean                 |
| max_tool_calls    | maxToolCalls        | built-in tools budget   |
| include           | include             | string[] extra include  |

**Fail-closed / gateway-dependent (keep):** store + previous_response_id only when capability allows; default registry false.

## 2. Deep Chat workbench requirements

| Requirement                            | Acceptance                                                                                      |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Dual-path tools                        | enableBusinessTools injects tools on **both** chat_completions and responses when supportsTools |
| Capability honesty                     | Settings badges / path hints reflect tools+vision+structured on active path                     |
| Path docs                              | No “tools only on Responses” copy                                                               |
| No new settings for every Create field | Wire via LLMOptions is enough; optional advanced panel later                                    |

## 3. Cannot complete (hard blockers)

| Item                                            | Reason                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| store/previous always 200 on arbitrary gateway  | Requires server stored Responses; probe new.hongecb returns 400 |
| Built-in web_search/file_search product results | Needs OpenAI/compatible backend assets (vector stores, search)  |
| conversation object product                     | Separate conversation state API                                 |
| Realtime WebSocket                              | Different transport                                             |
| Batch / Fine-tune / Assistants                  | Separate APIs                                                   |
| Seed cross-provider determinism                 | Official best-effort only                                       |
| Pixel E2E live model in CI                      | Non-goal; unit + structural + optional probe                    |

## 4. Evidence

- Unit: `buildResponsesBody` asserts real outbound keys for new pass-through fields
- Unit: existing responses tool loop / parse suite stays green
- Structural: `tools/verify-responses-create-parity.mts` updated
- Optional: `npm run probe:responses` when key present

## 5. Checkpoints

1. Spec (this file)
2. Responses pass-through fields + tests
3. Deep Chat copy/capability consistency
4. Verification logs under scratch
