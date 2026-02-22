/**
 * 性能分析工具
 * 分析应用性能指标和瓶颈
 */

import * as fs from 'fs';
import { glob } from 'glob';

interface PerformanceMetrics {
  pageLoadTime: number[];
  apiResponseTime: Record<string, number[]>;
  memoryUsage: number[];
  cpuUsage: number[];
  resourceSize: Record<string, number>;
}

interface PerformanceAnalysis {
  pageLoad: MetricSummary;
  apiPerformance: Record<string, MetricSummary>;
  resourceAnalysis: ResourceAnalysis;
  bottlenecks: Bottleneck[];
  recommendations: string[];
}

interface MetricSummary {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface ResourceAnalysis {
  totalSize: number;
  largeResources: Array<{ name: string; size: number }>;
  cacheableResources: string[];
}

interface Bottleneck {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  impact: string;
}

class PerformanceAnalyzer {
  private metrics: PerformanceMetrics = {
    pageLoadTime: [],
    apiResponseTime: {},
    memoryUsage: [],
    cpuUsage: [],
    resourceSize: {},
  };

  async loadMetrics(): Promise<void> {
    // 从 Lighthouse 报告加载性能数据
    const lighthouseFiles = await glob('.lighthouseci/lhr-*.json');
    
    for (const file of lighthouseFiles) {
      try {
        const report = JSON.parse(fs.readFileSync(file, 'utf-8'));
        
        // 提取页面加载时间
        const lcp = report.audits?.['largest-contentful-paint']?.numericValue;
        if (lcp) {
          this.metrics.pageLoadTime.push(lcp / 1000); // 转换为秒
        }

        // 提取资源大小
        const resources = report.audits?.['resource-summary']?.details?.items || [];
        for (const resource of resources) {
          const type = resource.resourceType;
          const size = resource.transferSize || 0;
          this.metrics.resourceSize[type] = (this.metrics.resourceSize[type] || 0) + size;
        }
      } catch (error) {
        console.warn(`解析文件失败: ${file}`);
      }
    }

    // 从性能测试报告加载数据
    const perfFiles = await glob('performance-*.json');
    
    for (const file of perfFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        
        if (data.metrics) {
          if (data.metrics.memory) {
            this.metrics.memoryUsage.push(data.metrics.memory);
          }
          if (data.metrics.cpu) {
            this.metrics.cpuUsage.push(data.metrics.cpu);
          }
        }
      } catch (error) {
        console.warn(`解析文件失败: ${file}`);
      }
    }
  }

  analyze(): PerformanceAnalysis {
    const pageLoad = this.calculateSummary(this.metrics.pageLoadTime);
    
    const apiPerformance: Record<string, MetricSummary> = {};
    for (const [endpoint, times] of Object.entries(this.metrics.apiResponseTime)) {
      apiPerformance[endpoint] = this.calculateSummary(times);
    }

    const resourceAnalysis = this.analyzeResources();
    const bottlenecks = this.identifyBottlenecks(pageLoad, resourceAnalysis);
    const recommendations = this.generateRecommendations(bottlenecks);

    return {
      pageLoad,
      apiPerformance,
      resourceAnalysis,
      bottlenecks,
      recommendations,
    };
  }

  private calculateSummary(values: number[]): MetricSummary {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private analyzeResources(): ResourceAnalysis {
    const totalSize = Object.values(this.metrics.resourceSize).reduce((a, b) => a + b, 0);
    
    const largeResources = Object.entries(this.metrics.resourceSize)
      .map(([name, size]) => ({ name, size }))
      .filter(r => r.size > 500 * 1024) // > 500KB
      .sort((a, b) => b.size - a.size);

    const cacheableResources = Object.keys(this.metrics.resourceSize).filter(
      name => name.includes('js') || name.includes('css') || name.includes('image')
    );

    return {
      totalSize,
      largeResources,
      cacheableResources,
    };
  }

  private identifyBottlenecks(
    pageLoad: MetricSummary,
    resources: ResourceAnalysis
  ): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // 检查页面加载时间
    if (pageLoad.p95 > 3) {
      bottlenecks.push({
        type: '页面加载慢',
        description: `P95 页面加载时间为 ${pageLoad.p95.toFixed(2)}s,超过 3s 阈值`,
        severity: 'high',
        impact: '用户体验差,可能导致用户流失',
      });
    }

    // 检查资源大小
    if (resources.totalSize > 5 * 1024 * 1024) {
      bottlenecks.push({
        type: '资源过大',
        description: `总资源大小为 ${(resources.totalSize / 1024 / 1024).toFixed(2)}MB,超过 5MB`,
        severity: 'medium',
        impact: '增加加载时间,消耗用户流量',
      });
    }

    // 检查大文件
    if (resources.largeResources.length > 0) {
      bottlenecks.push({
        type: '存在大文件',
        description: `发现 ${resources.largeResources.length} 个超过 500KB 的资源`,
        severity: 'medium',
        impact: '影响首屏加载速度',
      });
    }

    // 检查内存使用
    if (this.metrics.memoryUsage.length > 0) {
      const avgMemory = this.metrics.memoryUsage.reduce((a, b) => a + b, 0) / this.metrics.memoryUsage.length;
      if (avgMemory > 100 * 1024 * 1024) {
        bottlenecks.push({
          type: '内存占用高',
          description: `平均内存使用 ${(avgMemory / 1024 / 1024).toFixed(2)}MB,超过 100MB`,
          severity: 'low',
          impact: '可能导致低端设备卡顿',
        });
      }
    }

    return bottlenecks;
  }

