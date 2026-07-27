# Task 7 Report: Unit/integration green + E2E dual-button pins + manual matrix

## Summary

Greened deep-chat unit/integration after vision dual-button fallout, pinned send/upload e2e selectors to exclude `#upload-images-button`, added dual-button geometry helper + tests, fixed lint complexity from vision helpers, documented manual E1–E13 as pending human.

## Fixes

### 1. `querySubmitInsideEndButton` (jsdom ShadowRoot)

Multi-branch CSS selector list failed under jsdom ShadowRoot (`querySelector` returned null even when a later branch matched). Simplified to:

```ts
'.input-button.inside-end:not(#upload-images-button)'
```

Restored stop-button unit tests (`data-deep-chat-stop-active` / aria-label).

### 2. Lint warning gate (baseline 0)

Extracted helpers so complexity / max-lines stay under thresholds:

- `handleRequest.ts`: `paintSettledGenerationChrome`, `reportDeepChatRequestFailure`
- `visionAttachments.ts`: `validateVisionCandidateType`, `checkVisionCandidateSize`, `gateVisionCandidates`
- `conversationContext.ts`: `buildAssistantStoredMessage`, `stampUserAttachmentMeta`

### 3. E2E

- All send-button queries use `:not(#upload-images-button)`.
- `getDualButtonGeometry` helper + non-vision hide pin + vision dual-button pin (seeds `gpt-5` for registry vision match; soft manual-fallback annotation if upload never materializes).
- Empty-stream error assertion updated to llmService `throwIfChatEmptyBody` copy.

## Command results

| Command | Result |
| --- | --- |
| `npx vitest run src/modules/app_center/views/playground/deep-chat` | **190 passed** (19 files), ~12–15s |
| `npm run type-check` | **PASS** |
| `npm run lint:warning-gate` | **PASS** `0/0 warning(s)` |
| `npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1` | **18 passed** (~1.6m) |

### E2E dual-button

- Non-vision mock model: upload hidden; send right gap 11±2 — **PASS**
- Vision model (`gpt-5` seed): upload secondary + gap 8±2 + bottom ±2 + bg ≠ send — **PASS** (did not need manual fallback)

## Manual matrix E1–E13 (spec §9.6)

| # | Scenario | Status |
| --- | --- | --- |
| E1 | Vision model → upload + helper visible | **Automated pin covered**; residual visual QA **pending human** |
| E2 | Non-vision → no upload/helper; paste toast | Non-vision hide **automated**; paste toast **pending human** |
| E3 | 5 images → reject count | **pending human** |
| E4 | Single 6MB → reject file | **pending human** |
| E5 | 3 images sum >12MB → reject total | **pending human** (unit covers totals) |
| E6 | Pure image send → success; no base64 in storage; meta line | **pending human** (unit covers meta/no-base64) |
| E7 | Refresh session → no originals; honesty line | **pending human** |
| E8 | Generating → cannot add images | **pending human** |
| E9 | Dark theme readability | **pending human** |
| E10 | Keyboard Tab upload/send; focus-visible | Send/stop keyboard **automated**; upload Tab **pending human** |
| E11 | Skill + 4 thumbs + stop no overlap | **pending human** |
| E12 | Model switch with staged files → one warn | **pending human** (Task 6 residual) |
| E13 | Reduced motion | Send pin reduced-motion **automated**; vision chrome thrash **pending human** |

## Commit

`test(deep-chat): pin vision upload spacing and keep send geometry green`
