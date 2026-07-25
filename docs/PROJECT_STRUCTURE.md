# Project Structure Review

Date: 2026-07-09

## Scope

This review keeps the application layout intact and only documents the current structure plus low-risk cleanup rules. The `src/` module tree is treated as product code and should not be reshuffled without a feature-level migration plan.

## Current Layout

- `src/` - Vite/TypeScript application code.
- `src/common/` - shared framework code: config, router, DI, errors, infrastructure, utilities, validators, and common UI helpers.
- `src/modules/` - business modules grouped by feature area: `home`, `sops`, `amz_hub`, `app_center`, and `more`.
- `src/services/` - application services such as HTTP, LLM calls, logging, analytics, monitoring, storage, and performance.
- `src/stores/` - Zustand store and compatibility helpers.
- `src/css/` - global CSS architecture: foundation, components, layouts, animations, and utilities.
- `tests/` - unit, integration, E2E, performance, visual, quality, debug, and diagnostic tests.
- `scripts/` - build, deploy, development, and quality scripts.
- `tools/` - standalone maintenance and quality tools.
- `docs/` - user, developer, API, testing, troubleshooting, and archived documents.
- `examples/` - sample data and usage examples.
- `config/` - shared tool configuration files; root config files re-export these for tool compatibility.

## Placement Rules

- Keep root files limited to package metadata, app entry/config shims, license, changelog, and top-level readme.
- Put long-lived project documentation under `docs/`; move historical plans and completed investigation notes to `docs/archive/`.
- Put executable project scripts under `scripts/`; put reusable analysis and maintenance utilities under `tools/`.
- Do not keep `.old`, `.backup`, or generated cache files in deployable directories.
- Keep generated or local-only artifacts ignored unless the project explicitly requires them to be versioned.

## Cleanup Applied

- Removed obsolete archived removal plan and stale references for a retired module.
- Moved `deploy-env.sh` into `scripts/`.
- Removed tracked `__pycache__` output and added Python cache patterns to `.gitignore`.
- Removed the obsolete edge LLM proxy; the app now calls the self-hosted new-api gateway directly from the browser.
- Updated XSS script paths from `tools/` to `tools/security/` in package scripts, docs, and tool internals.
- Removed empty local directories that were not part of git tracking: `guides/`, `testing/`, and `docs/verification/`.
- Moved one-off root reports and completed content/UI review documents into `docs/archive/knowledge-review/`, `docs/archive/ui-audit/`, and `docs/archive/quality/`.
- Moved completed Deep Chat, Keyword Hunter, and PC UI one-off plans from the repository root into `docs/archive/ui-audit/`.
- 2026-07-26 batch B: moved root one-off `code-review-deepchat-skills.md` and `ux-review-deepchat-skills.md` into `docs/archive/ui-audit/` (zero inbound links; not design SSOT).
- Kept active references in the root and `docs/` top level: README, changelog, deployment, current quality/security reports, product roadmap, and active design/architecture guidelines.
- Kept local AI tool state, generated quality reports, exported sample data, and local plugin bundles out of Git through `.gitignore`.

## Remaining Review Items

- Keep generated reports out of Git unless they are explicitly promoted into a maintained document such as `TECH_DEBT_AUDIT.md` or `XSS_SCAN_REPORT.md`.
- Treat `.kiro/` project planning documents as historical references; avoid adding local `.kiro/hooks/` or `.kiro/settings/` state back to version control.
- Continue pruning root-level one-off reports after each audit cycle so the root remains limited to application entry points and repository-level documentation.
