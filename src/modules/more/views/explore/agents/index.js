import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// More - 智能体页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/more/views/explore/agents/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');

    console.log("✅ 智能体模块已挂载");
}

export function unmount() {
    console.log("❌ 智能体模块已卸载");
}
