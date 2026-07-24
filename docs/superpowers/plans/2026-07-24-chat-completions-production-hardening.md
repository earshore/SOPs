# Chat Completions Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the project's `POST /chat/completions` path to a production-ready product subset: correct token limits, non-brittle response validation, honest capability flags, and no silent drop of tools/vision options.

**Architecture:** Keep the existing multi-protocol stack (`createLLMTransport` → `buildBodyForApiPath` → `buildChatCompletionsBody` → `readOpenAIStream`). Harden the chat surface only; do not reimplement List/CRUD Completions or audio. Prefer fail-closed product behavior with explicit logs/UI when a feature requires Responses.

**Tech Stack:** TypeScript, Vitest, existing `llmService` + `modelCapability` modules, optional Node probe script against OpenAI-compatible gateway.

**Spec:** `docs/superpowers/specs/2026-07-24-chat-completions-readiness-audit.md`

## Global Constraints

- Product claims **OpenAI-compatible Chat Completions subset**, not full platform Chat resource CRUD.
- Never invent reasoning fields without `mapRequest` (existing fail-closed rule).
- Do not silently send tools on chat if the gateway/product path cannot complete a tool loop — either implement a minimal loop or refuse with a clear error/log.
- Match existing code style in `src/services/llmService.ts` and `src/services/modelCapability/*`.
- Every task ends with tests green:  
  `npm test -- --run src/services/modelCapability src/services/llmService.stream.test.ts`

## File map

| File | Responsibility |
| ---- | -------------- |
| `src/services/modelCapability/applyToRequest.ts` | `buildChatCompletionsBody`; token field policy |
| `src/services/modelCapability/registry.ts` | chat surface capability flags |
| `src/services/modelCapability/types.ts` | optional flags for token field policy if needed |
| `src/types/api.d.ts` | Chat completion types |
| `src/common/guards/zodSchemas.ts` | Response schema relaxation |
| `src/services/llmService.ts` | tools-on-chat policy; empty body diagnostics (Phase B) |
| `tools/probe-chat-gateway.mjs` | Live probe matrix |
| `package.json` | `probe:chat` script |
| tests colocated / `llmService.stream.test.ts` | regression |

---

### Task 1: Relax chat completion response validation (CC-P0-2)

**Files:**
- Modify: `src/common/guards/zodSchemas.ts` (LLMMessageSchema, LLMChatCompletionResponseSchema)
- Modify: `src/types/api.d.ts` (`LLMMessage`, `LLMChatCompletionResponse`, `LLMStreamChunk`)
- Test: `tests/unit/common/guards/typeGuards.llm.test.ts` (create if missing) or extend existing typeGuards tests

**Interfaces:**
- Consumes: existing `isLLMChatCompletionResponse`
- Produces: schema accepting official modern shapes used by gateways

- [ ] **Step 1: Write failing tests for modern response shapes**

```typescript
import { describe, expect, it } from 'vitest';
import { isLLMChatCompletionResponse } from '@/common/guards/typeGuards';

describe('isLLMChatCompletionResponse (chat modern shapes)', () => {
  it('accepts null content with tool_calls finish_reason', () => {
    expect(
      isLLMChatCompletionResponse({
        id: 'chatcmpl-1',
        object: 'chat.completion',
        created: 1,
        model: 'gpt-4o-mini',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'lookup', arguments: '{}' },
                },
              ],
            },
            finish_reason: 'tool_calls',
          },
        ],
      })
    ).toBe(true);
  });

  it('accepts gateway object aliases without hard-failing on extra fields', () => {
    expect(
      isLLMChatCompletionResponse({
        id: 'x',
        object: 'chat.completion',
        created: 1,
        model: 'm',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'hi', refusal: null },
            finish_reason: 'stop',
            logprobs: null,
          },
        ],
        usage: {
          prompt_tokens: 1,
          completion_tokens: 1,
          total_tokens: 2,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      })
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run tests/unit/common/guards/typeGuards.llm.test.ts`  
Expected: FAIL (content null / tool_calls finish_reason rejected)

