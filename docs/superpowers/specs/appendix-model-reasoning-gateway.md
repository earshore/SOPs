# Appendix: Model Reasoning ↔ Gateway Field Map

**Date:** 2026-07-23  
**Status:** Verified (live probe against project new-api; key-scoped model catalog)  
**Gateway target:** OpenAI-compatible `POST {endpoint}/chat/completions` (SOPs default: `https://new.hongecb.store/v1`)

## Policy

| Rule                                    | Behavior                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Unknown model id                        | No UI, no request fields                                                                                  |
| Registry match **without** `mapRequest` | `supportsReasoning` may be true for labeling only; **UI hidden**; no request fields                       |
| Registry match **with** `mapRequest`    | Settings + Deep Chat can show controls; body gets mapper output only when enabled                         |
| User turns reasoning **off**            | Mapper returns `{}` — **omit** `reasoning_effort` (do not send false/none)                                |
| Stream isolation                        | Only `delta.content` / `message.content` enter final text; `reasoning_content` is ignored by `llmService` |

## Current allowlist (`src/services/modelCapability/registry.ts`)

| Pattern                                              | mapRequest | Request fields when enabled                     | Probe basis                                                 |
| ---------------------------------------------------- | ---------- | ----------------------------------------------- | ----------------------------------------------------------- |
| `o1`, `o1-mini`, `o1-preview`, `o1-pro`, `o1-mini-*` | yes        | `{ reasoning_effort: 'low'\|'medium'\|'high' }` | OpenAI-compatible contract; not on 2026-07-23 token catalog |
| `o3`, `o3-mini`, `o3-pro`, `o3-mini-*`               | yes        | same                                            | same                                                        |
| `deepseek-v4-flash`, `deepseek-v4-flash-*`           | yes        | same                                            | **Live 2026-07-23**                                         |
| `grok-4.5`, `grok-4.5-*`                             | yes        | same                                            | **Live 2026-07-23**                                         |
| `deepseek-r1`, `deepseek-reasoner`                   | **no**     | none                                            | ids not on catalog this probe                               |

Disabled / rejected patterns (do not reintroduce without review):

- `*r1*` (false positives)
- bare `o3*` / `o1*` (too broad)

## Verification checklist

For each production model that should expose reasoning UI:

1. Call `GET {endpoint}/models` — confirm id string.
2. Call `POST .../chat/completions` with `reasoning_effort: "low"` and off case with field **omitted**.
3. Confirm HTTP 200 and stream deltas: `content` vs `reasoning_content`.
4. Update registry `mapRequest` only after step 2–3 pass; add a row in the probe log.

### Probe log

| Date       | Model id                   | Endpoint          | Field(s)           | Off behavior                                      | Stream reasoning channel                                           | Result                                                            |
| ---------- | -------------------------- | ----------------- | ------------------ | ------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 2026-07-23 | deepseek-v4-flash          | new.hongecb.store | `reasoning_effort` | omit → 200                                        | `delta.reasoning_content` + non-stream `message.reasoning_content` | **pass**                                                          |
| 2026-07-23 | grok-4.5                   | new.hongecb.store | `reasoning_effort` | omit → 200; effort raises `reasoning_tokens`      | `reasoning_content` present                                        | **pass**                                                          |
| 2026-07-23 | claude-sonnet-4-5-20250929 | new.hongecb.store | n/a                | plain chat 400 (auth/catalog, not field-specific) | n/a                                                                | **skip** (not a reasoning allowlist candidate)                    |
| 2026-07-23 | o3-mini                    | new.hongecb.store | —                  | —                                                 | —                                                                  | **not on key catalog**; keep OpenAI mapRequest for when available |
| 2026-07-23 | deepseek-r1                | new.hongecb.store | —                  | —                                                 | —                                                                  | **not on key catalog**; no mapRequest                             |

### Probe notes

- Token used for probe had 4 models: `deepseek-v4-flash`, `claude-sonnet-4-5-20250929`, `grok-4.5`, `hy3-preview`.
- Harder prompts on deepseek-v4-flash with `reasoning_effort=low` produced non-empty `reasoning_content` and `usage.completion_tokens_details.reasoning_tokens`.
- Invalid `reasoning_effort` values were not hard-failed by gateway (still 200); client still only sends allowlisted low/medium/high.
- Re-probe when expanding catalog or adding deepseek-r1 / o-series ids to this gateway.

## Related code

- Resolve: `src/services/modelCapability/resolve.ts`
- Body merge: `src/services/modelCapability/applyToRequest.ts`
- Auto global prefs: `hydrateReasoningOptionsFromStorage` in `src/services/llmService.ts`
- Stream isolation: `getStreamDelta` only reads `content` (see `llmService.stream.test.ts`)
