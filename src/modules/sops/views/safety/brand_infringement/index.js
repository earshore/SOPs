// 品牌与侵权审核 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/safety/brand_infringement/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 品牌与侵权审核 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 品牌与侵权审核 SOP 模块已卸载");
}
