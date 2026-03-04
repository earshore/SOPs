/**
 * 按钮涟漪效果初始化模块
 * 为所有按钮添加涟漪效果事件监听
 * 
 * Requirements: 1.3
 */

import { animationManager } from '../services/animation-manager';
import { createRipple } from '../utils/animation-utils';

import { Logger } from '../services/loggerService';
/**
 * 初始化按钮涟漪效果
 * 为页面上所有符合条件的按钮添加涟漪效果
 */
export function initButtonRipple(): void {
  // 检查动画是否启用
  if (animationManager.shouldReduceMotion()) {
    Logger.info('[ButtonRipple] 动画已禁用，跳过涟漪效果初始化');
    return;
  }

  // 检查按钮动画类别是否启用
  if (!animationManager.isCategoryEnabled('button')) {
    Logger.info('[ButtonRipple] 按钮动画已禁用，跳过涟漪效果初始化');
    return;
  }

  // 选择所有需要涟漪效果的按钮
  // 排除已经初始化的按钮和特殊类型的按钮
  const buttons = document.querySelectorAll<HTMLElement>(
    '.btn:not([data-ripple-initialized]):not(.btn-link):not(.btn-link-neutral):not(.btn-link-danger):not([disabled])'
  );

  Logger.info(`[ButtonRipple] 初始化 ${buttons.length} 个按钮的涟漪效果`);

  buttons.forEach((button) => {
    addRippleToButton(button);
  });
}

/**
 * 为单个按钮添加涟漪效果
 * @param button - 目标按钮元素
 */
export function addRippleToButton(button: HTMLElement): void {
  // 检查是否已经初始化
  if (button.dataset.rippleInitialized === 'true') {
    return;
  }

  // 检查动画是否启用
  if (animationManager.shouldReduceMotion() || !animationManager.isCategoryEnabled('button')) {
    return;
  }

  // 标记为已初始化
  button.dataset.rippleInitialized = 'true';

  // 添加涟漪容器类
  if (!button.classList.contains('btn-ripple')) {
    button.classList.add('btn-ripple');
  }

  // 添加点击事件监听器
  button.addEventListener('click', handleButtonClick);
}

/**
 * 处理按钮点击事件
 * @param event - 鼠标点击事件
 */
function handleButtonClick(event: MouseEvent): void {
  const button = event.currentTarget as HTMLElement;

  // 再次检查动画状态（用户可能在运行时更改了设置）
  if (animationManager.shouldReduceMotion() || !animationManager.isCategoryEnabled('button')) {
    return;
  }

  // 检查按钮是否被禁用
  if (
    button.hasAttribute('disabled') ||
    button.getAttribute('aria-disabled') === 'true' ||
    button.classList.contains('is-disabled')
  ) {
    return;
  }

  // 创建涟漪效果
  try {
    createRipple(button, event);
  } catch (error) {
    Logger.warn('[ButtonRipple] 创建涟漪效果失败:', error);
    // 失败时静默降级，不影响按钮功能
  }
}

/**
 * 移除按钮的涟漪效果
 * @param button - 目标按钮元素
 */
export function removeRippleFromButton(button: HTMLElement): void {
  // 移除事件监听器
  button.removeEventListener('click', handleButtonClick);

  // 移除涟漪容器类
  button.classList.remove('btn-ripple');

  // 移除初始化标记
  delete button.dataset.rippleInitialized;

  // 清理可能残留的涟漪元素
  const ripples = button.querySelectorAll('.btn-ripple-effect');
  ripples.forEach((ripple) => ripple.remove());
}

/**
 * 观察DOM变化，自动为新添加的按钮初始化涟漪效果
 */
export function observeButtonChanges(): void {
  // 检查动画是否启用
  if (animationManager.shouldReduceMotion() || !animationManager.isCategoryEnabled('button')) {
    return;
  }

  // 创建MutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // 检查新添加的节点
      mutation.addedNodes.forEach((node) => {
        // 只处理元素节点
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        const element = node as HTMLElement;

        // 检查节点本身是否是按钮
        if (element.classList.contains('btn')) {
          addRippleToButton(element);
        }

        // 检查节点的子元素中是否有按钮
        const buttons = element.querySelectorAll<HTMLElement>(
          '.btn:not([data-ripple-initialized]):not(.btn-link):not(.btn-link-neutral):not(.btn-link-danger):not([disabled])'
        );
        buttons.forEach((button) => {
          addRippleToButton(button);
        });
      });
    });
  });

  // 开始观察
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  Logger.info('[ButtonRipple] DOM变化观察器已启动');
}

/**
 * 重新初始化所有按钮的涟漪效果
 * 用于动画设置更改后重新应用
 */
export function reinitButtonRipple(): void {
  // 移除所有现有的涟漪效果
  const initializedButtons = document.querySelectorAll<HTMLElement>('[data-ripple-initialized="true"]');
  initializedButtons.forEach((button) => {
    removeRippleFromButton(button);
  });

  // 重新初始化
  initButtonRipple();
}

/**
 * 监听动画设置变化
 * 当用户更改动画设置时，自动重新初始化
 */
export function observeAnimationSettings(): void {
  let isReinitializing = false; // 防止循环触发
  let lastReinitTime = 0;
  
  // 监听自定义事件（由AnimationManager触发）
  window.addEventListener('animation-settings-changed', () => {
    const now = Date.now();
    
    // 防止短时间内重复初始化（1秒内只初始化一次）
    if (isReinitializing || (now - lastReinitTime < 1000)) {
      return;
    }
    
    isReinitializing = true;
    lastReinitTime = now;
    
    Logger.info('[ButtonRipple] 动画设置已更改，重新初始化涟漪效果');
    
    // 使用 requestAnimationFrame 延迟执行，避免阻塞主线程
    requestAnimationFrame(() => {
      reinitButtonRipple();
      isReinitializing = false;
    });
  });
}
