import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// More - 提示词页面
export async function mount(container) {
    const html = await loadTemplate('src/modules/more/views/explore/prompts/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');

    console.log("✅ 提示词模块已挂载");
}

export function unmount() {
    console.log("❌ 提示词模块已卸载");
}
