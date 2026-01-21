// 绩效通知处理 SOP
export async function mount(container) {
    const response = await fetch('src/modules/sops/views/safety/performance_notification/template.html');
    const html = await response.text();
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 绩效通知处理 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 绩效通知处理 SOP 模块已卸载");
}
