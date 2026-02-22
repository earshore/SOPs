/**
 * 监控告警配置生成器
 * 生成监控和告警的配置文件
 */

import * as fs from 'fs';

interface MonitoringConfig {
  metrics: MetricConfig[];
  alerts: AlertConfig[];
  healthChecks: HealthCheck[];
}

interface MetricConfig {
  name: string;
  description: string;
  type: 'counter' | 'gauge' | 'histogram';
  unit?: string;
  labels?: string[];
}

interface AlertConfig {
  name: string;
  description: string;
  condition: string;
  severity: 'critical' | 'warning' | 'info';
  threshold: string;
  duration: string;
  actions: string[];
}

interface HealthCheck {
  name: string;
  endpoint: string;
  interval: string;
  timeout: string;
  expectedStatus: number;
}

class MonitoringConfigGenerator {
  generateConfig(): MonitoringConfig {
    return {
      metrics: this.getMetrics(),
      alerts: this.getAlerts(),
      healthChecks: this.getHealthChecks(),
    };
  }

  private getMetrics(): MetricConfig[] {
    return [
      {
        name: 'http_requests_total',
        description: 'HTTP 请求总数',
        type: 'counter',
        labels: ['method', 'path', 'status'],
      },
      {
        name: 'http_request_duration_seconds',
        description: 'HTTP 请求响应时间',
        type: 'histogram',
        unit: 'seconds',
        labels: ['method', 'path'],
      },
      {
        name: 'app_errors_total',
        description: '应用错误总数',
        type: 'counter',
        labels: ['type', 'severity'],
      },
      {
        name: 'app_memory_usage_bytes',
        description: '内存使用量',
        type: 'gauge',
        unit: 'bytes',
      },
      {
        name: 'app_cpu_usage_percent',
        description: 'CPU 使用率',
        type: 'gauge',
        unit: 'percent',
      },
      {
        name: 'page_load_time_seconds',
        description: '页面加载时间',
        type: 'histogram',
        unit: 'seconds',
        labels: ['page'],
      },
      {
        name: 'api_call_duration_seconds',
        description: 'API 调用时长',
        type: 'histogram',
        unit: 'seconds',
        labels: ['endpoint', 'status'],
      },
    ];
  }

  private getAlerts(): AlertConfig[] {
    return [
      {
        name: 'HighErrorRate',
        description: '错误率过高',
        condition: 'error_rate > threshold',
        severity: 'critical',
        threshold: '5%',
        duration: '5m',
        actions: [
          '发送邮件通知',
          '发送短信通知',
          '触发 PagerDuty',
        ],
      },
      {
        name: 'SlowResponseTime',
        description: '响应时间过慢',
        condition: 'p95_response_time > threshold',
        severity: 'warning',
        threshold: '2s',
        duration: '10m',
        actions: [
          '发送邮件通知',
          '记录到日志',
        ],
      },
      {
        name: 'HighMemoryUsage',
        description: '内存使用率过高',
        condition: 'memory_usage > threshold',
        severity: 'warning',
        threshold: '80%',
        duration: '15m',
        actions: [
          '发送邮件通知',
          '触发自动扩容',
        ],
      },
      {
        name: 'HighCPUUsage',
        description: 'CPU 使用率过高',
        condition: 'cpu_usage > threshold',
        severity: 'warning',
        threshold: '80%',
        duration: '15m',
        actions: [
          '发送邮件通知',
          '触发自动扩容',
        ],
      },
      {
        name: 'ServiceDown',
        description: '服务不可用',
        condition: 'health_check_failed',
        severity: 'critical',
        threshold: 'N/A',
        duration: '1m',
        actions: [
          '发送邮件通知',
          '发送短信通知',
          '触发 PagerDuty',
          '尝试自动重启',
        ],
      },
      {
        name: 'LowPerformanceScore',
        description: '性能评分过低',
        condition: 'lighthouse_score < threshold',
        severity: 'warning',
        threshold: '90',
        duration: '1h',
        actions: [
          '发送邮件通知',
          '创建 Issue',
        ],
      },
    ];
  }

  private getHealthChecks(): HealthCheck[] {
    return [
      {
        name: '应用健康检查',
        endpoint: '/health',
        interval: '30s',
        timeout: '5s',
        expectedStatus: 200,
      },
      {
        name: 'API 健康检查',
        endpoint: '/api/health',
        interval: '30s',
        timeout: '5s',
        expectedStatus: 200,
      },
      {
        name: '数据库连接检查',
        endpoint: '/health/db',
        interval: '1m',
        timeout: '10s',
        expectedStatus: 200,
      },
    ];
  }

