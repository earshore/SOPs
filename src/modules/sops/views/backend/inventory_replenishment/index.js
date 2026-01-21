// 库存预警与补货 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/backend/inventory_replenishment/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 库存预警与补货 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 库存预警与补货 SOP 模块已卸载");
}
