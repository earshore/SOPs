// 冗余库存清货 SOP 模块
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/inventory_clearance/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 冗余库存清货 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 冗余库存清货 SOP 模块已卸载");
}
