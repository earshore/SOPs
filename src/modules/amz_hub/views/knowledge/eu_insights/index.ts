/**
 * 欧洲站市场洞察 - 各国消费者画像雷达图
 */

import { escapeHtml } from "@/common/utils/security";
import BaseModule from "../../../../../common/BaseModule";
import { AMZ_COUNTRY_DATA } from "../../../constants/amz_hub_constants";
import templateHTML from "./template.html?raw";
import { loadChartJs } from "../../../../../common/utils/lazyLibs";

// Chart.js 实例类型定义
interface ChartInstance {
  destroy(): void;
  update(): void;
  data: {
    datasets: Array<{
      data: number[];
    }>;
  };
}

class EuInsightsModule extends BaseModule {
  private radarChart: ChartInstance | null = null;

  constructor() {
    super("amz_eu_insights");
  }

  protected async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add("fade-in");
  }

  async init(): Promise<void> {
    await loadChartJs();
    const selector = document.getElementById(
      "amz_countrySelector",
    ) as HTMLSelectElement;
    if (selector) {
      // 使用 BaseModule 提供的 addEventListener，卸载时会自动清理
      this.addEventListener(selector, "change", (e) =>
        this.updateCountryInfo((e.target as HTMLSelectElement).value),
      );
      // 默认初始化
      this.updateCountryInfo("de");
    }
  }

  onUnmount(): void {
    if (this.radarChart) {
      this.radarChart.destroy();
      this.radarChart = null;
    }
  }

  updateCountryInfo(code: string): void {
    const data = (AMZ_COUNTRY_DATA as any)[code];
    if (!data) return;

    const details = document.getElementById("amz_countryDetails");
    if (details) {
      // ✅ 安全: data来自内部AMZ_COUNTRY_DATA，动态文本已通过escapeHtml转义
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

  updateChart(dataset: number[]): void {
    const ctx = document.getElementById(
      "amz_euRadarChart",
    ) as HTMLCanvasElement;
    if (!ctx) return;

    if (this.radarChart) {
      // 类型守卫：确保 datasets 数组存在且有元素
      if (this.radarChart.data.datasets && this.radarChart.data.datasets[0]) {
        this.radarChart.data.datasets[0].data = dataset;
        this.radarChart.update();
      }
    } else {
      if (typeof (window as any).Chart === "undefined") return;

      const Chart = (window as any).Chart;
      this.radarChart = new Chart(ctx, {
        type: "radar",
        data: {
          labels: ["质量要求", "环保意识", "价格敏感", "外观设计", "品牌信任"],
          datasets: [
            {
              label: "市场倾向指数",
              data: dataset,
              fill: true,
              backgroundColor: "rgba(99, 102, 241, 0.2)",
              borderColor: "rgb(99, 102, 241)",
              pointBackgroundColor: "rgb(99, 102, 241)",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: { suggestedMin: 0, suggestedMax: 100 },
          },
        },
      });
    }
  }

  getFlagEmoji(countryCode: string): string {
    const codePoints = countryCode
      .toUpperCase()
      .split("")
      .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  }
}

// 导出实例以保持与 amz_hub.js 的兼容性
const instance = new EuInsightsModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
