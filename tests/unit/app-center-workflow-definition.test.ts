import { describe, expect, it } from 'vitest';
import { appCenterManifest } from '@/modules/app_center/module.manifest';
import { sopsManifest } from '@/modules/sops/module.manifest';
import {
  APP_CENTER_WORKFLOW_DEFINITIONS,
  APP_CENTER_COMPLIANCE_CHECKLIST,
  getAppCenterWorkflowDefinition,
} from '@/modules/app_center/workflowDefinitions';

describe('App Center workflow definitions', () => {
  it('defines the complete competitor and Listing workflow with review gates', () => {
    const workflow = getAppCenterWorkflowDefinition('competitor_listing');

    expect(workflow.title).toBe('竞品与 Listing 作业流');
    expect(workflow.steps.map(step => step.id)).toEqual([
      'scrape',
      'ai_analysis',
      'prompt_generation',
      'listing_copy',
      'keyword_review',
      'compliance_review',
    ]);

    workflow.steps.forEach(step => {
      expect(step.inputs.length, step.id).toBeGreaterThan(0);
      expect(step.outputs.length, step.id).toBeGreaterThan(0);
      expect(step.reviewPoints.length, step.id).toBeGreaterThan(0);
    });
  });

  it('keeps workflow route ids aligned with App Center and SOPS manifests', () => {
    const appCenterRouteIds = new Set(appCenterManifest.routes.map(route => route.routeId));
    const sopsRouteIds = new Set(sopsManifest.routes.map(route => route.routeId));

    APP_CENTER_WORKFLOW_DEFINITIONS.forEach(workflow => {
      workflow.steps.forEach(step => {
        expect(appCenterRouteIds.has(step.routeId), `${workflow.id}:${step.id}`).toBe(true);
        step.complianceRouteIds.forEach(routeId => {
          expect(sopsRouteIds.has(routeId), `${workflow.id}:${step.id}:${routeId}`).toBe(true);
        });
      });
    });

    APP_CENTER_COMPLIANCE_CHECKLIST.forEach(item => {
      expect(sopsRouteIds.has(item.routeId), item.id).toBe(true);
    });
  });
});
