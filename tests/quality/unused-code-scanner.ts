// tests/quality/unused-code-scanner.ts
// ================================================================
// 未使用代码扫描工具
// 扫描项目中未使用的变量、函数、导入等
// ================================================================

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface UnusedItem {
  file: string;
  line: number;
  column: number;
  name: string;
  type: 'variable' | 'function' | 'parameter' | 'import' | 'class' | 'interface' | 'type';
  severity: 'warning' | 'error';
}

interface ScanResult {
  totalFiles: number;
  totalIssues: number;
  byType: Record<string, number>;
  items: UnusedItem[];
}

class UnusedCodeScanner {
  private program: ts.Program;
  private checker: ts.TypeChecker;
  private unusedItems: UnusedItem[] = [];

  constructor(configPath: string) {
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configPath)
    );

    this.program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
    this.checker = this.program.getTypeChecker();
  }

  scan(): ScanResult {
    this.unusedItems = [];

    for (const sourceFile of this.program.getSourceFiles()) {
      // 跳过 node_modules 和声明文件
      if (sourceFile.fileName.includes('node_modules') || sourceFile.isDeclarationFile) {
        continue;
      }

      this.scanFile(sourceFile);
    }

    return this.generateReport();
  }

  private scanFile(sourceFile: ts.SourceFile): void {
    const visit = (node: ts.Node) => {
      // 检查未使用的变量
      if (ts.isVariableDeclaration(node)) {
        this.checkUnusedVariable(node, sourceFile);
      }

      // 检查未使用的函数
      if (ts.isFunctionDeclaration(node)) {
        this.checkUnusedFunction(node, sourceFile);
      }

      // 检查未使用的参数
      if (ts.isParameter(node)) {
        this.checkUnusedParameter(node, sourceFile);
      }

      // 检查未使用的导入
      if (ts.isImportDeclaration(node)) {
        this.checkUnusedImport(node, sourceFile);
      }

      // 检查未使用的类
      if (ts.isClassDeclaration(node)) {
        this.checkUnusedClass(node, sourceFile);
      }

      // 检查未使用的接口
      if (ts.isInterfaceDeclaration(node)) {
        this.checkUnusedInterface(node, sourceFile);
      }

      // 检查未使用的类型别名
      if (ts.isTypeAliasDeclaration(node)) {
        this.checkUnusedTypeAlias(node, sourceFile);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  private checkUnusedVariable(node: ts.VariableDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.name || !ts.isIdentifier(node.name)) return;

    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (!symbol) return;

    // 检查是否被使用
    const references = this.findReferences(symbol, sourceFile);
    
    // 如果只有声明处的引用，说明未使用
    if (references.length <= 1) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      this.unusedItems.push({
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1,
        name: node.name.text,
        type: 'variable',
        severity: 'warning'
      });
    }
  }

  private checkUnusedFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.name) return;

    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (!symbol) return;

    // 导出的函数不算未使用
    if (this.isExported(node)) return;

    const references = this.findReferences(symbol, sourceFile);
    
    if (references.length <= 1) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      this.unusedItems.push({
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1,
        name: node.name.text,
        type: 'function',
        severity: 'warning'
      });
    }
  }

  private checkUnusedParameter(node: ts.ParameterNode, sourceFile: ts.SourceFile): void {
    if (!ts.isIdentifier(node.name)) return;

    // 跳过以 _ 开头的参数（约定俗成的未使用标记）
    if (node.name.text.startsWith('_')) return;

    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (!symbol) return;

    const references = this.findReferences(symbol, sourceFile);
    
    if (references.length <= 1) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      this.unusedItems.push({
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1,
        name: node.name.text,
        type: 'parameter',
        severity: 'warning'
      });
    }
  }

  private checkUnusedImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.importClause) return;

    const { name, namedBindings } = node.importClause;

    // 检查默认导入
    if (name) {
      const symbol = this.checker.getSymbolAtLocation(name);
      if (symbol) {
        const references = this.findReferences(symbol, sourceFile);
        if (references.length <= 1) {
          const pos = sourceFile.getLineAndCharacterOfPosition(name.getStart());
          this.unusedItems.push({
            file: sourceFile.fileName,
            line: pos.line + 1,
            column: pos.character + 1,
            name: name.text,
            type: 'import',
            severity: 'warning'
          });
        }
      }
    }

    // 检查命名导入
    if (namedBindings && ts.isNamedImports(namedBindings)) {
      for (const element of namedBindings.elements) {
        const symbol = this.checker.getSymbolAtLocation(element.name);
        if (symbol) {
          const references = this.findReferences(symbol, sourceFile);
          if (references.length <= 1) {
            const pos = sourceFile.getLineAndCharacterOfPosition(element.getStart());
            this.unusedItems.push({
              file: sourceFile.fileName,
              line: pos.line + 1,
              column: pos.character + 1,
              name: element.name.text,
              type: 'import',
              severity: 'warning'
            });
          }
        }
      }
    }
  }

  private checkUnusedClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): void {
    if (!node.name) return;

    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (!symbol) return;

    // 导出的类不算未使用
    if (this.isExported(node)) return;

    const references = this.findReferences(symbol, sourceFile);
    
    if (references.length <= 1) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      this.unusedItems.push({
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1,
        name: node.name.text,
        type: 'class',
        severity: 'warning'
      });
    }
  }

  private checkUnusedInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): void {
    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (!symbol) return;

    // 导出的接口不算未使用
    if (this.isExported(node)) return;

    const references = this.findReferences(symbol, sourceFile);
    
    if (references.length <= 1) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      this.unusedItems.push({
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1,
        name: node.name.text,
        type: 'interface',
        severity: 'warning'
      });
    }
  }

  private checkUnusedTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): void {
    const symbol = this.checker.getSymbolAtLocation(node.name);
    if (!symbol) return;

    // 导出的类型不算未使用
    if (this.isExported(node)) return;

    const references = this.findReferences(symbol, sourceFile);
    
    if (references.length <= 1) {
      const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      this.unusedItems.push({
        file: sourceFile.fileName,
        line: pos.line + 1,
        column: pos.character + 1,
        name: node.name.text,
        type: 'type',
        severity: 'warning'
      });
    }
  }

  private findReferences(symbol: ts.Symbol, sourceFile: ts.SourceFile): ts.ReferenceEntry[] {
    const references: ts.ReferenceEntry[] = [];
    
    for (const file of this.program.getSourceFiles()) {
      const fileReferences = ts.FindAllReferences.findReferencedSymbols(
        this.checker,
        undefined as any,
        file,
        0
      );

      if (fileReferences) {
        for (const ref of fileReferences) {
          if (ref.definition.kind === ts.ScriptElementKind.alias) {
            references.push(...ref.references);
          }
        }
      }
    }

    return references;
  }

  private isExported(node: ts.Node): boolean {
    return (
      node.modifiers?.some(
        (mod) =>
          mod.kind === ts.SyntaxKind.ExportKeyword ||
          mod.kind === ts.SyntaxKind.DefaultKeyword
      ) ?? false
    );
  }

  private generateReport(): ScanResult {
    const byType: Record<string, number> = {};

    for (const item of this.unusedItems) {
      byType[item.type] = (byType[item.type] || 0) + 1;
    }

    return {
      totalFiles: this.program.getSourceFiles().filter(
        (sf) => !sf.fileName.includes('node_modules') && !sf.isDeclarationFile
      ).length,
      totalIssues: this.unusedItems.length,
      byType,
      items: this.unusedItems
    };
  }

  private renderReportStyles(): string {
    return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
    .stat { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
    .stat-label { font-size: 14px; color: #666; margin-bottom: 5px; }
    .stat-value { font-size: 28px; font-weight: bold; color: #333; }
    .section { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h2 { color: #333; margin-bottom: 15px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #666; font-size: 14px; }
    td { font-size: 14px; }
    .type-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .type-variable { background: #e3f2fd; color: #1976d2; }
    .type-function { background: #f3e5f5; color: #7b1fa2; }
    .type-parameter { background: #fff3e0; color: #f57c00; }
    .type-import { background: #e8f5e9; color: #388e3c; }
    .type-class { background: #fce4ec; color: #c2185b; }
    .type-interface { background: #e0f2f1; color: #00796b; }
    .type-type { background: #f1f8e9; color: #689f38; }
    .file-path { font-family: 'Courier New', monospace; font-size: 13px; color: #666; }
    .location { font-family: 'Courier New', monospace; font-size: 12px; color: #999; }
    .severity-warning { color: #ff9800; }
    .severity-error { color: #f44336; }
    .filter-bar { margin-bottom: 15px; display: flex; gap: 10px; flex-wrap: wrap; }
    .filter-btn { padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .filter-btn.active { background: #007bff; color: white; border-color: #007bff; }
    .filter-btn:hover { background: #f8f9fa; }
    .filter-btn.active:hover { background: #0056b3; }
`;
  }

  private renderSummaryStats(result: ScanResult): string {
    return `
        <div class="stat">
          <div class="stat-label">扫描文件数</div>
          <div class="stat-value">${result.totalFiles}</div>
        </div>
        <div class="stat">
          <div class="stat-label">未使用项总数</div>
          <div class="stat-value">${result.totalIssues}</div>
        </div>
        ${Object.entries(result.byType)
          .map(
            ([type, count]) => `
        <div class="stat">
          <div class="stat-label">${this.getTypeLabel(type)}</div>
          <div class="stat-value">${count}</div>
        </div>
        `
          )
          .join('')}`;
  }

  private renderFilterButtons(result: ScanResult): string {
    return `
        <button class="filter-btn active" onclick="filterByType('all')">全部</button>
        ${Object.keys(result.byType)
          .map(
            (type) => `
        <button class="filter-btn" onclick="filterByType('${type}')">${this.getTypeLabel(type)} (${result.byType[type]})</button>
        `
          )
          .join('')}`;
  }

  private renderIssueRows(result: ScanResult): string {
    return result.items
      .map(
        (item) => `
          <tr data-type="${item.type}">
            <td><span class="type-badge type-${item.type}">${this.getTypeLabel(item.type)}</span></td>
            <td><code>${item.name}</code></td>
            <td class="file-path">${this.getRelativePath(item.file)}</td>
            <td class="location">${item.line}:${item.column}</td>
            <td class="severity-${item.severity}">${item.severity === 'warning' ? '⚠️ 警告' : '❌ 错误'}</td>
          </tr>
          `
      )
      .join('');
  }

  private renderFilterScript(): string {
    return `
    function filterByType(type) {
      const rows = document.querySelectorAll('#issuesTable tbody tr');
      const buttons = document.querySelectorAll('.filter-btn');
      
      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');
      
      rows.forEach(row => {
        if (type === 'all' || row.dataset.type === type) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }
`;
  }

  generateHTMLReport(result: ScanResult, outputPath: string): void {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>未使用代码扫描报告</title>
  <style>
${this.renderReportStyles()}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 未使用代码扫描报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>

      <div class="summary">
${this.renderSummaryStats(result)}
      </div>
    </div>

    <div class="section">
      <h2>未使用代码详情</h2>

      <div class="filter-bar">
${this.renderFilterButtons(result)}
      </div>

      <table id="issuesTable">
        <thead>
          <tr>
            <th>类型</th>
            <th>名称</th>
            <th>文件</th>
            <th>位置</th>
            <th>严重程度</th>
          </tr>
        </thead>
        <tbody>
${this.renderIssueRows(result)}
        </tbody>
      </table>
    </div>
  </div>

  <script>
${this.renderFilterScript()}
  </script>
</body>
</html>
    `;

    fs.writeFileSync(outputPath, html, 'utf-8');
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      variable: '变量',
      function: '函数',
      parameter: '参数',
      import: '导入',
      class: '类',
      interface: '接口',
      type: '类型'
    };
    return labels[type] || type;
  }

  private getRelativePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  }
}

// 主函数
async function main() {
  console.log('🔍 开始扫描未使用的代码...\n');

  const scanner = new UnusedCodeScanner('tsconfig.json');
  const result = scanner.scan();

  console.log('📊 扫描结果:');
  console.log(`  - 扫描文件数: ${result.totalFiles}`);
  console.log(`  - 未使用项总数: ${result.totalIssues}`);
  console.log('\n按类型统计:');
  
  for (const [type, count] of Object.entries(result.byType)) {
    console.log(`  - ${scanner['getTypeLabel'](type)}: ${count}`);
  }

  // 生成 JSON 报告
  const jsonPath = 'tests/quality/unused-code-report.json';
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n✅ JSON 报告已生成: ${jsonPath}`);

  // 生成 HTML 报告
  const htmlPath = 'tests/quality/unused-code-report.html';
  scanner.generateHTMLReport(result, htmlPath);
  console.log(`✅ HTML 报告已生成: ${htmlPath}`);

  // 如果有未使用的代码，返回非零退出码
  if (result.totalIssues > 0) {
    console.log(`\n⚠️ 发现 ${result.totalIssues} 个未使用的代码项`);
    process.exit(1);
  } else {
    console.log('\n✅ 没有发现未使用的代码');
    process.exit(0);
  }
}

// 直接执行
main().catch((error) => {
  console.error('❌ 扫描失败:', error);
  process.exit(1);
});

export { UnusedCodeScanner, UnusedItem, ScanResult };
