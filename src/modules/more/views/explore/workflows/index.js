import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// More - 工作流页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/more/views/explore/workflows/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');

    console.log("✅ 工作流模块已挂载");
}

export function unmount() {
    console.log("❌ 工作流模块已卸载");
}
