import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// FBA 发货标准操作 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/backend/fba_shipping/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ FBA 发货标准操作 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ FBA 发货标准操作 SOP 模块已卸载");
}
