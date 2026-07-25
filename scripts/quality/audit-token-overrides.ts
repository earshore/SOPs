/**
 * D1 token override inventory — generated vs handwritten CSS custom properties.
 *
 * Phase 2 prep: compare `:root` tokens in
 *   src/css/foundation/variables.generated.css
 *   src/css/foundation/variables.css
 *
 * Reports:
 *   - same-name, different value (true overrides / conflicts)
 *   - same-name, same value (redundant identical overrides)
 *   - only-in-handwritten (semantic / migration candidates)
 *   - only-in-generated
 *   - atomic conflicts split into allowlisted vs unallowlisted
 *     (config/token-atomic-override-allowlist.json)
 *
 * Usage:
 *   npx tsx scripts/quality/audit-token-overrides.ts
 *   npx tsx scripts/quality/audit-token-overrides.ts --json
 *   npx tsx scripts/quality/audit-token-overrides.ts --markdown
 *   npx tsx scripts/quality/audit-token-overrides.ts --write path.md
 *   npx tsx scripts/quality/audit-token-overrides.ts --fail-on-atomic-override
 *   npx tsx scripts/quality/audit-token-overrides.ts --fail-on-unallowlisted-atomic
 *   npm run token:override-audit
 *
 * Exit:
 *   report modes → always 0 on successful parse
 *   --fail-on-atomic-override → 1 when any atomic same-name value conflict exists
 *   --fail-on-unallowlisted-atomic → 1 when atomic conflict is not in allowlist
 *     (default off; intended for future CI once allowlist is authoritative)
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..');

const GENERATED_PATH = join(repoRoot, 'src/css/foundation/variables.generated.css');
const HANDWRITTEN_PATH = join(repoRoot, 'src/css/foundation/variables.css');
const ALLOWLIST_PATH = join(repoRoot, 'config/token-atomic-override-allowlist.json');

interface CssVar {
  name: string;
  value: string;
  line: number;
  selector: string;
}

interface TokenPair {
  name: string;
  generated: string;
  handwritten: string;
  generatedLine: number;
  handwrittenLine: number;
  atomic: boolean;
  category: string;
}

interface AllowlistEntry {
  token: string;
  category?: string;
  reason: string;
}

interface AllowlistFile {
  version: number;
  description?: string;
  updatedAt?: string;
  overrides: AllowlistEntry[];
}

interface AuditReport {
  generatedPath: string;
  handwrittenPath: string;
  allowlistPath: string;
  generatedRootCount: number;
  handwrittenRootCount: number;
  handwrittenDarkCount: number;
  conflicts: TokenPair[];
  identical: TokenPair[];
  onlyHandwritten: Array<{ name: string; value: string; line: number; category: string }>;
  onlyGenerated: Array<{ name: string; value: string; line: number; category: string }>;
  identicalAtomic: TokenPair[];
  conflictAtomic: TokenPair[];
  /** Atomic conflicts present in config allowlist (intentional). */
  conflictAtomicAllowlisted: Array<TokenPair & { reason: string }>;
  /** Atomic conflicts not listed in allowlist (action needed). */
  conflictAtomicUnallowlisted: TokenPair[];
  /** Allowlist token names with no current atomic conflict (stale entries). */
  allowlistUnused: string[];
  allowlistSize: number;
}