- [ ] **Step 3: Update Zod + types**

In `zodSchemas.ts`:

```typescript
export const LLMMessageSchema = z
  .object({
    role: z.enum(['system', 'user', 'assistant', 'tool', 'developer']).or(z.string()),
    content: z.union([z.string(), z.null()]).optional(),
    name: z.string().optional(),
    tool_calls: z.array(z.unknown()).optional(),
    tool_call_id: z.string().optional(),
    refusal: z.union([z.string(), z.null()]).optional(),
    function_call: z
      .object({
        name: z.string(),
        arguments: z.string(),
      })
      .optional(),
  })
  .passthrough();

export const LLMChatCompletionResponseSchema = z
  .object({
    id: z.string(),
    object: z.string(), // was z.literal('chat.completion') — gateways vary
    created: z.number().optional(),
    model: z.string().optional(),
    choices: z
      .array(
        z
          .object({
            index: z.number().optional(),
            message: LLMMessageSchema,
            finish_reason: z
              .union([
                z.literal('stop'),
                z.literal('length'),
                z.literal('tool_calls'),
                z.literal('function_call'),
                z.literal('content_filter'),
                z.null(),
                z.string(),
              ])
              .optional(),
          })
          .passthrough()
      )
      .min(1),
  })
  .passthrough();
```

