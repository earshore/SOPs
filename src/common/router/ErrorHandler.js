// src/common/router/ErrorHandler.js
// ================================================================
// 🎯 路由错误处理器
// 统一处理路由相关的错误
// ================================================================

import { render404, renderError } from './NotFound.js';

/**
 * 路由错误处理器
 */
export class RouteErrorHandler {
  constructor() {
    this.errorHandlers = new Map();
    this._registerDefaultHandlers();
  }

  /**
   * 注册错误处理器
   * @param {string} errorType - 错误类型
   * @param {Function} handler - 处理函数 (error, context) => void
   */
  register(errorType, handler) {
    this.errorHandlers.set(errorType, handler);
    console.log(`✅ [RouteErrorHandler] 已注册 ${errorType} 处理器`);
  }

  /**
   * 处理路由错误
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  handle(error, context = {}) {
    const { routeId, from, to } = context;
    
    // 分类错误
    const errorType = this._classifyError(error);
    
    console.error(`❌ [RouteErrorHandler] ${errorType}:`, error.message, context);
    
    // 执行对应的错误处理器
    const handler = this.errorHandlers.get(errorType);
    if (handler) {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.error(`❌ [RouteErrorHandler] 处理器执行失败:`, handlerError);
        this.defaultHandler(error, context);
      }
    } else {
      this.defaultHandler(error, context);
    }
  }

  /**
   * 默认错误处理器
   * @param {Error} error - 错误对象
   * @param {Object} context - 上下文信息
   */
  defaultHandler(error, context) {
    console.error('[RouteErrorHandler] 默认处理器:', error, context);
    
    // 尝试显示错误提示
    if (typeof window !== 'undefined' && window.showToast) {
      window.showToast('页面加载失败，请重试', 'error');
    }
  }

  /**
   * 分类错误
   * @private
   * @param {Error} error - 错误对象
   * @returns {string} 错误类型
   */
  _classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('not found') || message.includes('不存在')) {
      return 'NOT_FOUND';
    } else if (message.includes('permission') || message.includes('权限')) {
      return 'PERMISSION_DENIED';
    } else if (message.includes('load') || message.includes('加载')) {
      return 'LOAD_FAILED';
    } else if (message.includes('timeout') || message.includes('超时')) {
      return 'TIMEOUT';
    } else if (message.includes('network') || message.includes('网络')) {
      return 'NETWORK_ERROR';
    }
    
    return 'UNKNOWN';
  }

  /**
   * 注册默认处理器
   * @private
   */
  _registerDefaultHandlers() {
    // 404处理器
    this.register('NOT_FOUND', (error, context) => {
      const container = document.getElementById('main-content') || document.body;
      render404(container, context.routeId);
    });

    // 权限错误处理器
    this.register('PERMISSION_DENIED', (error, context) => {
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('您没有权限访问此页面', 'warning');
      }
      // 重定向到首页
      if (typeof window !== 'undefined' && window.switchTab) {
        setTimeout(() => window.switchTab('home', false), 1000);
      }
    });

    // 加载失败处理器
    this.register('LOAD_FAILED', (error, context) => {
      const container = document.getElementById('main-content') || document.body;
      renderError(container, error, context.routeId);
      
      // 可选：自动重试
      if (context.retryCount < 2) {
        console.log(`🔄 [RouteErrorHandler] 将在2秒后重试...`);
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.switchTab) {
            window.switchTab(context.routeId, false);
          }
        }, 2000);
      }
    });

    // 超时处理器
    this.register('TIMEOUT', (error, context) => {
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('页面加载超时，请检查网络连接', 'error');
      }
    });

    // 网络错误处理器
    this.register('NETWORK_ERROR', (error, context) => {
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast('网络连接失败，请检查网络设置', 'error');
      }
    });
  }

  /**
   * 清空所有处理器
   */
  clearHandlers() {
    this.errorHandlers.clear();
    this._registerDefaultHandlers();
    console.log('✅ [RouteErrorHandler] 已重置所有处理器');
  }

  /**
   * 获取已注册的错误类型
   * @returns {string[]}
   */
  getRegisteredTypes() {
    return Array.from(this.errorHandlers.keys());
  }
}

// 创建全局实例
export const routeErrorHandler = new RouteErrorHandler();

export default routeErrorHandler;
