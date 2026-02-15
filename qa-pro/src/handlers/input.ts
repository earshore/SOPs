import { DOMElements } from '../types/index';
import { showToast } from '../utils/toast';
import { simulateProgress } from '../services/progress';
import { getSampleData } from '../services/data';
import { parseReport } from '../services/parser';
import { renderReport } from '../services/renderer';

/**
 * 分析按钮
 */
export function setupAnalyzeButton(elements: DOMElements): void {
  elements.btnAnalyze?.addEventListener('click', () => {
    if (!elements.jsonInput?.value.trim()) {
      showToast(elements.toastContainer, 'error', '请先输入或加载竞品分析报告数据', 'fa-solid fa-exclamation');
      elements.jsonInput?.focus();

      // 抖动动画
      const card = elements.jsonInput?.closest('.input-card') as HTMLElement;
      if (card) {
        card.style.animation = 'none';
        card.offsetHeight; // 触发重排
        card.style.animation = 'shake 0.5s ease-in-out';
      }
      return;
    }

    // 解析报告
    const report = parseReport(elements.jsonInput.value);
    if (!report) {
      showToast(elements.toastContainer, 'error', '报告格式错误,请检查JSON格式', 'fa-solid fa-exclamation');
      return;
    }

    // 模拟进度并渲染结果
    simulateProgress(elements, () => {
      renderReport(report);
    });
  });
}

/**
 * 加载示例数据
 */
export function setupSampleButton(elements: DOMElements): void {
  elements.btnSample?.addEventListener('click', () => {
    // 检查是否已有输入内容
    const hasContent = elements.jsonInput?.value.trim();
    
    if (hasContent) {
      // 有内容时提示用户确认
      const confirmed = confirm('当前输入框有内容，加载示例数据将覆盖现有内容。是否继续？');
      if (!confirmed) {
        return;
      }
    }
    
    const sampleData = getSampleData();
    if (elements.jsonInput) {
      // 直接将完整的报告对象转为JSON字符串
      elements.jsonInput.value = JSON.stringify(sampleData, null, 2);
    }
    showToast(elements.toastContainer, 'success', '完整示例报告已加载', 'fa-solid fa-flask');
  });
}

/**
 * 清空按钮
 */
export function setupClearButton(elements: DOMElements): void {
  elements.btnClear?.addEventListener('click', () => {
    if (elements.jsonInput) {
      elements.jsonInput.value = '';
    }
    showToast(elements.toastContainer, 'info', '输入已清空', 'fa-solid fa-eraser');
  });
}
