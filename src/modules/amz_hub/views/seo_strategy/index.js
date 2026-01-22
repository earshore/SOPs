import { SEO_RADAR_DATA } from "../../constants/amz_hub_constants.js";

let chartInstance = null;

export async function mount(container) {
    const response = await fetch('src/modules/amz_hub/views/seo_strategy/template.html');
    container.innerHTML = await response.text();

    initChart();
}

export function unmount() {
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
}

function initChart() {
    const ctx = document.getElementById('amz_keywordRadarChart');
    if (!ctx) return;

    if (chartInstance) chartInstance.destroy();

    // 检查 Chart.js 是否加载
    if (typeof Chart === 'undefined') { console.warn("Chart.js missing"); return; }

    chartInstance = new Chart(ctx.getContext('2d'), {
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