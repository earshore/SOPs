import { A10_CHART_DATA } from "../../services/amz_hub_constants.js";

let chartInstance = null;

export async function mount(container) {
    const response = await fetch('src/modules/amz_hub/views/ecosystem/template.html');
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
    const ctx = document.getElementById('amz_a10Chart');
    if (!ctx) return;

    if (typeof Chart === 'undefined') return;

    chartInstance = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: A10_CHART_DATA,
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { 
                legend: { position: 'right', labels: { usePointStyle: true, boxWidth: 8 } } 
            },
            cutout: '70%'
        }
    });
}