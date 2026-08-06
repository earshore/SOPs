# Pre-release review: `codex/deep-chat-send-button-fixes`

**Date:** 2026-07-23  
**Reviewer:** implementer (goal: formal pre-release review + debt ledger + merge/channel decision)  
**Package version (workspace):** `3.0.11-rc.3` (`package.json`)  
**Branch:** `codex/deep-chat-send-button-fixes`  
**Base (`main` tip):** `aac0918b` — `chore(release): prepare v3.0.11-rc.3`  
**Branch tip (at decision time):** HEAD of `codex/deep-chat-send-button-fixes` after the docs/prettier commit listed below (see `git log main..HEAD`)

---

## 1. Scope under review (shipped surface)

| Area | What shipped |
|------|----------------|
| **Deep Chat send-button pin / mobile shell** | Window `resize` + stage geometry re-align for submit button; bottom-anchored pin; Space / stop control hardening; app sidebar `max-md:hidden` so phone layouts keep composer width. |
| **Session skill chip dock / dismiss** | Dismissible composer Skill chips; post-send non-message session chip dock; system prompt sync when skills remain or are dismissed; context bar removed in favor of chips. |
| **Tests** | Expanded `tests/e2e/deep-chat-send.spec.ts`; unit coverage for handoff/chip/controller; release-smoke skill trial expects inline chip (not context bar). |

### Branch commits (`git log main..HEAD`)

| SHA | Subject |
|-----|---------|
| `e0f62a18` | `fix(deep-chat): pin send button on resize and mobile shell` |
| `3a730817` | `feat(deep-chat): session skill chip dock and dismiss persistence` |
| `b5fdfc9c` | `refactor(deep-chat): lower skill dock and draft-fill complexity` |
| *(docs tip)* | `docs(deep-chat): pre-release review and prettier index.test` |

Primary paths: `controller.ts`, `index.html`, `skillDeepChatHandoff*`, `skillContextChip*`, `deepChatStyles.ts`, `styles.css`, `template.html`, `deep-chat-send.spec.ts`, `release-smoke.spec.ts`, plan `2026-07-22-deep-chat-send-button-hardening.md`.

---

## 2. Debt ledger (this branch only)

| ID | Category | Item | Status | Severity | Disposition / how cleared |
|----|----------|------|--------|----------|---------------------------|
| D1 | Code quality | ESLint complexity on `syncSessionSkillChipDock` / `fillSkillComposerDraft` | **Cleared** | medium | Extracted helpers; `eslint controller.ts --max-warnings=0` exit 0 |
| D2 | Tests | Unit assert used `skillContexts: undefined` vs omitted fields | **Cleared** | medium | Assertion checks absence of skill residue on last persist |
| D3 | Process | Mixed send-button + skill chip in one working tree | **Cleared** | low | Split into sequential commits A/B + complexity refactor |
| D4 | Code quality | `ci:format` / Prettier fail on `deep-chat/index.test.ts` | **Cleared** | **blocking** | `prettier --write` on that file; `npm run format:check` re-run |
| D5 | Tests / infra | `release-smoke` “Skills renders without console…” FontAwesome CSS MIME (`text/javascript` for `*.min.css`) | **Residual** | medium (full smoke) / **not branch-blocking** | **Defer / not-this-branch** — reproduced on this tree; not introduced by Deep Chat send/chip diff; owner: release-smoke / Vite asset Content-Type |
| D6 | Process | Branch not pushed; no PR; no CHANGELOG / version bump yet | **Residual** | process | **Defer** to merge/release ops (out of this branch’s code debt); owner: release owner |
| D7 | Product readiness | Full product GA gates (staging soak, full `test:e2e:smoke`, CHANGELOG freeze) not executed as GA cut | **Residual** | release-channel | **Defer** — drives **RC not GA**; owner: release owner |
| D8 | Code quality | No `TODO`/`FIXME`/`@ts-ignore` in branch Deep Chat / handoff sources | **Cleared** | n/a | Grep clean |
| D9 | Architecture debt tracker | `docs/archive/kiro-2026-h1/arch-debt` items outside this branch | **Residual** | n/a | **Not-this-branch** (plan non-goal) |

**Blocking residual debt for merge:** none after D4.

---

