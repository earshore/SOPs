/**
 * 迁移工具主类 - 整合迁移计划生成、执行和备份管理
 */

import { ValidationReport, MigrationPlan, MigrationResult } from '../types/index.js';
import { MigrationPlanner } from './MigrationPlanner.js';
import { MigrationExecutor } from './MigrationExecutor.js';
import { BackupManager } from './BackupManager.js';

export class Migrator {
  private planner: MigrationPlanner;
  private executor: MigrationExecutor;
  private backupManager: BackupManager;

  constructor() {
    this.planner = new MigrationPlanner();
    this.executor = new MigrationExecutor();
    this.backupManager = new BackupManager();
  }

  /**
   * 从验证报告创建并执行迁移
   */
  async migrate(
    report: ValidationReport,
    allFiles: string[],
    options: {
      dryRun?: boolean;
      createBackup?: boolean;
      projectRoot?: string;
    } = {}
  ): Promise<MigrationResult> {
    // 创建迁移计划
    console.log('📝 正在创建迁移计划...');
    const plan = await this.planner.createPlan(report, allFiles);

    // 执行迁移
    console.log('🚀 正在执行迁移...');
    const result = await this.executor.executeMigration(plan, options);

    return result;
  }

  /**
   * 预览迁移计划
   */
  async preview(
    report: ValidationReport,
    allFiles: string[]
  ): Promise<MigrationPlan> {
    console.log('🔍 正在生成迁移预览...');
    const plan = await this.planner.createPlan(report, allFiles);
    this.executor.previewChanges(plan);
    return plan;
  }

  /**
   * 回滚迁移
   */
  rollback(backupPath: string, projectRoot: string = process.cwd()): boolean {
    console.log('⏮️  正在回滚迁移...');
    return this.executor.rollback(backupPath, projectRoot);
  }

  /**
   * 列出所有备份
   */
  listBackups(projectRoot: string = process.cwd()): string[] {
    return this.backupManager.listBackups(projectRoot);
  }
}
