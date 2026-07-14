import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

const REQUIRED_ROOT_HEADERS = new Map<string, string>([
  [
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; style-src-elem 'self'; font-src 'self' data:; img-src 'self' data: https: blob:; connect-src 'self' https://new.hongecb.store https://api.scraperapi.com https://api.zenrows.com https://api.brightdata.com https://*.amazon.de https://*.amazon.fr https://*.amazon.it https://*.amazon.es https://*.amazon.nl https://*.amazon.se https://*.amazon.pl https://*.amazon.com.be https://*.amazon.ie https://*.amazon.co.uk https://*.amazon.com https://*.amazon.ca https://*.amazon.com.mx https://*.amazon.co.jp https://*.amazon.com.au https://*.amazon.in https://*.amazon.sg https://*.amazon.com.br https://*.amazon.com.tr https://*.amazon.ae https://*.amazon.sa; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests",
  ],
  ['X-Content-Type-Options', 'nosniff'],
  ['X-Frame-Options', 'DENY'],
  ['X-XSS-Protection', '1; mode=block'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'geolocation=(), microphone=(), camera=()'],
]);

interface HeaderBlock {
  path: string;
  headers: Array<{ name: string; value: string }>;
}

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPOSITORY_PUBLIC = resolve(REPOSITORY_ROOT, 'public');

function parseRedirectDeclarations(source: string): {
  rules: RedirectRule[];
  malformed: string[];
} {
  const rules: RedirectRule[] = [];
  const malformed: string[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    if (tokens.length !== 3 || !/^\d{3}$/.test(tokens[2] ?? '')) {
      malformed.push(line);
      continue;
    }

    const [from, destination, statusText] = tokens;
    rules.push({ source: from, destination, status: Number(statusText) });
  }
  return { rules, malformed };
}

export function parseRedirectRules(source: string): RedirectRule[] {
  return parseRedirectDeclarations(source).rules;
}

function parseHeaderBlocks(source: string): { blocks: HeaderBlock[]; malformed: string[] } {
  const blocks: HeaderBlock[] = [];
  const malformed: string[] = [];
  let currentBlock: HeaderBlock | undefined;

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;

    if (!/^\s/.test(rawLine)) {
      if (!line.startsWith('/')) {
        malformed.push(line);
        currentBlock = undefined;
        continue;
      }
      currentBlock = { path: line, headers: [] };
      blocks.push(currentBlock);
      continue;
    }

    const separator = line.indexOf(':');
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!currentBlock || separator <= 0 || !/^[A-Za-z0-9-]+$/.test(name) || value.length === 0) {
      malformed.push(line);
      continue;
    }
    currentBlock.headers.push({ name, value });
  }

  return { blocks, malformed };
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
  const resolvedRoot = resolve(root);
  const errors: string[] = [];
  const redirectsText = readRequired(resolvedRoot, '_redirects', errors);
  const headersText = readRequired(resolvedRoot, '_headers', errors);
  const notFound = readRequired(resolvedRoot, '404.html', errors);
  const isRepositoryPublic =
    process.platform === 'win32'
      ? resolvedRoot.toLowerCase() === REPOSITORY_PUBLIC.toLowerCase()
      : resolvedRoot === REPOSITORY_PUBLIC;
  const indexRoot = isRepositoryPublic ? REPOSITORY_ROOT : resolvedRoot;
  readRequired(indexRoot, 'index.html', errors);

  const parsedRedirects = parseRedirectDeclarations(redirectsText);
  const rules = parsedRedirects.rules;
  for (const line of parsedRedirects.malformed) {
    errors.push(`malformed redirect: ${line}`);
  }
  for (const required of REQUIRED_REDIRECTS) {
    if (!rules.some(rule => JSON.stringify(rule) === JSON.stringify(required))) {
      errors.push(
        `missing redirect: ${required.source} ${required.destination} ${required.status}`
      );
    }
  }
  if (
    rules.length !== REQUIRED_REDIRECTS.length ||
    rules.some((rule, index) => JSON.stringify(rule) !== JSON.stringify(REQUIRED_REDIRECTS[index]))
  ) {
    errors.push('redirect declarations must exactly match required order');
  }
  if (rules.some(rule => rule.status === 200 && rule.destination === '/index.html')) {
    errors.push('clean routes must not rewrite to index.html with status 200');
  }

  const parsedHeaders = parseHeaderBlocks(headersText);
  for (const line of parsedHeaders.malformed) {
    errors.push(`malformed header declaration: ${line}`);
  }

  const rootBlocks = parsedHeaders.blocks.filter(block => block.path === '/*');
  if (rootBlocks.length !== 1) {
    errors.push('root header block must appear exactly once');
  } else {
    const rootHeaders = rootBlocks[0].headers;
    for (const [name, value] of REQUIRED_ROOT_HEADERS) {
      const matches = rootHeaders.filter(header => header.name === name);
      if (matches.length === 0) {
        errors.push(`missing root security header: ${name}`);
      } else if (matches.length > 1) {
        errors.push(`duplicate root security header: ${name}`);
      } else if (matches[0].value !== value) {
        errors.push(`invalid root security header: ${name}`);
      }
    }
    for (const header of rootHeaders) {
      if (!REQUIRED_ROOT_HEADERS.has(header.name)) {
        errors.push(`unexpected root security header: ${header.name}`);
      }
    }
  }

  const nonRootBlocks = parsedHeaders.blocks.filter(block => block.path !== '/*');
  for (const block of nonRootBlocks) {
    errors.push(`non-root header block is not allowed: ${block.path}`);
  }
  if (
    nonRootBlocks.some(
      block =>
        block.path === '/assets/*' &&
        block.headers.some(header => /\bimmutable\b/i.test(header.value))
    )
  ) {
    errors.push('/assets/* must not apply immutable caching to missing resources');
  }
  if (nonRootBlocks.some(block => /\/\*\.(?:js|mjs|ts|css)/i.test(block.path))) {
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
