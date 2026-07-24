# Dual-Path Full API Parity Implementation Plan

> **For agentic workers:** Execute CP1→CP8 in order. TDD. Verify after each CP.

**Goal:** Official Create parity for chat/completions + close remaining Responses gaps. Tools/vision work on **both** paths.

**Spec:** `docs/superpowers/specs/2026-07-24-dual-path-full-api-parity.md`

**Workspace:** repo root on `main` (or feature branch).

## Files

- `src/services/llmService.ts` — ChatMessage, LLMOptions, tool loop, stream tool_calls
- `src/services/modelCapability/applyToRequest.ts` — buildChatCompletionsBody full fields + vision
- `src/services/modelCapability/protocolBodies.ts` — pass fields
- `src/services/modelCapability/registry.ts` — chat tools/vision true
- `src/services/modelCapability/chatTools.ts` — NEW chat tool extract/loop helpers
- `src/services/modelCapability/chatVision.ts` — NEW vision part mapping
- tests colocated

## CP order

See Spec checkpoints. Commit after each green CP when practical.
