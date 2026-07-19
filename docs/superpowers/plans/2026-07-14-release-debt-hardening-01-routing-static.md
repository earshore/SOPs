# Routing and Static-Host Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hash URLs canonical, redirect supported clean URLs, and guarantee that missing static resources cannot become cached application shells.

**Architecture:** A small release-contract module parses `_redirects` and `_headers` and validates either `public/` or built `dist/`. Cloudflare-specific runtime behavior remains a production-gate probe in Plan 4; this plan proves the repository and artifact declarations locally.

**Tech Stack:** TypeScript, Vitest, Vite public assets, Cloudflare Pages `_redirects`/`_headers`

---

## File map

- Create `scripts/release/static-artifact-contract.ts`: parse and validate redirect/header/error-document contracts; expose a CLI.
- Create `tests/unit/static-artifact-contract.test.ts`: unit fixtures and repository-level regression coverage.
- Create `public/404.html`: standalone error document with no app bootstrap.
- Modify `public/_redirects`: replace SPA rewrites with `302` Hash redirects.
- Modify `public/_headers`: retain security headers and remove broad asset cache/MIME overrides.
- Modify `package.json`: add `release:artifact-contract`.

### Task 1: Build the static-artifact validator

**Files:**

- Create: `scripts/release/static-artifact-contract.ts`
- Create: `tests/unit/static-artifact-contract.test.ts`

- [ ] **Step 1: Write the parser and fixture tests**

Create tests that import the not-yet-existing module and exercise a valid temporary artifact plus a missing `404.html`:

```ts
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseRedirectRules,
  validateStaticArtifact,
} from '../../scripts/release/static-artifact-contract';

function makeArtifact(): string {
  const root = mkdtempSync(join(tmpdir(), 'sops-static-contract-'));
  mkdirSync(join(root, 'assets'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>SOPs</title>');
  writeFileSync(join(root, '404.html'), '<!doctype html><title>Not Found</title>');
  writeFileSync(
    join(root, '_redirects'),
    [
      '/home /#/home 302',
      '/app-center /#/app-center 302',
      '/app-center/* /#/app-center/:splat 302',
      '/sops /#/sops 302',
      '/sops/* /#/sops/:splat 302',
      '/amz-hub /#/amz-hub 302',
      '/amz-hub/* /#/amz-hub/:splat 302',
      '/more /#/more 302',
      '/more/* /#/more/:splat 302',
      '/sops_* /#/sops_:splat 302',
      '/amz_* /#/amz_:splat 302',
      '/more_* /#/more_:splat 302',
      '',
    ].join('\n')
  );
  writeFileSync(join(root, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n');
  return root;
}

describe('static artifact contract', () => {
  it('parses redirect source, destination, and status', () => {
    expect(parseRedirectRules('/home /#/home 302\n')).toEqual([
      { source: '/home', destination: '/#/home', status: 302 },
    ]);
  });

  it('accepts a standalone 404 and safe redirect/header declarations', () => {
    expect(validateStaticArtifact(makeArtifact())).toEqual([]);
  });

  it('rejects an artifact without a standalone 404 document', () => {
    const root = makeArtifact();
    writeFileSync(join(root, '404.html'), '<script type="module" src="/src/main.ts"></script>');
    expect(validateStaticArtifact(root)).toContain('404.html must not bootstrap the application');
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
npx vitest run tests/unit/static-artifact-contract.test.ts
```

Expected: FAIL because `scripts/release/static-artifact-contract.ts` does not exist.

- [ ] **Step 3: Implement the validator and CLI**

Create the module with these public interfaces and checks:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface RedirectRule {
  source: string;
  destination: string;
  status: number;
}

const REQUIRED_REDIRECTS: RedirectRule[] = [
  { source: '/home', destination: '/#/home', status: 302 },
  { source: '/app-center', destination: '/#/app-center', status: 302 },
  { source: '/app-center/*', destination: '/#/app-center/:splat', status: 302 },
  { source: '/sops', destination: '/#/sops', status: 302 },
  { source: '/sops/*', destination: '/#/sops/:splat', status: 302 },
  { source: '/amz-hub', destination: '/#/amz-hub', status: 302 },
  { source: '/amz-hub/*', destination: '/#/amz-hub/:splat', status: 302 },
  { source: '/more', destination: '/#/more', status: 302 },
  { source: '/more/*', destination: '/#/more/:splat', status: 302 },
  { source: '/sops_*', destination: '/#/sops_:splat', status: 302 },
  { source: '/amz_*', destination: '/#/amz_:splat', status: 302 },
  { source: '/more_*', destination: '/#/more_:splat', status: 302 },
];

export function parseRedirectRules(source: string): RedirectRule[] {
  return source
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .map(line => {
      const [from, destination, statusText] = line.split(/\s+/);
      return { source: from, destination, status: Number(statusText) };
    });
}

