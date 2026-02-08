/**
 * Amazon 生态系统 - A10算法权重分析
 */

import BaseModule from '../../../../../common/BaseModule';
import { A10_CHART_DATA } from '../../../constants/amz_hub_constants';
import { loadTemplate } from '../../../../../common/utils/viewLoader';
import { loadChartJs } from '../../../../../common/utils/lazyLibs';

class EcosystemModule extends BaseModule {
    private chartInstance: any = null;

    constructor() {
        super('amz_ecosystem');
    }

    async render(): Promise<void> {
        // ✅ 安全: 静态HTML模板，无用户输入
        this.container!.innerHTML = await loadTemplate(
            'src/modules/amz_hub/views/knowledge/ecosystem/template.html'
        );
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

        if (typeof (window as any).Chart === 'undefined') return;

        const Chart = (window as any).Chart;
        this.chartInstance = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: A10_CHART_DATA,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } },
                },
                cutout: '70%',
            },
        });
    }
}

const instance = new EcosystemModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
