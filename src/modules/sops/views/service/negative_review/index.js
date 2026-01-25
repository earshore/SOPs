import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 差评处理与分析 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/service/negative_review/template.html');
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 差评处理 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 差评处理 SOP 模块已卸载");
}
