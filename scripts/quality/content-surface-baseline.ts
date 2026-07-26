/**
 * Content surface hardcode baseline (T4) — bg-white / text-slate gate for business modules.
 *
 * Enterprise theme redesign (2026-07-26): business content must migrate to
 * semantic surfaces (.ui-card / .ui-panel / tokens). This gate makes the
 * light-only hardcode count monotonically decrease under src/modules.
 *
 * Usage:
 *   npx tsx scripts/quality/content-surface-baseline.ts
 *   npx tsx scripts/quality/content-surface-baseline.ts --update-baseline
 *   npx tsx scripts/quality/content-surface-baseline.ts --fail-on-increase
 *   npm run content-surface:baseline
 *   npm run content-surface:baseline:update
 *   npm run content-surface:gate
 *
 * Counters (gated independently — neither may exceed baseline):
 *   bgWhite   — solid `bg-white` utilities (translucent `bg-white/NN` excluded)
 *   textSlate — `text-slate-*` utilities used as content text color
 *
 * Exit codes:
 *   report / update-baseline → 0 on successful scan
 *   --fail-on-increase       → 1 when either counter exceeds baseline
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface FileHit {
  file: string;
  bgWhite: number;
  textSlate: number;
}

interface ScanResult {
  filesScanned: number;
  filesWithHits: number;
  bgWhite: number;
  textSlate: number;
  files: FileHit[];
}

interface BaselineFile {
  version: 1;
  scope: 'modules';
  bgWhite: number;
  textSlate: number;
  filesScanned: number;
  filesWithHits: number;
  updatedAt: string;
  /** Per-file counts for diffing migrations; gate uses totals only. */
  files: Record<string, { bgWhite: number; textSlate: number }>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');
const modulesRoot = join(repoRoot, 'src', 'modules');
const baselinePath = join(repoRoot, 'config', 'theme-content-surface-baseline.json');

/** Solid white surface utility (excludes translucent bg-white/NN overlays). */
const BG_WHITE_RE = /\bbg-white\b(?!\/)/g;

/** Light-only slate text utilities (any shade, with optional opacity suffix). */
const TEXT_SLATE_RE = /\btext-slate-\d{2,3}\b(?:\/\d{1,3})?/g;

const SOURCE_EXTENSIONS = new Set(['.css', '.html', '.js', '.jsx', '.ts', '.tsx']);

function normalizePath(filePath: string): string {
  return relative(repoRoot, filePath).split(/[/\\]/).join('/');
}

function isTestFile(fileName: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName);
}

function collectFilesInDir(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) {
    return out;
  }

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) {
        continue;
      }
      collectFilesInDir(full, out);
      continue;
    }
    if (SOURCE_EXTENSIONS.has(extname(entry)) && !isTestFile(entry)) {
      out.push(full);
    }
  }
  return out;
}

function countMatches(content: string, re: RegExp): number {
  re.lastIndex = 0;
  let count = 0;
  while (re.exec(content) !== null) {
    count += 1;
  }
  return count;
}

function scan(): ScanResult {
  const files = collectFilesInDir(modulesRoot).sort((a, b) =>
    normalizePath(a).localeCompare(normalizePath(b))
  );
  const hits: FileHit[] = [];
  let bgWhite = 0;
  let textSlate = 0;

  for (const abs of files) {
    const content = readFileSync(abs, 'utf8');
    const fileBgWhite = countMatches(content, BG_WHITE_RE);
    const fileTextSlate = countMatches(content, TEXT_SLATE_RE);
    if (fileBgWhite > 0 || fileTextSlate > 0) {
      hits.push({ file: normalizePath(abs), bgWhite: fileBgWhite, textSlate: fileTextSlate });
      bgWhite += fileBgWhite;
      textSlate += fileTextSlate;
    }
  }

  hits.sort(
    (a, b) => b.bgWhite + b.textSlate - (a.bgWhite + a.textSlate) || a.file.localeCompare(b.file)
  );

  return {
    filesScanned: files.length,
    filesWithHits: hits.length,
    bgWhite,
    textSlate,
    files: hits,
  };
}

