/**
 * 应用崩溃监控工具
 * 监控和分析应用崩溃情况
 */

import * as fs from 'fs';
import * as path from 'path';

interface CrashReport {
  timestamp: string;
  errorType: string;
  errorMessage: string;
  stackTrace: string;
  userAgent?: string;
  url?: string;
  userId?: string;
}

interface CrashAnalysis {
  totalCrashes: number;
  crashRate: number;
  topErrors: ErrorSummary[];
  affectedUsers: number;
  timeDistribution: Record<string, number>;
}

interface ErrorSummary {
  type: string;
  count: number;
  percentage: number;
  lastOccurrence: string;
}

class CrashMonitor {
  private crashes: CrashReport[] = [];

  loadCrashReports(logDir: string): void {
    // 从日志目录加载崩溃报告
    if (!fs.existsSync(logDir)) {
      console.log('日志目录不存在');
      return;
    }

    const files = fs.readdirSync(logDir);
    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(logDir, file), 'utf-8');
        try {
          const logs = JSON.parse(content);
          if (Array.isArray(logs)) {
            this.crashes.push(...logs);
          }
        } catch {
          // 解析失败,跳过
        }
      }
    }
  }

  analyze(): CrashAnalysis {
    const totalCrashes = this.crashes.length;
    const totalSessions = this.estimateTotalSessions();
    const crashRate = totalSessions > 0 ? (totalCrashes / totalSessions) * 100 : 0;

    // 统计错误类型
    const errorCounts = new Map<string, { count: number; lastOccurrence: string }>();
    for (const crash of this.crashes) {
      const current = errorCounts.get(crash.errorType) || { count: 0, lastOccurrence: '' };
      current.count++;
      if (!current.lastOccurrence || crash.timestamp > current.lastOccurrence) {
        current.lastOccurrence = crash.timestamp;
      }
      errorCounts.set(crash.errorType, current);
    }

    const topErrors: ErrorSummary[] = Array.from(errorCounts.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        percentage: (data.count / totalCrashes) * 100,
        lastOccurrence: data.lastOccurrence,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 统计受影响用户
    const affectedUsers = new Set(
      this.crashes.filter(c => c.userId).map(c => c.userId)
    ).size;

    // 时间分布
    const timeDistribution: Record<string, number> = {};
    for (const crash of this.crashes) {
      const hour = new Date(crash.timestamp).getHours();
      timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
    }

    return {
      totalCrashes,
      crashRate,
      topErrors,
      affectedUsers,
      timeDistribution,
    };
  }

  private estimateTotalSessions(): number {
    // 简单估算:假设每个用户平均 10 个会话
    const uniqueUsers = new Set(
      this.crashes.filter(c => c.userId).map(c => c.userId)
    ).size;
    return uniqueUsers * 10;
  }

  generateReport(analysis: CrashAnalysis): string {
    let report = `# 应用崩溃监控报告\n\n`;
    report += `生成时间: ${new Date().toISOString()}\n\n`;

    report += `## 📊 概览\n\n`;
    report += `- 总崩溃次数: ${analysis.totalCrashes}\n`;
    report += `- 崩溃率: ${analysis.crashRate.toFixed(2)}%\n`;
    report += `- 受影响用户: ${analysis.affectedUsers}\n\n`;

    if (analysis.crashRate > 1) {
      report += `⚠️ **警告**: 崩溃率超过 1%,需要立即处理!\n\n`;
    }

    report += `## 🔝 Top 10 错误类型\n\n`;
    report += `| 排名 | 错误类型 | 次数 | 占比 | 最后发生 |\n`;
    report += `|------|----------|------|------|----------|\n`;
    for (let i = 0; i < analysis.topErrors.length; i++) {
      const error = analysis.topErrors[i];
      report += `| ${i + 1} | ${error.type} | ${error.count} | ${error.percentage.toFixed(1)}% | ${error.lastOccurrence} |\n`;
    }
    report += `\n`;

    report += `## ⏰ 时间分布\n\n`;
    report += `崩溃按小时分布:\n\n`;
    for (let hour = 0; hour < 24; hour++) {
      const count = analysis.timeDistribution[hour] || 0;
      const bar = '█'.repeat(Math.ceil(count / 5));
      report += `${hour.toString().padStart(2, '0')}:00 | ${bar} ${count}\n`;
    }
    report += `\n`;

    report += `## 💡 建议\n\n`;
    report += `1. 优先修复出现频率最高的错误\n`;
    report += `2. 为高频错误添加更详细的日志\n`;
    report += `3. 实施错误边界(Error Boundary)防止应用崩溃\n`;
    report += `4. 添加用户友好的错误提示\n`;
    report += `5. 定期审查和修复崩溃问题\n`;

    return report;
  }

  generateAlertConfig(analysis: CrashAnalysis): string {
    let config = `# 崩溃监控告警配置\n\n`;
    config += `## 告警规则\n\n`;

    config += `### 1. 崩溃率告警\n\n`;
    config += `- **条件**: 崩溃率 > 1%\n`;
    config += `- **严重程度**: Critical\n`;
    config += `- **当前值**: ${analysis.crashRate.toFixed(2)}%\n`;
    config += `- **动作**: 立即通知开发团队\n\n`;

    config += `### 2. 单一错误频率告警\n\n`;
    config += `- **条件**: 单个错误类型出现次数 > 100\n`;
    config += `- **严重程度**: Warning\n`;
    config += `- **动作**: 创建 Issue 跟踪\n\n`;

    if (analysis.topErrors.length > 0) {
      config += `### 当前需要关注的错误\n\n`;
      for (const error of analysis.topErrors.slice(0, 3)) {
        if (error.count > 10) {
          config += `- **${error.type}**: ${error.count} 次 (${error.percentage.toFixed(1)}%)\n`;
        }
      }
    }

    return config;
  }
}

function main() {
  console.log('📊 分析应用崩溃情况...\n');

  const monitor = new CrashMonitor();
  
  // 从日志目录加载崩溃报告
  // 实际使用时需要指定正确的日志目录
  const logDir = process.argv[2] || './logs';
  monitor.loadCrashReports(logDir);

  const analysis = monitor.analyze();

  console.log(`总崩溃次数: ${analysis.totalCrashes}`);
  console.log(`崩溃率: ${analysis.crashRate.toFixed(2)}%`);
  console.log(`受影响用户: ${analysis.affectedUsers}\n`);

  const report = monitor.generateReport(analysis);
  const alertConfig = monitor.generateAlertConfig(analysis);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportPath = `crash-report-${timestamp}.md`;
  const alertPath = `crash-alerts-${timestamp}.md`;

  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(alertPath, alertConfig);

  console.log(`✅ 崩溃报告已生成: ${reportPath}`);
  console.log(`✅ 告警配置已生成: ${alertPath}`);
}

main();
