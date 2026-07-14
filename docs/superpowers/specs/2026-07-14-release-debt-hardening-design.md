# Release Debt Hardening Design

## Status

- Date: 2026-07-14
- Repository: `earshore/SOPs`
- Baseline: `main` at `9d308ec6` (`v3.0.7-rc.2`)
- Decision: approved in four sections
- Scope rule: GitHub Actions quota and billing recovery are excluded. Workflow correctness remains in scope, but workflow runs are not accepted as current verification evidence while the quota is exhausted.

## Goal

Turn the audited repository into a locally verifiable release candidate, close the identified routing, artifact, test-isolation, quality-reporting, runtime-version, and release-governance debts, and define the additional evidence required before declaring a production deployment safe.

This work does not deploy production. It produces two distinct outcomes:

1. **Release-candidate ready**: repository, tests, build, package, and local release gates all pass from a clean checkout.
2. **Production ready**: the same artifact also passes monitoring and HTTP-contract verification on a real Cloudflare Pages preview, and the required external repository and deployment controls are confirmed.

The second outcome must never be inferred from the first.

## Audited baseline

The following evidence defines the starting point:

- `npm run ci:all`, the full Vitest suite, release smoke, XSS scan, secret scan, circular-dependency scan, and `npm audit` passed locally.
- Coverage was 84.23% lines, 82.42% statements, 84.53% functions, and 68.64% branches.
- Release metadata, packaged assets, and SHA256 data were internally consistent.
- Clean App Center URLs were rewritten to `index.html` rather than redirected to canonical Hash URLs.
- Missing `/assets/*` resources returned and cached `index.html` as a successful immutable resource.
- The release workflow could publish without running release smoke against the built artifact.
- The Quality Gate job named smoke ran `tests/startup`, not `tests/e2e/release-smoke.spec.ts`.
- Full E2E produced 226 passed, 7 failed, 1 interrupted, and 18 not run before the 15-minute global timeout.
- Two deterministic test defects were identified in `ScraperPage.waitForScrapeComplete()` and the NPI Tracker dialog locator.
- Four performance failures passed when rerun alone with one worker, showing suite-level resource interference.
- Chromium globally disabled web security and site isolation.
- `quality-monitor.ts` could report zero complexity or duplication when collection failed or a report was missing.
- The technical-debt scanner reported 17 medium findings. Several were overlapping reports for the same duplicate block; the remaining findings were true repetition and explicit `any` usage.
- `package.json` advertised Node `>=18`, while Vite 8.0.16 requires `^20.19.0 || >=22.12.0`.
- Production Sentry configuration and Cloudflare preview behavior could not be proven with the available credentials.
- The product has no trusted server-side identity or authorization boundary. Its acceptable current scope is a public static, single-user BYOK application.

## Design principles

- The built artifact, not the development server, is the release-test subject.
- Missing or invalid evidence fails closed. A missing metric is not zero and is not a pass.
- One command is the source of truth for release-candidate verification.
- Functional E2E, release smoke, and performance measurement use separate processes and budgets.
- Correctness takes priority over speculative cache optimization.
- Existing public behavior is preserved through explicit redirects; the router architecture is not migrated.
- Repository changes remain surgical. Major dependency migrations and a new identity platform are separate projects.

## 1. Canonical routing and static-resource boundary

### Canonical URL contract

Hash URLs remain canonical for application routes. `/` remains the application shell, and business routes use `/#/...`.

Clean URLs are compatibility inputs only and return temporary redirects:

- `/home` -> `/#/home`
- `/app-center` and `/app-center/*` -> the equivalent `/#/app-center...` route
- `/sops` and `/sops/*` -> the equivalent `/#/sops...` route
- `/amz-hub` and `/amz-hub/*` -> the equivalent `/#/amz-hub...` route
- `/more` and `/more/*` -> the equivalent `/#/more...` route
- Existing underscore-style aliases -> the equivalent Hash alias