## 3. Gate evidence (2026-07-23)

Logs captured under implementer scratch `gates/` (session-local; not committed).

| Gate | Command | Result |
|------|---------|--------|
| Type-check app | `npm run type-check` | **PASS** exit 0 |
| Type-check tests | `npm run type-check:tests` | **PASS** exit 0 |
| ESLint controller | `npx eslint …/controller.ts --max-warnings=0` | **PASS** exit 0 |
| Full src lint | `npm run lint` | **PASS** exit 0 |
| Format | `npm run format:check` | **PASS** after D4 |
| Focused unit | vitest: `deep-chat/index.test.ts`, `skillDeepChatHandoff.test.ts`, `skillContextChip.test.ts`, `skillRegistry.production.test.ts` | **PASS** 74 tests |
| E2E send | `npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1` | **PASS** 16/16 (~45s) |
| E2E skill trial handoff | `release-smoke.spec.ts` grep `trial handoff` | **PASS** 1/1 |
| E2E Skills renders (MIME) | `release-smoke` “Skills renders without console…” | **FAIL** residual D5 |
| Build (via `npm run build` preflight) | failed early on Prettier before D4; format fixed; full rebuild not re-required for branch merge decision once format gate green | format was the failing step |

Durable in-repo tests driving shipped behavior (already on branch):

- Unit: skill trial dock after send, dismiss persistence, chip hydrate/serialize, handoff queue.
- E2E: viewport pin, mobile sidebar width, stop/Space, decorated skill chip path, skill trial handoff smoke.

---

## 4. Decision block

### Merge to `main`?

**YES** — with conditions:

1. PR / review of the three (or four) commits above.  
2. CI Quality Gate on the merge SHA green (includes `ci:format`).  
3. Do **not** treat residual D5 (FontAwesome MIME smoke) as a reason to block this Deep Chat branch; track separately for full release smoke.

### Release channel: RC vs GA?

**Continue RC. Do not cut GA from this branch alone.**

| Question | Answer |
|----------|--------|
| **Channel** | **RC (pre-release)** |
| **Version recommendation** | Keep tree at **`3.0.11-rc.3`** until merge; after merge + CHANGELOG notes for this surface, cut **`3.0.11-rc.4`** as the next candidate tag (Pre-release). **Do not** publish **`3.0.11` GA** until full release policy gates + broader smoke (including resolution or accepted waiver of D5) and CHANGELOG freeze. |
| **Why not GA** | Latest GA remains **`v3.0.10`** per `docs/RELEASE_POLICY.md`. `3.0.11` is still an RC series. This branch is a focused Deep Chat composer fix/feature, not a full product freeze. Green branch gates ≠ GA soak / full `test:e2e:smoke` / release packaging. |
| **Why still RC after green tests** | RELEASE_POLICY: RC = feature-frozen candidate for production validation; GA requires milestone packaging, notes, and Latest promotion. Merge is allowed without tagging; tagging RC.4 is the appropriate next release step. |

### Gate evidence driving the decision

- Branch quality bar green: type-check, eslint controller, focused unit, deep-chat-send E2E 16/16, skill trial handoff smoke.  
- Blocking format debt cleared (D4).  
- Residual full-smoke MIME failure is out-of-scope for this diff.  
- Policy: current line is `3.0.11-rc.*`; GA would incorrectly leap product readiness.

---

## 5. Recommended next ops (not executed here)

1. Open PR `codex/deep-chat-send-button-fixes` → `main`.  
2. Merge when CI green.  
3. On `main`: CHANGELOG Unreleased → `3.0.11-rc.4` section; bump `package.json`; tag `v3.0.11-rc.4` as Pre-release only after Quality Gate on that SHA.  
4. File follow-up for FontAwesome / Vite CSS Content-Type in release-smoke asset checks (D5).  
5. GA `3.0.11` only after RC soak criteria in RELEASE_POLICY §5–7.

---

## 6. Consistency check

| Source | Value |
|--------|--------|
| `package.json` version | `3.0.11-rc.3` |
| `main` tip | `aac0918b` |
| Branch commits vs main | `e0f62a18`, `3a730817`, `b5fdfc9c`, plus docs/prettier tip |
| Decision version logic | Stay on RC series; next cut **rc.4**, not GA |
