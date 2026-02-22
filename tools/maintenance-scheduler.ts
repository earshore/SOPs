/**
 * 定期维护调度器
 * 生成定期维护任务的执行计划和脚本
 */

import * as fs from 'fs';

interface MaintenanceTask {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  command: string;
  description: string;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
}

interface MaintenanceSchedule {
  daily: MaintenanceTask[];
  weekly: MaintenanceTask[];
  monthly: MaintenanceTask[];
  quarterly: MaintenanceTask[];
}

class MaintenanceScheduler {
  private tasks: MaintenanceTask[] = [
    // 每日任务
    {
      id: 'daily-health-check',
      name: '健康检查',
      frequency: 'daily',
      command: 'npm run test:startup',
      description: '检查应用是否正常启动和运行',
      estimatedTime: '5 分钟',
      priority: 'high',
    },
    {
      id: 'daily-error-log',
      name: '错误日志检查',
      frequency: 'daily',
      command: 'npm run crash:monitor',
      description: '检查和分析错误日志',
      estimatedTime: '10 分钟',
      priority: 'high',
    },

    // 每周任务
    {
      id: 'weekly-tech-debt',
      name: '技术债务扫描',
      frequency: 'weekly',
      command: 'npm run tech-debt:scan',
      description: '扫描代码中的技术债务',
      estimatedTime: '15 分钟',
      priority: 'medium',
    },
    {
      id: 'weekly-quality',
      name: '代码质量检查',
      frequency: 'weekly',
      command: 'npm run quality:monitor',
      description: '检查代码质量指标',
      estimatedTime: '15 分钟',
      priority: 'medium',
    },
    {
      id: 'weekly-performance',
      name: '性能分析',
      frequency: 'weekly',
      command: 'npm run performance:analyze',
      description: '分析应用性能指标',
      estimatedTime: '20 分钟',
      priority: 'medium',
    },
    {
      id: 'weekly-unused-code',
      name: '未使用代码扫描',
      frequency: 'weekly',
      command: 'npm run unused-imports:scan',
      description: '扫描未使用的代码',
      estimatedTime: '10 分钟',
      priority: 'low',
    },

    // 每月任务
    {
      id: 'monthly-security',
      name: '安全审计',
      frequency: 'monthly',
      command: 'npm run security:audit',
      description: '执行安全漏洞扫描',
      estimatedTime: '30 分钟',
      priority: 'high',
    },
    {
      id: 'monthly-dependencies',
      name: '依赖更新',
      frequency: 'monthly',
      command: 'npm outdated && npm audit',
      description: '检查和更新依赖包',
      estimatedTime: '1 小时',
      priority: 'high',
    },
    {
      id: 'monthly-complexity',
      name: '代码复杂度分析',
      frequency: 'monthly',
      command: 'npm run code:analyze:complexity',
      description: '分析代码复杂度',
      estimatedTime: '20 分钟',
      priority: 'medium',
    },
    {
      id: 'monthly-todos',
      name: 'TODO 清理',
      frequency: 'monthly',
      command: 'npm run code:clean:todos',
      description: '清理过时的 TODO',
      estimatedTime: '30 分钟',
      priority: 'low',
    },

    // 每季度任务
    {
      id: 'quarterly-performance',
      name: '性能优化',
      frequency: 'quarterly',
      command: 'npm run test:performance',
      description: '全面性能测试和优化',
      estimatedTime: '4 小时',
      priority: 'high',
    },
    {
      id: 'quarterly-architecture',
      name: '架构评审',
      frequency: 'quarterly',
      command: 'echo "需要团队会议讨论"',
      description: '评审系统架构和技术选型',
      estimatedTime: '2 小时',
      priority: 'high',
    },
    {
      id: 'quarterly-refactor',
      name: '代码重构',
      frequency: 'quarterly',
      command: 'npm run code:clean:all',
      description: '清理和重构代码',
      estimatedTime: '8 小时',
      priority: 'medium',
    },
    {
      id: 'quarterly-documentation',
      name: '文档更新',
      frequency: 'quarterly',
      command: 'echo "更新项目文档"',
      description: '更新项目文档和 API 文档',
      estimatedTime: '4 小时',
      priority: 'medium',
    },
  ];

