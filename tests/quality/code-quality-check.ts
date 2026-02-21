/**
 * 代码质量检查工具
 * 用于建立质量基线和持续监控
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface QualityMetrics {
  timestamp: string;
  eslint: {
    totalFiles: number;
    totalErrors: number;
    totalWarnings: number;
    errorsByRule: Record<string, number>;
  };
  typescript: {
    totalFiles: number;
    totalErrors: number;
    errorsByCategory: Record<string, number>;
  };
  codeStats: {
    totalFiles: number;
    totalLines: number;
    totalCodeLines: number;
    totalCommentLines: number;
    totalBlankLines: number;
    avgLinesPerFile: number;
  };
  complexity: {
    avgComplexity: number;
    maxComplexity: number;
    filesOverThreshold: number;
  };
}

class CodeQualityChecker {
  private srcDir = 'src';
  private outputDir = 'tests/quality/reports';

  constructor() {
    // 确保输出目录存在
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 运行完整的代码质量检查
   */
  async run(): Promise<QualityMetrics> {
    console.log('🔍 开始代码质量检查...\n');

    const metrics: QualityMetrics = {
      timestamp: new Date().toISOString(),
      eslint: await this.checkESLint(),
      typescript: await this.checkTypeScript(),
      codeStats: await this.analyzeCodeStats(),
      complexity: await this.analyzeComplexity(),
    };

    // 保存报告
    this.saveReport(metrics);
    this.printSummary(metrics);

    return metrics;
  }

  /**
   * 运行 ESLint 检查
   */
  private async checkESLint() {
    console.log('📋 运行 ESLint 检查...');

    try {
      // 运行 ESLint 并输出 JSON 格式
      const output = execSync(
        `npx eslint ${this.srcDir} --format json --max-warnings 999999`,
        { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      );

      const results = JSON.parse(output);
      
      let totalErrors = 0;
      let totalWarnings = 0;
      const errorsByRule: Record<string, number> = {};

      results.forEach((file: any) => {
        totalErrors += file.errorCount;
        totalWarnings += file.warningCount;

        file.messages.forEach((msg: any) => {
          if (msg.ruleId) {
            errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
          }
        });
      });

      console.log(`  ✓ 检查了 ${results.length} 个文件`);
      console.log(`  ✓ 发现 ${totalErrors} 个错误, ${totalWarnings} 个警告\n`);

      return {
        totalFiles: results.length,
        totalErrors,
        totalWarnings,
        errorsByRule,
      };
    } catch (error: any) {
      // ESLint 有错误时会抛出异常，但我们仍然可以解析输出
      if (error.stdout) {
        const results = JSON.parse(error.stdout);
        
        let totalErrors = 0;
        let totalWarnings = 0;
        const errorsByRule: Record<string, number> = {};

        results.forEach((file: any) => {
          totalErrors += file.errorCount;
          totalWarnings += file.warningCount;

          file.messages.forEach((msg: any) => {
            if (msg.ruleId) {
              errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
            }
          });
        });

        console.log(`  ✓ 检查了 ${results.length} 个文件`);
        console.log(`  ✓ 发现 ${totalErrors} 个错误, ${totalWarnings} 个警告\n`);

        return {
          totalFiles: results.length,
          totalErrors,
          totalWarnings,
          errorsByRule,
        };
      }

      console.log('  ⚠ ESLint 检查失败\n');
      return {
        totalFiles: 0,
        totalErrors: 0,
        totalWarnings: 0,
        errorsByRule: {},
      };
    }
  }

  /**
   * 运行 TypeScript 类型检查
   */
  private async checkTypeScript() {
    console.log('📋 运行 TypeScript 类型检查...');

    try {
      execSync('npx tsc --noEmit', { encoding: 'utf-8' });
      
      console.log('  ✓ 类型检查通过\n');

      return {
        totalFiles: 0,
        totalErrors: 0,
        errorsByCategory: {},
      };
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      const lines = output.split('\n').filter((line: string) => line.trim());
      
      // 解析错误信息
      const errors = lines.filter((line: string) => 
        line.includes('error TS')
      );

      const errorsByCategory: Record<string, number> = {};
      errors.forEach((error: string) => {
        const match = error.match(/error (TS\d+):/);
        if (match) {
          const code = match[1];
          errorsByCategory[code] = (errorsByCategory[code] || 0) + 1;
        }
      });

      // 统计文件数
      const files = new Set(
        errors.map((error: string) => {
          const match = error.match(/^(.+?)\(/);
          return match ? match[1] : '';
        }).filter(Boolean)
      );

      console.log(`  ✓ 检查了 ${files.size} 个文件`);
      console.log(`  ✓ 发现 ${errors.length} 个类型错误\n`);

      return {
        totalFiles: files.size,
        totalErrors: errors.length,
        errorsByCategory,
      };
    }
  }

  /**
   * 分析代码统计信息
   */
  private async analyzeCodeStats() {
    console.log('📊 分析代码统计信息...');

    const stats = {
      totalFiles: 0,
      totalLines: 0,
      totalCodeLines: 0,
      totalCommentLines: 0,
      totalBlankLines: 0,
      avgLinesPerFile: 0,
    };

    const files = this.getAllFiles(this.srcDir, ['.ts', '.js']);
    stats.totalFiles = files.length;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      
      stats.totalLines += lines.length;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed === '') {
          stats.totalBlankLines++;
        } else if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
          stats.totalCommentLines++;
        } else {
          stats.totalCodeLines++;
        }
      });
    });

    stats.avgLinesPerFile = Math.round(stats.totalLines / stats.totalFiles);

    console.log(`  ✓ 分析了 ${stats.totalFiles} 个文件`);
    console.log(`  ✓ 总行数: ${stats.totalLines} (代码: ${stats.totalCodeLines}, 注释: ${stats.totalCommentLines}, 空行: ${stats.totalBlankLines})`);
    console.log(`  ✓ 平均每文件: ${stats.avgLinesPerFile} 行\n`);

    return stats;
  }

  /**
   * 分析代码复杂度
   */
  private async analyzeComplexity() {
    console.log('📈 分析代码复杂度...');

    const complexities: number[] = [];
    const files = this.getAllFiles(this.srcDir, ['.ts', '.js']);
    let filesOverThreshold = 0;
    const threshold = 10;

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const complexity = this.calculateCyclomaticComplexity(content);
      complexities.push(complexity);

      if (complexity > threshold) {
        filesOverThreshold++;
      }
    });

    const avgComplexity = complexities.length > 0
      ? Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length * 10) / 10
      : 0;
    const maxComplexity = complexities.length > 0
      ? Math.max(...complexities)
      : 0;

    console.log(`  ✓ 平均复杂度: ${avgComplexity}`);
    console.log(`  ✓ 最大复杂度: ${maxComplexity}`);
    console.log(`  ✓ 超过阈值(${threshold})的文件: ${filesOverThreshold}\n`);

    return {
      avgComplexity,
      maxComplexity,
      filesOverThreshold,
    };
  }

  /**
   * 计算圈复杂度（简化版本）
   */
  private calculateCyclomaticComplexity(code: string): number {
    let complexity = 1; // 基础复杂度

    // 统计决策点
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\b\?\s*.*\s*:/g, // 三元运算符
      /&&/g,
      /\|\|/g,
    ];

    patterns.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * 递归获取所有文件
   */
  private getAllFiles(dir: string, extensions: string[]): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      return files;
    }

    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // 跳过 node_modules 等目录
        if (!['node_modules', 'dist', '.git'].includes(item)) {
          files.push(...this.getAllFiles(fullPath, extensions));
        }
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    });

    return files;
  }

  /**
   * 保存报告
   */
  private saveReport(metrics: QualityMetrics): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // 保存 JSON 报告
    const jsonPath = path.join(this.outputDir, `quality-baseline-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

    // 保存最新报告（用于对比）
    const latestPath = path.join(this.outputDir, 'quality-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(metrics, null, 2));

    console.log(`\n📄 报告已保存:`);
    console.log(`  - ${jsonPath}`);
    console.log(`  - ${latestPath}`);
  }

  /**
   * 打印摘要
   */
  private printSummary(metrics: QualityMetrics): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 代码质量基线报告');
    console.log('='.repeat(60));
    console.log(`\n生成时间: ${new Date(metrics.timestamp).toLocaleString('zh-CN')}\n`);

    console.log('ESLint 检查:');
    console.log(`  - 检查文件: ${metrics.eslint.totalFiles}`);
    console.log(`  - 错误数量: ${metrics.eslint.totalErrors}`);
    console.log(`  - 警告数量: ${metrics.eslint.totalWarnings}`);
    
    if (Object.keys(metrics.eslint.errorsByRule).length > 0) {
      console.log('  - Top 5 规则:');
      const topRules = Object.entries(metrics.eslint.errorsByRule)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      topRules.forEach(([rule, count]) => {
        console.log(`    • ${rule}: ${count}`);
      });
    }

    console.log('\nTypeScript 类型检查:');
    console.log(`  - 检查文件: ${metrics.typescript.totalFiles}`);
    console.log(`  - 类型错误: ${metrics.typescript.totalErrors}`);
    
    if (Object.keys(metrics.typescript.errorsByCategory).length > 0) {
      console.log('  - Top 5 错误类型:');
      const topErrors = Object.entries(metrics.typescript.errorsByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      topErrors.forEach(([code, count]) => {
        console.log(`    • ${code}: ${count}`);
      });
    }

    console.log('\n代码统计:');
    console.log(`  - 总文件数: ${metrics.codeStats.totalFiles}`);
    console.log(`  - 总行数: ${metrics.codeStats.totalLines}`);
    console.log(`  - 代码行数: ${metrics.codeStats.totalCodeLines}`);
    console.log(`  - 注释行数: ${metrics.codeStats.totalCommentLines}`);
    console.log(`  - 空行数: ${metrics.codeStats.totalBlankLines}`);
    console.log(`  - 平均每文件: ${metrics.codeStats.avgLinesPerFile} 行`);

    console.log('\n代码复杂度:');
    console.log(`  - 平均复杂度: ${metrics.complexity.avgComplexity}`);
    console.log(`  - 最大复杂度: ${metrics.complexity.maxComplexity}`);
    console.log(`  - 超过阈值(10)的文件: ${metrics.complexity.filesOverThreshold}`);

    console.log('\n' + '='.repeat(60));
  }
}

// 运行检查
const checker = new CodeQualityChecker();
checker.run().catch(console.error);
