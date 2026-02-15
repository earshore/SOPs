import { AppState } from './types/index';
import { getDOMElements, addShakeAnimation } from './utils/dom';
import { setupIntersectionObserver } from './utils/animation';
import { setupButtonRippleEffect, setupCopyButtons, setupExportButtons } from './handlers/button';
import { setupAnalyzeButton, setupSampleButton, setupClearButton } from './handlers/input';
import {
  setupQACardToggle,
  setupCategoryTabs,
  setupLanguageSelector,
  setupExpandAll,
  setupLogoEasterEgg,
  setupKeyboardShortcuts,
} from './handlers/ui';

// 全局状态
const state: AppState = {
  allExpanded: false,
  clickCount: 0,
};

/**
 * 初始化应用
 */
function init(): void {
  // 获取 DOM 元素
  const elements = getDOMElements();

  // 设置 UI 交互
  setupButtonRippleEffect();
  setupQACardToggle();
  setupCategoryTabs(elements.toastContainer);
  setupLanguageSelector(elements.toastContainer);
  setupExpandAll(elements.expandAllBtn, state);
  setupCopyButtons(elements.toastContainer);

  // 设置输入处理
  setupAnalyzeButton(elements);
  setupSampleButton(elements);
  setupClearButton(elements);

  // 设置导出和快捷键
  setupExportButtons(elements.toastContainer);
  setupKeyboardShortcuts(elements.btnAnalyze);

  // 设置彩蛋和动画
  setupLogoEasterEgg(elements.logoIcon, state, elements.toastContainer);
  setupIntersectionObserver();
  addShakeAnimation();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
