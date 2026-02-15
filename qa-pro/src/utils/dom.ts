import { DOMElements } from '../types/index';

/**
 * 获取所有 DOM 元素引用
 */
export function getDOMElements(): DOMElements {
  return {
    btnAnalyze: document.getElementById('btnAnalyze') as HTMLButtonElement | null,
    btnSample: document.getElementById('btnSample') as HTMLButtonElement | null,
    btnClear: document.getElementById('btnClear') as HTMLButtonElement | null,
    jsonInput: document.getElementById('jsonInput') as HTMLTextAreaElement | null,
    progressSection: document.getElementById('progressSection') as HTMLElement | null,
    inputSection: document.getElementById('inputSection') as HTMLElement | null,
    resultsSection: document.getElementById('resultsSection') as HTMLElement | null,
    progressBar: document.getElementById('progressBar') as HTMLElement | null,
    expandAllBtn: document.getElementById('expandAllBtn') as HTMLButtonElement | null,
    logoIcon: document.getElementById('logoIcon') as HTMLElement | null,
    toastContainer: document.getElementById('toastContainer') as HTMLElement | null,
  };
}

/**
 * 添加抖动动画样式
 */
export function addShakeAnimation(): void {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      20% { transform: translateX(-8px); }
      40% { transform: translateX(8px); }
      60% { transform: translateX(-4px); }
      80% { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
}
