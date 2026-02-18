import { loadTemplate } from "../../../../../common/utils/viewLoader";

// FBA发货与物流跟踪 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/backend/fba_shipping/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ FBA发货与物流跟踪 SOP 模块已挂载");
}

export function unmount(): void {
    console.log("❌ FBA发货与物流跟踪 SOP 模块已卸载");
}
