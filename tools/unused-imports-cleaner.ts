/**
 * 未使用导入清理工具
 * 扫描 TypeScript 文件中未使用的导入并生成报告
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

interface UnusedImport {
  file: string;
  line: number;
  importName: string;
  importPath: string;
  type: 'named' | 'default' | 'namespace';
}

interface ScanResult {
  totalFiles: number;
  filesWithUnusedImports: number;
  unusedImports: UnusedImport[];
  summary: {
    byType: Record<string, number>;
    byDirectory: Record<string, number>;
  };
}

class UnusedImportsCleaner {
  private unusedImports: UnusedImport[] = [];
  private filesScanned = 0;
  private excludePatterns = [
    /node_modules/,
    /dist/,
    /coverage/,
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /\.d\.ts$/,
  ];

  private readonly htmlStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #333; margin-bottom: 10px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .summary-card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
    .summary-card .value { font-size: 32px; font-weight: bold; color: #e74c3c; }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section h2 { color: #333; margin-bottom: 15px; font-size: 18px; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #666;
    }
    tr:hover { background: #f8f9fa; }
    .type-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .type-named { background: #e3f2fd; color: #1976d2; }
    .type-default { background: #f3e5f5; color: #7b1fa2; }
    .type-namespace { background: #fff3e0; color: #f57c00; }
    .file-path { font-family: 'Courier New', monospace; font-size: 13px; color: #666; }
    .import-name { font-family: 'Courier New', monospace; font-weight: 600; color: #e74c3c; }
`;

  /**
   * 扫描目录中的所有 TypeScript 文件
   */
  async scan(rootDir: string): Promise<ScanResult> {
    console.log(`开始扫描目录: ${rootDir}`);
    this.unusedImports = [];
    this.filesScanned = 0;

    await this.scanDirectory(rootDir);

    return this.generateReport();
  }

  /**
   * 递归扫描目录
   */
  private async scanDirectory(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!this.shouldExclude(fullPath)) {
          await this.scanDirectory(fullPath);
        }
      } else if (entry.isFile() && this.isTypeScriptFile(entry.name)) {
        if (!this.shouldExclude(fullPath)) {
          await this.scanFile(fullPath);
        }
      }
    }
  }

  /**
   * 扫描单个文件
   */
  private async scanFile(filePath: string): Promise<void> {
    this.filesScanned++;
    
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
    );

    const imports = this.extractImports(sourceFile);
    const usedIdentifiers = this.extractUsedIdentifiers(sourceFile);

    for (const imp of imports) {
      if (!usedIdentifiers.has(imp.importName)) {
        this.unusedImports.push({
          file: filePath,
          line: this.getLineNumber(sourceFile, imp.node),
          importName: imp.importName,
          importPath: imp.importPath,
          type: imp.type,
        });
      }
    }
  }

  /**
   * 提取文件中的所有导入
   */
  private extractImports(sourceFile: ts.SourceFile): Array<{
    importName: string;
    importPath: string;
    type: 'named' | 'default' | 'namespace';
    node: ts.Node;
  }> {
    const imports: Array<{
      importName: string;
      importPath: string;
      type: 'named' | 'default' | 'namespace';
      node: ts.Node;
    }> = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          const importPath = moduleSpecifier.text;
          const importClause = node.importClause;

          if (importClause) {
            // Default import: import Foo from 'foo'
            if (importClause.name) {
              imports.push({
                importName: importClause.name.text,
                importPath,
                type: 'default',
                node,
              });
            }

            // Named imports: import { Bar, Baz } from 'foo'
            if (importClause.namedBindings) {
              if (ts.isNamedImports(importClause.namedBindings)) {
                for (const element of importClause.namedBindings.elements) {
                  imports.push({
                    importName: element.name.text,
                    importPath,
                    type: 'named',
                    node,
                  });
                }
              }
              // Namespace import: import * as Foo from 'foo'
              else if (ts.isNamespaceImport(importClause.namedBindings)) {
                imports.push({
                  importName: importClause.namedBindings.name.text,
                  importPath,
                  type: 'namespace',
                  node,
                });
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * 提取文件中使用的所有标识符
   */
  private extractUsedIdentifiers(sourceFile: ts.SourceFile): Set<string> {
    const usedIdentifiers = new Set<string>();
    let inImportDeclaration = false;

    const visit = (node: ts.Node) => {
      // 跳过导入声明本身
      if (ts.isImportDeclaration(node)) {
        inImportDeclaration = true;
        ts.forEachChild(node, visit);
        inImportDeclaration = false;
        return;
      }

      // 收集标识符
      if (!inImportDeclaration && ts.isIdentifier(node)) {
        usedIdentifiers.add(node.text);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return usedIdentifiers;
  }

  /**
   * 获取节点的行号
   */
  private getLineNumber(sourceFile: ts.SourceFile, node: ts.Node): number {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    return line + 1;
  }

  /**
   * 判断是否应该排除该路径
   */
  private shouldExclude(filePath: string): boolean {
    return this.excludePatterns.some(pattern => pattern.test(filePath));
  }

  /**
   * 判断是否为 TypeScript 文件
   */
  private isTypeScriptFile(filename: string): boolean {
    return /\.(ts|tsx)$/.test(filename);
  }

  /**
   * 生成扫描报告
   */
  private generateReport(): ScanResult {
    const byType: Record<string, number> = {
      named: 0,
      default: 0,
      namespace: 0,
    };

    const byDirectory: Record<string, number> = {};

    for (const imp of this.unusedImports) {
      byType[imp.type]++;

      const dir = path.dirname(imp.file);
      byDirectory[dir] = (byDirectory[dir] || 0) + 1;
    }

    const filesWithUnusedImports = new Set(
      this.unusedImports.map(imp => imp.file)
    ).size;

    return {
      totalFiles: this.filesScanned,
      filesWithUnusedImports,
      unusedImports: this.unusedImports,
      summary: {
        byType,
        byDirectory,
      },
    };
  }

  /**
   * 生成 HTML 报告
   */
  private renderSummaryCards(result: ScanResult): string {
    return `
    <div class="summary">
      <div class="summary-card">
        <h3>扫描文件数</h3>
        <div class="value">${result.totalFiles}</div>
      </div>
      <div class="summary-card">
        <h3>包含未使用导入的文件</h3>
        <div class="value">${result.filesWithUnusedImports}</div>
      </div>
      <div class="summary-card">
        <h3>未使用导入总数</h3>
        <div class="value">${result.unusedImports.length}</div>
      </div>
    </div>
`;
  }

  private renderTypeSummary(result: ScanResult): string {
    return `
    <div class="section">
      <h2>📊 按类型统计</h2>
      <table>
        <thead>
          <tr>
            <th>导入类型</th>
            <th>数量</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="type-badge type-named">Named Import</span></td>
            <td>${result.summary.byType.named}</td>
          </tr>
          <tr>
            <td><span class="type-badge type-default">Default Import</span></td>
            <td>${result.summary.byType.default}</td>
          </tr>
          <tr>
            <td><span class="type-badge type-namespace">Namespace Import</span></td>
            <td>${result.summary.byType.namespace}</td>
          </tr>
        </tbody>
      </table>
    </div>
`;
  }

  private renderDirectoryRows(result: ScanResult): string {
    return Object.entries(result.summary.byDirectory)
      .sort((a, b) => b[1] - a[1])
      .map(([dir, count]) => `
              <tr>
                <td class="file-path">${dir}</td>
                <td>${count}</td>
              </tr>
            `)
      .join('');
  }

  private renderDirectorySummary(result: ScanResult): string {
    return `
    <div class="section">
      <h2>📁 按目录统计</h2>
      <table>
        <thead>
          <tr>
            <th>目录</th>
            <th>未使用导入数</th>
          </tr>
        </thead>
        <tbody>
          ${this.renderDirectoryRows(result)}
        </tbody>
      </table>
    </div>
`;
  }

  private renderUnusedImportRows(result: ScanResult): string {
    return result.unusedImports.map(imp => `
            <tr>
              <td class="file-path">${imp.file}</td>
              <td>${imp.line}</td>
              <td class="import-name">${imp.importName}</td>
              <td class="file-path">${imp.importPath}</td>
              <td><span class="type-badge type-${imp.type}">${imp.type}</span></td>
            </tr>
          `).join('');
  }

  private renderUnusedImportDetails(result: ScanResult): string {
    return `
    <div class="section">
      <h2>📝 详细列表</h2>
      <table>
        <thead>
          <tr>
            <th>文件</th>
            <th>行号</th>
            <th>导入名称</th>
            <th>导入路径</th>
            <th>类型</th>
          </tr>
        </thead>
        <tbody>
          ${this.renderUnusedImportRows(result)}
        </tbody>
      </table>
    </div>
`;
  }

  generateHTMLReport(result: ScanResult, outputPath: string): void {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>未使用导入扫描报告</title>
  <style>${this.htmlStyles}  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 未使用导入扫描报告</h1>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>

${this.renderSummaryCards(result)}
${this.renderTypeSummary(result)}
${this.renderDirectorySummary(result)}
${this.renderUnusedImportDetails(result)}
  </div>
</body>
</html>
    `.trim();

    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`\n✅ HTML 报告已生成: ${outputPath}`);
  }

  /**
   * 生成 JSON 报告
   */
  generateJSONReport(result: ScanResult, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`✅ JSON 报告已生成: ${outputPath}`);
  }
}

// 主函数
async function main() {
  const cleaner = new UnusedImportsCleaner();
  const rootDir = process.cwd();

  console.log('🚀 开始扫描未使用的导入...\n');

  const result = await cleaner.scan(rootDir);

  console.log('\n📊 扫描结果:');
  console.log(`  - 扫描文件数: ${result.totalFiles}`);
  console.log(`  - 包含未使用导入的文件: ${result.filesWithUnusedImports}`);
  console.log(`  - 未使用导入总数: ${result.unusedImports.length}`);
  console.log('\n按类型统计:');
  console.log(`  - Named Import: ${result.summary.byType.named}`);
  console.log(`  - Default Import: ${result.summary.byType.default}`);
  console.log(`  - Namespace Import: ${result.summary.byType.namespace}`);

  // 生成报告
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const htmlPath = path.join(rootDir, `unused-imports-report-${timestamp}.html`);
  const jsonPath = path.join(rootDir, `unused-imports-report-${timestamp}.json`);

  cleaner.generateHTMLReport(result, htmlPath);
  cleaner.generateJSONReport(result, jsonPath);

  console.log('\n✨ 扫描完成！');
}

main().catch(console.error);
