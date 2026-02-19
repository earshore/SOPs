/**
 * ColorContext.ts - 配色上下文管理器
 * 
 * 职责:
 * - 管理当前模块的主题配色
 * - 提供配色推断逻辑（模块 → 分类 → 默认）
 * - 确保通用组件能够自适应上下文配色
 */

import { MENU_CONFIG, getRoutesByModule, type ModuleConfig, type MenuConfig } from '../config/menuConfig';
import type { ColorSchemeName } from '../constants/colorSchemes';
import type { CategoryConfig } from '../components/SidebarRenderer';

// ═══════════════════════════════════════════════════════════
// ColorContext 管理器
// ═══════════════════════════════════════════════════════════

export class ColorContext {
  private static currentModuleColor: ColorSchemeName = 'blue';
  private static colorCache: Map<string, ColorSchemeName> = new Map();

  /**
   * 设置当前模块颜色
   * @param color - 颜色方案名称
   */
  static setModuleColor(color: ColorSchemeName): void {
    this.currentModuleColor = color;
  }

  /**
   * 获取当前模块颜色
   * @returns 当前模块的颜色方案名称
   */
  static getModuleColor(): ColorSchemeName {
    return this.currentModuleColor;
  }

  /**
   * 从模块配置自动推断颜色
   * 
   * 推断优先级:
   * 1. 模块配置中的 themeColor
   * 2. 模块第一个分类的颜色
   * 3. 父模块的颜色
   * 4. 默认颜色 (blue)
   * 
   * @param moduleId - 模块ID
   * @returns 推断出的颜色方案名称
   */
  static inferColorFromModule(moduleId: string): ColorSchemeName {
    // 检查缓存
    if (this.colorCache.has(moduleId)) {
      return this.colorCache.get(moduleId)!;
    }

    const module = MENU_CONFIG.modules[moduleId];
    if (!module) {
      console.warn(`[ColorContext] 模块未找到: ${moduleId}, 使用默认颜色`);
      return 'blue';
    }

    let inferredColor: ColorSchemeName = 'blue';

    // 1. 优先使用模块配置的 themeColor
    if (module.themeColor) {
      inferredColor = this._validateColor(module.themeColor);
    }
    // 2. 从模块的第一个分类推断
    else {
      const categoryColor = this._inferFromCategories(moduleId);
      if (categoryColor) {
        inferredColor = categoryColor;
      }
      // 3. 从父模块推断
      else if (module.parentModuleId) {
        inferredColor = this.inferColorFromModule(module.parentModuleId);
      }
    }

    // 缓存结果
    this.colorCache.set(moduleId, inferredColor);

    console.log(`[ColorContext] 模块 "${moduleId}" 推断颜色: ${inferredColor}`);
    return inferredColor;
  }

  /**
   * 从分类配置推断颜色
   * @param moduleId - 模块ID
   * @returns 推断出的颜色，如果无法推断则返回 null
   * @private
   */
  private static _inferFromCategories(moduleId: string): ColorSchemeName | null {
    const routes = getRoutesByModule(moduleId);
    if (routes.length === 0) return null;

    // 获取第一个有分类的路由
    const routeWithCategory = routes.find(r => r.category);
    if (!routeWithCategory?.category) return null;

    // 查找分类配置
    const category = this._findCategoryById(routeWithCategory.category);
    if (category?.color) {
      return this._validateColor(category.color);
    }

    return null;
  }

  /**
   * 根据分类ID查找分类配置
   * @param categoryId - 分类ID
   * @returns 分类配置对象，如果未找到则返回 null
   * @private
   */
  private static _findCategoryById(categoryId: string): CategoryConfig | null {
    // 搜索所有分类配置
    const categoryKeys: Array<keyof MenuConfig> = ['sopCategories', 'hubCategories', 'moreCategories', 'appCategories'];
    
    for (const key of categoryKeys) {
      const categories = MENU_CONFIG[key] as Record<string, CategoryConfig> | undefined;
      if (categories && categories[categoryId]) {
        return categories[categoryId];
      }
    }

    return null;
  }

  /**
   * 验证颜色名称是否有效
   * @param color - 待验证的颜色名称
   * @returns 有效的颜色名称，无效时返回默认颜色
   * @private
   */
  private static _validateColor(color: string): ColorSchemeName {
    const validColors: ColorSchemeName[] = [
      'blue', 'indigo', 'violet', 'purple',
      'emerald', 'teal', 'green',
      'amber', 'orange',
      'red', 'rose', 'pink',
      'cyan', 'slate', 'lime'
    ];

    if (validColors.includes(color as ColorSchemeName)) {
      return color as ColorSchemeName;
    }

    console.warn(`[ColorContext] 无效的颜色名称: ${color}, 使用默认颜色 blue`);
    return 'blue';
  }

  /**
   * 清除颜色缓存
   * 用于开发调试或配置热更新
   */
  static clearCache(): void {
    this.colorCache.clear();
    console.log('[ColorContext] 颜色缓存已清除');
  }

  /**
   * 获取模块的完整配色方案
   * @param moduleId - 模块ID
   * @returns 包含模块颜色和相关信息的对象
   */
  static getModuleColorScheme(moduleId: string): {
    color: ColorSchemeName;
    module: ModuleConfig | null;
    source: 'config' | 'category' | 'parent' | 'default';
  } {
    const module = MENU_CONFIG.modules[moduleId];
    let color: ColorSchemeName = 'blue';
    let source: 'config' | 'category' | 'parent' | 'default' = 'default';

    if (module?.themeColor) {
      color = this._validateColor(module.themeColor);
      source = 'config';
    } else {
      const categoryColor = this._inferFromCategories(moduleId);
      if (categoryColor) {
        color = categoryColor;
        source = 'category';
      } else if (module?.parentModuleId) {
        color = this.inferColorFromModule(module.parentModuleId);
        source = 'parent';
      }
    }

    return {
      color,
      module: module || null,
      source
    };
  }
}

// ═══════════════════════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════════════════════

export default ColorContext;