  getSchedule(): MaintenanceSchedule {
    return {
      daily: this.tasks.filter(t => t.frequency === 'daily'),
      weekly: this.tasks.filter(t => t.frequency === 'weekly'),
      monthly: this.tasks.filter(t => t.frequency === 'monthly'),
      quarterly: this.tasks.filter(t => t.frequency === 'quarterly'),
    };
  }

  generateMarkdown(schedule: MaintenanceSchedule): string {
    let md = `# 定期维护计划\n\n`;
    md += `生成时间: ${new Date().toISOString()}\n\n`;

    md += `## 📅 维护周期\n\n`;
    md += `- **每日**: ${schedule.daily.length} 个任务\n`;
    md += `- **每周**: ${schedule.weekly.length} 个任务\n`;
    md += `- **每月**: ${schedule.monthly.length} 个任务\n`;
    md += `- **每季度**: ${schedule.quarterly.length} 个任务\n\n`;

    const sections = [
      { title: '每日任务', tasks: schedule.daily },
      { title: '每周任务', tasks: schedule.weekly },
      { title: '每月任务', tasks: schedule.monthly },
      { title: '每季度任务', tasks: schedule.quarterly },
    ];

    for (const section of sections) {
      md += `## ${section.title}\n\n`;
      md += `| 任务 | 优先级 | 预计时间 | 命令 |\n`;
      md += `|------|--------|----------|------|\n`;
      
      for (const task of section.tasks) {
        const priorityIcon = task.priority === 'high' ? '🔴' : 
                           task.priority === 'medium' ? '🟡' : '🔵';
        md += `| ${task.name} | ${priorityIcon} ${task.priority} | ${task.estimatedTime} | \`${task.command}\` |\n`;
      }
      md += `\n`;

      for (const task of section.tasks) {
        md += `### ${task.name}\n\n`;
        md += `- **描述**: ${task.description}\n`;
        md += `- **命令**: \`${task.command}\`\n`;
        md += `- **预计时间**: ${task.estimatedTime}\n\n`;
      }
    }

    md += `## 📋 执行检查清单\n\n`;
    md += `### 每日检查\n\n`;
    for (const task of schedule.daily) {
      md += `- [ ] ${task.name}\n`;
    }
    md += `\n`;

    md += `### 每周检查（周一执行）\n\n`;
    for (const task of schedule.weekly) {
      md += `- [ ] ${task.name}\n`;
    }
    md += `\n`;

    md += `### 每月检查（月初执行）\n\n`;
    for (const task of schedule.monthly) {
      md += `- [ ] ${task.name}\n`;
    }
    md += `\n`;

    md += `### 每季度检查（季度初执行）\n\n`;
    for (const task of schedule.quarterly) {
      md += `- [ ] ${task.name}\n`;
    }
    md += `\n`;

    md += `## 💡 最佳实践\n\n`;
    md += `1. 设置日历提醒,确保按时执行维护任务\n`;
    md += `2. 记录每次维护的结果和发现的问题\n`;
    md += `3. 优先处理高优先级任务\n`;
    md += `4. 将维护任务集成到 CI/CD 流程\n`;
    md += `5. 定期审查和调整维护计划\n`;

    return md;
  }

  generateCronConfig(schedule: MaintenanceSchedule): string {
    let cron = `# 定期维护 Cron 配置\n\n`;
    cron += `# 每日任务 - 每天早上 9:00 执行\n`;
    for (const task of schedule.daily) {
      cron += `0 9 * * * cd /path/to/project && ${task.command}\n`;
    }
    cron += `\n`;

    cron += `# 每周任务 - 每周一早上 9:00 执行\n`;
    for (const task of schedule.weekly) {
      cron += `0 9 * * 1 cd /path/to/project && ${task.command}\n`;
    }
    cron += `\n`;

    cron += `# 每月任务 - 每月 1 号早上 9:00 执行\n`;
    for (const task of schedule.monthly) {
      cron += `0 9 1 * * cd /path/to/project && ${task.command}\n`;
    }
    cron += `\n`;

    cron += `# 每季度任务 - 每季度第一天早上 9:00 执行\n`;
    for (const task of schedule.quarterly) {
      cron += `0 9 1 1,4,7,10 * cd /path/to/project && ${task.command}\n`;
    }

    return cron;
  }

