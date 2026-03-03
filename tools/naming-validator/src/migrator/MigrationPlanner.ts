/**
 * 迁移计划生成器 - 基于验证报告创建迁移计划
 */

import { ValidationReport, MigrationPlan, MigrationChange, NamingCategory } from '../types/index.js';
import { ReferenceTracker } from '../reference-tracker/ReferenceTracker.js';

export class MigrationPlanner {
  private referenceTracker: ReferenceTracker;

  constructor() {
    this.referenceTracker = new ReferenceTracker();
  }

  /**
   * 基于验证报告创建迁移计划
   */
  async createPlan(
    report: ValidationReport,
    allFiles: string[]
  ): Promise<MigrationPlan> {
    const changes: MigrationChange[] = [];
    const affectedFilesSet = new Set<string>();

    // 为每个问题创建迁移变更
    for (const issue of report.issues) {
      // 查找所有引用
      const references = await this.findReferences(
        issue.currentValue,
        issue.type,
        allFiles
      );

      const change: MigrationChange = {
        type: issue.type,
        filePath: issue.filePath,
        line: issue.line,
        oldValue: issue.currentValue,
        newValue: issue.suggestedValue,
        references,
      };

      changes.push(change);

      // 收集受影响的文件
      affectedFilesSet.add(issue.filePath);
      references.forEach(ref => affectedFilesSet.add(ref.filePath));
    }

    const affectedFiles = Array.from(affectedFilesSet);

    // 计算统计信息
    const statistics = this.calculateStatistics(changes, affectedFiles);

    return {
      changes,
      affectedFiles,
      statistics,
    };
  }

  /**
   * 查找引用
   */
  private async findReferences(
    value: string,
    type: NamingCategory,
    files: string[]
  ) {
    switch (type) {
      case 'html-id':
        return this.referenceTracker.findIdReferences(value, files);
      case 'css-class':
        return this.referenceTracker.findClassReferences(value, files);
      case 'data-attr':
        return this.referenceTracker.findDataAttrReferences(value, files);
      default:
        return [];
    }
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(
    changes: MigrationChange[],
    affectedFiles: string[]
  ) {
    const byType: Record<string, number> = {};

    changes.forEach(change => {
      byType[change.type] = (byType[change.type] || 0) + 1;
    });

    // 估算影响程度
    let estimatedImpact: 'low' | 'medium' | 'high' = 'low';
    if (affectedFiles.length > 50 || changes.length > 100) {
      estimatedImpact = 'high';
    } else if (affectedFiles.length > 20 || changes.length > 50) {
      estimatedImpact = 'medium';
    }

    return {
      totalChanges: changes.length,
      byType,
      estimatedImpact,
    };
  }

  /**
   * 获取引用追踪器实例
   */
  getReferenceTracker(): ReferenceTracker {
    return this.referenceTracker;
  }
}
