import { APP_CENTER_ROUTES } from '../constants/routes';

const APP_CENTER_ROUTE_PATHS: Record<string, string> = {
  [APP_CENTER_ROUTES.OVERVIEW]: '/app-center',
  [APP_CENTER_ROUTES.SCRAPER]: '/app-center/scraper',
  [APP_CENTER_ROUTES.AI_ANALYSIS]: '/app-center/ai-analysis',
  [APP_CENTER_ROUTES.PROMPTLAB]: '/app-center/promptlab',
  [APP_CENTER_ROUTES.PPC_SEARCH_TERMS]: '/app-center/ppc-search-terms',
  [APP_CENTER_ROUTES.KW_INPUT]: '/app-center/keyword-hunter/input',
  [APP_CENTER_ROUTES.KW_PROCESS]: '/app-center/keyword-hunter/process',
  [APP_CENTER_ROUTES.KW_ANALYSIS]: '/app-center/keyword-hunter/analysis',
  [APP_CENTER_ROUTES.KW_HISTORY]: '/app-center/keyword-hunter/history',
  [APP_CENTER_ROUTES.PLAYGROUND]: '/app-center/playground/deep-chat',
};

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

  return APP_CENTER_ROUTE_PATHS[cleanRouteId] || normalizeRoutePath(cleanRouteId);
}
