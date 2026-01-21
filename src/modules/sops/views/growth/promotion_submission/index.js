// 促销活动提报 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/growth/promotion_submission/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 促销活动提报 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 促销活动提报 SOP 模块已卸载");
}
