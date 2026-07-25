/**
 * Theme hardcode baseline (D6) — Tailwind blue-* utility gate for shell chrome.
 *
 * Phase 0 measurable baseline so Appearance migrations can enforce
 * "shell blue hardcode count only goes down".
 *
 * Usage:
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --scope all
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --update-baseline
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --fail-on-increase
 *   npm run theme:hardcode-baseline
 *   npm run theme:hardcode-baseline:update
 *   npm run theme:hardcode-baseline:gate
 *
 * Scopes:
 *   shell (default) — global chrome CSS + common shell UI sources
 *   all             — entire src/ tree
 *
 * Exit codes:
 *   report / update-baseline → always 0 on successful scan
 *   --fail-on-increase       → 1 when shell total exceeds baseline
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

type Scope = 'shell' | 'all';

interface FileHit {
  file: string;
  count: number;
  samples: string[];
}

interface ScanResult {
  scope: Scope;
  filesScanned: number;
  filesWithHits: number;
  total: number;
  files: FileHit[];
}

interface BaselineFile {
  version: 1;
  scope: 'shell';
  total: number;
  filesScanned: number;
  filesWithHits: number;
  updatedAt: string;
  /** Per-file counts for diffing migrations; gate uses total only. */
  files: Record<string, number>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');
const srcRoot = join(repoRoot, 'src');
const baselinePath = join(repoRoot, 'config', 'theme-blue-hardcode-baseline.json');

/** Tailwind-like blue utilities (property prefixes). */
const BLUE_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'from',
  'to',
  'via',
  'outline',
  'shadow',
  'decoration',
  'accent',
  'caret',
  'fill',
  'stroke',
] as const;

/**
 * Match `bg-blue-500`, `text-blue-600/80`, etc.
 * Does not match CSS vars like `--color-blue-500`.
 */
const BLUE_UTIL_RE = new RegExp(
  `(?:${BLUE_PREFIXES.join('|')})-blue-(?:\\d{2,3}|black|white)(?:\\/\\d{1,3})?`,
  'g'
);

const SOURCE_EXTENSIONS = new Set(['.css', '.html', '.js', '.jsx', '.ts', '.tsx']);

/**
 * Shell scope: Appearance-visible global chrome.
 * CSS list from Phase 0 D6 + adjacent shell components + shell UI sources.
 */
const SHELL_FILES = [
  // Phase 0 shell CSS whitelist
  'src/css/components/buttons.css',
  'src/css/components/header.css',
  'src/css/components/header-main.css',
  'src/css/components/toast.css',
  'src/css/components/forms.css',
  'src/css/components/tabs.css',
  'src/css/components/loading.css',
  'src/css/components/progress.css',
  'src/css/components/status.css',
  // Adjacent shell chrome CSS (global chrome, not business pages)
  'src/css/components/sidebar-renderer.css',
  'src/css/components/modals.css',
  'src/css/components/badges.css',
  'src/css/components/language-selector.css',
  'src/css/components/scrollbar.css',
  'src/css/components/empty-state.css',
] as const;

const SHELL_DIRS = [
  // Global shell UI that renders header / nav / search / toast chrome
  'src/common/ui',
  'src/components/modal',
] as const;

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

function resolveShellFiles(): string[] {
  const files = new Set<string>();

  for (const rel of SHELL_FILES) {
    const abs = join(repoRoot, rel);
    if (existsSync(abs)) {
      files.add(abs);
    }
  }

  for (const rel of SHELL_DIRS) {
    for (const abs of collectFilesInDir(join(repoRoot, rel))) {
      files.add(abs);
    }
  }

  return Array.from(files).sort((a, b) => normalizePath(a).localeCompare(normalizePath(b)));
}

function resolveAllFiles(): string[] {
  return collectFilesInDir(srcRoot).sort((a, b) =>
    normalizePath(a).localeCompare(normalizePath(b))
  );
}

function countBlueUtils(content: string): { count: number; samples: string[] } {
  const samples: string[] = [];
  let count = 0;
  let match: RegExpExecArray | null;
  BLUE_UTIL_RE.lastIndex = 0;
  while ((match = BLUE_UTIL_RE.exec(content)) !== null) {
    count += 1;
    if (samples.length < 5) {
      samples.push(match[0]);
    }
  }
  return { count, samples };
}

function scan(scope: Scope): ScanResult {
  const files = scope === 'shell' ? resolveShellFiles() : resolveAllFiles();
  const hits: FileHit[] = [];
  let total = 0;

  for (const abs of files) {
    const content = readFileSync(abs, 'utf8');
    const { count, samples } = countBlueUtils(content);
    if (count > 0) {
      hits.push({ file: normalizePath(abs), count, samples });
      total += count;
    }
  }

  hits.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

  return {
    scope,
    filesScanned: files.length,
    filesWithHits: hits.length,
    total,
    files: hits,
  };
}

