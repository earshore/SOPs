/**
 * Theme hardcode baseline (D6) — Tailwind blue-/indigo-* utility gate.
 *
 * Two enforcement lanes sharing one baseline file:
 *
 *   shell   (scope, default) — global chrome. Blue + indigo pattern
 *     (expanded 2026-08-15: shell lane migrated from blue-only to the same
 *     blue+indigo family as modules, closing the indigo blind spot found in
 *     the per-file pressure test S8; Appearance migrations "only go down").
 *     Sources: css/components shell list + common/ui + components/modal +
 *     common-layer renderers & settings domain
 *     (common/components, components/settings; added 2026-08-14). Per-file
 *     counts are enforced in gate mode too (no add-N/remove-N offsetting).
 *     Shell total today after expansion: 24 (megaMenu: blue 13 + indigo 11;
 *     all registered as GUI014 glass color palette exemptions or batch-A
 *     migration carry-overs).
 *
 *   modules (scope)          — business pages under src/modules, counted per
 *     module family: sops / app_center / amz_hub / more / other (any
 *     non-listed module dir, e.g. home/, folds into `other`). Counts blue AND
 *     indigo: E5 confirmed indigo is a pseudo-Appearance sibling of blue, so
 *     Phase B migrates the family together. Gate per family: only goes down.
 *
 *   all     (scope, report)  — entire src tree + modules family summary.
 *
 *   semantic (added 2026-08-15, v3 baseline) — business status color
 *     families slate/red/emerald/purple/amber in src/modules/sops only.
 *     Covers the npi_tracker blind spot (CMP-02 B4A assessment): those
 *     families were outside the D6 blue+indigo pair. Baseline registered
 *     once after the assessment; the gate locks "only goes down" (total +
 *     per-file). This is a lock lane, not a migration target.
 *
 * Usage:
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts                 # shell report
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --scope modules  # family report
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --scope all      # full report
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --update-baseline
 *   npx tsx scripts/quality/theme-hardcode-baseline.ts --fail-on-increase
 *   npm run theme:hardcode-baseline
 *   npm run theme:hardcode-baseline:all
 *   npm run theme:hardcode-baseline:update
 *   npm run theme:hardcode-baseline:gate
 *
 * Exit codes:
 *   report / update-baseline → 0 on successful scan
 *   --fail-on-increase       → 1 when shell total exceeds baseline OR any
 *                              module family total exceeds its baseline
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

type Scope = 'shell' | 'modules' | 'all';

type ModuleFamily = 'sops' | 'app_center' | 'amz_hub' | 'more' | 'other';

/**
 * Module families: one baseline slot each. Any src/modules dir not in the
 * named four (e.g. home/) folds into `other`, so a brand-new module dir is
 * still covered by the gate from day one.
 */
const MODULE_FAMILIES: readonly ModuleFamily[] = [
  'sops',
  'app_center',
  'amz_hub',
  'more',
  'other',
] as const;

const NAMED_MODULE_DIRS = new Set(['sops', 'app_center', 'amz_hub', 'more']);

interface FileHit {
  file: string;
  count: number;
  samples: string[];
  /** Set when the file lives under src/modules/<family>/ (scan all/modules). */
  family?: ModuleFamily;
}

interface ScanResult {
  scope: Scope;
  filesScanned: number;
  filesWithHits: number;
  total: number;
  files: FileHit[];
}

interface FamilyScan {
  total: number;
  filesScanned: number;
  filesWithHits: number;
  files: FileHit[];
}

interface ModulesScan {
  filesScanned: number;
  filesWithHits: number;
  total: number;
  families: Record<ModuleFamily, FamilyScan>;
}

interface ScopeBaseline {
  total: number;
  filesScanned: number;
  filesWithHits: number;
  /** Per-file counts for diffing migrations; the gate uses totals only. */
  files: Record<string, number>;
}

interface FamilyBaseline {
  total: number;
  filesScanned: number;
  filesWithHits: number;
  files: Record<string, number>;
}

