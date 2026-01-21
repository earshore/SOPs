// 采购与质检 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/backend/procurement_qc/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 采购与质检 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 采购与质检 SOP 模块已卸载");
}
