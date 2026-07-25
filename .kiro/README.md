# `.kiro/` — Historical project planning (not current SSOT)

> **Status: HISTORICAL**  
> Material under this directory is from the 2026-H1 Kiro planning / arch-debt / design era.  
> **Do not treat it as the current source of truth** for architecture, quality debt, or implementation plans.

## Where current authority lives

| Topic | Current location |
| --- | --- |
| Implementation plans & design specs | [`docs/superpowers/`](../docs/superpowers/) (`plans/`, `specs/`) |
| Theme / visual / modal guidelines | [`docs/THEME_SYSTEM_GUIDELINES.md`](../docs/THEME_SYSTEM_GUIDELINES.md), [`docs/VISUAL_DESIGN_GUIDELINES.md`](../docs/VISUAL_DESIGN_GUIDELINES.md), related `docs/*_GUIDELINES.md` |
| Doc index (active vs archive) | [`docs/INDEX.md`](../docs/INDEX.md) |
| Repo layout rules | [`docs/PROJECT_STRUCTURE.md`](../docs/PROJECT_STRUCTURE.md) |
| Agent coding guidance | root [`CLAUDE.md`](../CLAUDE.md), [`AGENTS.md`](../AGENTS.md) |
| Live quality / debt signals | `docs/TECH_DEBT_AUDIT.md`, CI scripts under `scripts/quality/`, scan outputs |

## What remains here

- `arch-debt/` — completed checklist snapshots (e.g. progress dated **2026-07-11**)
- `specs/` — older feature design/requirements/tasks
- `design/` — welcome-banner and visual optimization write-ups
- `agents/`, `fix-reports/`, `test-reports/`, etc. — historical process artifacts
- `CONTRIBUTING.md` — still linked from some docs as contribution notes; content may lag `docs/` / root README

## Rules

1. Prefer `docs/superpowers/` for **new** plans and specs.  
2. Do not add local machine state (hooks/settings) — see `.gitignore`.  
3. Links into `.kiro/` from active docs should be labeled historical when updated.  
4. Mass relocation of this tree is optional (see structure cleanup batch C); banners + INDEX are the authority fix.
