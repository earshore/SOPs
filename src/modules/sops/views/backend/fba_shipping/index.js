// FBA 发货标准操作 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/backend/fba_shipping/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ FBA 发货标准操作 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ FBA 发货标准操作 SOP 模块已卸载");
}
