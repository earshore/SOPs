import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, extname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import * as ts from 'typescript';

type FindingKind =
  | 'path-segment'
  | 'top-level-function'
  | 'top-level-value'
  | 'method'
  | 'export-function'
  | 'export-type'
  | 'export-value'
  | 'named-export';

interface Finding {
  kind: FindingKind;
  file: string;
  line?: number;
  name: string;
  expected: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const srcRoot = join(projectRoot, 'src');

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.html']);
const EXPORT_SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const LOWER_CAMEL_NAME = /^[a-z][A-Za-z0-9]*$/;
const PASCAL_NAME = /^[A-Z][A-Za-z0-9]*$/;
const UPPER_SNAKE_NAME = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;
const PATH_SEGMENT_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9]$/;
const ALLOWED_PATH_SEGMENTS = new Set(['__tests__']);
const METHOD_NAME_SCAN_ROOTS = new Set(['components', 'modules']);
const METHOD_NAME_SCAN_FILES = new Set([
  'common/router/navigo/ErrorHandler.ts',
  'common/router/navigo/GuardManager.ts',
  'common/router/navigo/MiddlewareManager.ts',
  'common/router/navigo/ParamParser.ts',
  'common/router/navigo/PreloadManager.ts',
  'common/router/navigo/RouteConfigConverter.ts',
  'common/utils/WorkingStateManager.ts',
]);
const ALLOWED_METHOD_NAMES = new Set(['$watch']);

function collectSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const filePath = join(dir, entry);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      collectSourceFiles(filePath, fileList);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(extname(entry))) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function normalizePath(file: string): string {
  return relative(projectRoot, file).replace(/\\/g, '/');
}

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file);
}

function hasExportModifier(node: ts.Node): boolean {
  if (!ts.canHaveModifiers(node)) return false;
  return (
    ts.getModifiers(node)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false
  );
}

function getNodeLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isLowerCamelName(name: string): boolean {
  return LOWER_CAMEL_NAME.test(name);
}

function isPascalName(name: string): boolean {
  return PASCAL_NAME.test(name);
}

function isExportedValueName(name: string): boolean {
  return LOWER_CAMEL_NAME.test(name) || PASCAL_NAME.test(name) || UPPER_SNAKE_NAME.test(name);
}

function auditPathSegments(files: string[]): Finding[] {
  const findings: Finding[] = [];
  const checked = new Set<string>();

  for (const file of files) {
    const relativePath = relative(srcRoot, file);
    const segments = relativePath.split(/[\\/]/);

    for (const segment of segments) {
      if (checked.has(segment)) continue;
      checked.add(segment);
      if (ALLOWED_PATH_SEGMENTS.has(segment)) continue;

      const valid =
        PATH_SEGMENT_NAME.test(segment) &&
        !segment.includes('__') &&
        !segment.includes('--') &&
        !/\s/.test(segment);

      if (!valid) {
        findings.push({
          kind: 'path-segment',
          file: normalizePath(file),
          name: segment,
          expected:
            'ASCII letters, numbers, dot, dash, or underscore; no spaces or repeated separators',
        });
      }
    }
  }

  return findings;
}

function auditExportedIdentifiers(files: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (!EXPORT_SCAN_EXTENSIONS.has(extname(file)) || isTestFile(file)) continue;

    const sourceText = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);

    function visit(node: ts.Node): void {
      if (hasExportModifier(node)) {
        auditExportedDeclaration(file, sourceFile, node, findings);
      }

      if (
        ts.isExportDeclaration(node) &&
        node.exportClause &&
        ts.isNamedExports(node.exportClause)
      ) {
        for (const element of node.exportClause.elements) {
          const name = element.name.text;
          if (!isExportedValueName(name)) {
            findings.push({
              kind: 'named-export',
              file: normalizePath(file),
              line: getNodeLine(sourceFile, element),
              name,
              expected: 'lowerCamelCase, PascalCase, or UPPER_SNAKE_CASE',
            });
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return findings;
}

function auditTopLevelIdentifiers(files: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (!EXPORT_SCAN_EXTENSIONS.has(extname(file)) || isTestFile(file)) continue;

    const sourceText = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);

    for (const statement of sourceFile.statements) {
      if (
        ts.isFunctionDeclaration(statement) &&
        statement.name &&
        !isLowerCamelName(statement.name.text)
      ) {
        findings.push({
          kind: 'top-level-function',
          file: normalizePath(file),
          line: getNodeLine(sourceFile, statement),
          name: statement.name.text,
          expected: 'lowerCamelCase',
        });
        continue;
      }

      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name)) continue;

          const name = declaration.name.text;
          if (!isExportedValueName(name)) {
            findings.push({
              kind: 'top-level-value',
              file: normalizePath(file),
              line: getNodeLine(sourceFile, declaration),
              name,
              expected: 'lowerCamelCase, PascalCase, or UPPER_SNAKE_CASE',
            });
          }
        }
      }
    }
  }

  return findings;
}

