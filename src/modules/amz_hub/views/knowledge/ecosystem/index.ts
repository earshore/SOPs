/**
 * Amazon 生态系统 - A10算法权重分析
 */

import BaseModule from "../../../../../common/BaseModule";
import { A10_CHART_DATA } from "../../../constants/amz_hub_constants";
import templateHTML from "./template.html?raw";
import { loadChartJs } from "../../../../../common/utils/lazyLibs";

// Chart.js 实例类型定义
interface ChartInstance {
  destroy(): void;
}

class EcosystemModule extends BaseModule {
  private chartInstance: ChartInstance | null = null;

  constructor() {
    super("amz_ecosystem");
  }

  protected async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add("fade-in");
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
    const ctx = document.getElementById("amz_a10Chart") as HTMLCanvasElement;
    if (!ctx) return;

    if (typeof (window as any).Chart === "undefined") return;

    const Chart = (window as any).Chart;
    this.chartInstance = new Chart(ctx.getContext("2d"), {
      type: "doughnut",
      data: A10_CHART_DATA,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { usePointStyle: true, boxWidth: 8 },
          },
        },
        cutout: "70%",
      },
    });
  }
}

const instance = new EcosystemModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
