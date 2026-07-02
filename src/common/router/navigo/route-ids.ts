/**
 * route-ids.ts - 路由 ID 类型与运行时校验
 *
 * 路由 ID 来自各模块 module.manifest.ts，请勿在此手写 routeId。
 */

import { ALL_ROUTE_ID_VALUES, type RouteId } from '@/common/constants/routes';
import { ValidationError } from '@/common/errors/AppError';

export type { RouteId };

/**
 * 所有路由 ID 的数组（用于运行时检查）。
 */
export const ALL_ROUTE_IDS: readonly RouteId[] = ALL_ROUTE_ID_VALUES;

/**
 * 检查给定的字符串是否为有效的路由 ID。
 */
export function isValidRouteId(id: string): id is RouteId {
  return (ALL_ROUTE_IDS as readonly string[]).includes(id);
}

/**
 * 断言给定的字符串是有效的路由 ID。
 */
export function assertValidRouteId(id: string): asserts id is RouteId {
  if (!isValidRouteId(id)) {
    throw new ValidationError(
      `Invalid route ID: "${id}". Must be one of: ${ALL_ROUTE_IDS.join(', ')}`,
      'INVALID_ROUTE_ID',
      'id',
      id
    );
  }
}

/**
 * 路由 ID 统计信息。
 */
export const ROUTE_ID_STATS = {
  total: ALL_ROUTE_IDS.length,
  source: 'module.manifest.ts',
} as const;
