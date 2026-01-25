import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 绩效通知处理 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/safety/performance_notification/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 绩效通知处理 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 绩效通知处理 SOP 模块已卸载");
}
