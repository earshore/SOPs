# App Center「最近继续」Resume Queue 设计

**Date:** 2026-07-11  
**Status:** Implemented (local; no remote push required by this goal)

## Goal

Redesign the App Center overview **最近继续** panel as a dense **resume queue**: work-context first, one short type label, de-duplicated fact chips, explicit continue CTA, 1/2/3 column preference.

## Architecture

| Unit | Responsibility |
|------|----------------|
| `recentArtifactPresenter.ts` | Pure transform: typeLabel, primaryTitle, facts, time/freshness |
| `getWorkItemById` (artifactEnvelopeService) | Read-only work-item lookup for marketplace / ASIN |
| `overview/index.ts` | DOM render, column preference, switch-tab buttons |
| `app_center_style.css` + `template.html` | Dense queue matrix + empty-state actions |

## Presentation rules

1. **Type** — short label once (`PPC`, `采集`, …).
2. **Primary title** — prefer `marketplace · first ASIN`; keyword snapshots may keep a non-generic title; never lead with generic product-type titles like `PPC 动作清单`.
3. **Facts** — chips from metadata/summary parts; blocked from repeating type, primary title, marketplace, ASIN.
4. **Continue** — explicit button, `data-action="switch-tab"`, next route by artifact type.
5. **Columns** — default 2; user 1/2/3; key `app_center_overview_recent_columns_v1`.

## Non-goals

- No envelope registration schema migration.
- No task-path / app-matrix redesign.
- No remote push for this workstream.

## Verification

- Unit tests: `tests/unit/recentArtifactPresenter.test.ts` (shipped presenter).
- Integration: `tests/unit/app_center_overview.test.ts` (DOM contracts, empty state, columns).
