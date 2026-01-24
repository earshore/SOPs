import BaseModule from "../../../../common/BaseModule.js";
import { A10_CHART_DATA } from "../../constants/amz_hub_constants.js";

class EcosystemModule extends BaseModule {
    constructor() {
        super('amz_ecosystem');
        this.chartInstance = null;
    }

    async render() {
        const response = await fetch('src/modules/amz_hub/views/ecosystem/template.html');
        this.container.innerHTML = await response.text();
    }

    async init() {
        this.initChart();
    }

    onUnmount() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }

    initChart() {
        const ctx = document.getElementById('amz_a10Chart');
        if (!ctx) return;

        if (typeof Chart === 'undefined') return;

        this.chartInstance = new Chart(ctx.getContext('2d'), {
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
}

const instance = new EcosystemModule();
export const mount = (c) => instance.mount(c);
export const unmount = () => instance.unmount();