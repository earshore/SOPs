/**
 * Shared UI audit — button / form composition guard (TD-CMP-01).
 *
 * Enforces COMPONENT_GUIDELINES.md §2/§3/§5:
 *  - Business `<button>` elements must not reinvent styling with raw
 *    Tailwind color utilities (baseline tracked, gate fails on increase).
 *  - Confirmation dialogs must use `confirmWithModal`; `confirm(`
 *    / `window.confirm(` are banned outside devtools.
 *
 * Usage:
 *   npm run button-ui:audit    # report only
 *   npm run button-ui:baseline # refresh config/button-style-baseline.json
 *   npm run button-ui:gate     # hard bans + fail on baseline increase
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');
const srcRoot = join(repoRoot, 'src');
const baselinePath = join(repoRoot, 'config', 'button-style-baseline.json');

const SOURCE_EXTENSIONS = new Set(['.html', '.js', '.jsx', '.ts', '.tsx']);
const DEVTools_SEGMENT = 'devtools';

/** Tailwind color utilities on a button (any family, incl. white/black). */
const COLOR_UTIL_RE =
  /(?:bg|text|border|ring)-(?:blue|slate|emerald|amber|red|green|gray|zinc|indigo|violet|purple|pink|rose|orange|yellow|teal|cyan|sky|fuchsia|lime|white|black)(?:\/\d{1,3})?/;

const BUTTON_TAG_RE = /<button\b[^>]*>/g;
const CONFIRM_RE = /\b(?:window\.)?confirm\(/;

interface FileHit {
  file: string;
  count: number;
  samples: string[];
}

interface ButtonScan {
  filesScanned: number;
  filesWithHits: number;
  total: number;
  files: FileHit[];
}

interface BaselineFile {
  version: 1;
  scope: 'buttons';
  total: number;
  filesScanned: number;
  filesWithHits: number;
  updatedAt: string;
  files: Record<string, number>;
}

interface BanFinding {
  file: string;
  line: number;
  value: string;
}

function isTestFile(fileName: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName);
}

function isDevtoolsFile(relativePath: string): boolean {
  return relativePath.split(/[\\/]/).includes(DEVTools_SEGMENT);
}

function collectSourceFiles(directory: string, fileList: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      collectSourceFiles(path, fileList);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(extname(entry)) && !isTestFile(entry)) {
      fileList.push(path);
    }
  }

  return fileList;
}

function scanButtons(files: string[]): ButtonScan {
  const hits = new Map<string, FileHit>();

  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    const fileHits: string[] = [];

    for (const line of lines) {
      for (const match of line.matchAll(BUTTON_TAG_RE)) {
        const tag = match[0];
        const color = tag.match(COLOR_UTIL_RE);
        if (color) {
          fileHits.push(`${color[0]} in ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }

    if (fileHits.length > 0) {
      const relativePath = file.slice(srcRoot.length + 1).replace(/\\/g, '/');
      hits.set(relativePath, {
        file: relativePath,
        count: fileHits.length,
        samples: fileHits.slice(0, 3),
      });
    }
  }

  const filesWithHits = [...hits.values()];
  return {
    filesScanned: files.length,
    filesWithHits: filesWithHits.length,
    total: filesWithHits.reduce((sum, hit) => sum + hit.count, 0),
    files: filesWithHits,
  };
}

function scanBans(files: string[]): BanFinding[] {
  const findings: BanFinding[] = [];

  for (const file of files) {
    const relativePath = file.slice(srcRoot.length + 1).replace(/\\/g, '/');
    if (isDevtoolsFile(relativePath)) {
      continue;
    }

    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index] ?? '';
      if (CONFIRM_RE.test(line)) {
        findings.push({ file: relativePath, line: index + 1, value: line.trim().slice(0, 120) });
      }
    }
  }

  return findings;
}

function loadBaseline(): BaselineFile | null {
  if (!existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
}

function writeBaseline(scan: ButtonScan): void {
  const baseline: BaselineFile = {
    version: 1,
    scope: 'buttons',
    total: scan.total,
    filesScanned: scan.filesScanned,
    filesWithHits: scan.filesWithHits,
    updatedAt: new Date().toISOString(),
    files: Object.fromEntries(scan.files.map(hit => [hit.file, hit.count])),
  };
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}

function main(): void {
  const updateBaseline = process.argv.includes('--update-baseline');
  const failOnIncrease = process.argv.includes('--fail-on-increase');
  const files = collectSourceFiles(srcRoot);
  const scan = scanButtons(files);
  const bans = scanBans(files);

  console.log(
    `Button color-utility hits: ${scan.total} in ${scan.filesWithHits}/${scan.filesScanned} files.`
  );
  console.log(`Confirm-dialog violations: ${bans.length}.`);

  if (updateBaseline) {
    writeBaseline(scan);
    console.log(`Baseline written to config/button-style-baseline.json (total=${scan.total}).`);
  }

  let failed = false;

  for (const finding of bans) {
    console.error(`- ${finding.file}:${finding.line}: ${finding.value}`);
  }
  if (bans.length > 0) {
    console.error(
      'confirm(/window.confirm( is banned outside devtools — use confirmWithModal (COMPONENT_GUIDELINES.md §5).'
    );
    failed = true;
  }

  if (failOnIncrease) {
    const baseline = loadBaseline();
    if (baseline && scan.total > baseline.total) {
      console.error(`Button style baseline exceeded: ${scan.total} > ${baseline.total}.`);
      for (const hit of scan.files) {
        const previous = baseline.files[hit.file] ?? 0;
        if (hit.count > previous) {
          console.error(`- ${hit.file}: ${previous} -> ${hit.count}`);
        }
      }
      console.error('Use npm run button-ui:baseline only for an intentional, reviewed change.');
      failed = true;
    } else if (!baseline) {
      console.error(
        'Missing config/button-style-baseline.json — run npm run button-ui:baseline first.'
      );
      failed = true;
    } else {
      console.log(`Button style baseline ok (${scan.total} <= ${baseline.total}).`);
    }
  }

  if (failed) {
    process.exitCode = 1;
    return;
  }

  console.log('Shared UI audit passed.');
}

void main();
