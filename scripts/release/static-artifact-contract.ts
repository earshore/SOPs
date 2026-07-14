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
