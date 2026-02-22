/**
 * NotFound.ts - 404 和错误页面渲染
 */

/**
 * 渲染 404 页面
 * @param container - 容器元素
 * @param routeId - 未找到的路由ID
 */
export function render404(container: HTMLElement | null, routeId: string = ''): void {
  if (!container) return;

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
      <div class="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
        <i class="fas fa-map-marked-alt text-4xl text-slate-400"></i>
      </div>
      <h1 class="text-6xl font-bold text-slate-800 mb-4">404</h1>
      <h2 class="text-2xl font-semibold text-slate-600 mb-2">页面未找到</h2>
      <p class="text-slate-500 mb-8 max-w-md">
        ${routeId ? `路由 "${routeId}" 不存在或尚未开发。` : '您访问的页面不存在。'}
      </p>
      <div class="flex gap-4">
        <button 
          data-action="go-home"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <i class="fas fa-home mr-2"></i>返回首页
        </button>
        <button 
          data-action="go-back"
          class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
          <i class="fas fa-arrow-left mr-2"></i>返回上一页
        </button>
      </div>
    </div>
  `;
  
  // 绑定事件处理器
  const homeBtn = container.querySelector('[data-action="go-home"]');
  const backBtn = container.querySelector('[data-action="go-back"]');
  
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      window.location.hash = '';
      window.location.reload();
    });
  }
  
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.history.back();
    });
  }
}

/**
 * 渲染错误页面
 * @param container - 容器元素
 * @param error - 错误对象
 * @param routeId - 路由ID
 */
export function renderError(
  container: HTMLElement | null, 
  error: Error | null, 
  routeId: string = ''
): void {
  if (!container) return;

  const errorMessage = error?.message || '未知错误';
  const errorStack = error?.stack || '';

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center min-h-screen p-8 text-center fade-in">
      <div class="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mb-6">
        <i class="fas fa-exclamation-triangle text-4xl text-red-500"></i>
      </div>
      <h1 class="text-4xl font-bold text-slate-800 mb-4">页面加载失败</h1>
      <p class="text-slate-600 mb-2">
        ${routeId ? `路由 "${routeId}" 加载时发生错误` : '页面加载时发生错误'}
      </p>
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8 max-w-2xl">
        <p class="text-sm text-red-700 font-mono text-left break-words">
          ${errorMessage}
        </p>
        ${errorStack ? `
          <details class="mt-2">
            <summary class="text-xs text-red-600 cursor-pointer hover:text-red-700">
              查看详细信息
            </summary>
            <pre class="text-xs text-red-600 mt-2 text-left overflow-auto max-h-40">${errorStack}</pre>
          </details>
        ` : ''}
      </div>
      <div class="flex gap-4">
        <button 
          data-action="reload-page"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm">
          <i class="fas fa-redo mr-2"></i>刷新页面
        </button>
        <button 
          data-action="go-home-error"
          class="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
          <i class="fas fa-home mr-2"></i>返回首页
        </button>
      </div>
    </div>
  `;
  
  // 绑定事件处理器
  const reloadBtn = container.querySelector('[data-action="reload-page"]');
  const homeBtn = container.querySelector('[data-action="go-home-error"]');
  
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => {
      window.location.reload();
    });
  }
  
  if (homeBtn) {
    homeBtn.addEventListener('click', () => {
      window.location.hash = '';
    });
  }
}