/** Collapse CSS declaration value for equality checks (conservative). */
function normalizeValue(raw: string): string {
  let v = raw.trim().replace(/;$/, '').trim();
  v = v.replace(/\s+/g, ' ');
  v = v.replace(/#([0-9a-fA-F]{3,8})\b/g, (_, hex: string) => `#${hex.toLowerCase()}`);
  v = v.replace(
    /rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)/gi,
    (_m, r, g, b, a) => (a !== undefined ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`)
  );
  // Font stacks: 'Segoe UI' === Segoe UI (quotes do not change computed family list)
  v = v.replace(/['"]([^'"]+)['"]/g, '$1');
  return v;
}

/**
 * Atomic tokens that should live in design-tokens / generated only (D1).
 * Semantic / layout / dark-mode tokens are not "atomic overrides".
 */
function classifyToken(name: string): { atomic: boolean; category: string } {
  if (
    /^--color-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}$/.test(
      name
    )
  ) {
    return { atomic: true, category: 'palette' };
  }
  if (/^--color-(white|black)(-alpha-\d+)?$/.test(name)) {
    return { atomic: true, category: 'palette-primitive' };
  }
  if (/^--spacing-(\d+|px|\d+-\d+|\d+\.\d+)$/.test(name)) {
    return { atomic: true, category: 'spacing' };
  }
  if (/^--font-(sans|serif|mono|display)$/.test(name)) {
    return { atomic: true, category: 'font-family' };
  }
  if (/^--font-(thin|extralight|light|regular|medium|semibold|bold|extrabold|black)$/.test(name)) {
    return { atomic: true, category: 'font-weight' };
  }
  if (/^--text-(2xs|xs|sm|base|md|lg|xl|2xl|3xl|4xl|5xl|6xl)$/.test(name)) {
    return { atomic: true, category: 'font-size' };
  }
  if (/^--text-(2xs|xs|sm|base|md|lg|xl|2xl|3xl|4xl|5xl|6xl)-line-height$/.test(name)) {
    return { atomic: true, category: 'line-height-token' };
  }
  if (/^--leading-(none|tight|snug|normal|relaxed|loose)$/.test(name)) {
    return { atomic: true, category: 'leading' };
  }
  if (/^--tracking-(tighter|tight|normal|wide|wider|widest)$/.test(name)) {
    return { atomic: true, category: 'tracking' };
  }
  if (/^--rounded(-none|-sm|-md|-lg|-xl|-2xl|-3xl|-full)?$/.test(name) || name === '--rounded') {
    return { atomic: true, category: 'radius' };
  }
  if (/^--shadow(-none|-sm|-md|-lg|-xl|-2xl|-inner)?$/.test(name) || name === '--shadow') {
    return { atomic: true, category: 'shadow' };
  }
  if (
    /^--z-(auto|\d+|dropdown|sticky|fixed|modal-backdrop|modal|popover|tooltip|toast|max)$/.test(
      name
    )
  ) {
    return { atomic: true, category: 'z-index' };
  }
  if (/^--ease-(linear|in|out|in-out|bounce|smooth)$/.test(name)) {
    return { atomic: true, category: 'easing' };
  }
  if (/^--duration-(75|100|150|200|300|500|700|1000)$/.test(name)) {
    return { atomic: true, category: 'duration' };
  }
  if (/^--container-(max-width|padding(-sm|-md|-lg|-xl)?)$/.test(name)) {
    return { atomic: true, category: 'container' };
  }

  if (
    name.startsWith('--color-primary') ||
    name.startsWith('--color-secondary') ||
    name.startsWith('--color-accent')
  ) {
    return { atomic: false, category: 'semantic-brand' };
  }
  if (
    name.startsWith('--color-success') ||
    name.startsWith('--color-warning') ||
    name.startsWith('--color-error') ||
    name.startsWith('--color-danger') ||
    name.startsWith('--color-info')
  ) {
    return { atomic: false, category: 'semantic-status' };
  }
  if (
    name.startsWith('--color-text-') ||
    name.startsWith('--text-primary') ||
    name.startsWith('--text-secondary')
  ) {
    return { atomic: false, category: 'semantic-text' };
  }
  if (name.startsWith('--color-bg-') || name.startsWith('--bg-') || name.startsWith('--surface-')) {
    return { atomic: false, category: 'semantic-surface' };
  }
  if (
    name.startsWith('--color-border') ||
    name.startsWith('--border-') ||
    name.startsWith('--focus-')
  ) {
    return { atomic: false, category: 'semantic-border-focus' };
  }
  if (name.startsWith('--confidence-')) {
    return { atomic: false, category: 'semantic-confidence' };
  }
  if (
    name.startsWith('--layout-') ||
    name.startsWith('--page-') ||
    name.startsWith('--card-') ||
    name.startsWith('--panel-') ||
    name.startsWith('--button-') ||
    name.startsWith('--module-') ||
    name.startsWith('--sidebar-') ||
    name.startsWith('--header-') ||
    name.startsWith('--section-') ||
    name.startsWith('--prose-') ||
    name.startsWith('--scrollbar-') ||
    name.startsWith('--breakpoint-') ||
    name.startsWith('--gradient-') ||
    name.startsWith('--blur-') ||
    name.startsWith('--backdrop-') ||
    name.startsWith('--grayscale-') ||
    name.startsWith('--opacity-') ||
    name.startsWith('--micro-') ||
    name.startsWith('--animations-') ||
    name.startsWith('--animation-') ||
    name.startsWith('--transition-')
  ) {
    return { atomic: false, category: 'handwritten-semantic' };
  }
  if (/^--spacing-(2xs|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl)$/.test(name)) {
    return { atomic: false, category: 'handwritten-spacing-alias' };
  }
  if (/^--rounded-(xs|card|panel)$/.test(name)) {
    return { atomic: false, category: 'handwritten-radius-alias' };
  }

  return { atomic: false, category: 'other' };
}

function stripBlockCommentsPreserveLines(css: string): string {
  const lines = css.split(/\r?\n/);
  let inBlockComment = false;
  const outLines: string[] = [];

  for (const line of lines) {
    let out = '';
    let j = 0;
    while (j < line.length) {
      if (!inBlockComment && line[j] === '/' && line[j + 1] === '*') {
        inBlockComment = true;
        j += 2;
        continue;
      }
      if (inBlockComment) {
        if (line[j] === '*' && line[j + 1] === '/') {
          inBlockComment = false;
          j += 2;
          continue;
        }
        j += 1;
        continue;
      }
      out += line[j];
      j += 1;
    }
    outLines.push(out);
  }
  return outLines.join('\n');
}

function lineOfIndex(full: string, index: number): number {
  let line = 1;
  for (let p = 0; p < index && p < full.length; p++) {
    if (full[p] === '\n') line += 1;
  }
  return line;
}

function extractPropsFromBody(
  body: string,
  selector: string,
  fullCss: string,
  bodyStartInFull: number,
  results: CssVar[]
): void {
  let cleaned = '';
  let d = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{') {
      d += 1;
      continue;
    }
    if (body[i] === '}') {
      d = Math.max(0, d - 1);
      continue;
    }
    if (d === 0) cleaned += body[i];
  }

  const propRe = /(--[a-zA-Z0-9_-]+(?:\\\.[a-zA-Z0-9_-]+)?)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = propRe.exec(cleaned)) !== null) {
    // CSS `--spacing-0\.5` is the custom property name `--spacing-0.5`
    const cssName = m[1].replace(/\\/g, '');
    const value = m[2].trim();
    const absIndex = bodyStartInFull + m.index;
    results.push({
      name: cssName,
      value,
      line: lineOfIndex(fullCss, absIndex),
      selector,
    });
  }
}

function parseCustomProperties(cssRaw: string): CssVar[] {
  const css = stripBlockCommentsPreserveLines(cssRaw);
  const results: CssVar[] = [];
  let i = 0;
  const n = css.length;

  while (i < n) {
    while (i < n && /\s/.test(css[i])) i += 1;
    if (i >= n) break;

    if (css[i] === '@') {
      while (i < n && css[i] !== '{' && css[i] !== ';') i += 1;
      if (i < n && css[i] === ';') {
        i += 1;
        continue;
      }
      if (i < n && css[i] === '{') {
        // Capture @media body for nested rules
        const atSelectorPrefix = css.slice(css.lastIndexOf('@', i), i).trim().replace(/\s+/g, ' ');
        i += 1;
        const bodyStart = i;
        let d = 1;
        while (i < n && d > 0) {
          if (css[i] === '{') d += 1;
          else if (css[i] === '}') d -= 1;
          if (d > 0) i += 1;
        }
        const mediaBody = css.slice(bodyStart, i);
        i += 1;

        // Parse nested rules inside @media
        let j = 0;
        while (j < mediaBody.length) {
          while (j < mediaBody.length && /\s/.test(mediaBody[j])) j += 1;
          if (j >= mediaBody.length) break;
          if (mediaBody[j] === '@') {
            // nested at-rule — skip balanced
            while (j < mediaBody.length && mediaBody[j] !== '{' && mediaBody[j] !== ';') j += 1;
            if (j < mediaBody.length && mediaBody[j] === ';') {
              j += 1;
              continue;
            }
            if (j < mediaBody.length && mediaBody[j] === '{') {
              j += 1;
              let nd = 1;
              while (j < mediaBody.length && nd > 0) {
                if (mediaBody[j] === '{') nd += 1;
                else if (mediaBody[j] === '}') nd -= 1;
                j += 1;
              }
              continue;
            }
            break;
          }
          const selStart = j;
          while (j < mediaBody.length && mediaBody[j] !== '{') j += 1;
          if (j >= mediaBody.length) break;
          const selector = `${atSelectorPrefix} ${mediaBody.slice(selStart, j).trim().replace(/\s+/g, ' ')}`;
          j += 1;
          const nestedStart = j;
          let nd = 1;
          while (j < mediaBody.length && nd > 0) {
            if (mediaBody[j] === '{') nd += 1;
            else if (mediaBody[j] === '}') nd -= 1;
            if (nd > 0) j += 1;
          }
          const nestedBody = mediaBody.slice(nestedStart, j);
          j += 1;
          extractPropsFromBody(nestedBody, selector, css, bodyStart + nestedStart, results);
        }
        continue;
      }
      continue;
    }

    const selStart = i;
    while (i < n && css[i] !== '{') i += 1;
    if (i >= n) break;
    const selector = css.slice(selStart, i).trim().replace(/\s+/g, ' ');
    i += 1;
    const bodyStart = i;
    let d = 1;
    while (i < n && d > 0) {
      if (css[i] === '{') d += 1;
      else if (css[i] === '}') d -= 1;
      if (d > 0) i += 1;
    }
    const body = css.slice(bodyStart, i);
    i += 1;
    extractPropsFromBody(body, selector, css, bodyStart, results);
  }

  return results;
}

function isRootSelector(selector: string): boolean {
  const s = selector.trim();
  if (s === ':root') return true;
  // Nested under @media … :root
  if (/(^|\s):root$/.test(s)) return true;
  return false;
}

function isDarkSelector(selector: string): boolean {
  const s = selector.toLowerCase();
  return (
    s.includes('.dark') ||
    s.includes("data-theme='dark'") ||
    s.includes('data-theme="dark"') ||
    s.includes("data-color-mode='dark'") ||
    s.includes('data-color-mode="dark"')
  );
}

function mapLatestByName(vars: CssVar[]): Map<string, CssVar> {
  const map = new Map<string, CssVar>();
  for (const v of vars) {
    map.set(v.name, v);
  }
  return map;
}

function loadAllowlist(): { path: string; entries: Map<string, AllowlistEntry> } {
  const rel = relative(repoRoot, ALLOWLIST_PATH).replace(/\\/g, '/');
  if (!existsSync(ALLOWLIST_PATH)) {
    return { path: rel, entries: new Map() };
  }
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as AllowlistFile;
  const entries = new Map<string, AllowlistEntry>();
  for (const entry of raw.overrides ?? []) {
    if (entry?.token) {
      entries.set(entry.token, entry);
    }
  }
  return { path: rel, entries };
}

function buildReport(): AuditReport {
  const generatedCss = readFileSync(GENERATED_PATH, 'utf8');
  const handwrittenCss = readFileSync(HANDWRITTEN_PATH, 'utf8');
  const allowlist = loadAllowlist();

  const generatedVars = parseCustomProperties(generatedCss).filter(v => isRootSelector(v.selector));
  const handwrittenAll = parseCustomProperties(handwrittenCss);
  const handwrittenRoot = handwrittenAll.filter(v => isRootSelector(v.selector));
  const handwrittenDark = handwrittenAll.filter(v => isDarkSelector(v.selector));

  const genMap = mapLatestByName(generatedVars);
  const handMap = mapLatestByName(handwrittenRoot);

  const conflicts: TokenPair[] = [];
  const identical: TokenPair[] = [];
  const onlyHandwritten: AuditReport['onlyHandwritten'] = [];
  const onlyGenerated: AuditReport['onlyGenerated'] = [];

  for (const [name, hand] of handMap) {
    const gen = genMap.get(name);
    const { atomic, category } = classifyToken(name);
    if (!gen) {
      onlyHandwritten.push({ name, value: hand.value, line: hand.line, category });
      continue;
    }
    const pair: TokenPair = {
      name,
      generated: gen.value,
      handwritten: hand.value,
      generatedLine: gen.line,
      handwrittenLine: hand.line,
      atomic,
      category,
    };
    if (normalizeValue(gen.value) === normalizeValue(hand.value)) {
      identical.push(pair);
    } else {
      conflicts.push(pair);
    }
  }

  for (const [name, gen] of genMap) {
    if (!handMap.has(name)) {
      const { category } = classifyToken(name);
      onlyGenerated.push({ name, value: gen.value, line: gen.line, category });
    }
  }

  conflicts.sort((a, b) => a.name.localeCompare(b.name));
  identical.sort((a, b) => a.name.localeCompare(b.name));
  onlyHandwritten.sort((a, b) => a.name.localeCompare(b.name));
  onlyGenerated.sort((a, b) => a.name.localeCompare(b.name));

  const conflictAtomic = conflicts.filter(p => p.atomic);
  const conflictAtomicAllowlisted: AuditReport['conflictAtomicAllowlisted'] = [];
  const conflictAtomicUnallowlisted: TokenPair[] = [];
  for (const p of conflictAtomic) {
    const entry = allowlist.entries.get(p.name);
    if (entry) {
      conflictAtomicAllowlisted.push({ ...p, reason: entry.reason });
    } else {
      conflictAtomicUnallowlisted.push(p);
    }
  }

  const conflictAtomicNames = new Set(conflictAtomic.map(p => p.name));
  const allowlistUnused = [...allowlist.entries.keys()]
    .filter(name => !conflictAtomicNames.has(name))
    .sort((a, b) => a.localeCompare(b));

  return {
    generatedPath: relative(repoRoot, GENERATED_PATH).replace(/\\/g, '/'),
    handwrittenPath: relative(repoRoot, HANDWRITTEN_PATH).replace(/\\/g, '/'),
    allowlistPath: allowlist.path,
    generatedRootCount: genMap.size,
    handwrittenRootCount: handMap.size,
    handwrittenDarkCount: mapLatestByName(handwrittenDark).size,
    conflicts,
    identical,
    onlyHandwritten,
    onlyGenerated,
    identicalAtomic: identical.filter(p => p.atomic),
    conflictAtomic,
    conflictAtomicAllowlisted,
    conflictAtomicUnallowlisted,
    allowlistUnused,
    allowlistSize: allowlist.entries.size,
  };
}

function formatTableRow(cols: string[]): string {
  return `| ${cols.join(' | ')} |`;
}

function toMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# Token Override Inventory (D1)');
  lines.push('');
  lines.push(`Generated: \`${report.generatedPath}\``);
  lines.push(`Handwritten: \`${report.handwrittenPath}\``);
  lines.push(`Allowlist: \`${report.allowlistPath}\``);
  lines.push('Date: 2026-07-26');
  lines.push('');
  lines.push('Phase 2 prep (safe first cut). Source of truth for runtime cascade remains:');
  lines.push('');
  lines.push(
    '`main.css` → `variables.generated.css` then `variables.css` (handwritten wins on same name).'
  );
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(formatTableRow(['Metric', 'Count']));
  lines.push(formatTableRow(['---', '---']));
  lines.push(formatTableRow(['Generated `:root` keys', String(report.generatedRootCount)]));
  lines.push(formatTableRow(['Handwritten `:root` keys', String(report.handwrittenRootCount)]));
  lines.push(formatTableRow(['Handwritten dark-mode keys', String(report.handwrittenDarkCount)]));
  lines.push(
    formatTableRow(['Same name, **different** value (conflicts)', String(report.conflicts.length)])
  );
  lines.push(
    formatTableRow([
      'Same name, **same** value (identical / redundant)',
      String(report.identical.length),
    ])
  );
  lines.push(
    formatTableRow(['↳ of which **atomic** identical', String(report.identicalAtomic.length)])
  );
  lines.push(
    formatTableRow(['↳ of which **atomic** conflicts', String(report.conflictAtomic.length)])
  );
  lines.push(
    formatTableRow([
      '↳ atomic conflicts **allowlisted**',
      String(report.conflictAtomicAllowlisted.length),
    ])
  );
  lines.push(
    formatTableRow([
      '↳ atomic conflicts **unallowlisted**',
      String(report.conflictAtomicUnallowlisted.length),
    ])
  );
  lines.push(formatTableRow(['Allowlist entries', String(report.allowlistSize)]));
  lines.push(formatTableRow(['Allowlist unused (stale)', String(report.allowlistUnused.length)]));
  lines.push(
    formatTableRow([
      'Only in handwritten (semantic candidates)',
      String(report.onlyHandwritten.length),
    ])
  );
  lines.push(formatTableRow(['Only in generated', String(report.onlyGenerated.length)]));
  lines.push('');
  lines.push('## Atomic override allowlist');
  lines.push('');
  lines.push(
    'Intentional atomic same-name overrides are recorded in `config/token-atomic-override-allowlist.json` with a short reason. New atomic conflicts must be allowlisted or removed/aligned — do not mass-align product radii/shadows/z-index until workbench migration.'
  );
  lines.push('');
  if (report.conflictAtomicAllowlisted.length === 0) {
    lines.push('_No allowlisted atomic conflicts currently match._');
  } else {
    lines.push(formatTableRow(['Token', 'Generated', 'Handwritten', 'Category', 'Reason']));
    lines.push(formatTableRow(['---', '---', '---', '---', '---']));
    for (const p of report.conflictAtomicAllowlisted) {
      lines.push(
        formatTableRow([
          '`' + p.name + '`',
          '`' + normalizeValue(p.generated) + '`',
          '`' + normalizeValue(p.handwritten) + '`',
          p.category,
          p.reason,
        ])
      );
    }
  }
  lines.push('');
  lines.push('## Unallowlisted atomic conflicts');
  lines.push('');
  lines.push(
    'These atomic overrides are **not** in the allowlist. Either add a reason to the allowlist or resolve by removing the handwritten declaration / migrating consumers.'
  );
  lines.push('');
  if (report.conflictAtomicUnallowlisted.length === 0) {
    lines.push('_None — allowlist covers all current atomic conflicts._');
  } else {
    lines.push(formatTableRow(['Token', 'Generated', 'Handwritten', 'Category']));
    lines.push(formatTableRow(['---', '---', '---', '---']));
    for (const p of report.conflictAtomicUnallowlisted) {
      lines.push(
        formatTableRow([
          '`' + p.name + '`',
          '`' + normalizeValue(p.generated) + '`',
          '`' + normalizeValue(p.handwritten) + '`',
          p.category,
        ])
      );
    }
  }
  if (report.allowlistUnused.length > 0) {
    lines.push('');
    lines.push('### Stale allowlist entries (no current atomic conflict)');
    lines.push('');
    for (const name of report.allowlistUnused) {
      lines.push(`- \`${name}\``);
    }
  }
  lines.push('');
  lines.push('## Atomic identical duplicates (safe-removal candidates)');
  lines.push('');
  lines.push(
    'These match generated after value normalization (whitespace / hex case / rgba spacing). They are palette/scale tokens that handwritten re-declares with the same value — redundant for cascade purposes.'
  );
  lines.push('');
  if (report.identicalAtomic.length === 0) {
    lines.push('_None found._');
  } else {
    lines.push(formatTableRow(['Token', 'Value', 'Category', 'Gen line', 'Hand line']));
    lines.push(formatTableRow(['---', '---', '---', '---', '---']));
    for (const p of report.identicalAtomic) {
      lines.push(
        formatTableRow([
          '`' + p.name + '`',
          '`' + normalizeValue(p.handwritten) + '`',
          p.category,
          String(p.generatedLine),
          String(p.handwrittenLine),
        ])
      );
    }
  }
  lines.push('');
  lines.push('## Atomic conflicts (true overrides — do not auto-remove)');
  lines.push('');
  if (report.conflictAtomic.length === 0) {
    lines.push('_None found._');
  } else {
    lines.push(formatTableRow(['Token', 'Generated', 'Handwritten', 'Category', 'Allowlisted']));
    lines.push(formatTableRow(['---', '---', '---', '---', '---']));
    for (const p of report.conflictAtomic.slice(0, 80)) {
      const allowed = report.conflictAtomicAllowlisted.some(a => a.name === p.name);
      lines.push(
        formatTableRow([
          '`' + p.name + '`',
          '`' + normalizeValue(p.generated) + '`',
          '`' + normalizeValue(p.handwritten) + '`',
          p.category,
          allowed ? 'yes' : '**no**',
        ])
      );
    }
    if (report.conflictAtomic.length > 80) {
      lines.push('');
      lines.push(`_…and ${report.conflictAtomic.length - 80} more atomic conflicts._`);
    }
  }
  lines.push('');
  lines.push('## Top conflict examples (all categories)');
  lines.push('');
  const topConflicts = report.conflicts.slice(0, 25);
  if (topConflicts.length === 0) {
    lines.push('_None found._');
  } else {
    lines.push(formatTableRow(['Token', 'Generated', 'Handwritten', 'Atomic?', 'Category']));
    lines.push(formatTableRow(['---', '---', '---', '---', '---']));
    for (const p of topConflicts) {
      lines.push(
        formatTableRow([
          '`' + p.name + '`',
          '`' + normalizeValue(p.generated) + '`',
          '`' + normalizeValue(p.handwritten) + '`',
          p.atomic ? 'yes' : 'no',
          p.category,
        ])
      );
    }
  }
  lines.push('');
  lines.push('## Only-in-handwritten samples (semantic / migration)');
  lines.push('');
  const samples = report.onlyHandwritten.slice(0, 40);
  lines.push(formatTableRow(['Token', 'Value', 'Category']));
  lines.push(formatTableRow(['---', '---', '---']));
  for (const p of samples) {
    const val = normalizeValue(p.value);
    const short = val.length > 60 ? `${val.slice(0, 57)}…` : val;
    lines.push(formatTableRow([`\`${p.name}\``, `\`${short}\``, p.category]));
  }
  if (report.onlyHandwritten.length > 40) {
    lines.push('');
    lines.push(`_…and ${report.onlyHandwritten.length - 40} more only-handwritten keys._`);
  }
  lines.push('');
  lines.push('## Identical non-atomic (document only)');
  lines.push('');
  const nonAtomicIdent = report.identical.filter(p => !p.atomic);
  lines.push(
    `Count: **${nonAtomicIdent.length}** (semantic name collisions that happen to match).`
  );
  if (nonAtomicIdent.length > 0) {
    lines.push('');
    lines.push(formatTableRow(['Token', 'Value', 'Category']));
    lines.push(formatTableRow(['---', '---', '---']));
    for (const p of nonAtomicIdent.slice(0, 20)) {
      lines.push(
        formatTableRow([`\`${p.name}\``, `\`${normalizeValue(p.handwritten)}\``, p.category])
      );
    }
  }
  lines.push('');
  lines.push('## Recommended next surgical removals');
  lines.push('');
  lines.push(
    '1. **Safe now**: remove atomic identical palette / font-weight / font-size / leading / tracking re-declarations from `variables.css` only when value-equal and not dark-scoped (script lists them above).'
  );
  lines.push(
    '2. **Do not auto-remove**: radius, shadow, z-index, duration, easing conflicts — intentional product scale vs generated Tailwind-like scale (D2). Documented in allowlist.'
  );
  lines.push(
    '3. **Migrate later**: palette scales missing from handwritten but present in generated (gray/sky/violet/…) already win from generated unless something redefines them.'
  );
  lines.push(
    '4. **Semantic keep**: surfaces, status, layout aliases, micro-interaction, dark mode block stay handwritten until Phase 2 split to `variables.semantic.css`.'
  );
  lines.push(
    '5. **Gate later**: enable `--fail-on-unallowlisted-atomic` in CI (prefer over full `--fail-on-atomic-override`) once allowlist is the source of intentional exceptions.'
  );
  lines.push('');
  lines.push('## Script');
  lines.push('');
  lines.push('```bash');
  lines.push('npm run token:override-audit');
  lines.push('npx tsx scripts/quality/audit-token-overrides.ts --markdown');
  lines.push('npx tsx scripts/quality/audit-token-overrides.ts --fail-on-unallowlisted-atomic');
  lines.push('npx tsx scripts/quality/audit-token-overrides.ts --fail-on-atomic-override');
  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

function printHuman(report: AuditReport): void {
  console.log('D1 token override audit');
  console.log(`  generated :root keys: ${report.generatedRootCount}`);
  console.log(`  handwritten :root keys: ${report.handwrittenRootCount}`);
  console.log(`  dark-mode keys: ${report.handwrittenDarkCount}`);
  console.log(`  conflicts (same name, different value): ${report.conflicts.length}`);
  console.log(`  identical (same name, same value): ${report.identical.length}`);
  console.log(`    atomic identical: ${report.identicalAtomic.length}`);
  console.log(`    atomic conflicts: ${report.conflictAtomic.length}`);
  console.log(`      allowlisted: ${report.conflictAtomicAllowlisted.length}`);
  console.log(`      unallowlisted: ${report.conflictAtomicUnallowlisted.length}`);
  console.log(`  allowlist entries: ${report.allowlistSize} (${report.allowlistPath})`);
  if (report.allowlistUnused.length > 0) {
    console.log(`  allowlist unused (stale): ${report.allowlistUnused.length}`);
  }
  console.log(`  only-handwritten: ${report.onlyHandwritten.length}`);
  console.log(`  only-generated: ${report.onlyGenerated.length}`);
  if (report.conflictAtomicUnallowlisted.length > 0) {
    console.log('\nUnallowlisted atomic conflicts:');
    for (const p of report.conflictAtomicUnallowlisted.slice(0, 20)) {
      console.log(
        `  ${p.name}: gen=${normalizeValue(p.generated)} | hand=${normalizeValue(p.handwritten)} (${p.category})`
      );
    }
  } else if (report.conflictAtomicAllowlisted.length > 0) {
    console.log('\nAllowlisted atomic conflicts (sample):');
    for (const p of report.conflictAtomicAllowlisted.slice(0, 8)) {
      console.log(`  ${p.name} (${p.category}): ${p.reason}`);
    }
  }
  if (report.identicalAtomic.length > 0) {
    console.log(`\nAtomic identical sample (${Math.min(8, report.identicalAtomic.length)}):`);
    for (const p of report.identicalAtomic.slice(0, 8)) {
      console.log(`  ${p.name} = ${normalizeValue(p.handwritten)} (${p.category})`);
    }
  }
}

function parseArgs(argv: string[]) {
  return {
    json: argv.includes('--json'),
    markdown: argv.includes('--markdown'),
    failOnAtomicOverride: argv.includes('--fail-on-atomic-override'),
    failOnUnallowlistedAtomic: argv.includes('--fail-on-unallowlisted-atomic'),
    write: (() => {
      const i = argv.indexOf('--write');
      return i >= 0 ? argv[i + 1] : null;
    })(),
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const report = buildReport();

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else if (args.markdown) {
    const md = toMarkdown(report);
    if (args.write) {
      writeFileSync(args.write, md, 'utf8');
      console.log(`Wrote ${args.write}`);
    } else {
      process.stdout.write(md);
    }
  } else {
    printHuman(report);
    if (args.write) {
      writeFileSync(args.write, toMarkdown(report), 'utf8');
      console.log(`\nWrote ${args.write}`);
    }
  }

  let failed = false;
  if (args.failOnAtomicOverride && report.conflictAtomic.length > 0) {
    console.error(
      `\n[fail-on-atomic-override] ${report.conflictAtomic.length} atomic same-name value conflicts`
    );
    failed = true;
  }
  if (args.failOnUnallowlistedAtomic && report.conflictAtomicUnallowlisted.length > 0) {
    console.error(
      `\n[fail-on-unallowlisted-atomic] ${report.conflictAtomicUnallowlisted.length} atomic conflicts not in allowlist`
    );
    failed = true;
  }

  process.exit(failed ? 1 : 0);
}

main();
