// 产品Listing合规性 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/safety/product_compliance/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 产品Listing合规性 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 产品Listing合规性 SOP 模块已卸载");
}
