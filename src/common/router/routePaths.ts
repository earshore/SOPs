import { buildRoutePathMap } from '../config/moduleManifest';
import { ROUTE_MANIFESTS } from '../config/routeManifests';

const ROUTE_PATHS = buildRoutePathMap(ROUTE_MANIFESTS);

export function normalizeRoutePath(path: string): string {
  let normalized = path.trim().replace(/^#/, '');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/^\/+/, '/');

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

export function routeIdToPath(routeId: string): string {
  const cleanRouteId = routeId.trim();

  if (cleanRouteId.startsWith('#') || cleanRouteId.startsWith('/')) {
    return normalizeRoutePath(cleanRouteId);
  }

  return normalizeRoutePath(ROUTE_PATHS[cleanRouteId] || cleanRouteId);
}
