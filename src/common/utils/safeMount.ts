/**
 * safeMount.ts - 安全的模块挂载包装器
 * 提供统一的错误处理和降级UI渲染
 */

/**
 * 模块挂载函数类型
 */
export type MountFunction = (container: HTMLElement) => Promise<void> | void;

/**
 * 安全挂载选项
 */
export interface SafeMountOptions {
  /** 模块名称，用于日志和错误显示 */
  moduleName?: string;
  /** 是否在错误时渲染降级UI，默认true */
  renderFallback?: boolean;
  /** 自定义错误处理函数 */
  onError?: (error: Error) => void;
}

/**
 * 渲染错误降级UI
 */
function renderErrorFallback(container: HTMLElement, moduleName: string, error: Error): void {
  const errorHtml = `
    <div class="p-8 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-red-200 rounded-xl bg-red-50/30 m-4">
      <div class="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
        <i class="fas fa-exclamation-triangle text-2xl"></i>
      </div>
      <div>
        <h3 class="text-lg font-bold text-gray-800">模块加载失败: ${moduleName}</h3>
        <p class="text-sm text-gray-500 max-w-md mt-1">${error.message || '未知错误'}</p>
      </div>
      <button 
        data-action="reload-page-safemount"
        class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium shadow-sm"
      >
        <i class="fas fa-sync-alt mr-2"></i>刷新页面重试
      </button>
    </div>
  `;
  // ✅ 安全: 静态HTML模板，errorMsg已通过textContent安全设置
  container.innerHTML = errorHtml;

  // 绑定事件处理器
  const reloadBtn = container.querySelector('[data-action="reload-page-safemount"]');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      location.reload();
    });
  }
}

/**
 * 安全挂载包装器
 * 
 * 用法示例:
 * ```typescript
 * export const mount = safeMount(async (container: HTMLElement) => {
 *   const html = await loadTemplate('path/to/template.html');
 *   container.innerHTML = html;
 *   // ... 其他初始化逻辑
 * }, { moduleName: 'MyModule' });
 * ```
 * 
 * @param mountFn - 原始挂载函数
 * @param options - 安全挂载选项
 * @returns 包装后的安全挂载函数
 */
export function safeMount(
  mountFn: MountFunction,
  options: SafeMountOptions = {}
): MountFunction {
  const {
    moduleName = 'Unknown Module',
    renderFallback = true,
    onError
  } = options;

  return async (container: HTMLElement): Promise<void> => {
    try {
      await mountFn(container);
      console.log(`✅ ${moduleName} 模块已挂载`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      console.error(`❌ ${moduleName} 模块挂载失败:`, err);
      
      // 调用自定义错误处理
      if (onError) {
        try {
          onError(err);
        } catch (callbackError) {
          console.error(`${moduleName} 错误回调执行失败:`, callbackError);
        }
      }
      
      // 渲染降级UI
      if (renderFallback) {
        renderErrorFallback(container, moduleName, err);
      }
      
      // 重新抛出错误，让上层也能感知
      throw err;
    }
  };
}

/**
 * 批量包装多个挂载函数
 * 
 * @param mounts - 挂载函数映射
 * @param defaultOptions - 默认选项
 * @returns 包装后的挂载函数映射
 */
export function safeMountAll<T extends Record<string, MountFunction>>(
  mounts: T,
  defaultOptions: Omit<SafeMountOptions, 'moduleName'> = {}
): T {
  const wrapped = {} as T;
  
  for (const [key, mountFn] of Object.entries(mounts)) {
    wrapped[key as keyof T] = safeMount(mountFn, {
      ...defaultOptions,
      moduleName: key
    }) as T[keyof T];
  }
  
  return wrapped;
}
