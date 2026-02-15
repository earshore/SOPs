import { AppState } from '../types/index';
import { showToast } from '../utils/toast';

/**
 * QA卡片展开/收起
 */
export function setupQACardToggle(): void {
  document.querySelectorAll('.qa-header').forEach((header) => {
    header.addEventListener('click', function (e: Event) {
      const target = e.currentTarget as HTMLElement;
      const card = target.closest('.qa-card');
      card?.classList.toggle('expanded');
    });
  });
}

/**
 * 分类标签切换 - 实现真实的筛选功能
 */
export function setupCategoryTabs(toastContainer: HTMLElement | null): void {
  document.querySelectorAll('.cat-tab').forEach((tab) => {
    tab.addEventListener('click', function (e: Event) {
      const target = e.currentTarget as HTMLElement;
      const category = target.getAttribute('data-category');
      
      if (!category) return;
      
      // 更新active状态
      document.querySelectorAll('.cat-tab').forEach((t) => t.classList.remove('active'));
      target.classList.add('active');
      
      // 执行筛选
      const qaCards = document.querySelectorAll('.qa-card');
      if (category === 'all') {
        // 显示全部
        qaCards.forEach((card) => {
          (card as HTMLElement).style.display = 'block';
        });
        showToast(toastContainer, 'info', '显示全部Q&A', 'fa-solid fa-filter');
      } else {
        // 按分类筛选
        let visibleCount = 0;
        qaCards.forEach((card) => {
          const cardElement = card as HTMLElement;
          if (cardElement.classList.contains(category)) {
            cardElement.style.display = 'block';
            visibleCount++;
          } else {
            cardElement.style.display = 'none';
          }
        });
        
        const categoryName = target.textContent?.trim() || '该分类';
        showToast(toastContainer, 'info', `已筛选 ${categoryName} (${visibleCount}条)`, 'fa-solid fa-filter');
      }
    });
  });
}

/**
 * 语言选择器
 */
export function setupLanguageSelector(toastContainer: HTMLElement | null): void {
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', function (e: Event) {
      const target = e.currentTarget as HTMLElement;
      document.querySelectorAll('.lang-btn').forEach((b) => b.classList.remove('active'));
      target.classList.add('active');
      showToast(toastContainer, 'success', `已切换至 ${target.textContent} 语言版本`, 'fa-solid fa-language');
    });
  });
}

/**
 * 全部展开/收起
 */
export function setupExpandAll(expandAllBtn: HTMLButtonElement | null, state: AppState): void {
  expandAllBtn?.addEventListener('click', () => {
    state.allExpanded = !state.allExpanded;
    document.querySelectorAll('.qa-card').forEach((card) => {
      if (state.allExpanded) {
        card.classList.add('expanded');
      } else {
        card.classList.remove('expanded');
      }
    });
    if (expandAllBtn) {
      expandAllBtn.innerHTML = state.allExpanded
        ? '<i class="fa-solid fa-compress"></i> 全部收起'
        : '<i class="fa-solid fa-expand"></i> 全部展开';
    }
  });
}

/**
 * Logo彩蛋
 */
export function setupLogoEasterEgg(logoIcon: HTMLElement | null, state: AppState, toastContainer: HTMLElement | null): void {
  logoIcon?.addEventListener('click', () => {
    state.clickCount++;
    if (state.clickCount >= 3) {
      state.clickCount = 0;
      document.querySelectorAll('.ambient-orb').forEach((orb) => {
        (orb as HTMLElement).style.opacity = '0.7';
        setTimeout(() => ((orb as HTMLElement).style.opacity = '0.4'), 2000);
      });
      showToast(toastContainer, 'info', '✨ 氛围模式已激活', 'fa-solid fa-wand-magic-sparkles');
    }
  });
}

/**
 * 键盘快捷键
 */
export function setupKeyboardShortcuts(btnAnalyze: HTMLButtonElement | null): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      btnAnalyze?.click();
    }
  });
}