The initial status is `302`. This avoids sticky client caching while the compatibility map is being proven. A later stable release may intentionally change the redirects to `308` after production evidence exists.

Clean URLs with query parameters are not a supported state-transfer format. Callers that need route query state must construct the canonical Hash URL directly. Client-side handling of an invalid Hash route remains unchanged by this project.

### Static 404 contract

`public/404.html` is a standalone static error document. It must not bootstrap the application or reference application chunks. Its presence disables the host's implicit fallback of every unknown path to `index.html`.

`public/_redirects` must contain redirects for supported clean routes and must not contain `200` rewrites of those routes to `index.html`.

The broad `/assets/*` one-year immutable header is removed because it also applies to missing assets. Extension-wide forced JavaScript and CSS MIME rules are removed because they can label an HTML error body as executable content. Existing files use the static host's detected MIME type and normal cache behavior.

Unknown clean paths and missing JS, CSS, image, and other asset paths must return a true `404`, must not return the application shell, and must not advertise a one-year immutable cache policy.

### Verification layers

Local artifact-contract tests verify:

- every supported clean-route mapping, redirect status, and Hash target;
- absence of clean-route `200` rewrites;
- absence of broad missing-asset cache and MIME overrides;
- presence and standalone content of `dist/404.html`;
- presence of `_redirects` and `_headers` in the packaged artifact.

Local tests do not claim to prove Cloudflare behavior. `release:production-gate` probes a real Pages preview and verifies status, `Location`, MIME, cache headers, and body identity for representative routes and missing assets.

## 2. Release gate and publication flow

### Single source of truth

`npm run release:gate` becomes the authoritative release-candidate gate. It executes these stages in order and stops at the first failure:

1. security and secret checks;
2. type checks, lint, warning baseline, formatting, and architecture audits;
3. full Vitest with four-dimensional coverage thresholds;
4. one production build of `dist`;
5. local artifact-contract verification;
6. release smoke against that existing `dist`;
7. isolated performance gate;
8. release packaging, archive inspection, SBOM generation, build metadata verification, and SHA256 verification.

The command must not rebuild between smoke, performance, and packaging. All downstream checks consume the same `dist` directory.

### Release Playwright configuration

A dedicated Release Playwright configuration starts `vite preview` for the already-built artifact on a fixed local port. It uses one Chromium worker, zero retries, normal browser security, and a bounded global timeout. It does not invoke the development server and does not silently reuse an unrelated server.

The default test timeout remains 30 seconds. Release Smoke has a five-minute global budget. A longer test-level timeout is allowed only for a named long-running business operation and must include a reason at the call site.

Release smoke uses only canonical Hash URLs. Each route assertion verifies:

- the exact final Hash route;
- a route-specific stable selector or semantic heading;
- absence of route/module error fallbacks;
- successful initial JavaScript and CSS responses with expected MIME types;
- absence of unexpected console and page errors.

Generic main-content length is not sufficient evidence because it allows the home page to satisfy a test for another route.

### Release workflow semantics

The release workflow calls the same local gate rather than maintaining a second command list. It is self-contained and does not depend on the status of a separate Quality Gate workflow.

Publication rules are:

- a tag-triggered release checks out that tag and proves that tag, `HEAD`, `package.json`, lockfile version metadata, and CHANGELOG agree;
- a manual run with an explicit tag checks out and verifies that exact existing tag;
- a manual run without a tag is dry-run packaging only and cannot create or update a GitHub Release;
- packaging and SHA256 verification complete before any release mutation;
- the publish step is unreachable when any gate fails.

While GitHub Actions quota is exhausted, workflow files can be linted and reviewed locally but an Actions run is not completion evidence.

## 3. E2E isolation, performance, and timeout governance

### Test classes

The browser tests have three independent entry points:

#### Release smoke

- production `dist` only;
- one worker and zero retries;
- normal Chromium security;
- short, explicit global budget;
- route and artifact correctness only.

#### Functional E2E

