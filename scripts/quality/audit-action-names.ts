import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as ts from 'typescript';
import {
  validateDataActionName,
  validateRegistryActionName,
} from '../../src/common/utils/actionNaming';

interface Finding {
  file: string;
  line: number;
  value: string;
  source: 'data-action' | 'registry';
  message: string;
}

interface AuditResult {
  filesScanned: number;
  dataActionCount: number;
  registryActionCount: number;
  findings: Finding[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');
const srcRoot = join(projectRoot, 'src');
const DATA_ACTION_PATTERN = /\bdata-action\s*=\s*(["'])([^"'<>${}]+)\1/g;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.html']);
const SCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const REGISTRY_BATCH_CALLS = new Set(['registerActions', 'registerActionsWithLegacy']);
const REGISTRY_SINGLE_CALLS = new Set(['registerAction', 'registerActionWithLegacy']);

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

function getLine(content: string, position: number): number {
  return content.slice(0, position).split(/\r?\n/).length;
}

function getNodeLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function auditDataActionNames(
  file: string,
  content: string
): {
  count: number;
  findings: Finding[];
} {
  const findings: Finding[] = [];
  let count = 0;
  let match: RegExpExecArray | null;

  while ((match = DATA_ACTION_PATTERN.exec(content)) !== null) {
    const value = match[2];
    count += 1;
    const validation = validateDataActionName(value);

    if (!validation.valid) {
      findings.push({
        file,
        line: getLine(content, match.index),
        value,
        source: 'data-action',
        message: validation.message ?? 'Invalid data-action name',
      });
    }
  }

  return { count, findings };
}

function auditRegistryActionNames(
  file: string,
  content: string
): {
  count: number;
  findings: Finding[];
} {
  if (!SCRIPT_EXTENSIONS.has(extname(file))) {
    return { count: 0, findings: [] };
  }

  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true);
  const objectMaps = collectObjectActionMaps(sourceFile);
  const findings: Finding[] = [];
  let count = 0;

  function auditActionName(actionName: string, node: ts.Node): void {
    count += 1;
    const validation = validateRegistryActionName(actionName);
    if (validation.valid) {
      return;
    }

    findings.push({
      file,
      line: getNodeLine(sourceFile, node),
      value: actionName,
      source: 'registry',
      message: validation.message ?? 'Invalid registry action name',
    });
  }

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const callName = getCallName(node.expression);
      const firstArg = node.arguments[0];

      if (
        callName &&
        REGISTRY_SINGLE_CALLS.has(callName) &&
        firstArg &&
        ts.isStringLiteral(firstArg)
      ) {
        auditActionName(firstArg.text, firstArg);
      }

      if (callName && REGISTRY_BATCH_CALLS.has(callName) && firstArg) {
        getActionNamesFromArgument(firstArg, objectMaps).forEach(({ name, node }) =>
          auditActionName(name, node)
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return { count, findings };
}

function collectObjectActionMaps(
  sourceFile: ts.SourceFile
): Map<string, { name: string; node: ts.Node }[]> {
  const maps = new Map<string, { name: string; node: ts.Node }[]>();

  function visit(node: ts.Node): void {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      maps.set(node.name.text, getActionNamesFromObjectLiteral(node.initializer));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return maps;
}

function getActionNamesFromArgument(
  node: ts.Expression,
  objectMaps: Map<string, { name: string; node: ts.Node }[]>
): { name: string; node: ts.Node }[] {
  if (ts.isObjectLiteralExpression(node)) {
    return getActionNamesFromObjectLiteral(node);
  }

  if (ts.isIdentifier(node)) {
    return objectMaps.get(node.text) ?? [];
  }

  return [];
}

function getActionNamesFromObjectLiteral(node: ts.ObjectLiteralExpression): {
  name: string;
  node: ts.Node;
}[] {
  const names: { name: string; node: ts.Node }[] = [];

  node.properties.forEach(property => {
    if (!ts.isPropertyAssignment(property) && !ts.isMethodDeclaration(property)) {
      return;
    }

    const name = getPropertyName(property.name);
    if (name) {
      names.push({ name, node: property.name });
    }
  });

  return names;
}

function getPropertyName(node: ts.PropertyName): string | null {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }

  return null;
}

function getCallName(node: ts.Expression): string | null {
  if (ts.isIdentifier(node)) {
    return node.text;
  }

  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text;
  }

  return null;
}

function auditActionNames(): AuditResult {
  const files = collectSourceFiles(srcRoot);
  const result: AuditResult = {
    filesScanned: files.length,
    dataActionCount: 0,
    registryActionCount: 0,
    findings: [],
  };

  files.forEach(filePath => {
    const content = readFileSync(filePath, 'utf8');
    const file = relative(projectRoot, filePath);
    const dataActionResult = auditDataActionNames(file, content);
    const registryResult = auditRegistryActionNames(file, content);

    result.dataActionCount += dataActionResult.count;
    result.registryActionCount += registryResult.count;
    result.findings.push(...dataActionResult.findings, ...registryResult.findings);
  });

  return result;
}

function printReport(result: AuditResult): void {
  console.log('Action name audit report');
  console.log('='.repeat(80));
  console.log(`Files scanned: ${result.filesScanned}`);
  console.log(`Static data-action values: ${result.dataActionCount}`);
  console.log(`Registry action names: ${result.registryActionCount}`);
  console.log(`Findings: ${result.findings.length}`);

  if (result.findings.length === 0) {
    console.log('Status: passed');
    return;
  }

  console.log('');
  result.findings.slice(0, 80).forEach(finding => {
    console.log(
      `${finding.file}:${finding.line} ${finding.source} "${finding.value}" - ${finding.message}`
    );
  });

  if (result.findings.length > 80) {
    console.log(`... ${result.findings.length - 80} additional finding(s) omitted`);
  }

  console.log('');
  console.log('Status: failed');
}

const result = auditActionNames();
printReport(result);

if (result.findings.length > 0) {
  process.exitCode = 1;
}