  generateGitHubActions(schedule: MaintenanceSchedule): string {
    let yaml = `name: Scheduled Maintenance\n\n`;
    yaml += `on:\n`;
    yaml += `  schedule:\n`;
    yaml += `    # 每日任务 - 每天 UTC 01:00 (北京时间 09:00)\n`;
    yaml += `    - cron: '0 1 * * *'\n`;
    yaml += `    # 每周任务 - 每周一 UTC 01:00\n`;
    yaml += `    - cron: '0 1 * * 1'\n`;
    yaml += `    # 每月任务 - 每月 1 号 UTC 01:00\n`;
    yaml += `    - cron: '0 1 1 * *'\n`;
    yaml += `  workflow_dispatch:\n\n`;

    yaml += `jobs:\n`;
    yaml += `  daily-maintenance:\n`;
    yaml += `    name: 每日维护\n`;
    yaml += `    runs-on: windows-latest\n`;
    yaml += `    if: github.event.schedule == '0 1 * * *'\n\n`;
    yaml += `    steps:\n`;
    yaml += `      - uses: actions/checkout@v4\n`;
    yaml += `      - uses: actions/setup-node@v4\n`;
    yaml += `        with:\n`;
    yaml += `          node-version: '20.x'\n`;
    yaml += `      - run: npm ci\n`;
    for (const task of schedule.daily) {
      yaml += `      - name: ${task.name}\n`;
      yaml += `        run: ${task.command}\n`;
      yaml += `        continue-on-error: true\n`;
    }
    yaml += `\n`;

    yaml += `  weekly-maintenance:\n`;
    yaml += `    name: 每周维护\n`;
    yaml += `    runs-on: windows-latest\n`;
    yaml += `    if: github.event.schedule == '0 1 * * 1'\n\n`;
    yaml += `    steps:\n`;
    yaml += `      - uses: actions/checkout@v4\n`;
    yaml += `      - uses: actions/setup-node@v4\n`;
    yaml += `        with:\n`;
    yaml += `          node-version: '20.x'\n`;
    yaml += `      - run: npm ci\n`;
    for (const task of schedule.weekly) {
      yaml += `      - name: ${task.name}\n`;
      yaml += `        run: ${task.command}\n`;
      yaml += `        continue-on-error: true\n`;
    }

    return yaml;
  }
}

function main() {
  console.log('📅 生成定期维护计划...\n');

  const scheduler = new MaintenanceScheduler();
  const schedule = scheduler.getSchedule();

  const markdown = scheduler.generateMarkdown(schedule);
  const cron = scheduler.generateCronConfig(schedule);
  const githubActions = scheduler.generateGitHubActions(schedule);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const mdPath = `maintenance-schedule-${timestamp}.md`;
  const cronPath = `maintenance-cron-${timestamp}.txt`;
  const yamlPath = `maintenance-workflow-${timestamp}.yml`;

  fs.writeFileSync(mdPath, markdown);
  fs.writeFileSync(cronPath, cron);
  fs.writeFileSync(yamlPath, githubActions);

  console.log(`✅ 维护计划已生成: ${mdPath}`);
  console.log(`✅ Cron 配置已生成: ${cronPath}`);
  console.log(`✅ GitHub Actions 工作流已生成: ${yamlPath}\n`);

  console.log('💡 提示:');
  console.log('  - 将 Cron 配置添加到服务器');
  console.log('  - 将 GitHub Actions 工作流添加到 .github/workflows/');
  console.log('  - 根据实际情况调整执行时间');
}

main();
