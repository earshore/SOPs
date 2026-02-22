/**
 * ESLint 错误修复工具
 * 自动修复可修复的 ESLint 错误
 */

import { execSync } from 'child_process';
import * as fs from 'fs';

interface FixResult {
  totalErrors: number;
  totalWarnings: number;
  fixedErrors: number;
  remainingErrors: number;
  files: string[];
}

class ESLintFixer {
  async fix(dryRun: boolean = false): Promise<FixResult> {
    console.log('🔍 运行 ESLint 检查...\n');

    // 先运行检查获取错误数量
    const beforeResult = this.runESLint(false);
    
    console.log(`发现 ${beforeResult.totalErrors} 个错误和 ${beforeResult.totalWarnings} 个警告\n`);

    if (beforeResult.totalErrors === 0) {
      console.log('✅ 没有发现 ESLint 错误\n');
      return {
        totalErrors: 0,
        totalWarnings: beforeResult.totalWarnings,
        fixedErrors: 0,
        remainingErrors: 0,
        files: [],
      };
    }

    if (dryRun) {
      console.log('🔍 Dry-run 模式: 仅显示可修复的错误\n');
      this.runESLint(true, true);
      
      return {
        totalErrors: beforeResult.totalErrors,
        totalWarnings: beforeResult.totalWarnings,
        fixedErrors: 0,
        remainingErrors: beforeResult.totalErrors,
        files: [],
      };
    }

    console.log('🔧 开始自动修复...\n');
    
    // 运行自动修复
    this.runESLint(true);

    // 再次检查获取剩余错误
    const afterResult = this.runESLint(false);

    const fixedErrors = beforeResult.totalErrors - afterResult.totalErrors;

    console.log(`\n✅ 修复完成!`);
    console.log(`修复了 ${fixedErrors} 个错误`);
    console.log(`剩余 ${afterResult.totalErrors} 个错误需要手动修复\n`);

    return {
      totalErrors: beforeResult.totalErrors,
      totalWarnings: beforeResult.totalWarnings,
      fixedErrors,
      remainingErrors: afterResult.totalErrors,
      files: [],
    };
  }

  private runESLint(fix: boolean = false, dryRun: boolean = false): {
    totalErrors: number;
    totalWarnings: number;
  } {
    try {
      const fixFlag = fix ? (dryRun ? '--fix-dry-run' : '--fix') : '';
      const cmd = `npx eslint src ${fixFlag} --format json`;
      
      const output = execSync(cmd, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const results = JSON.parse(output);
      return this.parseResults(results);
    } catch (error: any) {
      // ESLint 在有错误时会返回非零退出码
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          return this.parseResults(results);
        } catch {
          // 解析失败
        }
      }
      
      return { totalErrors: 0, totalWarnings: 0 };
    }
  }

  private parseResults(results: any[]): {
    totalErrors: number;
    totalWarnings: number;
  } {
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const result of results) {
      totalErrors += result.errorCount || 0;
      totalWarnings += result.warningCount || 0;
    }

    return { totalErrors, totalWarnings };
  }

  generateReport(result: FixResult): string {
    const timestamp = new Date().toISOString();
    
    let report = `# ESLint 修复报告\n\n`;
    report += `生成时间: ${timestamp}\n\n`;
    report += `## 概览\n\n`;
    report += `- 总错误数: ${result.totalErrors}\n`;
    report += `- 总警告数: ${result.totalWarnings}\n`;
    report += `- 已修复错误: ${result.fixedErrors}\n`;
    report += `- 剩余错误: ${result.remainingErrors}\n`;
    report += `- 修复率: ${result.totalErrors > 0 ? Math.round((result.fixedErrors / result.totalErrors) * 100) : 0}%\n\n`;

    if (result.remainingErrors > 0) {
      report += `## ⚠️ 剩余错误\n\n`;
      report += `还有 ${result.remainingErrors} 个错误需要手动修复。\n\n`;
      report += `运行以下命令查看详细信息:\n`;
      report += `\`\`\`bash\n`;
      report += `npm run lint\n`;
      report += `\`\`\`\n\n`;
    } else {
      report += `## ✅ 所有错误已修复\n\n`;
    }

    report += `## 建议\n\n`;
    report += `1. 审查自动修复的代码,确保逻辑正确\n`;
    report += `2. 手动修复剩余的错误\n`;
    report += `3. 配置 Git hooks 在提交前运行 ESLint\n`;
    report += `4. 在 CI/CD 中集成 ESLint 检查\n`;

    return report;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('🔧 ESLint 自动修复工具\n');

  if (dryRun) {
    console.log('⚠️  Dry-run 模式: 不会实际修改文件\n');
  }

  const fixer = new ESLintFixer();
  const result = await fixer.fix(dryRun);

  if (!dryRun) {
    const report = fixer.generateReport(result);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const reportPath = `eslint-fix-report-${timestamp}.md`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`📄 报告已生成: ${reportPath}\n`);
  }
}

main().catch(console.error);
