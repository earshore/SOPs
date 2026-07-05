import { describe, expect, it } from 'vitest';
import { MENU_CONFIG } from '@/common/config/menuConfig';
import { BUSINESS_ROUTE_MANIFESTS, ROUTE_MANIFESTS } from '@/common/config/routeManifests';
import { buildModuleMap, buildModuleMapFromLoaderPaths } from '@/common/config/moduleManifest';
import { ALL_ROUTE_ID_VALUES } from '@/common/constants/routes';
import type { ModuleLoaderFn } from '@/types/modules-business';

describe('module manifests', () => {
  const manifestRouteIds = ROUTE_MANIFESTS.flatMap(manifest =>
    manifest.routes.map(route => route.routeId)
  );

  it('derive the menu route table from every manifest route', () => {
    expect(Object.keys(MENU_CONFIG.routes)).toEqual(manifestRouteIds);
  });

  it('derive route id constants from every manifest route', () => {
    expect(ALL_ROUTE_ID_VALUES).toEqual(manifestRouteIds);
  });

  it('preserves route meta from manifests', () => {
    expect(MENU_CONFIG.routes.playground?.meta).toMatchObject({
      requiresAuth: false,
      accessPolicy: 'product_allowed_without_auth',
      featureFlag: 'playground.deepChat',
      featureFlagDefault: true,
    });
  });

  it('derive module maps from manifest loader paths', () => {
    for (const manifest of BUSINESS_ROUTE_MANIFESTS) {
      const routesWithLoaders = manifest.routes
        .filter(route => route.loaderPath)
        .map(route => route.routeId);
      const loaders = Object.fromEntries(
        manifest.routes
          .filter(route => route.loaderPath)
          .map(route => [route.loaderPath, async () => ({ mount: () => undefined })])
      ) as Record<string, ModuleLoaderFn>;

      expect(Object.keys(buildModuleMapFromLoaderPaths(manifest, loaders))).toEqual(
        routesWithLoaders
      );
    }
  });

  it('fails fast when a manifest loader path has no generated loader', () => {
    expect(() =>
      buildModuleMapFromLoaderPaths(
        {
          moduleId: 'test',
          panelId: 'panel-test',
          routes: [
            {
              key: 'TEST',
              routeId: 'test_route',
              path: '/test',
              label: 'Test',
              icon: 'test',
              loaderPath: './views/test/index.ts',
            },
          ],
        },
        {}
      )
    ).toThrow('no loader was generated');
  });

  it('keeps direct manifest loaders supported for plugin-style manifests', () => {
    const moduleMap = buildModuleMap({
      moduleId: 'test',
      panelId: 'panel-test',
      routes: [
        {
          key: 'TEST',
          routeId: 'test_route',
          path: '/test',
          label: 'Test',
          icon: 'test',
          loader: async () => ({ mount: () => undefined }),
        },
      ],
    });

    expect(Object.keys(moduleMap)).toEqual(['test_route']);
  });
});
