export interface LegacyRouteAlias {
  alias: string;
  routeId: string;
  replace: boolean;
}

export const LEGACY_ROUTE_ALIASES = [
  {
    alias: '/ppc_search_terms',
    routeId: 'ppc_search_terms',
    replace: true,
  },
  {
    alias: '/app-center/playground',
    routeId: 'playground',
    replace: true,
  },
] as const satisfies readonly LegacyRouteAlias[];

function normalizeLegacyAliasPath(path: string): string {
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

export function getLegacyRouteAlias(path: string): LegacyRouteAlias | null {
  const normalizedPath = normalizeLegacyAliasPath(path);
  return LEGACY_ROUTE_ALIASES.find(alias => alias.alias === normalizedPath) ?? null;
}

export function shouldReplaceLegacyRoute(path: string): boolean {
  return getLegacyRouteAlias(path)?.replace ?? false;
}
