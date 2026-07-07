/**
 * Amazon SEO 策略 - 关键词优化雷达图
 */

import BaseModule from '@/common/BaseModule';
import { SEO_RADAR_DATA } from '../../../constants/amz_hub_constants';
import './styles.css';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { loadChartJs, type ChartJS } from '@/common/utils/lazyLibs';
import { setSafeHtml } from '@/common/utils/security';

// Chart.js 实例类型定义
interface ChartInstance {
  destroy(): void;
}

type WindowWithChart = Window & {
  Chart?: ChartJS;
};

class SeoStrategyModule extends BaseModule {
  private chartInstance: ChartInstance | null = null;

  constructor() {
    super('amz_seo_strategy');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/knowledge/seo_strategy/template.html'
    );
    setSafeHtml(container, html);
    container.classList.add('fade-in');
  }

  async init(): Promise<void> {
    await loadChartJs();
    this.initChart();
  }

  onUnmount(): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
  }

  initChart(): void {
    const ctx = document.getElementById('amz_keywordRadarChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (this.chartInstance) this.chartInstance.destroy();

    const Chart = (window as WindowWithChart).Chart;
    if (!Chart) {
      return;
    }

    const context = ctx.getContext('2d');
    if (!context) return;

    this.chartInstance = new Chart(context, {
      type: 'radar',
      data: SEO_RADAR_DATA,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { display: true, color: '#f1f5f9' },
            grid: { color: '#f1f5f9' },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: { display: false, backdropColor: 'transparent' },
          },
        },
      },
    });
  }
}

const instance = new SeoStrategyModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
