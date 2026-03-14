/**
 * RouteConfigConverter.ts - 路由配置转换器
 *
 * 将 MENU_CONFIG 格式转换为 Navigo 路由配置
 */

import type { RouteConfig as NavigoRouteConfig } from './types';
import type { RouteConfig as MenuRouteConfig, MenuConfig } from '../../config/menuConfig';
import { SystemError } from '@/common/errors/AppError';

/**
 * 转换选项
 */
export interface ConversionOptions {
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否验证配置 */
  validate?: boolean;
  /** 路由路径前缀 */
  pathPrefix?: string;
}

/**
 * 转换结果
 */
export interface ConversionResult {
  /** 转换后的路由配置 */
  routes: Record<string, NavigoRouteConfig>;
  /** 路由别名映射 */
  aliases: Record<string, string>;
  /** 转换统计 */
  stats: {
    total: number;
    success: number;
    failed: number;
    aliases: number;
  };
  /** 错误信息 */
  errors: Array<{ routeId: string; error: string }>;
}

/**
 * 路由配置转换器
 */
export class RouteConfigConverter {
  private options: Required<ConversionOptions>;

  constructor(options: ConversionOptions = {}) {
    this.options = {
      enableLogging: options.enableLogging || false,
      validate: options.validate !== false,
      pathPrefix: options.pathPrefix || '',
    };
  }

  /**
   * 转换整个菜单配置
   *
   * @param menuConfig - 菜单配置对象
   * @returns 转换结果
   */
  convert(menuConfig: MenuConfig): ConversionResult {
    const routes: Record<string, NavigoRouteConfig> = {};
    const aliases: Record<string, string> = {};
    const errors: Array<{ routeId: string; error: string }> = [];

    let successCount = 0;
    let failedCount = 0;

    // 转换每个路由
    for (const [routeId, menuRoute] of Object.entries(menuConfig.routes)) {
      try {
        const navigoRoute = this._convertRoute(routeId, menuRoute, menuConfig);

        if (navigoRoute) {
          routes[routeId] = navigoRoute;
          successCount++;

          this._log(`✓ Converted route: ${routeId}`);
        } else {
          failedCount++;
          errors.push({
            routeId,
            error: 'Conversion returned null',
          });
        }
      } catch (error) {
        failedCount++;
        errors.push({
          routeId,
          error: (error as Error).message,
        });

        this._log(`✗ Failed to convert route: ${routeId}`, error, 'error');
      }
    }

    // 生成路由别名
    this._generateAliases(menuConfig, aliases);

    const result: ConversionResult = {
      routes,
      aliases,
      stats: {
        total: Object.keys(menuConfig.routes).length,
        success: successCount,
        failed: failedCount,
        aliases: Object.keys(aliases).length,
      },
      errors,
    };

    this._log('Conversion completed', result.stats);

    return result;
  }

  /**
   * 转换单个路由
   *
   * @param routeId - 路由 ID
   * @param menuRoute - 菜单路由配置
   * @param menuConfig - 完整菜单配置（用于查找模块信息）
   * @returns Navigo 路由配置
   */
  private _convertRoute(
    _routeId: string,
    menuRoute: MenuRouteConfig,
    menuConfig: MenuConfig
  ): NavigoRouteConfig | null {
    // 获取模块信息
    const module = menuConfig.modules[menuRoute.moduleId];
    if (!module) {
      throw new SystemError(
        `Module not found: ${menuRoute.moduleId}`,
        'ROUTE_MODULE_NOT_FOUND',
        { module: 'RouteConfigConverter', action: 'convertRoute', moduleId: menuRoute.moduleId }
      );
    }

    // 构建路由元信息
    const meta: NavigoRouteConfig['meta'] = {
      title: menuRoute.label,
      // 可以根据需要添加更多元信息
      keepAlive: false,
    };

    // 构建 Navigo 路由配置
    const navigoRoute: NavigoRouteConfig = {
      moduleId: menuRoute.moduleId,
      label: menuRoute.label,
      icon: menuRoute.icon,
      panelId: menuRoute.panelId,
      category: menuRoute.category,
      viewPath: menuRoute.viewPath,
      meta,
    };

    return navigoRoute;
  }

  /**
   * 生成路由别名
   *
   * 为总览页面创建别名，例如：
   * - /sops -> /sops/overview
   * - /app_center -> /app_center/overview
   *
   * @param menuConfig - 菜单配置
   * @param aliases - 别名映射对象（会被修改）
   */
  private _generateAliases(menuConfig: MenuConfig, aliases: Record<string, string>): void {
    // 定义需要创建别名的模块
    const moduleAliases: Record<string, string> = {
      sops: 'sops_overview',
      app_center: 'app_center_overview',
      amz_hub_core: 'amz_hub_overview',
      more_core: 'more_overview',
    };

    for (const [moduleId, overviewRouteId] of Object.entries(moduleAliases)) {
      // 检查目标路由是否存在
      if (menuConfig.routes[overviewRouteId]) {
        const aliasPath = `/${moduleId}`;
        const targetPath = `/${overviewRouteId}`;

        aliases[aliasPath] = targetPath;

        this._log(`Created alias: ${aliasPath} -> ${targetPath}`);
      }
    }
  }

  /**
   * 验证转换后的配置
   *
   * @param routes - 转换后的路由配置
   * @returns 验证结果
   */
  validate(routes: Record<string, NavigoRouteConfig>): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const [routeId, config] of Object.entries(routes)) {
      // 检查必需字段
      if (!config.moduleId) {
        errors.push(`${routeId}: missing moduleId`);
      }
      if (!config.label) {
        errors.push(`${routeId}: missing label`);
      }
      if (!config.icon) {
        errors.push(`${routeId}: missing icon`);
      }
      if (!config.panelId) {
        errors.push(`${routeId}: missing panelId`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 日志输出
   */
  private _log(message: string, data?: unknown, level: 'log' | 'error' | 'warn' = 'log'): void {
    if (!this.options.enableLogging) return;

    const prefix = '[RouteConfigConverter]';

    if (data !== undefined) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }
}

/**
 * 创建路由配置转换器
 */
export function createConverter(options?: ConversionOptions): RouteConfigConverter {
  return new RouteConfigConverter(options);
}

/**
 * 快速转换函数
 *
 * @param menuConfig - 菜单配置
 * @param options - 转换选项
 * @returns 转换结果
 */
export function convertMenuConfig(
  menuConfig: MenuConfig,
  options?: ConversionOptions
): ConversionResult {
  const converter = new RouteConfigConverter(options);
  return converter.convert(menuConfig);
}
