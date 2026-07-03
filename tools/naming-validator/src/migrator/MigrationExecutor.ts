/**
 * 迁移执行器 - 执行迁移计划
 */

import { writeFileSync } from 'fs';
import { MigrationPlan, MigrationResult, MigrationChange } from '../types/index.js';
import { HTMLParser } from '../parsers/HTMLParser.js';
import { CSSParser } from '../parsers/CSSParser.js';
import { ReferenceTracker } from '../reference-tracker/ReferenceTracker.js';
import { BackupManager } from './BackupManager.js';

export class MigrationExecutor {
  private htmlParser: HTMLParser;
  private cssParser: CSSParser;
  private referenceTracker: ReferenceTracker;
  private backupManager: BackupManager;

  constructor() {
    this.htmlParser = new HTMLParser();
    this.cssParser = new CSSParser();
    this.referenceTracker = new ReferenceTracker();
    this.backupManager = new BackupManager();
  }

  /**
   * 执行迁移
   */
  async executeMigration(
    plan: MigrationPlan,
    options: {
      dryRun?: boolean;
      createBackup?: boolean;
      projectRoot?: string;
    } = {}
  ): Promise<MigrationResult> {
    const {
      dryRun = false,
      createBackup = true,
      projectRoot = process.cwd(),
    } = options;

    const result: MigrationResult = {
      success: true,
      changesApplied: 0,
      filesModified: [],
      errors: [],
    };

    // 预览模式
    if (dryRun) {
      console.log('🔍 预览模式 - 不会实际修改文件\n');
      this.previewChanges(plan);
      return result;
    }

    // 创建备份
    if (createBackup) {
      try {
        result.backupPath = this.backupManager.createBackup(
          plan.affectedFiles,
          projectRoot
        );
      } catch (error) {
        result.errors.push({
          filePath: 'backup',
          error: `备份创建失败: ${error}`,
        });
        result.success = false;
        return result;
      }
    }

    // 执行迁移
    const filesModifiedSet = new Set<string>();

    for (const change of plan.changes) {
      try {
        // 更新主文件
        await this.applyChange(change);
        filesModifiedSet.add(change.filePath);
        result.changesApplied++;

        // 更新所有引用
        for (const reference of change.references) {
          const refType = this.mapCategoryToRefType(change.type);
          const updated = this.referenceTracker.updateReferences(
            change.oldValue,
            change.newValue,
            refType,
            reference.filePath
          );

          if (updated) {
            filesModifiedSet.add(reference.filePath);
          }
        }
      } catch (error) {
        result.errors.push({
          filePath: change.filePath,
          error: `迁移失败: ${error}`,
        });
        result.success = false;
      }
    }

    result.filesModified = Array.from(filesModifiedSet);

    return result;
  }

  /**
   * 应用单个变更
   */
  private async applyChange(change: MigrationChange): Promise<void> {
    if (change.filePath.endsWith('.html')) {
      await this.applyHtmlChange(change);
      return;
    }

    if (change.filePath.endsWith('.css')) {
      await this.applyCssChange(change);
    }
  }

  private async applyHtmlChange(change: MigrationChange): Promise<void> {
    const elements = await this.htmlParser.parse(change.filePath);
    
    for (const element of elements) {
      await this.applyHtmlElementChange(change, element);
    }

    writeFileSync(change.filePath, await this.htmlParser.serialize(), 'utf-8');
  }

  private async applyHtmlElementChange(
    change: MigrationChange,
    element: Awaited<ReturnType<HTMLParser['parse']>>[number]
  ): Promise<void> {
    if (change.type === 'html-id' && element.id === change.oldValue) {
      await this.htmlParser.updateId(element, change.newValue);
    } else if (change.type === 'css-class' && element.classes.includes(change.oldValue)) {
      await this.htmlParser.updateClass(element, change.oldValue, change.newValue);
    } else if (change.type === 'data-attr' && element.dataAttributes.has(change.oldValue)) {
      const value = element.dataAttributes.get(change.oldValue);
      await this.htmlParser.updateDataAttr(element, change.newValue, value || '');
    }
  }

  private async applyCssChange(change: MigrationChange): Promise<void> {
    const rules = await this.cssParser.parse(change.filePath);
    
    for (const rule of rules) {
      if (change.type === 'css-class' && rule.classes.includes(change.oldValue)) {
        await this.cssParser.updateSelector(rule, this.createRenamedSelector(rule.selector, change));
      }
    }

    writeFileSync(change.filePath, await this.cssParser.serialize(), 'utf-8');
  }

  private createRenamedSelector(selector: string, change: MigrationChange): string {
    return selector.replace(
      new RegExp(`\\.${change.oldValue}\\b`, 'g'),
      `.${change.newValue}`
    );
  }

  /**
   * 预览变更
   */
  previewChanges(plan: MigrationPlan): void {
    console.log('📋 迁移计划预览\n');
    console.log(`总变更数: ${plan.statistics.totalChanges}`);
    console.log(`受影响文件: ${plan.affectedFiles.length}`);
    console.log(`影响程度: ${plan.statistics.estimatedImpact}\n`);

    console.log('变更详情:');
    plan.changes.forEach((change, index) => {
      console.log(`\n${index + 1}. ${change.type}`);
      console.log(`   文件: ${change.filePath}:${change.line}`);
      console.log(`   ${change.oldValue} → ${change.newValue}`);
      console.log(`   引用数: ${change.references.length}`);
    });
  }

  /**
   * 映射类别到引用类型
   */
  private mapCategoryToRefType(category: string): 'id' | 'class' | 'data-attr' {
    switch (category) {
      case 'html-id':
        return 'id';
      case 'css-class':
        return 'class';
      case 'data-attr':
        return 'data-attr';
      default:
        return 'id';
    }
  }

  /**
   * 回滚迁移
   */
  rollback(backupPath: string, projectRoot: string = process.cwd()): boolean {
    return this.backupManager.rollback(backupPath, projectRoot);
  }
}
