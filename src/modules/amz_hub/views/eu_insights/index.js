// 注意路径，引用新的 constants 文件
import { AMZ_COUNTRY_DATA } from "../../constants/amz_hub_constants.js";

let radarChart = null;

export async function mount(container) {
    const response = await fetch('src/modules/amz_hub/views/eu_insights/template.html');
    container.innerHTML = await response.text();

    // 绑定 Select 事件
    const selector = document.getElementById('amz_countrySelector');
    if (selector) {
        selector.addEventListener('change', (e) => updateCountryInfo(e.target.value));
        // 默认初始化
        updateCountryInfo('de');
    }
}

export function unmount() {
    if (radarChart) {
        radarChart.destroy();
        radarChart = null;
    }
}

function updateCountryInfo(code) {
    const data = AMZ_COUNTRY_DATA[code];
    if (!data) return;

    // 1. 更新文本
    const details = document.getElementById('amz_countryDetails');
    if (details) {
        // ... 原来的 innerHTML 逻辑，直接复制进来 ...
        // 为了省地，这里简写，你需要把原 amz_updateCountryInfo 里的 HTML 模板粘过来
        details.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span class="text-3xl">${getFlagEmoji(code)}</span> ${data.name}
                </h2>
                <span class="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold uppercase rounded-full">Mature Market</span>
            </div>
            <div class="space-y-4">
                <div>
                    <h4 class="text-xs font-bold uppercase text-slate-400 mb-1">核心画像 (Persona)</h4>
                    <p class="text-sm text-slate-700 leading-relaxed">${data.traits}</p>
                </div>
                <div>
                    <h4 class="text-xs font-bold uppercase text-slate-400 mb-1">运营建议 (Strategy)</h4>
                    <div class="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                        ${data.tips}
                    </div>
                </div>
            </div>
        `;
    }

    // 2. 更新或创建图表
    updateChart(data.radarData);
}

function updateChart(dataset) {
    const ctx = document.getElementById('amz_euRadarChart');
    if (!ctx) return;

    if (radarChart) {
        radarChart.data.datasets[0].data = dataset;
        radarChart.update();
    } else {
        radarChart = new Chart(ctx, {
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
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { suggestedMin: 0, suggestedMax: 100 } } }
        });
    }
}

function getFlagEmoji(countryCode) {
    const codePoints = countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}