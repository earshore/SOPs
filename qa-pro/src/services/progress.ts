import { DOMElements } from '../types/index';
import { showToast } from '../utils/toast';
import { animateCounters } from '../utils/animation';

/**
 * 进度模拟服务
 */
export function simulateProgress(elements: DOMElements, onComplete?: () => void): void {
  if (!elements.progressSection || !elements.inputSection || !elements.resultsSection || !elements.progressBar) {
    return;
  }

  elements.inputSection.style.display = 'none';
  elements.resultsSection.classList.remove('visible');
  elements.progressSection.classList.add('visible');

  const steps = document.querySelectorAll('.progress-step');
  let currentStep = 0;
  const totalSteps = steps.length;

  // 重置步骤
  steps.forEach((s) => {
    s.classList.remove('active', 'done');
    const icon = s.querySelector('i');
    if (icon) icon.className = 'fa-regular fa-circle';
  });
  steps[0].classList.add('active');
  const firstIcon = steps[0].querySelector('i');
  if (firstIcon) firstIcon.className = 'fa-solid fa-circle-notch fa-spin';
  elements.progressBar.style.width = '0%';

  const interval = setInterval(() => {
    if (currentStep < totalSteps) {
      steps[currentStep].classList.remove('active');
      steps[currentStep].classList.add('done');
      const icon = steps[currentStep].querySelector('i');
      if (icon) icon.className = 'fa-solid fa-circle-check';
      currentStep++;
      const progress = (currentStep / totalSteps) * 100;
      if (elements.progressBar) {
        elements.progressBar.style.width = progress + '%';
      }

      if (currentStep < totalSteps) {
        steps[currentStep].classList.add('active');
        const nextIcon = steps[currentStep].querySelector('i');
        if (nextIcon) nextIcon.className = 'fa-solid fa-circle-notch fa-spin';
      }
    } else {
      clearInterval(interval);
      setTimeout(() => {
        elements.progressSection?.classList.remove('visible');
        if (elements.inputSection) elements.inputSection.style.display = 'block';
        elements.resultsSection?.classList.add('visible');
        showToast(elements.toastContainer, 'success', '分析完成!', 'fa-solid fa-sparkles');
        
        // 先执行完成回调(渲染报告)
        if (onComplete) {
          onComplete();
        }
        
        // 然后执行动画(此时data-target已更新)
        animateCounters();
      }, 600);
    }
  }, 800);
}
