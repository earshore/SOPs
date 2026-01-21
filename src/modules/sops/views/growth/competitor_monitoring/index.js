// 竞品监控与分析 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/growth/competitor_monitoring/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 竞品监控 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 竞品监控 SOP 模块已卸载");
}
