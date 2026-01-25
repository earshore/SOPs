import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 产品Listing合规性 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/safety/product_compliance/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 产品Listing合规性 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 产品Listing合规性 SOP 模块已卸载");
}
