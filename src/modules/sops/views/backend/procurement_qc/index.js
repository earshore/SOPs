import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 采购与质检 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/backend/procurement_qc/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 采购与质检 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 采购与质检 SOP 模块已卸载");
}
