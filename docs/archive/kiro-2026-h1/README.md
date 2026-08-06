# `docs/archive/kiro-2026-h1/` — Historical project planning (not current SSOT)

> **Status: ARCHIVED (2026-08-06)**  
> Material under this directory was originally the 2026-H1 Kiro planning / arch-debt / design era tree, moved from `.kiro/` for archival.  
> **Do not treat it as the current source of truth** for architecture, quality debt, or implementation plans.

## Where current authority lives

| Topic | Current location |
| --- | --- |
| Implementation plans & design specs | [`docs/superpowers/`](../../superpowers/) (`plans/`, `specs/`) |
| Theme / visual / modal guidelines | [`docs/THEME_SYSTEM_GUIDELINES.md`](../../THEME_SYSTEM_GUIDELINES.md), [`docs/VISUAL_DESIGN_GUIDELINES.md`](../../VISUAL_DESIGN_GUIDELINES.md), related `docs/*_GUIDELINES.md` |
| Doc index (active vs archive) | [`docs/INDEX.md`](../../INDEX.md) |
| Repo layout rules | [`docs/PROJECT_STRUCTURE.md`](../../PROJECT_STRUCTURE.md) |
| Agent coding guidance | root [`CLAUDE.md`](../../../CLAUDE.md), [`AGENTS.md`](../../../AGENTS.md) |
| Live quality / debt signals | `docs/TECH_DEBT_AUDIT.md`, CI scripts under `scripts/quality/`, scan outputs |

## What remains here

- `arch-debt/` — completed checklist snapshots (e.g. progress dated **2026-07-11**)
- `specs/` — older feature design/requirements/tasks
- `design/` — welcome-banner and visual optimization write-ups
- `agents/`, `fix-reports/`, `test-reports/`, etc. — historical process artifacts
- `CONTRIBUTING.md` — legacy contribution notes; content may lag `docs/` / root README

## Rules

1. Prefer `docs/superpowers/` for **new** plans and specs.  
2. Do not recreate `.kiro/` for documentation; any new planning material belongs under `docs/` (active) or `docs/archive/` (retired).  
3. Links into this archive from active docs should be labeled historical when updated.  
4. Migration from `.kiro/` completed 2026-08-06; the root `.kiro/` directory has been removed entirely.
