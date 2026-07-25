#!/usr/bin/env node
/**
 * 技术债务扫描工具
 * 
 * 功能：
 * - 扫描代码中的 TODO、FIXME、HACK 注释
 * - 扫描 @ts-ignore 和 @ts-expect-error
 * - 扫描 any 类型使用
 * - 扫描 console.log 调试代码
 * - 扫描重复代码块（> 10 行）
 * - 扫描过长函数（> 100 行）
 * - 扫描过深嵌套（> 4 层）
 * - 生成 HTML 和 JSON 报告
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 类型定义
// ============================================================================

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface DuplicateCandidate {
  occurrences: number[];
  blockLines: number;
  preview: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3
};

const FAIL_ON_SEVERITIES = ['medium', 'high', 'critical'] as const;

type FailOnSeverity = (typeof FAIL_ON_SEVERITIES)[number];

function sameCloneWindow(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate
): boolean {
  if (candidate.occurrences.length !== existing.occurrences.length) {
    return false;
  }

  const candidateStart = candidate.occurrences[0];
  const existingStart = existing.occurrences[0];
  if (candidateStart === undefined || existingStart === undefined) {
    return false;
  }

  const offset = candidateStart - existingStart;
  if (offset < 0 || offset > existing.blockLines) {
    return false;
  }

  return candidate.occurrences.every((line, index) => {
    const existingLine = existing.occurrences[index];
    return existingLine !== undefined && line - existingLine === offset;
  });
}

function dedupeDuplicateCandidates(
  candidates: DuplicateCandidate[]
): DuplicateCandidate[] {
  if (candidates.some(candidate => candidate.occurrences.length < 2)) {
    throw new Error('Duplicate candidates must contain at least two occurrences');
  }

  const deduped: DuplicateCandidate[] = [];
  const orderedCandidates = [...candidates].sort(
    (left, right) =>
      (left.occurrences[0] ?? Number.POSITIVE_INFINITY) -
      (right.occurrences[0] ?? Number.POSITIVE_INFINITY)
  );

  for (const candidate of orderedCandidates) {
    const existing = deduped.find(group => sameCloneWindow(candidate, group));
    if (!existing) {
      deduped.push({
        ...candidate,
        occurrences: [...candidate.occurrences]
      });
      continue;
    }

    const extension = candidate.occurrences[0]! - existing.occurrences[0]!;
    existing.blockLines = Math.max(existing.blockLines, candidate.blockLines + extension);
  }

  return deduped;
}

function shouldFailOnSeverity(
  counts: Record<Severity, number>,
  selectedFloor: Severity
): boolean {
  const selectedRank = SEVERITY_RANK[selectedFloor];
  return (Object.keys(SEVERITY_RANK) as Severity[]).some(
    severity => SEVERITY_RANK[severity] >= selectedRank && counts[severity] > 0
  );
}

function parseFailOnSeverity(args: string[]): FailOnSeverity {
  let selected: FailOnSeverity = 'high';
  let hasFailOn = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    let value: string | undefined;

    if (argument === '--fail-on') {
      value = args[++index];
    } else if (argument.startsWith('--fail-on=')) {
      value = argument.slice('--fail-on='.length);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }

    if (hasFailOn) {
      throw new Error('--fail-on may only be specified once');
    }
    hasFailOn = true;

    if (!FAIL_ON_SEVERITIES.includes(value as FailOnSeverity)) {
      throw new Error('Invalid --fail-on value: expected medium, high, or critical');
    }

    selected = value as FailOnSeverity;
  }

  return selected;
}

interface ScanRule {
  id: string;
  name: string;
  severity: Severity;
  pattern?: RegExp;
  astChecker?: (node: ts.Node, sourceFile: ts.SourceFile) => boolean;
  message: string;
}

interface TechDebtIssue {
  ruleId: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  column: number;
  code?: string;
}

interface TechDebtReport {
  summary: {
    totalIssues: number;
    bySeverity: Record<Severity, number>;
    byFile: Record<string, number>;
  };
  issues: TechDebtIssue[];
  metrics: {
    totalFiles: number;
    totalLines: number;
    debtRatio: number;
  };
  generatedAt: string;
}

interface ScanConfig {
  srcDir: string;
  excludeDirs: string[];
  excludeFiles: string[];
  outputDir: string;
  rules: ScanRule[];
}

interface FunctionInfo {
  name: string;
  type: string;
  lines: number;
  signature: string;
}

const CONTROL_FLOW_NAMES = new Map<ts.SyntaxKind, string>([
  [ts.SyntaxKind.IfStatement, 'if 语句'],
  [ts.SyntaxKind.ForStatement, 'for 循环'],
  [ts.SyntaxKind.WhileStatement, 'while 循环'],
  [ts.SyntaxKind.DoStatement, 'do-while 循环'],
  [ts.SyntaxKind.SwitchStatement, 'switch 语句'],
  [ts.SyntaxKind.TryStatement, 'try-catch 语句']
]);

const ANY_TYPE_NODE_READERS: Array<(node: ts.Node) => ts.TypeNode | undefined> = [
  node => (ts.isVariableDeclaration(node) ? node.type : undefined),
  node => (ts.isParameter(node) ? node.type : undefined),
  node => (ts.isFunctionDeclaration(node) ? node.type : undefined),
  node => (ts.isMethodDeclaration(node) ? node.type : undefined),
  node => (ts.isArrowFunction(node) ? node.type : undefined),
  node => (ts.isFunctionExpression(node) ? node.type : undefined),
  node => (ts.isPropertyDeclaration(node) ? node.type : undefined),
  node => (ts.isTypeAliasDeclaration(node) ? node.type : undefined),
  node => (ts.isPropertySignature(node) ? node.type : undefined),
  node => (ts.isMethodSignature(node) ? node.type : undefined),
  node => (ts.isAsExpression(node) ? node.type : undefined)
];

function getCandidateAnyTypeNode(node: ts.Node): ts.TypeNode | undefined {
  for (const readType of ANY_TYPE_NODE_READERS) {
    const typeNode = readType(node);
    if (typeNode) {
      return typeNode;
    }
  }
  return undefined;
}

function isAnyTypeUsage(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  if (node.kind === ts.SyntaxKind.AnyKeyword) {
    return true;
  }

  const typeNode = getCandidateAnyTypeNode(node);
  if (!typeNode) {
    return false;
  }

  const typeText = typeNode.getText(sourceFile);
  return typeText === 'any' || (ts.isTypeAliasDeclaration(node) && typeText.includes('any'));
}

function getFunctionBodyBlock(node: ts.Node): ts.Block | null {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isFunctionExpression(node)) {
    return node.body || null;
  }
  if (ts.isArrowFunction(node) && ts.isBlock(node.body)) {
    return node.body;
  }
  return null;
}

function countNonEmptyLines(text: string): number {
  return text.split('\n').filter(line => line.trim().length > 0).length;
}

function isLongFunctionBody(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const body = getFunctionBodyBlock(node);
  if (!body) {
    return false;
  }

  const bodyText = sourceFile.text.substring(body.getStart(sourceFile), body.getEnd());
  return countNonEmptyLines(bodyText) > 100;
}

function isControlFlowStatement(node: ts.Node): boolean {
  return CONTROL_FLOW_NAMES.has(node.kind);
}

function isFunctionBoundary(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node)
  );
}

function getControlFlowDepth(node: ts.Node): number {
  let depth = 1;
  let current: ts.Node | undefined = node.parent;

  while (current) {
    if (isControlFlowStatement(current)) {
      depth++;
    }
    if (isFunctionBoundary(current)) {
      break;
    }
    current = current.parent;
  }

  return depth;
}

function isDeeplyNestedStatement(node: ts.Node): boolean {
  return isControlFlowStatement(node) && getControlFlowDepth(node) > 4;
}

function getControlFlowName(node: ts.Node): string {
  return CONTROL_FLOW_NAMES.get(node.kind) || '';
}

// ============================================================================
// 扫描规则配置
// ============================================================================

const SCAN_RULES: ScanRule[] = [
  {
    id: 'todo-comment',
    name: 'TODO 注释',
    severity: 'low',
    pattern: /(?:\/\/|\/\*\*?|\*)\s*TODO:/i,
    message: '存在未完成的 TODO 注释'
  },
  {
    id: 'fixme-comment',
    name: 'FIXME 注释',
    severity: 'medium',
    pattern: /(?:\/\/|\/\*\*?|\*)\s*FIXME:/i,
    message: '存在需要修复的 FIXME 注释'
  },
  {
    id: 'hack-comment',
    name: 'HACK 注释',
    severity: 'high',
    pattern: /(?:\/\/|\/\*\*?|\*)\s*HACK:/i,
    message: '存在临时解决方案 HACK 注释'
  },
  {
    id: 'ts-ignore',
    name: 'TypeScript 忽略',
    severity: 'medium',
    pattern: /^\s*\/\/\s*@ts-ignore(?:\s|$)/,
    message: '使用了 @ts-ignore 忽略类型检查'
  },
  {
    id: 'ts-expect-error',
    name: 'TypeScript 预期错误',
    severity: 'low',
    pattern: /^\s*\/\/\s*@ts-expect-error(?:\s|$)/,
    message: '使用了 @ts-expect-error'
  },
  {
    id: 'console-log',
    name: '调试日志',
    severity: 'low',
    pattern: /console\.(log|debug|info)\(/,
    message: '存在调试用的 console 语句'
  },
  {
    id: 'console-warn',
    name: '警告日志',
    severity: 'low',
    pattern: /console\.warn\(/,
    message: '存在 console.warn 语句'
  },
  {
    id: 'any-type',
    name: 'any 类型',
    severity: 'medium',
    astChecker: isAnyTypeUsage,
    message: '使用了 any 类型'
  },
  {
    id: 'long-function',
    name: '过长函数',
    severity: 'medium',
    astChecker: isLongFunctionBody,
    message: '函数超过 100 行'
  },
  {
    id: 'deep-nesting',
    name: '过深嵌套',
    severity: 'medium',
    astChecker: isDeeplyNestedStatement,
    message: '嵌套深度超过 4 层'
  },
  {
    id: 'duplicate-code',
    name: '重复代码',
    severity: 'medium',
    // 注意：此规则通过 scanDuplicateCode 方法单独处理
    message: '发现重复代码块'
  }
];

// ============================================================================
// 配置
// ============================================================================

const CONFIG: ScanConfig = {
  srcDir: path.join(__dirname, '../src'),
  excludeDirs: ['node_modules', 'dist', 'build', '.git'],
  excludeFiles: ['.d.ts'],
  outputDir: path.join(__dirname, '../tests/quality'),
  rules: SCAN_RULES
};

// ============================================================================
// 扫描器类
// ============================================================================

class TechDebtScanner {
  private issues: TechDebtIssue[] = [];
  private totalFiles = 0;
  private totalLines = 0;
  private fileIssueCount: Map<string, number> = new Map();
  private readonly severityColors: Record<Severity, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#f59e0b',
    low: '#10b981'
  };
  private readonly severityIcons: Record<Severity, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '🟢'
  };
  private readonly htmlStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      padding: 2rem;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 { color: #111827; margin-bottom: 0.5rem; }
    .meta { color: #6b7280; font-size: 0.875rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .stat-label { color: #6b7280; font-size: 0.875rem; margin-bottom: 0.5rem; }
    .stat-value { font-size: 2rem; font-weight: bold; color: #111827; }
    .severity-badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
    }
    .issues {
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .issues-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .issue {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }
    .issue:last-child { border-bottom: none; }
    .issue-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .issue-message { font-weight: 500; color: #111827; }
    .issue-location { color: #6b7280; font-size: 0.875rem; }
    .issue-code {
      background: #f9fafb;
      padding: 0.75rem;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      overflow-x: auto;
    }
`;

  /**
   * 扫描目录
   */
  public scan(directory: string): void {
    this.scanDirectory(directory);
  }

  /**
   * 递归扫描目录
   */
  private scanDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      console.error(`目录不存在: ${dir}`);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // 跳过排除的目录
        if (CONFIG.excludeDirs.includes(entry.name)) {
          continue;
        }
        this.scanDirectory(fullPath);
      } else if (entry.isFile()) {
        // 只扫描 TypeScript 和 JavaScript 文件
        if (this.shouldScanFile(entry.name)) {
          this.scanFile(fullPath);
        }
      }
    }
  }

  /**
   * 判断是否应该扫描文件
   */
  private shouldScanFile(filename: string): boolean {
    // 跳过排除的文件类型
    for (const exclude of CONFIG.excludeFiles) {
      if (filename.endsWith(exclude)) {
        return false;
      }
    }

    // Unit/spec fixtures intentionally long and repetitive; ESLint covers tests separately.
    if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename)) {
      return false;
    }

    // 只扫描 .ts, .tsx, .js, .jsx 文件
    return /\.(ts|tsx|js|jsx)$/.test(filename);
  }

  /**
   * 扫描单个文件
   */
  private scanFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const relativePath = path.relative(path.join(__dirname, '..'), filePath);

      this.totalFiles++;
      this.totalLines += content.split('\n').length;

      // 基于正则表达式的扫描
      this.scanWithRegex(content, relativePath);

      // 基于 AST 的扫描（仅对 TypeScript 文件）
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        this.scanWithAST(content, relativePath);
      }

      // 扫描重复代码
      this.scanDuplicateCode(content, relativePath);
    } catch (error) {
      console.error(`扫描文件失败: ${filePath}`, error);
    }
  }

  /**
   * 使用正则表达式扫描
   */
  private scanWithRegex(content: string, filePath: string): void {
    const lines = content.split('\n');

    for (const rule of CONFIG.rules) {
      if (!rule.pattern) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = rule.pattern.exec(line);

        if (match) {
          this.addIssue({
            ruleId: rule.id,
            severity: rule.severity,
            message: rule.message,
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            code: line.trim()
          });
        }

        // 重置正则表达式的 lastIndex
        rule.pattern.lastIndex = 0;
      }
    }
  }

  /**
   * 使用 AST 扫描
   */
  private scanWithAST(content: string, filePath: string): void {
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const visit = (node: ts.Node): void => {
      for (const rule of CONFIG.rules) {
        if (rule.astChecker && rule.astChecker(node, sourceFile)) {
          const { line, character } = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile)
          );

          // 为过长函数规则添加额外的上下文信息
          let message = rule.message;
          let codePreview = node.getText(sourceFile).split('\n')[0].trim();

          if (rule.id === 'long-function') {
            const functionInfo = this.getFunctionInfo(node, sourceFile);
            message = `${functionInfo.type}${functionInfo.name ? ` '${functionInfo.name}'` : ''} 超过 100 行（实际: ${functionInfo.lines} 行）`;
            codePreview = functionInfo.signature;
          } else if (rule.id === 'deep-nesting') {
            // 为过深嵌套规则添加深度信息
            const nestingInfo = this.getNestingInfo(node, sourceFile);
            message = `${nestingInfo.statementType} 嵌套深度超过 4 层（实际: ${nestingInfo.depth} 层）`;
            codePreview = nestingInfo.preview;
          }

          this.addIssue({
            ruleId: rule.id,
            severity: rule.severity,
            message,
            file: filePath,
            line: line + 1,
            column: character + 1,
            code: codePreview
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  /**
   * 获取函数信息（名称、类型、行数）
   */
  private getFunctionInfo(node: ts.Node, sourceFile: ts.SourceFile): FunctionInfo {
    let info: FunctionInfo = { name: '', type: '', lines: 0, signature: '' };
    if (ts.isFunctionDeclaration(node)) {
      info = this.getFunctionDeclarationInfo(node, sourceFile);
    } else if (ts.isMethodDeclaration(node)) {
      info = this.getMethodDeclarationInfo(node, sourceFile);
    } else if (ts.isArrowFunction(node)) {
      info = this.getArrowFunctionInfo(node, sourceFile);
    } else if (ts.isFunctionExpression(node)) {
      info = this.getFunctionExpressionInfo(node, sourceFile);
    }

    return {
      ...info,
      signature: this.truncateSignature(info.signature)
    };
  }

  private getFunctionDeclarationInfo(
    node: ts.FunctionDeclaration,
    sourceFile: ts.SourceFile
  ): FunctionInfo {
    return {
      name: node.name?.getText(sourceFile) || '<匿名>',
      type: '函数',
      lines: this.countBlockLines(node.body, sourceFile),
      signature: this.getSignatureBeforeBody(node, node.body, sourceFile)
    };
  }

  private getMethodDeclarationInfo(
    node: ts.MethodDeclaration,
    sourceFile: ts.SourceFile
  ): FunctionInfo {
    return {
      name: node.name.getText(sourceFile),
      type: '方法',
      lines: this.countBlockLines(node.body, sourceFile),
      signature: this.getSignatureBeforeBody(node, node.body, sourceFile)
    };
  }

  private getArrowFunctionInfo(node: ts.ArrowFunction, sourceFile: ts.SourceFile): FunctionInfo {
    const signature = ts.isBlock(node.body)
      ? `${this.getSignatureBeforeBody(node, node.body, sourceFile)} => {`
      : node.getText(sourceFile).split('\n')[0].trim();

    return {
      name: this.getParentBoundName(node, sourceFile),
      type: '箭头函数',
      lines: ts.isBlock(node.body) ? this.countBlockLines(node.body, sourceFile) : 1,
      signature
    };
  }

  private getFunctionExpressionInfo(
    node: ts.FunctionExpression,
    sourceFile: ts.SourceFile
  ): FunctionInfo {
    return {
      name: node.name?.getText(sourceFile) || this.getParentBoundName(node, sourceFile),
      type: '函数表达式',
      lines: this.countBlockLines(node.body, sourceFile),
      signature: this.getSignatureBeforeBody(node, node.body, sourceFile)
    };
  }

  private getParentBoundName(node: ts.Node, sourceFile: ts.SourceFile): string {
    if (node.parent && ts.isVariableDeclaration(node.parent)) {
      return node.parent.name.getText(sourceFile);
    }
    if (node.parent && ts.isPropertyDeclaration(node.parent)) {
      return node.parent.name.getText(sourceFile);
    }
    return '';
  }

  private getSignatureBeforeBody(
    node: ts.Node,
    body: ts.Node | undefined,
    sourceFile: ts.SourceFile
  ): string {
    const bodyStart = body?.getStart(sourceFile) || node.getEnd();
    return sourceFile.text.substring(node.getStart(sourceFile), bodyStart).trim();
  }

  private countBlockLines(body: ts.Block | undefined, sourceFile: ts.SourceFile): number {
    return body ? this.countNonEmptyLines(body.getText(sourceFile)) : 0;
  }

  private countNonEmptyLines(text: string): number {
    return text.split('\n').filter(line => line.trim().length > 0).length;
  }

  private truncateSignature(signature: string): string {
    return signature.length > 120 ? `${signature.substring(0, 120)}...` : signature;
  }

  /**
   * 获取嵌套信息（语句类型、深度、代码预览）
   */
  private getNestingInfo(node: ts.Node, sourceFile: ts.SourceFile): {
    statementType: string;
    depth: number;
    preview: string;
  } {
    const fullText = node.getText(sourceFile);
    const firstLine = fullText.split('\n')[0].trim();

    return {
      statementType: getControlFlowName(node),
      depth: getControlFlowDepth(node),
      preview: firstLine.length > 100 ? `${firstLine.substring(0, 100)}...` : firstLine
    };
  }

  /**
   * 扫描重复代码
   * 使用滑动窗口算法检测重复代码块（> 10 行）
   */
  private scanDuplicateCode(content: string, filePath: string): void {
    const lines = content.split('\n');
    // Dual-path LLM option bags / Create field mirrors often share 10–15 lines of
    // intentional shape parity; flag only longer clones that are more likely accidental.
    const MIN_DUPLICATE_LINES = 20;
    
    // 预处理：标准化代码行（移除空白和注释）
    const normalizedLines = this.normalizeCodeLines(lines);
    
    // 存储代码块的哈希值和位置
    const blockMap = new Map<string, Array<{ line: number; originalCode: string }>>();
    
    // 使用滑动窗口提取代码块
    for (let i = 0; i <= normalizedLines.length - MIN_DUPLICATE_LINES; i++) {
      const block = normalizedLines.slice(i, i + MIN_DUPLICATE_LINES);
      
      // 跳过主要是空行的块
      const nonEmptyLines = block.filter(line => line.length > 0);
      if (nonEmptyLines.length < MIN_DUPLICATE_LINES * 0.5) {
        continue;
      }
      
      // 计算代码块的哈希值
      const blockHash = this.hashCodeBlock(block);
      
      // 获取原始代码（用于显示）
      const originalCode = lines.slice(i, i + MIN_DUPLICATE_LINES).join('\n');
      
      if (!blockMap.has(blockHash)) {
        blockMap.set(blockHash, []);
      }
      
      blockMap.get(blockHash)!.push({
        line: i + 1,
        originalCode
      });
    }
    
    // 找出重复的代码块
    const duplicateCandidates: DuplicateCandidate[] = [];
    for (const occurrences of blockMap.values()) {
      if (occurrences.length > 1) {
        // 只报告第一次出现的位置
        const firstOccurrence = occurrences[0];
        const codePreview = this.getCodePreview(firstOccurrence.originalCode);

        duplicateCandidates.push({
          occurrences: occurrences.map(occurrence => occurrence.line),
          blockLines: MIN_DUPLICATE_LINES,
          preview: codePreview
        });
      }
    }

    for (const candidate of dedupeDuplicateCandidates(duplicateCandidates)) {
      const firstLine = candidate.occurrences[0];
      if (firstLine !== undefined) {
        this.addIssue({
          ruleId: 'duplicate-code',
          severity: 'medium',
          message: `发现重复代码块（共 ${candidate.occurrences.length} 处，行数 ≥ ${candidate.blockLines}）`,
          file: filePath,
          line: firstLine,
          column: 1,
          code: candidate.preview
        });
      }
    }
  }
  
  /**
   * 标准化代码行
   * 移除空白字符、注释，保留代码结构
   */
  private normalizeCodeLines(lines: string[]): string[] {
    return lines.map(line => {
      let normalized = line.trim();
      
      // 移除单行注释
      normalized = normalized.replace(/\/\/.*$/, '');
      
      // 移除多余的空白
      normalized = normalized.replace(/\s+/g, ' ');
      
      return normalized;
    });
  }
  
  /**
   * 计算代码块的哈希值
   * 使用简单的字符串哈希算法
   */
  private hashCodeBlock(lines: string[]): string {
    const content = lines.join('\n');
    let hash = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return hash.toString(36);
  }
  
  /**
   * 获取代码预览（前3行）
   */
  private getCodePreview(code: string): string {
    const lines = code.split('\n').slice(0, 3);
    const preview = lines.join('\n');
    
    if (preview.length > 120) {
      return preview.substring(0, 120) + '...';
    }
    
    return preview + '\n...';
  }

  /**
   * 添加问题
   */
  private addIssue(issue: TechDebtIssue): void {
    this.issues.push(issue);

    // 更新文件问题计数
    const count = this.fileIssueCount.get(issue.file) || 0;
    this.fileIssueCount.set(issue.file, count + 1);
  }

  /**
   * 生成报告
   */
  public generateReport(): TechDebtReport {
    const bySeverity: Record<Severity, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    for (const issue of this.issues) {
      bySeverity[issue.severity]++;
    }

    const byFile: Record<string, number> = {};
    for (const [file, count] of this.fileIssueCount.entries()) {
      byFile[file] = count;
    }

    return {
      summary: {
        totalIssues: this.issues.length,
        bySeverity,
        byFile
      },
      issues: this.issues,
      metrics: {
        totalFiles: this.totalFiles,
        totalLines: this.totalLines,
        debtRatio: this.totalLines > 0 ? this.issues.length / this.totalLines : 0
      },
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * 保存 JSON 报告
   */
  public saveJSONReport(report: TechDebtReport, outputPath: string): void {
    const json = JSON.stringify(report, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
    console.log(`✅ JSON 报告已保存: ${outputPath}`);
  }

  /**
   * 保存 HTML 报告
   */
  public saveHTMLReport(report: TechDebtReport, outputPath: string): void {
    const html = this.generateHTML(report);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✅ HTML 报告已保存: ${outputPath}`);
  }

  /**
   * 生成 HTML 报告
   */
  private renderOverviewStats(report: TechDebtReport): string {
    return `
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">总问题数</div>
        <div class="stat-value">${report.summary.totalIssues}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">扫描文件数</div>
        <div class="stat-value">${report.metrics.totalFiles}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">总代码行数</div>
        <div class="stat-value">${report.metrics.totalLines.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">债务比率</div>
        <div class="stat-value">${(report.metrics.debtRatio * 100).toFixed(2)}%</div>
      </div>
    </div>
`;
  }

  private renderSeverityStats(report: TechDebtReport): string {
    return `
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">🔴 严重</div>
        <div class="stat-value" style="color: ${this.severityColors.critical}">${report.summary.bySeverity.critical}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🟠 高</div>
        <div class="stat-value" style="color: ${this.severityColors.high}">${report.summary.bySeverity.high}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🟡 中</div>
        <div class="stat-value" style="color: ${this.severityColors.medium}">${report.summary.bySeverity.medium}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">🟢 低</div>
        <div class="stat-value" style="color: ${this.severityColors.low}">${report.summary.bySeverity.low}</div>
      </div>
    </div>
`;
  }

  private renderIssue(issue: TechDebtIssue): string {
    return `
        <div class="issue">
          <div class="issue-header">
            <span class="severity-badge" style="background: ${this.severityColors[issue.severity]}">
              ${this.severityIcons[issue.severity]} ${issue.severity.toUpperCase()}
            </span>
            <span class="issue-message">${issue.message}</span>
          </div>
          <div class="issue-location">
            📁 ${issue.file} (行 ${issue.line}, 列 ${issue.column})
          </div>
          ${issue.code ? `<div class="issue-code">${this.escapeHtml(issue.code)}</div>` : ''}
        </div>
      `;
  }

  private renderIssueDetails(report: TechDebtReport): string {
    return `
    <div class="issues">
      <div class="issues-header">
        <h2>问题详情</h2>
      </div>
      ${report.issues.map(issue => this.renderIssue(issue)).join('')}
    </div>
`;
  }

  private generateHTML(report: TechDebtReport): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>技术债务扫描报告</title>
  <style>${this.htmlStyles}  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 技术债务扫描报告</h1>
      <div class="meta">生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}</div>
    </div>

${this.renderOverviewStats(report)}
${this.renderSeverityStats(report)}
${this.renderIssueDetails(report)}
  </div>
</body>
</html>`;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}

// ============================================================================
// 主函数
// ============================================================================

function main(): void {
  let failOnSeverity: FailOnSeverity;
  try {
    failOnSeverity = parseFailOnSeverity(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  console.log('🔍 开始扫描技术债务...\n');

  // 创建扫描器
  const scanner = new TechDebtScanner();

  // 扫描源代码目录
  scanner.scan(CONFIG.srcDir);

  // 生成报告
  const report = scanner.generateReport();

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // 保存报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const jsonPath = path.join(CONFIG.outputDir, `tech-debt-${timestamp}.json`);
  const htmlPath = path.join(CONFIG.outputDir, `tech-debt-${timestamp}.html`);

  scanner.saveJSONReport(report, jsonPath);
  scanner.saveHTMLReport(report, htmlPath);

  // 打印摘要
  console.log('\n📊 扫描完成！');
  console.log('=====================================');
  console.log(`总问题数: ${report.summary.totalIssues}`);
  console.log(`  🔴 严重: ${report.summary.bySeverity.critical}`);
  console.log(`  🟠 高: ${report.summary.bySeverity.high}`);
  console.log(`  🟡 中: ${report.summary.bySeverity.medium}`);
  console.log(`  🟢 低: ${report.summary.bySeverity.low}`);
  console.log(`扫描文件数: ${report.metrics.totalFiles}`);
  console.log(`总代码行数: ${report.metrics.totalLines.toLocaleString()}`);
  console.log(`债务比率: ${(report.metrics.debtRatio * 100).toFixed(2)}%`);
  console.log('=====================================\n');

  // 如果达到选定严重级别的问题存在，返回非零退出码
  if (shouldFailOnSeverity(report.summary.bySeverity, failOnSeverity)) {
    process.exitCode = 1;
  }
}

// 运行主函数
// 兼容 Windows 和 Unix 系统
const isMainModule = () => {
  if (typeof process.argv[1] === 'undefined') return false;

  try {
    const scriptPath = fs.realpathSync(fileURLToPath(import.meta.url));
    const argPath = fs.realpathSync(path.resolve(process.argv[1]));
    return scriptPath === argPath;
  } catch {
    return false;
  }
};

if (isMainModule()) {
  main();
}

export {
  dedupeDuplicateCandidates,
  shouldFailOnSeverity,
  TechDebtScanner,
  TechDebtReport,
  TechDebtIssue,
  ScanRule,
  DuplicateCandidate,
  Severity
};
