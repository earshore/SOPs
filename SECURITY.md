# Security Policy

## Supported versions

| Version                               | Supported                                                  |
| ------------------------------------- | ---------------------------------------------------------- |
| Latest GA (`vX.Y.Z` on GitHub Latest) | Yes — security fixes                                       |
| Current RC line (`vX.Y.Z-rc.N`)       | Best effort — fix lands in next RC/GA                      |
| Older GA (previous minor/patch only)  | Critical issues may be backported at maintainer discretion |
| End-of-life / unlisted tags           | No                                                         |

See [docs/RELEASE_POLICY.md](./docs/RELEASE_POLICY.md) for channel rules.

## Reporting a vulnerability

Please **do not** open a public GitHub Issue for security-sensitive reports.

Prefer one of:

1. Contact the repository maintainers through your internal team channel (recommended for this private ops platform).
2. Email the maintainer address on record for the GitHub account that owns this repository.

Include when possible:

- Affected version (`package.json` / UI version / git tag)
- Impact (data exposure, XSS, secret leak, auth bypass, etc.)
- Reproduction steps or proof-of-concept (minimal)
- Whether the issue is already exploited

You should receive an acknowledgement within **3 business days**. Critical production issues should be escalated via the internal ops channel immediately.

## Secrets and credentials

- Never commit API keys, tokens, or passwords.
- Production LLM keys must not be stored in this repository or in Cloudflare Pages project secrets for model access; users configure keys in the browser settings page. Gateway policy lives in the new-api admin.
- If a secret is committed: rotate it immediately, purge from history if required, and notify maintainers.

## Security tooling in this repo

- XSS gate: `npm run xss:gate`
- Secret leak scan: `npm run secret:scan`
- Broader audit helpers: `npm run security:audit`
- CI aggregates security checks via `npm run ci:security`

## Playbook (threat model + acceptance)

Operational security guidance for this **BYOK static** product (threat model, residual risk, PR/RC checklists):

→ **[docs/SECURITY_PLAYBOOK.md](./docs/SECURITY_PLAYBOOK.md)**

Related: [docs/PRODUCT_PRINCIPLES.md](./docs/PRODUCT_PRINCIPLES.md), [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md), [docs/OPS_RUNBOOK.md](./docs/OPS_RUNBOOK.md), open debt on [docs/TECH_DEBT_BOARD.md](./docs/TECH_DEBT_BOARD.md). Doc index: [docs/INDEX.md](./docs/INDEX.md).

## Production monitoring decision

- **Default:** Sentry is **disabled**. No DSN is shipped in the repository or Cloudflare Pages project for LLM/model access, and `.env.example` leaves monitoring off.
- **Enable only deliberately:** set `VITE_SENTRY_DSN` on a production build, confirm CSP `connect-src` allows the ingest host, then verify one real error event in Sentry.
- **Without Sentry:** browser console + any in-app error UI remain the operational signal; this is an accepted tradeoff for the current single-user BYOK static deployment.
- Do not treat “Sentry not configured” as a release blocker unless the release notes claim monitoring is on.

## Disclosure

For this private internal platform, fixes are typically shipped in the next RC/GA without a public CVE process unless maintainers decide otherwise.
