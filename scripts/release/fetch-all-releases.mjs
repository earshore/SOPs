import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = join(ROOT, 'release-artifacts');
mkdirSync(outDir, { recursive: true });

const raw = execSync(
  'gh api "repos/earshore/SOPs/releases?per_page=100" --paginate --slurp',
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 }
);
const pages = JSON.parse(raw);
const flat = Array.isArray(pages[0]) ? pages.flat() : pages;

const slim = flat.map((r) => ({
  tag_name: r.tag_name,
  name: r.name,
  prerelease: r.prerelease,
  draft: r.draft,
  published_at: r.published_at,
  body: r.body || '',
  assets: (r.assets || []).map((a) => a.name),
  target_commitish: r.target_commitish,
}));

writeFileSync(join(outDir, 'all-releases.json'), JSON.stringify(slim, null, 2), 'utf8');
console.log('saved', slim.length, 'releases');
for (const r of slim) {
  console.log(r.tag_name, r.prerelease ? 'pre' : 'ga', 'body=' + (r.body || '').length);
}
