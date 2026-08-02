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

| Model             | plain | max_tokens | max_completion_tokens | json_object | reasoning_effort=low | stream |
| ----------------- | ----- | ---------- | --------------------- | ----------- | -------------------- | ------ |
| deepseek-v4-flash | OK    | OK         | OK                    | OK          | OK                   | OK     |
| grok-4.5          | OK    | OK         | OK                    | OK          | OK                   | OK     |

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

| Family          | Patterns (summary)                                                      | Effort allowlist (summary)                                                            | Probe / basis                                                        |
| --------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| OpenAI o-series | `o1*`, `o3*`, `o4-mini*` (tight)                                        | low\|medium\|high（官方枚举 minimal\|low\|medium\|high）                              | OpenAI Reasoning docs                                                |
| OpenAI GPT-5    | `gpt-5`, `gpt-5.1`…`gpt-5.6`, `gpt-5-*`                                 | low…max (flagship)                                                                    | OpenAI Reasoning docs                                                |
| xAI Grok-4.5    | `grok-4.5*`                                                             | low\|medium\|high                                                                     | xAI docs + live gateway                                              |
| xAI Grok other  | `grok-4.1*`, `grok-4.3*`, `grok-4.20-multi-agent*`, `grok-4*`           | 4.1: low\|medium\|high；4.3: none\|low\|medium\|high；4: high；multi-agent: low…xhigh | xAI docs（grok-3 无官方 effort → fail-closed）                       |
| DeepSeek        | `deepseek-v4-pro*`, `deepseek-v4-*`                                     | low\|high\|max + `thinking.type`                                                      | DeepSeek Thinking Mode docs + live `deepseek-v4-pro`                 |
| DeepSeek chat   | `deepseek-chat*`, `deepseek-v3*`                                        | `thinking.type` 开关（默认关）                                                        | DeepSeek V3.2+ thinking 开关 docs                                    |
| Kimi            | `kimi-k3*`（effort）；`kimi-k2` / `kimi-k2.5*` / `kimi-k2.6*`（toggle） | K3: low\|high\|max；K2.x: `thinking.type` 开关（默认开）                              | Moonshot 推理强度/思考模型 docs                                      |
| GLM             | `glm-5.2*`                                                              | max\|xhigh\|high\|medium\|low + `thinking.type`                                       | Zhipu 深度思考 docs + live `glm-5.2`                                 |
| GLM toggle      | `glm-5.1*`, `glm-4.5*`, `glm-4.6*`, `glm-4.7*`                          | `thinking.type` 开关（默认开）                                                        | Zhipu 深度思考/思考模式 docs（5.1 无 effort；Z1 fail-closed）        |
| MiniMax         | `minimax-m2.7*`                                                         | low\|medium\|high                                                                     | Live `minimax-m2.7`（max → 400；M3 无推理输出）                      |
| Qwen3           | `qwen3*`                                                                | `thinking.type` 开关（默认开；原生 enable_thinking）                                  | Qwen3 混合思考 docs（OpenAI 兼容端以 thinking.type 发送）            |
| Hy3             | —                                                                       | —                                                                                     | Live `hy3` / `hy3-preview`：字段被接受但**无推理输出** → fail-closed |
| QwQ             | —                                                                       | —                                                                                     | 始终推理无官方开关 → fail-closed                                     |

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

| Date       | Model id                   | Endpoint          | Field(s)                             | Off behavior                                                                                                                      | Stream reasoning channel                                           | Result                                                            |
| ---------- | -------------------------- | ----------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 2026-07-23 | deepseek-v4-flash          | new.hongecb.store | `reasoning_effort`                   | omit → 200                                                                                                                        | `delta.reasoning_content` + non-stream `message.reasoning_content` | **pass**                                                          |
| 2026-07-23 | grok-4.5                   | new.hongecb.store | `reasoning_effort`                   | omit → 200; effort raises `reasoning_tokens`                                                                                      | `reasoning_content` present                                        | **pass**                                                          |
| 2026-07-23 | claude-sonnet-4-5-20250929 | new.hongecb.store | n/a                                  | plain chat 400 (auth/catalog, not field-specific)                                                                                 | n/a                                                                | **skip** (not a reasoning allowlist candidate)                    |
| 2026-07-23 | o3-mini                    | new.hongecb.store | —                                    | —                                                                                                                                 | —                                                                  | **not on key catalog**; keep OpenAI mapRequest for when available |
| 2026-07-23 | deepseek-r1                | new.hongecb.store | —                                    | —                                                                                                                                 | —                                                                  | **not on key catalog**; no mapRequest                             |
| 2026-08-02 | glm-5.2                    | new.hongecb.store | `reasoning_effort` + `thinking.type` | omit / effort=none → 无思考；low/medium/high/xhigh/max/minimal → 200 且有 `reasoning_content`；thinking.disabled 被忽略（仍思考） | `reasoning_content` present                                        | **pass**（省略字段即关闭）                                        |
| 2026-08-02 | glm-5.1                    | new.hongecb.store | `reasoning_effort` / `thinking.type` | omit → 默认思考；effort=low/medium → 200（思考）；effort=max → **400**；thinking.disabled → 关闭思考                              | `reasoning_content` present                                        | **partial**（无 effort；仅 thinking.type 可关）                   |
| 2026-08-02 | deepseek-v4-pro            | new.hongecb.store | `thinking.type` + `reasoning_effort` | 仅 effort（low/medium/max）→ 200 但无思考；`thinking.type=enabled`（+effort）→ 有 `reasoning_content`                             | `reasoning_content` present                                        | **pass**（需 thinking.type 才生效）                               |
| 2026-08-02 | deepseek-v4-flash          | new.hongecb.store | `thinking.type` + `reasoning_effort` | 全部 200；无任何字段产生 `reasoning_content`                                                                                      | 无 reasoning 输出                                                  | **watch**（channel 无思考输出，字段被接受）                       |
| 2026-08-02 | minimax-m2.7               | new.hongecb.store | `reasoning_effort`                   | low/medium/high → 200；max → **400**；消息始终带 `reasoning` 字段                                                                 | `reasoning` key                                                    | **pass**（low\|medium\|high）                                     |
| 2026-08-02 | minimax-m3 / hy3           | new.hongecb.store | 各字段                               | 全部 200；无任何字段产生推理输出                                                                                                  | 无 reasoning 输出                                                  | **fail**（非推理模型）                                            |
| 2026-08-02 | qwen3.7-plus / qwen3.7-max | new.hongecb.store | —                                    | 404 No active credentials for provider: openai                                                                                    | n/a                                                                | **skip**（无可用 channel）                                        |
| 2026-08-02 | qwen3-coder-next           | new.hongecb.store | 各字段                               | 全部 400 Improperly formed request（含 omit）                                                                                     | n/a                                                                | **skip**（channel 异常）                                          |

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
