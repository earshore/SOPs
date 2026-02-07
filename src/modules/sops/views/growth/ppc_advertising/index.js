import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// PPC 广告投放与优化 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/growth/ppc_advertising/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ PPC 广告 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ PPC 广告 SOP 模块已卸载");
}
