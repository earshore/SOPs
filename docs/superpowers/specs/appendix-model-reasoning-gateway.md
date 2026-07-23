# Appendix: Model Reasoning ↔ Gateway Field Map

**Date:** 2026-07-23  
**Status:** Provisional (not live-probed against production new-api in this branch)  
**Gateway target:** OpenAI-compatible `POST {endpoint}/chat/completions` (SOPs default: new-api)

## Policy

| Rule                                    | Behavior                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| Unknown model id                        | No UI, no request fields                                                            |
| Registry match **without** `mapRequest` | `supportsReasoning` may be true for labeling only; **UI hidden**; no request fields |
| Registry match **with** `mapRequest`    | Settings + Deep Chat can show controls; body gets mapper output only when enabled   |

## Current allowlist (`src/services/modelCapability/registry.ts`)

| Pattern                                              | mapRequest | Request fields when enabled                     |
| ---------------------------------------------------- | ---------- | ----------------------------------------------- |
| `o1`, `o1-mini`, `o1-preview`, `o1-pro`, `o1-mini-*` | yes        | `{ reasoning_effort: 'low'\|'medium'\|'high' }` |
| `o3`, `o3-mini`, `o3-pro`, `o3-mini-*`               | yes        | same                                            |
| `deepseek-r1`, `deepseek-reasoner`                   | **no**     | none until verified                             |

Disabled / rejected patterns (do not reintroduce without review):

- `*r1*` (false positives)
- bare `o3*` / `o1*` (too broad)

## Verification checklist (ops / next RC)

For each production model that should expose reasoning UI:

1. Call `GET {endpoint}/models` — confirm id string.
2. Call `POST .../chat/completions` with `reasoning_effort: "low"` (and off case with field omitted).
3. Confirm HTTP 200 and stream deltas: `content` vs any `reasoning_content`.
4. Update registry `mapRequest` only after step 2–3 pass; add a row here with **date + result**.

### Probe log (fill when tested)

| Date | Model id    | Endpoint          | Field(s)           | Off behavior | Stream reasoning channel | Result                  |
| ---- | ----------- | ----------------- | ------------------ | ------------ | ------------------------ | ----------------------- |
| —    | o3-mini     | new.hongecb.store | `reasoning_effort` | omit         | `reasoning_content`?     | **TODO**                |
| —    | deepseek-r1 | new.hongecb.store | TBD                | TBD          | TBD                      | **blocked until probe** |

## Related code

- Resolve: `src/services/modelCapability/resolve.ts`
- Body merge: `src/services/modelCapability/applyToRequest.ts`
- Auto global prefs: `hydrateReasoningOptionsFromStorage` in `src/services/llmService.ts`
