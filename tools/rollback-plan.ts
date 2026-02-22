/**
 * 回滚方案生成器
 * 生成详细的回滚计划和脚本
 */

import * as fs from 'fs';
import * as path from 'path';

interface RollbackPlan {
  version: string;
  timestamp: string;
  steps: RollbackStep[];
  verification: VerificationStep[];
  contacts: Contact[];
}

interface RollbackStep {
  order: number;
  title: string;
  description: string;
  commands?: string[];
  estimatedTime: string;
  critical: boolean;
}

interface VerificationStep {
  name: string;
  description: string;
  expectedResult: string;
}

interface Contact {
  role: string;
  name: string;
  contact: string;
}

class RollbackPlanGenerator {
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

  generatePlan(): RollbackPlan {
    return {
      version: this.version,
      timestamp: new Date().toISOString(),
      steps: this.getRollbackSteps(),
      verification: this.getVerificationSteps(),
      contacts: this.getContacts(),
    };
  }

  private getRollbackSteps(): RollbackStep[] {
    return [
      {
        order: 1,
        title: '通知相关人员',
        description: '立即通知团队和相关人员开始回滚操作',
        estimatedTime: '1 分钟',
        critical: true,
      },
      {
        order: 2,
        title: '停止新流量',
        description: '如果使用负载均衡,先将流量切换到旧版本',
        commands: [
          '# 如果使用 Nginx',
          'sudo nginx -s reload',
          '',
          '# 如果使用云服务负载均衡',
          '# 在控制台手动切换流量',
        ],
        estimatedTime: '2-5 分钟',
        critical: true,
      },
      {
        order: 3,
        title: '备份当前版本',
        description: '在回滚前备份当前版本,以便后续分析',
        commands: [
          'cd /path/to/deployment',
          'tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz dist/',
          'mv backup-*.tar.gz /path/to/backups/',
        ],
        estimatedTime: '2-3 分钟',
        critical: false,
      },
      {
        order: 4,
        title: '恢复上一版本',
        description: '从备份恢复上一个稳定版本',
        commands: [
          'cd /path/to/deployment',
          'rm -rf dist/',
          'tar -xzf /path/to/backups/previous-version.tar.gz',
        ],
        estimatedTime: '3-5 分钟',
        critical: true,
      },
      {
        order: 5,
        title: '重启服务',
        description: '重启应用服务使回滚生效',
        commands: [
          '# 如果使用 PM2',
          'pm2 restart app',
          '',
          '# 如果使用 systemd',
          'sudo systemctl restart app',
          '',
          '# 如果使用 Docker',
          'docker-compose restart',
        ],
        estimatedTime: '1-2 分钟',
        critical: true,
      },
      {
        order: 6,
        title: '验证回滚',
        description: '执行健康检查和烟雾测试',
        commands: [
          'curl -f http://localhost:3000/health',
          'npm run test:smoke',
        ],
        estimatedTime: '3-5 分钟',
        critical: true,
      },
      {
        order: 7,
        title: '恢复流量',
        description: '确认回滚成功后,逐步恢复流量',
        estimatedTime: '5-10 分钟',
        critical: true,
      },
      {
        order: 8,
        title: '监控系统',
        description: '密切监控系统指标和错误日志',
        estimatedTime: '30 分钟',
        critical: true,
      },
      {
        order: 9,
        title: '通知完成',
        description: '通知相关人员回滚已完成',
        estimatedTime: '1 分钟',
        critical: true,
      },
      {
        order: 10,
        title: '事后分析',
        description: '分析问题原因,制定改进措施',
        estimatedTime: '1-2 小时',
        critical: false,
      },
    ];
  }

  private getVerificationSteps(): VerificationStep[] {
    return [
      {
        name: '健康检查',
        description: '访问健康检查端点',
        expectedResult: 'HTTP 200 状态码',
      },
      {
        name: '首页加载',
        description: '访问应用首页',
        expectedResult: '页面正常加载,无 JS 错误',
      },
      {
        name: '核心功能',
        description: '测试核心业务功能',
        expectedResult: '功能正常运行',
      },
      {
        name: '错误日志',
        description: '检查错误日志',
        expectedResult: '无新增错误',
      },
      {
        name: '性能指标',
        description: '检查响应时间和资源使用',
        expectedResult: '指标正常',
      },
    ];
  }

  private getContacts(): Contact[] {
    return [
      {
        role: '技术负责人',
        name: '[姓名]',
        contact: '[电话/邮箱]',
      },
      {
        role: '运维负责人',
        name: '[姓名]',
        contact: '[电话/邮箱]',
      },
      {
        role: '产品负责人',
        name: '[姓名]',
        contact: '[电话/邮箱]',
      },
    ];
  }

