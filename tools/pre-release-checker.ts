/**
 * 上线前检查工具
 * 验证所有上线前的必要条件
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  details?: string[];
}

interface PreReleaseReport {
  timestamp: string;
  allPassed: boolean;
  checks: CheckResult[];
  blockers: string[];
  warnings: string[];
}

class PreReleaseChecker {
  private results: CheckResult[] = [];

  async runAllChecks(): Promise<PreReleaseReport> {
    console.log('🔍 开始上线前检查...\n');

    await this.checkTests();
    await this.checkTypeScript();
    await this.checkLint();
    await this.checkBuild();
    await this.checkSecurity();
    await this.checkPerformance();
    await this.checkDocumentation();
    await this.checkDependencies();

    const blockers = this.results
      .filter(r => !r.passed && this.isCritical(r.name))
      .map(r => r.name);

    const warnings = this.results
      .filter(r => !r.passed && !this.isCritical(r.name))
      .map(r => r.name);

    const allPassed = blockers.length === 0;

    return {
      timestamp: new Date().toISOString(),
      allPassed,
      checks: this.results,
      blockers,
      warnings,
    };
  }

  private isCritical(checkName: string): boolean {
    const critical = [
      '单元测试',
      'TypeScript 编译',
      '构建测试',
      '严重安全漏洞',
    ];
    return critical.some(c => checkName.includes(c));
  }

  private async checkTests(): Promise<void> {
    console.log('📋 检查测试...');
    
    try {
      execSync('npm run test:coverage', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      // 检查覆盖率
      if (fs.existsSync('coverage/coverage-summary.json')) {
        const coverage = JSON.parse(
          fs.readFileSync('coverage/coverage-summary.json', 'utf-8')
        );
        const lines = coverage.total.lines.pct;
        const statements = coverage.total.statements.pct;

        if (lines >= 60 && statements >= 60) {
          this.results.push({
            name: '单元测试',
            passed: true,
            message: `测试通过,覆盖率: ${lines}%`,
          });
        } else {
          this.results.push({
            name: '单元测试',
            passed: false,
            message: `覆盖率不足: ${lines}% (要求 >= 60%)`,
          });
        }
      } else {
        this.results.push({
          name: '单元测试',
          passed: true,
          message: '测试通过',
        });
      }
    } catch (error) {
      this.results.push({
        name: '单元测试',
        passed: false,
        message: '测试失败',
        details: [String(error)],
      });
    }
  }

  private async checkTypeScript(): Promise<void> {
    console.log('📋 检查 TypeScript 编译...');
    
    try {
      execSync('npm run type-check', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      this.results.push({
        name: 'TypeScript 编译',
        passed: true,
        message: '类型检查通过',
      });
    } catch (error) {
      this.results.push({
        name: 'TypeScript 编译',
        passed: false,
        message: '类型检查失败',
        details: [String(error)],
      });
    }
  }

  private async checkLint(): Promise<void> {
    console.log('📋 检查代码规范...');
    
    try {
      execSync('npm run lint', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      this.results.push({
        name: 'ESLint 检查',
        passed: true,
        message: '代码规范检查通过',
      });
    } catch (error) {
      this.results.push({
        name: 'ESLint 检查',
        passed: false,
        message: '存在代码规范问题',
        details: ['运行 npm run lint 查看详情'],
      });
    }
  }

  private async checkBuild(): Promise<void> {
    console.log('📋 检查构建...');
    
    try {
      execSync('npm run build', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      // 检查构建产物
      if (fs.existsSync('dist/index.html')) {
        this.results.push({
          name: '构建测试',
          passed: true,
          message: '构建成功',
        });
      } else {
        this.results.push({
          name: '构建测试',
          passed: false,
          message: '构建产物不完整',
        });
      }
    } catch (error) {
      this.results.push({
        name: '构建测试',
        passed: false,
        message: '构建失败',
        details: [String(error)],
      });
    }
  }

  private async checkSecurity(): Promise<void> {
    console.log('📋 检查安全漏洞...');
    
    try {
      const output = execSync('npm audit --json', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      const audit = JSON.parse(output);
      const critical = audit.metadata?.vulnerabilities?.critical || 0;
      const high = audit.metadata?.vulnerabilities?.high || 0;

      if (critical === 0 && high === 0) {
        this.results.push({
          name: '安全审计',
          passed: true,
          message: '未发现严重或高危漏洞',
        });
      } else {
        this.results.push({
          name: '严重安全漏洞',
          passed: false,
          message: `发现 ${critical} 个严重漏洞, ${high} 个高危漏洞`,
          details: ['运行 npm audit 查看详情'],
        });
      }
    } catch (error) {
      // npm audit 在有漏洞时会返回非零退出码
      this.results.push({
        name: '安全审计',
        passed: false,
        message: '存在安全漏洞',
        details: ['运行 npm audit 查看详情'],
      });
    }
  }

  private async checkPerformance(): Promise<void> {
    console.log('📋 检查性能指标...');
    
    // 检查是否有性能测试报告
    const perfReports = [
      '.lighthouseci/lhr-*.json',
      'performance-*.json',
    ];

    let hasReports = false;
    for (const pattern of perfReports) {
      const files = this.glob(pattern);
      if (files.length > 0) {
        hasReports = true;
        break;
      }
    }

    if (hasReports) {
      this.results.push({
        name: '性能测试',
        passed: true,
        message: '性能测试报告已生成',
        details: ['建议审查性能指标是否达标'],
      });
    } else {
      this.results.push({
        name: '性能测试',
        passed: false,
        message: '未找到性能测试报告',
        details: ['运行 npm run test:performance 生成报告'],
      });
    }
  }

  private async checkDocumentation(): Promise<void> {
    console.log('📋 检查文档...');
    
    const requiredDocs = [
      'README.md',
      'docs/best-practices.md',
      'docs/troubleshooting-guide.md',
    ];

    const missing: string[] = [];
    for (const doc of requiredDocs) {
      if (!fs.existsSync(doc)) {
        missing.push(doc);
      }
    }

    if (missing.length === 0) {
      this.results.push({
        name: '文档完整性',
        passed: true,
        message: '必要文档齐全',
      });
    } else {
      this.results.push({
        name: '文档完整性',
        passed: false,
        message: '缺少必要文档',
        details: missing,
      });
    }
  }

  private async checkDependencies(): Promise<void> {
    console.log('📋 检查依赖...');
    
    try {
      const output = execSync('npm outdated --json', { 
        stdio: 'pipe',
        encoding: 'utf-8'
      });

      const outdated = JSON.parse(output || '{}');
      const count = Object.keys(outdated).length;

      if (count === 0) {
        this.results.push({
          name: '依赖更新',
          passed: true,
          message: '所有依赖都是最新的',
        });
      } else {
        this.results.push({
          name: '依赖更新',
          passed: true,
          message: `有 ${count} 个依赖可以更新`,
          details: ['建议在上线后更新依赖'],
        });
      }
    } catch (error) {
      // npm outdated 在有过期依赖时返回非零退出码
      this.results.push({
        name: '依赖更新',
        passed: true,
        message: '存在可更新的依赖',
        details: ['运行 npm outdated 查看详情'],
      });
    }
  }

  private glob(pattern: string): string[] {
    // 简单的文件匹配实现
    const dir = path.dirname(pattern);
    const filePattern = path.basename(pattern);
    
    if (!fs.existsSync(dir)) {
      return [];
    }

    const files = fs.readdirSync(dir);
    const regex = new RegExp(
      filePattern.replace(/\*/g, '.*').replace(/\?/g, '.')
    );

    return files
      .filter(f => regex.test(f))
      .map(f => path.join(dir, f));
  }

  generateReport(report: PreReleaseReport): string {
    let output = `# 上线前检查报告\n\n`;
    output += `生成时间: ${report.timestamp}\n\n`;
    output += `## 总体状态\n\n`;
    
    if (report.allPassed) {
      output += `✅ **所有关键检查通过,可以上线**\n\n`;
    } else {
      output += `❌ **存在阻塞问题,不建议上线**\n\n`;
    }

    if (report.blockers.length > 0) {
      output += `### 🔴 阻塞问题\n\n`;
      for (const blocker of report.blockers) {
        output += `- ${blocker}\n`;
      }
      output += `\n`;
    }

    if (report.warnings.length > 0) {
      output += `### ⚠️ 警告\n\n`;
      for (const warning of report.warnings) {
        output += `- ${warning}\n`;
      }
      output += `\n`;
    }

    output += `## 详细检查结果\n\n`;
    
    for (const check of report.checks) {
      const icon = check.passed ? '✅' : '❌';
      output += `### ${icon} ${check.name}\n\n`;
      output += `${check.message}\n\n`;
      
      if (check.details && check.details.length > 0) {
        output += `**详情:**\n\n`;
        for (const detail of check.details) {
          output += `- ${detail}\n`;
        }
        output += `\n`;
      }
    }

    output += `## 建议\n\n`;
    
    if (report.allPassed) {
      output += `1. 确认所有团队成员已审查代码\n`;
      output += `2. 准备回滚方案\n`;
      output += `3. 通知相关人员上线时间\n`;
      output += `4. 准备监控和告警\n`;
      output += `5. 执行灰度发布\n`;
    } else {
      output += `1. 修复所有阻塞问题\n`;
      output += `2. 重新运行检查\n`;
      output += `3. 确保所有测试通过\n`;
      output += `4. 修复后再考虑上线\n`;
    }

    return output;
  }

  generateHtmlReport(report: PreReleaseReport): string {
    const statusColor = report.allPassed ? '#4caf50' : '#f44336';
    const statusText = report.allPassed ? '可以上线' : '不建议上线';

    let html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>上线前检查报告</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
    }
    .status {
      background: ${statusColor};
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 30px;
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .check-item {
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
      border-left: 4px solid #ddd;
    }
    .check-item.passed {
      background: #e8f5e9;
      border-left-color: #4caf50;
    }
    .check-item.failed {
      background: #ffebee;
      border-left-color: #f44336;
    }
    .check-name {
      font-weight: bold;
      font-size: 18px;
      margin-bottom: 5px;
    }
    .check-message {
      color: #666;
    }
    .details {
      margin-top: 10px;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
      font-size: 14px;
    }
    .blockers {
      background: #ffebee;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #f44336;
      margin-bottom: 20px;
    }
    .warnings {
      background: #fff3e0;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ff9800;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 上线前检查报告</h1>
    <p>生成时间: ${report.timestamp}</p>
  </div>

  <div class="status">
    ${report.allPassed ? '✅' : '❌'} ${statusText}
  </div>
`;

    if (report.blockers.length > 0) {
      html += `
  <div class="blockers">
    <h3>🔴 阻塞问题</h3>
    <ul>
`;
      for (const blocker of report.blockers) {
        html += `      <li>${blocker}</li>\n`;
      }
      html += `    </ul>
  </div>
`;
    }

    if (report.warnings.length > 0) {
      html += `
  <div class="warnings">
    <h3>⚠️ 警告</h3>
    <ul>
`;
      for (const warning of report.warnings) {
        html += `      <li>${warning}</li>\n`;
      }
      html += `    </ul>
  </div>
`;
    }

    html += `
  <div class="section">
    <h2>详细检查结果</h2>
`;

    for (const check of report.checks) {
      const statusClass = check.passed ? 'passed' : 'failed';
      const icon = check.passed ? '✅' : '❌';

      html += `
    <div class="check-item ${statusClass}">
      <div class="check-name">${icon} ${check.name}</div>
      <div class="check-message">${check.message}</div>
`;

      if (check.details && check.details.length > 0) {
        html += `
      <div class="details">
        <strong>详情:</strong>
        <ul>
`;
        for (const detail of check.details) {
          html += `          <li>${detail}</li>\n`;
        }
        html += `        </ul>
      </div>
`;
      }

      html += `    </div>\n`;
    }

    html += `
  </div>
</body>
</html>`;

    return html;
  }
}

async function main() {
  const checker = new PreReleaseChecker();
  const report = await checker.runAllChecks();

  console.log('\n📊 检查完成!\n');

  if (report.allPassed) {
    console.log('✅ 所有关键检查通过,可以上线\n');
  } else {
    console.log('❌ 存在阻塞问题,不建议上线\n');
    console.log('阻塞问题:');
    for (const blocker of report.blockers) {
      console.log(`  - ${blocker}`);
    }
    console.log('');
  }

  // 生成报告
  const mdReport = checker.generateReport(report);
  const htmlReport = checker.generateHtmlReport(report);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `pre-release-check-${timestamp}.md`;
  const htmlPath = `pre-release-check-${timestamp}.html`;

  fs.writeFileSync(mdPath, mdReport);
  fs.writeFileSync(htmlPath, htmlReport);

  console.log(`✅ Markdown 报告已生成: ${mdPath}`);
  console.log(`✅ HTML 报告已生成: ${htmlPath}`);

  // 如果有阻塞问题,返回非零退出码
  if (!report.allPassed) {
    process.exit(1);
  }
}

main().catch(console.error);
