import { loadTemplate } from "../../../../../common/utils/viewLoader";

// 竞品监控与分析 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/growth/competitor_monitoring/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 竞品监控与分析 SOP 模块已挂载");
}

export function unmount(): void {
    console.log("❌ 竞品监控与分析 SOP 模块已卸载");
}
