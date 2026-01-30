// src/common/state/middleware/validator.js
// ================================================================
// 🎯 校验中间件
// 防止非法状态更新
// ================================================================

/**
 * 校验中间件 - 防止非法状态更新
 * @param {Object} action - 状态变化动作
 * @param {Function} next - 下一个中间件
 * @returns {Object|null} 处理后的动作，null表示拦截
 */
export function validatorMiddleware(action, next) {
  // 防止将 currentTab 设置为空字符串
  if (action.path === 'ui.currentTab' && !action.value) {
    console.error('[State] Invalid currentTab value:', action.value);
    return null; // 拦截此次更新
  }
  
  // 防止将 selectedSite 设置为非字符串
  if (action.path === 'scraper.selectedSite' && typeof action.value !== 'string') {
    console.error('[State] Invalid selectedSite value:', action.value);
    return null;
  }
  
  // 防止将 isScraping 设置为非布尔值
  if (action.path === 'scraper.isScraping' && typeof action.value !== 'boolean') {
    console.error('[State] Invalid isScraping value:', action.value);
    return null;
  }
  
  return next();
}

export default validatorMiddleware;
