import { describe, expect, it } from 'vitest';
import { MENU_CONFIG } from '@/common/config/menuConfig';
import { ROUTE_MANIFESTS } from '@/common/config/routeManifests';
import { buildCommandIndex, filterByModule } from '../buildIndex';

describe('buildCommandIndex', () => {
  it('covers every route in ROUTE_MANIFESTS exactly once', () => {
    const items = buildCommandIndex();
    const expectedCount = ROUTE_MANIFESTS.reduce(
      (sum, manifest) => sum + manifest.routes.length,
      0
    );
    expect(items).toHaveLength(expectedCount);
    const ids = new Set(items.map(item => item.id));
    expect(ids.size).toBe(expectedCount);
  });

  it('includes home and hub routes with Chinese module labels', () => {
    const items = buildCommandIndex();
    const home = items.find(item => item.id === 'home');
    expect(home?.label).toBe('首页');
    expect(home?.moduleLabel).toBe(MENU_CONFIG.modules.home!.title);
    const hub = items.find(item => item.id === 'amz_hub_overview');
    expect(hub?.moduleLabel).toBe(MENU_CONFIG.modules.amz_hub!.title);
  });

  it('carries category for categorized routes and empty keywords by default', () => {
    const items = buildCommandIndex();
    const categorized = items.filter(item => item.kind === 'route' && !!item.category);
    expect(categorized.length).toBeGreaterThan(0);
    for (const item of categorized) {
      expect(typeof item.category).toBe('string');
      expect(item.keywords).toBeUndefined();
    }
  });

  it('assembles action items after route items', () => {
    const action = {
      kind: 'action' as const,
      id: 'test-action',
      label: '测试动作',
      icon: 'fas fa-bolt',
      moduleLabel: '',
      moduleId: '',
      keywords: ['测试'],
      execute: () => undefined,
    };
    const items = buildCommandIndex(ROUTE_MANIFESTS, { actionItems: [action] });
    expect(items[items.length - 1]).toBe(action);
    const routeCount = ROUTE_MANIFESTS.reduce((sum, m) => sum + m.routes.length, 0);
    expect(items[routeCount]).toBe(action);
  });

  it('merges routeKeywords into route items', () => {
    const items = buildCommandIndex(ROUTE_MANIFESTS, {
      routeKeywords: { home: ['主页', 'splash'] },
    });
    const home = items.find(item => item.id === 'home');
    expect(home?.keywords).toEqual(['主页', 'splash']);
  });
});

describe('filterByModule', () => {
  it('keeps only routes of the given module and drops actions', () => {
    const items = buildCommandIndex(ROUTE_MANIFESTS, {
      actionItems: [
        {
          kind: 'action' as const,
          id: 'act',
          label: '动作',
          icon: '',
          moduleLabel: '',
          moduleId: '',
          keywords: [],
          execute: () => undefined,
        },
      ],
    });
    const scoped = filterByModule(items, 'amz_hub');
    expect(scoped.length).toBeGreaterThan(0);
    expect(scoped.every(item => item.moduleId === 'amz_hub')).toBe(true);
    expect(scoped.some(item => item.kind === 'action')).toBe(false);
  });

  it('returns all items when moduleId is empty', () => {
    const items = buildCommandIndex();
    expect(filterByModule(items, '')).toBe(items);
  });
});
