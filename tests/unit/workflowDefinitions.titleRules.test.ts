/**
 * workflowDefinitions — 商品名称合规（2026 新规）复核点契约测试
 *
 * 验收要点：
 * 1. 两个作业流的合规复核步骤均包含商品名称合规复核点，且标注"已生效类目适用"
 * 2. 既有四项合规复核点（高危词/品牌与侵权/产品合规/GPSR）保持不变
 * 3. 模块加载期 route 校验不抛错（SystemError 验证逻辑保持）
 * 4. getAppCenterWorkflowDefinition 按 id 查找行为不变
 */

import { describe, it, expect } from 'vitest';

import {
  APP_CENTER_WORKFLOW_DEFINITIONS,
  APP_CENTER_COMPLIANCE_CHECKLIST,
  getAppCenterWorkflowDefinition,
} from '@/modules/app_center/workflowDefinitions';

describe('workflow review points include product title compliance', () => {
  it('should include the 2026 title rules review point in every compliance step', () => {
    const titleRulePoint = '商品名称合规（2026 新规：≤75 字符、重复词、特殊字符、促销语，已生效类目适用）';

    for (const workflow of APP_CENTER_WORKFLOW_DEFINITIONS) {
      for (const step of workflow.steps) {
        if (step.id === 'compliance_review') {
          expect(step.reviewPoints, `${workflow.id}/${step.id}`).toContain(titleRulePoint);
        }
      }
    }
  });

  it('should keep the original four compliance review points', () => {
    expect(APP_CENTER_COMPLIANCE_CHECKLIST).toHaveLength(4);
    expect(APP_CENTER_COMPLIANCE_CHECKLIST.map(item => item.id)).toEqual([
      'restricted_words',
      'brand_infringement',
      'product_compliance',
      'eu_gpsr',
    ]);
  });

  it('should preserve the base compliance review points per step', () => {
    const basePoints = ['高危词', '品牌与侵权', '产品合规', 'GPSR'];

    for (const workflow of APP_CENTER_WORKFLOW_DEFINITIONS) {
      for (const step of workflow.steps) {
        if (step.id === 'compliance_review') {
          expect(step.reviewPoints, `${workflow.id}/${step.id}`).toEqual(
            expect.arrayContaining(basePoints)
          );
          expect(step.reviewPoints, `${workflow.id}/${step.id}`).toHaveLength(5);
        }
      }
    }
  });
});

describe('workflow definitions runtime validation', () => {
  it('should load both workflow definitions without throwing', () => {
    expect(APP_CENTER_WORKFLOW_DEFINITIONS).toHaveLength(2);
  });

  it('should resolve workflows by id', () => {
    expect(getAppCenterWorkflowDefinition('competitor_listing').id).toBe('competitor_listing');
    expect(getAppCenterWorkflowDefinition('keyword_review').id).toBe('keyword_review');
  });

  it('should keep each workflow step review points non-empty', () => {
    for (const workflow of APP_CENTER_WORKFLOW_DEFINITIONS) {
      for (const step of workflow.steps) {
        expect(step.reviewPoints.length, step.id).toBeGreaterThan(0);
      }
    }
  });
});