function getIdentifierLikeName(name: ts.PropertyName | ts.PrivateIdentifier): string | null {
  if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name)) {
    return name.text;
  }

  if (ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return null;
}

function shouldAuditMethodNames(file: string): boolean {
  const relativePath = relative(srcRoot, file).replace(/\\/g, '/');
  const [sourceRoot] = relativePath.split('/');
  return (
    METHOD_NAME_SCAN_FILES.has(relativePath) ||
    (!!sourceRoot && METHOD_NAME_SCAN_ROOTS.has(sourceRoot))
  );
}

function isAllowedMethodName(name: string): boolean {
  return isLowerCamelName(name) || ALLOWED_METHOD_NAMES.has(name);
}

function auditMethodIdentifiers(files: string[]): Finding[] {
  const findings: Finding[] = [];

  for (const file of files) {
    if (
      !EXPORT_SCAN_EXTENSIONS.has(extname(file)) ||
      isTestFile(file) ||
      !shouldAuditMethodNames(file)
    ) {
      continue;
    }

    const sourceText = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);

    function visit(node: ts.Node): void {
      if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
        const name = getIdentifierLikeName(node.name);
        if (name && !isAllowedMethodName(name)) {
          findings.push({
            kind: 'method',
            file: normalizePath(file),
            line: getNodeLine(sourceFile, node),
            name,
            expected: 'lowerCamelCase',
          });
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
  }

  return findings;
}

function auditExportedDeclaration(
  file: string,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  findings: Finding[]
): void {
  if (ts.isFunctionDeclaration(node) && node.name && !isLowerCamelName(node.name.text)) {
    findings.push({
      kind: 'export-function',
      file: normalizePath(file),
      line: getNodeLine(sourceFile, node),
      name: node.name.text,
      expected: 'lowerCamelCase',
    });
    return;
  }

  if (
    (ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isEnumDeclaration(node)) &&
    node.name &&
    !isPascalName(node.name.text)
  ) {
    findings.push({
      kind: 'export-type',
      file: normalizePath(file),
      line: getNodeLine(sourceFile, node),
      name: node.name.text,
      expected: 'PascalCase',
    });
    return;
  }

  if (ts.isVariableStatement(node)) {
    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const name = declaration.name.text;
      if (!isExportedValueName(name)) {
        findings.push({
          kind: 'export-value',
          file: normalizePath(file),
          line: getNodeLine(sourceFile, declaration),
          name,
          expected: 'lowerCamelCase, PascalCase, or UPPER_SNAKE_CASE',
        });
      }
    }
  }
}

function printReport(filesScanned: number, exportFilesScanned: number, findings: Finding[]): void {
  console.log('Source naming audit report');
  console.log('='.repeat(80));
  console.log(`Files scanned: ${filesScanned}`);
  console.log(`Export files scanned: ${exportFilesScanned}`);
  console.log(`Findings: ${findings.length}`);

  if (findings.length > 0) {
    console.log('');
    for (const finding of findings) {
      const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
      console.log(`- [${finding.kind}] ${location} "${finding.name}" -> ${finding.expected}`);
    }
  }

  console.log(`Status: ${findings.length === 0 ? 'passed' : 'failed'}`);
}

const files = collectSourceFiles(srcRoot);
const exportFilesScanned = files.filter(
  file => EXPORT_SCAN_EXTENSIONS.has(extname(file)) && !isTestFile(file)
).length;
const findings = [
  ...auditPathSegments(files),
  ...auditTopLevelIdentifiers(files),
  ...auditMethodIdentifiers(files),
  ...auditExportedIdentifiers(files),
];

printReport(files.length, exportFilesScanned, findings);

if (findings.length > 0) {
  process.exitCode = 1;
}
