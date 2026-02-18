import { loadTemplate } from "../../../../../common/utils/viewLoader";

// 库存预警与补货 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/backend/inventory_replenishment/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 库存预警与补货 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 库存预警与补货 SOP 模块已卸载");
}
