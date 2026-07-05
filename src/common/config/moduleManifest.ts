import type { ModuleLoaderFn, ModuleMap } from '@/types/modules-business';
import type { RouteMeta } from '@/common/router/navigo/types';

export interface ModuleManifestRoute {
  key: string;
  routeId: string;
  path?: string;
  moduleId?: string;
  label: string;
  icon: string;
  category?: string;
  panelId?: string;
  viewPath?: string;
  loaderPath?: string;
  meta?: RouteMeta;
  loader?: ModuleLoaderFn;
}

export interface ModuleManifest {
  moduleId: string;
  panelId: string;
  routes: readonly ModuleManifestRoute[];
}

export interface ManifestRouteConfig {
  moduleId: string;
  label: string;
  icon: string;
  panelId: string;
  category?: string;
  viewPath?: string;
  meta?: RouteMeta;
}

type RouteConstants<T extends ModuleManifest> = {
  [Route in T['routes'][number] as Route['key']]: Route['routeId'];
};

export function defineModuleManifest<const T extends ModuleManifest>(manifest: T): T {
  return manifest;
}

export function buildRouteConstants<const T extends ModuleManifest>(
  manifest: T
): RouteConstants<T> {
  return Object.fromEntries(
    manifest.routes.map(route => [route.key, route.routeId])
  ) as RouteConstants<T>;
}

export function collectRouteIds<const T extends readonly ModuleManifest[]>(
  manifests: T
): readonly T[number]['routes'][number]['routeId'][] {
  return manifests.flatMap(manifest =>
    manifest.routes.map(route => route.routeId)
  ) as readonly T[number]['routes'][number]['routeId'][];
}

export function buildRoutePathMap(manifests: readonly ModuleManifest[]): Record<string, string> {
  const paths: Record<string, string> = {};

  for (const manifest of manifests) {
    for (const route of manifest.routes) {
      if (route.path) {
        paths[route.routeId] = route.path;
      }
    }
  }

  return paths;
}

export function buildMenuRoutes(
  manifests: readonly ModuleManifest[]
): Record<string, ManifestRouteConfig> {
  const routes: Record<string, ManifestRouteConfig> = {};

  for (const manifest of manifests) {
    for (const route of manifest.routes) {
      const routeConfig: ManifestRouteConfig = {
        moduleId: route.moduleId ?? manifest.moduleId,
        label: route.label,
        icon: route.icon,
        panelId: route.panelId ?? manifest.panelId,
      };

      if (route.category) {
        routeConfig.category = route.category;
      }

      if (route.viewPath) {
        routeConfig.viewPath = route.viewPath;
      }

      if (route.meta) {
        routeConfig.meta = route.meta;
      }

      routes[route.routeId] = routeConfig;
    }
  }

  return routes;
}

export function buildModuleMap(manifest: ModuleManifest): ModuleMap {
  const moduleMap: ModuleMap = {};

  for (const route of manifest.routes) {
    if (route.loader) {
      moduleMap[route.routeId] = route.loader;
    }
  }

  return moduleMap;
}

export function buildModuleMapFromLoaderPaths(
  manifest: ModuleManifest,
  loaders: Record<string, ModuleLoaderFn>
): ModuleMap {
  const moduleMap: ModuleMap = {};

  for (const route of manifest.routes) {
    if (!route.loaderPath) {
      continue;
    }

    const loader = loaders[route.loaderPath];
    if (!loader) {
      throw new Error(
        `Manifest route "${route.routeId}" declares loaderPath "${route.loaderPath}" but no loader was generated`
      );
    }

    moduleMap[route.routeId] = loader;
  }

  return moduleMap;
}