- a fresh Playwright `Page` and reset browser storage for each test;
- network mocks reinstalled for each test;
- no live dependency on LLM, scraper, or other external APIs;
- no file-scoped mutable Page Object shared across tests;
- zero correctness retries;
- serial mode only where business flow requires it, with independent setup retained;
- module groups run as separate bounded commands so one timeout cannot prevent unrelated specs from running.

Each functional module group has a 10-minute global budget. The aggregate runner reports every group and fails if any test is failed, interrupted, skipped unexpectedly, or not run. A passing aggregate result means all selected tests executed.

#### Performance gate

The performance gate runs against the production build with one worker and no concurrent functional suite. Home, Scraper, AI Analysis, and Promptlab are measured in isolated route runs.

The current repeated Lighthouse pattern is consolidated. One collected report supplies all assertions for a run rather than starting a new audit for every metric. After one server warm-up, each route receives three measured audits; timing metrics use the median. Resource errors, console errors, missing reports, and malformed metrics fail regardless of the median.

Existing performance thresholds are not weakened. Each Lighthouse audit has an explicit timeout, and the complete performance gate has its own 10-minute budget. Exceeding that budget is a performance-gate failure, not a reason to raise the global timeout of unrelated E2E tests.

### Known deterministic corrections

- `ScraperPage.waitForScrapeComplete()` passes `undefined` as the page-function argument and `{ timeout }` as the third `waitForFunction` argument.
- The NPI Tracker viewport test locates the unique dialog panel by its semantic role or stable panel selector, asserts a count of one, and then measures that element. It does not use `.first()` to hide duplicate DOM.
- Global Chromium arguments that disable web security or site isolation are removed. Cross-origin behavior required by a test is represented through Playwright request routing or a separately scoped opt-in project that is excluded from release evidence.

### E2E completion contract

- Every functional module passes alone and in its aggregate group.
- The full selected functional set finishes with zero failures, zero interruptions, and zero unexpected skipped/not-run tests.
- Release smoke passes against the same `dist` that is packaged.
- Performance passes repeatedly in its isolated runner and stays within its suite budget.
- Any remaining failures after the known fixes are diagnosed and corrected; the initial list is not assumed exhaustive.

## 4. Quality metrics and technical-debt gate

### Runtime contract

`package.json` declares Node `^20.19.0 || >=22.12.0`. A checked-in `.node-version` contains `20.19.0` and selects the minimum supported 20.x line for local tools and automation. Documentation and workflow configuration use that source rather than an unconstrained `20.x` declaration.

### Coverage ratchet

Vitest and the release quality gate enforce all dimensions:

- lines: 82%;
- statements: 80%;
- functions: 82%;
- branches: 65%.

These values are below the audited baseline but materially above the previous 60/60/60/55 gate. A future increase is a deliberate ratchet change. Missing or incomplete coverage data fails before threshold comparison.

### Fail-closed measurements

Quality measurements distinguish a successful measurement from a collection error. A conceptual result has either an `ok` value or an `error` with a reason; consumers cannot substitute a numeric zero for an error.

Specific behavior:

- ESLint execution or JSON parse failure fails the complexity and lint measurement.
- A successful ESLint scan with no complexity violations reports zero violations; it does not claim an unmeasured average or maximum is zero.
- Missing, malformed, or stale `jscpd` output fails duplication measurement.
- Missing or incomplete coverage fails coverage measurement.
- Type-coverage collection failure fails type coverage.
- Strict release mode treats breached quality thresholds as errors, including duplication and coverage.
- `quality:monitor.ts` retains one implementation of alert, recommendation, persistence, and build-blocking methods; duplicated implementations are removed.

Unit tests cover success, threshold boundary, missing-tool, missing-report, malformed-report, and command-failure paths.

### Technical-debt findings

The scanner currently emits 17 medium records across five files. Multiple records are overlapping offsets from the same duplicate block. The implementation must:

