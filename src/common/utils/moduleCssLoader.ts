/**
 * 模块CSS懒加载器
 * 根据路由自动加载模块所需的CSS文件
 * 使用动态import确保生产环境路径正确
 */

import { MODULE_CSS_REGISTRY, getModuleAllCssImporters, type ModuleCssConfig } from '../config/moduleCssRegistry';

import { Logger } from '../../services/loggerService';
class ModuleCssLoader {
  private loadedModules = new Set<string>();
  private loadingModules = new Map<string, Promise<void>>();
  
  /**
   * 加载模块CSS
   */
  async loadModuleCSS(moduleId: string): Promise<void> {
    // 检查是否已加载
    if (this.loadedModules.has(moduleId)) {
      return;
    }
    
    // 检查是否正在加载
    if (this.loadingModules.has(moduleId)) {
      return this.loadingModules.get(moduleId)!;
    }
    
    // 获取模块配置
    const config = MODULE_CSS_REGISTRY[moduleId];
    if (!config) {
      Logger.warn(`[ModuleCssLoader] 模块CSS配置未找到: ${moduleId}`);
      return;
    }
    
    // 创建加载Promise
    const loadPromise = this.loadModuleCSSImpl(config);
    this.loadingModules.set(moduleId, loadPromise);
    
    try {
      await loadPromise;
      this.loadedModules.add(moduleId);
    } finally {
      this.loadingModules.delete(moduleId);
    }
  }
  
  /**
   * 实际加载实现
   */
  private async loadModuleCSSImpl(config: ModuleCssConfig): Promise<void> {
    const allImporters = getModuleAllCssImporters(config.moduleId);
    
    if (allImporters.length === 0) {
      return;
    }
    
    Logger.debug(`[ModuleCssLoader] 加载模块CSS: ${config.moduleId}`);
    
    try {
      // 并行加载所有CSS
      await Promise.all(allImporters.map(importer => importer()));
    } catch (error) {
      Logger.error(`[ModuleCssLoader] 模块CSS加载失败: ${config.moduleId}`, error);
      throw error;
    }
  }
  
  /**
   * 预加载模块CSS
   */
  async preloadModuleCSS(moduleId: string): Promise<void> {
    const config = MODULE_CSS_REGISTRY[moduleId];
    if (!config || !config.preload) {
      return;
    }
    
    await this.loadModuleCSS(moduleId);
  }
  
  /**
   * 批量预加载高优先级模块
   */
  async preloadHighPriorityModules(): Promise<void> {
    const highPriorityModules = Object.values(MODULE_CSS_REGISTRY)
      .filter(config => config.preload && config.priority === 'high');
    
    await Promise.all(
      highPriorityModules.map(config => this.preloadModuleCSS(config.moduleId))
    );
  }
  
  /**
   * 检查模块CSS是否已加载
   */
  isModuleLoaded(moduleId: string): boolean {
    return this.loadedModules.has(moduleId);
  }
  
  /**
   * 获取加载统计
   */
  getStats(): { loaded: number; loading: number } {
    return {
      loaded: this.loadedModules.size,
      loading: this.loadingModules.size
    };
  }
}

// 导出单例
export const moduleCssLoader = new ModuleCssLoader();