Mirror the same unions in `src/types/api.d.ts` for `LLMMessage` / `finish_reason` / stream deltas (`tool_calls` on delta).

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- --run tests/unit/common/guards/typeGuards.llm.test.ts src/services/llmService.stream.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/common/guards/zodSchemas.ts src/types/api.d.ts tests/unit/common/guards/typeGuards.llm.test.ts
git commit -m "fix(llm): accept modern chat.completion response shapes"
```

---

### Task 2: max_completion_tokens policy (CC-P0-1)

**Files:**
- Modify: `src/services/modelCapability/applyToRequest.ts` (`buildChatCompletionsBody`)
- Modify: `src/services/modelCapability/types.ts` (optional `usesMaxCompletionTokens?: boolean` on surface or resolve)
- Modify: `src/services/modelCapability/registry.ts` (mark OpenAI reasoning models)
- Test: `src/services/modelCapability/applyToRequest.test.ts`

**Interfaces:**
- Consumes: `ResolvedModelCapability`, `maxTokens?: number`
- Produces: body with either `max_completion_tokens` or `max_tokens` (never both unless dualWrite explicitly true)

**Policy (product):**

1. If capability feature includes `'max_completion_tokens'` OR `temperatureIgnored === true` on OpenAI-style reasoning chat surface → emit **`max_completion_tokens` only**.
2. Else emit **`max_tokens` only** (Grok/DeepSeek/legacy gateways).
3. Do not dual-write by default (many proxies reject unknown pairs).

- [ ] **Step 1: Write failing tests**

```typescript
describe('buildChatCompletionsBody token fields', () => {
  it('uses max_completion_tokens for temperatureIgnored reasoning models', () => {
    const capability = {
      /* minimal ResolvedModelCapability */
      temperatureIgnored: true,
      mapRequest: ({ enabled, effort }) =>
        enabled && effort !== 'off' ? { reasoning_effort: effort } : {},
      supportsReasoning: true,
      features: ['reasoning', 'max_completion_tokens'],
      // ...required fields
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'o3-mini',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 256,
      stream: false,
      capability,
      reasoning: { enabled: false, effort: 'off' },
    });

    expect(body.max_completion_tokens).toBe(256);
    expect(body.max_tokens).toBeUndefined();
  });

  it('uses max_tokens for non-reasoning chat models', () => {
    const capability = {
      temperatureIgnored: false,
      mapRequest: null,
      supportsReasoning: false,
      features: [],
    } as unknown as ResolvedModelCapability;

    const body = buildChatCompletionsBody({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 128,
      capability,
      reasoning: { enabled: false, effort: 'off' },
    });

    expect(body.max_tokens).toBe(128);
    expect(body.max_completion_tokens).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `npm test -- --run src/services/modelCapability/applyToRequest.test.ts`

- [ ] **Step 3: Implement helper + wire into builder**

```typescript
function applyChatMaxOutputTokens(
  body: Record<string, unknown>,
  maxTokens: number | undefined,
  capability: Pick<ResolvedModelCapability, 'temperatureIgnored' | 'features'>
): void {
  if (maxTokens === undefined) return;
  const preferCompletionTokens =
    capability.temperatureIgnored === true ||
    (capability.features ?? []).includes('max_completion_tokens');
  if (preferCompletionTokens) {
    body.max_completion_tokens = maxTokens;
    delete body.max_tokens;
    return;
  }
  body.max_tokens = maxTokens;
  delete body.max_completion_tokens;
}
```

In `buildChatCompletionsBody`, replace:

```typescript
if (args.maxTokens !== undefined) {
  base.max_tokens = args.maxTokens;
}
```

with a call to `applyChatMaxOutputTokens` after the base object is created (and re-run after Anthropic thinking floor so Claude chat path still uses `max_tokens` — Claude mapper should keep `max_tokens`; ensure preferCompletionTokens is false for Claude surfaces).

**Claude exception:** Anthropic-on-chat uses `max_tokens` + `thinking.budget_tokens`. Keep `temperatureIgnored` true but **do not** switch Claude to `max_completion_tokens`. Implement as:

```typescript
const isAnthropicThinking =
  Boolean((body as { thinking?: unknown }).thinking) ||
  (capability.features ?? []).includes('claude');
```

Pass body after mapper merge, or check features includes `'claude'` before choosing field.

Recommended order in `buildChatCompletionsBody`:

1. Build base without max field  
2. `applyReasoningToRequestBody` (may set thinking + raise max_tokens via ensureMaxTokensAboveThinkingBudget — update that helper to raise whichever field is present, or always use max_tokens for Claude path)  
3. For Anthropic: force `max_tokens`  
4. For OpenAI reasoning: force `max_completion_tokens`

Simplest robust approach: extend `ensureMaxTokensAboveThinkingBudget` to set `max_tokens` only when thinking present; for non-thinking OpenAI reasoning use `max_completion_tokens`.

- [ ] **Step 4: Registry — add feature flag on openaiReasoning chat surface**

In `surfaceOpenAiEffort` or `openaiReasoning` chat surface, set `features` on the rule already includes reasoning; add model feature `'max_completion_tokens'` on OpenAI reasoning rules only (entry features array).

- [ ] **Step 5: Tests pass + commit**

```bash
git add src/services/modelCapability/applyToRequest.ts src/services/modelCapability/registry.ts src/services/modelCapability/applyToRequest.test.ts
git commit -m "fix(llm): prefer max_completion_tokens for OpenAI reasoning chat path"
```

---

### Task 3: Honest chat surface capabilities + tools drop policy (CC-P0-3, CC-P0-4)

**Files:**
- Modify: `src/services/modelCapability/registry.ts` (`surfaceOpenAiEffort` / `chatEffort`)
- Modify: `src/services/modelCapability/protocolBodies.ts` (`buildBodyForApiPath` chat branch)
- Modify: `src/services/llmService.ts` (`createLLMTransport` or post-body check)
- Test: `src/services/modelCapability/registry.test.ts`, `llmService.stream.test.ts`

**Interfaces:**
- Consumes: `options.tools`, `options.visionUserParts`, `ResolvedModelCapability`
- Produces: either chat body with tools (Phase B) **or** explicit strip + dev warning; capability badges truthful

**Phase A product decision (this task):**  
Do **not** implement full chat tool loop yet. Instead:

1. Declare on chat surface for flagship OpenAI/Grok models:
   - `supportsStructuredOutput: true` (json_object already works)
   - `supportsTools: false` (until Task 5)
   - `supportsVision: false` (until Phase C)
2. If caller passes `tools` / `visionUserParts` while `apiPath === 'chat_completions'`:
   - Dev: `console.warn` once  
   - Optionally throw `ValidationError` only when `enableToolLoop === true` (hard requirement)  
   - Soft callers (analysis) keep working without tools

- [ ] **Step 1: Failing test — tools requested with enableToolLoop on chat**

```typescript
it('rejects enableToolLoop on chat_completions path', async () => {
  await expect(
    callLLM(
      [{ role: 'user', content: 'hi' }],
      'new_api',
      'https://example.test/v1',
      'k',
      'deepseek-v4-flash',
      {
        stream: false,
        retries: 0,
        apiPath: 'chat_completions',
        enableToolLoop: true,
        tools: [{ type: 'function', function: { name: 'x', parameters: {} } }],
        executeTool: async () => 'ok',
        reasoningPrefs: { enabled: false, effort: 'medium' },
      }
    )
  ).rejects.toMatchObject({ code: 'LLM_TOOLS_PATH_UNSUPPORTED' });
});
```

- [ ] **Step 2: Implement guard in `callLLM` / transport setup**

```typescript
function assertToolsPathSupported(options: ResolvedLLMOptions, apiPath: ApiPathId): void {
  if (!options.enableToolLoop) return;
  if (apiPath === 'responses') return;
  throw new ValidationError(
    '工具循环仅支持 Responses 路径。请在系统设置将 API 路径改为 /responses，或关闭业务 tools。',
    'LLM_TOOLS_PATH_UNSUPPORTED',
    'apiPath',
    apiPath,
    { module: 'LLMService', action: 'callLLM' }
  );
}
```

- [ ] **Step 3: Update registry chat surface structured flag**

```typescript
function surfaceOpenAiEffort(opts?: { temperatureIgnored?: boolean }): SurfaceCapability {
  return {
    supportsReasoning: true,
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultEffort: 'medium',
    temperatureIgnored: opts?.temperatureIgnored ?? true,
    mapRequest: mapOpenAiReasoningEffort,
    supportsStructuredOutput: true, // response_format json_object
    supportsTools: false,
    supportsVision: false,
  };
}
```

Update settings badge tests if they assumed tools true only on responses.

- [ ] **Step 4: Tests + commit**

```bash
git commit -m "fix(llm): fail closed when tool loop requested on chat path"
```

---

### Task 4: Chat empty-body diagnostics + stream content null safety (CC-P1-5 partial)

**Files:**
- Modify: `src/services/llmService.ts` (`getCompletionContent`, `executeLLMAttempt`)
- Test: `src/services/llmService.stream.test.ts`

- [ ] **Step 1: Failing test — non-stream empty content string**

```typescript
it('throws API_EMPTY_RESPONSE when chat completion content is empty stop', async () => {
  // mock fetch 200 with content: ""
  await expect(callLLM(...)).rejects.toMatchObject({ code: 'API_EMPTY_RESPONSE' });
});
```

- [ ] **Step 2: Implement**

```typescript
function getCompletionContent(
  completion: LLMChatCompletionResponse | null,
  defaultContent = ''
): string {
  const raw = completion?.choices?.[0]?.message?.content;
  if (raw == null) return defaultContent;
  return typeof raw === 'string' ? raw : defaultContent;
}

// In executeLLMAttempt after get content, for chat_completions:
if (context.apiSurface === 'chat_completions' && !content.trim()) {
  throw new ApiError(
    '模型返回了空正文。请重试、增大 maxTokens，或检查网关 channel。',
    'API_EMPTY_RESPONSE',
    200,
    payload.data,
    { module: 'LLMService', action: 'callLLM' }
  );
}
```

Exclude cases where finish_reason is tool_calls (content may be null intentionally) once types allow reading finish_reason from payload.

- [ ] **Step 3: Tests + commit**

```bash
git commit -m "fix(llm): diagnose empty chat completion bodies"
```

---

### Task 5 (Phase B): Optional chat tools subset OR document-only freeze

**Decision gate:** Product owner chooses one:

**Option B1 — Implement minimal chat tool loop**  
Mirror Responses loop using `messages` + `role: tool` + `tool_calls` on assistant messages. Wire Deep Chat business tools when `apiPath === chat_completions` && `supportsTools`.

**Option B2 — Document freeze (recommended if schedule tight)**  
Keep tools Responses-only; update `platformCapability.ts` row `path.chat` notes and user-facing settings description. Skip code beyond Task 3.

If B1:

- [ ] Extend `buildChatCompletionsBody` with `tools` / `tool_choice` when `capability.supportsTools`
- [ ] Parse non-stream `message.tool_calls`
- [ ] Multi-round until final content or maxToolRounds
- [ ] Set registry `supportsTools: true` for models verified by probe
- [ ] E2E: deep-chat send with chat path + enableBusinessTools

If B2:

- [ ] Update `docs/superpowers/specs/2026-07-24-responses-capability-roadmap.md` and settings copy only
- [ ] Mark CC-P1-1 deferred in audit doc

---

### Task 6: Live probe script (CC-P1-6)

**Files:**
- Create: `tools/probe-chat-gateway.mjs`
- Modify: `package.json` scripts `"probe:chat": "node tools/probe-chat-gateway.mjs"`
- Docs: append results to `docs/superpowers/specs/appendix-model-reasoning-gateway.md`

- [ ] **Step 1: Script cases**

```javascript
// Cases (stream:false unless noted):
// 1. plain messages
// 2. reasoning_effort low (if model supports)
// 3. max_tokens vs max_completion_tokens (two attempts; record which wins)
// 4. response_format json_object
// 5. stream:true first tokens
// Never print API keys.
```

- [ ] **Step 2: Run against gateway when key available**

```bash
$env:NEW_API_KEY="sk-..."; npm run probe:chat
```

- [ ] **Step 3: Commit script (not secrets)**

```bash
git commit -m "chore(llm): add probe:chat gateway matrix"
```

---

### Task 7: Platform matrix + audit status update

**Files:**
- Modify: `src/services/modelCapability/platformCapability.ts` (add chat-specific rows for token field, schema, tools policy)
- Modify: `docs/superpowers/specs/2026-07-24-chat-completions-readiness-audit.md` status → Phase A done

- [ ] **Step 1: Add matrix rows**

```typescript
{
  id: 'chat.max_completion_tokens',
  area: 'Chat Completions',
  feature: 'max_completion_tokens for reasoning models',
  status: 'implemented',
  entry: 'applyToRequest.ts applyChatMaxOutputTokens',
},
{
  id: 'chat.tools',
  area: 'Chat Completions',
  feature: 'function tools + tool loop',
  status: 'not_in_scope', // or 'partial' if B1 done
  notes: 'Use Responses path; chat rejects enableToolLoop',
},
```

- [ ] **Step 2: Full regression**

```bash
npm test -- --run src/services/modelCapability src/services/llmService.stream.test.ts
npm run type-check
```

Expected: all pass

- [ ] **Step 3: Commit**

```bash
git commit -m "docs(llm): mark chat completions Phase A production hardening complete"
```

---

## Self-review (plan vs audit)

| Audit ID | Task |
| -------- | ---- |
| CC-P0-1 | Task 2 |
| CC-P0-2 | Task 1 |
| CC-P0-3 | Task 3 |
| CC-P0-4 | Task 3 |
| CC-P1-5 | Task 4 |
| CC-P1-6 | Task 6 |
| CC-P1-1 | Task 5 (optional) |
| CC-P1-2..4,7,8 | Phase B/C — not in Phase A commits |
| CC-P2-* | Explicitly out of scope |

No TBD placeholders in Phase A tasks. Types/names: `buildChatCompletionsBody`, `applyChatMaxOutputTokens`, `assertToolsPathSupported`, `LLM_TOOLS_PATH_UNSUPPORTED`, `API_EMPTY_RESPONSE`.

---

## Definition of Done (可上线出口)

Phase A complete when:

1. Tasks 1–4 + 6–7 merged (Task 5 decided).  
2. Unit tests green; type-check green.  
3. Audit doc updated: **Conditional GO → GO for product subset**.  
4. Release notes state: Chat Completions = text + stream + json_object + reasoning_effort subset; tools require Responses unless B1 shipped.
