import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// 品牌与侵权审核 SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/safety/brand_infringement/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ 品牌与侵权审核 SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ 品牌与侵权审核 SOP 模块已卸载");
}
