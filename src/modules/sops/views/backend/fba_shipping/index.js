import { loadTemplate } from "../../../../../common/utils/viewLoader";

// FBA 发货标准操作 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/backend/fba_shipping/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ FBA 发货标准操作 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ FBA 发货标准操作 SOP 模块已卸载");
}