  private generateRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations: string[] = [];

    for (const bottleneck of bottlenecks) {
      switch (bottleneck.type) {
        case '页面加载慢':
          recommendations.push('优化关键渲染路径');
          recommendations.push('使用代码分割减少初始加载');
          recommendations.push('启用 HTTP/2 服务器推送');
          break;
        case '资源过大':
          recommendations.push('压缩图片和视频资源');
          recommendations.push('使用 WebP 格式图片');
          recommendations.push('启用 Gzip/Brotli 压缩');
          break;
        case '存在大文件':
          recommendations.push('拆分大文件为多个小文件');
          recommendations.push('使用懒加载延迟加载非关键资源');
          recommendations.push('考虑使用 CDN 加速');
          break;
        case '内存占用高':
          recommendations.push('检查内存泄漏');
          recommendations.push('优化数据结构和算法');
          recommendations.push('及时清理不用的对象');
          break;
      }
    }

    return [...new Set(recommendations)]; // 去重
  }

  generateReport(analysis: PerformanceAnalysis): string {
    let report = `# 性能分析报告\n\n`;
    report += `生成时间: ${new Date().toISOString()}\n\n`;

    report += `## 📊 页面加载性能\n\n`;
    report += `| 指标 | 值 |\n`;
    report += `|------|----|\n`;
    report += `| 最小值 | ${analysis.pageLoad.min.toFixed(2)}s |\n`;
    report += `| 平均值 | ${analysis.pageLoad.avg.toFixed(2)}s |\n`;
    report += `| P50 | ${analysis.pageLoad.p50.toFixed(2)}s |\n`;
    report += `| P95 | ${analysis.pageLoad.p95.toFixed(2)}s |\n`;
    report += `| P99 | ${analysis.pageLoad.p99.toFixed(2)}s |\n`;
    report += `| 最大值 | ${analysis.pageLoad.max.toFixed(2)}s |\n\n`;

    if (analysis.pageLoad.p95 <= 2.5) {
      report += `✅ 页面加载性能良好\n\n`;
    } else if (analysis.pageLoad.p95 <= 4) {
      report += `⚠️ 页面加载性能一般,建议优化\n\n`;
    } else {
      report += `❌ 页面加载性能差,需要立即优化\n\n`;
    }

    report += `## 📦 资源分析\n\n`;
    report += `- 总资源大小: ${(analysis.resourceAnalysis.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- 大文件数量: ${analysis.resourceAnalysis.largeResources.length}\n`;
    report += `- 可缓存资源: ${analysis.resourceAnalysis.cacheableResources.length}\n\n`;

    if (analysis.resourceAnalysis.largeResources.length > 0) {
      report += `### 大文件列表\n\n`;
      report += `| 资源 | 大小 |\n`;
      report += `|------|------|\n`;
      for (const resource of analysis.resourceAnalysis.largeResources.slice(0, 10)) {
        report += `| ${resource.name} | ${(resource.size / 1024).toFixed(2)}KB |\n`;
      }
      report += `\n`;
    }

    if (analysis.bottlenecks.length > 0) {
      report += `## 🔍 性能瓶颈\n\n`;
      for (const bottleneck of analysis.bottlenecks) {
        const icon = bottleneck.severity === 'high' ? '🔴' : 
                    bottleneck.severity === 'medium' ? '🟡' : '🔵';
        report += `### ${icon} ${bottleneck.type}\n\n`;
        report += `- **描述**: ${bottleneck.description}\n`;
        report += `- **影响**: ${bottleneck.impact}\n\n`;
      }
    }

    if (analysis.recommendations.length > 0) {
      report += `## 💡 优化建议\n\n`;
      for (let i = 0; i < analysis.recommendations.length; i++) {
        report += `${i + 1}. ${analysis.recommendations[i]}\n`;
      }
      report += `\n`;
    }

    return report;
  }
}

async function main() {
  console.log('📊 分析应用性能...\n');

  const analyzer = new PerformanceAnalyzer();
  await analyzer.loadMetrics();

  const analysis = analyzer.analyze();

  console.log(`页面加载 P95: ${analysis.pageLoad.p95.toFixed(2)}s`);
  console.log(`资源总大小: ${(analysis.resourceAnalysis.totalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`发现 ${analysis.bottlenecks.length} 个性能瓶颈\n`);

  const report = analyzer.generateReport(analysis);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const reportPath = `performance-analysis-${timestamp}.md`;

  fs.writeFileSync(reportPath, report);

  console.log(`✅ 性能分析报告已生成: ${reportPath}`);
}

main();
