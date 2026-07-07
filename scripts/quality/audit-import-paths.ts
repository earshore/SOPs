import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, extname, join, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';

interface Finding {
  file: string;
  line: number;
  specifier: string;
  targetRoot: string;
  reason: string;
}

interface AuditResult {
  filesScanned: number;
  importsScanned: number;
  findings: Finding[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const srcRoot = join(projectRoot, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const TARGET_SRC_ROOTS = new Set(['common', 'services', 'stores', 'types']);
const DISALLOWED_PROJECT_ALIASES = new Map([
  ['@common', 'common'],
  ['@services', 'services'],
  ['@components', 'components'],
  ['@modules', 'modules'],
  ['@types', 'types'],
  ['@router', 'common/router'],
]);
const ALIAS_REQUIRED_SOURCE_ROOTS = new Set([
  'main.ts',
  'config',
  'modules',
  'components',
  'services',
  'stores',
  'common',
  'types',
]);
const MIN_PARENT_DEPTH = 3;
const MAX_DISALLOWED_RELATIVE_IMPORTS = 0;

function collectSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      collectSourceFiles(filePath, fileList);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(extname(entry)) && !isTestFile(entry)) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function isTestFile(fileName: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(fileName);
}

function getNodeLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function countParentSegments(specifier: string): number {
  return specifier.split('/').filter(part => part === '..').length;
}

function normalizePath(filePath: string): string {
  return filePath.split(sep).join('/');
}

function getRelativeSrcTarget(file: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const resolvedTarget = resolve(dirname(file), specifier);
  const relativeToSrc = relative(srcRoot, resolvedTarget);

  if (relativeToSrc.startsWith('..') || relativeToSrc === '') {
    return null;
  }

  return normalizePath(relativeToSrc);
}

function getSourceRoot(file: string): string | null {
  const relativeToSrc = normalizePath(relative(srcRoot, file));
  return relativeToSrc.split('/')[0] || null;
}

function getDisallowedImport(
  file: string,
  specifier: string
): { targetRoot: string; reason: string } | null {
  const disallowedAlias = getDisallowedProjectAlias(specifier);
  if (disallowedAlias) {
    return disallowedAlias;
  }

  const relativeTarget = getRelativeSrcTarget(file, specifier);

  if (!relativeTarget) {
    return null;
  }

  const [targetRoot] = relativeTarget.split('/');
  if (!targetRoot || !TARGET_SRC_ROOTS.has(targetRoot)) {
    return null;
  }

  const sourceRoot = getSourceRoot(file);
  if (sourceRoot && sourceRoot !== targetRoot && ALIAS_REQUIRED_SOURCE_ROOTS.has(sourceRoot)) {
    return {
      targetRoot,
      reason: `${sourceRoot} must import public src roots through @/ aliases`,
    };
  }

  if (specifier.startsWith('../') && countParentSegments(specifier) >= MIN_PARENT_DEPTH) {
    return {
      targetRoot,
      reason: `relative import climbs ${MIN_PARENT_DEPTH}+ parent segments into a public src root`,
    };
  }

  return null;
}

function getDisallowedProjectAlias(
  specifier: string
): { targetRoot: string; reason: string } | null {
  for (const [alias, targetRoot] of DISALLOWED_PROJECT_ALIASES) {
    if (specifier === alias || specifier.startsWith(`${alias}/`)) {
      return {
        targetRoot,
        reason: `use @/${targetRoot}/... instead of alternate project alias ${alias}`,
      };
    }
  }

  return null;
}

function getImportSpecifier(node: ts.Node): ts.StringLiteral | null {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1
  ) {
    const [firstArg] = node.arguments;
    if (firstArg && ts.isStringLiteral(firstArg)) {
      return firstArg;
    }
  }

  return null;
}

function auditFile(filePath: string): {
  importsScanned: number;
  findings: Finding[];
} {
  const content = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const findings: Finding[] = [];
  let importsScanned = 0;

  function visit(node: ts.Node): void {
    const specifier = getImportSpecifier(node);

    if (specifier) {
      importsScanned += 1;
      const disallowedImport = getDisallowedImport(filePath, specifier.text);

      if (disallowedImport) {
        findings.push({
          file: normalizePath(relative(projectRoot, filePath)),
          line: getNodeLine(sourceFile, specifier),
          specifier: specifier.text,
          ...disallowedImport,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return { importsScanned, findings };
}

function auditImportPaths(): AuditResult {
  const files = collectSourceFiles(srcRoot);
  const result: AuditResult = {
    filesScanned: files.length,
    importsScanned: 0,
    findings: [],
  };

  files.forEach(filePath => {
    const fileResult = auditFile(filePath);
    result.importsScanned += fileResult.importsScanned;
    result.findings.push(...fileResult.findings);
  });

  return result;
}

function printReport(result: AuditResult): void {
  console.log('Import path audit report');
  console.log('='.repeat(80));
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`Import specifiers scanned: ${result.importsScanned}`);
  console.log(`Disallowed import paths: ${result.findings.length}`);
  console.log(`Allowed baseline: ${MAX_DISALLOWED_RELATIVE_IMPORTS}`);

  if (result.findings.length <= MAX_DISALLOWED_RELATIVE_IMPORTS) {
    console.log('Status: passed');
    return;
  }

  console.log('');
  result.findings
    .slice(MAX_DISALLOWED_RELATIVE_IMPORTS, MAX_DISALLOWED_RELATIVE_IMPORTS + 80)
    .forEach(finding => {
      console.log(
        `${finding.file}:${finding.line} ${finding.specifier} -> src/${finding.targetRoot} (${finding.reason})`
      );
    });

  if (result.findings.length > MAX_DISALLOWED_RELATIVE_IMPORTS + 80) {
    console.log(
      `... ${result.findings.length - MAX_DISALLOWED_RELATIVE_IMPORTS - 80} additional finding(s) omitted`
    );
  }

  console.log('');
  console.log('Status: failed');
}

const result = auditImportPaths();
printReport(result);

if (result.findings.length > MAX_DISALLOWED_RELATIVE_IMPORTS) {
  process.exitCode = 1;
}
