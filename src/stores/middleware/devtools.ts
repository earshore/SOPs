// src/stores/middleware/devtools.ts
// ================================================================
// 🎯 P1-8 阶段9: Zustand DevTools中间件
// 自定义vanilla版本的devtools middleware
// ================================================================

import type { StoreApi } from 'zustand/vanilla';

/**
 * DevTools配置
 */
export interface DevtoolsOptions {
  /** DevTools名称 */
  name?: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 是否匿名化action */
  anonymousActionType?: string;
}

/**
 * Redux DevTools Extension接口
 */
interface ReduxDevtoolsExtension {
  connect(options: any): {
    init(state: any): void;
    send(action: any, state: any): void;
    subscribe(listener: (message: any) => void): () => void;
  };
}

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: ReduxDevtoolsExtension;
  }
}

/**
 * DevTools中间件
 * 集成Redux DevTools Extension
 */
export const devtools = <T extends object>(
  config: (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']) => T,
  options: DevtoolsOptions = {}
) => {
  const {
    name = 'AppStore',
    enabled = process.env.NODE_ENV === 'development',
    anonymousActionType = 'anonymous'
  } = options;

  return (set: StoreApi<T>['setState'], get: StoreApi<T>['getState']): T => {
    // 检查是否启用DevTools
    if (!enabled || typeof window === 'undefined' || !window.__REDUX_DEVTOOLS_EXTENSION__) {
      return config(set, get);
    }

    // 连接DevTools
    const extension = window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name });
    
    // 创建初始状态
    const initialState = config(set, get);
    
    // 初始化DevTools
    extension.init(initialState);

    // 包装set方法以发送action到DevTools
    const devtoolsSet: typeof set = (partial, replace) => {
      // 根据replace参数调用正确的重载
      if (replace === true) {
        (set as any)(partial, true);
      } else {
        set(partial, replace);
      }
      const nextState = get();

      // 发送action到DevTools
      extension.send(
        {
          type: anonymousActionType,
          payload: typeof partial === 'function' ? undefined : partial
        },
        nextState
      );
    };

    // 监听DevTools的时间旅行
    extension.subscribe((message: any) => {
      if (message.type === 'DISPATCH' && message.state) {
        try {
          const newState = JSON.parse(message.state);
          // 使用replace=true强制替换整个状态
          (set as any)(newState, true);
        } catch (error) {
          console.error('[DevTools] 时间旅行失败:', error);
        }
      }
    });

    // 使用包装后的set重新初始化
    config(devtoolsSet, get);

    return initialState;
  };
};

/**
 * 开发工具助手
 */
export const devtoolsHelper = {
  /**
   * 检查DevTools是否可用
   */
  isAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.__REDUX_DEVTOOLS_EXTENSION__;
  },

  /**
   * 记录状态变化
   */
  logStateChange(storeName: string, action: string, prevState: any, nextState: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.group(`[${storeName}] ${action}`);
      console.log('Previous State:', prevState);
      console.log('Next State:', nextState);
      console.groupEnd();
    }
  }
};
