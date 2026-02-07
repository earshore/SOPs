import { loadTemplate } from "../../../../../common/utils/viewLoader.js";

// Listing 极致优化 (SEO) SOP
export async function mount(container) {
    const html = await loadTemplate('src/modules/sops/views/growth/listing_seo/template.html');
    // ✅ 安全: 静态HTML模板，无用户输入
    container.innerHTML = html;
    container.classList.add('fade-in');
    console.log("✅ Listing SEO SOP 模块已挂载");
}

export function unmount() {
    console.log("❌ Listing SEO SOP 模块已卸载");
}
