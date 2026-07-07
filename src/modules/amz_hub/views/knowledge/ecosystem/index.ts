/**
 * Amazon 生态系统 - A10算法权重分析
 */

import BaseModule from '@/common/BaseModule';
import { A10_CHART_DATA } from '../../../constants/amz_hub_constants';
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

class EcosystemModule extends BaseModule {
  private chartInstance: ChartInstance | null = null;

  constructor() {
    super('amz_ecosystem');
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/amz_hub/views/knowledge/ecosystem/template.html'
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
    const ctx = document.getElementById('amz_a10Chart') as HTMLCanvasElement;
    if (!ctx) return;

    const Chart = (window as WindowWithChart).Chart;
    if (!Chart) return;

    const context = ctx.getContext('2d');
    if (!context) return;

    this.chartInstance = new Chart(context, {
      type: 'doughnut',
      data: A10_CHART_DATA,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { usePointStyle: true, boxWidth: 8 },
          },
        },
        cutout: '70%',
      },
    });
  }
}

const instance = new EcosystemModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
