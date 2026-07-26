# Appendix: Model Reasoning ↔ Gateway Field Map

**Date:** 2026-07-23  
**Status:** Verified (live probe against project new-api; key-scoped model catalog)  
**Gateway target:** OpenAI-compatible `POST {endpoint}/chat/completions` (SOPs default: `https://new.hongecb.store/v1`)

### Live probes

```bash
npm run probe:reasoning   # reasoning_effort on/off samples
npm run probe:chat        # plain / max_tokens / max_completion_tokens / json_object / stream
npm run probe:responses   # Responses surface matrix
```

### probe:chat live matrix (2026-07-24 · new.hongecb.store)

Catalog on key: `deepseek-v4-flash`, `claude-sonnet-4-5-20250929`, `grok-4.5`, `hy3-preview`.  
Probed preferred subset (deepseek / grok):

| Model | plain | max_tokens | max_completion_tokens | json_object | reasoning_effort=low | stream |
| ----- | ----- | ---------- | --------------------- | ----------- | -------------------- | ------ |
| deepseek-v4-flash | OK | OK | OK | OK | OK | OK |
| grok-4.5 | OK | OK | OK | OK | OK | OK |

Notes:

- Both accept **either** `max_tokens` or `max_completion_tokens` on this gateway (client still prefers completion tokens for OpenAI-reasoning models).
- Stream SSE received (chunks ≥ 3).
- Claude / hy3 present on catalog but not in preferred probe slice; re-run with broader filter if channel validation needed (CC-P1-8).

## Why gateway logs may show no reasoning intensity

Product default is **`reasoningPrefs.enabled: false`**. The mapper returns `{}` when off, so the HTTP body **does not include** `reasoning_effort` at all. That is intentional (fail-closed / no blind fields), not a missing implementation.

To see the field on the gateway:

1. Model id must match allowlist with `mapRequest` (e.g. `deepseek-v4-flash`, `grok-4.5`, `o3-mini`).
2. User must **enable** reasoning (settings global + Save, or Deep Chat session checkbox).
3. Inspect request JSON for top-level `"reasoning_effort":"low"|"medium"|"high"`.

If the model is not allowlisted, or the checkbox is off, logs will never show intensity — correctly.

## Policy

| Rule                                    | Behavior                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Unknown model id                        | No UI, no request fields                                                                                  |
| Registry match **without** `mapRequest` | `supportsReasoning` may be true for labeling only; **UI hidden**; no request fields                       |
| Registry match **with** `mapRequest`    | Settings + Deep Chat can show controls; body gets mapper output only when enabled                         |
| User turns reasoning **off**            | Mapper returns `{}` — **omit** `reasoning_effort` (do not send false/none)                                |
| Stream isolation                        | Only `delta.content` / `message.content` enter final text; `reasoning_content` is ignored by `llmService` |

## Current catalog

Full flagship table (OpenAI GPT-5.x / o-series, Grok, DeepSeek, Claude, Gemini, Qwen, Kimi, GLM…):

→ **`docs/superpowers/specs/model-capability-catalog-2026.md`**

Rules source: `src/services/modelCapability/registry.ts`

### control tier (UI + `reasoning_effort`)

Enterprise closed-loop (product axis + per-model allowlist + nearest clamp + requested/effective):  
→ **`docs/superpowers/specs/2026-07-26-reasoning-effort-closed-loop-design.md`**

| Family          | Patterns (summary)                                  | Effort allowlist (summary) | Probe / basis                |
| --------------- | --------------------------------------------------- | -------------------------- | ---------------------------- |
| OpenAI o-series | `o1*`, `o3*`, `o4-mini*` (tight)                    | low…max (flagship)         | OpenAI Reasoning docs        |
| OpenAI GPT-5    | `gpt-5`, `gpt-5.1`…`gpt-5.6`, `gpt-5-*`             | low…max (flagship)         | OpenAI Reasoning docs        |
| xAI Grok-4.5    | `grok-4.5*`                                         | low\|medium\|high          | xAI docs + live gateway      |
| xAI Grok other  | `grok-4*`, `grok-3*`                                | triad / multi-agent xhigh  | **Live** `grok-4.5`          |
| DeepSeek        | `deepseek-v4*`, `deepseek-r1*`, `deepseek-reasoner` | triad                      | **Live** `deepseek-v4-flash` |
| Hy3             | `hy3-*`                                             | triad                      | **Live** `hy3-preview`       |

### Real mappers (UI on) vs channel risk

Claude / Gemini / Kimi / Qwen 等均有 **真实 mapRequest**（非 label 假实现）。  
**Claude on this new-api:** plain 200；`thinking` 字段当前 channel 可能 **400**——客户端仍会发送标准 Anthropic thinking；需 channel 开启 extended thinking。

Disabled / rejected patterns (do not reintroduce without review):

- `*r1*` as a lone pattern (false positives on unrelated ids)
- bare `o3*` / `o1*` / `gpt-*` / `claude-*` (too broad)

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
- Body merge: `src/services/modelCapability/applyToRequest.ts` + `protocolBodies.ts`
- Auto global prefs / apiPath: `hydrateReasoningOptionsFromStorage` in `src/services/llmService.ts`
  - **Scope:** all `callLLM` callers (not playground-only). Explicit options win over storage.
- Stream isolation: final answer uses `getStreamDelta` (content only); reasoning channel via
  `getReasoningStreamDelta` → `onStreamUpdate.reasoningDelta` (Deep Chat collapsible panel).
- Multi-path: `apiPaths.ts` + settings `llm.apiPath` (see multi-protocol design)
- Responses parity roadmap: `docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md`
- Responses structured: `text.format` when `supportsStructuredOutput` (not silent chat-only)

## Live Responses probe (2026-07-24)

```bash
npm run probe:responses
# NEW_API_KEY=… NEW_API_ENDPOINT=https://new.hongecb.store/v1
```

| Date       | Model             | Endpoint          | Case                    | Result                                      |
| ---------- | ----------------- | ----------------- | ----------------------- | ------------------------------------------- |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | plain text              | **pass** 200                                |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | reasoning.effort=low    | **pass** 200                                |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | text.format json_object | **pass** 200                                |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | store=true              | **fail** 400 stored Responses not supported |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | previous_response_id    | **fail** 400 not supported                  |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | stream SSE              | **pass** hasTextDelta                       |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | re-probe store/previous | **pass** 200 (gateway may have improved)    |
| 2026-07-24 | deepseek-v4-flash | new.hongecb.store | tools function schema   | **pass** 200                                |

**Client adaptation:** Registry **fail-closes** `supportsStore` / `supportsPreviousResponseId` (badges stay honest). Tool loop uses **stateless item replay** without store. When capability is later enabled, chain fields are sent; on 400 Deep Chat still clears chain and retries without them.