  generateMarkdown(plan: RollbackPlan): string {
    let md = `# 回滚方案\n\n`;
    md += `**版本**: ${plan.version}\n`;
    md += `**生成时间**: ${plan.timestamp}\n\n`;

    md += `## ⚠️ 重要提示\n\n`;
    md += `- 回滚操作需要谨慎执行\n`;
    md += `- 确保所有步骤按顺序执行\n`;
    md += `- 关键步骤必须验证成功后再继续\n`;
    md += `- 保持与团队的沟通\n\n`;

    md += `## 📞 紧急联系人\n\n`;
    md += `| 角色 | 姓名 | 联系方式 |\n`;
    md += `|------|------|----------|\n`;
    for (const contact of plan.contacts) {
      md += `| ${contact.role} | ${contact.name} | ${contact.contact} |\n`;
    }
    md += `\n`;

    md += `## 🔄 回滚步骤\n\n`;
    for (const step of plan.steps) {
      const criticalTag = step.critical ? ' 🔴' : '';
      md += `### ${step.order}. ${step.title}${criticalTag}\n\n`;
      md += `**预计时间**: ${step.estimatedTime}\n\n`;
      md += `${step.description}\n\n`;

      if (step.commands && step.commands.length > 0) {
        md += `**执行命令**:\n\n`;
        md += `\`\`\`bash\n`;
        md += step.commands.join('\n');
        md += `\n\`\`\`\n\n`;
      }
    }

    md += `## ✅ 验证清单\n\n`;
    for (const verification of plan.verification) {
      md += `### ${verification.name}\n\n`;
      md += `- **操作**: ${verification.description}\n`;
      md += `- **预期结果**: ${verification.expectedResult}\n`;
      md += `- **状态**: [ ] 未完成 / [ ] 已完成\n\n`;
    }

    md += `## 📝 回滚记录\n\n`;
    md += `| 时间 | 操作 | 执行人 | 结果 | 备注 |\n`;
    md += `|------|------|--------|------|------|\n`;
    md += `|      |      |        |      |      |\n\n`;

    md += `## 🔍 事后分析\n\n`;
    md += `### 问题原因\n\n`;
    md += `[填写问题原因]\n\n`;
    md += `### 影响范围\n\n`;
    md += `[填写影响范围]\n\n`;
    md += `### 改进措施\n\n`;
    md += `[填写改进措施]\n\n`;

    return md;
  }

  generateScript(plan: RollbackPlan): string {
    let script = `#!/bin/bash\n\n`;
    script += `# 回滚脚本 - 版本 ${plan.version}\n`;
    script += `# 生成时间: ${plan.timestamp}\n\n`;

    script += `set -e  # 遇到错误立即退出\n\n`;

    script += `echo "========================================"\n`;
    script += `echo "开始回滚操作 - 版本 ${plan.version}"\n`;
    script += `echo "========================================"\n`;
    script += `echo ""\n\n`;

    for (const step of plan.steps) {
      if (step.commands && step.commands.length > 0) {
        script += `# 步骤 ${step.order}: ${step.title}\n`;
        script += `echo "执行步骤 ${step.order}: ${step.title}..."\n`;

        for (const cmd of step.commands) {
          if (cmd.trim().startsWith('#') || cmd.trim() === '') {
            script += `${cmd}\n`;
          } else {
            script += `${cmd}\n`;
          }
        }

        script += `echo "步骤 ${step.order} 完成"\n`;
        script += `echo ""\n\n`;
      }
    }

    script += `echo "========================================"\n`;
    script += `echo "回滚操作完成"\n`;
    script += `echo "请执行验证步骤确认回滚成功"\n`;
    script += `echo "========================================"\n`;

    return script;
  }
}

function main() {
  console.log('📋 生成回滚方案...\n');

  const generator = new RollbackPlanGenerator();
  const plan = generator.generatePlan();

  const markdown = generator.generateMarkdown(plan);
  const script = generator.generateScript(plan);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `rollback-plan-${timestamp}.md`;
  const scriptPath = `rollback-${timestamp}.sh`;

  fs.writeFileSync(mdPath, markdown);
  fs.writeFileSync(scriptPath, script);

  // 在 Windows 上也创建 .ps1 脚本
  const psScript = script
    .replace(/#!/bin/bash/g, '# PowerShell 回滚脚本')
    .replace(/set -e/g, '$ErrorActionPreference = "Stop"')
    .replace(/echo /g, 'Write-Host ');
  
  const psPath = `rollback-${timestamp}.ps1`;
  fs.writeFileSync(psPath, psScript);

  console.log(`✅ 回滚方案已生成: ${mdPath}`);
  console.log(`✅ Bash 脚本已生成: ${scriptPath}`);
  console.log(`✅ PowerShell 脚本已生成: ${psPath}\n`);

  console.log('⚠️  请根据实际部署环境修改脚本中的路径和命令');
}

main();
