# Tool-loop final answer reliability — Implementation Plan

> **For agentic workers:** execute task-by-task with TDD.

**Goal:** Prefer one model synthesis hop after empty tool-loop finals; improve local fallback; single exit path.

**Spec:** `docs/superpowers/specs/2026-07-25-tool-loop-final-answer-reliability-design.md`

---

### Task 1: Pure helpers + tests in toolLoopFinal

**Files:** `src/services/modelCapability/toolLoopFinal.ts`, `toolLoopFinal.test.ts`

- [x] Export constants for fallback header/footer
- [x] `buildModelToolSynthesisUserMessage(outputs)`
- [x] `isLocalToolFallbackText(text)`
- [x] Improve `synthesizeAnswerFromToolOutputs` formatting slightly
- [x] Unit tests

### Task 2: resolveToolLoopFinalAnswer in llmService

**Files:** `src/services/llmService.ts`

- [x] Implement `tryModelSynthesizeFromToolOutputs`
- [x] Implement `resolveToolLoopFinalAnswer`
- [x] Replace all `lastText.trim() || synthesizeAnswerFromToolOutputs(...)`

### Task 3: Verify

- [x] vitest toolLoopFinal + related
- [x] lint warning gate
- [x] commit

---
