/**
 * 灰度发布计划生成器
 * 生成详细的灰度发布策略和执行计划
 */

import * as fs from 'fs';

interface CanaryPlan {
  version: string;
  timestamp: string;
  stages: DeploymentStage[];
  rollbackTriggers: RollbackTrigger[];
  metrics: string[];
}

interface DeploymentStage {
  stage: number;
  name: string;
  trafficPercentage: number;
  duration: string;
  successCriteria: string[];
  actions: string[];
}

interface RollbackTrigger {
  metric: string;
  threshold: string;
  action: string;
}

class CanaryDeploymentPlanGenerator {
  private version: string;

  constructor() {
    this.version = this.getCurrentVersion();
  }

  private getCurrentVersion(): string {
    try {
      const packageJson = JSON.parse(
        fs.readFileSync('package.json', 'utf-8')
      );
      return packageJson.version || '1.0.0';
    } catch {
      return '1.0.0';
    }
  }

  generatePlan(): CanaryPlan {
    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      stages: this.getDeploymentStages(),
      rollbackTriggers: this.getRollbackTriggers(),
      metrics: this.getMonitoringMetrics(),
    };
  }

  private getDeploymentStages(): DeploymentStage[] {
    return [
      {
        stage: 1,
        name: '内部测试',
        trafficPercentage: 0,
        duration: '30 分钟',
        successCriteria: [
          '所有自动化测试通过',
          '手动烟雾测试通过',
          '无严重错误',
        ],
        actions: [
          '部署到内部测试环境',
          '执行自动化测试',
          '团队成员手动测试',
          '检查日志和监控',
        ],
      },
      {
        stage: 2,
        name: '金丝雀发布 - 1%',
        trafficPercentage: 1,
        duration: '1 小时',
        successCriteria: [
          '错误率 < 0.1%',
          'P95 响应时间 < 2s',
          '无用户投诉',
        ],
        actions: [
          '将 1% 流量切换到新版本',
          '密切监控错误率和性能',
          '收集用户反馈',
          '准备随时回滚',
        ],
      },
      {
        stage: 3,
        name: '金丝雀发布 - 5%',
        trafficPercentage: 5,
        duration: '2 小时',
        successCriteria: [
          '错误率 < 0.1%',
          'P95 响应时间 < 2s',
          '核心功能正常',
          '无严重用户投诉',
        ],
        actions: [
          '将 5% 流量切换到新版本',
          '监控关键业务指标',
          '分析用户行为数据',
          '检查资源使用情况',
        ],
      },
      {
        stage: 4,
        name: '金丝雀发布 - 25%',
        trafficPercentage: 25,
        duration: '4 小时',
        successCriteria: [
          '错误率 < 0.1%',
          'P95 响应时间 < 2s',
          '业务指标正常',
          '系统稳定',
        ],
        actions: [
          '将 25% 流量切换到新版本',
          '持续监控系统指标',
          '收集更多用户反馈',
          '评估系统容量',
        ],
      },
      {
        stage: 5,
        name: '金丝雀发布 - 50%',
        trafficPercentage: 50,
        duration: '4 小时',
        successCriteria: [
          '错误率 < 0.1%',
          'P95 响应时间 < 2s',
          '所有功能正常',
          '用户满意度良好',
        ],
        actions: [
          '将 50% 流量切换到新版本',
          '全面监控系统状态',
          '分析业务数据',
          '准备全量发布',
        ],
      },
      {
        stage: 6,
        name: '全量发布',
        trafficPercentage: 100,
        duration: '持续监控',
        successCriteria: [
          '错误率 < 0.1%',
          'P95 响应时间 < 2s',
          '系统稳定运行',
          '用户反馈良好',
        ],
        actions: [
          '将 100% 流量切换到新版本',
          '持续监控 24 小时',
          '收集用户反馈',
          '准备下一版本',
        ],
      },
    ];
  }

  private getRollbackTriggers(): RollbackTrigger[] {
    return [
      {
        metric: '错误率',
        threshold: '> 1%',
        action: '立即回滚到上一版本',
      },
      {
        metric: 'P95 响应时间',
        threshold: '> 5s',
        action: '立即回滚到上一版本',
      },
      {
        metric: '严重错误',
        threshold: '> 0',
        action: '立即回滚到上一版本',
      },
      {
        metric: 'CPU 使用率',
        threshold: '> 90%',
        action: '暂停发布,调查原因',
      },
      {
        metric: '内存使用率',
        threshold: '> 90%',
        action: '暂停发布,调查原因',
      },
      {
        metric: '用户投诉',
        threshold: '> 5 个严重投诉',
        action: '暂停发布,调查原因',
      },
    ];
  }

  private getMonitoringMetrics(): string[] {
    return [
      'HTTP 请求总数',
      'HTTP 错误率',
      'P50/P95/P99 响应时间',
      'CPU 使用率',
      '内存使用率',
      '磁盘 I/O',
      '网络流量',
      '数据库连接数',
      '缓存命中率',
      '业务转化率',
      '用户活跃度',
      '页面加载时间',
    ];
  }

  generateMarkdown(plan: CanaryPlan): string {
    let md = `# 灰度发布计划\n\n`;
    md += `**版本**: ${plan.version}\n`;
    md += `**生成时间**: ${plan.timestamp}\n\n`;

    md += `## 📋 发布概述\n\n`;
    md += `灰度发布(Canary Deployment)是一种降低发布风险的策略,通过逐步增加新版本的流量比例,在发现问题时可以快速回滚。\n\n`;

    md += `### 发布原则\n\n`;
    md += `1. **小步快跑**: 每个阶段流量增加不超过 50%\n`;
    md += `2. **充分观察**: 每个阶段都要充分观察系统指标\n`;
    md += `3. **快速回滚**: 发现问题立即回滚\n`;
    md += `4. **持续监控**: 全程监控关键指标\n\n`;

    md += `## 🚀 发布阶段\n\n`;
    for (const stage of plan.stages) {
      md += `### 阶段 ${stage.stage}: ${stage.name}\n\n`;
      md += `- **流量比例**: ${stage.trafficPercentage}%\n`;
      md += `- **持续时间**: ${stage.duration}\n\n`;

      md += `**成功标准**:\n\n`;
      for (const criteria of stage.successCriteria) {
        md += `- ${criteria}\n`;
      }
      md += `\n`;

      md += `**执行步骤**:\n\n`;
      for (let i = 0; i < stage.actions.length; i++) {
        md += `${i + 1}. ${stage.actions[i]}\n`;
      }
      md += `\n`;
    }

    md += `## ⚠️ 回滚触发条件\n\n`;
    md += `以下情况将触发自动或手动回滚:\n\n`;
    md += `| 指标 | 阈值 | 响应动作 |\n`;
    md += `|------|------|----------|\n`;
    for (const trigger of plan.rollbackTriggers) {
      md += `| ${trigger.metric} | ${trigger.threshold} | ${trigger.action} |\n`;
    }
    md += `\n`;

    md += `## 📊 监控指标\n\n`;
    md += `在整个发布过程中,需要持续监控以下指标:\n\n`;
    for (const metric of plan.metrics) {
      md += `- ${metric}\n`;
    }
    md += `\n`;

    md += `## 📝 执行检查清单\n\n`;
    md += `### 发布前\n\n`;
    md += `- [ ] 所有测试通过\n`;
    md += `- [ ] 代码审查完成\n`;
    md += `- [ ] 监控系统正常\n`;
    md += `- [ ] 回滚方案准备就绪\n`;
    md += `- [ ] 团队成员就位\n`;
    md += `- [ ] 通知相关人员\n\n`;

    md += `### 每个阶段\n\n`;
    md += `- [ ] 调整流量比例\n`;
    md += `- [ ] 检查错误率\n`;
    md += `- [ ] 检查响应时间\n`;
    md += `- [ ] 检查系统资源\n`;
    md += `- [ ] 收集用户反馈\n`;
    md += `- [ ] 记录观察结果\n\n`;

    md += `### 发布后\n\n`;
    md += `- [ ] 持续监控 24 小时\n`;
    md += `- [ ] 收集用户反馈\n`;
    md += `- [ ] 分析性能数据\n`;
    md += `- [ ] 总结经验教训\n`;
    md += `- [ ] 更新文档\n\n`;

    md += `## 🔄 回滚流程\n\n`;
    md += `如果在任何阶段发现问题:\n\n`;
    md += `1. **立即停止**: 停止增加流量\n`;
    md += `2. **评估影响**: 快速评估问题影响范围\n`;
    md += `3. **决策回滚**: 决定是否需要回滚\n`;
    md += `4. **执行回滚**: 按照回滚方案执行\n`;
    md += `5. **验证恢复**: 确认系统恢复正常\n`;
    md += `6. **分析原因**: 分析问题根本原因\n`;
    md += `7. **制定改进**: 制定改进措施\n\n`;

    md += `## 📞 紧急联系人\n\n`;
    md += `| 角色 | 姓名 | 联系方式 |\n`;
    md += `|------|------|----------|\n`;
    md += `| 技术负责人 | [姓名] | [电话/邮箱] |\n`;
    md += `| 运维负责人 | [姓名] | [电话/邮箱] |\n`;
    md += `| 产品负责人 | [姓名] | [电话/邮箱] |\n\n`;

    md += `## 📝 发布记录\n\n`;
    md += `| 时间 | 阶段 | 流量 | 状态 | 备注 |\n`;
    md += `|------|------|------|------|------|\n`;
    md += `|      |      |      |      |      |\n`;

    return md;
  }
}

function main() {
  console.log('🚀 生成灰度发布计划...\n');

  const generator = new CanaryDeploymentPlanGenerator();
  const plan = generator.generatePlan();

  const markdown = generator.generateMarkdown(plan);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `canary-deployment-plan-${timestamp}.md`;

  fs.writeFileSync(mdPath, markdown);

  console.log(`✅ 灰度发布计划已生成: ${mdPath}\n`);

  console.log('💡 提示:');
  console.log('  - 根据实际情况调整流量比例和持续时间');
  console.log('  - 确保监控系统已配置完成');
  console.log('  - 准备好回滚方案');
  console.log('  - 通知所有相关人员');
}

main();