- give a duplicate clone group one stable finding identity instead of one record per overlapping starting line;
- replace the explicit test-store `any` with the narrow store type used by the renderer;
- extract only genuinely repeated production or test helpers where the extracted name expresses the shared behavior;
- avoid broad file, directory, or rule suppression.

The release target is zero actionable critical, high, or medium scanner findings. A scanner correction is acceptable only when a regression test proves that a real duplicate is still detected and overlapping offsets are deduplicated.

## 5. Dependencies and supply-chain artifacts

Dependencies that can move within their existing major-version contract are updated and verified through the full release gate. Major migrations such as Sentry 7 to 10, ESLint 8 to 10, Tailwind 3 to 4, TypeScript 5 to 7, jsdom 23 to 29, or similar breaking upgrades are not mixed into this hardening change because the current production audit reports zero vulnerabilities.

Deferred major upgrades are documented with their required migration and verification work. They are not represented as security blockers while the audit remains clean.

Release packaging generates `release-artifacts/sbom.cdx.json` in CycloneDX JSON format from the locked production dependency graph. The SBOM, `build-info.json`, `release-readiness.json`, distribution archive, and release notes are included in `SHA256SUMS.txt`; archive inspection confirms required deployment files are present.

GitHub Actions references are pinned to reviewed commit SHAs. Quota recovery and an Actions execution remain out of scope, but mutable action tags are not retained as the intended final configuration.

## 6. Monitoring, authentication, and production governance

### Product security boundary

README, deployment documentation, and the technical-debt record state that the current application is a public static, single-user BYOK tool:

- browser storage and route guards are not authentication or authorization;
- API providers or gateways must enforce their own credentials, quotas, and logs;
- the repository and static host do not contain private production API keys;
- multi-user access, private shared data, centrally managed credentials, or role-based behavior require a trusted server-side identity and authorization project before release in that mode.

No mock or local authentication state may be described as a security control.

### Monitoring gate

Sentry remains optional for development and dry-run builds. A production artifact must either:

1. include the approved `VITE_SENTRY_DSN` at build time and demonstrate a controlled preview event reaching the expected Sentry project; or
2. carry an explicit release decision accepting an unmonitored production launch.

The DSN is never committed. A waiver records a non-empty reason, approving GitHub identity, and approval timestamp in `release-artifacts/release-readiness.json`. The default production verdict is blocked when neither verified evidence nor a complete waiver exists. Local release-candidate success alone does not imply monitoring is configured.

### Production gate interface

`npm run release:production-gate` is read-only and never deploys. It requires a `PAGES_PREVIEW_URL` and consumes the release-candidate artifact produced by `release:gate`. It performs the real redirect, 404, MIME, cache, route, and console probes against that URL.

Monitoring has two explicit modes:

- `verified`: the preview is built with the approved DSN, a controlled event is triggered, and Sentry API credentials supplied only through the process environment confirm that event in the expected organization and project;
- `waived`: the required reason, approver, and timestamp are written to the readiness record and the final human-readable verdict states that production has no application error monitoring.

Secrets and DSN values are redacted from command output and readiness artifacts. The command writes `release-artifacts/release-readiness.json` with `passed`, `failed`, or `externally_unverified` for every production contract. Any failed or externally unverified required contract makes the production-ready verdict false.

### Repository and deployment controls

- `.github/CODEOWNERS` assigns the repository to `@earshore`.
- Deployment documentation defines tag/version checks, preview verification, production cutover, rollback, and post-deploy smoke.
- Branch protection, required reviews/checks, the current Pages project, and target deployment history are verified through GitHub and Cloudflare when valid credentials are available.
- No branch-protection or deployment state is invented from repository files.
- This project does not push, tag, publish, or deploy without separate authorization.

## 7. Data and control flow

The release-candidate path is:

```text
clean checkout
  -> dependency install on supported Node
  -> security and quality checks
  -> full unit coverage
  -> one production build
  -> artifact contract
  -> release smoke
  -> isolated performance gate
  -> package + SBOM + hashes
  -> release-candidate verdict
```