function readRequired(root: string, name: string, errors: string[]): string {
  const path = resolve(root, name);
  if (!existsSync(path)) {
    errors.push(`${name} is missing`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

export function validateStaticArtifact(root: string): string[] {
  const errors: string[] = [];
  const redirectsText = readRequired(root, '_redirects', errors);
  const headersText = readRequired(root, '_headers', errors);
  const notFound = readRequired(root, '404.html', errors);
  readRequired(root, 'index.html', errors);

  const rules = parseRedirectRules(redirectsText);
  for (const required of REQUIRED_REDIRECTS) {
    if (!rules.some(rule => JSON.stringify(rule) === JSON.stringify(required))) {
      errors.push(
        `missing redirect: ${required.source} ${required.destination} ${required.status}`
      );
    }
  }
  if (rules.some(rule => rule.status === 200 && rule.destination === '/index.html')) {
    errors.push('clean routes must not rewrite to index.html with status 200');
  }
  if (/\/assets\/\*[\s\S]*?immutable/i.test(headersText)) {
    errors.push('/assets/* must not apply immutable caching to missing resources');
  }
  if (/\/\*\.(?:js|mjs|ts|css)/i.test(headersText)) {
    errors.push('extension-wide MIME overrides are not allowed');
  }
  if (/<script\b|\/assets\/|src\/main\.ts/i.test(notFound)) {
    errors.push('404.html must not bootstrap the application');
  }
  return errors;
}

export function assertStaticArtifact(root: string): void {
  const errors = validateStaticArtifact(root);
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

const directRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (directRun) {
  assertStaticArtifact(resolve(process.argv[2] ?? 'dist'));
  console.log(`Static artifact contract passed: ${process.argv[2] ?? 'dist'}`);
}
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run:

```powershell
npx vitest run tests/unit/static-artifact-contract.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit the validator**

```powershell
git add scripts/release/static-artifact-contract.ts tests/unit/static-artifact-contract.test.ts
git commit -m "test: define static artifact contract"
```

### Task 2: Replace rewrites and unsafe asset headers

**Files:**

- Modify: `tests/unit/static-artifact-contract.test.ts`
- Modify: `public/_redirects`
- Modify: `public/_headers`
- Create: `public/404.html`
- Modify: `package.json`

- [ ] **Step 1: Add the repository regression test**

Append:

```ts
it('keeps public hosting declarations release-safe', () => {
  expect(validateStaticArtifact('public')).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```powershell
npx vitest run tests/unit/static-artifact-contract.test.ts
```

Expected: FAIL for missing `public/404.html`, missing `302` redirects, existing `200` rewrites, immutable asset caching, and extension-wide MIME rules.

- [ ] **Step 3: Replace `public/_redirects` exactly**

```text
# Hash URLs are canonical. Clean paths are compatibility redirects only.
/home /#/home 302
/app-center /#/app-center 302
/app-center/* /#/app-center/:splat 302
/sops /#/sops 302
/sops/* /#/sops/:splat 302
/amz-hub /#/amz-hub 302
/amz-hub/* /#/amz-hub/:splat 302
/more /#/more 302
/more/* /#/more/:splat 302
/sops_* /#/sops_:splat 302
/amz_* /#/amz_:splat 302
/more_* /#/more_:splat 302
```

- [ ] **Step 4: Reduce `public/_headers` to security headers**

Replace the file with the security-header block below; omit the `/assets/*`, `/*.js`, `/*.mjs`, `/*.ts`, and `/*.css` blocks:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; style-src-elem 'self'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://new.hongecb.store https://api.scraperapi.com https://api.zenrows.com https://api.brightdata.com https://*.amazon.de https://*.amazon.fr https://*.amazon.it https://*.amazon.es https://*.amazon.nl https://*.amazon.se https://*.amazon.pl https://*.amazon.com.be https://*.amazon.ie https://*.amazon.co.uk https://*.amazon.com https://*.amazon.ca https://*.amazon.com.mx https://*.amazon.co.jp https://*.amazon.com.au https://*.amazon.in https://*.amazon.sg https://*.amazon.com.br https://*.amazon.com.tr https://*.amazon.ae https://*.amazon.sa; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests

  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

- [ ] **Step 5: Add the standalone 404 document**

Create:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <title>404 · 页面不存在</title>
  </head>
  <body>
    <main>
      <h1>404</h1>
      <p>请求的页面或资源不存在。</p>
      <a href="/">返回首页</a>
    </main>
  </body>
</html>
```

- [ ] **Step 6: Add the artifact command**

Add to `package.json` scripts:

```json
"release:artifact-contract": "tsx scripts/release/static-artifact-contract.ts dist"
```

- [ ] **Step 7: Run the focused test to verify GREEN**

Run:

```powershell
npx vitest run tests/unit/static-artifact-contract.test.ts
```

Expected: all tests pass.

- [ ] **Step 8: Build and validate copied public assets**

Run:

```powershell
npm run build:app
npm run release:artifact-contract
```

Expected: Vite exits 0; `dist/404.html`, `dist/_redirects`, and `dist/_headers` exist; the artifact command prints `Static artifact contract passed: dist`.

- [ ] **Step 9: Commit hosting behavior**

```powershell
git add public/_redirects public/_headers public/404.html package.json tests/unit/static-artifact-contract.test.ts
git commit -m "fix: enforce hash routing and static 404"
```

### Task 3: Plan-level verification

**Files:**

- No additional files

- [ ] **Step 1: Run route and API header regression tests**

```powershell
npx vitest run tests/unit/static-artifact-contract.test.ts src/common/config/apiEndpoints.test.ts tests/unit/moduleManifest.test.ts
```

Expected: all selected tests pass.

- [ ] **Step 2: Run static checks and production build**

```powershell
npm run type-check
npm run lint
npm run format:check
npm run build:app
npm run release:artifact-contract
```

Expected: every command exits 0.

- [ ] **Step 3: Confirm the worktree scope**

```powershell
git status --short
git log -2 --oneline
```

Expected: no uncommitted changes; the two commits from Tasks 1 and 2 are the newest commits.
