#!/usr/bin/env node

/**
 * CLI命令行入口
 * 提供validate、migrate、install-hooks、generate-docs等命令
 */

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { Validator } from './validator/index.js';
import { Migrator } from './migrator/Migrator.js';
import type { ValidatorConfig } from './types/index.js';

const program = new Command();

program
  .name('naming-validator')
  .description('HTML和CSS命名规范验证和迁移工具')
  .version('1.0.0');

/**
 * 加载配置文件
 * @param configPath 配置文件路径
 * @returns 验证器配置
 */
function loadConfig(configPath?: string): ValidatorConfig {
  const defaultConfig: ValidatorConfig = {
    include: ['**/*.html', '**/*.css'],
    exclude: ['node_modules/**', 'dist/**', 'build/**', '.git/**'],
    rules: {
      'html-id': true,
      'css-class': true,
      'data-attr': true,
    },
    severity: {
      'html-id': 'error',
      'css-class': 'error',
      'data-attr': 'warning',
    },
    ignorePatterns: [],
  };

  // 如果指定了配置文件路径
  if (configPath) {
    try {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.error(chalk.red(`加载配置文件失败: ${configPath}`));
      console.error(error);
      process.exit(1);
    }
  }

  // 尝试从当前目录加载默认配置文件
  const defaultConfigPath = path.join(process.cwd(), '.naming-rules.json');
  if (fs.existsSync(defaultConfigPath)) {
    try {
      const configContent = fs.readFileSync(defaultConfigPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      return { ...defaultConfig, ...userConfig };
    } catch (error) {
      console.warn(chalk.yellow('警告: 加载默认配置文件失败，使用内置配置'));
    }
  }

  return defaultConfig;
}

/**
 * validate命令：验证命名规范
 */
program
  .command('validate')
  .description('验证HTML和CSS文件的命名规范')
  .argument('[path]', '要验证的目录或文件路径', '.')
  .option('-c, --config <path>', '配置文件路径')
  .option('-f, --format <format>', '报告格式 (json|markdown)', 'markdown')
  .option('-o, --output <path>', '报告输出文件路径')
  .option('--no-html-id', '禁用HTML ID规则检查')
  .option('--no-css-class', '禁用CSS类规则检查')
  .option('--no-data-attr', '禁用data属性规则检查')
  .action(async (targetPath: string, options: any) => {
    console.log(chalk.blue('🔍 开始验证命名规范...\n'));

    try {
      // 加载配置
      let config = loadConfig(options.config);

      // 命令行参数覆盖配置
      if (options.htmlId === false) {
        config.rules['html-id'] = false;
      }
      if (options.cssClass === false) {
        config.rules['css-class'] = false;
      }
      if (options.dataAttr === false) {
        config.rules['data-attr'] = false;
      }

      // 创建验证器
      const validator = new Validator(config);

      // 获取绝对路径
      const absolutePath = path.resolve(process.cwd(), targetPath);

      // 检查路径是否存在
      if (!fs.existsSync(absolutePath)) {
        console.error(chalk.red(`错误: 路径不存在: ${absolutePath}`));
        process.exit(1);
      }

      // 执行验证
      let report;
      const stats = fs.statSync(absolutePath);
      
      if (stats.isDirectory()) {
        console.log(chalk.gray(`扫描目录: ${absolutePath}\n`));
        report = await validator.scanDirectory(absolutePath);
      } else if (stats.isFile()) {
        console.log(chalk.gray(`验证文件: ${absolutePath}\n`));
        report = await validator.validateFile(absolutePath);
      } else {
        console.error(chalk.red('错误: 不支持的路径类型'));
        process.exit(1);
      }

      // 生成报告
      const reportFormat = options.format === 'json' ? 'json' : 'markdown';
      const reportContent = validator.generateReport(report, reportFormat);

      // 输出报告
      if (options.output) {
        const outputPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(outputPath, reportContent, 'utf-8');
        console.log(chalk.green(`✅ 报告已保存到: ${outputPath}`));
      } else {
        console.log(reportContent);
      }

      // 显示摘要
      console.log('\n' + chalk.bold('验证摘要:'));
      console.log(chalk.gray(`  扫描文件: ${report.totalFiles}`));
      console.log(chalk.gray(`  发现问题: ${report.totalIssues}`));
      
      if (report.summary.errors > 0) {
        console.log(chalk.red(`  错误: ${report.summary.errors}`));
      }
      if (report.summary.warnings > 0) {
        console.log(chalk.yellow(`  警告: ${report.summary.warnings}`));
      }

      // 如果有错误，退出码为1
      if (report.summary.errors > 0) {
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('验证过程中发生错误:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * migrate命令：自动迁移命名
 */
program
  .command('migrate')
  .description('自动迁移不符合规范的命名')
  .argument('[path]', '要迁移的目录或文件路径', '.')
  .option('-c, --config <path>', '配置文件路径')
  .option('--dry-run', '预览模式，不实际修改文件')
  .option('--no-backup', '不创建备份')
  .option('-o, --output <path>', '迁移报告输出文件路径')
  .action(async (targetPath: string, options: any) => {
    console.log(chalk.blue('🚀 开始迁移命名...\n'));

    try {
      // 加载配置
      const config = loadConfig(options.config);

      // 创建验证器和迁移器
      const validator = new Validator(config);
      const migrator = new Migrator();

      // 获取绝对路径
      const absolutePath = path.resolve(process.cwd(), targetPath);

      // 检查路径是否存在
      if (!fs.existsSync(absolutePath)) {
        console.error(chalk.red(`错误: 路径不存在: ${absolutePath}`));
        process.exit(1);
      }

      // 先执行验证
      console.log(chalk.gray('步骤 1/3: 验证命名规范...\n'));
      const report = await validator.scanDirectory(absolutePath);

      if (report.totalIssues === 0) {
        console.log(chalk.green('✅ 未发现命名问题，无需迁移'));
        return;
      }

      console.log(chalk.yellow(`发现 ${report.totalIssues} 个命名问题\n`));

      // 收集所有文件
      const allFiles: string[] = [];
      const collectFiles = (dir: string) => {
        const entries = fs.readdirSync(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            if (!config.exclude.some(pattern => fullPath.includes(pattern.replace('**/', '')))) {
              collectFiles(fullPath);
            }
          } else if (stat.isFile()) {
            allFiles.push(fullPath);
          }
        }
      };
      collectFiles(absolutePath);

      // 执行迁移
      console.log(chalk.gray('步骤 2/3: 创建迁移计划...\n'));
      
      if (options.dryRun) {
        await migrator.preview(report, allFiles);
        console.log(chalk.yellow('\n⚠️  预览模式 - 未实际修改文件'));
        return;
      }

      console.log(chalk.gray('步骤 3/3: 执行迁移...\n'));
      const result = await migrator.migrate(report, allFiles, {
        dryRun: false,
        createBackup: options.backup !== false,
        projectRoot: process.cwd(),
      });

      // 输出结果
      if (result.success) {
        console.log(chalk.green('\n✅ 迁移完成！'));
        console.log(chalk.gray(`  应用变更: ${result.changesApplied}`));
        console.log(chalk.gray(`  修改文件: ${result.filesModified.length}`));
        
        if (result.backupPath) {
          console.log(chalk.gray(`  备份位置: ${result.backupPath}`));
          console.log(chalk.yellow(`  如需回滚，请运行: naming-validator rollback ${result.backupPath}`));
        }
      } else {
        console.log(chalk.red('\n❌ 迁移失败'));
        console.log(chalk.gray(`  成功变更: ${result.changesApplied}`));
        console.log(chalk.gray(`  失败数量: ${result.errors.length}`));
        
        result.errors.forEach(error => {
          console.log(chalk.red(`  - ${error.filePath}: ${error.error}`));
        });
        
        process.exit(1);
      }

      // 保存报告
      if (options.output) {
        const outputPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
        console.log(chalk.green(`\n报告已保存到: ${outputPath}`));
      }

    } catch (error) {
      console.error(chalk.red('迁移过程中发生错误:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * rollback命令：回滚迁移
 */
program
  .command('rollback')
  .description('回滚之前的迁移')
  .argument('<backup-path>', '备份目录路径')
  .action(async (backupPath: string) => {
    console.log(chalk.blue('⏮️  开始回滚迁移...\n'));

    try {
      const migrator = new Migrator();
      const absoluteBackupPath = path.resolve(process.cwd(), backupPath);

      if (!fs.existsSync(absoluteBackupPath)) {
        console.error(chalk.red(`错误: 备份目录不存在: ${absoluteBackupPath}`));
        process.exit(1);
      }

      const success = migrator.rollback(absoluteBackupPath, process.cwd());

      if (success) {
        console.log(chalk.green('\n✅ 回滚完成！'));
      } else {
        console.log(chalk.red('\n❌ 回滚失败'));
        process.exit(1);
      }

    } catch (error) {
      console.error(chalk.red('回滚过程中发生错误:'));
      console.error(error);
      process.exit(1);
    }
  });

/**
 * list-backups命令：列出所有备份
 */
program
  .command('list-backups')
  .description('列出所有可用的备份')
  .action(() => {
    try {
      const migrator = new Migrator();
      const backups = migrator.listBackups(process.cwd());

      if (backups.length === 0) {
        console.log(chalk.yellow('未找到备份'));
        return;
      }

      console.log(chalk.blue('📦 可用备份:\n'));
      backups.forEach((backup, index) => {
        console.log(chalk.gray(`${index + 1}. ${backup}`));
      });

    } catch (error) {
      console.error(chalk.red('列出备份时发生错误:'));
      console.error(error);
      process.exit(1);
    }
  });

// 后续任务将添加其他命令实现

program.parse();
