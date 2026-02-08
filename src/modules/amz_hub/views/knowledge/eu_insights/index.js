import { escapeHtml } from '@/common/utils/security';
import BaseModule from "../../../../../common/BaseModule";
import { AMZ_COUNTRY_DATA } from "../../../constants/amz_hub_constants.js";
import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { loadChartJs } from "../../../../../common/utils/lazyLibs";

class EuInsightsModule extends BaseModule {
    constructor() {
        super('amz_eu_insights');
        this.radarChart = null;
    }

    async render() {
        // ✅ 安全: 静态HTML模板，无用户输入
        this.container.innerHTML = await loadTemplate('src/modules/amz_hub/views/knowledge/eu_insights/template.html');
    }

    async init() {
        await loadChartJs();
        const selector = document.getElementById('amz_countrySelector');
        if (selector) {
            // 使用 BaseModule 提供的 addEventListener，卸载时会自动清理
            this.addEventListener(selector, 'change', (e) => this.updateCountryInfo(e.target.value));
            // 默认初始化
            this.updateCountryInfo('de');
        }
    }

    onUnmount() {
        if (this.radarChart) {
            this.radarChart.destroy();
            this.radarChart = null;
        }
    }

    updateCountryInfo(code) {
        const data = AMZ_COUNTRY_DATA[code];
        if (!data) return;

        const details = document.getElementById('amz_countryDetails');
        if (details) {
            details.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span class="text-3xl">${this.getFlagEmoji(code)}</span> ${escapeHtml(data.name)}
                    </h2>
                    <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase rounded-full">Mature Market</span>
                </div>
                <div class="space-y-4">
                    <div>
                        <h4 class="text-xs font-bold uppercase text-slate-400 mb-1">核心画像 (Persona)</h4>
                        <p class="text-sm text-slate-700 leading-relaxed">${escapeHtml(data.traits)}</p>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold uppercase text-slate-400 mb-1">运营建议 (Strategy)</h4>
                        <div class="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            ${escapeHtml(data.tips)}
                        </div>
                    </div>
                </div>
            `;
        }

        this.updateChart(data.radarData);
    }

    updateChart(dataset) {
        const ctx = document.getElementById('amz_euRadarChart');
        if (!ctx) return;

        if (this.radarChart) {
            this.radarChart.data.datasets[0].data = dataset;
            this.radarChart.update();
        } else {
            // @ts-ignore - Chart is loaded globally via script tag
            this.radarChart = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: ['质量要求', '环保意识', '价格敏感', '外观设计', '品牌信任'],
                    datasets: [{
                        label: '市场倾向指数',
                        data: dataset,
                        fill: true,
                        backgroundColor: 'rgba(99, 102, 241, 0.2)',
                        borderColor: 'rgb(99, 102, 241)',
                        pointBackgroundColor: 'rgb(99, 102, 241)',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: { suggestedMin: 0, suggestedMax: 100 }
                    }
                }
            });
        }
    }

    getFlagEmoji(countryCode) {
        const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
        return String.fromCodePoint(...codePoints);
    }
}

// 导出实例以保持与 amz_hub.js 的兼容性
const instance = new EuInsightsModule();
export const mount = (c) => instance.mount(c);
export const unmount = () => instance.unmount();