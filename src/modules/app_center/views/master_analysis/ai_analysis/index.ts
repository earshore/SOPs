/**
 * AI智能分析模块
 * 集成到 Master Analysis 的子页面
 */

import { createAiAnalysisPanel } from './components/AlpinePanel';
import { createAlpinePanelModule } from '../utils/createAlpinePanelModule';

import '../master_analysis_style.css';
import './ai_analysis_style.css';

const aiAnalysisModule = createAlpinePanelModule({
  moduleId: 'ai_analysis',
  panelName: 'aiAnalysisPanel',
  factory: createAiAnalysisPanel,
  templatePath: 'src/modules/app_center/views/master_analysis/ai_analysis/template.html',
  templateOptions: {
    retryCount: 3,
    timeout: 5000,
    onError: error => {
      console.error('[AI智能分析] 模板加载失败:', error);
    },
  },
  logPrefix: 'AI智能分析',
});

export const mount = (container: HTMLElement): Promise<void> => aiAnalysisModule.mount(container);
export const unmount = (): void => {
  if (aiAnalysisModule.isMounted) {
    aiAnalysisModule.unmount();
    return;
  }

  try {
    aiAnalysisModule.cleanupPanel();
  } catch (error) {
    console.error('[AI智能分析] ❌ 模块卸载失败:', error);
  }
};