  generateMarkdown(config: MonitoringConfig): string {
    let md = `# 监控告警配置\n\n`;
    md += `生成时间: ${new Date().toISOString()}\n\n`;

    md += `## 📊 监控指标\n\n`;
    md += `| 指标名称 | 描述 | 类型 | 单位 | 标签 |\n`;
    md += `|----------|------|------|------|------|\n`;
    for (const metric of config.metrics) {
      const labels = metric.labels?.join(', ') || '-';
      const unit = metric.unit || '-';
      md += `| ${metric.name} | ${metric.description} | ${metric.type} | ${unit} | ${labels} |\n`;
    }
    md += `\n`;

    md += `## 🚨 告警规则\n\n`;
    for (const alert of config.alerts) {
      const severityIcon = alert.severity === 'critical' ? '🔴' : 
                          alert.severity === 'warning' ? '🟡' : '🔵';
      
      md += `### ${severityIcon} ${alert.name}\n\n`;
      md += `- **描述**: ${alert.description}\n`;
      md += `- **严重程度**: ${alert.severity}\n`;
      md += `- **触发条件**: ${alert.condition}\n`;
      md += `- **阈值**: ${alert.threshold}\n`;
      md += `- **持续时间**: ${alert.duration}\n`;
      md += `- **响应动作**:\n`;
      for (const action of alert.actions) {
        md += `  - ${action}\n`;
      }
      md += `\n`;
    }

    md += `## 🏥 健康检查\n\n`;
    md += `| 名称 | 端点 | 间隔 | 超时 | 预期状态 |\n`;
    md += `|------|------|------|------|----------|\n`;
    for (const check of config.healthChecks) {
      md += `| ${check.name} | ${check.endpoint} | ${check.interval} | ${check.timeout} | ${check.expectedStatus} |\n`;
    }
    md += `\n`;

    md += `## 📝 实施建议\n\n`;
    md += `### 监控工具选择\n\n`;
    md += `- **Prometheus + Grafana**: 开源监控解决方案\n`;
    md += `- **Datadog**: 商业 SaaS 监控平台\n`;
    md += `- **New Relic**: 应用性能监控\n`;
    md += `- **Sentry**: 错误追踪和监控\n\n`;

    md += `### 告警渠道\n\n`;
    md += `- 邮件: 用于非紧急告警\n`;
    md += `- 短信: 用于严重告警\n`;
    md += `- Slack/钉钉: 团队协作通知\n`;
    md += `- PagerDuty: 值班轮换管理\n\n`;

    md += `### 最佳实践\n\n`;
    md += `1. 设置合理的告警阈值,避免告警疲劳\n`;
    md += `2. 为不同严重程度配置不同的通知渠道\n`;
    md += `3. 定期审查和调整告警规则\n`;
    md += `4. 建立告警响应流程和 Runbook\n`;
    md += `5. 监控告警系统本身的可用性\n`;

    return md;
  }

  generatePrometheusConfig(config: MonitoringConfig): string {
    let yaml = `# Prometheus 告警规则配置\n\n`;
    yaml += `groups:\n`;
    yaml += `  - name: application_alerts\n`;
    yaml += `    interval: 30s\n`;
    yaml += `    rules:\n`;

    for (const alert of config.alerts) {
      yaml += `      - alert: ${alert.name}\n`;
      yaml += `        expr: ${alert.condition}\n`;
      yaml += `        for: ${alert.duration}\n`;
      yaml += `        labels:\n`;
      yaml += `          severity: ${alert.severity}\n`;
      yaml += `        annotations:\n`;
      yaml += `          summary: "${alert.description}"\n`;
      yaml += `          description: "阈值: ${alert.threshold}"\n`;
      yaml += `\n`;
    }

    return yaml;
  }

  generateGrafanaDashboard(config: MonitoringConfig): string {
    const dashboard = {
      title: '应用监控仪表板',
      timezone: 'browser',
      panels: config.metrics.map((metric, index) => ({
        id: index + 1,
        title: metric.description,
        type: metric.type === 'counter' ? 'graph' : 'gauge',
        targets: [
          {
            expr: metric.name,
            legendFormat: metric.labels?.join(' - ') || '',
          },
        ],
        gridPos: {
          x: (index % 2) * 12,
          y: Math.floor(index / 2) * 8,
          w: 12,
          h: 8,
        },
      })),
    };

    return JSON.stringify(dashboard, null, 2);
  }
}

function main() {
  console.log('📊 生成监控告警配置...\n');

  const generator = new MonitoringConfigGenerator();
  const config = generator.generateConfig();

  const markdown = generator.generateMarkdown(config);
  const prometheus = generator.generatePrometheusConfig(config);
  const grafana = generator.generateGrafanaDashboard(config);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `monitoring-config-${timestamp}.md`;
  const prometheusPath = `prometheus-alerts-${timestamp}.yml`;
  const grafanaPath = `grafana-dashboard-${timestamp}.json`;

  fs.writeFileSync(mdPath, markdown);
  fs.writeFileSync(prometheusPath, prometheus);
  fs.writeFileSync(grafanaPath, grafana);

  console.log(`✅ 监控配置文档已生成: ${mdPath}`);
  console.log(`✅ Prometheus 配置已生成: ${prometheusPath}`);
  console.log(`✅ Grafana 仪表板已生成: ${grafanaPath}\n`);

  console.log('💡 提示: 请根据实际监控系统调整配置');
}

main();