interface BaselineFile {
  version: 3;
  updatedAt: string;
  shell: ScopeBaseline;
  modules: {
    filesScanned: number;
    filesWithHits: number;
    families: Record<ModuleFamily, FamilyBaseline>;
  };
  /**
   * Semantic lane (added 2026-08-15): business status color families
   * slate/red/emerald/purple/amber in src/modules/sops (covers npi_tracker,
   * which is outside the blue+indigo gate). Baseline registered once after
   * the CMP-02 B4A assessment; gate locks "only goes down" per-file and in
   * total, closing the five-family blind spot in the D6 family pair.
   */
  semantic?: ScopeBaseline;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');
const srcRoot = join(repoRoot, 'src');
const baselinePath = join(repoRoot, 'config', 'theme-blue-hardcode-baseline.json');

/** Tailwind-like hardcoded color utilities (property prefixes). */
const UTIL_PREFIXES = [
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
 * Shell lane: blue-* AND indigo-*. Originally blue-only (Phase 0 D6
 * baseline); expanded to the blue+indigo family on 2026-08-15 so the indigo
 * blind spot in shell files (S8 pressure-test finding) is gated. Indigo is
 * the pseudo-Appearance sibling of blue; the pair migrates together.
 */
const BLUE_UTIL_RE = new RegExp(
  `(?:${UTIL_PREFIXES.join('|')})-(?:blue|indigo)-(?:\\d{2,3}|black|white)(?:\\/\\d{1,3})?`,
  'g'
);

/**
 * Modules lane: blue-* AND indigo-* (indigo is the pseudo-Appearance sibling
 * of blue; the pair migrates to semantic tokens together in Phase B).
 * Does not match CSS vars like `--color-blue-500`.
 */
const HARDCODE_UTIL_RE = new RegExp(
  `(?:${UTIL_PREFIXES.join('|')})-(?:blue|indigo)-(?:\\d{2,3}|black|white)(?:\\/\\d{1,3})?`,
  'g'
);

/**
 * Semantic lane: business status color families (slate/red/emerald/purple/
 * amber). These are NOT theme colors like blue/indigo — they carry row/badge
 * status semantics in module tables (pending/failed/done/warning/neutral),
 * so the semantic lane is a baseline lock ("only goes down"), not a
 * migration target. Blue+indigo remain the D6 migration families.
 */
const SEMANTIC_FAMILIES = ['slate', 'red', 'emerald', 'purple', 'amber'] as const;

const SEMANTIC_UTIL_RE = new RegExp(
  `(?:${UTIL_PREFIXES.join('|')})-(?:${SEMANTIC_FAMILIES.join('|')})-(?:\\d{2,3}|black|white)(?:\\/\\d{1,3})?`,
  'g'
);

const SOURCE_EXTENSIONS = new Set(['.css', '.html', '.js', '.jsx', '.ts', '.tsx']);

/**
 * Shell scope: Appearance-visible global chrome.
 * CSS list from Phase 0 D6 + adjacent shell components + shell UI sources.
 * Expanded 2026-08-14 (Phase C follow-up): common-layer renderers and
 * settings domain files were outside every lane (33 unmanaged hits found in
 * --scope all), so `src/common/components` and `src/components/settings`
 * now join the shell lane as `common` slot baseline subtotals — still
 * "only goes down".
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
  // Common-layer renderers + settings domain (Phase C follow-up expansion;
  // e.g. OverviewRenderer.ts, localDataCopy.ts were previously uncovered)
  'src/common/components',
  'src/components/settings',
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

/** src/modules/<family-dir>/… -> family; unknown dirs fold into `other`. */
function familyOfPath(rel: string): ModuleFamily | null {
  const m = /^src\/modules\/([^/]+)\//.exec(rel);
  if (!m) {
    return null;
  }
  const dir = m[1]!;
  return NAMED_MODULE_DIRS.has(dir) ? (dir as ModuleFamily) : 'other';
}

function countUtils(content: string, re: RegExp): { count: number; samples: string[] } {
  const samples: string[] = [];
  let count = 0;
  let match: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((match = re.exec(content)) !== null) {
    count += 1;
    if (samples.length < 5) {
      samples.push(match[0]);
    }
  }
  return { count, samples };
}

function sortHits(hits: FileHit[]): void {
  hits.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
}

/** Shell lane scan (blue + indigo, expanded 2026-08-15). */
function scanShell(): ScanResult {
  const files = resolveShellFiles();
  const hits: FileHit[] = [];
  let total = 0;

  for (const abs of files) {
    const content = readFileSync(abs, 'utf8');
    const { count, samples } = countUtils(content, BLUE_UTIL_RE);
    if (count > 0) {
      hits.push({ file: normalizePath(abs), count, samples });
      total += count;
    }
  }
  sortHits(hits);

  return {
    scope: 'shell',
    filesScanned: files.length,
    filesWithHits: hits.length,
    total,
    files: hits,
  };
}

/** Entire src tree scan (blue + indigo). */
function scanAll(): ScanResult {
  const files = resolveAllFiles();
  const hits: FileHit[] = [];
  let total = 0;

  for (const abs of files) {
    const content = readFileSync(abs, 'utf8');
    const { count, samples } = countUtils(content, HARDCODE_UTIL_RE);
    if (count > 0) {
      const rel = normalizePath(abs);
      hits.push({ file: rel, count, samples, family: familyOfPath(rel) ?? undefined });
      total += count;
    }
  }
  sortHits(hits);

  return {
    scope: 'all',
    filesScanned: files.length,
    filesWithHits: hits.length,
    total,
    files: hits,
  };
}

/** src/modules scan grouped by module family (blue + indigo). */
/**
 * Semantic lane scan: src/modules/sops only (per CMP-02 B4A assessment;
 * npi_tracker lives here and its 300+ status colors were the blind spot).
 * Other module dirs stay on the blue+indigo gate only — a full five-family
 * baseline across all modules would be ~6k hits and meaningless as a gate.
 */
function scanSopsSemantic(): ScopeBaseline {
  const sopsDir = join(srcRoot, 'modules', 'sops');
  const files: FileHit[] = [];
  let total = 0;
  let filesScanned = 0;

  if (existsSync(sopsDir)) {
    const dirFiles = collectFilesInDir(sopsDir);
    filesScanned = dirFiles.length;
    for (const abs of dirFiles) {
      const content = readFileSync(abs, 'utf8');
      const { count, samples } = countUtils(content, SEMANTIC_UTIL_RE);
      if (count > 0) {
        files.push({ file: normalizePath(abs), count, samples });
        total += count;
      }
    }
  }

  sortHits(files);
  return {
    total,
    filesScanned,
    filesWithHits: files.length,
    files,
  };
}

function scanModules(): ModulesScan {
  const root = join(srcRoot, 'modules');
  const families = Object.fromEntries(
    MODULE_FAMILIES.map(f => [f, { total: 0, filesScanned: 0, filesWithHits: 0, files: [] }])
  ) as Record<ModuleFamily, FamilyScan>;
  let filesScanned = 0;
  let filesWithHits = 0;
  let total = 0;

  if (existsSync(root)) {
    for (const entry of readdirSync(root)) {
      const full = join(root, entry);
      if (!statSync(full).isDirectory()) {
        continue;
      }
      const family: ModuleFamily = NAMED_MODULE_DIRS.has(entry) ? (entry as ModuleFamily) : 'other';
      const bucket = families[family];
      const dirFiles = collectFilesInDir(full);
      bucket.filesScanned = dirFiles.length;
      filesScanned += dirFiles.length;

      for (const abs of dirFiles) {
        const content = readFileSync(abs, 'utf8');
        const { count, samples } = countUtils(content, HARDCODE_UTIL_RE);
        if (count > 0) {
          bucket.files.push({ file: normalizePath(abs), count, samples, family });
          bucket.filesWithHits += 1;
          bucket.total += count;
          filesWithHits += 1;
          total += count;
        }
      }
    }

    for (const family of MODULE_FAMILIES) {
      sortHits(families[family].files);
    }
  }

  return { filesScanned, filesWithHits, total, families };
}

function printPerFileHits(files: FileHit[]): void {
  if (files.length === 0) {
    console.log('No Tailwind hardcoded utilities found in this scope.');
    return;
  }
  console.log('Per-file counts:');
  console.log('─'.repeat(72));
  for (const hit of files) {
    const sample = hit.samples.length > 0 ? `  e.g. ${hit.samples.join(', ')}` : '';
    const fam = hit.family !== undefined ? ` [${hit.family}]` : '';
    console.log(`  ${String(hit.count).padStart(4)}  ${hit.file}${fam}${sample}`);
  }
}

function printFamilySummary(modules: ModulesScan, baseline: BaselineFile | null): void {
  console.log('Module families (blue + indigo):');
  console.log('─'.repeat(72));
  console.log('  family        total   files  filesWithHits');
  for (const family of MODULE_FAMILIES) {
    const f = modules.families[family];
    const base = baseline ? baseline.modules.families[family] : undefined;
    const baseText = base ? ` (baseline ${base.total})` : '';
    console.log(
      `  ${family.padEnd(13)} ${String(f.total).padStart(5)} ${String(f.filesScanned).padStart(6)} ${String(f.filesWithHits).padStart(14)}${baseText}`
    );
  }
  console.log('─'.repeat(72));
}

function printShellReport(shell: ScanResult, baseline: BaselineFile | null): void {
  console.log('═'.repeat(72));
  console.log('Theme hardcode baseline (D6) — shell chrome (blue + indigo)');
  console.log('═'.repeat(72));
  console.log(`scope:           ${shell.scope}`);
  console.log(`files scanned:   ${shell.filesScanned}`);
  console.log(`files with hits: ${shell.filesWithHits}`);
  console.log(`total hits:      ${shell.total}`);

  if (baseline) {
    const delta = shell.total - baseline.shell.total;
    const sign = delta > 0 ? '+' : '';
    console.log(`baseline:        ${baseline.shell.total} (delta ${sign}${delta})`);
  } else {
    console.log('baseline:        (missing — run with --update-baseline)');
  }

  console.log('');
  printPerFileHits(shell.files);
  console.log('═'.repeat(72));
  console.log('Patterns: bg|text|border|ring|from|to|via|outline|shadow|');
  console.log('          decoration|accent|caret|fill|stroke -blue-{shade} |');
  console.log('          decoration|accent|caret|fill|stroke -indigo-{shade}');
  console.log('Shell paths: css/components shell list + common/ui + components/modal');
  console.log('═'.repeat(72));
}

function printModulesReport(modules: ModulesScan, baseline: BaselineFile | null): void {
  console.log('═'.repeat(72));
  console.log('Theme hardcode baseline (D6) — modules (blue + indigo)');
  console.log('═'.repeat(72));
  console.log('scope:           modules');
  console.log(`files scanned:   ${modules.filesScanned}`);
  console.log(`files with hits: ${modules.filesWithHits}`);
  console.log(`total hits:      ${modules.total}`);
  console.log('');
  printFamilySummary(modules, baseline);
  console.log('');

  for (const family of MODULE_FAMILIES) {
    const f = modules.families[family];
    const base = baseline ? baseline.modules.families[family] : undefined;
    const baseText = base ? ` (baseline ${base.total})` : '';
    console.log(`[${family}] total=${f.total}${baseText}`);
    printPerFileHits(f.files);
    console.log('');
  }
  console.log('═'.repeat(72));
  console.log('Module families: sops | app_center | amz_hub | more | other (home/, unknown)');
  console.log('═'.repeat(72));
}

function printAllReport(
  all: ScanResult,
  modules: ModulesScan,
  baseline: BaselineFile | null
): void {
  console.log('═'.repeat(72));
  console.log('Theme hardcode baseline (D6) — all source (blue + indigo)');
  console.log('═'.repeat(72));
  console.log(`scope:           ${all.scope}`);
  console.log(`files scanned:   ${all.filesScanned}`);
  console.log(`files with hits: ${all.filesWithHits}`);
  console.log(`total hits:      ${all.total}`);
  console.log('');
  printPerFileHits(all.files);
  console.log('');
  printFamilySummary(modules, baseline);
  console.log('═'.repeat(72));
}

function readBaseline(): BaselineFile | null {
  if (!existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
}

function writeBaseline(shell: ScanResult, modules: ModulesScan): void {
  const toRecord = (files: FileHit[]): Record<string, number> => {
    const rec: Record<string, number> = {};
    for (const hit of files) {
      rec[hit.file] = hit.count;
    }
    return rec;
  };

  const families = Object.fromEntries(
    MODULE_FAMILIES.map(family => {
      const f = modules.families[family];
      return [
        family,
        {
          total: f.total,
          filesScanned: f.filesScanned,
          filesWithHits: f.filesWithHits,
          files: toRecord(f.files),
        },
      ];
    })
  ) as Record<ModuleFamily, FamilyBaseline>;

  const semantic = scanSopsSemantic();

  const baseline: BaselineFile = {
    version: 3,
    updatedAt: new Date().toISOString(),
    shell: {
      total: shell.total,
      filesScanned: shell.filesScanned,
      filesWithHits: shell.filesWithHits,
      files: toRecord(shell.files),
    },
    modules: {
      filesScanned: modules.filesScanned,
      filesWithHits: modules.filesWithHits,
      families,
    },
    semantic: {
      total: semantic.total,
      filesScanned: semantic.filesScanned,
      filesWithHits: semantic.filesWithHits,
      files: toRecord(semantic.files),
    },
  };

  const dir = dirname(baselinePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
  console.log(`Baseline written: ${normalizePath(baselinePath)}`);
  console.log(`  shell:                ${shell.total}`);
  for (const family of MODULE_FAMILIES) {
    console.log(`  module ${family.padEnd(14)}: ${families[family].total}`);
  }
  console.log(`  semantic (sops):      ${semantic.total}`);
}

function missingFamilies(baseline: BaselineFile): ModuleFamily[] {
  return MODULE_FAMILIES.filter(family => baseline.modules.families[family] === undefined);
}

/** Gate: shell + every module family "only goes down" vs baseline. */
function checkGate(
  shell: ScanResult,
  modules: ModulesScan,
  semantic: ScopeBaseline,
  baseline: BaselineFile | null
): void {
  if (!baseline) {
    console.error(
      `Baseline missing: ${normalizePath(baselinePath)}\n` +
        'Create it with: npm run theme:hardcode-baseline:update'
    );
    process.exit(1);
  }

  const failures: string[] = [];

  // Shell lane — unchanged Phase 0 logic, plus per-file increase check.
  // Total-only comparison allowed "add N, remove N elsewhere" to pass; every
  // per-file count must now be <= its baseline record (new files add to the
  // shell total, so a family-wide increase still fails at the total check).
  if (shell.total > baseline.shell.total) {
    failures.push(
      `shell total ${shell.total} > baseline ${baseline.shell.total} (+${shell.total - baseline.shell.total})`
    );
  }
  const baseShellFiles = baseline.shell.files ?? {};
  for (const hit of shell.files) {
    const base = baseShellFiles[hit.file];
    if (base !== undefined && hit.count > base) {
      failures.push(
        `shell per-file ${hit.file}: ${hit.count} > baseline ${base} (+${hit.count - base})`
      );
    }
  }

  // Modules lane — per-family "only goes down".
  const missing = missingFamilies(baseline);
  if (missing.length > 0) {
    failures.push(
      `module families missing from baseline: ${missing.join(', ')} (run --update-baseline)`
    );
  }
  for (const family of MODULE_FAMILIES) {
    const base = baseline.modules.families[family];
    const actual = modules.families[family].total;
    if (base === undefined) {
      continue; // already reported as missing
    }
    if (actual > base.total) {
      failures.push(
        `module ${family}: ${actual} > baseline ${base.total} (+${actual - base.total})`
      );
    }
    // Per-file increase check: closes the "add N, remove N elsewhere in the
    // same family" hole while keeping per-file records report-grade.
    const baseFiles = base.files ?? {};
    for (const hit of modules.families[family].files) {
      const bf = baseFiles[hit.file];
      if (bf !== undefined && hit.count > bf) {
        failures.push(
          `module ${family} per-file ${hit.file}: ${hit.count} > baseline ${bf} (+${hit.count - bf})`
        );
      }
    }
  }

  // Semantic lane (v3): sops module status color families, "only goes down".
  // `semantic` is passed from main() so report and gate scans stay in sync.
  if (baseline.semantic === undefined) {
    failures.push(
      'semantic lane missing from baseline (run --update-baseline; added in v3 baseline)'
    );
  } else {
    const semTotal = baseline.semantic.total;
    if (semantic.total > semTotal) {
      failures.push(
        `semantic sops total ${semantic.total} > baseline ${semTotal} (+${semantic.total - semTotal})`
      );
    }
    const baseSemFiles = baseline.semantic.files ?? {};
    for (const hit of semantic.files) {
      const base = baseSemFiles[hit.file];
      if (base !== undefined && hit.count > base) {
        failures.push(
          `semantic per-file ${hit.file}: ${hit.count} > baseline ${base} (+${hit.count - base})`
        );
      }
    }
  }

  if (failures.length > 0) {
    console.error('Theme hardcode gate FAILED:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(
      'Migrate new blue-/indigo-* utilities to semantic/primary tokens, or justify + update baseline.\n' +
        'For the semantic lane (slate/red/emerald/purple/amber in sops): register the migration\n' +
        '  plan before adding new inline status colors, or update the baseline on token migration.'
    );
    process.exit(1);
  }

  const familyStatus = MODULE_FAMILIES.map(family => {
    const base = baseline.modules.families[family]!.total;
    const actual = modules.families[family].total;
    const delta = actual - base;
    return `  ${family}: ${actual}/${base}${delta < 0 ? ` (${delta})` : ''}`;
  }).join('\n');
  const semanticStatus = baseline.semantic
    ? `  semantic (sops):      ${semantic.total}/${baseline.semantic.total}${semantic.total < baseline.semantic.total ? ` (${semantic.total - baseline.semantic.total})` : ''}`
    : '';
  console.log(
    'Theme hardcode gate passed (counts only go down):\n' +
      `  shell: ${shell.total}/${baseline.shell.total}\n` +
      `${familyStatus}\n` +
      `${semanticStatus}`
  );
}

function printHelp(): void {
  console.log(`Theme hardcode gate (D6) — blue-/indigo-* utility baseline gate

Usage:
  tsx scripts/quality/theme-hardcode-baseline.ts [options]

Options:
  --scope shell|modules|all  Scan scope (default: shell)
  --update-baseline          Write config/theme-blue-hardcode-baseline.json
                             (shell scope + all module families + semantic)
  --fail-on-increase         Exit 1 if shell total, any module family total,
                             or the semantic sops total exceeds baseline (CI)
  --json                     Machine-readable JSON of the report
  --help                     Show this help

Scope notes:
  shell   — blue-* + indigo-* in global chrome
            (blue-only until 2026-08-15; shell indigo blind spot closed by S8)
  modules — blue-* + indigo-* in src/modules, per family: sops, app_center,
            amz_hub, more, other (other = remaining dirs like home)
  all     — blue-* + indigo-* across entire src, with module family summary
  semantic— slate/red/emerald/purple/amber in src/modules/sops (v3 baseline,
            2026-08-15); npi status colors fall under this lane — new inline
            additions are gated, migrations drive the count down

npm:
  npm run theme:hardcode-baseline         # shell report
  npm run theme:hardcode-baseline:all     # full src report
  npm run theme:hardcode-baseline:update  # refresh baseline (shell + modules)
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

  const isScope = (v: string | undefined): v is Scope =>
    v === 'shell' || v === 'modules' || v === 'all';

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
      if (!isScope(value)) {
        console.error(`Invalid --scope ${value ?? '(missing)'}. Use shell|modules|all.`);
        process.exit(1);
      }
      scope = value;
      i += 1;
    } else if (arg.startsWith('--scope=')) {
      const value = arg.slice('--scope='.length);
      if (!isScope(value)) {
        console.error(`Invalid --scope ${value}. Use shell|modules|all.`);
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

  const baseline = readBaseline();

  if (opts.updateBaseline) {
    const shell = scanShell();
    const modules = scanModules();
    writeBaseline(shell, modules);
    process.exit(0);
  }

  if (opts.failOnIncrease) {
    const shell = scanShell();
    const modules = scanModules();
    const semantic = scanSopsSemantic();
    checkGate(shell, modules, semantic, baseline);
    process.exit(0);
  }

  if (opts.scope === 'shell') {
    printShellReport(scanShell(), baseline);
    process.exit(0);
  }

  if (opts.scope === 'modules') {
    printModulesReport(scanModules(), baseline);
    process.exit(0);
  }

  // scope 'all'
  printAllReport(scanAll(), scanModules(), baseline);
  process.exit(0);
}

main();