function printReport(result: ScanResult, baseline: BaselineFile | null): void {
  console.log('═'.repeat(72));
  console.log('Content surface hardcode baseline (T4)');
  console.log('═'.repeat(72));
  console.log(`scope:           src/modules`);
  console.log(`files scanned:   ${result.filesScanned}`);
  console.log(`files with hits: ${result.filesWithHits}`);
  console.log(`bg-white:        ${result.bgWhite}`);
  console.log(`text-slate-*:    ${result.textSlate}`);

  if (baseline) {
    const bgDelta = result.bgWhite - baseline.bgWhite;
    const textDelta = result.textSlate - baseline.textSlate;
    const sign = (n: number) => (n > 0 ? '+' : '');
    console.log(
      `baseline:        bg-white ${baseline.bgWhite} (delta ${sign(bgDelta)}${bgDelta}) · ` +
        `text-slate ${baseline.textSlate} (delta ${sign(textDelta)}${textDelta})`
    );
  } else {
    console.log('baseline:        (missing — run with --update-baseline)');
  }

  console.log('');
  if (result.files.length === 0) {
    console.log('No bg-white / text-slate-* hardcodes found under src/modules.');
  } else {
    console.log('Top files (bg-white + text-slate):');
    console.log('─'.repeat(72));
    for (const hit of result.files.slice(0, 25)) {
      console.log(
        `  ${String(hit.bgWhite).padStart(4)}  ${String(hit.textSlate).padStart(5)}  ${hit.file}`
      );
    }
    if (result.files.length > 25) {
      console.log(`  … ${result.files.length - 25} more files`);
    }
  }

  console.log('═'.repeat(72));
  console.log('Patterns: bg-white (solid only; bg-white/NN excluded) · text-slate-{shade}');
  console.log('Fix: use .ui-card / .ui-card__title / .ui-card__muted or semantic tokens.');
  console.log('═'.repeat(72));
}

function readBaseline(): BaselineFile | null {
  if (!existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
}

function writeBaseline(result: ScanResult): void {
  const files: Record<string, { bgWhite: number; textSlate: number }> = {};
  for (const hit of result.files) {
    files[hit.file] = { bgWhite: hit.bgWhite, textSlate: hit.textSlate };
  }

  const baseline: BaselineFile = {
    version: 1,
    scope: 'modules',
    bgWhite: result.bgWhite,
    textSlate: result.textSlate,
    filesScanned: result.filesScanned,
    filesWithHits: result.filesWithHits,
    updatedAt: new Date().toISOString(),
    files,
  };

  const dir = dirname(baselinePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(
    `Baseline written: ${normalizePath(baselinePath)} ` +
      `(bg-white=${baseline.bgWhite}, text-slate=${baseline.textSlate})`
  );
}

function checkFailOnIncrease(result: ScanResult, baseline: BaselineFile | null): void {
  if (!baseline) {
    console.error(
      `Baseline missing: ${normalizePath(baselinePath)}\n` +
        'Create it with: npm run content-surface:baseline:update'
    );
    process.exit(1);
  }

  const failures: string[] = [];
  if (result.bgWhite > baseline.bgWhite) {
    failures.push(`bg-white ${result.bgWhite} > baseline ${baseline.bgWhite}`);
  }
  if (result.textSlate > baseline.textSlate) {
    failures.push(`text-slate ${result.textSlate} > baseline ${baseline.textSlate}`);
  }

  if (failures.length > 0) {
    console.error(`Content surface gate FAILED: ${failures.join('; ')}.`);
    console.error('New content must use .ui-card / semantic tokens, or justify + update baseline.');
    process.exit(1);
  }

  console.log(
    `Content surface gate passed: bg-white ${result.bgWhite}/${baseline.bgWhite} · ` +
      `text-slate ${result.textSlate}/${baseline.textSlate} (counts only go down).`
  );
}

function printHelp(): void {
  console.log(`Content surface hardcode baseline (T4)

Usage:
  tsx scripts/quality/content-surface-baseline.ts [options]

Options:
  --update-baseline     Write config/theme-content-surface-baseline.json
  --fail-on-increase    Exit 1 if bg-white or text-slate exceeds baseline (CI)
  --json                Print machine-readable JSON (report only)
  --help                Show this help

npm:
  npm run content-surface:baseline         # report
  npm run content-surface:baseline:update  # refresh baseline
  npm run content-surface:gate             # CI: --fail-on-increase
`);
}

function parseArgs(argv: string[]): {
  updateBaseline: boolean;
  failOnIncrease: boolean;
  json: boolean;
  help: boolean;
} {
  let updateBaseline = false;
  let failOnIncrease = false;
  let json = false;
  let help = false;

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--update-baseline' || arg === '--update') {
      updateBaseline = true;
    } else if (arg === '--fail-on-increase') {
      failOnIncrease = true;
    } else if (arg === '--json') {
      json = true;
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return { updateBaseline, failOnIncrease, json, help };
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.updateBaseline && opts.failOnIncrease) {
    console.error('Use only one of --update-baseline or --fail-on-increase.');
    process.exit(1);
  }

  const result = scan();
  const baseline = readBaseline();

  if (opts.json && !opts.updateBaseline && !opts.failOnIncrease) {
    console.log(
      JSON.stringify(
        {
          ...result,
          baseline: baseline
            ? {
                bgWhite: baseline.bgWhite,
                textSlate: baseline.textSlate,
                updatedAt: baseline.updatedAt,
                path: normalizePath(baselinePath),
              }
            : null,
        },
        null,
        2
      )
    );
    process.exit(0);
  }

  printReport(result, baseline);

  if (opts.updateBaseline) {
    writeBaseline(result);
    process.exit(0);
  }

  if (opts.failOnIncrease) {
    checkFailOnIncrease(result, baseline);
    process.exit(0);
  }

  process.exit(0);
}

main();