The production-readiness path extends that evidence:

```text
release candidate artifact
  -> production monitoring decision
  -> Cloudflare Pages preview
  -> redirect/404/MIME/cache probes
  -> controlled monitoring event or waiver
  -> repository/deployment control confirmation
  -> production-ready verdict
```

Any failed or missing node stops its path. A downstream pass cannot compensate for missing upstream evidence.

## 8. Error handling and reporting

- Commands return a non-zero exit code for failed checks, missing evidence, malformed reports, timeout, interruption, or incomplete selection.
- Human-readable output names the failed stage and preserves the underlying command/report path.
- Machine-readable release-readiness output records each contract as passed, failed, or externally unverified. “Externally unverified” is never converted to passed.
- Generated reports and timestamps remain ignored unless they are deliberate release artifacts or documentation updates.
- GitHub quota failures are reported as unavailable infrastructure and excluded from the local product verdict; they do not convert a failed product check into a pass.

## 9. Verification matrix

| Requirement                               | Authoritative evidence                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| Hash routes are canonical                 | Redirect contract tests and exact Release Smoke URL assertions          |
| Missing assets are not the app shell      | Local artifact rules plus real Pages preview HTTP responses             |
| Release uses one tested artifact          | One-build gate logs, Release Playwright config, archive hashes          |
| Manual release cannot publish wrong code  | Workflow ref/tag/version contract tests and static workflow validation  |
| Release pages are correct                 | Route-specific selectors and exact final Hash URLs                      |
| Functional E2E is isolated                | Per-test fixtures plus standalone and aggregate pass results            |
| Performance is not resource-contended     | Dedicated one-worker runner and three-run median reports                |
| Browser security matches users            | Chromium launch configuration without security-disabling flags          |
| Quality data fails closed                 | Unit tests for absent/malformed/failed measurement sources              |
| Coverage cannot regress below the ratchet | Vitest threshold output for all four dimensions                         |
| Actionable scanner debt is closed         | Scanner output with zero critical/high/medium actionable findings       |
| Runtime support is truthful               | Package engine, version file, install/build on a supported Node version |
| Dependency graph is auditable             | Lockfile, zero-vulnerability audit, CycloneDX SBOM, SHA256SUMS          |
| Product security scope is explicit        | README and deployment/security documentation                            |
| Monitoring is configured or waived        | Preview Sentry event evidence or explicit release decision              |
| Production host behavior is verified      | Cloudflare preview HTTP-contract report                                 |

## 10. Completion criteria

The implementation phase is complete only when all locally controllable requirements below are proven from the final worktree:

- routing, 404, header, and artifact contracts pass;
- `release:gate` passes from a clean build and produces verified package artifacts;
- Release Smoke uses the built artifact and route-specific assertions;
- the selected full functional E2E set completes with no failed, interrupted, or unexpectedly unexecuted tests;
- the isolated performance gate passes within its budget;
- coverage meets 82/80/82/65;
- quality measurements fail closed and their regression tests pass;
- the technical-debt scan has no actionable medium-or-higher finding;
- the supported Node contract is consistent across package, docs, and automation;
- safe dependency updates, security audit, SBOM, and hashes pass;
- product scope, monitoring decision, rollback, and deployment prerequisites are documented;
- Git status contains only the intended commits and no generated-report noise.

After those checks, the repository can be called **release-candidate ready**.

It can be called **production ready** only after the Cloudflare preview contract, monitoring decision, and externally managed repository/deployment controls are verified with valid credentials. Until then, the final report must say that production readiness remains externally unverified.

## Out of scope

- restoring or purchasing GitHub Actions quota;
- claiming an Actions run passed while quota is unavailable;
- deploying or rolling back Cloudflare Pages;
- creating tags, GitHub Releases, or production credentials;
- building a real identity/authorization service;
- migrating all dependencies across major versions;
- changing the Hash router to History API routing;
- adding speculative per-file immutable cache generation;
- unrelated UI, feature, or architectural refactoring.
