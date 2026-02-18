// src/common/router/ErrorHandler.ts
// ================================================================
// 🎯 路由错误处理器（TypeScript版本）
// 统一处理路由相关的错误
// ================================================================

import type { RouteErrorContext, RouteErrorHandler } from '../../types/config';
import { render404, renderError } from './NotFound';

type ErrorType = 'NOT_FOUND' | 'PERMISSION_DENIED' | 'LOAD_FAILED' | 'TIMEOUT' | 'NETWORK_ERROR' | 'UNKNOWN';

/**
 * 路由错误处理器
 */
export class RouteErrorHandlerManager {
  private errorHandlers: Map<ErrorType, RouteErrorHandler>;

  constructor() {
    this.errorHandlers = new Map();
    this._registerDefaultHandlers();
  }

  /**
   * 注册错误处理器
   * @param errorType - 错误类型
   * @param handler - 处理函数 (error, context) => void
   */
  register(errorType: ErrorType, handler: RouteErrorHandler): void {
    this.errorHandlers.set(errorType, handler);
    console.log(`✅ [RouteErrorHandler] 已注册 ${errorType} 处理器`);
  }

  /**
   * 处理路由错误
   * @param error - 错误对象
   * @param context - 上下文信息
   */
  handle(error: Error, context: RouteErrorContext = {}): void {
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
   * @param error - 错误对象
   * @param context - 上下文信息
   */
  defaultHandler(error: Error, context: RouteErrorContext): void {
    console.error('[RouteErrorHandler] 默认处理器:', error, context);
    
    // 尝试显示错误提示
    const w = window as Window & { showToast?: (message: string, type: string) => void };
    if (typeof window !== 'undefined' && w.showToast) {
      w.showToast('页面加载失败，请重试', 'error');
    }
  }

  /**
   * 分类错误
   * @private
   * @param error - 错误对象
   * @returns 错误类型
   */
  private _classifyError(error: Error): ErrorType {
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
  private _registerDefaultHandlers(): void {
    // 404处理器
    this.register('NOT_FOUND', (_error: Error, context: RouteErrorContext) => {
      const container = document.getElementById('main-content') || document.body;
      render404(container, context.routeId);
    });

    // 权限错误处理器
    this.register('PERMISSION_DENIED', (_error: Error, _context: RouteErrorContext) => {
      const w = window as Window & { 
        showToast?: (message: string, type: string) => void;
        switchTab?: (tab: string, updateHistory: boolean) => void;
      };
      if (typeof window !== 'undefined' && w.showToast) {
        w.showToast('您没有权限访问此页面', 'warning');
      }
      // 重定向到首页
      if (typeof window !== 'undefined' && w.switchTab) {
        setTimeout(() => w.switchTab!('home', false), 1000);
      }
    });

    // 加载失败处理器
    this.register('LOAD_FAILED', (error: Error, context: RouteErrorContext) => {
      const container = document.getElementById('main-content') || document.body;
      renderError(container, error, context.routeId);
      
      // 可选：自动重试
      const retryCount = context.retryCount || 0;
      if (retryCount < 2) {
        console.log(`🔄 [RouteErrorHandler] 将在2秒后重试...`);
        setTimeout(() => {
          const w = window as Window & { switchTab?: (tab: string, updateHistory: boolean) => void };
          if (typeof window !== 'undefined' && w.switchTab) {
            w.switchTab(context.routeId || '', false);
          }
        }, 2000);
      }
    });

    // 超时处理器
    this.register('TIMEOUT', (_error: Error, _context: RouteErrorContext) => {
      const w = window as Window & { showToast?: (message: string, type: string) => void };
      if (typeof window !== 'undefined' && w.showToast) {
        w.showToast('页面加载超时，请检查网络连接', 'error');
      }
    });

    // 网络错误处理器
    this.register('NETWORK_ERROR', (_error: Error, _context: RouteErrorContext) => {
      const w = window as Window & { showToast?: (message: string, type: string) => void };
      if (typeof window !== 'undefined' && w.showToast) {
        w.showToast('网络连接失败，请检查网络设置', 'error');
      }
    });
  }

  /**
   * 清空所有处理器
   */
  clearHandlers(): void {
    this.errorHandlers.clear();
    this._registerDefaultHandlers();
    console.log('✅ [RouteErrorHandler] 已重置所有处理器');
  }

  /**
   * 获取已注册的错误类型
   * @returns 错误类型数组
   */
  getRegisteredTypes(): ErrorType[] {
    return Array.from(this.errorHandlers.keys());
  }
}

// 创建全局实例
export const routeErrorHandler = new RouteErrorHandlerManager();

export default routeErrorHandler;
