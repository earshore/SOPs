# Model Reasoning Capability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fail-closed Model Capability Registry, merge it with `/v1/models`, map reasoning prefs into real chat/completions fields, expose **system-settings global defaults first**, then **Deep Chat session overrides**.

**Architecture:** Static TS registry + pure resolvers; `llmService` applies mapper output to request bodies and keeps `reasoning_content` out of final text; settings store `reasoningPrefs`; Deep Chat stores optional `thread.reasoning` and resolves session > global > capability defaults.

**Tech Stack:** TypeScript, existing `llmService` / system settings Alpine module, Deep Chat controller, Vitest.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-23-model-reasoning-capability-design.md`
- Unknown models: **fail-closed** (`supportsReasoning: false`)
- No `mapRequest` on matched rule: **never** write reasoning fields to the request
- Do not use system-prompt text as the primary control for thinking intensity
- Prefer object-shaped `models[]` entries after fetch; keep string entries readable
- Default user prefs: `{ enabled: false, effort: 'medium' }` when missing from storage
- Unknown context fallback: **32768** (not 128000) when neither registry nor models provide a value
- Phase order: **P1 settings global + llmService**, then **P2 Deep Chat session override**
- Gateway field names in registry are **provisional** until verified against the project’s new-api; keep mappers isolated for one-line edits

## File map

| Path | Responsibility |
|------|----------------|
| `src/services/modelCapability/types.ts` | Shared types for rules, resolved capability, prefs |
| `src/services/modelCapability/registry.ts` | Static rule list (initial patterns) |
| `src/services/modelCapability/resolve.ts` | Match + merge models metadata + defaults |
| `src/services/modelCapability/prefs.ts` | `resolveEffectiveReasoning`, clamp effort |
| `src/services/modelCapability/applyToRequest.ts` | Merge mapper output into request body |
| `src/services/modelCapability/*.test.ts` | Unit tests |
| `src/services/llmService.ts` | Wire body builder + stream (P1) |
| `src/types/state.d.ts` / services types | Persist prefs; model object shape |
| `src/components/settings/systemSettings.ts` + template | Global UI (P1) |
| `src/modules/.../deep-chat/controller.ts` + template | Session override (P2) |
| `src/modules/.../deep-chat/types.ts` | `DeepChatThread.reasoning?` (P2) |

---

### Task 1: Capability types + pure resolvers (P1 foundation)

**Files:**
- Create: `src/services/modelCapability/types.ts`
- Create: `src/services/modelCapability/registry.ts`
- Create: `src/services/modelCapability/resolve.ts`
- Create: `src/services/modelCapability/prefs.ts`
- Create: `src/services/modelCapability/applyToRequest.ts`
- Create: `src/services/modelCapability/resolve.test.ts`
- Create: `src/services/modelCapability/prefs.test.ts`
- Create: `src/services/modelCapability/applyToRequest.test.ts`

**Interfaces:**
- Produces: `resolveModelCapability`, `resolveEffectiveReasoning`, `applyReasoningToRequestBody`, `ModelCapabilityRule`, `ResolvedModelCapability`, `ReasoningUserPrefs`

- [x] **Step 1: Write failing tests for resolve + prefs + apply**

```ts
// resolve.test.ts (sketch — expand in file)
import { describe, expect, it } from 'vitest';
import { resolveModelCapability } from './resolve';

describe('resolveModelCapability', () => {
  it('fail-closes unknown models', () => {
    const cap = resolveModelCapability({
      provider: 'openai',
      modelId: 'totally-unknown-xyz',
      modelsEntry: undefined,
    });
    expect(cap.supportsReasoning).toBe(false);
    expect(cap.mapRequest).toBeNull();
    expect(cap.contextWindow).toBe(32768);
  });

  it('uses models context when finite and positive', () => {
    const cap = resolveModelCapability({
      provider: 'openai',
      modelId: 'totally-unknown-xyz',
      modelsEntry: { id: 'totally-unknown-xyz', context: 64000 },
    });
    expect(cap.contextWindow).toBe(64000);
    expect(cap.supportsReasoning).toBe(false);
  });
});

// prefs.test.ts
import { resolveEffectiveReasoning } from './prefs';

describe('resolveEffectiveReasoning', () => {
  const capable = {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'] as const,
    defaultEffort: 'medium' as const,
    mapRequest: () => ({ reasoning_effort: 'medium' }),
  };

  it('session enabled false beats global enabled true', () => {
    const r = resolveEffectiveReasoning(
      capable as any,
      { enabled: true, effort: 'high' },
      { enabled: false }
    );
    expect(r).toEqual({ enabled: false, effort: 'off' });
  });
});

// applyToRequest.test.ts
import { applyReasoningToRequestBody } from './applyToRequest';

describe('applyReasoningToRequestBody', () => {
  it('does not write fields when mapRequest is null', () => {
    const body = applyReasoningToRequestBody(
      { model: 'm', messages: [] },
      {
        temperatureIgnored: false,
        mapRequest: null,
        supportsReasoning: true,
      } as any,
      { enabled: true, effort: 'high' }
    );
    expect(body.reasoning_effort).toBeUndefined();
  });
});
```

- [x] **Step 2: Run tests — expect FAIL (modules missing)**

Run: `npm run test -- --run src/services/modelCapability/`

- [x] **Step 3: Implement types, empty registry, resolve, prefs, apply**

Minimal registry can start with **zero production patterns** or 1–2 documented placeholders with `mapRequest` returning `{}` until gateway verification — better: include patterns behind comments and only enable after Task 1b verification note in registry file.

Implement `matchModelPattern(pattern, modelId)` supporting `*` as wildcard segments.

`applyReasoningToRequestBody` must refuse to overwrite `model` / `messages`.

- [x] **Step 4: Run tests — expect PASS**

Run: `npm run test -- --run src/services/modelCapability/`

- [x] **Step 5: Commit**

```bash
git add src/services/modelCapability
git commit -m "feat(llm): add model capability registry and reasoning resolvers"
```

---

### Task 2: Wire llmService request body + stream safety (P1)

**Files:**
- Modify: `src/services/llmService.ts` (`createLLMRequestBody`, stream line processing if needed)
- Modify: `src/services/llmService.stream.test.ts` / add body builder tests
- Modify: `src/types/services.d.ts` — extend `LLMOptions` with optional reasoning prefs + provider for resolve

**Interfaces:**
- Consumes: `resolveModelCapability`, `resolveEffectiveReasoning`, `applyReasoningToRequestBody`
- Produces: `callLLM` / stream paths accept optional `reasoningPrefs` and use active model id

- [x] **Step 1: Write failing test — body includes mapper fields when prefs enabled**

Add unit test that mocks capability or injects via options:

```ts
// Prefer testing pure builder if extracted:
// buildLLMRequestBody({ model, messages, capability, reasoning, temperature })
expect(body).toMatchObject({ reasoning_effort: 'high' }); // only if test registry rule uses that
```

If production registry has no live mapRequest yet, test with **injected capability object** in a new exported `buildLLMRequestBodyForTest` or export `createLLMRequestBody` dependencies via optional hook — cleanest: export `buildChatCompletionsBody` from `applyToRequest.ts` (already planned) and only thin-wrap in llmService.

- [x] **Step 2: Implement wire-up**

In request construction:

1. Resolve capability from `provider` + `model` + optional models list entry.  
2. Resolve effective reasoning from options.reasoningPrefs (caller-supplied; settings will pass global).  
3. Build body via apply helper; skip temperature when `temperatureIgnored`.

Confirm stream path still drops `reasoning_content` from final content (existing test).

- [x] **Step 3: Run tests**

Run:

```bash
npm run test -- --run src/services/modelCapability/ src/services/llmService.stream.test.ts
npm run type-check
```

- [x] **Step 4: Commit**

```bash
git commit -m "feat(llm): apply reasoning prefs to chat completions body"
```

---

### Task 3: Persist global reasoning prefs + system settings UI (P1)

**Files:**
- Modify: `src/types/state.d.ts` — `LLMProviderConfig` or settings blob for `reasoningPrefs?: ReasoningUserPrefs`
- Modify: `src/components/settings/systemSettings.ts`
- Modify: settings HTML template for LLM section (locate current model select markup)
- Test: settings unit test if present; else pure function test for “shouldShowReasoningControls(capability)”

**Interfaces:**
- Produces: saved `reasoningPrefs` read on LLM calls from settings path
- UI: toggle + effort select, visible only when `capability.supportsReasoning && capability.mapRequest`

- [x] **Step 1: Failing test for visibility helper**

```ts
export function shouldShowReasoningControls(cap: ResolvedModelCapability): boolean {
  return Boolean(cap.supportsReasoning && cap.mapRequest);
}
```

- [x] **Step 2: Implement storage load/save defaults**

Default: `{ enabled: false, effort: 'medium' }`.

On model change in settings, recompute capability; if not showable, keep stored prefs but hide UI.

- [x] **Step 3: When calling test LLM / any settings-originated callLLM, pass global prefs**

- [x] **Step 4: Manual checklist (document in PR)**

1. Open 系统设置 → LLM  
2. Select unsupported model → no reasoning controls  
3. Select supported (after registry entry) → toggle + effort  
4. Save, reload → prefs persist  

- [x] **Step 5: Commit**

```bash
git commit -m "feat(settings): global reasoning prefs UI and persistence"
```

---

### Task 4: Registry entries for real gateway (P1 hardening)

**Files:**
- Modify: `src/services/modelCapability/registry.ts`
- Create: `docs/superpowers/specs/appendix-model-reasoning-gateway.md` (optional short table)

**Interfaces:**
- Produces: at least one verified pattern OR explicit empty list with comment “enable after new-api probe”

- [x] **Step 1: Against staging new-api, probe 1–2 reasoning models**

Record request field names and whether disable omits fields or sends false.

- [x] **Step 2: Add registry rules with real `mapRequest`**

- [x] **Step 3: Snapshot tests for those rules**

- [x] **Step 4: Commit**

```bash
git commit -m "feat(llm): register gateway-verified reasoning mappers"
```

---

### Task 5: Deep Chat session override (P2)

**Files:**
- Modify: `src/modules/app_center/views/playground/deep-chat/types.ts` — `reasoning?: SessionReasoningOverride`
- Modify: `src/modules/app_center/views/playground/deep-chat/controller.ts` — resolve prefs on send; persist override
- Modify: `template.html` / tuning panel — session controls + reset
- Modify: `index.test.ts` — override beats global; unsupported model ignores

**Interfaces:**
- Consumes: global prefs from storage/settings service; capability resolve
- Produces: `EffectiveReasoningPrefs` per request

- [x] **Step 1: Failing unit tests**

```ts
it('uses session reasoning override over global when sending', async () => {
  // mount deep chat with mocks; set thread.reasoning = { enabled: true, effort: 'high' }
  // assert callLLM / request body builder received high
});
```

- [x] **Step 2: Implement thread field + tuning UI binding**

Reset clears `thread.reasoning` (undefined), not global.

- [x] **Step 3: Pass effective prefs into llm path used by Deep Chat**

- [x] **Step 4: Run deep-chat tests + type-check**

```bash
npm run test -- --run src/modules/app_center/views/playground/deep-chat/index.test.ts src/services/modelCapability/
npm run type-check
```

- [x] **Step 5: Commit**

```bash
git commit -m "feat(deep-chat): session reasoning override over global defaults"
```

---

### Task 6: Docs + release note stub (P2 close)

**Files:**
- Modify: Spec status → Accepted/Implemented sections as work lands
- CHANGELOG Unreleased bullet when shipping

- [x] **Step 1: Update spec status field when P1 done / P2 done**

- [x] **Step 2: CHANGELOG Unreleased**

- [x] **Step 3: Commit**

```bash
git commit -m "docs: mark model reasoning capability phases and changelog"
```

---

## Plan self-review

| Spec requirement | Task |
|------------------|------|
| Registry + fail-closed | Task 1 |
| `/models` merge context only safely | Task 1 |
| Request mapper + no blind fields | Task 1–2 |
| Stream reasoning isolation | Task 2 |
| Global settings first | Task 3 |
| Gateway-verified mappers | Task 4 |
| Session override | Task 5 |
| Docs | Task 6 |

No TBD placeholders in task steps. Types aligned: `ReasoningUserPrefs`, `ResolvedModelCapability`, `mapRequest`.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-23-model-reasoning-capability.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — this session with executing-plans checkpoints  

Which approach?
