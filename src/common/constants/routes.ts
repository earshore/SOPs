// src/common/constants/routes.ts
// ================================================================
// 路由 ID 常量由各模块 module.manifest.ts 派生。
// ================================================================

import {
  buildRouteConstants,
  collectRouteIds,
} from "../config/moduleManifest";
import {
  amzHubManifest,
  appCenterManifest,
  homeManifest,
  moreManifest,
  ROUTE_MANIFESTS,
  sopsManifest,
} from "../config/routeManifests";

export const SOPS_ROUTES = buildRouteConstants(sopsManifest);
export const APP_CENTER_ROUTES = buildRouteConstants(appCenterManifest);
export const AMZ_HUB_ROUTES = buildRouteConstants(amzHubManifest);
export const MORE_ROUTES = buildRouteConstants(moreManifest);
export const SYSTEM_ROUTES = buildRouteConstants(homeManifest);

/**
 * 路由 ID 集合（保留对象形态，兼容旧调用方）。
 */
export const ALL_ROUTE_IDS = {
  ...SOPS_ROUTES,
  ...APP_CENTER_ROUTES,
  ...AMZ_HUB_ROUTES,
  ...MORE_ROUTES,
  ...SYSTEM_ROUTES,
} as const;

/**
 * 所有路由 ID 的数组（用于运行时检查）。
 */
export const ALL_ROUTE_ID_VALUES = collectRouteIds(ROUTE_MANIFESTS);

/**
 * 所有路由 ID 的联合类型。
 */
export type RouteId = (typeof ALL_ROUTE_ID_VALUES)[number];

/**
 * 检查是否为有效的路由 ID。
 */
export function isValidRouteId(id: string): id is RouteId {
  return (ALL_ROUTE_ID_VALUES as readonly string[]).includes(id);
}

/**
 * 根据路由 ID 获取顶层模块前缀。
 */
export function getRouteModule(routeId: RouteId): string {
  if (routeId.startsWith("sops_")) return "sops";
  if (routeId.startsWith("amz_")) return "amz_hub";
  if (routeId.startsWith("more_")) return "more";
  if (
    routeId.startsWith("kw_") ||
    ([
      APP_CENTER_ROUTES.SCRAPER,
      APP_CENTER_ROUTES.AI_ANALYSIS,
      APP_CENTER_ROUTES.PROMPTLAB,
      APP_CENTER_ROUTES.PPC_SEARCH_TERMS,
      APP_CENTER_ROUTES.PLAYGROUND,
      APP_CENTER_ROUTES.OVERVIEW,
    ] as readonly string[]).includes(routeId)
  ) {
    return "app_center";
  }
  return "system";
}

export default ALL_ROUTE_IDS;
