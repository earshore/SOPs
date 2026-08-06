# Superpowers — current plans & specs

This directory is the **active** home for agent-driven design specs and implementation plans.

| Folder | Role |
| --- | --- |
| [`specs/`](./specs/) | Design specifications (approved or in review) before / during implementation |
| [`plans/`](./plans/) | Task-level implementation plans (TDD steps, file maps, verification) |

## How to use

1. New multi-step work: write or update a **spec** under `specs/`, then a **plan** under `plans/`.  
2. Prefer dated filenames: `YYYY-MM-DD-<topic>-design.md` / `YYYY-MM-DD-<topic>.md`.  
3. Theme, visual, and UI constitution docs stay in top-level `docs/` — **must** declare which constitutions the change touches (checklist below).  
4. **Not** the same as `docs/archive/kiro-2026-h1/` (archived Kiro-era material). See [`docs/archive/kiro-2026-h1/README.md`](../archive/kiro-2026-h1/README.md).

## Constitution-touch checklist (required on every new/updated spec or plan)

Copy into the top or DoD section of the spec/plan. Check all that apply; leave unchecked domains as `N/A` with one-line reason if useful.

Product & experience:

- [ ] [PRODUCT_PRINCIPLES](../PRODUCT_PRINCIPLES.md) — scope / non-goals / DoD
- [ ] [CONTENT_DESIGN](../CONTENT_DESIGN.md) — user-visible copy
- [ ] [ACCESSIBILITY](../ACCESSIBILITY.md) — keyboard / focus / names
- [ ] [THEME_SYSTEM_GUIDELINES](../THEME_SYSTEM_GUIDELINES.md) — appearance / ownership colors
- [ ] [VISUAL_DESIGN_GUIDELINES](../VISUAL_DESIGN_GUIDELINES.md) — layout / banner / anti-island
- [ ] [COMPONENT_GUIDELINES](../COMPONENT_GUIDELINES.md) — buttons / forms / toast / cards
- [ ] [MODAL_DEVELOPMENT_GUIDELINES](../MODAL_DEVELOPMENT_GUIDELINES.md) — dialogs / confirm

Engineering & delivery:

- [ ] [TESTING_STRATEGY](../TESTING_STRATEGY.md) — risk tier + test commands
- [ ] [SECURITY_PLAYBOOK](../SECURITY_PLAYBOOK.md) / [SECURITY.md](../../SECURITY.md) — XSS / secrets / BYOK
- [ ] [OPS_RUNBOOK](../OPS_RUNBOOK.md) / [DEPLOYMENT](../DEPLOYMENT.md) — if ship/deploy impact
- [ ] [RELEASE_POLICY](../RELEASE_POLICY.md) — if version/tag/notes
- [ ] [TECH_DEBT_BOARD](../TECH_DEBT_BOARD.md) — new open debt filed if leaving gaps

Also satisfy product DoD: [PRODUCT_PRINCIPLES §4](../PRODUCT_PRINCIPLES.md#4-功能交付-definition-of-done强制).

## Index

Full project doc navigation (decision tree): [`../INDEX.md`](../INDEX.md).
