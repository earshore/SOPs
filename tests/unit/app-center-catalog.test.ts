import { describe, expect, it } from 'vitest';
import {
  APP_CENTER_CATALOG_CATEGORIES,
  APP_CENTER_CATALOG_GROUPS,
  getAppCenterCatalogCategoryCounts,
  getAppCenterCatalogRouteIds,
} from '@/modules/app_center/appCatalog';
import { appCenterManifest } from '@/modules/app_center/module.manifest';

describe('App Center catalog', () => {
  it('keeps catalog route ids aligned with the App Center manifest', () => {
    const catalogedManifestRouteIds = appCenterManifest.routes
      .filter(route => route.routeId !== 'app_center_overview')
      .map(route => route.routeId);
    const catalogRouteIds = getAppCenterCatalogRouteIds();

    expect(APP_CENTER_CATALOG_GROUPS).toHaveLength(4);
    expect(new Set(APP_CENTER_CATALOG_GROUPS.map(group => group.id)).size).toBe(
      APP_CENTER_CATALOG_GROUPS.length
    );

    APP_CENTER_CATALOG_GROUPS.forEach(group => {
      expect(group.routeIds.length).toBeGreaterThan(0);
      expect(group.routeIds).toContain(group.primaryRouteId);
      expect(group.title.trim()).not.toBe('');
      expect(group.description.trim()).not.toBe('');
      expect(group.searchKeywords.length).toBeGreaterThan(0);

      group.routeIds.forEach(routeId => {
        expect(catalogedManifestRouteIds.includes(routeId), `${group.id}:${routeId}`).toBe(true);
      });
    });

    expect(catalogRouteIds).toEqual(catalogedManifestRouteIds);
  });

  it('exposes category counts from catalog groups, not hand-written overview numbers', () => {
    expect(APP_CENTER_CATALOG_CATEGORIES.map(category => category.id)).toEqual([
      'master_analysis',
      'playground',
      'keyword_hunter',
      'ppc_tools',
    ]);
    expect(getAppCenterCatalogCategoryCounts()).toEqual({
      all: 4,
      master_analysis: 1,
      playground: 1,
      keyword_hunter: 1,
      ppc_tools: 1,
    });
  });
});
