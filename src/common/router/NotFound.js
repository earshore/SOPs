// src/common/router/NotFound.js
// ================================================================
// 🎯 404页面组件
// 提供友好的404错误页面
// ================================================================

/**
 * 渲染404页面
 * @param {HTMLElement} container - 容器元素
 * @param {string} routeId - 未找到的路由ID
 */
export function render404(container, routeId) {
  if (!container) {
    console.error('[NotFound] Container element not found');
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 48px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
      <!-- Icon -->
      <div style="width: 96px; height: 96px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <i class="fas fa-map-marked-alt" style="font-size: 48px; color: #94a3b8;"></i>
      </div>
      
      <!-- Title -->
      <h1 style="font-size: 72px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">404</h1>
      <h2 style="font-size: 24px; font-weight: 600; color: #475569; margin: 0 0 16px 0;">页面未找到</h2>
      
      <!-- Description -->
      <p style="color: #64748b; margin: 0 0 32px 0; max-width: 448px; line-height: 1.6;">
        抱歉，您访问的页面 <code style="padding: 2px 8px; background: #f1f5f9; border-radius: 4px; font-family: monospace;">${routeId}</code> 不存在。
      </p>
      
      <!-- Actions -->
      <div style="display: flex; gap: 16px;">
        <button 
          data-action="switch-tab" 
          data-tab="home"
          style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: background 0.2s;">
          <i class="fas fa-home" style="margin-right: 8px;"></i>返回首页
        </button>
        
        <button 
          onclick="history.back()"
          style="padding: 12px 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px; transition: background 0.2s;">
          <i class="fas fa-arrow-left" style="margin-right: 8px;"></i>返回上一页
        </button>
      </div>
      
      <!-- Tip -->
      <div style="margin-top: 48px; padding: 16px; background: #eff6ff; border: 1px solid: #bfdbfe; border-radius: 8px; max-width: 448px;">
        <p style="color: #1e40af; margin: 0; font-size: 14px;">
          <i class="fas fa-lightbulb" style="margin-right: 8px;"></i>
          提示：您可以通过顶部导航栏访问其他页面
        </p>
      </div>
    </div>
  `;

  // 添加hover效果
  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', () => {
      if (button.style.background === 'rgb(59, 130, 246)') {
        button.style.background = '#2563eb';
      } else {
        button.style.background = '#e2e8f0';
      }
    });
    button.addEventListener('mouseleave', () => {
      if (button.style.background === 'rgb(37, 99, 235)') {
        button.style.background = '#3b82f6';
      } else {
        button.style.background = '#f1f5f9';
      }
    });
  });

  console.log(`📄 [NotFound] 已渲染404页面: ${routeId}`);
}

/**
 * 渲染错误页面
 * @param {HTMLElement} container - 容器元素
 * @param {Error} error - 错误对象
 * @param {string} routeId - 路由ID
 */
export function renderError(container, error, routeId) {
  if (!container) {
    console.error('[NotFound] Container element not found');
    return;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 48px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
      <!-- Icon -->
      <div style="width: 96px; height: 96px; border-radius: 50%; background: #fef2f2; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444;"></i>
      </div>
      
      <!-- Title -->
      <h1 style="font-size: 48px; font-weight: bold; color: #1e293b; margin: 0 0 8px 0;">页面加载失败</h1>
      <h2 style="font-size: 20px; font-weight: 600; color: #475569; margin: 0 0 16px 0;">路由: ${routeId}</h2>
      
      <!-- Error Message -->
      <div style="margin: 0 0 32px 0; padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; max-width: 600px;">
        <p style="color: #991b1b; margin: 0; font-family: monospace; font-size: 14px; text-align: left;">
          ${error.message || '未知错误'}
        </p>
      </div>
      
      <!-- Actions -->
      <div style="display: flex; gap: 16px;">
        <button 
          onclick="location.reload()"
          style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px;">
          <i class="fas fa-redo" style="margin-right: 8px;"></i>重新加载
        </button>
        
        <button 
          data-action="switch-tab" 
          data-tab="home"
          style="padding: 12px 24px; background: #f1f5f9; color: #475569; border: none; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 14px;">
          <i class="fas fa-home" style="margin-right: 8px;"></i>返回首页
        </button>
      </div>
    </div>
  `;

  console.error(`❌ [NotFound] 已渲染错误页面: ${routeId}`, error);
}

export default { render404, renderError };
