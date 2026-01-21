// PPC 广告投放与优化 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/growth/ppc_advertising/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ PPC 广告 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ PPC 广告 SOP 模块已卸载");
}
