/**
 * 模块CSS懒加载器
 * 根据路由自动加载模块所需的CSS文件
 */

import { cssLoader } from './cssLoader';
import { MODULE_CSS_REGISTRY, getModuleAllCssFiles, type ModuleCssConfig } from '../config/moduleCssRegistry';

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
      console.warn(`[ModuleCssLoader] 模块CSS配置未找到: ${moduleId}`);
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
    const allFiles = getModuleAllCssFiles(config.moduleId);
    
    if (allFiles.length === 0) {
      return;
    }
    
    console.log(`[ModuleCssLoader] 加载模块CSS: ${config.moduleId}`, allFiles);
    
    try {
      const results = await cssLoader.loadCSSBatch(allFiles);
      
      // 检查是否有加载失败
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        console.warn(`[ModuleCssLoader] 部分CSS加载失败:`, failed);
      }
    } catch (error) {
      console.error(`[ModuleCssLoader] 模块CSS加载失败: ${config.moduleId}`, error);
      throw error;
    }
  }
  
  /**
   * 预加载模块CSS
   */
  preloadModuleCSS(moduleId: string): void {
    const config = MODULE_CSS_REGISTRY[moduleId];
    if (!config || !config.preload) {
      return;
    }
    
    const allFiles = getModuleAllCssFiles(moduleId);
    allFiles.forEach(file => cssLoader.preloadCSS(file));
  }
  
  /**
   * 批量预加载高优先级模块
   */
  preloadHighPriorityModules(): void {
    Object.values(MODULE_CSS_REGISTRY)
      .filter(config => config.preload && config.priority === 'high')
      .forEach(config => this.preloadModuleCSS(config.moduleId));
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
