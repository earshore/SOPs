import eventBus from '../EventBus';
import { APP_EVENTS } from '../constants/eventConstants';
import { isValidRouteId, type RouteId } from '../constants/routes';

function normalizeRouteId(routeId: unknown): RouteId | null {
  if (typeof routeId !== 'string') {
    return null;
  }

  const normalizedRouteId = routeId.trim();
  return isValidRouteId(normalizedRouteId) ? normalizedRouteId : null;
}

export function emitRouteChange(routeId: unknown): boolean {
  const normalizedRouteId = normalizeRouteId(routeId);
  if (!normalizedRouteId) {
    console.warn('[routeEvents] Ignored route-change for unknown routeId:', routeId);
    return false;
  }

  eventBus.emit(APP_EVENTS.ROUTE_CHANGE, { routeId: normalizedRouteId });
  return true;
}
