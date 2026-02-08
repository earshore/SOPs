import BaseModule from "../../../../../common/BaseModule";
import { SEO_RADAR_DATA } from "../../../constants/amz_hub_constants.js";
import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { loadChartJs } from "../../../../../common/utils/lazyLibs";

class SeoStrategyModule extends BaseModule {
    constructor() {
        super('amz_seo_strategy');
        this.chartInstance = null;
    }

    async render() {
        // ✅ 安全: 静态HTML模板，无用户输入
        this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/knowledge/seo_strategy/template.html');
    }

    async init() {
        await loadChartJs();
        this.initChart();
    }

    onUnmount() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    initChart() {
        const ctx = document.getElementById('amz_keywordRadarChart');
        if (!ctx) return;

        if (this.chartInstance) this.chartInstance.destroy();

        if (typeof Chart === 'undefined') { console.warn("Chart.js missing"); return; }

        this.chartInstance = new Chart(ctx.getContext('2d'), {
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
                        ticks: { display: false, backdropColor: 'transparent' }
                    }
                }
            }
        });
    }
}

const instance = new SeoStrategyModule();
export const mount = (c) => instance.mount(c);
export const unmount = () => instance.unmount();