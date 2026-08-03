// TD-SET-01 Phase 4: settings scale + dependency + storage-write gates (AC-5/6/8/9).
import { readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const settingsRoot = join(projectRoot, 'src/components/settings');
const maxFileLines = 600;
const limits = new Map<string, number>([
  ['systemSettings.ts', 900],
  ['systemSettings.html', 1200],
  ['systemSettings.css', 1200],
]);

const failures: string[] = [];

function countLines(file: string): number {
  return readFileSync(file, 'utf8').split(/\r?\n/).length - 1;
}

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, out);
    else if (/\.(ts|html|css)$/.test(entry) && !entry.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

// 1) file-size limits (AC-5)
for (const file of collectFiles(settingsRoot)) {
  const name = file.slice(settingsRoot.length + 1);
  const lines = countLines(file);
  if (limits.has(name)) {
    const limit = limits.get(name)!;
    if (lines > limit) failures.push(`${name}: ${lines} lines > ${limit} limit`);
  } else if (lines > maxFileLines) {
    failures.push(`${name}: ${lines} lines > section ${maxFileLines} limit`);
  }
}

// 2) dependency direction: sections/domain imported only from the shell layer (AC-6)
const srcRoot = join(projectRoot, 'src');
const externalImportRe = /['"]@\/components\/settings\/(?:sections|domain)\//;
for (const file of collectFiles(srcRoot).filter(f => /\.ts$/.test(f))) {
  if (/\.test\.ts$/.test(file)) continue;
  const rel = file.slice(settingsRoot.length + 1).replace(/\\/g, '/');
  if (rel.startsWith('sections/') || rel.startsWith('domain/')) continue;
  // Shell/composer files inside the settings root may import sections/domain.
  const relSettingsRoot = settingsRoot.replace(/\\/g, '/');
  const relFile = file.replace(/\\/g, '/');
  const insideSettingsRoot = relFile.startsWith(relSettingsRoot + '/') || relFile === relSettingsRoot;
  if (insideSettingsRoot) continue;
  const content = readFileSync(file, 'utf8');
  if (externalImportRe.test(content)) {
    failures.push(
      `external import of settings sections/domain: ${file.slice(srcRoot.length + 1).replace(/\\/g, '/')}`
    );
  }
}

// 3) UI direct storage writes must be zero (AC-9)
const directWriteRe = /StorageService\.(?:set|setSecure|removeSecure|setLLMConfig|setProxyKeyMap|setProxyConfigWithCredential)\s*\(|localStorage\.setItem|sessionStorage\.setItem/;
const uiFiles = [
  join(settingsRoot, 'systemSettings.ts'),
  ...collectFiles(join(settingsRoot, 'sections')).filter(f => /\.ts$/.test(f)),
];
for (const file of uiFiles) {
  if (directWriteRe.test(readFileSync(file, 'utf8'))) {
    failures.push(`UI direct storage write: ${file.slice(settingsRoot.length + 1)}`);
  }
}

// 4) dead stub exports must stay absent (AC-8)
const stubNames = [
  'initSettingsListeners',
  'saveProviderConfig',
  'loadProviderConfig',
  'fetchModels',
  'toggleApiKeyVisibility',
  'testConnection',
  'saveProxyConfig',
  'renderProxyInputUI',
];
const shellTs = readFileSync(join(settingsRoot, 'systemSettings.ts'), 'utf8');
for (const name of stubNames) {
  if (new RegExp(`export\\s+(?:async\\s+)?(?:const|function)\\s+${name}\\b`).test(shellTs)) {
    failures.push(`stub export revived: ${name}`);
  }
}

// 5) template assembly integrity: every shell slot resolves to a fragment (Phase 2)
const shellHtml = readFileSync(join(settingsRoot, 'systemSettings.html'), 'utf8');
const markers = [...shellHtml.matchAll(/<!--settings-slot:([A-Za-z0-9]+)-->/g)].map(m => m[1]);
const fragments = new Set(
  readdirSync(join(settingsRoot, 'sections'))
    .filter(f => f.endsWith('.html'))
    .map(f => f.replace(/\.html$/, '')),
);
for (const marker of markers) {
  if (!fragments.has(marker)) failures.push(`shell slot without fragment: ${marker}`);
}

if (failures.length > 0) {
  console.error('Settings scale audit FAILED:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`Settings scale audit passed (${collectFiles(settingsRoot).length} files, ${fragments.size} html fragments).`);