function printReport(result: ScanResult, baseline: BaselineFile | null): void {
  console.log('═'.repeat(72));
  console.log('Theme blue hardcode baseline (D6)');
  console.log('═'.repeat(72));
  console.log(`scope:           ${result.scope}`);
  console.log(`files scanned:   ${result.filesScanned}`);
  console.log(`files with hits: ${result.filesWithHits}`);
  console.log(`total hits:      ${result.total}`);

  if (result.scope === 'shell' && baseline) {
    const delta = result.total - baseline.total;
    const sign = delta > 0 ? '+' : '';
    console.log(`baseline:        ${baseline.total} (delta ${sign}${delta})`);
  } else if (result.scope === 'shell' && !baseline) {
    console.log('baseline:        (missing — run with --update-baseline)');
  }

  console.log('');
  if (result.files.length === 0) {
    console.log('No Tailwind blue-* utilities found in this scope.');
  } else {
    console.log('Per-file counts:');
    console.log('─'.repeat(72));
    for (const hit of result.files) {
      const sample = hit.samples.length > 0 ? `  e.g. ${hit.samples.join(', ')}` : '';
      console.log(`  ${String(hit.count).padStart(4)}  ${hit.file}${sample}`);
    }
  }

  console.log('═'.repeat(72));
  console.log('Patterns: bg|text|border|ring|from|to|via|outline|shadow|');
  console.log('          decoration|accent|caret|fill|stroke -blue-{shade}');
  console.log('Shell paths: css/components shell list + common/ui + components/modal');
  console.log('═'.repeat(72));
}

function readBaseline(): BaselineFile | null {
  if (!existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
}

function writeBaseline(result: ScanResult): void {
  if (result.scope !== 'shell') {
    console.error('--update-baseline only supports --scope shell (default).');
    process.exit(1);
  }

  const files: Record<string, number> = {};
  for (const hit of result.files) {
    files[hit.file] = hit.count;
  }

  const baseline: BaselineFile = {
    version: 1,
    scope: 'shell',
    total: result.total,
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
  console.log(`Baseline written: ${normalizePath(baselinePath)} (shell total=${baseline.total})`);
}

function checkFailOnIncrease(result: ScanResult, baseline: BaselineFile | null): void {
  if (result.scope !== 'shell') {
    console.error('--fail-on-increase only applies to --scope shell (default).');
    process.exit(1);
  }

  if (!baseline) {
    console.error(
      `Baseline missing: ${normalizePath(baselinePath)}\n` +
        'Create it with: npm run theme:hardcode-baseline:update'
    );
    process.exit(1);
  }

  if (result.total > baseline.total) {
    console.error(
      `Theme blue hardcode gate FAILED: shell total ${result.total} > baseline ${baseline.total} (+${result.total - baseline.total}).`
    );
    console.error(
      'Migrate new blue-* utilities to semantic/primary tokens, or justify + update baseline.'
    );
    process.exit(1);
  }

  console.log(
    `Theme blue hardcode gate passed: shell ${result.total}/${baseline.total} (count only goes down).`
  );
}

function printHelp(): void {
  console.log(`Theme hardcode baseline (D6)

Usage:
  tsx scripts/quality/theme-hardcode-baseline.ts [options]

Options:
  --scope shell|all     Scan scope (default: shell)
  --update-baseline     Write config/theme-blue-hardcode-baseline.json from shell scan
  --fail-on-increase    Exit 1 if shell total exceeds baseline (CI)
  --json                Print machine-readable JSON (report only)
  --help                Show this help

npm:
  npm run theme:hardcode-baseline         # shell report
  npm run theme:hardcode-baseline:all     # full src report
  npm run theme:hardcode-baseline:update  # refresh shell baseline
  npm run theme:hardcode-baseline:gate    # CI: --fail-on-increase
`);
}

function parseArgs(argv: string[]): {
  scope: Scope;
  updateBaseline: boolean;
  failOnIncrease: boolean;
  json: boolean;
  help: boolean;
} {
  let scope: Scope = 'shell';
  let updateBaseline = false;
  let failOnIncrease = false;
  let json = false;
  let help = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--update-baseline' || arg === '--update') {
      updateBaseline = true;
    } else if (arg === '--fail-on-increase') {
      failOnIncrease = true;
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--scope') {
      const value = argv[i + 1];
      if (value !== 'shell' && value !== 'all') {
        console.error(`Invalid --scope ${value ?? '(missing)'}. Use shell|all.`);
        process.exit(1);
      }
      scope = value;
      i += 1;
    } else if (arg.startsWith('--scope=')) {
      const value = arg.slice('--scope='.length);
      if (value !== 'shell' && value !== 'all') {
        console.error(`Invalid --scope ${value}. Use shell|all.`);
        process.exit(1);
      }
      scope = value;
    } else {
      console.error(`Unknown argument: ${arg}`);
      printHelp();
      process.exit(1);
    }
  }

  return { scope, updateBaseline, failOnIncrease, json, help };
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

  const result = scan(opts.scope);
  const baseline = readBaseline();

  if (opts.json && !opts.updateBaseline && !opts.failOnIncrease) {
    console.log(
      JSON.stringify(
        {
          ...result,
          baseline: baseline
            ? {
                total: baseline.total,
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

  // Report mode always exits 0.
  process.exit(0);
}

main();
