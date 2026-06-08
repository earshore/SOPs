import { loadTemplate } from "../../../../../common/utils/viewLoader";
import { setSafeHtml } from "../../../../../common/utils/security";

// 采购与质检 SOP
export async function mount(container: HTMLElement): Promise<void> {
    const html = await loadTemplate('src/modules/sops/views/backend/procurement_qc/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, html);
    container.classList.add('fade-in');
    console.log("✅ 采购与质检 SOP 模块已挂载");
}

export function unmount(): void {
    console.log("❌ 采购与质检 SOP 模块已卸载");
}
