# Release debt hardening — landing status (2026-07-19)

## Merged on branch `codex/release-debt-hardening` (rebased onto main / v3.0.8)

- Plan 01: Hash-canonical redirects (302), standalone `404.html`, security-only `_headers`, `release:artifact-contract`
- Plan 02: Node engines / coverage floors, fail-closed quality measurements, `tech-debt:gate`
- Plan 03: Playwright without disable-web-security, release Playwright config, functional e2e runner, isolated `test:performance:gate`
- Plan 04 (partial): local `npm run release:gate` orchestrator + unit contract; `npm run release:production-gate` HTTP probe (requires `PAGES_PREVIEW_URL`)

## Remaining / deferred

- Full functional E2E inventory is available via `test:e2e:functional` but is **not** a blocking stage inside `release:gate` yet (smoke + perf + unit/security/quality are).
- GitHub Actions billing recovery is out of band; workflow files may still fail to start jobs.
- Do **not** rewrite `v3.0.8` tags; next version channel is `v3.0.9-rc.1` after this branch lands.

## Explicit non-landing

- `initial-shell-layout` first-paint experiment was stripped and is not part of this landing.
